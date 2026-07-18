namespace BiAniBirak.Api.Servisler;

// GORSEL DEPOLAMA - soyutlama katmani.
//
// Bugun: sunucu diski (Docker volume /veri/medya - container yeniden kurulunca ucmaz).
// Yarin: nesne depolama (Cloudflare R2 / S3). Bu sinifin ICI degisir, cagiran kod DEGISMEZ.
//
// GUVENLIK:
//  - Anahtar tenant-kapsamlidir: {EtkinlikId}/{Guid}.jpg -> etkinlikler arasi sizinti yok.
//  - Yalnizca JPEG/PNG/WebP kabul edilir; MAGIC BYTE ile dogrulanir (uzanti YALAN soyleyebilir).
//  - Dosya adi ASLA kullanicidan gelmez; sunucu uretir.
//  - Boyut tavani: sikistirma sonrasi 6 MB (istemci 3200px/q88 gonderiyor).
//    ISTEMCI ILE BIRLIKTE DEGISIR: biri unutulursa yukleme sunucuda sessizce reddedilir
//    ve davetli sebebini anlamaz. gorsel.ts TAVAN_BAYT ile ayni sayi olmak ZORUNDA.
public class DepolamaServisi
{
    private readonly string _kok;

    // Medya kok dizini - DiskGozcusu bu yolun bagli oldugu diski olcer.
    // Ileride medya ayri bir Hetzner Volume'e tasinirsa gozcu OTOMATIK dogru diski
    // izler; ikinci bir ayar/kopya yol tanimlanmaz (tek dogruluk kaynagi).
    public string Kok => _kok;

    public DepolamaServisi(IConfiguration ayar)
    {
        _kok = ayar["Depolama:Kok"] ?? "/veri/medya";
        Directory.CreateDirectory(_kok);    }

    public const int TavanBayt = 6 * 1024 * 1024; // 6 MB - gorsel.ts TAVAN_BAYT ile ayni

    // Icerik tipi + uzanti (magic byte ile dogrulanmis)
    public sealed record GorselTipi(string MimeTipi, string Uzanti);

    // MAGIC BYTE dogrulamasi - uzantiya ASLA guvenilmez.
    public static GorselTipi? TipCoz(byte[] veri)
    {
        if (veri.Length < 12) return null;

        // JPEG: FF D8 FF
        if (veri[0] == 0xFF && veri[1] == 0xD8 && veri[2] == 0xFF)
            return new GorselTipi("image/jpeg", ".jpg");

        // PNG: 89 50 4E 47 0D 0A 1A 0A
        if (veri[0] == 0x89 && veri[1] == 0x50 && veri[2] == 0x4E && veri[3] == 0x47
            && veri[4] == 0x0D && veri[5] == 0x0A && veri[6] == 0x1A && veri[7] == 0x0A)
            return new GorselTipi("image/png", ".png");

        // WebP: "RIFF" .... "WEBP"
        if (veri[0] == 0x52 && veri[1] == 0x49 && veri[2] == 0x46 && veri[3] == 0x46
            && veri[8] == 0x57 && veri[9] == 0x45 && veri[10] == 0x42 && veri[11] == 0x50)
            return new GorselTipi("image/webp", ".webp");

        return null;
    }

    // Kaydet -> depolama anahtari dondurur ({EtkinlikId}/{Guid}.jpg)
    public async Task<string> KaydetAsync(Guid etkinlikId, byte[] veri, string uzanti)
    {
        var dizin = Path.Combine(_kok, etkinlikId.ToString());
        Directory.CreateDirectory(dizin);

        var ad = $"{Guid.NewGuid():N}{uzanti}";
        var yol = Path.Combine(dizin, ad);
        await File.WriteAllBytesAsync(yol, veri);

        return $"{etkinlikId}/{ad}";
    }

    public async Task<byte[]?> OkuAsync(string anahtar)
    {
        var yol = GuvenliYol(anahtar);
        if (yol == null || !File.Exists(yol)) return null;
        return await File.ReadAllBytesAsync(yol);
    }

    public void Sil(string anahtar)
    {
        var yol = GuvenliYol(anahtar);
        if (yol != null && File.Exists(yol)) File.Delete(yol);
    }

    // Etkinligin TUM gorselleri (imha akisi - Belge 08 saklama/imha)
    public void EtkinligiSil(Guid etkinlikId)
    {
        var dizin = Path.Combine(_kok, etkinlikId.ToString());
        if (Directory.Exists(dizin)) Directory.Delete(dizin, recursive: true);
    }

    // Yol gecisi (path traversal) korumasi: anahtar kok dizinin DISINA cikamaz.
    private string? GuvenliYol(string anahtar)
    {
        if (string.IsNullOrWhiteSpace(anahtar) || anahtar.Contains("..")) return null;

        var tam = Path.GetFullPath(Path.Combine(_kok, anahtar));
        var kokTam = Path.GetFullPath(_kok);
        if (!tam.StartsWith(kokTam, StringComparison.Ordinal)) return null;

        return tam;
    }

    public static string MimeCoz(string anahtar) =>
        Path.GetExtension(anahtar).ToLowerInvariant() switch
        {
            ".png" => "image/png",
            ".webp" => "image/webp",
            _ => "image/jpeg",
        };
}
