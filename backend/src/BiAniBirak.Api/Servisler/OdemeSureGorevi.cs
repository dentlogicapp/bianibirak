using BiAniBirak.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace BiAniBirak.Api.Servisler;

// ODEME SURE GOREVI - "bekleyen odeme sonsuza kadar bekleyemez".
//
// PROBLEM:
// Cift odeme talimatini aldi, referans kodunu gordu... ve havaleyi yapmadi. Fikir
// degistirdi, unuttu, ya da hic niyeti yoktu.
//
// O kayit "bekliyor" olarak DURUR. Sonuclari:
//   1. Super panelde olu kayitlar birikir - Musa gercek bekleyenleri goremez hale gelir
//   2. Cift 3 ay sonra geri gelip ESKI FIYATLA odemeye kalkar (talimat ekraninda
//      duruyor cunku) - tutar tutmaz, odeme askida kalir
//   3. BaslatAsync "bekleyen var" der ve YENI kod uretmez - cift guncel fiyati goremez
//
// COZUM: SonGecerlilik gecen bekleyen odemeler "suresi_doldu"ya cekilir. Cift tekrar
// odemek isterse YENI kod ve GUNCEL fiyatla baslar.
//
// IDEMPOTENT: her calistiginda ayni sonucu verir. Zaten "suresi_doldu" olanlara
// dokunmaz, "onaylandi" olanlara ASLA dokunmaz.
//
// SAATLIK: bu is aceleci degil. Bir odeme 7 gun 3 saat bekledi diye kimse zarar gormez.
public sealed class OdemeSureGorevi : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<OdemeSureGorevi> _log;

    private static readonly TimeSpan Aralik = TimeSpan.FromHours(1);

    public OdemeSureGorevi(IServiceScopeFactory scopeFactory, ILogger<OdemeSureGorevi> log)
    {
        _scopeFactory = scopeFactory;
        _log = log;
    }

    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        // Acilista 2 dk bekle - migration ve seed bitsin.
        try { await Task.Delay(TimeSpan.FromMinutes(2), ct); }
        catch (OperationCanceledException) { return; }

        while (!ct.IsCancellationRequested)
        {
            try
            {
                await CalistirAsync(ct);
            }
            catch (OperationCanceledException) { return; }
            catch (Exception ex)
            {
                // Yut ve devam et - bu gorev cokerse odemeler durur, urun durmaz.
                _log.LogError(ex, "OdemeSureGorevi hata");
            }

            try { await Task.Delay(Aralik, ct); }
            catch (OperationCanceledException) { return; }
        }
    }

    private async Task CalistirAsync(CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<BiAniBirakDbContext>();

        var simdi = DateTimeOffset.UtcNow;

        var dolanlar = await db.Odemeler
            .Where(o => o.Durum == OdemeServisi.DurumBekliyor && o.SonGecerlilik <= simdi)
            .ToListAsync(ct);

        if (dolanlar.Count == 0) return;

        foreach (var o in dolanlar)
        {
            o.Durum = OdemeServisi.DurumSuresiDoldu;
            o.UpdatedAt = simdi;
        }

        // DENETIM YAZILMAZ - ve bu bilincli.
        //
        // "Odemeniz suresi doldu" satiri, ciftin denetim gunlugune bir BASARISIZLIK
        // izi birakir. Oysa cift bir sey yapmadi; sadece odemedi. Bu bir olay degil,
        // bir OLAYSIZLIK.
        //
        // Ustelik cift tekrar odemek isterse yeni kod alacak ve her sey normale
        // donecek. Gunluge "denedin ve olmadi" diye yazmak, gereksiz bir utanctir.
        //
        // Kayit zaten odemeler tablosunda duruyor - super panel gorur, denetlenebilir.
        await db.SaveChangesAsync(ct);

        _log.LogInformation("OdemeSureGorevi: {Sayi} bekleyen odemenin suresi doldu",
            dolanlar.Count);
    }
}
