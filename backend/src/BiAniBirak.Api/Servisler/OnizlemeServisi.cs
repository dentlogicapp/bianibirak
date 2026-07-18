using BiAniBirak.Api.Data;
using Microsoft.EntityFrameworkCore;
using QuestPDF.Fluent;
using QuestPDF.Infrastructure;

namespace BiAniBirak.Api.Servisler;

// ONIZLEME SERVISI - "gormek bedava, BASMAK ucretli".
//
// ===================== NEDEN FILIGRAN OLDURULDU =====================
//
// Eski model: satin alma oncesi FILIGRANLI PDF indiriliyordu. Bu, urunu bitiren bir
// aciklikti - iki asamada:
//
//   1. Filigran bir kilit degil, bir HIZ TUMSEGIdir. Bugun herhangi bir goruntu
//      modeli filigrani birkac saniyede siler. 2024 sonrasi dunyada filigran,
//      "lutfen kopyalamayin" yazan bir kagit parcasidir.
//
//   2. Daha kotusu: dosya ZATEN ELDEYDI. Filigrani silmeye bile gerek yok - baskiya
//      hazir 300 DPI PDF, tam sayfa akisiyla, gercek tipografiyle, davetlinin
//      kucucuk fotografi dahil, ODEME ALINMADAN indiriliyordu.
//
// Ve bunu FARK ETMEZDIK. Satis dusuk gelir, "demek ki urunu begenmediler" derdik.
// Oysa urunu cok begenmislerdi - bedava aldilar.
//
// ===================== DEVLER NE YAPIYOR =====================
//
// Blurb, Shutterfly, Mixbook, Artifact Uprising - hicbiri satin alma oncesi kullanilabilir
// dosya vermez. Blurb'un masaustu aracindan cikan PDF'lerde bile fotograflar 72 DPI'dir:
// pikselli, blok blok, baskiya TAMAMEN elverissiz. Sektorun cozumu filigran degil,
// COZUNURLUK.
//
// ===================== BIZIM DURUSUMUZ =====================
//
// Biz goruntu satmiyoruz, BASKI KALITESI satiyoruz.
//
// Filigran urunu CIRKINLESTIRIR - satin alma arzusunu DUSURUR. Cift, kendi defterine
// bakip "keske su yazi olmasa" der.
//
// Dusuk cozunurluklu onizleme ise urunu GUZEL gosterir - arzuyu YUKSELTIR. Cift
// defterini doyasiya gorur, gurur duyar, paylasmak ister. Ama 96 DPI bir ekran
// goruntusuyle A4 basmaya kalkarsa: bulanik, yumusak, ucuz. MIRAS KALITESI DEGIL.
//
// Biri caydiricidir, digeri bastan cikaricidir. Ikincisi satar.
//
// ===================== TEKNIK =====================
//
// PDF HIC URETILMEZ. QuestPDF ayni belgeyi dogrudan PNG olarak render eder
// (GenerateImages, RasterDpi=96). Kullaniciya dosya degil, GORUNTU gider.
//
// GenerateImages cagri basina ~30MB yonetilmeyen bellek harcar (QuestPDF #968) -
// bu yuzden ONBELLEK ZORUNLUDUR. Kurasyon degismedikce yeniden uretilmez.
public static class OnizlemeServisi
{
    // EKRAN COZUNURLUGU. 96 DPI, tarayicinin dogal cozunurlugu.
    //
    // Neden 96 ve neden daha yuksegi degil:
    //   - Ekranda kusursuz gorunur (retina icin 2x olcekleme CSS'te yapilir).
    //   - A4'e basildiginda GORUNUR SEKILDE bulanik cikar: 96 DPI, baskinin
    //     gerektirdigi 300 DPI'nin ucte biri. Metin kenarlari yumusar, ince
    //     tipografi dagilir, yaldiz cizgiler kirilir.
    //   - Yani cift, ekranda GURUR DUYAR; basmaya kalkarsa UTANIR.
    //
    // Bu sayi urunun is modelidir. Yukseltmek, urunu bedava dagitmaktir.
    public const int OnizlemeDpi = 96;

    // BASKI COZUNURLUGU - odeme sonrasi. Fark, kagitta HISSEDILIR.
    public const int BaskiDpi = 300;

    // Onbellek anahtari: kurasyon + dilekler + gorseller degistiginde degisir.
    // Degismediyse yeniden render ETME - 30MB'lik bellek sicramasini bosuna yasama.
    public sealed record Onbellek(string Anahtar, List<byte[]> Sayfalar, DateTimeOffset Uretim);

    private static readonly Dictionary<Guid, Onbellek> _bellek = new();
    private static readonly SemaphoreSlim _kilit = new(1, 1);

    // Kurasyonun "surum parmak izi" - icerik degistiyse degisir.
    public static async Task<string> ParmakIziAsync(
        Guid etkinlikId, BiAniBirakDbContext db, CancellationToken ct = default)
    {
        var kurasyon = await db.Kurasyonlar.AsNoTracking()
            .Where(k => k.EtkinlikId == etkinlikId)
            .Select(k => new { k.Id, k.UpdatedAt })
            .FirstOrDefaultAsync(ct);

        if (kurasyon == null) return "yok";

        // Esere dahil dilekler + siralari + guncelleme zamanlari
        var ogeler = await db.KurasyonOgeleri.AsNoTracking()
            .Where(o => o.KurasyonId == kurasyon.Id && o.Dahil)
            .OrderBy(o => o.Sira)
            .Select(o => o.KatkiId)
            .ToListAsync(ct);

        var sonKatki = await db.Katkilar.AsNoTracking()
            .Where(k => k.EtkinlikId == etkinlikId && !k.SilindiMi)
            .MaxAsync(k => (DateTimeOffset?)k.UpdatedAt, ct);

        var sonGorsel = await db.EtkinlikGorselleri.AsNoTracking()
            .Where(g => g.EtkinlikId == etkinlikId)
            .MaxAsync(g => (DateTimeOffset?)g.CreatedAt, ct);

        var ham = $"{kurasyon.UpdatedAt:O}|{ogeler.Count}|{string.Join(",", ogeler)}"
                  + $"|{sonKatki:O}|{sonGorsel:O}";

        return OnayServisi.HashUret(ham)[..16];
    }

    // SAYFA GORUNTULERI - onbellekten ya da uretilerek.
    //
    // Donen sey PDF DEGIL, PNG listesidir. Kullanicinin eline dosya GECMEZ; tarayicida
    // goruntu olarak akar. "Farkli kaydet" dese elinde 96 DPI bir PNG olur - ekranda
    // guzel, kagitta hicbir ise yaramaz.
    public static async Task<(List<byte[]>? sayfalar, DefterDerleyici.Hata? hata)> SayfalarAsync(
        Guid etkinlikId,
        BiAniBirakDbContext db,
        DepolamaServisi depo,
        string icerikKoku,
        CancellationToken ct = default)
    {
        var parmak = await ParmakIziAsync(etkinlikId, db, ct);

        // Onbellek isabeti - render ETME.
        lock (_bellek)
        {
            if (_bellek.TryGetValue(etkinlikId, out var eski) && eski.Anahtar == parmak)
                return (eski.Sayfalar, null);
        }

        // Tek seferde tek render (GenerateImages bellek yer; es zamanli cagrilar
        // sunucuyu bogar).
        await _kilit.WaitAsync(ct);
        try
        {
            // Kilidi beklerken baska biri uretmis olabilir.
            lock (_bellek)
            {
                if (_bellek.TryGetValue(etkinlikId, out var eski) && eski.Anahtar == parmak)
                    return (eski.Sayfalar, null);
            }

            var (belge, hata) = await DefterDerleyici.BelgeAsync(
                etkinlikId, db, depo, icerikKoku, ct);

            if (hata != null) return (null, hata);

            // ONIZLEME DPI - is modelinin kendisi. Bu sayiyi yukseltmek, urunu
            // bedava dagitmaktir.
            var ayar = new ImageGenerationSettings
            {
                ImageFormat = ImageFormat.Png,
                ImageCompressionQuality = ImageCompressionQuality.High,
                RasterDpi = OnizlemeDpi,
            };

            // SAVUNMA KATMANI: duzen tahmini yanilirsa (cok uzun dilek, asiri buyuk
            // gorsel) QuestPDF DocumentLayoutException firlatir. Yakalanmazsa istek
            // 500 doner ve kullanici "Bir hata olustu" gorur - teshis imkansiz.
            // Yakalayip ANLAMLI hata kodu donuyoruz.
            List<byte[]> sayfalar;
            try
            {
                sayfalar = belge!.GenerateImages(ayar).ToList();
            }
            catch (QuestPDF.Drawing.Exceptions.DocumentLayoutException)
            {
                return (null, new DefterDerleyici.Hata("DUZEN_HATASI",
                    "Defter sayfalara sigdirilamadi. Cok uzun bir dilek ya da cok buyuk bir gorsel olabilir."));
            }

            lock (_bellek)
            {
                // Onbellek sinirli: 20 defter. Yoksa bellek sisirir.
                if (_bellek.Count >= 20)
                {
                    var enEski = _bellek.OrderBy(x => x.Value.Uretim).First().Key;
                    _bellek.Remove(enEski);
                }
                _bellek[etkinlikId] = new Onbellek(parmak, sayfalar, DateTimeOffset.UtcNow);
            }

            return (sayfalar, null);
        }
        finally
        {
            _kilit.Release();
        }
    }

    // Onbellegi dusur - kurasyon degisince cagrilir (anlik yansisin).
    public static void OnbellegiTemizle(Guid etkinlikId)
    {
        lock (_bellek)
        {
            _bellek.Remove(etkinlikId);
        }
    }
}
