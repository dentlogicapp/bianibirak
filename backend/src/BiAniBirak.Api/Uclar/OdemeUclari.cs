using System.Security.Claims;
using BiAniBirak.Api.Data;
using BiAniBirak.Api.Entities;
using BiAniBirak.Api.Servisler;
using Microsoft.EntityFrameworkCore;

namespace BiAniBirak.Api.Uclar;

// ODEME UCLARI - ciftin gordugu taraf.
//
// ===================== KURAL A: ODEME ONCE, DURUSTLUK SONRA =====================
//
// Musa'nin kesin talimati:
//
//   "Indirme butonu ONCELIKLE satin alma islemi icin calisan, satin alma SONRASI
//    ise boyut secimi vb. uyari ekranlarini gosterdikten sonra indirme
//    gerceklestiren bir buton olarak kurgulansin. Boylelikle durustlugumuz satin
//    alma islemlerini cekimserlige ve satis yapamamaya cevirmesin!"
//
// Bu yuzden bu uclarda HICBIR teknik uyari, DPI tablosu, "fotograflariniz seyrelir"
// notu YOKTUR. Odeme oncesi anlatilan tek sey: NE ALDIGIN ve NE KADAR ODEDIGIN.
//
// Durustluk, satin alma SONRASI dogru kullanim rehberligidir. Oncesi supe tohumudur.
//
// ===================== AKIS =====================
//
//   GET  /api/etkinlik/aktif/odeme/durum      -> buton ne yapacak? (odendi mi, bekliyor mu)
//   GET  /api/etkinlik/aktif/odeme/metinler   -> MSS + On Bilgilendirme (onay ekrani)
//   POST /api/etkinlik/aktif/odeme/baslat     -> onay kaniti + referans kodu uret
//   POST /api/etkinlik/aktif/odeme/bildir     -> "havalemi yaptim" (bilgilendirme)
public static class OdemeUclari
{
    public static void OdemeUclariniEkle(this WebApplication app)
    {
        app.MapGet("/api/etkinlik/aktif/odeme/durum", Durum).RequireAuthorization();
        app.MapGet("/api/etkinlik/aktif/odeme/metinler", Metinler).RequireAuthorization();
        app.MapPost("/api/etkinlik/aktif/odeme/baslat", Baslat).RequireAuthorization();
        app.MapPost("/api/etkinlik/aktif/odeme/bildir", Bildir).RequireAuthorization();
    }

    private static bool KullaniciKimligi(HttpContext ctx, out Guid id)
    {
        id = Guid.Empty;
        var s = ctx.User.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(s, out id);
    }

    private static async Task<(bool ok, Guid etkinlikId, string rol)> AktifTenant(
        HttpContext ctx, BiAniBirakDbContext db, Guid kullaniciId)
    {
        var claim = ctx.User.FindFirstValue("aktif_etkinlik_id");
        if (!Guid.TryParse(claim, out var etkinlikId))
            return (false, Guid.Empty, "");

        var uyelik = await db.EtkinlikUyelikleri.AsNoTracking()
            .FirstOrDefaultAsync(u => u.EtkinlikId == etkinlikId && u.KullaniciId == kullaniciId);
        if (uyelik == null)
            return (false, Guid.Empty, "");

        return (true, etkinlikId, uyelik.Rol);
    }

    private static IResult Hata(int kod, string hataKodu, string mesaj)
        => Results.Json(new { hata = hataKodu, mesaj }, statusCode: kod);

    // ---- DURUM: buton ne yapacak? ----
    private static async Task<IResult> Durum(
        HttpContext ctx, BiAniBirakDbContext db, CancellationToken ct)
    {
        if (!KullaniciKimligi(ctx, out var kid))
            return Hata(401, "YETKISIZ", "Oturum bulunamadı.");

        var (ok, etkinlikId, _) = await AktifTenant(ctx, db, kid);
        if (!ok) return Hata(403, "ERISIM_YOK", "Aktif defter bulunamadı.");

        var d = await OdemeServisi.DurumAsync(etkinlikId, db, ct);

        return Results.Ok(new
        {
            odemeGerekli = d.OdemeGerekli,
            odendi = d.Odendi,
            tutar = d.Tutar,
            paraBirimi = d.ParaBirimi,
            bekleyen = d.Bekleyen == null ? null : new
            {
                referansKodu = d.Bekleyen.ReferansKodu,
                tutar = d.Bekleyen.Tutar,
                sonGecerlilik = d.Bekleyen.SonGecerlilik,
                olusturma = d.Bekleyen.CreatedAt,
            },
        });
    }

    // ---- METINLER: MSS + On Bilgilendirme (odeme kapsami) ----
    private static async Task<IResult> Metinler(
        HttpContext ctx, BiAniBirakDbContext db, CancellationToken ct)
    {
        if (!KullaniciKimligi(ctx, out var kid))
            return Hata(401, "YETKISIZ", "Oturum bulunamadı.");

        var metinler = await OnayServisi.ZorunluMetinlerAsync(
            db, OnayServisi.KapsamOdeme, ct);

        return Results.Ok(metinler.Select(m => new
        {
            anahtar = m.Anahtar,
            baslik = m.Baslik,
            icerik = m.Icerik,
            surum = m.Surum,
        }));
    }

    // ---- BASLAT: onay kaniti + referans kodu ----
    private static async Task<IResult> Baslat(
        HttpContext ctx, BiAniBirakDbContext db, OdemeBaslatIstek istek, CancellationToken ct)
    {
        if (!KullaniciKimligi(ctx, out var kid))
            return Hata(401, "YETKISIZ", "Oturum bulunamadı.");

        var (ok, etkinlikId, _) = await AktifTenant(ctx, db, kid);
        if (!ok) return Hata(403, "ERISIM_YOK", "Aktif defter bulunamadı.");

        // GORUNTULEME MODU (super admin impersonation) yazamaz.
        // Global write-guard middleware zaten kesiyor; bu ikinci katman (defense in depth).
        if (ctx.User.FindFirstValue("goruntuleme_modu") == "true")
            return Hata(403, "SALT_OKUNUR", "Görüntüleme modunda ödeme başlatılamaz.");

        // HUKUKI ZORUNLULUK: Mesafeli Satis Sozlesmesi + On Bilgilendirme onayi.
        //
        // 6502 sayili Kanun + Mesafeli Sozlesmeler Yonetmeligi: tuketici, siparisi
        // onaylamadan ONCE bilgilendirilmeli ve sozlesmeyi kabul etmelidir.
        //
        // Onaysiz odeme baslatilamaz - "riza" kutusu isaretlenmeden buton calismaz.
        if (!istek.Riza)
            return Hata(400, "RIZA_ZORUNLU",
                "Ön Bilgilendirme Formu ve Mesafeli Satış Sözleşmesi'ni onaylamalısınız.");

        await using var tx = await db.Database.BeginTransactionAsync(ct);

        var (odeme, hata) = await OdemeServisi.BaslatAsync(etkinlikId, kid, db, ct);

        if (hata != null)
        {
            await tx.RollbackAsync(ct);
            return hata switch
            {
                "ODEME_KAPALI" => Hata(400, "ODEME_KAPALI", "Ödeme sistemi şu anda kapalı."),
                "FIYAT_TANIMSIZ" => Hata(400, "ODEME_KAPALI", "Ödeme sistemi şu anda kapalı."),
                "ZATEN_ODENDI" => Hata(409, "ZATEN_ODENDI", "Bu defterin ödemesi zaten yapılmış."),
                _ => Hata(500, "ODEME_BASLATILAMADI", "Ödeme başlatılamadı, tekrar deneyin."),
            };
        }

        // KANIT: hangi metni, hangi surumunu, hangi hash'iyle onayladi.
        //
        // Bu kayit, kayit-aninda ve davetli-rizasiyla AYNI zincirdedir (kullanim_onaylari).
        // Paralel yapi YOK - tek dogruluk kaynagi.
        //
        // EtkinlikId de yazilir: hangi defterin odemesi icin onayladigi belli olsun.
        var metinler = await OnayServisi.ZorunluMetinlerAsync(db, OnayServisi.KapsamOdeme, ct);
        var ip = OnayServisi.IpAl(ctx);
        var tarayici = ctx.Request.Headers.UserAgent.ToString();
        var simdi = DateTimeOffset.UtcNow;

        foreach (var m in metinler)
        {
            db.KullanimOnaylari.Add(new KullanimOnayi
            {
                Id = Guid.NewGuid(),
                KullaniciId = kid,
                MetinAnahtar = m.Anahtar,
                MetinSurum = m.Surum,
                MetinHash = m.Hash,
                EtkinlikId = etkinlikId,
                IpAdresi = ip,
                TarayiciBilgisi = tarayici.Length > 400 ? tarayici[..400] : tarayici,
                CreatedAt = simdi,
            });
        }

        db.DenetimGunlukleri.Add(new DenetimGunlugu
        {
            Id = Guid.NewGuid(),
            EtkinlikId = etkinlikId,
            KullaniciId = kid,
            Eylem = "ODEME_BASLATILDI",
            Varlik = "odeme",
            VarlikId = odeme!.Id,
            DegisenAlanlar = System.Text.Json.JsonSerializer.Serialize(new
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

        var ayar = await OdemeServisi.AyarAsync(db, ct);

        // TALIMAT: cift bu bilgilerle bankaya gidecek.
        return Results.Ok(new
        {
            referansKodu = odeme.ReferansKodu,
            tutar = odeme.Tutar,
            paraBirimi = odeme.ParaBirimi,
            sonGecerlilik = odeme.SonGecerlilik,
            iban = ayar.Iban,
            aliciAd = ayar.AliciAd,
            bankaAd = ayar.BankaAd,
        });
    }

    // ---- BILDIR: "havalemi yaptim" ----
    //
    // Bu uc parayi DOGRULAMAZ - dogrulayamaz da. Yaptigi tek sey: Musa'ya haber vermek.
    //
    // Neden yine de var: cift bir buton'a basmadan bekleme ekranina gecemez. "Havalemi
    // yaptim" demek, ona "isim bitti, simdi sira onlarda" hissi verir. Bu buton olmasa,
    // talimat ekraninda kalir ve ne yapacagini bilemez.
    private static async Task<IResult> Bildir(
        HttpContext ctx, BiAniBirakDbContext db, PushGonderici push, CancellationToken ct)
    {
        if (!KullaniciKimligi(ctx, out var kid))
            return Hata(401, "YETKISIZ", "Oturum bulunamadı.");

        var (ok, etkinlikId, _) = await AktifTenant(ctx, db, kid);
        if (!ok) return Hata(403, "ERISIM_YOK", "Aktif defter bulunamadı.");

        var odeme = await db.Odemeler
            .Where(o => o.EtkinlikId == etkinlikId
                        && o.Durum == OdemeServisi.DurumBekliyor
                        && o.SonGecerlilik > DateTimeOffset.UtcNow)
            .OrderByDescending(o => o.CreatedAt)
            .FirstOrDefaultAsync(ct);

        if (odeme == null)
            return Hata(404, "ODEME_BULUNAMADI", "Bekleyen ödeme bulunamadı.");

        var etkinlik = await db.Etkinlikler.AsNoTracking()
            .FirstOrDefaultAsync(e => e.Id == etkinlikId, ct);

        // SUPER ADMINLERE HABER VER - "yeni odeme bekliyor".
        //
        // Havalenin gercek maliyeti bu: her satis Musa'nin gozunu gerektirir.
        // Dogrulama asamasi icin kabul edilebilir; buyumede degil (o zaman iyzico/IAP).
        var superler = await db.Kullanicilar.AsNoTracking()
            .Where(k => k.SuperAdmin && k.DeletedAt == null)
            .Select(k => k.Id)
            .ToListAsync(ct);

        var ciftAd = etkinlik == null ? "Bir defter" : $"{etkinlik.Es1Ad} & {etkinlik.Es2Ad}";

        foreach (var sid in superler)
        {
            await push.GonderAsync(
                sid,
                "Yeni ödeme bekliyor",
                $"{ciftAd} - {odeme.Tutar:N0} {odeme.ParaBirimi} - {odeme.ReferansKodu}",
                url: "/panel/super",
                etkinlikId: null,
                // SESSIZ SAATE TABI: gece 03:00'te para bildirimi Musa'yi uyandirmasin.
                // Cift zaten bekliyor; sabah onaylanmasi yeterli.
                sessizSaateTabi: true,
                ct: ct);
        }

        db.DenetimGunlukleri.Add(new DenetimGunlugu
        {
            Id = Guid.NewGuid(),
            EtkinlikId = etkinlikId,
            KullaniciId = kid,
            Eylem = "ODEME_BILDIRILDI",
            Varlik = "odeme",
            VarlikId = odeme.Id,
            SistemEylemi = false,
            CreatedAt = DateTimeOffset.UtcNow,
        });

        await db.SaveChangesAsync(ct);

        return Results.Ok(new { bildirildi = true });
    }
}

public record OdemeBaslatIstek(bool Riza);
