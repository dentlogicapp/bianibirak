namespace BiAniBirak.Api.Servisler;

// FONT OLCUSU - TTF karakter genisliklerini DOGRUDAN font dosyasindan okur.
//
// ============================ NEDEN BOYLE ============================
//
// Sayfa paketleyicinin (C-1) dogru calismasi icin metnin GERCEK genisligi gerekir;
// "ortalama karakter ~5pt" tahmini sayfayi biz boldugumuz an yetmez.
//
// SkiaSharp ile olculebilirdi ama o paket projede DOGRUDAN yok: QuestPDF onu
// gecisli olarak disariya acmiyor (build CS0246 verdi). Paketi elle eklemek
// SURUM CAKISMASI riski tasir - QuestPDF'in kullandigi surumden farkli bir
// SkiaSharp, calisma zamaninda PDF uretimini bozabilir.
//
// Bu yuzden ihtiyacimiz olan seyi kendimiz okuyoruz. Karakter genislikleri
// fontun icinde zaten duruyor; okumak icin ek bagimlilik gerekmiyor:
//   head -> unitsPerEm (olcek)
//   hhea -> numberOfHMetrics
//   hmtx -> glif basina ilerleme genisligi
//   cmap -> karakter -> glif eslemesi (bicim 4 ve 12)
//
// Kazanc: dis bagimlilik SIFIR, surum cakismasi riski YOK, QuestPDF/SkiaSharp
// surumu degisse bile etkilenmez.
//
// SINIR: kerning (GPOS) ve ligaturler (GSUB) hesaba katilmaz. Bu, olcumde ~%1
// sapma demektir - kart yuksekligi zaten guvenlik payiyla degerlendirildigi icin
// fazlasiyla karsilanir. Amac piksel kusursuzlugu degil, TAHMINI GERCEK OLCUMLE
// degistirmektir.
//
// DOGRULAMA: bu algoritmanin birebir aynisi Python'da yazilip fontTools'un
// sonuclariyla karsilastirildi - iki farkli fontta 54 karakterde SIFIR fark.
public sealed class FontOlcusu
{
    private readonly byte[] _veri;
    private readonly int _hmtxKonum;
    private readonly int _metrikSayi;
    private readonly float _birim;
    private readonly Dictionary<int, int> _cmap = new();

    private FontOlcusu(byte[] veri, int hmtx, int metrikSayi, float birim)
    {
        _veri = veri; _hmtxKonum = hmtx; _metrikSayi = metrikSayi; _birim = birim;
    }

    // Font dosyasini okur. Basarisizsa null doner - cagiran taraf olcumu
    // devre disi birakir (sessizce yanlis olcmez).
    public static FontOlcusu? Yukle(string yol)
    {
        try
        {
            if (!File.Exists(yol)) return null;
            var d = File.ReadAllBytes(yol);
            if (d.Length < 12) return null;

            var tabloSayi = U16(d, 4);
            var tablolar = new Dictionary<string, int>(StringComparer.Ordinal);
            for (var i = 0; i < tabloSayi; i++)
            {
                var o = 12 + i * 16;
                if (o + 16 > d.Length) return null;
                var etiket = System.Text.Encoding.ASCII.GetString(d, o, 4);
                tablolar[etiket] = (int)U32(d, o + 8);
            }

            if (!tablolar.TryGetValue("head", out var head)) return null;
            if (!tablolar.TryGetValue("hhea", out var hhea)) return null;
            if (!tablolar.TryGetValue("hmtx", out var hmtx)) return null;
            if (!tablolar.TryGetValue("cmap", out var cmap)) return null;

            var birim = U16(d, head + 18);
            if (birim == 0) return null;
            var metrikSayi = U16(d, hhea + 34);
            if (metrikSayi == 0) return null;

            var f = new FontOlcusu(d, hmtx, metrikSayi, birim);
            f.CmapOku(cmap);
            return f._cmap.Count > 0 ? f : null;
        }
        catch
        {
            return null; // bozuk font olcumu cokertmez
        }
    }

    // Bir karakterin punto cinsinden genisligi. Bilinmeyen karakter 0 doner.
    public float Genislik(int kodNoktasi, float punto)
    {
        if (!_cmap.TryGetValue(kodNoktasi, out var glif)) return 0f;
        var i = Math.Min(glif, _metrikSayi - 1);
        var konum = _hmtxKonum + i * 4;
        if (konum + 2 > _veri.Length) return 0f;
        return U16(_veri, konum) / _birim * punto;
    }

    // Bir metnin punto cinsinden toplam genisligi.
    public float Genislik(string metin, float punto)
    {
        var toplam = 0f;
        foreach (var r in metin.EnumerateRunes())
            toplam += Genislik(r.Value, punto);
        return toplam;
    }

    // ---- cmap ----
    private void CmapOku(int cmap)
    {
        var altSayi = U16(_veri, cmap + 2);
        var enIyi = -1; var enIyiPuan = -1;
        for (var i = 0; i < altSayi; i++)
        {
            var o = cmap + 4 + i * 8;
            if (o + 8 > _veri.Length) break;
            var pid = U16(_veri, o);
            var eid = U16(_veri, o + 2);
            var kayma = (int)U32(_veri, o + 4);
            // Tercih: Windows tam Unicode (3,10) > Windows BMP (3,1) > Unicode (0,*)
            var puan = pid == 3 && eid == 10 ? 4 : pid == 3 && eid == 1 ? 3 : pid == 0 ? 2 : 1;
            if (puan > enIyiPuan) { enIyiPuan = puan; enIyi = cmap + kayma; }
        }
        if (enIyi < 0 || enIyi + 4 > _veri.Length) return;

        var bicim = U16(_veri, enIyi);
        if (bicim == 4) Bicim4(enIyi);
        else if (bicim == 12) Bicim12(enIyi);
    }

    private void Bicim4(int t)
    {
        var segX2 = U16(_veri, t + 6);
        var seg = segX2 / 2;
        var sonlar = t + 14;
        var baslar = sonlar + segX2 + 2;
        var deltalar = baslar + segX2;
        var araliklar = deltalar + segX2;

        for (var i = 0; i < seg; i++)
        {
            var son = U16(_veri, sonlar + i * 2);
            var bas = U16(_veri, baslar + i * 2);
            var delta = (short)U16(_veri, deltalar + i * 2);
            var aralik = U16(_veri, araliklar + i * 2);
            if (bas > son) continue;

            for (var kod = bas; kod <= son && kod != 0xFFFF; kod++)
            {
                int glif;
                if (aralik == 0)
                {
                    glif = (kod + delta) & 0xFFFF;
                }
                else
                {
                    var adres = araliklar + i * 2 + aralik + (kod - bas) * 2;
                    if (adres + 2 > _veri.Length) continue;
                    glif = U16(_veri, adres);
                    if (glif != 0) glif = (glif + delta) & 0xFFFF;
                }
                if (glif != 0) _cmap[kod] = glif;
            }
        }
    }

    private void Bicim12(int t)
    {
        var grupSayi = (int)U32(_veri, t + 12);
        for (var i = 0; i < grupSayi; i++)
        {
            var o = t + 16 + i * 12;
            if (o + 12 > _veri.Length) break;
            var bas = (int)U32(_veri, o);
            var son = (int)U32(_veri, o + 4);
            var glifBas = (int)U32(_veri, o + 8);
            // Cok genis araliklari sinirla: emoji bloklari on binlerce kod noktasi
            // icerebilir; olcum icin gereken yalnizca metinde GECEN karakterlerdir.
            if (son - bas > 20000) son = bas + 20000;
            for (var k = bas; k <= son; k++) _cmap[k] = glifBas + (k - bas);
        }
    }

    private static int U16(byte[] d, int i) => (d[i] << 8) | d[i + 1];
    private static uint U32(byte[] d, int i) =>
        ((uint)d[i] << 24) | ((uint)d[i + 1] << 16) | ((uint)d[i + 2] << 8) | d[i + 3];
}
