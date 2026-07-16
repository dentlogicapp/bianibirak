using System.Security.Claims;
using System.Text.Json;
using BiAniBirak.Api.Data;
using BiAniBirak.Api.Entities;
using BiAniBirak.Api.Servisler;
using Microsoft.EntityFrameworkCore;

namespace BiAniBirak.Api.Uclar;

// SUPER ODEME UCLARI - Musa'nin gordugu taraf.
//
// Havalede "odeme onayi" bir INSAN kararidir: bankada kodu gorursun, onaylarsin.
// Otomasyon YOK - ve bilincli olarak yok. Eksik tutar, farkli isimden gelen havale,
// aciklamasi bos gonderi... hepsi insan yargisi ister.
//
// iyzico/IAP geldiginde bu ucun karsiligi bir WEBHOOK olacak: saglayici "odendi" der,
// sistem ayni Odeme kaydini "onaylandi"ya ceker. Paywall hicbir sey fark etmez.
public static class SuperOdemeUclari
{
    public static void SuperOdemeUclariniEkle(this WebApplication app)
    {
        app.MapGet("/api/super/odemeler", Liste).RequireAuthorization();
        app.MapPost("/api/super/odeme/{id:guid}/onayla", Onayla).RequireAuthorization();
        app.MapPost("/api/super/odeme/{id:guid}/reddet", Reddet).RequireAuthorization();
        app.MapGet("/api/super/odeme/ayar", AyarGetir).RequireAuthorization();
        app.MapPut("/api/super/odeme/ayar", AyarKaydet).RequireAuthorization();
    }

    private static bool KullaniciKimligi(HttpContext ctx, out Guid id)
    {
        id = Guid.Empty;
        var s = ctx.User.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(s, out id);
    }

    private static async Task<(bool ok, Kullanici? kullanici)> SuperAdminMi(
        HttpContext ctx, BiAniBirakDbContext db)
    {
        if (!KullaniciKimligi(ctx, out var id)) return (false, null);
        var k = await db.Kullanicilar.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id);
        if (k == null || !k.SuperAdmin) return (false, null);
        return (true, k);
    }

    private static IResult Hata(int kod, string hataKodu, string mesaj)
        => Results.Json(new { hata = hataKodu, mesaj }, statusCode: kod);

    // ---- LISTE ----
    private static async Task<IResult> Liste(
        HttpContext ctx, BiAniBirakDbContext db, CancellationToken ct)
    {
        var (ok, _) = await SuperAdminMi(ctx, db);
        if (!ok) return Hata(403, "ERISIM_YOK", "Yetkiniz yok.");

        var odemeler = await db.Odemeler.AsNoTracking()
            .OrderByDescending(o => o.CreatedAt)
            .Take(300)
            .ToListAsync(ct);

        var etkinlikIdler = odemeler.Select(o => o.EtkinlikId).Distinct().ToList();
        var etkinlikler = await db.Etkinlikler.AsNoTracking()
            .Where(e => etkinlikIdler.Contains(e.Id))
            .Select(e => new { e.Id, e.Es1Ad, e.Es2Ad, e.SilindiMi })
            .ToListAsync(ct);

        var kullaniciIdler = odemeler
            .Where(o => o.KullaniciId != null)
            .Select(o => o.KullaniciId!.Value).Distinct().ToList();
        var kullanicilar = await db.Kullanicilar.AsNoTracking()
            .Where(k => kullaniciIdler.Contains(k.Id))
            .Select(k => new { k.Id, k.Ad, k.Email })
            .ToListAsync(ct);

        var simdi = DateTimeOffset.UtcNow;

        var liste = odemeler.Select(o =>
        {
            var e = etkinlikler.FirstOrDefault(x => x.Id == o.EtkinlikId);
            var k = kullanicilar.FirstOrDefault(x => x.Id == o.KullaniciId);

            return new
            {
                id = o.Id,
                etkinlikId = o.EtkinlikId,
                defterAd = e == null ? "(silinmiş defter)" : $"{e.Es1Ad} & {e.Es2Ad}",
                defterSilindi = e?.SilindiMi ?? true,
                odeyenAd = k?.Ad,
                odeyenEmail = k?.Email,
                tutar = o.Tutar,
                paraBirimi = o.ParaBirimi,
                saglayici = o.Saglayici,
                referansKodu = o.ReferansKodu,
                durum = o.Durum,
                not = o.Not,
                onayZamani = o.OnayZamani,
                sonGecerlilik = o.SonGecerlilik,
                // Bekleyen ama suresi gecmis olanlari isaretle (arka plan gorevi
                // henuz calismamis olabilir - kullanici anlik gercegi gorsun).
                suresiGecti = o.Durum == OdemeServisi.DurumBekliyor && o.SonGecerlilik <= simdi,
                createdAt = o.CreatedAt,
            };
        }).ToList();

        var ayar = await OdemeServisi.AyarAsync(db, ct);

        return Results.Ok(new
        {
            odemeler = liste,
            ozet = new
            {
                bekleyen = liste.Count(x => x.durum == OdemeServisi.DurumBekliyor && !x.suresiGecti),
                onaylanan = liste.Count(x => x.durum == OdemeServisi.DurumOnaylandi),
                reddedilen = liste.Count(x => x.durum == OdemeServisi.DurumReddedildi),
                toplamTahsilat = liste
                    .Where(x => x.durum == OdemeServisi.DurumOnaylandi)
                    .Sum(x => x.tutar),
            },
            sistemAktif = ayar.Aktif,
        });
    }

    // ---- ONAYLA ----
    //
    // Bu tek tik, ciftin mirasinin kilidini acar.
    private static async Task<IResult> Onayla(
        Guid id, HttpContext ctx, BiAniBirakDbContext db, PushGonderici push,
        SuperOdemeNotIstek? istek, CancellationToken ct)
    {
        var (ok, aktor) = await SuperAdminMi(ctx, db);
        if (!ok) return Hata(403, "ERISIM_YOK", "Yetkiniz yok.");

        var odeme = await db.Odemeler.FirstOrDefaultAsync(o => o.Id == id, ct);
        if (odeme == null)
            return Hata(404, "ODEME_BULUNAMADI", "Ödeme bulunamadı.");

        if (odeme.Durum == OdemeServisi.DurumOnaylandi)
            return Hata(409, "ZATEN_ONAYLI", "Bu ödeme zaten onaylanmış.");

        await using var tx = await db.Database.BeginTransactionAsync(ct);

        var simdi = DateTimeOffset.UtcNow;

        odeme.Durum = OdemeServisi.DurumOnaylandi;
        odeme.OnaylayanKullaniciId = aktor!.Id;
        odeme.OnayZamani = simdi;
        odeme.UpdatedAt = simdi;
        if (!string.IsNullOrWhiteSpace(istek?.Not))
            odeme.Not = istek.Not.Trim();

        // DENETIM - ve burada BILINCLI BIR ISTISNA yapiyoruz.
        //
        // KURAL E: super admin eylemleri ciftin denetim gunlugunde GORUNMEZ
        // (SistemEylemi = true). Cift, yoneticinin defterine baktigini gormemeli -
        // bu bir mahremiyet meselesi.
        //
        // AMA BU EYLEM FARKLI. Cift kendi odemesinin onaylandigini GORMELIDIR.
        //
        // "Odemeniz onaylandi" satirini denetim gunlugunde gormek, ciftin parasinin
        // ulastigina dair KANITIDIR. Bunu gizlemek, guven veren bir kaydi
        // saklamaktir - ve guven, bu urunun tamamidir.
        //
        // Bu yuzden: SistemEylemi = FALSE. Cift bunu gorur.
        db.DenetimGunlukleri.Add(new DenetimGunlugu
        {
            Id = Guid.NewGuid(),
            EtkinlikId = odeme.EtkinlikId,
            KullaniciId = odeme.KullaniciId,
            Eylem = "ODEME_ONAYLANDI",
            Varlik = "odeme",
            VarlikId = odeme.Id,
            DegisenAlanlar = JsonSerializer.Serialize(new
            {
                referans = odeme.ReferansKodu,
                tutar = odeme.Tutar,
                saglayici = odeme.Saglayici,
            }),
            SistemEylemi = false,
            CreatedAt = simdi,
        });

        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);

        // CIFTE HABER VER - defterin uyeleri (iki es de).
        //
        // Odeme ETKINLIGE ait; ikisi de indirebilir. Ikisine de haber verilir -
        // biri odediyse digeri de bilmelidir ("param bosa mi gitti?" endisesi olmasin).
        var uyeler = await db.EtkinlikUyelikleri.AsNoTracking()
            .Where(u => u.EtkinlikId == odeme.EtkinlikId)
            .Select(u => u.KullaniciId)
            .ToListAsync(ct);

        foreach (var uid in uyeler)
        {
            await push.GonderAsync(
                uid,
                "Ödemen onaylandı",
                "Defterin indirmeye hazır. İndir, yedekle - 37. günde kalıcı olarak silinecek.",
                url: "/panel/kurasyon",
                etkinlikId: odeme.EtkinlikId,
                // SESSIZ SAATE TABI DEGIL.
                //
                // Cift bekliyor. Belki gece yarisi havale yapti ve uyumadan onayi
                // gormek istiyor. Bu bildirimi 08:00'e ertelemek, sevincini
                // geciktirmektir - ve odedigi paranin ulastigini bilmemek, uykusuz
                // birakan turden bir belirsizliktir.
                sessizSaateTabi: false,
                ct: ct);
        }

        return Results.Ok(new { onaylandi = true, referans = odeme.ReferansKodu });
    }

    // ---- REDDET ----
    private static async Task<IResult> Reddet(
        Guid id, HttpContext ctx, BiAniBirakDbContext db,
        SuperOdemeNotIstek? istek, CancellationToken ct)
    {
        var (ok, aktor) = await SuperAdminMi(ctx, db);
        if (!ok) return Hata(403, "ERISIM_YOK", "Yetkiniz yok.");

        var odeme = await db.Odemeler.FirstOrDefaultAsync(o => o.Id == id, ct);
        if (odeme == null)
            return Hata(404, "ODEME_BULUNAMADI", "Ödeme bulunamadı.");

        if (odeme.Durum == OdemeServisi.DurumOnaylandi)
            return Hata(409, "ONAYLI_REDDEDILEMEZ",
                "Onaylanmış ödeme reddedilemez. Önce iade sürecini yürütün.");

        var simdi = DateTimeOffset.UtcNow;

        odeme.Durum = OdemeServisi.DurumReddedildi;
        odeme.OnaylayanKullaniciId = aktor!.Id;
        odeme.OnayZamani = simdi;
        odeme.UpdatedAt = simdi;
        odeme.Not = istek?.Not?.Trim();

        // RED, ciftin denetiminde GORUNMEZ (SistemEylemi = true).
        //
        // Neden onaydan farkli: onay guven verir, red UTANDIRIR. "Odemeniz
        // reddedildi" satirini defterin denetim gunlugunde birakmak, ciftin
        // yillar sonra bakacagi mirasa bir leke birakmaktir.
        //
        // Cift zaten bekleme ekraninda durumu gorur ve gerekiyorsa iletisime gecer.
        // Super panel Canli Akis bu kaydi HALA gorur - yonetici hesap verir.
        db.DenetimGunlukleri.Add(new DenetimGunlugu
        {
            Id = Guid.NewGuid(),
            EtkinlikId = odeme.EtkinlikId,
            KullaniciId = aktor.Id,
            Eylem = "ODEME_REDDEDILDI",
            Varlik = "odeme",
            VarlikId = odeme.Id,
            DegisenAlanlar = JsonSerializer.Serialize(new
            {
                referans = odeme.ReferansKodu,
                not = odeme.Not,
            }),
            SistemEylemi = true,
            CreatedAt = simdi,
        });

        await db.SaveChangesAsync(ct);

        return Results.Ok(new { reddedildi = true });
    }

    // ---- AYAR GETIR ----
    private static async Task<IResult> AyarGetir(
        HttpContext ctx, BiAniBirakDbContext db, CancellationToken ct)
    {
        var (ok, _) = await SuperAdminMi(ctx, db);
        if (!ok) return Hata(403, "ERISIM_YOK", "Yetkiniz yok.");

        var a = await OdemeServisi.AyarAsync(db, ct);

        return Results.Ok(new
        {
            iban = a.Iban,
            aliciAd = a.AliciAd,
            bankaAd = a.BankaAd,
            tutar = a.Tutar,
            paraBirimi = a.ParaBirimi,
            gecerlilikGun = a.GecerlilikGun,
            aktif = a.Aktif,
        });
    }

    // ---- AYAR KAYDET ----
    private static async Task<IResult> AyarKaydet(
        HttpContext ctx, BiAniBirakDbContext db,
        OdemeAyarIstek istek, CancellationToken ct)
    {
        var (ok, aktor) = await SuperAdminMi(ctx, db);
        if (!ok) return Hata(403, "ERISIM_YOK", "Yetkiniz yok.");

        var ayar = await db.OdemeAyarlari.FirstOrDefaultAsync(ct);
        if (ayar == null)
        {
            await OdemeServisi.AyarAsync(db, ct);
            ayar = await db.OdemeAyarlari.FirstOrDefaultAsync(ct);
            if (ayar == null)
                return Hata(500, "AYAR_OLUSTURULAMADI", "Ödeme ayarı oluşturulamadı.");
        }

        // SISTEMI ACARKEN DOGRULA.
        //
        // Bos IBAN'la ya da sifir fiyatla sistemi acmak, ciftlere "bize para gonderin"
        // deyip nereye gonderecegini soylememektir. Guveni bir kerede bitirir.
        if (istek.Aktif)
        {
            if (string.IsNullOrWhiteSpace(istek.Iban))
                return Hata(400, "DOGRULAMA_HATASI", "Sistemi açmak için IBAN gerekli.");
            if (string.IsNullOrWhiteSpace(istek.AliciAd))
                return Hata(400, "DOGRULAMA_HATASI", "Sistemi açmak için alıcı adı gerekli.");
            if (istek.Tutar <= 0)
                return Hata(400, "DOGRULAMA_HATASI", "Sistemi açmak için fiyat gerekli.");
        }

        var eskiAktif = ayar.Aktif;
        var eskiTutar = ayar.Tutar;

        ayar.Iban = (istek.Iban ?? "").Replace(" ", "").Trim().ToUpperInvariant();
        ayar.AliciAd = (istek.AliciAd ?? "").Trim();
        ayar.BankaAd = (istek.BankaAd ?? "").Trim();
        ayar.Tutar = istek.Tutar;
        ayar.GecerlilikGun = istek.GecerlilikGun < 1 ? 7 : istek.GecerlilikGun;
        ayar.Aktif = istek.Aktif;
        ayar.UpdatedAt = DateTimeOffset.UtcNow;

        db.DenetimGunlukleri.Add(new DenetimGunlugu
        {
            Id = Guid.NewGuid(),
            EtkinlikId = null,
            KullaniciId = aktor!.Id,
            Eylem = "ODEME_AYARI_GUNCELLENDI",
            Varlik = "odeme_ayari",
            VarlikId = ayar.Id,
            DegisenAlanlar = JsonSerializer.Serialize(new
            {
                aktif = new { eski = eskiAktif, yeni = ayar.Aktif },
                tutar = new { eski = eskiTutar, yeni = ayar.Tutar },
            }),
            SistemEylemi = true,
            CreatedAt = DateTimeOffset.UtcNow,
        });

        await db.SaveChangesAsync(ct);

        return Results.Ok(new { kaydedildi = true });
    }
}

public record SuperOdemeNotIstek(string? Not);
public record OdemeAyarIstek(
    string? Iban, string? AliciAd, string? BankaAd,
    decimal Tutar, int GecerlilikGun, bool Aktif);
