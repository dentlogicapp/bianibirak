using System.Security.Claims;
using System.Text.Json;
using BiAniBirak.Api.Data;
using BiAniBirak.Api.Entities;
using BiAniBirak.Api.Modeller;
using BiAniBirak.Api.Servisler;
using Microsoft.EntityFrameworkCore;

namespace BiAniBirak.Api.Uclar;

// GORSELLER
//
// Iki kaynak:
//  - CIFT gorselleri (en fazla 8): kapak/ithaf/bolum/kapanis/galeri konumlari.
//     Ayni havuz uc yerde: davetli karsilama ekrani, panel, defter (PDF).
//  - DAVETLI fotografi (davetli basina EN FAZLA 1): dilegin yanina basilir.
//
// GUVENLIK:
//  - Magic byte dogrulamasi (uzanti yalan soyleyebilir).
//  - Tavan 6 MB (istemci 3200px/q88 gonderir; EXIF canvas ile zaten silinir).
//  - Servis ucu PUBLIC ama anahtar tahmin edilemez (guid) + tenant dizini.
public static class GorselUclari
{
    public const int CiftGorselTavani = 8;

    public static void GorselUclariniEkle(this WebApplication app)
    {
        // Cift gorselleri (oturum gerekli)
        app.MapGet("/api/etkinlik/aktif/gorseller", Listele).RequireAuthorization();
        app.MapPost("/api/etkinlik/aktif/gorsel", Yukle)
            .RequireAuthorization().DisableAntiforgery();
        app.MapPut("/api/etkinlik/aktif/gorsel/{id:guid}", Guncelle).RequireAuthorization();
        app.MapPost("/api/etkinlik/aktif/gorsel/sirala", Sirala).RequireAuthorization();
        app.MapDelete("/api/etkinlik/aktif/gorsel/{id:guid}", Sil).RequireAuthorization();

        // Gorsel servisi (public - anahtar tahmin edilemez)
        app.MapGet("/api/gorsel/{*anahtar}", Servis);
    }

    private static IResult Hata(int kod, string hataKodu, string mesaj)
        => Results.Json(new { hata = hataKodu, mesaj }, statusCode: kod);

    private static bool KullaniciKimligi(HttpContext ctx, out Guid id)
    {
        var ham = ctx.User.FindFirstValue(ClaimTypes.NameIdentifier)
                  ?? ctx.User.FindFirstValue("sub");
        return Guid.TryParse(ham, out id);
    }

    private static async Task<(bool ok, Guid etkinlikId)> AktifTenant(
        HttpContext ctx, BiAniBirakDbContext db, Guid kullaniciId)
    {
        var claim = ctx.User.FindFirstValue("aktif_etkinlik_id");
        if (!Guid.TryParse(claim, out var etkinlikId)) return (false, Guid.Empty);
        var uye = await db.EtkinlikUyelikleri.AsNoTracking()
            .AnyAsync(u => u.EtkinlikId == etkinlikId && u.KullaniciId == kullaniciId);
        return (uye, uye ? etkinlikId : Guid.Empty);
    }

    private static readonly string[] GecerliKonumlar =
        { "kapak", "ithaf", "bolum", "kapanis", "galeri" };

    // ---------------- LISTELE ----------------
    private static async Task<IResult> Listele(HttpContext ctx, BiAniBirakDbContext db)
    {
        if (!KullaniciKimligi(ctx, out var kullaniciId))
            return Hata(401, "ERISIM_YOK", "Oturum bulunamadı.");
        var (ok, etkinlikId) = await AktifTenant(ctx, db, kullaniciId);
        if (!ok) return Hata(403, "ERISIM_YOK", "Aktif etkinlik yok veya üye değilsin.");

        var gorseller = await db.EtkinlikGorselleri.AsNoTracking()
            .Where(g => g.EtkinlikId == etkinlikId)
            .OrderBy(g => g.Sira)
            .Select(g => new
            {
                id = g.Id,
                url = "/api/gorsel/" + g.DepolamaAnahtari,
                konum = g.Konum,
                sira = g.Sira,
                genislik = g.Genislik,
                yukseklik = g.Yukseklik,
            })
            .ToListAsync();

        return Results.Json(new { gorseller, tavan = CiftGorselTavani });
    }

    // ---------------- YUKLE ----------------
    private static async Task<IResult> Yukle(
        HttpContext ctx, BiAniBirakDbContext db, DepolamaServisi depo, IFormFile? dosya,
        string? konum)
    {
        if (!KullaniciKimligi(ctx, out var kullaniciId))
            return Hata(401, "ERISIM_YOK", "Oturum bulunamadı.");
        var (ok, etkinlikId) = await AktifTenant(ctx, db, kullaniciId);
        if (!ok) return Hata(403, "ERISIM_YOK", "Aktif etkinlik yok veya üye değilsin.");

        if (dosya == null || dosya.Length == 0)
            return Hata(400, "DOGRULAMA_HATASI", "Bir görsel seçmelisin.");
        if (dosya.Length > DepolamaServisi.TavanBayt)
            return Hata(400, "GORSEL_COK_BUYUK",
                "Görsel çok büyük. Lütfen sayfayı yenileyip tekrar dene.");

        // Tavan: 8 gorsel
        var mevcut = await db.EtkinlikGorselleri.CountAsync(g => g.EtkinlikId == etkinlikId);
        if (mevcut >= CiftGorselTavani)
            return Hata(400, "GORSEL_TAVANI",
                $"En fazla {CiftGorselTavani} fotoğraf ekleyebilirsin. Önce birini kaldır.");

        using var bellek = new MemoryStream();
        await dosya.CopyToAsync(bellek);
        var veri = bellek.ToArray();

        // MAGIC BYTE - uzantiya guvenilmez
        var tip = DepolamaServisi.TipCoz(veri);
        if (tip == null)
            return Hata(400, "GECERSIZ_GORSEL", "Yalnızca JPEG, PNG veya WebP kabul edilir.");

        // OLCU KAYNAKTAN OKUNUR - istemciye guvenilmez. Yanlis olcu = cercevede
        // beyaz bosluk = coper eser. (Ayrica minimal API form alanlarini query'den
        // bind eder; istemci degeri zaten backend'e ULASMAZ.)
        var olcu = GorselOlcer.Coz(veri);

        var anahtar = await depo.KaydetAsync(etkinlikId, veri, tip.Uzanti);

        var secilenKonum = konum != null && GecerliKonumlar.Contains(konum) ? konum : "galeri";
        var siraSonraki = mevcut;

        var gorsel = new EtkinlikGorseli
        {
            Id = Guid.NewGuid(),
            EtkinlikId = etkinlikId,
            DepolamaAnahtari = anahtar,
            Konum = secilenKonum,
            Sira = siraSonraki,
            Genislik = olcu?.Genislik ?? 0,
            Yukseklik = olcu?.Yukseklik ?? 0,
            Bayt = veri.Length,
            CreatedAt = DateTimeOffset.UtcNow,
        };
        db.EtkinlikGorselleri.Add(gorsel);

        db.DenetimGunlukleri.Add(new DenetimGunlugu
        {
            Id = Guid.NewGuid(),
            EtkinlikId = etkinlikId,
            KullaniciId = kullaniciId,
            Eylem = "GORSEL_EKLENDI",
            Varlik = "etkinlik_gorselleri",
            VarlikId = gorsel.Id,
            DegisenAlanlar = JsonSerializer.Serialize(new { konum = secilenKonum, bayt = veri.Length }),
            CreatedAt = DateTimeOffset.UtcNow,
        });
        await db.SaveChangesAsync();

        return Results.Json(new
        {
            id = gorsel.Id,
            url = "/api/gorsel/" + anahtar,
            konum = gorsel.Konum,
            sira = gorsel.Sira,
            genislik = gorsel.Genislik,
            yukseklik = gorsel.Yukseklik,
        });
    }

    // ---------------- GUNCELLE (konum + altyazi) ----------------
    private static async Task<IResult> Guncelle(
        Guid id, GorselGuncelleIstek istek, HttpContext ctx, BiAniBirakDbContext db)
    {
        if (!KullaniciKimligi(ctx, out var kullaniciId))
            return Hata(401, "ERISIM_YOK", "Oturum bulunamadı.");
        var (ok, etkinlikId) = await AktifTenant(ctx, db, kullaniciId);
        if (!ok) return Hata(403, "ERISIM_YOK", "Aktif etkinlik yok veya üye değilsin.");

        var gorsel = await db.EtkinlikGorselleri
            .FirstOrDefaultAsync(g => g.Id == id && g.EtkinlikId == etkinlikId);
        if (gorsel == null)
            return Hata(404, "GORSEL_BULUNAMADI", "Görsel bulunamadı.");

        if (istek.Konum != null)
        {
            if (!GecerliKonumlar.Contains(istek.Konum))
                return Hata(400, "DOGRULAMA_HATASI", "Geçersiz konum.");

            // Kapak/ithaf/kapanis TEK gorsel alir - onceki ayni konumdaki galeriye duser
            if (istek.Konum is "kapak" or "ithaf" or "kapanis")
            {
                var eskiler = await db.EtkinlikGorselleri
                    .Where(g => g.EtkinlikId == etkinlikId && g.Konum == istek.Konum && g.Id != id)
                    .ToListAsync();
                foreach (var e in eskiler) e.Konum = "galeri";
            }
            gorsel.Konum = istek.Konum;
        }

        await db.SaveChangesAsync();
        return Results.Json(new { ok = true });
    }

    // ---------------- SIRALA ----------------
    private static async Task<IResult> Sirala(
        GorselSiralaIstek istek, HttpContext ctx, BiAniBirakDbContext db)
    {
        if (!KullaniciKimligi(ctx, out var kullaniciId))
            return Hata(401, "ERISIM_YOK", "Oturum bulunamadı.");
        var (ok, etkinlikId) = await AktifTenant(ctx, db, kullaniciId);
        if (!ok) return Hata(403, "ERISIM_YOK", "Aktif etkinlik yok veya üye değilsin.");

        if (istek.Idler == null || istek.Idler.Length == 0)
            return Hata(400, "DOGRULAMA_HATASI", "Sıralama listesi boş.");

        var gorseller = await db.EtkinlikGorselleri
            .Where(g => g.EtkinlikId == etkinlikId)
            .ToListAsync();

        for (var i = 0; i < istek.Idler.Length; i++)
        {
            var g = gorseller.FirstOrDefault(x => x.Id == istek.Idler[i]);
            if (g != null) g.Sira = i;
        }
        await db.SaveChangesAsync();
        return Results.Json(new { ok = true });
    }

    // ---------------- SIL ----------------
    private static async Task<IResult> Sil(
        Guid id, HttpContext ctx, BiAniBirakDbContext db, DepolamaServisi depo)
    {
        if (!KullaniciKimligi(ctx, out var kullaniciId))
            return Hata(401, "ERISIM_YOK", "Oturum bulunamadı.");
        var (ok, etkinlikId) = await AktifTenant(ctx, db, kullaniciId);
        if (!ok) return Hata(403, "ERISIM_YOK", "Aktif etkinlik yok veya üye değilsin.");

        var gorsel = await db.EtkinlikGorselleri
            .FirstOrDefaultAsync(g => g.Id == id && g.EtkinlikId == etkinlikId);
        if (gorsel == null)
            return Hata(404, "GORSEL_BULUNAMADI", "Görsel bulunamadı.");

        depo.Sil(gorsel.DepolamaAnahtari);
        db.EtkinlikGorselleri.Remove(gorsel);

        db.DenetimGunlukleri.Add(new DenetimGunlugu
        {
            Id = Guid.NewGuid(),
            EtkinlikId = etkinlikId,
            KullaniciId = kullaniciId,
            Eylem = "GORSEL_KALDIRILDI",
            Varlik = "etkinlik_gorselleri",
            VarlikId = id,
            CreatedAt = DateTimeOffset.UtcNow,
        });
        await db.SaveChangesAsync();

        return Results.Json(new { ok = true });
    }

    // ---------------- SERVIS (public) ----------------
    private static async Task<IResult> Servis(string anahtar, DepolamaServisi depo)
    {
        var veri = await depo.OkuAsync(anahtar);
        if (veri == null) return Results.NotFound();

        // Anahtar tahmin edilemez (guid) -> uzun onbellek guvenli
        return Results.File(veri, DepolamaServisi.MimeCoz(anahtar),
            enableRangeProcessing: false);
    }
}
