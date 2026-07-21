using BiAniBirak.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace BiAniBirak.Api.Servisler;

// DEFTER KALICI SİLME - TEK ZİNCİR, ÜÇ ÇAĞIRAN.
//
// Bir defter dört ayrı yoldan kalıcı olarak silinebilir:
//   1. Çift kendi çöp kutusundan siler
//   2. Süper yönetici çöp sekmesinden siler
//   3. Çöpte 5 günü dolar (CopTemizlemeGorevi)
//   4. Özel günden 20 gün geçer (ImhaGorevi - o kendi akışını yürütür)
//
// Bu dört yolun HEPSİ aynı zincirden geçmek zorundadır. Ayrı ayrı yazılsalardı
// kaçınılmaz olarak ayrışırlardı: birine yeni bir tablo eklenir, diğerine unutulur
// ve arkada öksüz satırlar birikirdi. Nitekim daha önce tam olarak bu oldu -
// silme zincirine üç tablo eklenmemişti ve kalıcı silme 500 veriyordu.
//
// KURAL: etkinliğe bağlı YENİ bir tablo eklendiğinde YALNIZCA burası güncellenir.
//
// ÇÖPTEKİ DİLEKLER DE GİDER: defter yok olduğunda, ondan önce reddedilip çöpte
// bekleyen dilekler de aynı işlemde silinir. Yetim çöp diye bir şey oluşamaz -
// ayrı bir temizleyici beklemez; defterin silinmesi hepsini götürür.
public static class DefterImha
{
    public static async Task KaliciSilAsync(
        BiAniBirakDbContext db, DepolamaServisi depo, Guid id, CancellationToken ct = default)
    {
        // Çocuktan ebeveyne doğru. Sıra bozulursa yabancı anahtar ihlali olur.
        var katkiIdler = await db.Katkilar
            .Where(k => k.EtkinlikId == id).Select(k => k.Id).ToListAsync(ct);

        db.KatkiMedyalari.RemoveRange(db.KatkiMedyalari.Where(m => katkiIdler.Contains(m.KatkiId)));
        // SilindiMi ayrımı YOK: çöpte bekleyenler dahil TÜM dilekler gider.
        db.Katkilar.RemoveRange(db.Katkilar.Where(k => k.EtkinlikId == id));
        db.PaylasimBaglantilari.RemoveRange(db.PaylasimBaglantilari.Where(p => p.EtkinlikId == id));

        var kurasyonIdler = await db.Kurasyonlar
            .Where(k => k.EtkinlikId == id).Select(k => k.Id).ToListAsync(ct);
        db.KurasyonCiktilari.RemoveRange(db.KurasyonCiktilari.Where(c => kurasyonIdler.Contains(c.KurasyonId)));
        db.KurasyonOgeleri.RemoveRange(db.KurasyonOgeleri.Where(o => kurasyonIdler.Contains(o.KurasyonId)));
        db.Kurasyonlar.RemoveRange(db.Kurasyonlar.Where(k => k.EtkinlikId == id));

        db.EtkinlikGorselleri.RemoveRange(db.EtkinlikGorselleri.Where(g => g.EtkinlikId == id));
        db.DavetiyeOnizlemeleri.RemoveRange(db.DavetiyeOnizlemeleri.Where(d => d.EtkinlikId == id));
        db.Odemeler.RemoveRange(db.Odemeler.Where(o => o.EtkinlikId == id));
        db.EtkinlikAyarlari.RemoveRange(db.EtkinlikAyarlari.Where(a => a.EtkinlikId == id));
        db.UyeDavetleri.RemoveRange(db.UyeDavetleri.Where(d => d.EtkinlikId == id));
        db.EtkinlikUyelikleri.RemoveRange(db.EtkinlikUyelikleri.Where(u => u.EtkinlikId == id));
        db.Bildirimler.RemoveRange(db.Bildirimler.Where(b => b.EtkinlikId == id));
        db.ErtelenenBildirimler.RemoveRange(db.ErtelenenBildirimler.Where(b => b.EtkinlikId == id));

        // DENETIM IZI KALIR - adli kanit. Yalnizca etkinlik bagi kopar.
        // Kayitlar kisisel veri icermez; "bir defter vardi ve su tarihte silindi"
        // bilgisi hukuki olarak saklanmak zorundadir.
        var denetimler = await db.DenetimGunlukleri
            .Where(d => d.EtkinlikId == id).ToListAsync(ct);
        foreach (var d in denetimler) d.EtkinlikId = null;

        db.Etkinlikler.RemoveRange(db.Etkinlikler.Where(e => e.Id == id));

        await db.SaveChangesAsync(ct);

        // DOSYALAR EN SON: veritabanı geri alınabilir, silinen dosya alınamaz.
        // Commit başarılıysa artık dönüş yok - diski de temizle.
        depo.EtkinligiSil(id);
    }
}
