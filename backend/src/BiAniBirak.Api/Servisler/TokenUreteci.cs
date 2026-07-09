using System.Security.Cryptography;

namespace BiAniBirak.Api.Servisler;

// Tahmin edilemez, yeterli entropili, URL-safe token (Belge 08).
// Paylasim/davet linklerinde kullanilir. Kriptografik RNG (RandomNumberGenerator).
public static class TokenUreteci
{
    // 32 bayt = 256 bit entropi; base64url ile ~43 karakter, URL-guvenli.
    public static string Uret(int bayt = 32)
    {
        var ham = RandomNumberGenerator.GetBytes(bayt);
        return Base64Url(ham);
    }

    // Base64 -> URL-safe (+ -> -, / -> _, = dolgu kaldirilir).
    private static string Base64Url(byte[] veri)
        => Convert.ToBase64String(veri)
            .Replace('+', '-')
            .Replace('/', '_')
            .TrimEnd('=');
}
