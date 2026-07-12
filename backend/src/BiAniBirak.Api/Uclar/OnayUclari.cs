using System.Security.Claims;
using BiAniBirak.Api.Data;
using BiAniBirak.Api.Entities;
using BiAniBirak.Api.Servisler;
using Microsoft.EntityFrameworkCore;

namespace BiAniBirak.Api.Uclar;

// ONAY UCLARI - "gecerli bir rizamiz var mi?" sorusunun teknik karsiligi.
//
// IKI SENARYO BU DOSYAYI ZORUNLU KILDI:
//
// 1. GECMISTEN GELEN KULLANICILAR
//    Onay sistemi kurulmadan once kaydolmus hesaplar var (test hesaplari dahil).
//    Bunlarin hicbir onay kaydi YOK. Yani hukuken elimizde rizalari yok. Onlari
//    silmek bir cozum; ama gercek urunde bu mumkun degil - lansmandan sonra metni
//    her guncelledigimizde binlerce kullaniciyi silemeyiz.
//
// 2. METIN GUNCELLEMESI
//    Kullanim Kosullari'ni degistirdik. Eski metni onaylamis kullanicinin onayi,
//    YENI metin icin gecerli DEGILDIR. "Zaten onaylamisti" demek, onay ALMAMAK'tir.
//
// Ikisinin de cozumu ayni: girise geciImez bir onay ekrani. Eksik onay varsa
// kullanici panele giremez.
public static class OnayUclari
{
    public static void OnayUclariniEkle(this WebApplication app)
    {
        // Eksik onaylar - giriste kontrol edilir. Bos donerse her sey yolunda.
        app.MapGet("/api/onay/eksik", EksikOnaylar).RequireAuthorization();

        // Onayla - tek seferlik modal buraya gonderir.
        app.MapPost("/api/onay", Onayla).RequireAuthorization();

        // Davetli metni - PUBLIC (dilek birakirken okunur, giris YOK).
        app.MapGet("/api/onay/davetli-metin", DavetliMetin);
    }

    private static bool KullaniciKimligi(HttpContext ctx, out Guid id)
    {
        id = Guid.Empty;
        var ham = ctx.User.FindFirstValue(ClaimTypes.NameIdentifier)
                  ?? ctx.User.FindFirstValue("sub");
        return Guid.TryParse(ham, out id);
    }

    private static IResult Hata(int kod, string hataKodu, string mesaj)
        => Results.Json(new { hata = hataKodu, mesaj }, statusCode: kod);

    // EKSIK ONAYLAR
    //
    // Dolu donerse frontend gecilemez bir modal acar. Kullanici onaylamadan panele
    // giremez - cunku gecerli bir rizamiz olmadan verisini islemeye devam edemeyiz.
    private static async Task<IResult> EksikOnaylar(HttpContext ctx, BiAniBirakDbContext db)
    {
        if (!KullaniciKimligi(ctx, out var kullaniciId))
            return Hata(401, "ERISIM_YOK", "Oturum bulunamadı.");

        var eksik = await OnayServisi.EksikOnaylarAsync(db, kullaniciId);

        // Bilgilendirici (zorunlu olmayan) metinler de gonderilir - kullanici isterse
        // okur. Ama onaylamasi ZORUNLU degildir; modal onlari engel olarak gostermez.
        var bilgilendirici = await db.SistemMetinleri.AsNoTracking()
            .Where(m => m.Kapsam == OnayServisi.KapsamEs && !m.Zorunlu && !m.Deprecated)
            .OrderBy(m => m.Sira)
            .Select(m => new { anahtar = m.Anahtar, baslik = m.Baslik })
            .ToListAsync();

        return Results.Json(new
        {
            eksik = eksik.Select(m => new
            {
                anahtar = m.Anahtar,
                baslik = m.Baslik,
                icerik = m.Icerik,
                surum = m.Surum,
                hash = m.Hash,
                yururluk_tarihi = m.YururlukTarihi,
            }),
            bilgilendirici,
        });
    }

    // ONAYLA - tek seferlik modaldan gelir.
    //
    // Sunucu, gelen anahtarlarin GERCEKTEN eksik olduğunu dogrular: istemci rastgele
    // anahtar gonderip onay uyduramaz.
    private static async Task<IResult> Onayla(
        OnayIstek istek, HttpContext ctx, BiAniBirakDbContext db)
    {
        if (!KullaniciKimligi(ctx, out var kullaniciId))
            return Hata(401, "ERISIM_YOK", "Oturum bulunamadı.");

        var eksik = await OnayServisi.EksikOnaylarAsync(db, kullaniciId);
        if (eksik.Count == 0)
            return Results.Json(new { ok = true, mesaj = "Onaylanacak metin yok." });

        var gelen = (istek.Onaylar ?? Array.Empty<string>())
            .Select(o => (o ?? "").Trim())
            .ToHashSet(StringComparer.Ordinal);

        // TAMAMI onaylanmali. Kismi onay, onay degildir.
        var eksikKalan = eksik.Where(m => !gelen.Contains(m.Anahtar)).ToList();
        if (eksikKalan.Count > 0)
            return Hata(400, "ONAY_ZORUNLU",
                "Devam etmek için tüm metinleri onaylamanız gerekir.");

        await OnayServisi.KaydetAsync(
            db, kullaniciId, eksik,
            OnayServisi.IpAl(ctx), OnayServisi.TarayiciAl(ctx));

        return Results.Json(new { ok = true });
    }

    // DAVETLI METNI - public. Dilek birakma ekraninda gosterilir.
    //
    // Davetliye AYRI metin: o bir sozlesme tarafi degil, bir konuktur. Ondan
    // "kullanim kosullarini kabul et" istemek hem hukuken yanlis hem de urun olarak
    // yanlistir - isi 2 dakika surer, once 9 maddelik sozlesme okutmak surtunmedir.
    private static async Task<IResult> DavetliMetin(BiAniBirakDbContext db)
    {
        var metinler = await OnayServisi.ZorunluMetinlerAsync(db, OnayServisi.KapsamDavetli);

        return Results.Json(metinler.Select(m => new
        {
            anahtar = m.Anahtar,
            baslik = m.Baslik,
            icerik = m.Icerik,
            surum = m.Surum,
            hash = m.Hash,
        }));
    }
}

// Onay istegi - hangi metinlerin onaylandigi.
public record OnayIstek(string[]? Onaylar);
