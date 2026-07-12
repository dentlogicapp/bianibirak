using BiAniBirak.Api.Data;
using BiAniBirak.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace BiAniBirak.Api.Servisler;

// IMHA GOREVI - defterin yasam dongusunun son halkasi.
//
// URUN DURUSU:
// BiAniBirak bir MIRAS vaadi veriyor - ama SONSUZ SAKLAMA vaadi vermiyor. Kapanistan
// SaklamaGun (37) gun sonra defter tumuyle yok edilir: dilekler, fotograflar, telefon
// numaralari, e-postalar. Hicbiri kalmaz.
//
// Bu bir eksiklik degil, bir DURUS. Rakipler veriyi sonsuza dek tutar ("bir gun lazim
// olur"); biz tutmayiz. Cift'in 40 davetlisinin telefon numarasini yillarca saklamak
// icin hicbir mesru sebebimiz yok - ve KVKK'nin "gerektiginden uzun sure saklamama"
// ilkesi tam olarak bunu soyler. Miras KAGITTA yasar, sunucumuzda degil.
//
// AMA CIFT MIRASINI KAYBETMEZ: imhadan once IKI KEZ uyaririz (14 gun ve 3 gun kala).
// Uyarmadan silmek, vaadi tutmak degil - vaadi bozmaktir.
//
// TEKNIK DISIPLIN:
//  - Her saat calisir. Idempotent: ayni defteri iki kez imha etmez (ImhaEdildi).
//  - Uyari bayraklari, cifti her turda yeniden bogmayi onler.
//  - Imha ATOMIKTIR: ya her sey silinir ya hicbiri (transaction).
//  - Etkinlik SATIRI silinmez, ISARETLENIR: "bu defter vardi ve imha edildi" kaydi
//    KVKK kanitidir. Icerik yok edilir, kanit kalir.
//  - Denetim kayitlari da silinir (icinde davetli adi/PII olabilir); yerine TEK bir
//    sistem kaydi yazilir - kimlik iceermez, yalniz sayilar.
public sealed class ImhaGorevi : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<ImhaGorevi> _log;

    // Uretimde saatlik yeterli: imha gun bazli bir istir, dakika hassasiyeti gerekmez.
    private static readonly TimeSpan Aralik = TimeSpan.FromHours(1);

    public ImhaGorevi(IServiceScopeFactory scopeFactory, ILogger<ImhaGorevi> log)
    {
        _scopeFactory = scopeFactory;
        _log = log;
    }

    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        // Baslangicta kisa bekleme: migration'lar bitsin, DB hazir olsun.
        await Task.Delay(TimeSpan.FromSeconds(30), ct);

        while (!ct.IsCancellationRequested)
        {
            try
            {
                await TurCalistirAsync(ct);
            }
            catch (Exception ex)
            {
                // Gorev CANLI KALMALI: bir tur patlarsa bir sonraki tur devam eder.
                // Imha gorevinin olmesi, KVKK taahhudunun sessizce ihlali demektir.
                _log.LogError(ex, "Imha gorevi turu basarisiz - bir sonraki turda tekrar denenecek.");
            }

            try
            {
                await Task.Delay(Aralik, ct);
            }
            catch (OperationCanceledException)
            {
                break;
            }
        }
    }

    // Tek tur: once UYARILAR, sonra IMHA. Sira onemli - imha edilecek deftere
    // uyari gondermenin anlami yok.
    public async Task TurCalistirAsync(CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<BiAniBirakDbContext>();
        var depo = scope.ServiceProvider.GetRequiredService<DepolamaServisi>();
        var push = scope.ServiceProvider.GetRequiredService<PushGonderici>();

        var simdi = DateTimeOffset.UtcNow;

        // ---- 1) UYARILAR ----
        // Imha tarihi = KapanisTarihi + SaklamaGun. Uyari esikleri buna gore.
        var adaylar = await db.Etkinlikler
            .Where(e => !e.ImhaEdildi && !e.SilindiMi)
            .ToListAsync(ct);

        foreach (var e in adaylar)
        {
            var imhaTarihi = e.KapanisTarihi.AddDays(Sabitler.SaklamaGun);
            var kalanGun = (imhaTarihi - simdi).TotalDays;

            if (kalanGun <= 14 && kalanGun > 3 && !e.ImhaUyari14Gonderildi)
            {
                await UyarAsync(db, push, e, 14, ct);
                e.ImhaUyari14Gonderildi = true;
            }
            else if (kalanGun <= 3 && kalanGun > 0 && !e.ImhaUyari3Gonderildi)
            {
                await UyarAsync(db, push, e, 3, ct);
                e.ImhaUyari3Gonderildi = true;

                // 14 gun uyarisini kacirdiysa (defter gec olusturulmus olabilir)
                // geriye donuk isaretle - bir daha gonderilmesin.
                e.ImhaUyari14Gonderildi = true;
            }
        }
        await db.SaveChangesAsync(ct);

        // ---- 2) IMHA ----
        var imhaliklar = adaylar
            .Where(e => e.KapanisTarihi.AddDays(Sabitler.SaklamaGun) <= simdi)
            .ToList();

        foreach (var e in imhaliklar)
        {
            await ImhaEtAsync(db, depo, e, ct);
        }

        if (imhaliklar.Count > 0)
            _log.LogInformation("Imha tamamlandi: {Sayi} defter.", imhaliklar.Count);
    }

    // Uyari - her iki ese de. Ton: tehdit degil, HATIRLATMA.
    private static async Task UyarAsync(
        BiAniBirakDbContext db, PushGonderici push, Etkinlik e, int gun, CancellationToken ct)
    {
        var uyeler = await db.EtkinlikUyelikleri.AsNoTracking()
            .Where(u => u.EtkinlikId == e.Id)
            .Select(u => u.KullaniciId)
            .ToListAsync(ct);

        var baslik = gun == 3
            ? "Defterin 3 gün sonra silinecek"
            : "Defterin 2 hafta sonra silinecek";

        var govde = gun == 3
            ? "Son 3 gün. Eserini indirmediysen, bu son fırsat - sonra geri getirilemez."
            : $"Söz verdiğimiz gibi, {Sabitler.SaklamaGun} gün sonunda defterini tümüyle siliyoruz. "
              + "Eserini indirdiysen içeriğin sende güvende demektir.";

        foreach (var kid in uyeler)
        {
            await push.GonderAsync(
                kid,
                baslik,
                govde,
                url: "/panel/kurasyon",
                etkinlikId: e.Id,
                sessizSaateTabi: true,
                ct: ct);
        }
    }

    // IMHA - GERI DONUSU YOK.
    //
    // Atomik: tek transaction. Yarim imha, hem KVKK ihlali hem veri enkazi demektir
    // (medya silinmis ama satirlar duruyor -> kirik defter).
    //
    // Dosyalar en SON silinir: DB rollback olursa dosyalar da durmali. Ters sirada
    // yapsaydik, DB hatasinda fotograflar gitmis ama kayitlar duruyor olurdu.
    public static async Task ImhaEtAsync(
        BiAniBirakDbContext db, DepolamaServisi depo, Etkinlik e, CancellationToken ct)
    {
        var id = e.Id;

        using var islem = await db.Database.BeginTransactionAsync(ct);

        // Imha oncesi ozet - KVKK kaniti icin. KIMLIK BILGISI ICERMEZ: yalniz sayilar.
        var dilekSayisi = await db.Katkilar.CountAsync(k => k.EtkinlikId == id, ct);
        var gorselSayisi = await db.EtkinlikGorselleri.CountAsync(g => g.EtkinlikId == id, ct);

        // Kurasyon zinciri (FK sirasi: cocuktan ebeveyne)
        var kurasyonIdler = await db.Kurasyonlar
            .Where(k => k.EtkinlikId == id).Select(k => k.Id).ToListAsync(ct);

        await db.KurasyonOgeleri
            .Where(o => kurasyonIdler.Contains(o.KurasyonId)).ExecuteDeleteAsync(ct);
        await db.KurasyonCiktilari.Where(c => c.EtkinlikId == id).ExecuteDeleteAsync(ct);
        await db.Kurasyonlar.Where(k => k.EtkinlikId == id).ExecuteDeleteAsync(ct);

        // Katki zinciri
        await db.KatkiMedyalari
            .Where(m => db.Katkilar.Where(k => k.EtkinlikId == id).Select(k => k.Id).Contains(m.KatkiId))
            .ExecuteDeleteAsync(ct);
        await db.Katkilar.Where(k => k.EtkinlikId == id).ExecuteDeleteAsync(ct);

        // Etkinlige bagli her sey
        await db.EtkinlikGorselleri.Where(g => g.EtkinlikId == id).ExecuteDeleteAsync(ct);
        await db.PaylasimBaglantilari.Where(p => p.EtkinlikId == id).ExecuteDeleteAsync(ct);
        await db.EtkinlikAyarlari.Where(a => a.EtkinlikId == id).ExecuteDeleteAsync(ct);
        await db.UyeDavetleri.Where(d => d.EtkinlikId == id).ExecuteDeleteAsync(ct);
        await db.Bildirimler.Where(b => b.EtkinlikId == id).ExecuteDeleteAsync(ct);
        await db.ErtelenenBildirimler.Where(b => b.EtkinlikId == id).ExecuteDeleteAsync(ct);
        await db.EtkinlikUyelikleri.Where(u => u.EtkinlikId == id).ExecuteDeleteAsync(ct);

        // DENETIM KAYITLARI da silinir: DegisenAlanlar icinde davetli adi, e-posta,
        // telefon olabilir. "Tam imha" dediysek, adli iz bahanesiyle PII saklayamayiz.
        await db.DenetimGunlukleri.Where(d => d.EtkinlikId == id).ExecuteDeleteAsync(ct);

        // Yerine TEK sistem kaydi: imhanin kaniti. Kimlik icermez.
        db.DenetimGunlukleri.Add(new DenetimGunlugu
        {
            Id = Guid.NewGuid(),
            EtkinlikId = null,            // tenant'a bagli DEGIL - defter artik yok
            KullaniciId = null,           // sistem eylemi, insan degil
            Eylem = "DEFTER_IMHA_EDILDI",
            Varlik = "etkinlikler",
            VarlikId = id,
            DegisenAlanlar = System.Text.Json.JsonSerializer.Serialize(new
            {
                dilek_sayisi = dilekSayisi,
                gorsel_sayisi = gorselSayisi,
                saklama_gun = Sabitler.SaklamaGun,
                kapanis = e.KapanisTarihi,
            }),
            SistemEylemi = true,
            CreatedAt = DateTimeOffset.UtcNow,
        });

        // Etkinlik SATIRI kalir, ISARETLENIR. Icerik alanlari bosaltilir: es adlari
        // da kisisel veridir. Geriye yalniz "bir defter vardi, su tarihte imha edildi"
        // bilgisi kalir - KVKK kaniti, kisisel veri DEGIL.
        var kayit = await db.Etkinlikler.FirstAsync(x => x.Id == id, ct);
        kayit.Es1Ad = "";
        kayit.Es2Ad = "";
        kayit.ImhaEdildi = true;
        kayit.ImhaZamani = DateTimeOffset.UtcNow;
        kayit.Durum = "imha";
        kayit.UpdatedAt = DateTimeOffset.UtcNow;

        await db.SaveChangesAsync(ct);
        await islem.CommitAsync(ct);

        // DOSYALAR EN SON: DB rollback olsaydi fotograflar durmaliydi. Commit
        // basariliysa artik geri donus yok - diski de temizle.
        depo.EtkinligiSil(id);
    }
}
