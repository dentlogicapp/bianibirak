using System.Security.Claims;
using BiAniBirak.Api.Data;
using BiAniBirak.Api.Entities;
using BiAniBirak.Api.Servisler;
using Microsoft.EntityFrameworkCore;

namespace BiAniBirak.Api.Uclar;

// DAVETIYE KAREKODUM UCLARI
//
//   GET /api/etkinlik/aktif/davetiye-karekodum   -> HER IKI esin kisa kodu + isimleri
//   GET /api/etkinlik/aktif/davetiye-onizleme    -> ciftin paylastigi onizleme durumu
//   PUT /api/etkinlik/aktif/davetiye-onizleme    -> onizleme durumunu kaydet (paylasimli)
//   GET /api/kisa/{kod}                           -> kisa kodu tokene cozer (yonlendirme)
//
// ===================== IKI KAREKOD (madde 7) =====================
//
// Cift, matbaaya HER IKI karekodu (kendi + esi) tek seferde gonderir. Bunun icin app
// iki KisaKod'u da bilmeli. Bu, IZOLASYON ihlali DEGIL: KisaKod zaten herkese acik bir
// yonlendirme linkidir (onaysiz katki kuyrugu degil). Paylasilan sey public link.
//
// ===================== PAYLASIMLI ONIZLEME (madde 5) =====================
//
// Iki es ayni onizlemeyi duzenler (renk/boyut/konum). Yakin-canli: frontend ~3sn'de bir
// GET ile son hali ceker; PUT ile kaydeder (son duzenleyen kalir). Ortak olan yalnizca
// gorsel tercihtir; katki/onay izolasyonuna dokunmaz.
public static class DavetiyeKarekodumUclari
{
    public static void DavetiyeKarekodumUclariniEkle(this WebApplication app)
    {
        app.MapGet("/api/etkinlik/aktif/davetiye-karekodum", Karekodlarim).RequireAuthorization();
        app.MapGet("/api/etkinlik/aktif/davetiye-onizleme", OnizlemeGetir).RequireAuthorization();
        app.MapPut("/api/etkinlik/aktif/davetiye-onizleme", OnizlemeKaydet).RequireAuthorization();

        // Kisa kod cozumleme PUBLIC'tir - davetli login'siz /d/{kod} adresine gelir.
        app.MapGet("/api/kisa/{kod}", KisaKodCoz);
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

    // Bir baglantiya KisaKod yoksa uret + kaydet (tembel, self-healing).
    private static async Task EnsureKisaKod(PaylasimBaglantisi link, BiAniBirakDbContext db, CancellationToken ct)
    {
        if (!string.IsNullOrWhiteSpace(link.KisaKod)) return;
        string kod;
        var deneme = 0;
        do
        {
            kod = KisaKodUreteci.Uret();
            deneme++;
            if (deneme > 12) throw new InvalidOperationException("Kısa kod üretilemedi.");
        }
        while (await db.PaylasimBaglantilari.AnyAsync(p => p.KisaKod == kod, ct));
        link.KisaKod = kod;
    }

    // ---- KAREKODLARIM: her iki esin kisa kodu + isimleri ----
    private static async Task<IResult> Karekodlarim(
        HttpContext ctx, BiAniBirakDbContext db, CancellationToken ct)
    {
        if (!KullaniciKimligi(ctx, out var kid))
            return Hata(401, "YETKISIZ", "Oturum bulunamadı.");
        var (ok, etkinlikId, rol) = await AktifTenant(ctx, db, kid);
        if (!ok) return Hata(403, "ERISIM_YOK", "Aktif defter bulunamadı.");

        var etkinlik = await db.Etkinlikler.AsNoTracking().FirstOrDefaultAsync(e => e.Id == etkinlikId, ct);
        if (etkinlik == null) return Hata(404, "ETKINLIK_BULUNAMADI", "Defter bulunamadı.");

        var linkler = await db.PaylasimBaglantilari
            .Where(p => p.EtkinlikId == etkinlikId)
            .ToListAsync(ct);

        var es1 = linkler.FirstOrDefault(p => p.Es == "es1");
        var es2 = linkler.FirstOrDefault(p => p.Es == "es2");
        if (es1 == null || es2 == null)
            return Hata(404, "BAGLANTI_BULUNAMADI", "Paylaşım bağlantıları bulunamadı.");

        // Her iki KisaKod'u da garanti et (tembel).
        var degisti = false;
        if (string.IsNullOrWhiteSpace(es1.KisaKod)) { await EnsureKisaKod(es1, db, ct); degisti = true; }
        if (string.IsNullOrWhiteSpace(es2.KisaKod)) { await EnsureKisaKod(es2, db, ct); degisti = true; }
        if (degisti) await db.SaveChangesAsync(ct);

        var benimEs1 = rol == "es1";
        return Results.Ok(new
        {
            es = rol,
            benim = new { es = rol, kisaKod = benimEs1 ? es1.KisaKod : es2.KisaKod, ad = benimEs1 ? etkinlik.Es1Ad : etkinlik.Es2Ad },
            esin = new { es = benimEs1 ? "es2" : "es1", kisaKod = benimEs1 ? es2.KisaKod : es1.KisaKod, ad = benimEs1 ? etkinlik.Es2Ad : etkinlik.Es1Ad },
        });
    }

    // ---- ONIZLEME GETIR (paylasimli) ----
    private static async Task<IResult> OnizlemeGetir(
        HttpContext ctx, BiAniBirakDbContext db, CancellationToken ct)
    {
        if (!KullaniciKimligi(ctx, out var kid))
            return Hata(401, "YETKISIZ", "Oturum bulunamadı.");
        var (ok, etkinlikId, _) = await AktifTenant(ctx, db, kid);
        if (!ok) return Hata(403, "ERISIM_YOK", "Aktif defter bulunamadı.");

        var o = await db.DavetiyeOnizlemeleri.AsNoTracking().FirstOrDefaultAsync(x => x.EtkinlikId == etkinlikId, ct);
        if (o == null)
            return Results.Ok(new { zemin = (string?)null, olcek = 0, posX = 0.0, posY = 0.0, sonDuzenleyen = (string?)null, guncellenme = (string?)null });

        return Results.Ok(new
        {
            zemin = o.Zemin,
            olcek = o.Olcek,
            posX = o.PosX,
            posY = o.PosY,
            sonDuzenleyen = o.SonDuzenleyen,
            guncellenme = o.UpdatedAt.ToUniversalTime().ToString("o"),
        });
    }

    public record OnizlemeGirdi(string? Zemin, int Olcek, double PosX, double PosY);

    // ---- ONIZLEME KAYDET (paylasimli; son duzenleyen kalir) ----
    private static async Task<IResult> OnizlemeKaydet(
        HttpContext ctx, BiAniBirakDbContext db, OnizlemeGirdi girdi, CancellationToken ct)
    {
        if (!KullaniciKimligi(ctx, out var kid))
            return Hata(401, "YETKISIZ", "Oturum bulunamadı.");
        var (ok, etkinlikId, rol) = await AktifTenant(ctx, db, kid);
        if (!ok) return Hata(403, "ERISIM_YOK", "Aktif defter bulunamadı.");

        // DONDURULMUS DEFTER SALT OKUNUR.
        if (await DondurmaGuard.DonduruldumuAsync(db, etkinlikId, ct))
            return DondurmaGuard.Reddet();

        // basit dogrulama / sinirlama
        var zemin = (girdi.Zemin ?? "#525151").Trim();
        if (!System.Text.RegularExpressions.Regex.IsMatch(zemin, "^#[0-9A-Fa-f]{6}$"))
            zemin = "#525151";
        var olcek = Math.Clamp(girdi.Olcek, 10, 80);
        var posX = Math.Clamp(girdi.PosX, 0, 100);
        var posY = Math.Clamp(girdi.PosY, 0, 100);

        var o = await db.DavetiyeOnizlemeleri.FirstOrDefaultAsync(x => x.EtkinlikId == etkinlikId, ct);
        if (o == null)
        {
            o = new DavetiyeOnizleme { EtkinlikId = etkinlikId };
            db.DavetiyeOnizlemeleri.Add(o);
        }
        o.Zemin = zemin;
        o.Olcek = olcek;
        o.PosX = posX;
        o.PosY = posY;
        o.SonDuzenleyen = rol;
        o.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(ct);

        return Results.Ok(new
        {
            zemin = o.Zemin,
            olcek = o.Olcek,
            posX = o.PosX,
            posY = o.PosY,
            sonDuzenleyen = o.SonDuzenleyen,
            guncellenme = o.UpdatedAt.ToUniversalTime().ToString("o"),
        });
    }

    // ---- KISA KOD COZ: /d/{kod} -> token ----
    private static async Task<IResult> KisaKodCoz(
        string kod, BiAniBirakDbContext db, CancellationToken ct)
    {
        var temiz = (kod ?? "").Trim().ToUpperInvariant();
        if (temiz.Length == 0)
            return Hata(404, "KOD_BULUNAMADI", "Kod bulunamadı.");

        var link = await db.PaylasimBaglantilari.AsNoTracking()
            .FirstOrDefaultAsync(p => p.KisaKod == temiz && p.Aktif, ct);
        if (link == null)
            return Hata(404, "KOD_BULUNAMADI", "Kod bulunamadı.");

        return Results.Ok(new { token = link.Token });
    }
}
