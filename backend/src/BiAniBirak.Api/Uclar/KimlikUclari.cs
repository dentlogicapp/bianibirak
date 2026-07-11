using System.Security.Claims;
using System.Text.Json;
using BiAniBirak.Api.Data;
using BiAniBirak.Api.Entities;
using BiAniBirak.Api.Kimlik;
using BiAniBirak.Api.Modeller;
using BiAniBirak.Api.Servisler;
using Microsoft.EntityFrameworkCore;

namespace BiAniBirak.Api.Uclar;

// Kimlik uclari: kayit / giris / cikis / ben.
// Atomik yazim (tek SaveChangesAsync = transaction icinde), append-only audit,
// host-scoped cerez (CerezYardimcisi). Hata kodlari KAPITAL_UNDERSCORE.
public static class KimlikUclari
{
    public static void KimlikUclariniEkle(this WebApplication app)
    {
        app.MapPost("/api/kayit", Kayit);
        app.MapPost("/api/giris", Giris);
        app.MapPost("/api/cikis", Cikis);
        app.MapGet("/api/ben", Ben).RequireAuthorization();
        app.MapPut("/api/profil", ProfilGuncelle).RequireAuthorization();
    }

    private static IResult Hata(int durum, string kod, string mesaj)
        => Results.Json(new { hata = kod, mesaj }, statusCode: durum);

    private static object KullaniciYaniti(Kullanici k)
        => new { id = k.Id, ad = k.Ad, email = k.Email, cinsiyet = k.Cinsiyet, super_admin = k.SuperAdmin };

    private static async Task<IResult> Kayit(
        KayitIstek istek, BiAniBirakDbContext db, SifreServisi sifreServisi,
        JwtServisi jwtServisi, HttpResponse yanit)
    {
        var email = (istek.Email ?? "").Trim().ToLowerInvariant();
        var ad = (istek.Ad ?? "").Trim();
        var sifre = istek.Sifre ?? "";

        if (ad.Length < 2 || !email.Contains('@') || !email.Contains('.') || sifre.Length < 8)
            return Hata(400, "DOGRULAMA_HATASI",
                "Ad, gecerli e-posta ve en az 8 karakter sifre gereklidir.");

        if (await db.Kullanicilar.AnyAsync(k => k.Email == email && k.DeletedAt == null))
            return Hata(409, "EMAIL_KULLANIMDA", "Bu e-posta zaten kayitli.");

        var simdi = DateTimeOffset.UtcNow;
        var kullanici = new Kullanici
        {
            Id = Guid.NewGuid(),
            Email = email,
            SifreHash = sifreServisi.Hashle(sifre),
            Ad = ad,
            SuperAdmin = false,
            CreatedAt = simdi,
            UpdatedAt = simdi,
        };
        db.Kullanicilar.Add(kullanici);
        db.DenetimGunlukleri.Add(Denetim("KAYIT", kullanici.Id, kullanici.Id,
            new { email = kullanici.Email }, simdi));
        await db.SaveChangesAsync(); // tek SaveChanges = atomik transaction

        CerezYardimcisi.Yaz(yanit, jwtServisi.Uret(kullanici), jwtServisi.GecerlilikGun);
        return Results.Json(KullaniciYaniti(kullanici));
    }

    private static async Task<IResult> Giris(
        GirisIstek istek, BiAniBirakDbContext db, SifreServisi sifreServisi,
        JwtServisi jwtServisi, HttpResponse yanit)
    {
        var email = (istek.Email ?? "").Trim().ToLowerInvariant();
        var sifre = istek.Sifre ?? "";
        if (email.Length == 0 || sifre.Length == 0)
            return Hata(400, "DOGRULAMA_HATASI", "E-posta ve sifre gereklidir.");

        var kullanici = await db.Kullanicilar
            .FirstOrDefaultAsync(k => k.Email == email && k.DeletedAt == null);
        if (kullanici == null || !sifreServisi.Dogrula(sifre, kullanici.SifreHash))
            return Hata(401, "KIMLIK_HATALI", "E-posta veya sifre hatali.");

        db.DenetimGunlukleri.Add(Denetim("GIRIS", kullanici.Id, kullanici.Id, null, DateTimeOffset.UtcNow));
        await db.SaveChangesAsync();

        CerezYardimcisi.Yaz(yanit, jwtServisi.Uret(kullanici), jwtServisi.GecerlilikGun);
        return Results.Json(KullaniciYaniti(kullanici));
    }

    private static IResult Cikis(HttpResponse yanit)
    {
        CerezYardimcisi.Sil(yanit);
        return Results.Json(new { durum = "cikildi" });
    }

    private static async Task<IResult> Ben(HttpContext ctx, BiAniBirakDbContext db)
    {
        var kimlik = ctx.User.FindFirstValue(ClaimTypes.NameIdentifier)
                     ?? ctx.User.FindFirstValue("sub");
        if (!Guid.TryParse(kimlik, out var id))
            return Hata(401, "ERISIM_YOK", "Oturum bulunamadı.");

        var kullanici = await db.Kullanicilar
            .FirstOrDefaultAsync(k => k.Id == id && k.DeletedAt == null);
        if (kullanici == null)
            return Hata(401, "ERISIM_YOK", "Kullanıcı bulunamadı.");

        // Goruntuleme modu (super admin salt-okunur girisi) - frontend bant gosterir.
        var goruntulemeModu = ctx.User.FindFirstValue("goruntuleme_modu") == "true";
        string? hedefDefter = null;
        if (goruntulemeModu &&
            Guid.TryParse(ctx.User.FindFirstValue("aktif_etkinlik_id"), out var hedefId))
        {
            hedefDefter = await db.Etkinlikler.AsNoTracking()
                .Where(e => e.Id == hedefId)
                .Select(e => e.Es1Ad + " & " + e.Es2Ad)
                .FirstOrDefaultAsync();
        }

        return Results.Json(new
        {
            id = kullanici.Id,
            ad = kullanici.Ad,
            email = kullanici.Email,
            cinsiyet = kullanici.Cinsiyet,
            super_admin = kullanici.SuperAdmin,
            goruntuleme_modu = goruntulemeModu,
            goruntulenen_defter = hedefDefter,
        });
    }

    // Profil guncelle: ad + cinsiyet. E-posta DEGISTIRILEMEZ (guvenlik/kimlik).
    private static async Task<IResult> ProfilGuncelle(
        ProfilGuncelleIstek istek, HttpContext ctx, BiAniBirakDbContext db)
    {
        var kimlik = ctx.User.FindFirstValue(ClaimTypes.NameIdentifier)
                     ?? ctx.User.FindFirstValue("sub");
        if (!Guid.TryParse(kimlik, out var id))
            return Hata(401, "ERISIM_YOK", "Oturum bulunamadi.");

        var kullanici = await db.Kullanicilar
            .FirstOrDefaultAsync(k => k.Id == id && k.DeletedAt == null);
        if (kullanici == null)
            return Hata(401, "ERISIM_YOK", "Kullanici bulunamadi.");

        var ad = (istek.Ad ?? "").Trim();
        if (ad.Length < 2)
            return Hata(400, "DOGRULAMA_HATASI", "Ad en az 2 karakter olmalidir.");

        // Cinsiyet: yalniz "kadin" | "erkek" | null kabul edilir.
        string? cinsiyet = (istek.Cinsiyet ?? "").Trim().ToLowerInvariant();
        if (cinsiyet == "") cinsiyet = null;
        if (cinsiyet != null && cinsiyet != "kadin" && cinsiyet != "erkek")
            return Hata(400, "DOGRULAMA_HATASI", "Cinsiyet gecersiz.");

        var eskiAd = kullanici.Ad;
        var eskiCinsiyet = kullanici.Cinsiyet;
        kullanici.Ad = ad;
        kullanici.Cinsiyet = cinsiyet;
        kullanici.UpdatedAt = DateTimeOffset.UtcNow;

        db.DenetimGunlukleri.Add(new DenetimGunlugu
        {
            Id = Guid.NewGuid(),
            EtkinlikId = null,
            KullaniciId = kullanici.Id,
            Eylem = "PROFIL_GUNCELLENDI",
            Varlik = "kullanici",
            DegisenAlanlar = JsonSerializer.Serialize(new
            {
                ad = new { eski = eskiAd, yeni = ad },
                cinsiyet = new { eski = eskiCinsiyet, yeni = cinsiyet },
            }),
            CreatedAt = DateTimeOffset.UtcNow,
        });

        await db.SaveChangesAsync();
        return Results.Json(KullaniciYaniti(kullanici));
    }

    private static DenetimGunlugu Denetim(
        string eylem, Guid? kullaniciId, Guid? varlikId, object? degisen, DateTimeOffset zaman)
        => new()
        {
            Id = Guid.NewGuid(),
            KullaniciId = kullaniciId,
            Eylem = eylem,
            Varlik = "kullanicilar",
            VarlikId = varlikId,
            DegisenAlanlar = degisen == null ? null : JsonSerializer.Serialize(degisen),
            CreatedAt = zaman,
        };
}
