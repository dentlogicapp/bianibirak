using System.Security.Claims;
using System.Text.Json;
using BiAniBirak.Api.Data;
using BiAniBirak.Api.Entities;
using BiAniBirak.Api.Servisler;
using Microsoft.EntityFrameworkCore;

namespace BiAniBirak.Api.Uclar;

// COP KUTUSU UCLARI (cift tarafi)
//
// Cift bir dilegi REDDEDINCE dilek cope duser: SilindiMi=true, SilinmeZamani=now,
// SilenKullaniciId=es. Bu, SuperUclari.KatkiKaldir ve Planlama Defteri (Notlar.Silindi)
// deseniyle BIREBIR ayni cop mekanizmasidir (paralel yapi YOK - tek dogruluk: SilindiMi).
//
// Ciftin cop kutusu = SilindiMi && Durum="red" && KaynakEs==rol:
//   - SilindiMi: cop uyeligi (Notlar.Silindi karsiligi)
//   - Durum="red": CIFTIN reddettigi (super-admin'in kaldirdigi onayli dilekler ayri;
//     onlar super cop kutusunda, Durum degismez).
//   - KaynakEs==rol: izolasyon (bir es digerinin cop kutusunu goremez).
//
//   GET  /api/etkinlik/aktif/cop     -> coptekiler + kalan gun (SilinmeZamani+30)
//   POST /api/katki/{id}/geri-al     -> beklemedeye geri (onay kuyruguna); SilindiMi temizlenir
//   POST /api/katki/{id}/kalici-sil  -> gercek silme (satir + medya + dosya)
//
// 30 gun sonra otomatik kalici silme: CopTemizlemeGorevi (SilinmeZamani esasli).
public static class CopUclari
{
    public const int CopGun = 30;

    public static void CopUclariniEkle(this WebApplication app)
    {
        app.MapGet("/api/etkinlik/aktif/cop", CopListe).RequireAuthorization();
        app.MapPost("/api/katki/{id}/geri-al", GeriAl).RequireAuthorization();
        app.MapPost("/api/katki/{id}/kalici-sil", KaliciSil).RequireAuthorization();
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

    private static IResult Hata(int durum, string kod, string mesaj)
        => Results.Json(new { hata = kod, mesaj }, statusCode: durum);

    // ---- COP LISTE ----
    private static async Task<IResult> CopListe(
        HttpContext ctx, BiAniBirakDbContext db, CancellationToken ct)
    {
        if (!KullaniciKimligi(ctx, out var kid))
            return Hata(401, "ERISIM_YOK", "Oturum bulunamadi.");
        var (ok, etkinlikId, rol) = await AktifTenant(ctx, db, kid);
        if (!ok) return Hata(403, "ERISIM_YOK", "Aktif defter bulunamadi.");

        var simdi = DateTimeOffset.UtcNow;
        var liste = await db.Katkilar.AsNoTracking()
            .Where(k => k.EtkinlikId == etkinlikId && k.KaynakEs == rol
                        && k.SilindiMi && k.Durum == "red")
            .OrderByDescending(k => k.SilinmeZamani)
            .ToListAsync(ct);

        var dilekler = liste.Select(k =>
        {
            var gecen = k.SilinmeZamani.HasValue ? (simdi - k.SilinmeZamani.Value).TotalDays : 0;
            var kalan = Math.Max(0, CopGun - (int)Math.Floor(gecen));
            return new
            {
                id = k.Id,
                davetliAd = k.DavetliAd,
                mesaj = k.Mesaj,
                tur = k.Tur,
                fotoVar = !string.IsNullOrEmpty(k.FotoAnahtari),
                silinmeZamani = k.SilinmeZamani?.ToUniversalTime().ToString("o"),
                kalanGun = kalan,
            };
        });

        return Results.Ok(new { dilekler, copGun = CopGun });
    }

    // ---- GERI AL (beklemedeye; cop uyeligi temizlenir) ----
    private static async Task<IResult> GeriAl(
        string id, HttpContext ctx, BiAniBirakDbContext db)
    {
        if (!KullaniciKimligi(ctx, out var kid))
            return Hata(401, "ERISIM_YOK", "Oturum bulunamadi.");
        if (!Guid.TryParse(id, out var katkiId))
            return Hata(400, "DOGRULAMA_HATASI", "Gecersiz katki kimligi.");
        var (ok, etkinlikId, rol) = await AktifTenant(ctx, db, kid);
        if (!ok) return Hata(403, "ERISIM_YOK", "Aktif defter bulunamadi.");

        var katki = await db.Katkilar.FirstOrDefaultAsync(k => k.Id == katkiId && k.EtkinlikId == etkinlikId);
        if (katki == null) return Hata(404, "KATKI_BULUNAMADI", "Dilek bulunamadi.");
        if (katki.KaynakEs != rol) return Hata(403, "ERISIM_YOK", "Bu dilek sizin cop kutunuzda degil.");
        if (!(katki.SilindiMi && katki.Durum == "red"))
            return Hata(409, "KATKI_COPTE_DEGIL", "Bu dilek cop kutunuzda degil.");

        var simdi = DateTimeOffset.UtcNow;
        // cop uyeligini temizle + onay kuyruguna dondur
        katki.SilindiMi = false;
        katki.SilinmeZamani = null;
        katki.SilenKullaniciId = null;
        katki.Durum = "beklemede";
        katki.OnayZamani = null;
        katki.OnaylayanKullaniciId = null;
        katki.UpdatedAt = simdi;

        db.DenetimGunlukleri.Add(new DenetimGunlugu
        {
            Id = Guid.NewGuid(),
            EtkinlikId = etkinlikId,
            KullaniciId = kid,
            Eylem = "KATKI_GERI_ALINDI",
            Varlik = "katkilar",
            VarlikId = katkiId,
            DegisenAlanlar = JsonSerializer.Serialize(new { kaynak_es = katki.KaynakEs }),
            CreatedAt = simdi,
        });
        await db.SaveChangesAsync();

        return Results.Ok(new { durum = "beklemede" });
    }

    // ---- KALICI SIL (gercek silme) ----
    private static async Task<IResult> KaliciSil(
        string id, HttpContext ctx, BiAniBirakDbContext db, DepolamaServisi depo)
    {
        if (!KullaniciKimligi(ctx, out var kid))
            return Hata(401, "ERISIM_YOK", "Oturum bulunamadi.");
        if (!Guid.TryParse(id, out var katkiId))
            return Hata(400, "DOGRULAMA_HATASI", "Gecersiz katki kimligi.");
        var (ok, etkinlikId, rol) = await AktifTenant(ctx, db, kid);
        if (!ok) return Hata(403, "ERISIM_YOK", "Aktif defter bulunamadi.");

        var katki = await db.Katkilar.FirstOrDefaultAsync(k => k.Id == katkiId && k.EtkinlikId == etkinlikId);
        if (katki == null) return Hata(404, "KATKI_BULUNAMADI", "Dilek bulunamadi.");
        if (katki.KaynakEs != rol) return Hata(403, "ERISIM_YOK", "Bu dilek sizin cop kutunuzda degil.");
        if (!(katki.SilindiMi && katki.Durum == "red"))
            return Hata(409, "KATKI_COPTE_DEGIL", "Yalnizca cop kutunuzdaki dilek kalici silinir.");

        // Dosya anahtarlarini topla (dosyalar DB commit SONRASI silinir - Ders 12).
        var medyalar = await db.KatkiMedyalari.Where(m => m.KatkiId == katkiId).ToListAsync();
        var anahtarlar = medyalar.Select(m => m.StorageKey).Where(a => !string.IsNullOrEmpty(a)).ToList();
        if (!string.IsNullOrEmpty(katki.FotoAnahtari)) anahtarlar.Add(katki.FotoAnahtari!);

        db.KatkiMedyalari.RemoveRange(medyalar);
        db.Katkilar.Remove(katki);
        db.DenetimGunlukleri.Add(new DenetimGunlugu
        {
            Id = Guid.NewGuid(),
            EtkinlikId = etkinlikId,
            KullaniciId = kid,
            Eylem = "KATKI_KALICI_SILINDI",
            Varlik = "katkilar",
            VarlikId = katkiId,
            DegisenAlanlar = JsonSerializer.Serialize(new { kaynak_es = rol }),
            CreatedAt = DateTimeOffset.UtcNow,
        });
        await db.SaveChangesAsync();

        // Dosyalar EN SON (DB rollback guvenli).
        foreach (var a in anahtarlar) depo.Sil(a);

        return Results.Ok(new { silindi = true });
    }
}
