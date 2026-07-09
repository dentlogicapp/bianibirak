using System.Text.Json;
using BiAniBirak.Api.Data;
using BiAniBirak.Api.Entities;
using BiAniBirak.Api.Modeller;
using BiAniBirak.Api.Servisler;
using Microsoft.EntityFrameworkCore;

namespace BiAniBirak.Api.Uclar;

// Public davetli katki uclari (login YOK; token URL'de).
// Guvenlik (Belge 08): token dogrulama + Aktif + kapanis kontrolu + rate limit +
// KaynakEs izolasyonu. Okuma yuzeyi minimal (guest baska katki goremez).
public static class KatkiUclari
{
    // Rate limit ayarlari (Belge 08 spam korumasi)
    private const int KatkiLimit = 5;              // token+IP basina
    private static readonly TimeSpan KatkiPencere = TimeSpan.FromMinutes(10);

    public static void KatkiUclariniEkle(this WebApplication app)
    {
        // PUBLIC - RequireAuthorization YOK
        app.MapGet("/api/k/{token}", KarsilamaGetir);
        app.MapPost("/api/k/{token}", KatkiBirak);
    }

    private static IResult Hata(int durum, string kod, string mesaj)
        => Results.Json(new { hata = kod, mesaj }, statusCode: durum);

    // Token'i cozumle -> paylasim baglantisi + etkinlik + ayar. Aktif + var kontrolu.
    private static async Task<(PaylasimBaglantisi? link, Etkinlik? etkinlik)> Cozumle(
        BiAniBirakDbContext db, string token)
    {
        var link = await db.PaylasimBaglantilari.AsNoTracking()
            .FirstOrDefaultAsync(p => p.Token == token && p.Aktif);
        if (link == null) return (null, null);

        var etkinlik = await db.Etkinlikler.AsNoTracking()
            .FirstOrDefaultAsync(e => e.Id == link.EtkinlikId && e.DeletedAt == null);
        return (link, etkinlik);
    }

    // GET - davetli karsilama ekrani verisi. Okuma yuzeyi minimal (baska katki YOK).
    private static async Task<IResult> KarsilamaGetir(string token, BiAniBirakDbContext db)
    {
        var (link, etkinlik) = await Cozumle(db, token);
        if (link == null || etkinlik == null)
            return Hata(404, "BAGLANTI_BULUNAMADI", "Bu baglanti gecersiz veya kaldirilmis.");

        // Yasam dongusu: kapali/arsiv -> yazim kapali (nazik ekran icin durum doner)
        var simdi = DateTimeOffset.UtcNow;
        var acildiMi = simdi >= etkinlik.AcilisTarihi;
        var kapandiMi = simdi > etkinlik.KapanisTarihi || etkinlik.Durum == "kapali" || etkinlik.Durum == "arsiv";

        var ayar = await db.EtkinlikAyarlari.AsNoTracking()
            .FirstOrDefaultAsync(a => a.EtkinlikId == etkinlik.Id);

        return Results.Json(new
        {
            es1_ad = etkinlik.Es1Ad,
            es2_ad = etkinlik.Es2Ad,
            tur = etkinlik.Tur,
            karsilama_metni = ayar?.KarsilamaMetni,
            prompt_metni = ayar?.PromptMetni,
            acildi = acildiMi,
            kapandi = kapandiMi,
        });
    }

    // POST - katki birak. Tum guvenlik katmanlari.
    private static async Task<IResult> KatkiBirak(
        string token, KatkiBirakIstek istek, HttpContext ctx,
        BiAniBirakDbContext db, HizSiniri hizSiniri)
    {
        // Rate limit (token + IP)
        var ip = ctx.Connection.RemoteIpAddress?.ToString() ?? "bilinmiyor";
        var anahtar = $"katki:{token}:{ip}";
        if (!hizSiniri.IzinVar(anahtar, KatkiLimit, KatkiPencere))
            return Hata(429, "COK_FAZLA_ISTEK", "Cok fazla katki gonderildi. Lutfen biraz sonra tekrar deneyin.");

        var (link, etkinlik) = await Cozumle(db, token);
        if (link == null || etkinlik == null)
            return Hata(404, "BAGLANTI_BULUNAMADI", "Bu baglanti gecersiz veya kaldirilmis.");

        // Yasam dongusu pencere kontrolu (backend zorunlu - kirmizi cizgi)
        var simdi = DateTimeOffset.UtcNow;
        if (simdi < etkinlik.AcilisTarihi)
            return Hata(403, "ETKINLIK_ACILMADI", "Bu defter henuz acilmadi.");
        if (simdi > etkinlik.KapanisTarihi || etkinlik.Durum == "kapali" || etkinlik.Durum == "arsiv")
            return Hata(403, "ETKINLIK_KAPALI", "Bu defter kapandi; yeni ani eklenemiyor.");

        // Dogrulama (ad+email+telefon+mesaj zorunlu - Belge 08)
        var ad = (istek.DavetliAd ?? "").Trim();
        var email = (istek.DavetliEmail ?? "").Trim();
        var telefon = (istek.DavetliTelefon ?? "").Trim();
        var mesaj = (istek.Mesaj ?? "").Trim();

        if (ad.Length < 2)
            return Hata(400, "DOGRULAMA_HATASI", "Ad Soyad gereklidir.");
        if (!email.Contains('@') || !email.Contains('.'))
            return Hata(400, "DOGRULAMA_HATASI", "Gecerli bir e-posta gereklidir.");
        if (telefon.Length < 7)
            return Hata(400, "DOGRULAMA_HATASI", "Gecerli bir telefon gereklidir.");
        if (mesaj.Length < 2)
            return Hata(400, "DOGRULAMA_HATASI", "Bir mesaj yazmalisin.");
        if (mesaj.Length > 5000)
            return Hata(400, "DOGRULAMA_HATASI", "Mesaj cok uzun (en fazla 5000 karakter).");

        // KaynakEs token'dan turer (izolasyon: hangi linkten geldiyse o esin kuyruguna)
        var katki = new Katki
        {
            Id = Guid.NewGuid(),
            EtkinlikId = etkinlik.Id,
            PaylasimBaglantiId = link.Id,
            KaynakEs = link.Es, // es1 | es2
            DavetliAd = ad,
            DavetliEmail = email,
            DavetliTelefon = telefon,
            Mesaj = mesaj,
            Tur = "dilek",
            Durum = "beklemede", // ilgili esin onay kuyruguna duser (Asama 4)
            CreatedAt = simdi,
            UpdatedAt = simdi,
        };

        db.Katkilar.Add(katki);
        db.DenetimGunlukleri.Add(new DenetimGunlugu
        {
            Id = Guid.NewGuid(),
            EtkinlikId = etkinlik.Id,
            KullaniciId = null, // davetli anonim
            Eylem = "KATKI_BIRAKILDI",
            Varlik = "katkilar",
            VarlikId = katki.Id,
            DegisenAlanlar = JsonSerializer.Serialize(new { kaynak_es = link.Es, davetli = ad }),
            CreatedAt = simdi,
        });
        await db.SaveChangesAsync(); // atomik: katki + audit

        // Teyit (davetliye minimal yanit - okuma yuzeyi yok)
        return Results.Json(new { durum = "alindi", mesaj = "Dilegin iletildi. Tesekkurler." });
    }
}
