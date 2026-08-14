using System.Text;

namespace BiAniBirak.Api.Servisler;

// EMOJI SERVISI - emoji FONT degil, GORUNTU olarak basilir.
//
// ===================== NEDEN FONT DEGIL =====================
//
// Once emoji fontu (Noto Emoji) yedek zincire eklendi ve iki sorun cikti:
//   1. TEK RENK: kontur cizimler; 🙏 "kanat" gibi, kalpler siyah blok. Sepya bir
//      defter sayfasinda ucuz duruyordu.
//   2. Renkli emoji fontlari (COLR/CBDT) QuestPDF/SkiaSharp'in PDF ciktisinda
//      guvenilir DEGIL - bos glif, bozuk cizim ya da yanlis font cozumlemesi
//      riski tasir. Bir MIRAS urununde "bazen bozulur" kabul edilemez.
//
// ===================== COZUM =====================
//
// Emoji karakterleri metinden ayrilir ve yerlerine GOMULU PNG goruntuler satir
// ici olarak yerlestirilir (QuestPDF: text.Element().Image(...)).
//
// Kazanc:
//   - Font cozumlemesi DEVREYE HIC GIRMEZ: harf kaybi / "kutu" riski YOK.
//   - SkiaSharp'in COLR destegi hic kullanilmaz: surum degisse de davranis ayni.
//   - PNG, PDF'in en iyi destekledigi bicim - matbaada da sorunsuz.
//   - Emoji bulunamazsa (yeni cikmis bir emoji) SESSIZCE ATLANIR; defter yine
//     uretilir. Cokme yok.
//
// VARLIK: Twemoji (Twitter, CC-BY 4.0) - 3720 emoji, 72px PNG, ~5 MB.
// Konum: Varliklar/Emoji/<kod>.png
//
// ===================== ADLANDIRMA (Twemoji kurali) =====================
//
//   Tek karakter      : 1f60a.png            (FE0F varyasyon seciciler ATILIR: 2764)
//   Ten tonu          : 1f44d-1f3fd.png
//   Bayrak            : 1f1f9-1f1f7.png      (TR)
//   Tus (keycap)      : 31-20e3.png
//   ZWJ dizisi        : 1f3c3-1f3fb-200d-2640-fe0f.png  (dizide FE0F KORUNUR)
//
// Bu yuzden eslestirme her dilim icin IKI aday dener: FE0F'li ve FE0F'siz.
// Eslestirme EN UZUNDAN kisaya gider - yoksa "aile" emojisi tek tek kisilere
// bolunur ve anlam kaybolur.
//
// GUVENLIK: varlik kumesinde ASCII (harf/rakam/noktalama) karsiligi olan HICBIR
// dosya yoktur - dolayisiyla siradan bir harf ya da rakam asla emoji sanilmaz.
public static class EmojiServisi
{
    // En uzun Twemoji dizisi ~10 kod noktasidir (ZWJ aile dizileri).
    private const int AzamiDizi = 10;

    private static readonly HashSet<string> _mevcut = new(StringComparer.Ordinal);
    private static readonly Dictionary<string, byte[]> _bellek = new(StringComparer.Ordinal);
    private static readonly object _kilit = new();
    private static string _dizin = string.Empty;
    private static bool _hazir;

    // Varlik dizinini tarar. BaskiServisi.Hazirla icinden bir kez cagirilir.
    public static void Hazirla(string kokDizin)
    {
        if (_hazir) return;
        lock (_kilit)
        {
            if (_hazir) return;
            _dizin = Path.Combine(kokDizin, "Varliklar", "Emoji");
            if (Directory.Exists(_dizin))
            {
                foreach (var yol in Directory.EnumerateFiles(_dizin, "*.png"))
                    _mevcut.Add(Path.GetFileNameWithoutExtension(yol));
            }
            _hazir = true;
        }
    }

    // Metin parcasi: ya duz METIN ya da bir EMOJI anahtaridir (ikisi birden degil).
    public sealed record Parca(string? Metin, string? EmojiAnahtar);

    // Metni duz metin ve emoji parcalarina ayirir.
    public static List<Parca> Ayristir(string? metin)
    {
        var parcalar = new List<Parca>();
        if (string.IsNullOrEmpty(metin)) return parcalar;

        // Emoji varligi yuklenmediyse metin OLDUGU GIBI doner - bicimlendirme
        // yapilmaz, hicbir sey kaybolmaz.
        if (!_hazir || _mevcut.Count == 0)
        {
            parcalar.Add(new Parca(metin, null));
            return parcalar;
        }

        var kodlar = new List<int>();
        foreach (var r in metin.EnumerateRunes()) kodlar.Add(r.Value);

        var tampon = new StringBuilder();
        var i = 0;

        while (i < kodlar.Count)
        {
            string? bulunan = null;
            var uzunluk = 0;

            // EN UZUNDAN kisaya: bilesik diziler (aile, ten tonu, bayrak) once.
            var enFazla = Math.Min(AzamiDizi, kodlar.Count - i);
            for (var n = enFazla; n >= 1 && bulunan == null; n--)
            {
                var dilim = kodlar.GetRange(i, n);

                var tam = string.Join("-", dilim.Select(k => k.ToString("x")));
                if (_mevcut.Contains(tam)) { bulunan = tam; uzunluk = n; break; }

                // FE0F (varyasyon secici) atilmis hali - tek karakterli emojiler boyle adlanir.
                var sade = string.Join("-", dilim.Where(k => k != 0xFE0F).Select(k => k.ToString("x")));
                if (sade.Length > 0 && sade != tam && _mevcut.Contains(sade))
                {
                    bulunan = sade; uzunluk = n; break;
                }
            }

            if (bulunan != null)
            {
                if (tampon.Length > 0) { parcalar.Add(new Parca(tampon.ToString(), null)); tampon.Clear(); }
                parcalar.Add(new Parca(null, bulunan));
                i += uzunluk;
            }
            else
            {
                // Emoji degil: metne ekle. (Gorunmez birlestiriciler tek baslarina
                // kaldilarsa yazilmaz - sayfada bos kutu birakmasinlar.)
                var kod = kodlar[i];
                if (kod != 0xFE0F && kod != 0x200D)
                    tampon.Append(new System.Text.Rune(kod).ToString());
                i++;
            }
        }

        if (tampon.Length > 0) parcalar.Add(new Parca(tampon.ToString(), null));
        return parcalar;
    }

    // Emoji goruntusu - ilk istekte diskten okunur, sonra bellekte kalir.
    // Bir defterde ayni emoji onlarca kez gecebilir; her seferinde disk okumak
    // gereksizdir. Kume kucuk (~5 MB tamami), bellek yuku onemsiz.
    public static byte[]? Goruntu(string anahtar)
    {
        if (!_hazir) return null;
        lock (_kilit)
        {
            if (_bellek.TryGetValue(anahtar, out var hazirVeri)) return hazirVeri;
            var yol = Path.Combine(_dizin, anahtar + ".png");
            if (!File.Exists(yol)) return null;
            try
            {
                var veri = File.ReadAllBytes(yol);
                _bellek[anahtar] = veri;
                return veri;
            }
            catch
            {
                return null; // okunamadi - emoji atlanir, defter uretilir
            }
        }
    }

    // Metinde emoji var mi? (olcum tarafi icin - emoji genisligi harften farklidir)
    public static bool EmojiIceriyor(string? metin)
    {
        if (string.IsNullOrEmpty(metin)) return false;
        foreach (var p in Ayristir(metin))
            if (p.EmojiAnahtar != null) return true;
        return false;
    }
}
