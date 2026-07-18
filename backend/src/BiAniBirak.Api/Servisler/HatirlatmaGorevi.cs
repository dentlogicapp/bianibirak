using BiAniBirak.Api.Data;
using BiAniBirak.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace BiAniBirak.Api.Servisler;

// INDIRME HATIRLATMA GOREVI - "kimse mirasini kaybetmesin".
//
// URUN GERCEGI:
// Cift dilekleri topladi, defter doldu, eser hazir. Ve sonra... hayat devam etti.
// Dugun telasi bitti, tatile gidildi, is basladi. 37. gun geldiginde defter silindi
// ve cift bunu ancak aylar sonra fark etti.
//
// Bu senaryo, urunun EN BUYUK BASARISIZLIGIDIR. Teknik olarak her sey dogru calisti:
// sure doldu, imha edildi, KVKK'ya uyuldu. Ama cift mirasini kaybetti - ve bunu bizim
// yuzumuzden kaybetti, cunku YETERINCE HATIRLATMADIK.
//
// TAKVIM (ozel gunden sonra) - IKI FAZ:
//
//   FAZ 1 - GUNLUK SAYIM (1..14. gun, her gun 10:00)
//     "Anı defterinizin kalıcı olarak silinmesine N gün kaldı"
//     Cift her gun ayni saatte, ayni cumleyle, azalan bir sayi gorur. Sayinin her gun
//     kucullmesi, tek seferlik bir uyaridan cok daha guclu bir hatirlatmadir.
//
//   FAZ 2 - SON 5 GUN, SAAT BAZLI (imhaya 120/96/72/48/24/12/3 saat kala)
//     "Kalan süre N saat"
//     120 saat = toplamanin kapandigi an. Bu noktadan sonra ton sertlesir ve sure
//     GUN degil SAAT olarak soylenir: "3 gun" soyut, "72 saat" somut ve acildir.
//
// Neden saat bazli: son pencerede kullanicinin yapmasi gereken TEK is vardir (indir).
// Belirsiz bir "birkac gun" ifadesi erteletir; saat, ertelenemez.
//
// SESSIZ SAATE TABI DEGIL: bunlar hayati uyarilardir. "Rahatsiz etmeyin" ayari, geri
// donusu olmayan bir kaybi engellemenin onune gecemez.
//
// INDIREN DURUR: eser indirilmisse Faz 1 hatirlatmasi gonderilmez - adam isini yapti,
// bogmayiz. Ama FAZ 2 (son 5 gun) INDIRENE DE GIDER: indirdigi dosya bilgisayarinda
// duruyor olabilir ama defterin SUNUCUDAN silinecegini bilmek onun hakkidir; ustelik
// "indirdim saniyordum" hatasi geri donusu olmayan bir kayiptir.
public sealed class HatirlatmaGorevi : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<HatirlatmaGorevi> _log;

    // Saatlik: takvim saat hassasiyetinde. Dakika gerekmez.
    private static readonly TimeSpan Aralik = TimeSpan.FromMinutes(30);

    public HatirlatmaGorevi(IServiceScopeFactory scopeFactory, ILogger<HatirlatmaGorevi> log)
    {
        _scopeFactory = scopeFactory;
        _log = log;
    }

    // FAZ 1 - gunluk sayim gunleri (1 .. ToplamaGun-1). Her biri sabah 10:00.
    // ToplamaGun'un kendisi Faz 2'nin ilk adimidir (120 saat kala = toplama kapanisi),
    // bu yuzden burada YOKTUR - ayni gun iki bildirim gitmez.
    public static readonly int[] GunlukGunler =
        Enumerable.Range(1, Sabitler.ToplamaGun - 1).ToArray();

    // FAZ 2 - imhaya KALAN SAAT esikleri. 120 saat = tam 5 gun = toplama kapanisi.
    public static readonly int[] SonSaatler = { 120, 96, 72, 48, 24, 12, 3 };

    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        await Task.Delay(TimeSpan.FromSeconds(45), ct);

        while (!ct.IsCancellationRequested)
        {
            try
            {
                await TurCalistirAsync(ct);
            }
            catch (Exception ex)
            {
                _log.LogError(ex, "Hatirlatma gorevi turu basarisiz.");
            }

            try { await Task.Delay(Aralik, ct); }
            catch (OperationCanceledException) { break; }
        }
    }

    public async Task TurCalistirAsync(CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<BiAniBirakDbContext>();
        var push = scope.ServiceProvider.GetRequiredService<PushGonderici>();

        var simdi = DateTimeOffset.UtcNow;

        var defterler = await db.Etkinlikler.AsNoTracking()
            .Where(e => !e.ImhaEdildi && !e.SilindiMi && !e.Donduruldu)
            .Select(e => new { e.Id, e.Es1Ad, e.Es2Ad, e.EtkinlikTarihi })
            .ToListAsync(ct);

        if (defterler.Count == 0) return;

        var idler = defterler.Select(d => d.Id).ToList();

        // INDIRENLER: eserini indirmis defterler. Bunlara hatirlatma GITMEZ.
        //
        // Onceki surumde "filigransiz cikti" diye bir ayrim vardi - cunku filigranli
        // PDF de indirilebiliyordu. O aciklik kapatildi: artik PDF cikisi TEK anlama
        // gelir, gercek indirme. Onizleme dosya uretmez, goruntu uretir.
        var indirenler = (await db.KurasyonCiktilari.AsNoTracking()
            .Where(c => idler.Contains(c.EtkinlikId))
            .Select(c => c.EtkinlikId)
            .Distinct()
            .ToListAsync(ct))
            .ToHashSet();

        // GONDERILMIS OLANLAR: ayni hatirlatma iki kez gitmesin. Denetim gunlugu
        // uzerinden idempotent - ayri bir tablo acmaya gerek yok (mevcuda entegre).
        var gonderilmis = (await db.DenetimGunlukleri.AsNoTracking()
            .Where(d => d.EtkinlikId != null
                        && idler.Contains(d.EtkinlikId!.Value)
                        && d.Eylem == "INDIRME_HATIRLATMASI")
            .Select(d => new { d.EtkinlikId, d.VarlikId })
            .ToListAsync(ct))
            .Select(x => $"{x.EtkinlikId}:{x.VarlikId}")
            .ToHashSet();

        int gonderilen = 0;

        foreach (var d in defterler)
        {
            // IMHA ANI - tek dogruluk kaynagi. Faz 2 esikleri bu ana gore hesaplanir.
            var imhaAn = new DateTimeOffset(
                d.EtkinlikTarihi.Date.AddDays(Sabitler.ToplamGun), TimeSpan.Zero);

            // ---- FAZ 1: gunluk sayim (indirene GITMEZ) ----
            if (!indirenler.Contains(d.Id))
            {
                foreach (var gun in GunlukGunler)
                {
                    var hedef = d.EtkinlikTarihi.Date
                        .AddDays(gun)
                        .AddHours(Sabitler.BildirimSabahSaat - Sabitler.TurkiyeSaatFarki);
                    var hedefUtc = new DateTimeOffset(hedef, TimeSpan.Zero);

                    if (simdi < hedefUtc) continue;             // vakti gelmedi
                    if (simdi > hedefUtc.AddHours(6)) continue; // cok gecti (sunucu kapaliymis)

                    var anahtar = GunAnahtari(gun);
                    if (gonderilmis.Contains($"{d.Id}:{anahtar}")) continue;

                    var kalanGun = Sabitler.ToplamGun - gun;
                    await GonderAsync(db, push, d.Id, $"{d.Es1Ad} & {d.Es2Ad}",
                        GunMetni(kalanGun, $"{d.Es1Ad} & {d.Es2Ad}"), anahtar,
                        new { gun, kalan_gun = kalanGun }, ct);
                    gonderilen++;
                }
            }

            // ---- FAZ 2: son 5 gun, saat bazli (INDIRENE DE GIDER) ----
            foreach (var saat in SonSaatler)
            {
                var hedefUtc = imhaAn.AddHours(-saat);

                if (simdi < hedefUtc) continue;
                // Pencere: bir sonraki esige kadar (en fazla 6 saat) - kacirilmis
                // esik gec de olsa gider, ama gecmis esikler ust uste yigilmaz.
                if (simdi > hedefUtc.AddHours(6)) continue;
                if (simdi >= imhaAn) continue; // imha olduysa uyarinin anlami kalmadi

                var anahtar = SaatAnahtari(saat);
                if (gonderilmis.Contains($"{d.Id}:{anahtar}")) continue;

                await GonderAsync(db, push, d.Id, $"{d.Es1Ad} & {d.Es2Ad}",
                    SaatMetni(saat, $"{d.Es1Ad} & {d.Es2Ad}"), anahtar,
                    new { kalan_saat = saat }, ct);
                gonderilen++;
            }
        }

        if (gonderilen > 0)
        {
            await db.SaveChangesAsync(ct);
            _log.LogInformation("Indirme hatirlatmasi: {Sayi} bildirim.", gonderilen);
        }
    }

    // Gun numarasindan deterministik GUID: ayni gun icin her zaman ayni anahtar.
    // Boylece "bu hatirlatma gonderildi mi?" sorusu ekstra tablo olmadan yanitlanir.
    private static Guid GunAnahtari(int gun)
    {
        var bayt = new byte[16];
        BitConverter.GetBytes(gun).CopyTo(bayt, 0);
        bayt[15] = 0x7A; // namespace ayraci - baska VarlikId'lerle carpismasin
        return new Guid(bayt);
    }

    // Saat esiginden deterministik GUID. AYRI namespace (0x7B): "gun 24" ile
    // "24 saat kala" ayni anahtari URETEMEZ - biri digerini susturamaz.
    private static Guid SaatAnahtari(int saat)
    {
        var bayt = new byte[16];
        BitConverter.GetBytes(saat).CopyTo(bayt, 0);
        bayt[15] = 0x7B;
        return new Guid(bayt);
    }

    private static async Task GonderAsync(
        BiAniBirakDbContext db, PushGonderici push,
        Guid etkinlikId, string ciftAdi, (string Baslik, string Govde, string PushGovde) metin,
        Guid anahtar, object gunluk, CancellationToken ct)
    {
        var uyeler = await db.EtkinlikUyelikleri.AsNoTracking()
            .Where(u => u.EtkinlikId == etkinlikId)
            .Select(u => u.KullaniciId)
            .ToListAsync(ct);

        // HER IKI ESE DE: defter ortaktir, kayip da ortaktir. Bir esin bildirimi
        // gormemis olmasi digerini de mirassiz birakir.
        foreach (var kid in uyeler)
        {
            await push.GonderAsync(
                kid, metin.Baslik, metin.Govde,
                url: "/baskiya-hazir-defter",
                etkinlikId: etkinlikId,
                // HAYATI UYARI: sessiz saate TABI DEGIL.
                sessizSaateTabi: false,
                ct: ct,
                // PUSH KISA GIDER: kilit ekraninda uzun hukuki cumle kesilir ve
                // uyari ciddiyetini kaybeder. Tam metin uygulama ici bildirimde durur.
                pushGovde: metin.PushGovde);
        }

        db.DenetimGunlukleri.Add(new DenetimGunlugu
        {
            Id = Guid.NewGuid(),
            EtkinlikId = etkinlikId,
            KullaniciId = null,
            Eylem = "INDIRME_HATIRLATMASI",
            Varlik = "etkinlikler",
            VarlikId = anahtar,
            DegisenAlanlar = System.Text.Json.JsonSerializer.Serialize(gunluk),
            SistemEylemi = true,
            CreatedAt = DateTimeOffset.UtcNow,
        });
    }

    // ---- FAZ 1 METNI: gunluk sayim ----
    //
    // Ton merdiveni: ilk gunlerde bilgilendirici, ortada hatirlatici, sona dogru
    // uyarici. Ilk gunden "SILINECEK!" diye bagirmak cifti korkutur ve bildirimlerimizi
    // KAPATTIRIR - sonra gercekten kritik an geldiginde duymaz.
    private static (string Baslik, string Govde, string PushGovde) GunMetni(int kalanGun, string ciftAdi)
    {
        var baslik = $"Anı defterinizin kalıcı olarak silinmesine {kalanGun} gün kaldı";

        var pushKisa = $"Kalıcı silinmeye {kalanGun} gün kaldı.";

        if (kalanGun > 15)
            return (baslik,
                $"{ciftAdi}, davetlileriniz anılarını bırakıyor. Defterinizi dilediğiniz an "
                + $"düzenleyebilirsiniz. Dilek toplama {Sabitler.ToplamaGun}. günde kapanır; "
                + $"eserinizi indirmek için toplam {Sabitler.ToplamGun} gününüz var.", pushKisa);

        if (kalanGun > 10)
            return (baslik,
                $"{ciftAdi}, defteriniz büyüyor. Hazır olduğunda baskıya hazır PDF'inizi "
                + "indirip güvenli bir yere kaydedin - bu miras kâğıtta kalıcıdır, sunucuda değil.", pushKisa);

        if (kalanGun > 6)
            return (baslik,
                $"{ciftAdi}, süre ilerliyor. Defterinizi henüz indirmediyseniz şimdi indirin; "
                + "beklemek için bir sebep yok, dilekler eklendikçe yeniden indirebilirsiniz.", pushKisa);

        return (baslik,
            $"{ciftAdi}, {kalanGun} gün sonra defteriniz ve tüm içeriği (dilekler, fotoğraflar) "
            + "kalıcı olarak silinecek ve hiçbir şekilde geri getirilemeyecek. Lütfen eserinizi "
            + "indirin ve yedekleyin.", pushKisa);
    }

    // ---- FAZ 2 METNI: son 5 gun, SAAT bazli ----
    //
    // Burada sure GUN degil SAAT olarak soylenir. "3 gun" ertelenebilir; "72 saat"
    // ertelenemez. Metin ayrica NEREDEN silinecegini acikca yazar (uygulama +
    // veritabani) ve geri donusun IMKANSIZ oldugunu tekrar eder - belirsizlik birakmaz.
    private static (string Baslik, string Govde, string PushGovde) SaatMetni(int saat, string ciftAdi)
    {
        var ortak =
            "Bu süre sonunda anı defteriniz uygulamanızdan ve veritabanımızdan kalıcı olarak "
            + "silinerek kaldırılacaktır. Bu kalıcı silme işleminden sonra oluşturduğunuz anı "
            + "defterine bir daha erişilmesi mümkün olmayacaktır.";

        if (saat == 120)
            return (
                "Dilek toplama kapandı · Kalıcı silinmesine 120 saat kaldı",
                $"{ciftAdi}, davetli girişleri sona erdi ve defteriniz tamamlandı. "
                + $"Kalıcı silinmesine kalan süre 120 saattir. {ortak} "
                + "Şimdi yapmanız gereken tek şey: baskıya hazır defterinizi indirin.",
                "Dilek toplama kapandı. Kalıcı silinmeye 120 saat kaldı - defterinizi indirin.");

        if (saat >= 24)
            return (
                $"Kalıcı silinmesine {saat} saat kaldı",
                $"{ciftAdi}, anı defterinizin kalıcı silinmesine kalan süre {saat} saattir. "
                + $"{ortak} Eserinizi indirip güvenli bir yere kaydedin.",
                $"Kalıcı silinmeye {saat} saat kaldı. Defteriniz sonra geri getirilemez.");

        if (saat == 12)
            return (
                "SON 12 SAAT",
                $"{ciftAdi}, anı defterinizin kalıcı silinmesine kalan süre 12 saattir. "
                + $"{ortak} Bu, eserinizi kurtarmak için son fırsatlarınızdan biridir.",
                "SON 12 SAAT. Defteriniz kalıcı olarak silinecek - şimdi indirin.");

        return (
            "SON 3 SAAT · Defteriniz siliniyor",
            $"{ciftAdi}, anı defterinizin kalıcı silinmesine kalan süre yalnızca 3 saattir. "
            + $"{ortak} Şimdi indirmezseniz bu defter bir daha var olmayacak.",
            "SON 3 SAAT. Defteriniz siliniyor - şimdi indirmezseniz bir daha var olmayacak.");
    }
}
