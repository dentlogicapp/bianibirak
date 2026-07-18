using System.Security.Claims;
using BiAniBirak.Api.Data;
using BiAniBirak.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace BiAniBirak.Api.Uclar;

// Uygulama-ici bildirim uclari (avatar cani). Push'tan bagimsiz calisir:
// push izni olmasa da kullanici uygulamayi acinca bildirimlerini gorur.
public static class BildirimUclari
{
    private const int MaxListe = 50;

    public static void BildirimUclariniEkle(this WebApplication app)
    {
        app.MapGet("/api/bildirimler", Liste).RequireAuthorization();
        app.MapPost("/api/bildirimler/{id:guid}/okundu", Okundu).RequireAuthorization();
        app.MapPost("/api/bildirimler/hepsi-okundu", HepsiOkundu).RequireAuthorization();
        app.MapDelete("/api/bildirimler/{id:guid}", Sil).RequireAuthorization();
        app.MapDelete("/api/bildirimler", TumunuSil).RequireAuthorization();
    }

    private static bool KullaniciKimligi(HttpContext ctx, out Guid id)
    {
        var kimlik = ctx.User.FindFirstValue(ClaimTypes.NameIdentifier)
                     ?? ctx.User.FindFirstValue("sub");
        return Guid.TryParse(kimlik, out id);
    }

    private static IResult Hata(int kod, string hataKodu, string mesaj)
        => Results.Json(new { hata = hataKodu, mesaj }, statusCode: kod);

    // Liste: bu kullanicinin son bildirimleri + okunmamis sayisi.
    private static async Task<IResult> Liste(HttpContext ctx, BiAniBirakDbContext db)
    {
        if (!KullaniciKimligi(ctx, out var kullaniciId))
            return Hata(401, "ERISIM_YOK", "Oturum bulunamadı.");

        var bildirimler = await db.Bildirimler.AsNoTracking()
            .Where(b => b.KullaniciId == kullaniciId)
            .OrderByDescending(b => b.CreatedAt)
            .Take(MaxListe)
            .ToListAsync();

        var okunmamis = bildirimler.Count(b => !b.OkunduMu);

        return Results.Json(new
        {
            okunmamis_sayisi = okunmamis,
            bildirimler = bildirimler.Select(b => new
            {
                id = b.Id,
                tip = b.Tip,
                baslik = b.Baslik,
                mesaj = b.Mesaj,
                url = b.Url,
                // Bildirim HANGI deftere ait: istemci tiklamada once o deftere gecer.
                // Yoksa cok defterli kullanicida hedef sayfa yanlis kuyruga bakar ve
                // "dilege erisilemiyor" der - bildirim yalan soylemis olur.
                etkinlik_id = b.EtkinlikId,
                okundu_mu = b.OkunduMu,
                created_at = b.CreatedAt,
            }),
        });
    }

    // Tek bildirim okundu (tiklayinca; soluklasir ama listede kalir - planlama deseni).
    private static async Task<IResult> Okundu(Guid id, HttpContext ctx, BiAniBirakDbContext db)
    {
        if (!KullaniciKimligi(ctx, out var kullaniciId))
            return Hata(401, "ERISIM_YOK", "Oturum bulunamadı.");

        var b = await db.Bildirimler
            .FirstOrDefaultAsync(x => x.Id == id && x.KullaniciId == kullaniciId);
        if (b == null)
            return Hata(404, "BILDIRIM_BULUNAMADI", "Bildirim bulunamadı.");

        if (!b.OkunduMu)
        {
            b.OkunduMu = true;
            b.OkunmaZamani = DateTimeOffset.UtcNow;
            await db.SaveChangesAsync();
        }
        return Results.Json(new { durum = "ok" });
    }

    // Hepsini okundu isaretle.
    private static async Task<IResult> HepsiOkundu(HttpContext ctx, BiAniBirakDbContext db)
    {
        if (!KullaniciKimligi(ctx, out var kullaniciId))
            return Hata(401, "ERISIM_YOK", "Oturum bulunamadı.");

        var simdi = DateTimeOffset.UtcNow;
        var okunmamislar = await db.Bildirimler
            .Where(b => b.KullaniciId == kullaniciId && !b.OkunduMu)
            .ToListAsync();
        foreach (var b in okunmamislar)
        {
            b.OkunduMu = true;
            b.OkunmaZamani = simdi;
        }
        await db.SaveChangesAsync();
        return Results.Json(new { durum = "ok", sayi = okunmamislar.Count });
    }

    // Tek bildirim sil (kalici).
    private static async Task<IResult> Sil(Guid id, HttpContext ctx, BiAniBirakDbContext db)
    {
        if (!KullaniciKimligi(ctx, out var kullaniciId))
            return Hata(401, "ERISIM_YOK", "Oturum bulunamadı.");

        var b = await db.Bildirimler
            .FirstOrDefaultAsync(x => x.Id == id && x.KullaniciId == kullaniciId);
        if (b == null)
            return Hata(404, "BILDIRIM_BULUNAMADI", "Bildirim bulunamadı.");

        db.Bildirimler.Remove(b);
        await db.SaveChangesAsync();
        return Results.Json(new { durum = "ok" });
    }

    // Tumunu temizle.
    private static async Task<IResult> TumunuSil(HttpContext ctx, BiAniBirakDbContext db)
    {
        if (!KullaniciKimligi(ctx, out var kullaniciId))
            return Hata(401, "ERISIM_YOK", "Oturum bulunamadı.");

        var hepsi = await db.Bildirimler
            .Where(b => b.KullaniciId == kullaniciId)
            .ToListAsync();
        db.Bildirimler.RemoveRange(hepsi);
        await db.SaveChangesAsync();
        return Results.Json(new { durum = "ok", sayi = hepsi.Count });
    }
}
