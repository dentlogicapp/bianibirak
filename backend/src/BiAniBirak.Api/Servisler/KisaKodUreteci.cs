using System.Security.Cryptography;

namespace BiAniBirak.Api.Servisler;

// KISA KOD URETECI - "/d/{kod}" adresindeki kod.
//
// ===================== NEDEN AYRI, NEDEN KISA =====================
//
// Paylasim Token'i ~43 karakter (256 bit entropi). O kadar veri, karekodu YOGUN
// modullu yapar; kucuk basildiginda telefon okuyamaz. Oysa cift, davetiyede karekodu
// KUCUK istiyor - davetiyenin butunlugunu bozmasin diye.
//
// Cozum: kisa kod. /d/{kod} adresi /k/{Token} sayfasina yonlendirir. Kisa link =
// az modul = her modul fiziksel olarak daha buyuk = kucukken bile okunur.
//
// KARISMAYAN ALFABE: kod bazen elle de yazilabilir/soylenebilir; ReferansUreteci ile
// AYNI karisma-onleyen mantik (0/O, 1/I/l, 5/S, 2/Z, 8/B cikarildi).
//
// 5 karakter -> 25^5 ~ 9.7M olasilik. Cakisma pratikte imkansiz; yine de DB'de
// filtreli unique index (kemer + aski).
public static class KisaKodUreteci
{
    private const string Alfabe = "ACDEFGHJKMNPQRTUVWXY34679";
    private const int Uzunluk = 5;

    public static string Uret()
    {
        Span<char> tampon = stackalloc char[Uzunluk];
        for (var i = 0; i < Uzunluk; i++)
            tampon[i] = Alfabe[RandomNumberGenerator.GetInt32(Alfabe.Length)];
        return new string(tampon);
    }
}
