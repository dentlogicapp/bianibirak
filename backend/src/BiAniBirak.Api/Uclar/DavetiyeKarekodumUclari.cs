using System.Security.Claims;
using BiAniBirak.Api.Data;
using BiAniBirak.Api.Servisler;
using Microsoft.EntityFrameworkCore;

namespace BiAniBirak.Api.Uclar;

// DAVETIYE KAREKODUM UCLARI
//
// Iki uc:
//   GET /api/etkinlik/aktif/davetiye-karekodum  -> ciftin KENDI kisa kodu (izolasyon)
//   GET /api/kisa/{kod}                          -> kisa kodu tokene cozer (yonlendirme)
//
// ===================== IZOLASYON (cift-link ilkesi) =====================
//
// Her es YALNIZ kendi karekodunu alir. Es1, Es2'nin karekodunu goremez/indiremez.
// Bir es digerinin karekodunu davetiyeye basarsa, gelen dilekler yanlis kuyruga
// duser (KaynakEs karisir). Bu yuzden filtre backend'de - UI'da gizlemek yetmez.
//
// ===================== KISA LINK =====================
//
// Karekod uzun Token'i degil, kisa /d/{KisaKod} adresini tasir. Kucuk basilan
// karekodun okunabilmesinin tek yolu budur (az veri = iri modul).
//
// Frontend, mutlak linki KENDI kurar: `${origin}/d/${kisaKod}` - tipki mevcut
// `/k/{token}` deseni gibi. Boylece domain bianibirak.com'a gecince (cift o
// domaindeyken) link kendiliginden dogru olusur, kod degismez.
public static class DavetiyeKarekodumUclari
{
    public static void DavetiyeKarekodumUclariniEkle(this WebApplication app)
    {
        app.MapGet("/api/etkinlik/aktif/davetiye-karekodum", Benimki).RequireAuthorization();

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

    // ---- BENIMKI: ciftin kendi karekodu (izolasyon) ----
    private static async Task<IResult> Benimki(
        HttpContext ctx, BiAniBirakDbContext db, CancellationToken ct)
    {
        if (!KullaniciKimligi(ctx, out var kid))
            return Hata(401, "YETKISIZ", "Oturum bulunamadı.");

        var (ok, etkinlikId, rol) = await AktifTenant(ctx, db, kid);
        if (!ok) return Hata(403, "ERISIM_YOK", "Aktif defter bulunamadı.");

        // IZOLASYON: yalniz kendi esine ait link (rol = es1|es2).
        var link = await db.PaylasimBaglantilari
            .FirstOrDefaultAsync(p => p.EtkinlikId == etkinlikId && p.Es == rol, ct);

        if (link == null)
            return Hata(404, "BAGLANTI_BULUNAMADI", "Paylaşım bağlantın bulunamadı.");

        // TEMBEL ATAMA: eski linklerde KisaKod olmayabilir; ilk erisimde uret + kaydet.
        // Boylece tek-seferlik migration script'e gerek kalmaz (idempotent, self-healing).
        if (string.IsNullOrWhiteSpace(link.KisaKod))
        {
            string kod;
            var deneme = 0;
            do
            {
                kod = KisaKodUreteci.Uret();
                deneme++;
                if (deneme > 10) return Hata(500, "KOD_URETILEMEDI", "Kısa kod üretilemedi.");
            }
            while (await db.PaylasimBaglantilari.AnyAsync(p => p.KisaKod == kod, ct));

            link.KisaKod = kod;
            await db.SaveChangesAsync(ct);
        }

        return Results.Ok(new
        {
            es = link.Es,          // es1 | es2 (frontend "senin tarafın" etiketi icin)
            kisaKod = link.KisaKod,
        });
    }

    // ---- KISA KOD COZ: /d/{kod} -> token (yonlendirme icin) ----
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
