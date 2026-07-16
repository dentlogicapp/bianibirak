using System.Security.Cryptography;

namespace BiAniBirak.Api.Servisler;

// REFERANS KODU URETECI - "bu kod, banka ekranina ELLE yazilacak".
//
// ===================== NEDEN OZEL BIR ALFABE =====================
//
// Bu kod otomatik kopyalanmayacak. Cift onu:
//   - telefon ekraninda gorecek,
//   - baska bir uygulamaya (banka) gececek,
//   - aciklama alanina ELLE yazacak.
//
// Yani insan gozu ve insan parmagi araya girecek. Her yanlis yazilan karakter,
// eslesmeyen bir odeme demektir - ve eslesmeyen odeme, panik icinde bize yazan bir
// cift demektir.
//
// Bu yuzden KARISAN KARAKTERLER alfabeden CIKARILDI:
//   0 / O    (sifir - buyuk O)
//   1 / I / l (bir - buyuk i - kucuk L)
//   5 / S    (bes - S)
//   2 / Z    (iki - Z)
//   8 / B    (sekiz - B)
//
// Kalan alfabe: ACDEFGHJKMNPQRTUVWXY34679 (25 karakter)
//   -> 5 karakterde 25^5 = 9.765.625 olasilik. Carpisma pratikte imkansiz;
//      yine de DB'de unique kontrolu var (kemer + askı).
//
// FORMAT: BAB-XXXXX
//   "BAB" on eki, ciftin banka ekstresinde ne olduğunu ANLAMASINI saglar. Yillar
//   sonra hesap dokumune bakinca "BAB-K7M9X" gorup "bu neydi?" demez.
public static class ReferansUreteci
{
    // Karisan karakterler CIKARILDI. Bu dizi kisaltilmamali - her karakter dusurmek
    // carpisma olasiligini artirir.
    private const string Alfabe = "ACDEFGHJKMNPQRTUVWXY34679";
    private const int Uzunluk = 5;
    private const string OnEk = "BAB";

    public static string Uret()
    {
        Span<char> tampon = stackalloc char[Uzunluk];

        for (var i = 0; i < Uzunluk; i++)
        {
            // Kriptografik rastgelelik - tahmin edilebilir kod, baskasinin odemesini
            // uzerine gecirme denemesine kapi acar.
            var idx = RandomNumberGenerator.GetInt32(Alfabe.Length);
            tampon[i] = Alfabe[idx];
        }

        return $"{OnEk}-{new string(tampon)}";
    }

    // Kullanicinin girdigi kodu normalize et (aramada kullanilir).
    // "bab k7m9x" / "BAB-K7M9X" / "k7m9x" -> "BAB-K7M9X"
    public static string Normalize(string ham)
    {
        if (string.IsNullOrWhiteSpace(ham)) return "";

        var temiz = new string(ham
            .ToUpperInvariant()
            .Where(char.IsLetterOrDigit)
            .ToArray());

        if (temiz.StartsWith(OnEk, StringComparison.Ordinal))
            temiz = temiz[OnEk.Length..];

        return temiz.Length == 0 ? "" : $"{OnEk}-{temiz}";
    }
}
