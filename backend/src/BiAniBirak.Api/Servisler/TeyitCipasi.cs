using System.Text.RegularExpressions;
using BiAniBirak.Api.Entities;

namespace BiAniBirak.Api.Servisler;

// TEYIT CIPASI - "silmek icin sunu yaz" metninin TEK DOGRULUK KAYNAGI.
//
// NEDEN AYRI BIR SERVIS:
// Bu metin uc yerde yasiyor - backend'in KARSILASTIRDIGI deger, backend'in hata
// mesajinda GOSTERDIGI deger ve frontend'in kullaniciya sundugu kutu. Uc yerde
// ayri ayri uretilseydi bir gun ayrisirdi. Nitekim ayristi ve kalici silme
// 400 TEYIT_ESLESMEDI verdi. Artik ucu de buradan besleniyor.
//
// IKI KOK NEDEN BURADA KAPANIR:
//
//  1. TRIM ASIMETRISI - eski kodda GELEN metin Trim ediliyor, BEKLENEN metin
//     edilmiyordu. Es adinin sonunda tek bir bosluk varsa teyit hicbir zaman
//     tutmuyordu; kullanici dogru yazdigi halde reddediliyordu. Artik IKI TARAF
//     da ayni sekilde sadelestirilir.
//
//  2. BOS AD - imha edilmis defterde Es1Ad/Es2Ad bosaltilir (ImhaGorevi; es adi
//     kisisel veridir, KVKK geregi silinir). "A & B" kalibi o durumda " & "
//     uretir: bas ve son bosluklu, gorunmez, yazilmasi imkansiz bir cipa. Kalici
//     silme sonsuza dek 400 donuyordu. Adlar bosken kalip DEGISIR: IMHA-<id8>.
//
// KASITLI OLARAK KATI: karsilastirma Ordinal - buyuk/kucuk harf duyarli. Bu geri
// donusu olmayan bir silmedir; kullanicinin ekrandaki metni BIREBIR yazmasini
// istiyoruz. Kaza korumasinin isi zorlastirmaktir. Sadelestirdigimiz tek sey
// gorunmeyen bosluktur - harf farki her zaman reddedilir.
public static class TeyitCipasi
{
    // Ic bosluklari tek boskluga indirger. Kopyala-yapistirda cift bosluk ya da
    // sekme gelmesi teyidi kirmamali - ama harf farki kirmali.
    private static readonly Regex Bosluk = new(@"\s+", RegexOptions.Compiled);

    // Bir defterin beklenen teyit metni. Ekranda GOSTERILEN de,
    // KARSILASTIRILAN da budur - ayrisma imkani yok.
    public static string Uret(Etkinlik defter)
    {
        var es1 = (defter.Es1Ad ?? string.Empty).Trim();
        var es2 = (defter.Es2Ad ?? string.Empty).Trim();

        if (es1.Length > 0 && es2.Length > 0) return $"{es1} & {es2}";

        // TEK AD: eksik tarafi " & " ile ima etmeyiz - sonu boslukla biten,
        // yazilmasi zor bir cipa uretirdi.
        if (es1.Length > 0) return es1;
        if (es2.Length > 0) return es2;

        // IKISI DE BOS: imha edilmis (ya da bozuk) kayit. Kimlikten turetilmis,
        // kisa ve yazilabilir bir cipa. Kisisel veri icermez.
        return "IMHA-" + defter.Id.ToString("N").Substring(0, 8).ToUpperInvariant();
    }

    // Kullanicinin yazdigi metin cipayla ortusuyor mu.
    public static bool Esles(string? girilen, Etkinlik defter)
        => string.Equals(Sadelestir(girilen), Sadelestir(Uret(defter)), StringComparison.Ordinal);

    private static string Sadelestir(string? metin)
        => string.IsNullOrWhiteSpace(metin) ? string.Empty : Bosluk.Replace(metin.Trim(), " ");
}
