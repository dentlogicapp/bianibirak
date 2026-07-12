namespace BiAniBirak.Api.Servisler;

// GORSEL OLCER - fotografin GERCEK boyutunu kendi baytlarindan okur.
//
// NEDEN: Boyut istemciden gelirse yanlis/eksik/sahte olabilir. Bir kez yanlis olcu
// alindiginda cerceve fotografin oranina uymaz; kagitta yanda BEYAZ BOSLUK kalir ve
// eser coper. Olcu, dizginin temelidir - kaynaktan okunur, tahmin edilmez.
//
// Kapsam: JPEG (SOF), PNG (IHDR), WebP (VP8/VP8L/VP8X). Depolamaya kabul ettigimiz
// tipler bunlar; baskasi zaten magic-byte kontrolunden gecmiyor.
public static class GorselOlcer
{
    public sealed record Olcu(int Genislik, int Yukseklik);

    public static Olcu? Coz(byte[] veri)
    {
        if (veri.Length < 16) return null;

        if (veri[0] == 0xFF && veri[1] == 0xD8) return JpegCoz(veri);
        if (veri[0] == 0x89 && veri[1] == 0x50) return PngCoz(veri);
        if (veri[0] == 0x52 && veri[1] == 0x49 && veri[8] == 0x57) return WebpCoz(veri);

        return null;
    }

    // JPEG: SOF (Start Of Frame) isaretcisinde yukseklik/genislik durur.
    private static Olcu? JpegCoz(byte[] v)
    {
        var i = 2;
        while (i + 9 < v.Length)
        {
            if (v[i] != 0xFF) { i++; continue; }

            var isaret = v[i + 1];

            // SOF0..SOF15 (DHT=C4, DNL=C8, DAC=CC haric) -> boyut burada
            var sofMu = isaret >= 0xC0 && isaret <= 0xCF
                        && isaret != 0xC4 && isaret != 0xC8 && isaret != 0xCC;

            if (sofMu)
            {
                var y = (v[i + 5] << 8) | v[i + 6];
                var g = (v[i + 7] << 8) | v[i + 8];
                return g > 0 && y > 0 ? new Olcu(g, y) : null;
            }

            // Isaretci uzunlugu kadar atla
            if (i + 3 >= v.Length) break;
            var uzunluk = (v[i + 2] << 8) | v[i + 3];
            if (uzunluk < 2) break;
            i += 2 + uzunluk;
        }
        return null;
    }

    // PNG: IHDR parcasinin ilk 8 bayti (big-endian genislik + yukseklik)
    private static Olcu? PngCoz(byte[] v)
    {
        if (v.Length < 24) return null;
        var g = (v[16] << 24) | (v[17] << 16) | (v[18] << 8) | v[19];
        var y = (v[20] << 24) | (v[21] << 16) | (v[22] << 8) | v[23];
        return g > 0 && y > 0 ? new Olcu(g, y) : null;
    }

    // WebP: uc bicim var (lossy VP8, lossless VP8L, genisletilmis VP8X)
    private static Olcu? WebpCoz(byte[] v)
    {
        if (v.Length < 30) return null;
        var tip = System.Text.Encoding.ASCII.GetString(v, 12, 4);

        if (tip == "VP8 ")
        {
            // 14 bayt basliktan sonra 0x9D012A imzasi, ardindan 14-bit genislik/yukseklik
            var g = ((v[27] << 8) | v[26]) & 0x3FFF;
            var y = ((v[29] << 8) | v[28]) & 0x3FFF;
            return g > 0 && y > 0 ? new Olcu(g, y) : null;
        }

        if (tip == "VP8L")
        {
            // 14-bit genislik-1, 14-bit yukseklik-1 (bit paketli)
            var bitler = v[21] | (v[22] << 8) | (v[23] << 16) | (v[24] << 24);
            var g = (bitler & 0x3FFF) + 1;
            var y = ((bitler >> 14) & 0x3FFF) + 1;
            return new Olcu(g, y);
        }

        if (tip == "VP8X")
        {
            // 24-bit kanvas genislik-1 / yukseklik-1
            var g = (v[24] | (v[25] << 8) | (v[26] << 16)) + 1;
            var y = (v[27] | (v[28] << 8) | (v[29] << 16)) + 1;
            return new Olcu(g, y);
        }

        return null;
    }
}
