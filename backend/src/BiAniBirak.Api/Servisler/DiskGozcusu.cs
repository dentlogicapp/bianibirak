using BiAniBirak.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace BiAniBirak.Api.Servisler;

// DISK GOZCUSU
//
// NEDEN: disk dolarsa sistem NAZIKCE yavaslamaz - SERT duser. Postgres yazamaz,
// fotograf yuklemeleri patlar, PDF uretimi basarisiz olur. Ustelik bu SESSIZ olur:
// davetli "gonder"e basar, hata alir, bir daha denemez - dilek sonsuza dek kaybolur.
// Sunucu saglayicisi (Hetzner) OTOMATIK YUKSELTMEZ; disk buyutme her zaman ELLE yapilir.
// Bu yuzden dolmadan ONCE haber vermek zorundayiz.
//
// NE OLCER: medya kok dizininin bagli oldugu diski (DepolamaServisi.Kok). Medya ileride
// ayri bir Volume'e tasinirsa gozcu otomatik dogru diski izler - ayar kopyalanmaz.
//
// ESIKLER (artan siddet): %75 uyari, %85 kritik, %92 acil.
// Gunde EN FAZLA BIR kez, ve yalniz esik ATLANDIGINDA bildirir (deterministik Id ile
// idempotent): "her 6 saatte bir ayni alarm" bildirim korlugu uretir, uyari deger
// kaybeder. Esik dustugunde (disk temizlendiginde) sonraki yukselis yeniden bildirilir.
public sealed class DiskGozcusu : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<DiskGozcusu> _log;
    private static readonly TimeSpan Aralik = TimeSpan.FromHours(6);

    // Esikler yuzde cinsinden KULLANIM orani.
    private const int EsikUyari = 75;
    private const int EsikKritik = 85;
    private const int EsikAcil = 92;

    public DiskGozcusu(IServiceScopeFactory scopeFactory, ILogger<DiskGozcusu> log)
    {
        _scopeFactory = scopeFactory;
        _log = log;
    }

    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        await Task.Delay(TimeSpan.FromSeconds(90), ct);
        while (!ct.IsCancellationRequested)
        {
            try { await Calistir(ct); }
            catch (Exception ex) { _log.LogError(ex, "Disk gozcusu hatasi"); }
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

        var olcum = DiskOlc(depo.Kok);
        if (olcum == null)
        {
            _log.LogWarning("Disk gozcusu: {Yol} icin disk bilgisi okunamadi", depo.Kok);
            return;
        }

        var (toplamBayt, bosBayt) = olcum.Value;
        var kullanilan = toplamBayt - bosBayt;
        var yuzde = (int)Math.Round(kullanilan * 100.0 / toplamBayt);

        _log.LogInformation(
            "Disk: %{Yuzde} kullanimda ({Kullanilan} / {Toplam}), bos {Bos}",
            yuzde, Insan(kullanilan), Insan(toplamBayt), Insan(bosBayt));

        var esik = yuzde >= EsikAcil ? EsikAcil
                 : yuzde >= EsikKritik ? EsikKritik
                 : yuzde >= EsikUyari ? EsikUyari
                 : 0;
        if (esik == 0) return; // saglikli - sessiz kal

        // Gunde bir kez, esik seviyesi basina. Tip alanina esik gomulur
        // ("disk_uyari_85"): ayni gun ayni seviye ikinci kez bildirilmez. Seviye
        // YUKSELIRSE yeni tip olusur ve HEMEN bildirilir - siddet artisi susturulmaz.
        var tip = $"disk_uyari_{esik}";
        var gunBasi = DateTimeOffset.UtcNow.Date;
        if (await db.Bildirimler.AnyAsync(b => b.Tip == tip && b.CreatedAt >= gunBasi, ct))
            return;

        var (baslik, govde) = Metin(esik, yuzde, bosBayt);

        // Yalniz super adminlere: bu bir ISLETME uyarisidir, ciftin sorunu degildir.
        var yoneticiler = await db.Kullanicilar.AsNoTracking()
            .Where(k => k.SuperAdmin && k.DeletedAt == null)
            .Select(k => k.Id)
            .ToListAsync(ct);
        if (yoneticiler.Count == 0)
        {
            _log.LogWarning("Disk uyarisi: super admin bulunamadi, bildirim gonderilemedi");
            return;
        }

        // GonderAsync uygulama-ici bildirimi DE olusturur - burada ayrica eklemeyiz,
        // yoksa her uyari cift gorunur.
        foreach (var yoneticiId in yoneticiler)
        {
            await push.GonderAsync(
                yoneticiId, baslik, govde, "/super-panel", null,
                // Acil esikte sessiz saat DINLENMEZ: disk dolarsa veri kaybi baslar,
                // sabahi beklemek kabul edilemez.
                sessizSaateTabi: esik < EsikAcil, ct);
        }

        _log.LogWarning("Disk uyarisi gonderildi: %{Yuzde} (esik %{Esik})", yuzde, esik);
    }

    private static (string baslik, string govde) Metin(int esik, int yuzde, long bosBayt)
    {
        var bos = Insan(bosBayt);
        if (esik >= EsikAcil)
            return ("Disk ACİL: %" + yuzde + " dolu",
                $"Sunucu diski %{yuzde} doldu, yalnızca {bos} boş alan kaldı. Bu seviyede " +
                "fotoğraf yüklemeleri ve defter üretimi HATA VERMEYE BAŞLAR. Hemen disk " +
                "genişletin ya da yer açın.");
        if (esik >= EsikKritik)
            return ("Disk kritik: %" + yuzde + " dolu",
                $"Sunucu diski %{yuzde} seviyesinde, {bos} boş alan kaldı. Yeni etkinlik " +
                "yükü bu alanı hızla tüketebilir. Disk genişletmeyi planlayın.");
        return ("Disk uyarısı: %" + yuzde + " dolu",
            $"Sunucu diski %{yuzde} seviyesine ulaştı, {bos} boş alan var. Şimdilik " +
            "sorun yok; büyüme hızını izleyin.");
    }

    // Medya yolunun bagli oldugu diski bul. Yol ayri bir mount ise (Volume) onu,
    // degilse kok dosya sistemini olcer - en UZUN eslesen mount noktasi dogrudur.
    private static (long toplam, long bos)? DiskOlc(string yol)
    {
        try
        {
            var tam = Path.GetFullPath(yol);
            DriveInfo? enIyi = null;
            foreach (var d in DriveInfo.GetDrives())
            {
                if (!d.IsReady) continue;
                if (!tam.StartsWith(d.RootDirectory.FullName, StringComparison.Ordinal)) continue;
                if (enIyi == null ||
                    d.RootDirectory.FullName.Length > enIyi.RootDirectory.FullName.Length)
                    enIyi = d;
            }
            if (enIyi == null) return null;
            return (enIyi.TotalSize, enIyi.AvailableFreeSpace);
        }
        catch { return null; }
    }

    private static string Insan(long bayt)
    {
        string[] birim = { "B", "KB", "MB", "GB", "TB" };
        double d = bayt;
        var i = 0;
        while (d >= 1024 && i < birim.Length - 1) { d /= 1024; i++; }
        return $"{Math.Round(d, 1)} {birim[i]}";
    }

}
