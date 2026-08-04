using BiAniBirak.Api.Data;
using BiAniBirak.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace BiAniBirak.Api.Servisler;

// SUPER BILDIRIM GOREVI (Bolum 4-D)
//
// Kaynaginda anlik bildirimi OLMAYAN super-admin olaylarini periyodik tarar ve
// BildirimKurallari'na gore bildirir. Iki ANLIK olay + gunluk ozet:
//   - Gecikmis imha : imha suresi gecmis defter duruyor (gunde bir kez).
//   - Sistem hatasi : son 3 saatte yeni yakalanmamis hata (3 saatte bir tavan).
//   - Gunluk ozet   : her admin kendi saatinde tek toplu bildirim.
//
// PER-ADMIN COZUMLEME (D3): olay degeri BIR KEZ hesaplanir (global); sonra HER admin
// icin BildirimKurallari.Coz ile kanali cozulur (tercih varsa o, yoksa varsayilan):
//   Anlik -> o admine anlik push | Ozet -> o adminin gunluk ozetine | Kapali -> gitmez.
// Boylece bir admin bir olayi sustursa/ozete atsa digerleri etkilenmez.
//
// IDEMPOTENCY - EKSTRA TABLO YOK, PushGonderici'nin Tip'inden BAGIMSIZ, ADMIN BASINA:
//   Bildirdikten sonra denetim_gunlukleri'ne "SUPER_BILDIRIM_*" eylemi + VarlikId=adminId
//   yazilir; tekrar bildirmeden once o admin icin o eylem penceresinde var mi diye bakilir.
//   (HatirlatmaGorevi/DiskGozcusu ile ayni audit-tabanli desen.)
//
// SESSIZ SAAT (D4): anlik bildirimler sessiz saate TABIDIR (PushGonderici erteler).
// Gunluk ozet DEGILDIR (sabit saatte gider). Destek bu gorevde ISLENMEZ (DestekUclari
// zaten olay aninda push atar - cift bildirim olmasin).
public sealed class SuperBildirimGorevi : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<SuperBildirimGorevi> _log;

    private static readonly TimeSpan Aralik = TimeSpan.FromMinutes(30);
    private static readonly TimeSpan HataPenceresi = TimeSpan.FromHours(3);
    private const int VarsayilanOzetSaatiTR = 9; // ayar yoksa TR 09:00

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

        // Tercih + ayar tablolarini bir kez yukle (per-admin cozumleme icin).
        var tercihSatirlari = await db.BildirimTercihleri.AsNoTracking().ToListAsync(ct);
        var tercihler = tercihSatirlari
            .ToDictionary(t => (t.KullaniciId, t.OlayKodu), t => t.Kanal);
        var ayarlar = (await db.BildirimAyarlari.AsNoTracking().ToListAsync(ct))
            .ToDictionary(a => a.KullaniciId, a => a.OzetSaati);

        await GecikmisImhaKontrol(db, push, yoneticiler, tercihler, ct);
        await SistemHatasiKontrol(db, push, yoneticiler, tercihler, ct);
        await GunlukOzetKontrol(db, push, yoneticiler, tercihler, ayarlar, ct);
    }

    // ---- GECIKMIS IMHA (gunde bir kez, admin basina) ----
    private async Task GecikmisImhaKontrol(
        BiAniBirakDbContext db, PushGonderici push, List<Guid> yoneticiler,
        Dictionary<(Guid, string), string> tercihler, CancellationToken ct)
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

        var baslik = $"Gecikmiş imha: {gecikmis} defter";
        var govde =
            $"{gecikmis} defter imha süresi geçtiği hâlde hâlâ duruyor. İmha görevi aksıyor "
            + "olabilir; Ölçüm sekmesinden \"Şimdi imha et\" ile temizleyebilirsiniz. "
            + "(Bekledikçe KVKK ve disk riski büyür.)";

        var gunBasi = new DateTimeOffset(simdi.UtcDateTime.Date, TimeSpan.Zero);
        await AnlikGonder(db, push, BildirimKurallari.GecikmisImha, yoneticiler, tercihler,
            baslik, govde, gunBasi, new { sayi = gecikmis }, ct);
    }

    // ---- SISTEM HATASI (3 saatte bir tavan, admin basina) ----
    private async Task SistemHatasiKontrol(
        BiAniBirakDbContext db, PushGonderici push, List<Guid> yoneticiler,
        Dictionary<(Guid, string), string> tercihler, CancellationToken ct)
    {
        var simdi = DateTimeOffset.UtcNow;
        var pencereBasi = simdi - HataPenceresi;

        var yeniHata = await db.SistemHatalari.CountAsync(h => h.CreatedAt >= pencereBasi, ct);
        if (yeniHata == 0) return;

        var baslik = yeniHata == 1 ? "1 yeni sistem hatası" : $"{yeniHata} yeni sistem hatası";
        var govde =
            $"Son 3 saatte {yeniHata} yakalanmamış hata oluştu. Hatalar sekmesinden zaman, uç ve "
            + "mesajıyla inceleyebilirsiniz.";

        await AnlikGonder(db, push, BildirimKurallari.SistemHatasi, yoneticiler, tercihler,
            baslik, govde, pencereBasi, new { sayi = yeniHata }, ct);
    }

    // ANLIK olay gonderim cekirdegi (per-admin). Kanali "anlik" cozulen her admine gonderir;
    // idempotency admin basina (audit VarlikId=adminId), pencere pencereBasi'ndan itibaren.
    private async Task AnlikGonder(
        BiAniBirakDbContext db, PushGonderici push, BildirimKurallari.Kural kural,
        List<Guid> yoneticiler, Dictionary<(Guid, string), string> tercihler,
        string baslik, string govde, DateTimeOffset pencereBasi, object gunluk, CancellationToken ct)
    {
        var eylem = BildirimKurallari.AuditEylem(kural);
        var gonderilen = 0;
        foreach (var yid in yoneticiler)
        {
            var kanal = BildirimKurallari.Coz(kural, Tercih(tercihler, yid, kural.Kod));
            if (kanal != BildirimKurallari.Kanal.Anlik) continue; // ozet -> digest; kapali -> atla

            if (await db.DenetimGunlukleri.AnyAsync(
                    d => d.Eylem == eylem && d.VarlikId == yid && d.CreatedAt >= pencereBasi, ct))
                continue; // bu admin icin bu pencerede zaten bildirildi

            await push.GonderAsync(yid, baslik, govde, kural.Url, null,
                sessizSaateTabi: kural.SessizSaatDinle, ct);
            await IzYaz(db, eylem, yid, gunluk, ct);
            gonderilen++;
        }
        if (gonderilen > 0)
            _log.LogWarning("Super bildirim: {Kod} -> {Sayi} admine", kural.Kod, gonderilen);
    }

    // ---- GUNLUK OZET (her admin kendi saatinde, kendi tercihleriyle) ----
    // Tek bildirimde toplulastirir; kaynak GunlukOzetHesabi (mail FAZ 4 sonrasi ayni hesabi kullanir).
    private async Task GunlukOzetKontrol(
        BiAniBirakDbContext db, PushGonderici push, List<Guid> yoneticiler,
        Dictionary<(Guid, string), string> tercihler, Dictionary<Guid, int> ayarlar,
        CancellationToken ct)
    {
        var simdi = DateTimeOffset.UtcNow;
        var trSaat = simdi.UtcDateTime.AddHours(3).Hour; // TR = UTC+3
        var gunBasi = new DateTimeOffset(simdi.UtcDateTime.Date, TimeSpan.Zero);
        var eylem = BildirimKurallari.AuditEylem(BildirimKurallari.GunlukOzet);

        GunlukOzet? ozet = null; // yalniz gonderilecek admin varsa hesapla

        foreach (var yid in yoneticiler)
        {
            var ozetSaati = ayarlar.TryGetValue(yid, out var s) ? s : VarsayilanOzetSaatiTR;
            if (trSaat < ozetSaati) continue; // bu adminin ozet saati gelmedi

            if (await db.DenetimGunlukleri.AnyAsync(
                    d => d.Eylem == eylem && d.VarlikId == yid && d.CreatedAt >= gunBasi, ct))
                continue; // bugun bu admine gonderildi

            ozet ??= await GunlukOzetHesabi.HesaplaAsync(db, ct);

            // Bu adminin ozetine hangi olaylar girer: "ozet"e cozulenler + bekleyen destek
            // (bilgi). Bir olayi "anlik" secen admin onu anlik alir, ozette TEKRAR gormez;
            // "kapali" secen hic gormez.
            var dahil = new HashSet<string> { "bekleyen_destek" };
            if (BildirimKurallari.Coz(BildirimKurallari.BekleyenOdeme, Tercih(tercihler, yid, BildirimKurallari.BekleyenOdeme.Kod)) == BildirimKurallari.Kanal.Ozet)
                dahil.Add(BildirimKurallari.BekleyenOdeme.Kod);
            if (BildirimKurallari.Coz(BildirimKurallari.BekleyenKvkk, Tercih(tercihler, yid, BildirimKurallari.BekleyenKvkk.Kod)) == BildirimKurallari.Kanal.Ozet)
                dahil.Add(BildirimKurallari.BekleyenKvkk.Kod);
            if (BildirimKurallari.Coz(BildirimKurallari.GecikmisImha, Tercih(tercihler, yid, BildirimKurallari.GecikmisImha.Kod)) == BildirimKurallari.Kanal.Ozet)
                dahil.Add(BildirimKurallari.GecikmisImha.Kod);
            if (BildirimKurallari.Coz(BildirimKurallari.SistemHatasi, Tercih(tercihler, yid, BildirimKurallari.SistemHatasi.Kod)) == BildirimKurallari.Kanal.Ozet)
                dahil.Add(BildirimKurallari.SistemHatasi.Kod);

            var (baslik, govde) = GunlukOzetHesabi.Metin(ozet, dahil);

            await push.GonderAsync(yid, baslik, govde, BildirimKurallari.GunlukOzet.Url, null,
                sessizSaateTabi: BildirimKurallari.GunlukOzet.SessizSaatDinle, ct);
            await IzYaz(db, eylem, yid, new { ozet.BekleyenToplam }, ct);
            _log.LogInformation("Super bildirim: gunluk ozet -> admin (bekleyen {Toplam})", ozet.BekleyenToplam);
        }
    }

    private static string? Tercih(Dictionary<(Guid, string), string> tercihler, Guid yid, string kod)
        => tercihler.TryGetValue((yid, kod), out var v) ? v : null;

    // Idempotency izi: append-only denetim kaydi. VarlikId=adminId (per-admin idempotency).
    // SistemEylemi=true (cift ekraninda gorunmez).
    private static async Task IzYaz(
        BiAniBirakDbContext db, string eylem, Guid varlikId, object gunluk, CancellationToken ct)
    {
        db.DenetimGunlukleri.Add(new DenetimGunlugu
        {
            Id = Guid.NewGuid(),
            EtkinlikId = null,
            KullaniciId = null,
            Eylem = eylem,
            Varlik = "sistem",
            VarlikId = varlikId,
            DegisenAlanlar = System.Text.Json.JsonSerializer.Serialize(gunluk),
            SistemEylemi = true,
            CreatedAt = DateTimeOffset.UtcNow,
        });
        await db.SaveChangesAsync(ct);
    }
}
