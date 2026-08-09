using BiAniBirak.Api.Data;
using BiAniBirak.Api.Entities;
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
        // BILDIRIMLER SESSIZCE KAYBOLMAZ - OZETLENIR.
        //
        // CANLIDA YAKALANDI: defter kalici silinince o deftere ait TUM bildirimler
        // iz birakmadan yok oluyordu. Kullanici, dun elinde duran bir bildirimi bugun
        // bulamiyor ve "uygulama mi sildi, ben mi yanlis hatirliyorum?" diye dusunuyordu.
        // Sessiz kayboluş, guveni en hizli yikan seydir.
        //
        // COZUM (ImhaGorevi ile AYNI desen - paralel yapi kurulmadi): eski bildirimler
        // silinir, yerine alici basina TEK OZET birakilir. Neden ozet:
        //   - KVKK: eski metinler davetli adi tasiyabilir; defter imha edildiyse o
        //     metinler de yasamamalidir. Kayit kalir, ICERIK gider.
        //   - Gurultu: 10 bildirimi olan defter icin 10 ozdes satir birakmak,
        //     seffaflik degil kalabaliktir.
        //   - EtkinlikId ZORUNLU olarak null: defter satiri birazdan siliniyor.
        //
        // Alicilar bildirimlerin KENDISINDEN turetilir: uyelik satirlari zincirde
        // daha once silindigi icin oradan okunamaz.
        var bildirimAlicilari = await db.Bildirimler
            .Where(b => b.EtkinlikId == id)
            .Select(b => b.KullaniciId)
            .Distinct()
            .ToListAsync(ct);

        db.Bildirimler.RemoveRange(db.Bildirimler.Where(b => b.EtkinlikId == id));
        // Ertelenmis (henuz gonderilmemis) bildirimler GIDER: gonderilecek defter yok.
        db.ErtelenenBildirimler.RemoveRange(db.ErtelenenBildirimler.Where(b => b.EtkinlikId == id));

        var silmeZamani = DateTimeOffset.UtcNow;
        foreach (var aliciId in bildirimAlicilari)
        {
            db.Bildirimler.Add(new Bildirim
            {
                Id = Guid.NewGuid(),
                KullaniciId = aliciId,
                EtkinlikId = null,
                Tip = "sistem",
                Baslik = "Silinen deftere ait bildirim",
                Mesaj = "Bu bildirimin ait olduğu defter kalıcı olarak silindi. Defterin "
                    + "içeriği - dilekler ve fotoğraflar - geri getirilemez. Eski "
                    + "bildirimleri artık açamazsın.",
                Url = null,
                OkunduMu = false,
                CreatedAt = silmeZamani,
            });
        }

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
