using BiAniBirak.Api.Data;
using BiAniBirak.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace BiAniBirak.Api.Servisler;

// ODEME SERVISI - paywall'in TEK dogruluk kaynagi.
//
// ===================== PAYWALL CIZGISI =====================
//
// UCRETSIZ (her zaman):
//   - Dilek toplama, defter kurma, duzenleme, kurasyon
//   - TAM ONIZLEME (96 DPI, sayfa cevirmeli) - eserin BIREBIR hali
//
// UCRETLI:
//   - Yalnizca baskiya hazir PDF indirme (300 DPI)
//
// Belge 05'in ters paywall'i: "Toplamak ucretsiz. Miras, bir kereye mahsus."
//
// Cift eserini doyasiya gorur, gurur duyar, paylasmak ister. Odedigi sey goruntu
// degil, BASKI KALITESIDIR.
//
// ===================== SAGLAYICI BAGIMSIZLIGI =====================
//
// Bu servis "havale" kelimesini BILMEZ. Yalnizca sorar:
//   "bu etkinlikte onaylanmis bir odeme var mi?"
//
// Yarin iyzico, obur gun App Store IAP gelecek. Hicbiri bu dosyayi degistirmeyecek -
// yalnizca Odeme kaydini FARKLI YOLDAN "onaylandi"ya cekecekler.
public static class OdemeServisi
{
    public const string DurumBekliyor = "bekliyor";
    public const string DurumOnaylandi = "onaylandi";
    public const string DurumReddedildi = "reddedildi";
    public const string DurumSuresiDoldu = "suresi_doldu";

    public const string SaglayiciHavale = "havale";

    // ---- PAYWALL GUARD ----
    //
    // Indirme ucunun sordugu TEK soru. Baska hicbir yerde odeme kontrolu YAZILMAZ -
    // ikinci bir kontrol, birinde unutulan bir kosul demektir.
    public static async Task<bool> IndirmeYetkisiVarMiAsync(
        Guid etkinlikId, BiAniBirakDbContext db, CancellationToken ct = default)
    {
        var ayar = await AyarAsync(db, ct);

        // ODEME SISTEMI KAPALIYSA HERKES INDIREBILIR.
        //
        // Bu bir "acil durum kolu"dur. Odeme altyapisinda bir sorun cikarsa (yanlis
        // IBAN, banka arizasi, hukuki engel), paywall aninda kalkar ve ciftler
        // mirasini kurtarir.
        //
        // Neden hayati: defterin 37 gunluk omru var. "Odeme sistemini tamir edene
        // kadar bekleyin" diyemeyiz - defter imha olur, miras yok olur. Para
        // kaybetmek telafi edilebilir; bir ailenin dugun anilarini kaybettirmek
        // edilemez.
        if (!ayar.Aktif) return true;

        return await db.Odemeler.AsNoTracking()
            .AnyAsync(o => o.EtkinlikId == etkinlikId && o.Durum == DurumOnaylandi, ct);
    }

    // Etkinligin ODEME DURUMU - frontend butonun ne yapacagini bilsin diye.
    public sealed record Durum(
        bool OdemeGerekli,     // sistem acik mi?
        bool Odendi,           // onaylanmis odeme var mi?
        Odeme? Bekleyen,       // bekleyen odeme (varsa - talimat ekrani gosterilir)
        decimal Tutar,
        string ParaBirimi);

    public static async Task<Durum> DurumAsync(
        Guid etkinlikId, BiAniBirakDbContext db, CancellationToken ct = default)
    {
        var ayar = await AyarAsync(db, ct);

        var odemeler = await db.Odemeler.AsNoTracking()
            .Where(o => o.EtkinlikId == etkinlikId)
            .OrderByDescending(o => o.CreatedAt)
            .ToListAsync(ct);

        var odendi = odemeler.Any(o => o.Durum == DurumOnaylandi);

        var bekleyen = odemeler.FirstOrDefault(o =>
            o.Durum == DurumBekliyor && o.SonGecerlilik > DateTimeOffset.UtcNow);

        return new Durum(
            OdemeGerekli: ayar.Aktif,
            Odendi: odendi,
            Bekleyen: bekleyen,
            Tutar: ayar.Tutar,
            ParaBirimi: ayar.ParaBirimi);
    }

    // ---- ODEME BASLAT ----
    //
    // IDEMPOTENT: cift butona iki kez basarsa IKINCI kayit acilmaz.
    //
    // Acilsaydi: iki referans kodu olurdu, cift birini kullanirdi, digeri "bekliyor"
    // olarak kalirdi. Super panelde hayalet kayitlar birikir, "bu odedi mi odemedi
    // mi?" karmasasi cikar.
    public static async Task<(Odeme? odeme, string? hata)> BaslatAsync(
        Guid etkinlikId, Guid kullaniciId, BiAniBirakDbContext db,
        CancellationToken ct = default)
    {
        var ayar = await AyarAsync(db, ct);

        if (!ayar.Aktif)
            return (null, "ODEME_KAPALI");

        if (ayar.Tutar <= 0)
            return (null, "FIYAT_TANIMSIZ");

        // Zaten odenmis mi?
        var odenmis = await db.Odemeler.AsNoTracking()
            .AnyAsync(o => o.EtkinlikId == etkinlikId && o.Durum == DurumOnaylandi, ct);
        if (odenmis)
            return (null, "ZATEN_ODENDI");

        // Bekleyen var mi? Varsa ONU dondur - yeni kod uretme.
        var bekleyen = await db.Odemeler
            .Where(o => o.EtkinlikId == etkinlikId
                        && o.Durum == DurumBekliyor
                        && o.SonGecerlilik > DateTimeOffset.UtcNow)
            .OrderByDescending(o => o.CreatedAt)
            .FirstOrDefaultAsync(ct);

        if (bekleyen != null)
            return (bekleyen, null);

        // Yeni odeme. Referans kodu BENZERSIZ olmali - carpisma pratikte imkansiz
        // ama "pratikte imkansiz" bir gun gerceklesir; kontrol et.
        string kod;
        var deneme = 0;
        do
        {
            kod = ReferansUreteci.Uret();
            deneme++;
            if (deneme > 10) return (null, "REFERANS_URETILEMEDI");
        }
        while (await db.Odemeler.AnyAsync(o => o.ReferansKodu == kod, ct));

        var simdi = DateTimeOffset.UtcNow;

        var odeme = new Odeme
        {
            Id = Guid.NewGuid(),
            EtkinlikId = etkinlikId,
            KullaniciId = kullaniciId,
            // TUTAR ANLIK: fiyat yarin degisse de bu ciftin odeyecegi tutar sabittir.
            Tutar = ayar.Tutar,
            ParaBirimi = ayar.ParaBirimi,
            Saglayici = SaglayiciHavale,
            ReferansKodu = kod,
            Durum = DurumBekliyor,
            SonGecerlilik = simdi.AddDays(ayar.GecerlilikGun),
            CreatedAt = simdi,
            UpdatedAt = simdi,
        };

        db.Odemeler.Add(odeme);
        return (odeme, null);
    }

    // ---- AYAR (tek satir, yoksa olusturulur) ----
    public static async Task<OdemeAyari> AyarAsync(
        BiAniBirakDbContext db, CancellationToken ct = default)
    {
        var ayar = await db.OdemeAyarlari.AsNoTracking().FirstOrDefaultAsync(ct);
        if (ayar != null) return ayar;

        // Ilk acilis: KAPALI ve FIYATSIZ olustur.
        //
        // Aktif=false KASITLI: sistem hazir ama para almiyoruz. Musa IBAN'i ve fiyati
        // super panelden girip acikca ACANA kadar hicbir cift odeme ekrani gormez.
        // Yanlislikla bos IBAN'la para istemek, guveni bir kerede bitirir.
        var yeni = new OdemeAyari
        {
            Id = Guid.NewGuid(),
            Iban = "",
            AliciAd = "",
            BankaAd = "",
            Tutar = 0,
            ParaBirimi = "TRY",
            GecerlilikGun = 7,
            Aktif = false,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow,
        };

        db.OdemeAyarlari.Add(yeni);
        await db.SaveChangesAsync(ct);
        return yeni;
    }
}
