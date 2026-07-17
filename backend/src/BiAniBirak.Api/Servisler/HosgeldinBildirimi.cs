using BiAniBirak.Api.Data;

namespace BiAniBirak.Api.Servisler;

// HOSGELDIN BILDIRIMI - sisteme giren her ese, BIR KEZ.
//
// NEDEN HAYATI:
// Bu urun bir SURE urunu. Cift, defterini kurar ve hayat devam eder - dugun telasi,
// tatil, is. 37. gunde defter silinir ve cift bunu aylar sonra fark eder. Teknik
// olarak her sey dogru calismistir; ama cift mirasini kaybetmistir.
//
// Kaybin kok nedeni neredeyse her zaman aynidir: KIMSE BASTA ANLATMADI. Kullanici
// "bir gun indiririm" der, gun gelir, defter yoktur.
//
// Bu bildirim o bosluğu kapatir. Ilk temasta, en dikkatli oldugu anda, sureci
// gosterir ve zaman cizelgesine goturur. Sonradan "bilmiyordum" diyemesin - ve
// gercekten de bilsin.
//
// Kurulumda ve YENI ES KATILIMINDA gonderilir: ikinci es de ayni sorumlulugu tasir,
// ondan bilgi saklamak olmaz.
public static class HosgeldinBildirimi
{
    public static async Task GonderAsync(
        BiAniBirakDbContext db,
        PushGonderici push,
        Guid kullaniciId,
        Guid etkinlikId,
        string ciftAdi,
        string tur,
        CancellationToken ct = default)
    {
        var turAdi = tur switch
        {
            "nisan" => "nişanınız",
            "nikah" => "nikahınız",
            _ => "düğününüz",
        };

        var baslik = $"{ciftAdi} defteri açıldı - önce bunu okuyun";

        // Ton: telas degil, NET BILGI. "Sonradan pisman olmayin" cumlesi bilincli:
        // bu bir sure urunu ve kayip GERI DONUSSUZ. Yumusatmak, ilgisizlik uretir.
        var govde =
            $"Davetlileriniz artık dilek bırakabilir. Ama önemli bir şey var: bu defter "
            + $"sonsuza dek durmaz.\n\n"
            + $"• {turAdi.Substring(0, 1).ToUpper()}{turAdi.Substring(1)} gününden {Sabitler.ToplamaGun} gün sonra "
            + $"davetli girişleri kapanır.\n"
            + $"• {Sabitler.ToplamGun}. günün sonunda defteriniz ve tüm veriler KALICI OLARAK silinir.\n"
            + $"• Eserinizi bu süre içinde indirmezseniz, hiçbir şekilde geri getiremeyiz.\n\n"
            + $"Süreç zaman çizelgesini şimdi inceleyin - sonradan pişman olmayın.";

        await push.GonderAsync(
            kullaniciId,
            baslik,
            govde,
            // Paylasim ekranindaki zaman cizelgesine goturur ve oraya SCROLL + HIGHLIGHT
            // yapar - dilek bildiriminde kanitlanmis desen.
            url: "/dilek-baglantisi?odak=cizelge",
            etkinlikId: etkinlikId,
            // Hayati bilgilendirme: sessiz saate tabi degil. Zaten kayit aninda
            // kullanici uyaniktir.
            sessizSaateTabi: false,
            ct: ct);
    }
}
