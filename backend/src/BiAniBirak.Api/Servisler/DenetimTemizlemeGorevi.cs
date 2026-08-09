using BiAniBirak.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace BiAniBirak.Api.Servisler;

// DENETIM GUNLUGU SAKLAMA GOREVI - KATMANLI SAKLAMA
//
// ================== NEDEN ==================
//
// denetim_gunlukleri suresiz buyuyordu. Iki ayri gerceklik var:
//
//   RUTIN GURULTU  : "push gonderildi", "dilek birakildi", "ayar guncellendi"...
//                    Sayica %95'i bunlar. Seffaflik icin degerlidirler ama HUKUKI
//                    agirliklari yoktur; 30 gun sonrasi kimseye lazim degildir.
//
//   HUKUKI IZ      : silme / kalici silme / imha / odeme / onam / yetki degisikligi...
//                    Kalici silme onay penceresi kullaniciya ACIKCA soz veriyor:
//                    "Denetim kayitlari adli iz olarak korunur." 30 gunde silmek
//                    bu sozu cignerdi. Bunlar 2 YIL saklanir (Musa karari).
//
// ================== NEDEN KARA LISTE (beyaz liste DEGIL) ==================
//
// "Sadece sunlari sakla" (beyaz liste) kurulsaydi, listede OLMAYAN her eylem -
// bugun gozden kacan ve YARIN EKLENECEK her yeni eylem - 30 gun sonra sessizce
// silinirdi. Nitekim envanter taramasi eylem adini DEGISKENLE yazan yerleri
// (SUPER_BILDIRIM_*, DISK_UYARI_*, DESTEK_KAPATILDI, SuperUclari.Denetim(...)
// yardimcisiyla gecilen tum eylemler) hic gostermemisti.
//
// Bu yuzden mantik TERSTIR: yalnizca ACIKCA "rutin" diye isaretlenenler 30 gunde
// silinir; GERI KALAN HER SEY 2 yil saklanir. Hata yonu guvenli tarafa cevrildi -
// yanlislikla FAZLA saklariz, asla eksik saklamayiz. (Ayni ilke senkronYayinla'da
// da var: bilinmeyen yol -> tum alanlari yayinla.)
//
// ================== GOREV DISIPLINI ==================
//
//  - Gunde bir calisir; idempotent (ayni kaydi iki kez silmek zaten anlamsiz).
//  - Kendi islemini DENETIME YAZMAZ: yazsaydi temizleyici kendi kuyrugunu besler,
//    her tur yeni kayit uretirdi. Sayilar loga yazilir - iz oradadir.
//  - Gorev idempotency kayitlari (SUPER_BILDIRIM_*, DISK_UYARI_*, INDIRME_HATIRLATMASI)
//    rutin kovadadir; pencereleri saat/gun olceginde oldugu icin 30 gun fazlasiyla
//    guvenlidir - hicbir gorev "bildirdim mi?" bilgisini kaybetmez.
public sealed class DenetimTemizlemeGorevi : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<DenetimTemizlemeGorevi> _log;

    private static readonly TimeSpan Aralik = TimeSpan.FromHours(24);

    // RUTIN (30 gun) - tam eslesen eylemler. Buraya YALNIZCA hukuki agirligi
    // olmayan, tekrar eden, hacmi ureten olaylar eklenir. Supheye dusuldugunde
    // EKLENMEZ: eklenmeyen kayit 2 yil yasar, yanlis eklenen kayit 30 gunde yok olur.
    private static readonly string[] RutinEylemler =
    {
        "PUSH_GONDERILDI",          // bildirim gonderimi - operasyonel
        "INDIRME_HATIRLATMASI",     // hatirlatma takvimi izi
        "KATKI_BIRAKILDI",          // dilek geldi (icerigin kendisi katkilar tablosunda)
        "AYAR_GUNCELLENDI",         // gorunum/metin ayari
        "ETKINLIK_GUNCELLENDI",     // ad/tarih duzenlemesi
        "PROFIL_GUNCELLENDI",       // kullanici kendi adi/cinsiyeti
        "GORSEL_EKLENDI",
        "GORSEL_KALDIRILDI",
    };

    // RUTIN (30 gun) - onek eslesmesi. Gorev/bildirim idempotency izleri.
    private static readonly string[] RutinOnekler =
    {
        "SUPER_BILDIRIM_",  // super yonetici bildirim idempotency
        "DISK_UYARI_",      // disk esik idempotency
    };

    public DenetimTemizlemeGorevi(IServiceScopeFactory scopeFactory, ILogger<DenetimTemizlemeGorevi> log)
    {
        _scopeFactory = scopeFactory;
        _log = log;
    }

    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        await Task.Delay(TimeSpan.FromSeconds(180), ct); // acilista sistem otursun
        while (!ct.IsCancellationRequested)
        {
            try { await Calistir(ct); }
            catch (Exception ex) { _log.LogError(ex, "Denetim temizleme gorevi hatasi"); }
            try { await Task.Delay(Aralik, ct); }
            catch (TaskCanceledException) { break; }
        }
    }

    private async Task Calistir(CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<BiAniBirakDbContext>();

        var simdi = DateTimeOffset.UtcNow;
        var rutinEsik = simdi.AddDays(-Sabitler.DenetimRutinGun);
        var kaliciEsik = simdi.AddDays(-Sabitler.DenetimKaliciGun);

        // 1) RUTIN GURULTU - 30 gunden eski.
        var rutinSilinen = await db.DenetimGunlukleri
            .Where(d => d.CreatedAt < rutinEsik
                        && (RutinEylemler.Contains(d.Eylem)
                            || RutinOnekler.Any(o => d.Eylem.StartsWith(o))))
            .ExecuteDeleteAsync(ct);

        // 2) UST SINIR - 2 yildan eski HER KAYIT. KVKK "belirli sure" ister; tablo
        // sinirsiz buyuyemez. Hukuki iz de sonsuz degildir, sure sinirlidir.
        var kaliciSilinen = await db.DenetimGunlukleri
            .Where(d => d.CreatedAt < kaliciEsik)
            .ExecuteDeleteAsync(ct);

        if (rutinSilinen > 0 || kaliciSilinen > 0)
        {
            _log.LogInformation(
                "Denetim temizligi: {Rutin} rutin ({RutinGun} gun+), {Kalici} sure asimi ({KaliciGun} gun+)",
                rutinSilinen, Sabitler.DenetimRutinGun, kaliciSilinen, Sabitler.DenetimKaliciGun);
        }
    }
}
