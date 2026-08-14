namespace BiAniBirak.Api.Servisler;

// SAYFA PAKETLEYICI (C-1) - defterin sayfa duzenini BIZ hesapliyoruz.
//
// ============================ NEDEN VAR ============================
//
// Bugun sayfa kirma kararini QuestPDF veriyor: tum dilekler tek Column icinde
// akiyor, sayfa dolunca kutuphane kendiliginden kiriyor. Bunun uc sonucu var:
//
//   1. BOSLUK HEP ALTTA birikiyor. Kartlar ustten dizildigi icin sayfanin alt
//      kismi bos kaliyor. Optik denge (C3) imkansiz - bosluğu dagitacak olan biz
//      degiliz.
//   2. HANGI DILEK HANGI SAYFADA bilinmiyor. Kutuphane iceride karar veriyor ve
//      bize soylemiyor; "bu dilek defterin neresinde?" sorusu (C-4) yanitlanamiyor.
//   3. OLCUM TAHMINI. KartSigarMi kart yuksekligini TAHMIN ediyor ("ortalama
//      karakter ~5pt"), %86 guvenlik esigiyle. Tahmin, sayfayi biz bolecegimiz an
//      YETMEZ: yanlis olcum = sayfaya 4 kart koyup 3'unun sigmasi = bozuk defter.
//
// Bu sinif ucunu de cozer: GERCEK olcum yapar, sayfalari kendisi paketler ve
// dilek -> sayfa eslemesini yan cikti olarak uretir.
//
// ============================ SU AN BAGLI DEGIL ============================
//
// HICBIR YERDEN CAGIRILMIYOR. Deploy edilse bile defter uretimi bugunku yoluyla
// devam eder - calisan hicbir sey degismez. Once C-1b'de mevcut defterlerle
// karsilastirilip DOGRULANACAK (paketleyicinin buldugu sayfa sayisi QuestPDF'in
// urettigiyle tutuyor mu), ancak ondan sonra derleyiciye baglanacak (C-2).
//
// Motorun kalbine tek hamlede dokunmak, geri donusu olmayan bir risktir; bu yuzden
// once olcum kanitlanir, sonra kontrol devralinir.
//
// ============================ OLCUM NASIL ============================
//
// GERCEK metin olcumu: defterin bastigi AYNI font dosyasi, AYNI
// punto, gercek karakter genislikleri. Kelime kelime sarma yapilir - tipki
// dizgi motorunun yaptigi gibi.
//
// Emoji artik GORUNTU (bkz. EmojiServisi): genisligi sabittir (punto x 1.15),
// harf genisligiyle olculmez.
//
// GUVENLI-BASARISIZ: olcum herhangi bir nedenle kurulamazsa (font dosyasi yok,
// Skia hatasi) paketleyici DEVREYE GIRMEZ - Kullanilabilir=false doner ve cagiran
// taraf bugunku yola devam eder. Sessizce yanlis olcup bozuk defter uretmektense
// hic calismamak yegdir.
public static class SayfaPaketleyici
{
    // Kart ic olculeri - BaskiServisi'ndeki cizimle AYNI degerler.
    // (C-2'de derleyiciye baglanirken bu sabitler tek kaynaga tasinacak.)
    private const float IcerikGenisligi = 294f;   // kart ic genisligi (dolgu dusulmus)
    private const float MetinPunto = 10.5f;
    private const float SatirAraligi = 1.72f;
    private const float KartDolgu = 13f;          // ust + alt ayri ayri
    private const float FotoAltBosluk = 13f;
    private const float FotoMat = 3.5f;
    private const float ImzaBlogu = 54f;          // ayrac + ad + iliski + tarih
    private const float KartArasi = 16f;

    // ---- SONUC TIPLERI ----

    public sealed record SayfaPlani(
        int No,
        IReadOnlyList<int> DilekIndeksleri,
        float DoluYukseklik,
        float BosYukseklik);

    public sealed record Yerlesim(
        bool Kullanilabilir,
        IReadOnlyList<SayfaPlani> Sayfalar,
        // dilek indeksi -> sayfa numarasi (C-4 "Defterde goster" bunu kullanacak)
        IReadOnlyDictionary<int, int> DilekSayfasi,
        string? Not);

    private static readonly Yerlesim Bos =
        new(false, Array.Empty<SayfaPlani>(), new Dictionary<int, int>(), "olcum kurulamadi");

    // ---- ANA GIRIS ----
    //
    // fontKok: Varliklar/Fontlar dizini (govde fontu buradan okunur).
    // sayfaYuksekligi: A5 tasarim puntosunda kullanilabilir icerik yuksekligi.
    public static Yerlesim Paketle(
        IReadOnlyList<BaskiServisi.Dilek> dilekler,
        string fontKok,
        float sayfaYuksekligi)
    {
        if (dilekler.Count == 0)
            return new Yerlesim(true, Array.Empty<SayfaPlani>(), new Dictionary<int, int>(), "dilek yok");

        var fontYolu = Path.Combine(fontKok, "Inter-Regular.ttf");
        if (!File.Exists(fontYolu))
            return Bos with { Not = "govde fontu bulunamadi: " + fontYolu };

        var olcu = FontOlcusu.Yukle(fontYolu);
        if (olcu == null) return Bos with { Not = "font olcusu okunamadi" };

        try
        {
            var sayfalar = new List<SayfaPlani>();
            var esleme = new Dictionary<int, int>();

            var suAnki = new List<int>();
            var suAnkiYukseklik = 0f;
            var sayfaNo = 1;

            for (var i = 0; i < dilekler.Count; i++)
            {
                var kartYukseklik = KartYuksekligi(dilekler[i], olcu);

                // Kart bu sayfaya SIGMIYORSA sayfayi kapat, yenisini ac.
                // (Tek basina bir sayfaya bile sigmayan kart - cok uzun dilek -
                // yine de kendi sayfasina konur; bolme karari C-2'de derleyiciye
                // birakilir, paketleyici burada kararsiz kalmaz.)
                if (suAnki.Count > 0 && suAnkiYukseklik + kartYukseklik > sayfaYuksekligi)
                {
                    sayfalar.Add(new SayfaPlani(
                        sayfaNo, suAnki.ToArray(), suAnkiYukseklik,
                        Math.Max(0f, sayfaYuksekligi - suAnkiYukseklik)));
                    sayfaNo++;
                    suAnki = new List<int>();
                    suAnkiYukseklik = 0f;
                }

                suAnki.Add(i);
                esleme[i] = sayfaNo;
                suAnkiYukseklik += kartYukseklik;
            }

            if (suAnki.Count > 0)
            {
                sayfalar.Add(new SayfaPlani(
                    sayfaNo, suAnki.ToArray(), suAnkiYukseklik,
                    Math.Max(0f, sayfaYuksekligi - suAnkiYukseklik)));
            }

            return new Yerlesim(true, sayfalar, esleme, null);
        }
        catch (Exception ex)
        {
            // Olcum cokerse defter URETILMEYE DEVAM ETSIN: paketleyici devre disi.
            return Bos with { Not = "olcum hatasi: " + ex.Message };
        }
    }

    // ---- TEK KARTIN YUKSEKLIGI ----
    //
    // BaskiServisi.DilekKarti'nin cizdigi sirayla, AYNI bilesenlerle hesaplanir:
    //   [foto + mat + alt bosluk] + [ic dolgu] + [metin] + [imza blogu] + [kart arasi]
    public static float KartYuksekligi(BaskiServisi.Dilek d, FontOlcusu olcu)
    {
        var yukseklik = 0f;

        if (d.Foto != null)
        {
            // Foto olcusu BaskiServisi'nin AYNI hesabiyla (tek kaynak).
            var (_, fy) = BaskiServisi.FotoOlcusu(d.FotoGenislik, d.FotoYukseklik);
            yukseklik += fy + FotoMat * 2 + FotoAltBosluk;
        }

        yukseklik += KartDolgu * 2;
        yukseklik += MetinYuksekligi(BaskiServisi.MetinBicimle(d.Mesaj), olcu);
        yukseklik += ImzaBlogu;
        yukseklik += KartArasi;

        return yukseklik;
    }

    // ---- METIN YUKSEKLIGI - GERCEK OLCUM ----
    //
    // Kelime kelime sarma: satira sigmayan kelime alt satira iner. Dizgi motorunun
    // yaptigi is budur; "karakter sayisi / ortalama genislik" tahmini burada YOK.
    public static float MetinYuksekligi(string? metin, FontOlcusu olcu)
    {
        if (string.IsNullOrEmpty(metin)) return 0f;

        var satirYuksekligi = MetinPunto * SatirAraligi;
        var emojiGenislik = MetinPunto * 1.15f;
        var toplamSatir = 0;

        foreach (var paragraf in metin.Replace("\r\n", "\n").Split('\n'))
        {
            var satirGenislik = 0f;
            var satirSayisi = 1;

            // Parcalar: duz metin ve emoji goruntuleri ayri olculur.
            foreach (var p in EmojiServisi.Ayristir(paragraf))
            {
                if (p.EmojiAnahtar != null)
                {
                    if (satirGenislik + emojiGenislik > IcerikGenisligi && satirGenislik > 0)
                    {
                        satirSayisi++;
                        satirGenislik = 0f;
                    }
                    satirGenislik += emojiGenislik;
                    continue;
                }

                var kelimeler = (p.Metin ?? string.Empty).Split(' ');
                for (var k = 0; k < kelimeler.Length; k++)
                {
                    var kelime = kelimeler[k] + (k < kelimeler.Length - 1 ? " " : string.Empty);
                    if (kelime.Length == 0) continue;

                    var genislik = olcu.Genislik(kelime, MetinPunto);

                    // Tek basina satira sigmayan kelime (cok uzun url gibi):
                    // karakter karakter kirilir - sonsuz donguye girmez.
                    if (genislik > IcerikGenisligi)
                    {
                        satirSayisi += (int)Math.Ceiling(genislik / IcerikGenisligi) - 1;
                        satirGenislik = genislik % IcerikGenisligi;
                        continue;
                    }

                    if (satirGenislik + genislik > IcerikGenisligi && satirGenislik > 0)
                    {
                        satirSayisi++;
                        satirGenislik = 0f;
                    }
                    satirGenislik += genislik;
                }
            }

            toplamSatir += satirSayisi;
        }

        return toplamSatir * satirYuksekligi;
    }
}
