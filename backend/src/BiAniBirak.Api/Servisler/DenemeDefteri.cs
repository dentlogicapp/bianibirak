using BiAniBirak.Api.Data;
using BiAniBirak.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace BiAniBirak.Api.Servisler;

// DENEME DEFTERİ ÜRETİCİ
//
// NEDEN: her yeni özelliği test etmek için elle defter kurup, davetli linkinden tek tek
// dilek bırakmak gerekiyordu. Bu hem yavaş hem de gerçekçi değil - tek dilekli bir defterle
// "uzun dilek sayfayı taşırıyor mu", "20 dilek nasıl sıralanıyor", "imhaya 3 saat kala ekran
// ne diyor" soruları HİÇ test edilemez. Canlıda yakalanan hataların çoğu tam olarak
// bu yüzden kaçtı.
//
// NE ÜRETİR: gerçekçi bir defter - farklı uzunlukta dilekler (çok kısa, orta, çok uzun),
// iki eşe dağılmış, bir kısmı onaylı bir kısmı beklemede, satır başlı/paragraflı metinler.
//
// EVRE SEÇİLEBİLİR: tarihi geriye alarak defterin hangi yaşam evresinde doğacağını belirler.
// Böylece "indirme penceresi" ya da "son saatler" ekranları beklemeden görülebilir.
//
// GÜVENLİK: yalnız süper admin çağırabilir. Üretilen defter normal bir defterdir - aynı
// yaşam döngüsüne, aynı imha takvimine tabidir. Ayrı bir "test modu" YOKTUR; test verisi
// gerçek yoldan geçmezse test etmiş sayılmayız.
public static class DenemeDefteri
{
    public static async Task<Guid> UretAsync(
        BiAniBirakDbContext db, Guid sahipKullaniciId, string evre, CancellationToken ct = default)
    {
        var simdi = DateTimeOffset.UtcNow;

        // Evreye göre özel gün: geriye alınarak defter istenen aşamada doğar.
        var ozelGun = evre switch
        {
            "indirme" => simdi.AddDays(-(Sabitler.ToplamaGun + 1)),      // toplama kapandı
            "sonlaniyor" => simdi.AddDays(-Sabitler.ToplamGun).AddHours(8), // ~8 saat kaldı
            "son-gunler" => simdi.AddDays(-3),                            // özel gün geçti
            _ => simdi.AddDays(20),                                        // toplaniyor
        };

        var etkinlikId = Guid.NewGuid();
        var etkinlik = new Etkinlik
        {
            Id = etkinlikId,
            Tur = "dugun",
            Es1Ad = "Deneme",
            Es2Ad = "Defteri",
            EtkinlikTarihi = ozelGun,
            AcilisTarihi = simdi.AddDays(-30),
            KapanisTarihi = ozelGun.AddDays(Sabitler.ToplamaGun),
            Durum = "aktif",
            CreatedAt = simdi.AddDays(-30),
            UpdatedAt = simdi,
        };
        db.Etkinlikler.Add(etkinlik);

        db.EtkinlikUyelikleri.Add(new EtkinlikUyeligi
        {
            Id = Guid.NewGuid(),
            EtkinlikId = etkinlikId,
            KullaniciId = sahipKullaniciId,
            Rol = "es1",
            CreatedAt = simdi,
        });

        db.EtkinlikAyarlari.Add(new EtkinlikAyari
        {
            Id = Guid.NewGuid(),
            EtkinlikId = etkinlikId,
            UpdatedAt = simdi,
        });

        // Talep sırası önemli: etkinlik önce yazılır, katkılar ona bağlıdır.
        await db.SaveChangesAsync(ct);

        // ---- DİLEKLER ----
        // Uzunluk çeşitliliği KASITLI: sayfa düzeni, kırpma ve taşma yalnız uç
        // örneklerle test edilebilir.
        var dilekler = new (string Ad, string Iliski, string Mesaj, string Es, string Durum)[]
        {
            ("Ayşe Yılmaz", "Gelinin ablası",
                "Mutluluklar!", "es1", "onayli"),

            ("Mehmet Demir", "Damadın iş arkadaşı",
                "Bu güzel günde yanınızda olmak çok kıymetliydi. Ömür boyu mutluluklar dilerim.",
                "es1", "onayli"),

            ("Zeynep Kaya", "Çocukluk arkadaşı",
                "Seni ilk gördüğümde yedi yaşındaydık.\n\nO gün elimden tutup \"korkma, ben buradayım\" "
                + "demiştin. Bugün senin elini bir başkasına uzatışını izlerken, o küçük kızın ne kadar "
                + "güzel bir kadın olduğunu düşündüm.\n\nHer zaman yanında olacağım. Tıpkı o gün gibi.",
                "es1", "onayli"),

            ("Ali Vural", "Damadın amcası",
                "Yeni yuvanıza bereket, sofranıza bolluk, gönlünüze huzur diliyorum. Aile büyükleri "
                + "olarak sizi hep destekleyeceğiz.", "es2", "onayli"),

            ("Elif Şahin", "Gelinin üniversite arkadaşı",
                "Kütüphanede geçen o gecelerde birbirimize \"bir gün her şey yoluna girecek\" derdik. "
                + "Bak gerçekten girdi. Çok mutluyum senin adına.", "es2", "onayli"),

            ("Hasan Aydın", "Komşu",
                "Nice mutlu yıllara.", "es2", "onayli"),

            ("Fatma Çelik", "Gelinin teyzesi",
                "Küçüklüğünden beri izlediğim o ışıltının bugün gözlerinde daha da parladığını gördüm. "
                + "Allah ayırmasın, birbirinize hep böyle bakın.", "es1", "beklemede"),

            ("Burak Öz", "Damadın kuzeni",
                "Kardeşim, seni böyle mutlu görmek en güzeli. Yenge hanıma da hoş geldin diyorum. "
                + "Bundan sonrası hepimiz için daha güzel olacak.", "es2", "beklemede"),
        };

        var i = 0;
        foreach (var d in dilekler)
        {
            db.Katkilar.Add(new Katki
            {
                Id = Guid.NewGuid(),
                EtkinlikId = etkinlikId,
                DavetliAd = d.Ad,
                DavetliIliski = d.Iliski,
                DavetliEmail = "",
                DavetliTelefon = "",
                Mesaj = d.Mesaj,
                KaynakEs = d.Es,
                Durum = d.Durum,
                SilindiMi = false,
                CreatedAt = ozelGun.AddHours(-6 + i),
                UpdatedAt = simdi,
            });
            i++;
        }

        await db.SaveChangesAsync(ct);
        return etkinlikId;
    }
}
