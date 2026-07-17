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
// TAKVIM (ozel gunden sonra):
//    +2 gun   10:00   - "eserin hazirlaniyor" (ilk temas, henuz aciliyet yok)
//   +10 gun   10:00
//   +15 gun   19:00
//   +20 gun   10:00
//   +25 gun   19:00
//   +30 gun   10:00   - TOPLAMA KAPANDI, artik yalniz 7 gunun var
//   +31..+36  her gun (10:00/19:00 donusumlu) - SON HAFTA
//   +37 gun   10:00   - BUGUN SON GUN
//
// Sabah 10 ve aksam 19: insanin telefonuna baktigi saatler. Gece yarisi gonderilen
// bildirim okunmaz, sadece rahatsiz eder.
//
// SESSIZ SAATE TABI DEGIL: bunlar hayati uyarilardir. "Rahatsiz etmeyin" ayari, geri
// donusu olmayan bir kaybi engellemenin onune gecemez. (Zaten 10:00/19:00 makul
// saatler - sessiz saatle cakismasi beklenmez.)
//
// INDIREN DURUR: eser indirilmisse hatirlatma gonderilmez. Adam isini yapti, bogmayiz.
// (Imha uyarilari - ImhaGorevi - yine de gider: "verilerin siliniyor, yedegin var mi?")
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

    // TAKVIM - (gun, saat). Tek dogruluk kaynagi: hem gorev hem UI cizelgesi buradan
    // beslenmelidir; iki liste tutulsaydi kacinilmaz olarak ayrisirdi.
    public static readonly (int Gun, int Saat)[] Takvim = OlusturTakvim();

    private static (int, int)[] OlusturTakvim()
    {
        var liste = new List<(int, int)>
        {
            (2, Sabitler.BildirimSabahSaat),
            (10, Sabitler.BildirimSabahSaat),
            (15, Sabitler.BildirimAksamSaat),
            (20, Sabitler.BildirimSabahSaat),
            (25, Sabitler.BildirimAksamSaat),
            (30, Sabitler.BildirimSabahSaat),
        };

        // SON HAFTA: her gun. 30. gun sabahla bitti; 31 aksam, 32 sabah... donusumlu.
        for (int g = Sabitler.ToplamaGun + 1; g < Sabitler.ToplamGun; g++)
        {
            var tek = (g - Sabitler.ToplamaGun) % 2 == 1;
            liste.Add((g, tek ? Sabitler.BildirimAksamSaat : Sabitler.BildirimSabahSaat));
        }

        // SON GUN - HER ZAMAN SABAH. Donusum sirasi burayi aksama dusuruyordu; "bugun
        // son gun" bildirimi aksam 19:00'da gelirse indirmeye vakit KALMAZ. Kural,
        // kullanicinin zararina calisiyorsa kural yanlistir.
        liste.Add((Sabitler.ToplamGun, Sabitler.BildirimSabahSaat));

        return liste.ToArray();
    }

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
            if (indirenler.Contains(d.Id)) continue;

            foreach (var (gun, saat) in Takvim)
            {
                // Hedef an: ozel gun + N gun, Turkiye saatiyle HH:00 -> UTC'ye cevir.
                var hedef = d.EtkinlikTarihi.Date
                    .AddDays(gun)
                    .AddHours(saat - Sabitler.TurkiyeSaatFarki);
                var hedefUtc = new DateTimeOffset(hedef, TimeSpan.Zero);

                if (simdi < hedefUtc) continue;         // vakti gelmedi
                if (simdi > hedefUtc.AddHours(6)) continue; // cok gecti (sunucu kapaliymis)

                // Idempotent anahtar: gun numarasi deterministik bir GUID'e gomulur.
                var anahtar = GunAnahtari(gun);
                if (gonderilmis.Contains($"{d.Id}:{anahtar}")) continue;

                await GonderAsync(db, push, d.Id, $"{d.Es1Ad} & {d.Es2Ad}", gun, anahtar, ct);
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

    private static async Task GonderAsync(
        BiAniBirakDbContext db, PushGonderici push,
        Guid etkinlikId, string ciftAdi, int gun, Guid anahtar, CancellationToken ct)
    {
        var (baslik, govde) = Metin(gun, ciftAdi);

        var uyeler = await db.EtkinlikUyelikleri.AsNoTracking()
            .Where(u => u.EtkinlikId == etkinlikId)
            .Select(u => u.KullaniciId)
            .ToListAsync(ct);

        foreach (var kid in uyeler)
        {
            await push.GonderAsync(
                kid, baslik, govde,
                url: "/baskiya-hazir-defter",
                etkinlikId: etkinlikId,
                // HAYATI UYARI: sessiz saate TABI DEGIL. "Rahatsiz etmeyin" ayari,
                // geri donusu olmayan bir kaybi engellemenin onune gecemez.
                sessizSaateTabi: false,
                ct: ct);
        }

        db.DenetimGunlukleri.Add(new DenetimGunlugu
        {
            Id = Guid.NewGuid(),
            EtkinlikId = etkinlikId,
            KullaniciId = null,
            Eylem = "INDIRME_HATIRLATMASI",
            Varlik = "etkinlikler",
            VarlikId = anahtar,
            DegisenAlanlar = System.Text.Json.JsonSerializer.Serialize(new { gun }),
            // Bu bir SISTEM eylemidir - ciftin denetim gunlugunde gorunmez.
            // (Bildirimi zaten aldi; ayrica denetim satiri olarak gostermek gurultu.)
            SistemEylemi = true,
            CreatedAt = DateTimeOffset.UtcNow,
        });
    }

    // Ton merdiveni: once bilgilendirme, sonra hatirlatma, en sonda ACIL.
    // Ilk gunden "SILINECEK!" diye bagirmak, cifti korkutur ve bildirimlerimizi
    // kapattirir - sonra gercekten kritik an geldiginde duymaz.
    private static (string Baslik, string Govde) Metin(int gun, string ciftAdi)
    {
        var kalan = Sabitler.ToplamGun - gun;

        if (gun <= 2)
            return (
                "Defteriniz dilekleri topluyor",
                $"{ciftAdi}, davetlileriniz anılarını bırakıyor. Baskı Stüdyosu'ndan defterinizi "
                + $"dilediğiniz an düzenleyebilirsiniz. Toplama {Sabitler.ToplamaGun}. günde kapanır, "
                + $"eserinizi indirmek için {Sabitler.ToplamGun}. güne kadar süreniz var.");

        if (gun < Sabitler.ToplamaGun)
            return (
                $"Defterinizi indirmek için {kalan} gün",
                $"{ciftAdi}, anı defteriniz hazır olduğunda indirmeyi unutmayın. "
                + $"{kalan} gün sonra tüm veriler kalıcı olarak silinecek ve geri getirilemeyecek.");

        if (gun == Sabitler.ToplamaGun)
            return (
                "Dilek toplama kapandı",
                $"{ciftAdi}, davetli girişleri sona erdi. Defteriniz artık tamamlandı - "
                + $"indirmek için son {Sabitler.IndirmeGun} gününüz var. Sonrasında her şey silinir.");

        if (kalan <= 0)
            return (
                "BUGÜN SON GÜN",
                $"{ciftAdi}, defteriniz bugün kalıcı olarak silinecek. İndirmediyseniz, "
                + "bu son fırsatınız. Sonrasında hiçbir şekilde geri getirilemez.");

        return (
            kalan == 1 ? "Son 1 gün" : $"Son {kalan} gün",
            $"{ciftAdi}, defteriniz {kalan} gün sonra kalıcı olarak silinecek. "
            + "Eserinizi indirip güvenli bir yere kaydedin - yedekleyin. Geri dönüşü yok.");
    }
}
