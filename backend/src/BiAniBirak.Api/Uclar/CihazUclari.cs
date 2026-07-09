using System.Security.Claims;
using BiAniBirak.Api.Data;
using BiAniBirak.Api.Entities;
using BiAniBirak.Api.Modeller;
using Microsoft.EntityFrameworkCore;

namespace BiAniBirak.Api.Uclar;

// Push cihaz kaydi + sessiz saat ayari. VAPID public key (frontend abone olurken).
public static class CihazUclari
{
    public static void CihazUclariniEkle(this WebApplication app)
    {
        app.MapGet("/api/push/anahtar", VapidAnahtar); // public: frontend abone olurken
        app.MapPost("/api/cihaz", CihazKaydet).RequireAuthorization();
        app.MapGet("/api/sessiz-saat", SessizSaatGetir).RequireAuthorization();
        app.MapPut("/api/sessiz-saat", SessizSaatGuncelle).RequireAuthorization();
    }

    private static IResult Hata(int durum, string kod, string mesaj)
        => Results.Json(new { hata = kod, mesaj }, statusCode: durum);

    private static bool KullaniciKimligi(HttpContext ctx, out Guid id)
    {
        var ham = ctx.User.FindFirstValue(ClaimTypes.NameIdentifier)
                  ?? ctx.User.FindFirstValue("sub");
        return Guid.TryParse(ham, out id);
    }

    // VAPID public key - frontend pushManager.subscribe icin gerekli.
    private static IResult VapidAnahtar(IConfiguration config)
    {
        var pub = config["Vapid:PublicKey"];
        if (string.IsNullOrWhiteSpace(pub))
            return Hata(503, "PUSH_YAPILANDIRILMAMIS", "Bildirim altyapisi hazir degil.");
        return Results.Json(new { anahtar = pub });
    }

    // Cihaz kaydet (upsert PushToken bazli - benzersiz).
    private static async Task<IResult> CihazKaydet(
        CihazKayitIstek istek, HttpContext ctx, BiAniBirakDbContext db)
    {
        if (!KullaniciKimligi(ctx, out var kullaniciId))
            return Hata(401, "ERISIM_YOK", "Oturum bulunamadi.");

        var token = (istek.PushToken ?? "").Trim();
        if (token.Length < 8)
            return Hata(400, "DOGRULAMA_HATASI", "Gecersiz push token.");

        var platform = istek.Platform switch
        {
            "ios" => "ios",
            "android" => "android",
            _ => "web",
        };

        var simdi = DateTimeOffset.UtcNow;
        // PushToken benzersiz -> varsa guncelle, yoksa ekle
        var mevcut = await db.Cihazlar.FirstOrDefaultAsync(c => c.PushToken == token);
        if (mevcut != null)
        {
            mevcut.KullaniciId = kullaniciId;
            mevcut.Platform = platform;
            mevcut.PushP256dh = istek.P256dh;
            mevcut.PushAuth = istek.Auth;
            mevcut.CihazAdi = istek.CihazAdi;
            mevcut.SonAktiflik = simdi;
        }
        else
        {
            db.Cihazlar.Add(new Cihaz
            {
                Id = Guid.NewGuid(),
                KullaniciId = kullaniciId,
                Platform = platform,
                PushToken = token,
                PushP256dh = istek.P256dh,
                PushAuth = istek.Auth,
                CihazAdi = istek.CihazAdi,
                CreatedAt = simdi,
                SonAktiflik = simdi,
            });
        }
        await db.SaveChangesAsync();

        return Results.Json(new { durum = "kayitli" });
    }

    private static async Task<IResult> SessizSaatGetir(HttpContext ctx, BiAniBirakDbContext db)
    {
        if (!KullaniciKimligi(ctx, out var kullaniciId))
            return Hata(401, "ERISIM_YOK", "Oturum bulunamadi.");
        var k = await db.Kullanicilar.AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == kullaniciId);
        if (k == null)
            return Hata(404, "KULLANICI_BULUNAMADI", "Kullanici bulunamadi.");
        return Results.Json(new
        {
            aktif = k.SessizSaatAktif,
            baslangic = k.SessizSaatBaslangic,
            bitis = k.SessizSaatBitis,
        });
    }

    private static async Task<IResult> SessizSaatGuncelle(
        SessizSaatIstek istek, HttpContext ctx, BiAniBirakDbContext db)
    {
        if (!KullaniciKimligi(ctx, out var kullaniciId))
            return Hata(401, "ERISIM_YOK", "Oturum bulunamadi.");
        var k = await db.Kullanicilar.FirstOrDefaultAsync(x => x.Id == kullaniciId);
        if (k == null)
            return Hata(404, "KULLANICI_BULUNAMADI", "Kullanici bulunamadi.");

        // Aktifse baslangic/bitis "HH:mm" dogrulamasi
        if (istek.Aktif)
        {
            if (!TimeOnly.TryParse(istek.Baslangic, out _) || !TimeOnly.TryParse(istek.Bitis, out _))
                return Hata(400, "DOGRULAMA_HATASI", "Baslangic ve bitis saati 'HH:mm' formatinda olmalidir.");
        }

        k.SessizSaatAktif = istek.Aktif;
        k.SessizSaatBaslangic = istek.Baslangic;
        k.SessizSaatBitis = istek.Bitis;
        k.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync();

        return Results.Json(new
        {
            aktif = k.SessizSaatAktif,
            baslangic = k.SessizSaatBaslangic,
            bitis = k.SessizSaatBitis,
        });
    }
}
