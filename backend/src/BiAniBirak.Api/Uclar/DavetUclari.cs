using System.Security.Claims;
using System.Text.Json;
using BiAniBirak.Api.Data;
using BiAniBirak.Api.Entities;
using BiAniBirak.Api.Servisler;
using Microsoft.EntityFrameworkCore;

namespace BiAniBirak.Api.Uclar;

// Es daveti (Karar 5): mail servisi GEREKTIRMEZ - paylasilabilir davet linki.
// Kurucu es davet linki uretir, esine WhatsApp/SMS ile gonderir; es tiklayip
// kayit/giris yapar ve etkinlige DIGER es rolu (es2/es1) ile katilir.
public static class DavetUclari
{
    public static void DavetUclariniEkle(this WebApplication app)
    {
        // Kurucu es: davet olustur / mevcut daveti getir
        app.MapPost("/api/etkinlik/aktif/davet", DavetOlustur).RequireAuthorization();
        app.MapGet("/api/etkinlik/aktif/davet", DavetDurum).RequireAuthorization();

        // Davet edilen es: public bilgi + kabul (kabul icin oturum sart)
        app.MapGet("/api/davet/{token}", DavetBilgi);
        app.MapPost("/api/davet/{token}/kabul", DavetKabul).RequireAuthorization();
    }

    private static bool KullaniciKimligi(HttpContext ctx, out Guid id)
    {
        var kimlik = ctx.User.FindFirstValue(ClaimTypes.NameIdentifier)
                     ?? ctx.User.FindFirstValue("sub");
        return Guid.TryParse(kimlik, out id);
    }

    private static IResult Hata(int kod, string hataKodu, string mesaj)
        => Results.Json(new { hata = hataKodu, mesaj }, statusCode: kod);

    // Oturumdaki kullanicinin aktif etkinligi + rolu
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

    // Davet olustur: diger es rolu icin token uret (varsa mevcut bekleyeni dondur).
    private static async Task<IResult> DavetOlustur(
        HttpContext ctx, BiAniBirakDbContext db)
    {
        if (!KullaniciKimligi(ctx, out var kullaniciId))
            return Hata(401, "ERISIM_YOK", "Oturum bulunamadi.");
        var (ok, etkinlikId, rol) = await AktifTenant(ctx, db, kullaniciId);
        if (!ok)
            return Hata(403, "ERISIM_YOK", "Aktif etkinlik yok veya uye degilsiniz.");

        var hedefRol = rol == "es1" ? "es2" : "es1";

        // Hedef rol zaten dolu mu? (es katilmis)
        var zatenUye = await db.EtkinlikUyelikleri.AsNoTracking()
            .AnyAsync(u => u.EtkinlikId == etkinlikId && u.Rol == hedefRol);
        if (zatenUye)
            return Hata(409, "ES_ZATEN_UYE", "Esiniz bu etkinlige zaten katilmis.");

        // Bekleyen davet varsa onu dondur (yeni token uretme - tek dogruluk kaynagi)
        var mevcut = await db.UyeDavetleri
            .FirstOrDefaultAsync(d => d.EtkinlikId == etkinlikId
                                      && d.HedefRol == hedefRol
                                      && d.Durum == "beklemede");
        if (mevcut != null)
            return Results.Json(new { token = mevcut.Token, hedef_rol = mevcut.HedefRol, durum = mevcut.Durum });

        var simdi = DateTimeOffset.UtcNow;
        var davet = new UyeDaveti
        {
            Id = Guid.NewGuid(),
            EtkinlikId = etkinlikId,
            Token = TokenUreteci.Uret(),
            HedefRol = hedefRol,
            Durum = "beklemede",
            CreatedAt = simdi,
        };
        db.UyeDavetleri.Add(davet);
        db.DenetimGunlukleri.Add(new DenetimGunlugu
        {
            Id = Guid.NewGuid(),
            EtkinlikId = etkinlikId,
            KullaniciId = kullaniciId,
            Eylem = "ES_DAVETI_OLUSTURULDU",
            Varlik = "uye_davetleri",
            VarlikId = davet.Id,
            DegisenAlanlar = JsonSerializer.Serialize(new { hedef_rol = hedefRol }),
            CreatedAt = simdi,
        });
        await db.SaveChangesAsync();

        return Results.Json(new { token = davet.Token, hedef_rol = davet.HedefRol, durum = davet.Durum });
    }

    // Davet durumu: es katilmis mi, bekleyen davet var mi?
    private static async Task<IResult> DavetDurum(HttpContext ctx, BiAniBirakDbContext db)
    {
        if (!KullaniciKimligi(ctx, out var kullaniciId))
            return Hata(401, "ERISIM_YOK", "Oturum bulunamadi.");
        var (ok, etkinlikId, rol) = await AktifTenant(ctx, db, kullaniciId);
        if (!ok)
            return Hata(403, "ERISIM_YOK", "Aktif etkinlik yok veya uye degilsiniz.");

        var hedefRol = rol == "es1" ? "es2" : "es1";
        var esKatildi = await db.EtkinlikUyelikleri.AsNoTracking()
            .AnyAsync(u => u.EtkinlikId == etkinlikId && u.Rol == hedefRol);

        var bekleyen = await db.UyeDavetleri.AsNoTracking()
            .FirstOrDefaultAsync(d => d.EtkinlikId == etkinlikId
                                      && d.HedefRol == hedefRol
                                      && d.Durum == "beklemede");

        return Results.Json(new
        {
            es_katildi = esKatildi,
            hedef_rol = hedefRol,
            token = bekleyen?.Token,
        });
    }

    // Public: davet linki bilgisi (davet edilen es ne gorecek)
    private static async Task<IResult> DavetBilgi(string token, BiAniBirakDbContext db)
    {
        var davet = await db.UyeDavetleri.AsNoTracking()
            .FirstOrDefaultAsync(d => d.Token == token);
        if (davet == null)
            return Hata(404, "DAVET_BULUNAMADI", "Davet bulunamadi.");

        var etkinlik = await db.Etkinlikler.AsNoTracking()
            .FirstOrDefaultAsync(e => e.Id == davet.EtkinlikId);
        if (etkinlik == null)
            return Hata(404, "ETKINLIK_BULUNAMADI", "Etkinlik bulunamadi.");

        return Results.Json(new
        {
            durum = davet.Durum,
            hedef_rol = davet.HedefRol,
            es1_ad = etkinlik.Es1Ad,
            es2_ad = etkinlik.Es2Ad,
            tur = etkinlik.Tur,
            etkinlik_tarihi = etkinlik.EtkinlikTarihi,
        });
    }

    // Kabul: oturumdaki kullanici etkinlige hedef rol ile katilir (atomik).
    private static async Task<IResult> DavetKabul(
        string token, HttpContext ctx, BiAniBirakDbContext db, JwtServisi jwtServisi,
        HttpResponse yanit, PushGonderici push)
    {
        if (!KullaniciKimligi(ctx, out var kullaniciId))
            return Hata(401, "ERISIM_YOK", "Oturum bulunamadi.");

        var davet = await db.UyeDavetleri
            .FirstOrDefaultAsync(d => d.Token == token);
        if (davet == null)
            return Hata(404, "DAVET_BULUNAMADI", "Davet bulunamadi.");
        if (davet.Durum != "beklemede")
            return Hata(409, "DAVET_GECERSIZ", "Bu davet daha once kullanilmis.");

        // Zaten uye mi?
        var mevcutUyelik = await db.EtkinlikUyelikleri.AsNoTracking()
            .AnyAsync(u => u.EtkinlikId == davet.EtkinlikId && u.KullaniciId == kullaniciId);
        if (mevcutUyelik)
            return Hata(409, "ZATEN_UYE", "Bu etkinlige zaten uyesiniz.");

        // Hedef rol dolduysa (yaris) reddet
        var rolDolu = await db.EtkinlikUyelikleri.AsNoTracking()
            .AnyAsync(u => u.EtkinlikId == davet.EtkinlikId && u.Rol == davet.HedefRol);
        if (rolDolu)
            return Hata(409, "ES_ZATEN_UYE", "Bu rol zaten dolu.");

        var simdi = DateTimeOffset.UtcNow;
        db.EtkinlikUyelikleri.Add(new EtkinlikUyeligi
        {
            Id = Guid.NewGuid(),
            EtkinlikId = davet.EtkinlikId,
            KullaniciId = kullaniciId,
            Rol = davet.HedefRol,
            CreatedAt = simdi,
        });
        davet.Durum = "kullanildi";

        db.DenetimGunlukleri.Add(new DenetimGunlugu
        {
            Id = Guid.NewGuid(),
            EtkinlikId = davet.EtkinlikId,
            KullaniciId = kullaniciId,
            Eylem = "ES_KATILDI",
            Varlik = "etkinlik_uyelikleri",
            VarlikId = davet.Id,
            DegisenAlanlar = JsonSerializer.Serialize(new { rol = davet.HedefRol }),
            CreatedAt = simdi,
        });

        await db.SaveChangesAsync(); // atomik: uyelik + davet + audit

        // Kurucu ese haber (es katildi)
        var digerRol = davet.HedefRol == "es1" ? "es2" : "es1";
        var kurucu = await db.EtkinlikUyelikleri.AsNoTracking()
            .FirstOrDefaultAsync(u => u.EtkinlikId == davet.EtkinlikId && u.Rol == digerRol);
        var kullanici = await db.Kullanicilar.AsNoTracking()
            .FirstOrDefaultAsync(k => k.Id == kullaniciId);
        if (kurucu != null && kullanici != null)
        {
            _ = push.GonderAsync(kurucu.KullaniciId,
                "Esin defterine katildi",
                $"{kullanici.Ad} ortak ani defterinize katildi. Artik kendi kuyrugunu yonetebilir.",
                url: "/panel/etkinlik", etkinlikId: davet.EtkinlikId);
        }

        // Aktif etkinlik olarak ayarla + JWT yenile (kullanici dogrudan deftere dussun)
        var kul = await db.Kullanicilar.AsNoTracking()
            .FirstOrDefaultAsync(k => k.Id == kullaniciId);
        if (kul != null)
        {
            var jwt = jwtServisi.Uret(kul, davet.EtkinlikId);
            Kimlik.CerezYardimcisi.Yaz(yanit, jwt, jwtServisi.GecerlilikGun);
        }

        return Results.Json(new { durum = "katildi", etkinlik_id = davet.EtkinlikId, rol = davet.HedefRol });
    }
}
