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
        app.MapPost("/api/k/{token}/foto/{katkiId:guid}", KatkiFoto).DisableAntiforgery();
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

        // Cift gorselleri: davetli cift'in yuzunu gorur -> duygusal bag -> daha iyi dilek.
        // Kapak once, sonra galeri sirasi.
        var gorseller = await db.EtkinlikGorselleri.AsNoTracking()
            .Where(g => g.EtkinlikId == etkinlik.Id)
            .OrderBy(g => g.Konum == "kapak" ? 0 : 1)
            .ThenBy(g => g.Sira)
            .Select(g => new
            {
                url = "/api/gorsel/" + g.DepolamaAnahtari,
                altyazi = g.Altyazi,
                kapak = g.Konum == "kapak",
            })
            .ToListAsync();

        return Results.Json(new
        {
            es1_ad = etkinlik.Es1Ad,
            es2_ad = etkinlik.Es2Ad,
            kaynak_es = link.Es, // davetli hangi esin linkinde (yonlendirme metni)
            tur = etkinlik.Tur,
            karsilama_metni = ayar?.KarsilamaMetni,
            prompt_metni = ayar?.PromptMetni,
            acildi = acildiMi,
            kapandi = kapandiMi,
            // Sayac (davetli ekraninda geri sayim)
            sayac_aktif = ayar?.SayacAktif ?? false,
            sayac_aktif_cumle = ayar?.SayacAktifCumle,
            sayac_bitti_cumle = ayar?.SayacBittiCumle,
            etkinlik_tarihi = etkinlik.EtkinlikTarihi,
            gorseller,
            // Saklama seffafligi (Musa karari): davetli ne kadar tutuldugunu BILSIN.
            saklama_gun = Sabitler.SaklamaGun,
        });
    }

    // POST - katki birak. Tum guvenlik katmanlari.
    private static async Task<IResult> KatkiBirak(
        string token, KatkiBirakIstek istek, HttpContext ctx,
        BiAniBirakDbContext db, HizSiniri hizSiniri, PushGonderici push)
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

        // SUPER PANEL: dondurulmus / cope atilmis defterde YAZIM reddedilir (kotuye kullanim - Belge 08).
        // Guest token'la gelen davetli de dahil - UI'da gizlemek yetmez, kontrol backend'de.
        if (etkinlik.SilindiMi)
            return Hata(404, "ETKINLIK_BULUNAMADI", "Bu defter artık kullanılamıyor.");
        if (etkinlik.Donduruldu)
            return Hata(403, "ETKINLIK_DONDURULDU",
                "Bu defter geçici olarak durduruldu; şu an yeni anı eklenemiyor.");

        if (simdi < etkinlik.AcilisTarihi)
            return Hata(403, "ETKINLIK_ACILMADI", "Bu defter henüz açılmadı.");
        if (simdi > etkinlik.KapanisTarihi || etkinlik.Durum == "kapali" || etkinlik.Durum == "arsiv")
            return Hata(403, "ETKINLIK_KAPALI", "Bu defter kapandı; yeni anı eklenemiyor.");

        // Dogrulama (ad+email+telefon+mesaj zorunlu - Belge 08)
        var ad = (istek.DavetliAd ?? "").Trim();
        var email = (istek.DavetliEmail ?? "").Trim();
        var telefon = (istek.DavetliTelefon ?? "").Trim();
        var iliski = (istek.DavetliIliski ?? "").Trim();
        var mesaj = (istek.Mesaj ?? "").Trim();

        if (ad.Length < 2)
            return Hata(400, "DOGRULAMA_HATASI", "Ad Soyad gereklidir.");
        if (!email.Contains('@') || !email.Contains('.'))
            return Hata(400, "DOGRULAMA_HATASI", "Geçerli bir e-posta gereklidir.");
        if (telefon.Length < 7)
            return Hata(400, "DOGRULAMA_HATASI", "Geçerli bir telefon gereklidir.");
        // ILISKI zorunlu: cift 20 yil sonra "bu Ayse kimdi?" dememeli.
        if (iliski.Length < 2)
            return Hata(400, "DOGRULAMA_HATASI", "Çifte yakınlığını belirtmelisin.");
        if (iliski.Length > 60)
            return Hata(400, "DOGRULAMA_HATASI", "Yakınlık metni çok uzun (en fazla 60 karakter).");
        if (mesaj.Length < 2)
            return Hata(400, "DOGRULAMA_HATASI", "Bir mesaj yazmalısın.");
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
            DavetliIliski = iliski,
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

        // Push tetigi: KaynakEs sahibi ese "yeni dilek" bildirimi (fire-and-forget).
        // Davetli deneyimi bloklanmaz; push arka planda gider.
        var sahipUyelik = await db.EtkinlikUyelikleri.AsNoTracking()
            .FirstOrDefaultAsync(u => u.EtkinlikId == etkinlik.Id && u.Rol == link.Es);
        if (sahipUyelik != null)
        {
            var baslik = "Yeni bir anı bırakıldı";
            var govde = $"{ad}, {etkinlik.Es1Ad} & {etkinlik.Es2Ad} defterinize bir dilek bıraktı. Onayını bekliyor.";
            _ = push.GonderAsync(sahipUyelik.KullaniciId, baslik, govde,
                url: $"/panel/etkinlik?focus={katki.Id}", etkinlikId: etkinlik.Id);
        }

        // Teyit (davetliye minimal yanit - okuma yuzeyi yok).
        // katki_id: SADECE fotograf yukleme adimi icin (2. adim). Okuma yetkisi vermez.
        return Results.Json(new
        {
            durum = "alindi",
            katki_id = katki.Id,
            mesaj = "Dileğin iletildi. Teşekkürler.",
        });
    }

    // DAVETLI FOTOGRAFI (davetli basina EN FAZLA 1 - Musa karari).
    // Iki asamali akis: once dilek kaydedilir (kaybolmaz), sonra foto eklenir.
    // Boylece foto yuklemesi basarisiz olsa bile dilek durur.
    private static async Task<IResult> KatkiFoto(
        string token, Guid katkiId, HttpContext ctx, BiAniBirakDbContext db,
        DepolamaServisi depo, IFormFile? dosya, int? genislik, int? yukseklik)
    {
        var (link, etkinlik) = await Cozumle(db, token);
        if (link == null || etkinlik == null)
            return Hata(404, "BAGLANTI_BULUNAMADI", "Bu bağlantı geçersiz veya kaldırılmış.");

        // Pencere + defter durumu (yazim kontrolu - kirmizi cizgi)
        var simdi = DateTimeOffset.UtcNow;
        if (etkinlik.SilindiMi || etkinlik.Donduruldu)
            return Hata(403, "ETKINLIK_KAPALI", "Bu deftere şu an ekleme yapılamıyor.");
        if (simdi > etkinlik.KapanisTarihi || etkinlik.Durum == "kapali" || etkinlik.Durum == "arsiv")
            return Hata(403, "ETKINLIK_KAPALI", "Bu defter kapandı.");

        // Katki BU tokenden mi geldi? (izolasyon: baska esin katkisina foto eklenemez)
        var katki = await db.Katkilar
            .FirstOrDefaultAsync(k => k.Id == katkiId
                                      && k.EtkinlikId == etkinlik.Id
                                      && k.PaylasimBaglantiId == link.Id
                                      && !k.SilindiMi);
        if (katki == null)
            return Hata(404, "KATKI_BULUNAMADI", "Dilek bulunamadı.");

        // Tek fotograf hakki
        if (katki.FotoAnahtari != null)
            return Hata(400, "FOTO_ZATEN_VAR", "Bu dileğe zaten bir fotoğraf eklenmiş.");

        // Yalniz onay bekleyen dilege foto eklenebilir (onay sonrasi degistirilemez)
        if (katki.Durum != "beklemede")
            return Hata(400, "KATKI_KAPALI", "Bu dilek artık düzenlenemiyor.");

        if (dosya == null || dosya.Length == 0)
            return Hata(400, "DOGRULAMA_HATASI", "Bir fotoğraf seçmelisin.");
        if (dosya.Length > DepolamaServisi.TavanBayt)
            return Hata(400, "GORSEL_COK_BUYUK", "Fotoğraf çok büyük.");

        using var bellek = new MemoryStream();
        await dosya.CopyToAsync(bellek);
        var veri = bellek.ToArray();

        var tip = DepolamaServisi.TipCoz(veri);
        if (tip == null)
            return Hata(400, "GECERSIZ_GORSEL", "Yalnızca JPEG, PNG veya WebP kabul edilir.");

        katki.FotoAnahtari = await depo.KaydetAsync(etkinlik.Id, veri, tip.Uzanti);
        katki.FotoGenislik = genislik ?? 0;
        katki.FotoYukseklik = yukseklik ?? 0;
        katki.UpdatedAt = simdi;
        await db.SaveChangesAsync();

        return Results.Json(new { ok = true });
    }
}
