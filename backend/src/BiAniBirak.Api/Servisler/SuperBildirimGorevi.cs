using BiAniBirak.Api.Data;
using BiAniBirak.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace BiAniBirak.Api.Servisler;

// SUPER BILDIRIM GOREVI (Bolum 4-D)
//
// Kaynaginda anlik bildirimi OLMAYAN super-admin olaylarini periyodik tarar ve
// BildirimKurallari'na gore bildirir. Su an iki ANLIK olay:
//   - Gecikmis imha : imha suresi gecmis defter duruyor (gunde bir kez).
//   - Sistem hatasi : son 3 saatte yeni yakalanmamis hata (3 saatte bir tavan).
//
// IDEMPOTENCY - EKSTRA TABLO YOK, PushGonderici'nin Tip'inden BAGIMSIZ:
//   HatirlatmaGorevi deseni. Bildirdikten sonra denetim_gunlukleri'ne bir "SUPER_BILDIRIM_*"
//   eylemi yazilir; tekrar bildirmeden once o eylem zaman penceresinde var mi diye bakilir.
//   (DiskGozcusu'nun Bildirim.Tip'e bakan yontemi guvenilir DEGIL - GonderAsync Tip'i
//   url'den turetir, ozel tipi ezer. Bu gorev o tuzaga dusmez.)
//
// SESSIZ SAAT (D4): anlik bildirimler sessiz saate TABIDIR (PushGonderici erteler).
// Yalniz hayati durumlar (disk acil) dinlemez; o DiskGozcusu'nda.
//
// Destek talebi bu gorevde ISLENMEZ: DestekUclari zaten olay aninda push atar; burada
// tekrar bildirmek cift bildirim olurdu.
public sealed class SuperBildirimGorevi : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<SuperBildirimGorevi> _log;

    private static readonly TimeSpan Aralik = TimeSpan.FromMinutes(30);
    private static readonly TimeSpan HataPenceresi = TimeSpan.FromHours(3);

    public SuperBildirimGorevi(IServiceScopeFactory scopeFactory, ILogger<SuperBildirimGorevi> log)
    {
        _scopeFactory = scopeFactory;
        _log = log;
    }

    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        await Task.Delay(TimeSpan.FromSeconds(120), ct); // acilista sistem otursun
        while (!ct.IsCancellationRequested)
        {
            try { await Calistir(ct); }
            catch (Exception ex) { _log.LogError(ex, "Super bildirim gorevi hatasi"); }
            try { await Task.Delay(Aralik, ct); }
            catch (TaskCanceledException) { break; }
        }
    }

    private async Task Calistir(CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<BiAniBirakDbContext>();
        var push = scope.ServiceProvider.GetRequiredService<PushGonderici>();

        var yoneticiler = await db.Kullanicilar.AsNoTracking()
            .Where(k => k.SuperAdmin && k.DeletedAt == null)
            .Select(k => k.Id)
            .ToListAsync(ct);
        if (yoneticiler.Count == 0) return; // kime bildirecegiz?

        await GecikmisImhaKontrol(db, push, yoneticiler, ct);
        await SistemHatasiKontrol(db, push, yoneticiler, ct);
    }

    // ---- GECIKMIS IMHA (gunde bir kez) ----
    private async Task GecikmisImhaKontrol(
        BiAniBirakDbContext db, PushGonderici push, List<Guid> yoneticiler, CancellationToken ct)
    {
        var simdi = DateTimeOffset.UtcNow;

        // EF-guvenli SABIT on filtre + bellekte kesin sayim (kolon-bagimli AddDays SQL'e
        // cevrilmez; Sabitler.ImhaAni tek kaynak - Katman-1 tabani dahil).
        var adaylar = await db.Etkinlikler.AsNoTracking()
            .Where(e => !e.ImhaEdildi && !e.SilindiMi
                        && (e.EtkinlikTarihi.AddDays(Sabitler.ToplamGun) <= simdi
                            || e.OzelSaklamaGun != null))
            .Select(e => new { e.EtkinlikTarihi, e.OzelSaklamaGun })
            .ToListAsync(ct);
        var gecikmis = adaylar.Count(e => Sabitler.ImhaAni(e.EtkinlikTarihi, e.OzelSaklamaGun) <= simdi);
        if (gecikmis == 0) return;

        // Gunde bir kez: bugun bu eylem yazildiysa sus.
        var eylem = BildirimKurallari.AuditEylem(BildirimKurallari.GecikmisImha);
        var gunBasi = new DateTimeOffset(simdi.UtcDateTime.Date, TimeSpan.Zero);
        if (await db.DenetimGunlukleri.AnyAsync(d => d.Eylem == eylem && d.CreatedAt >= gunBasi, ct))
            return;

        var baslik = $"Gecikmiş imha: {gecikmis} defter";
        var govde =
            $"{gecikmis} defter imha süresi geçtiği hâlde hâlâ duruyor. İmha görevi aksıyor "
            + "olabilir; Ölçüm sekmesinden \"Şimdi imha et\" ile temizleyebilirsiniz. "
            + "(Bekledikçe KVKK ve disk riski büyür.)";

        foreach (var yid in yoneticiler)
            await push.GonderAsync(
                yid, baslik, govde, BildirimKurallari.GecikmisImha.Url, null,
                sessizSaateTabi: BildirimKurallari.GecikmisImha.SessizSaatDinle, ct);

        await IzYaz(db, eylem, new { sayi = gecikmis }, ct);
        _log.LogWarning("Super bildirim: gecikmis imha {Sayi}", gecikmis);
    }

    // ---- SISTEM HATASI (3 saatte bir tavan) ----
    private async Task SistemHatasiKontrol(
        BiAniBirakDbContext db, PushGonderici push, List<Guid> yoneticiler, CancellationToken ct)
    {
        var simdi = DateTimeOffset.UtcNow;
        var pencereBasi = simdi - HataPenceresi;

        var yeniHata = await db.SistemHatalari.CountAsync(h => h.CreatedAt >= pencereBasi, ct);
        if (yeniHata == 0) return;

        // Uc saatte bir tavan: son 3 saatte bu eylem yazildiysa sus (rolling rate-limit).
        var eylem = BildirimKurallari.AuditEylem(BildirimKurallari.SistemHatasi);
        if (await db.DenetimGunlukleri.AnyAsync(d => d.Eylem == eylem && d.CreatedAt >= pencereBasi, ct))
            return;

        var baslik = yeniHata == 1 ? "1 yeni sistem hatası" : $"{yeniHata} yeni sistem hatası";
        var govde =
            $"Son 3 saatte {yeniHata} yakalanmamış hata oluştu. Hatalar sekmesinden zaman, uç ve "
            + "mesajıyla inceleyebilirsiniz.";

        foreach (var yid in yoneticiler)
            await push.GonderAsync(
                yid, baslik, govde, BildirimKurallari.SistemHatasi.Url, null,
                sessizSaateTabi: BildirimKurallari.SistemHatasi.SessizSaatDinle, ct);

        await IzYaz(db, eylem, new { sayi = yeniHata }, ct);
        _log.LogWarning("Super bildirim: sistem hatasi {Sayi} (son 3s)", yeniHata);
    }

    // Idempotency izi: append-only denetim kaydi. SistemEylemi=true (cift ekraninda gorunmez).
    private static async Task IzYaz(BiAniBirakDbContext db, string eylem, object gunluk, CancellationToken ct)
    {
        db.DenetimGunlukleri.Add(new DenetimGunlugu
        {
            Id = Guid.NewGuid(),
            EtkinlikId = null,
            KullaniciId = null,
            Eylem = eylem,
            Varlik = "sistem",
            VarlikId = null,
            DegisenAlanlar = System.Text.Json.JsonSerializer.Serialize(gunluk),
            SistemEylemi = true,
            CreatedAt = DateTimeOffset.UtcNow,
        });
        await db.SaveChangesAsync(ct);
    }
}
