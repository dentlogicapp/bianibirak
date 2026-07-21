using BiAniBirak.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace BiAniBirak.Api.Servisler;

// COP TEMIZLEME GOREVI
//
// Cop kutusundaki (SilindiMi && Durum="red") dilekler, cope atilmadan (SilinmeZamani)
// 30 gun sonra OTOMATIK kalici silinir (satir + medya + dosya). Ayrica silinmeye 3 gun
// kala esine (KaynakEs sahibine) tek seferlik uyari bildirimi gonderilir.
//
// Yeni kolon gerekmez: sayac = SilinmeZamani (Notlar CopKutusuTemizleyici deseni).
// Idempotent uyari: deterministik Bildirim Id (katkiId'den turetilir) -> ayni uyari
// iki kez olusmaz.
public sealed class CopTemizlemeGorevi : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<CopTemizlemeGorevi> _log;
    private static readonly TimeSpan Aralik = TimeSpan.FromHours(6);
    private const int CopGun = Sabitler.CopDilekGun;
    private const int UyariGun = 3; // silinmeye 3 gun kala haber ver

    public CopTemizlemeGorevi(IServiceScopeFactory scopeFactory, ILogger<CopTemizlemeGorevi> log)
    {
        _scopeFactory = scopeFactory;
        _log = log;
    }

    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        await Task.Delay(TimeSpan.FromSeconds(45), ct);
        while (!ct.IsCancellationRequested)
        {
            try { await Calistir(ct); }
            catch (Exception ex) { _log.LogError(ex, "Cop temizleme gorevi hatasi"); }
            try { await Task.Delay(Aralik, ct); }
            catch (TaskCanceledException) { break; }
        }
    }

    private async Task Calistir(CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<BiAniBirakDbContext>();
        var depo = scope.ServiceProvider.GetRequiredService<DepolamaServisi>();
        var push = scope.ServiceProvider.GetRequiredService<PushGonderici>();

        var simdi = DateTimeOffset.UtcNow;
        var silmeEsigi = simdi.AddDays(-CopGun);
        var uyariEsigi = simdi.AddDays(-(CopGun - UyariGun)); // 27 gun once cope atilanlar (3 gun kala)

        // 1) SURESI DOLANLARI KALICI SIL (Notlar CopKutusuTemizleyici deseni)
        //    Ciftin cop kutusu = SilindiMi && Durum="red". Sayac = SilinmeZamani.
        var dolanlar = await db.Katkilar
            .Where(k => k.SilindiMi && k.Durum == "red"
                        && k.SilinmeZamani != null && k.SilinmeZamani < silmeEsigi)
            .ToListAsync(ct);

        foreach (var katki in dolanlar)
        {
            var medyalar = await db.KatkiMedyalari.Where(m => m.KatkiId == katki.Id).ToListAsync(ct);
            var anahtarlar = medyalar.Select(m => m.StorageKey).Where(a => !string.IsNullOrEmpty(a)).ToList();
            if (!string.IsNullOrEmpty(katki.FotoAnahtari)) anahtarlar.Add(katki.FotoAnahtari!);

            db.KatkiMedyalari.RemoveRange(medyalar);
            db.Katkilar.Remove(katki);
            db.DenetimGunlukleri.Add(new Entities.DenetimGunlugu
            {
                Id = Guid.NewGuid(),
                EtkinlikId = katki.EtkinlikId,
                KullaniciId = null,
                Eylem = "KATKI_COP_OTOMATIK_SILINDI",
                Varlik = "katkilar",
                VarlikId = katki.Id,
                DegisenAlanlar = System.Text.Json.JsonSerializer.Serialize(new { kaynak_es = katki.KaynakEs }),
                SistemEylemi = true, // sistem eylemi - ciftin denetiminde ayrica gosterilmez
                CreatedAt = simdi,
            });
            await db.SaveChangesAsync(ct);

            foreach (var a in anahtarlar) depo.Sil(a);
            _log.LogInformation("Cop: katki {Id} otomatik kalici silindi", katki.Id);
        }

        // 2) SILINMEYE 3 GUN KALA UYARI (idempotent - deterministik Bildirim Id)
        var uyarilacaklar = await db.Katkilar.AsNoTracking()
            .Where(k => k.SilindiMi && k.Durum == "red" && k.SilinmeZamani != null
                        && k.SilinmeZamani < uyariEsigi && k.SilinmeZamani >= silmeEsigi)
            .ToListAsync(ct);

        foreach (var katki in uyarilacaklar)
        {
            // KaynakEs sahibini bul (uyari ona gider - izolasyon)
            var uye = await db.EtkinlikUyelikleri.AsNoTracking()
                .FirstOrDefaultAsync(u => u.EtkinlikId == katki.EtkinlikId && u.Rol == katki.KaynakEs, ct);
            if (uye == null) continue;

            // Deterministik Id: ayni katki icin uyari iki kez olusmaz
            var uyariId = DeterministikId(katki.Id, "cop-uyari");
            var zatenVar = await db.Bildirimler.AnyAsync(b => b.Id == uyariId, ct);
            if (zatenVar) continue;

            db.Bildirimler.Add(new Entities.Bildirim
            {
                Id = uyariId,
                KullaniciId = uye.KullaniciId,
                EtkinlikId = katki.EtkinlikId,
                Tip = "cop_uyari",
                Baslik = "Cop kutunuzdaki bir dilek yakinda silinecek",
                Mesaj = $"{katki.DavetliAd} tarafindan birakilan reddedilmis bir dilek birkac gun icinde kalici olarak silinecek. Geri almak icin cop kutunuza bakin.",
                Url = "/cop-kutusu",
                OkunduMu = false,
                CreatedAt = simdi,
            });
            await db.SaveChangesAsync(ct);
        }
    
        // ---- SILINEN DEFTERLER (5 gun) ----
        //
        // Cift ya da super yonetici tarafindan cope tasinan defter, 5 gun sonra
        // KALICI silinir. Uyari bildirimi GONDERILMEZ: defter bilincli bir kararla
        // cope atilmistir; "kurtar sunu" cagrisi yapmak kullaniciyi rahatsiz eder.
        // (20 gunluk otomatik imha uyarilari bundan ayridir - onlar sistemin takvimi.)
        var defterEsigi = simdi.AddDays(-Sabitler.CopDefterGun);
        var silinecekDefterler = await db.Etkinlikler.AsNoTracking()
            .Where(e => e.SilindiMi && !e.ImhaEdildi
                        && e.SilinmeZamani != null && e.SilinmeZamani < defterEsigi)
            .Select(e => e.Id)
            .ToListAsync(ct);

        foreach (var defterId in silinecekDefterler)
        {
            db.DenetimGunlukleri.Add(new Entities.DenetimGunlugu
            {
                Id = Guid.NewGuid(),
                EtkinlikId = null,
                KullaniciId = null,
                Eylem = "ETKINLIK_COPTEN_KALICI_SILINDI",
                Varlik = "etkinlikler",
                VarlikId = defterId,
                DegisenAlanlar = System.Text.Json.JsonSerializer.Serialize(
                    new { gun = Sabitler.CopDefterGun }),
                SistemEylemi = true,
                CreatedAt = simdi,
            });
            await db.SaveChangesAsync(ct);

            // TEK ZINCIR - copteki dilekler dahil her sey ayni islemde gider.
            await DefterImha.KaliciSilAsync(db, depo, defterId, ct);
        }

        if (silinecekDefterler.Count > 0)
            _log.LogInformation("Cop: {Sayi} defter kalici silindi", silinecekDefterler.Count);
}

    // katkiId + ek'ten deterministik GUID (idempotent bildirim).
    private static Guid DeterministikId(Guid katkiId, string ek)
    {
        var girdi = System.Text.Encoding.UTF8.GetBytes(katkiId.ToString() + "|" + ek);
        var hash = System.Security.Cryptography.MD5.HashData(girdi);
        return new Guid(hash);
    }
}
