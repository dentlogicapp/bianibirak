using BiAniBirak.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace BiAniBirak.Api.Servisler;

// DESTEK TEMIZLEME GOREVI
//
// IKI IS YAPAR:
//
// 1) KALICI SILME (24 saat) - "cozuldu" isaretlenen konusma, kapanmasindan 24 saat
//    sonra mesajlariyla birlikte TAMAMEN silinir. Arsiv YOKTUR - bu bilincli bir
//    urun durusudur: "biz saklamiyoruz" sozu destek yazismalari icin de gecerlidir.
//    24 saat, yanlislikla kapatmayi fark edip geri almak icin makul bir penceredir.
//
// 2) OTOMATIK KAPANMA (7 gun) - yonetici yanit vermis ama kullanici bir daha
//    yazmamissa, konusma 7 gun sonra kendiliginden cozuldu sayilir. Neden gerekli:
//    aksi halde liste, aslinda bitmis ama kimsenin kapatmadigi konusmalarla dolar ve
//    "hangisi beni bekliyor?" sorusu cevapsiz kalir. Kapanan konusma yine 24 saatlik
//    geri alma penceresine girer - kullanici o sirada yazarsa YENI konusma acilir.
//
// SIRALAMA: once otomatik kapanma, sonra silme. Boylece ayni turda kapanan bir
// konusma hemen silinmez; 24 saatlik penceresi tam olarak isler.
public sealed class DestekTemizlemeGorevi : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<DestekTemizlemeGorevi> _log;
    private static readonly TimeSpan Aralik = TimeSpan.FromHours(1);

    // Kapanistan sonra kalici silmeye kadar gecen sure.
    public const int SilmeSaat = 24;

    // "yanitlandi" durumunda hareketsiz kalinca otomatik kapanma suresi.
    private const int OtomatikKapanmaGun = 7;

    public DestekTemizlemeGorevi(IServiceScopeFactory scopeFactory, ILogger<DestekTemizlemeGorevi> log)
    {
        _scopeFactory = scopeFactory;
        _log = log;
    }

    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        await Task.Delay(TimeSpan.FromSeconds(120), ct);
        while (!ct.IsCancellationRequested)
        {
            try { await Calistir(ct); }
            catch (Exception ex) { _log.LogError(ex, "Destek temizleme gorevi hatasi"); }
            try { await Task.Delay(Aralik, ct); }
            catch (TaskCanceledException) { break; }
        }
    }

    private async Task Calistir(CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<BiAniBirakDbContext>();

        var simdi = DateTimeOffset.UtcNow;

        // ---- 1) OTOMATIK KAPANMA ----
        var sessizlikEsigi = simdi.AddDays(-OtomatikKapanmaGun);
        var otomatikKapanacak = await db.DestekTalepleri
            .Where(t => t.Durum == "yanitlandi" && t.SonMesajZamani < sessizlikEsigi)
            .ToListAsync(ct);

        foreach (var t in otomatikKapanacak)
        {
            t.Durum = "kapali";
            t.KapanmaZamani = simdi;
            t.UpdatedAt = simdi;

            db.DenetimGunlukleri.Add(new Entities.DenetimGunlugu
            {
                Id = Guid.NewGuid(),
                EtkinlikId = t.EtkinlikId,
                KullaniciId = null,
                Eylem = "DESTEK_OTOMATIK_KAPANDI",
                Varlik = "destek_talepleri",
                VarlikId = t.Id,
                DegisenAlanlar = System.Text.Json.JsonSerializer.Serialize(
                    new { sessiz_gun = OtomatikKapanmaGun }),
                SistemEylemi = true,
                CreatedAt = simdi,
            });
        }
        if (otomatikKapanacak.Count > 0)
        {
            await db.SaveChangesAsync(ct);
            _log.LogInformation("Destek: {Sayi} konusma otomatik kapandi", otomatikKapanacak.Count);
        }

        // ---- 2) KALICI SILME ----
        var silmeEsigi = simdi.AddHours(-SilmeSaat);
        var silinecekler = await db.DestekTalepleri
            .Where(t => t.Durum == "kapali" && t.KapanmaZamani != null && t.KapanmaZamani < silmeEsigi)
            .Select(t => t.Id)
            .ToListAsync(ct);

        if (silinecekler.Count == 0) return;

        // Mesajlar ONCE (yabanci anahtar), sonra talepler. Cascade tanimli olsa da
        // sirayi acikca yazmak, ileride cascade kaldirilirsa sessizce bozulmayi onler.
        await db.DestekMesajlari.Where(m => silinecekler.Contains(m.TalepId)).ExecuteDeleteAsync(ct);
        await db.DestekTalepleri.Where(t => silinecekler.Contains(t.Id)).ExecuteDeleteAsync(ct);

        // Denetim izi KALIR - kisisel veri icermez, yalnizca "silindi" gercegi.
        foreach (var id in silinecekler)
        {
            db.DenetimGunlukleri.Add(new Entities.DenetimGunlugu
            {
                Id = Guid.NewGuid(),
                EtkinlikId = null,
                KullaniciId = null,
                Eylem = "DESTEK_KALICI_SILINDI",
                Varlik = "destek_talepleri",
                VarlikId = id,
                DegisenAlanlar = System.Text.Json.JsonSerializer.Serialize(new { saat = SilmeSaat }),
                SistemEylemi = true,
                CreatedAt = simdi,
            });
        }
        await db.SaveChangesAsync(ct);

        _log.LogInformation("Destek: {Sayi} konusma kalici silindi", silinecekler.Count);
    }
}
