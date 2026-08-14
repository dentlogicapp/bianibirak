namespace BiAniBirak.Api.Servisler;

// SAYFA PAKETLEYICI (C-2) - defterin sayfa duzenini BIZ hesapliyoruz.
//
// ============================ NEDEN VAR ============================
//
// Sayfa kirma karari QuestPDF'teydi ve ACGOZLU calisiyordu: "sigdigi surece
// doldur, sigmayinca yeni sayfa ac". Tipografide bu ilkel yontemdir ve sonucu
// canlida gorundu - gercek bir defterde bir sayfa %76 BOS kaldi, cunku siradaki
// kart oraya sigmiyordu.
//
// ============================ DEVLERIN YONTEMI ============================
//
// TeX (Knuth-Plass), InDesign ve profesyonel dizgi motorlari acgozlu doldurmaz:
// tum diziyi birden degerlendirip "KOTULUK" toplamini en aza indirir.
// Kotuluk = artan boslugun KARESI. Kare almak belirleyicidir:
//   bir sayfada 359pt bosluk  -> 128.881
//   iki sayfada 180'er pt     ->  64.800
// Yani dengeli dagilim HER ZAMAN kazanir; "bir sayfa tika basa, sonraki bombos"
// gorunumu matematiksel olarak elenir.
//
// ============================ BIZIM EKLEDIGIMIZ ============================
//
// KAYDIRMA PENCERESI. Kuresel yeniden siralama yapilsaydi defterin sonundaki bir
// dilek birinci sayfaya sicrayabilirdi - cift bunu "sistem defterimi karistirdi"
// diye okur. Bunun yerine: bir sayfada bosluk kalinca YAKIN KOMSULAR arasindan
// (en fazla PencereBoyu kadar ileri bakarak) o bosluga en iyi oturan secilir.
// Sira buyuk olcude korunur, yalnizca yakin takaslar olur.
//
// Gercek defterde olculdu: 9 sayfa -> 8 sayfa, kotuluk 176k -> 54k, en kotu
// bosluk %76 -> %23.
//
// SABITLEME (pin): kullanici bir dilegi ELLE tasidiysa o dilek sabitlenir;
// eniyileme ona DOKUNMAZ, yalnizca aralardaki bosluklari diger dileklerle
// doldurur. Kullanici istedigi yeri korur, gerisi kendiliginden duzelir.
//
// ============================ OLCUM ============================
//
// Gercek metin olcumu: defterin bastigi AYNI font dosyasi, AYNI punto, fontun
// KENDI karakter genislikleri (bkz. FontOlcusu). Kelime kelime sarma yapilir.
// Emoji artik goruntudur (bkz. EmojiServisi): genisligi sabittir.
//
// GUVENLI-BASARISIZ: olcum kurulamazsa Kullanilabilir=false doner ve cagiran
// taraf ESKI AKISA devam eder. Sessizce yanlis olcup bozuk defter uretmektense
// hic calismamak yegdir.
public static class SayfaPaketleyici
{
    // Kart ic olculeri - BaskiServisi'ndeki cizimle AYNI degerler.
    private const float IcerikGenisligi = 294f;
    private const float MetinPunto = 10.5f;
    private const float SatirAraligi = 1.72f;
    private const float KartDolgu = 13f;
    private const float FotoAltBosluk = 13f;
    private const float FotoMat = 3.5f;
    private const float ImzaBlogu = 54f;
    private const float KartArasi = 16f;

    // Ne kadar ileri bakilir. Buyuk deger daha iyi doldurur ama sirayi daha cok
    // bozar; 20, "yakin komsu" hissini korurken bosluklari kapatmaya yeter.
    private const int PencereBoyu = 20;

    // "…devami var" / "…devami" satiri (ince, italik) - bolunmus kartin isareti.
    private const float DevamSatiri = 20f;

    // ESNEKLIK (TeX'in "glue" fikri). Her ogenin dogal boyutu yaninda bir BUZULME
    // payi vardir; dizgi motoru sayfayi doldururken bu payi kullanir.
    //
    // Bizde buzulen tek sey FOTOGRAF olcegidir - tipografiye DOKUNULMAZ. Sayfadan
    // sayfaya degisen punto, bir kitapta amatorlugun en gorunur isaretidir.
    //
    // Olcek defterin TAMAMI icin TEKTIR: fotograflar birbirine gore tutarli kalir.
    // %85 alt sinir, "fark edilmeyen kucultme" ile "fotograf kuculmus" arasindaki
    // esiktir; altina inmek kaliteyi satmak olur.
    private static readonly float[] OlcekAdaylari = { 1.00f, 0.95f, 0.90f, 0.85f };

    // ---- SONUC TIPLERI ----

    // Bir kartin sayfadaki parcasi. Normal dilek TEK parcadir; sayfaya sigmayan
    // uzun dilek CUMLE SINIRINDA bolunur ve birden cok parca olur.
    public sealed record KartParcasi(
        int DilekIndeksi,
        string Metin,
        bool FotoGoster,   // fotograf yalniz ILK parcada
        bool ImzaGoster,   // imza blogu yalniz SON parcada
        bool DevamEdiyor,  // altta ince "devami var" satiri
        bool DevamiDir,    // ustte ince "devami" satiri
        // FOTOGRAF OLCEGI (1.0 = dokunulmamis). Defterin TAMAMI icin tek deger
        // kullanilir - fotograflar sayfadan sayfaya farkli boyda gorunmez.
        float FotoOlcek = 1f);

    public sealed record SayfaPlani(
        int No,
        IReadOnlyList<int> DilekIndeksleri,
        IReadOnlyList<KartParcasi> Parcalar,
        float DoluYukseklik,
        float BosYukseklik);

    public sealed record Yerlesim(
        bool Kullanilabilir,
        IReadOnlyList<SayfaPlani> Sayfalar,
        IReadOnlyDictionary<int, int> DilekSayfasi,
        // Akilli yerlesim sirayi degistirdi mi? (arayuzdeki zarif uyari bunu kullanir)
        bool YenidenSiralandi,
        // Defterin tamaminda kullanilan fotograf olcegi (1.0 = dokunulmadi).
        float FotoOlcek,
        // Iki sayfaya tasan dilekler: indeks -> tek sayfaya sigmasi icin gereken
        // olcek (null ise makul sinirda sigdirilamiyor). Arayuzdeki
        // "Tek sayfaya sigdir" dugmesi YALNIZ burada karsiligi olanlarda gorunur -
        // isleyemeyecek bir dugme gostermek, guveni yikan seydir.
        IReadOnlyDictionary<int, float> TekSayfaCaresi,
        string? Not);

    private static readonly Yerlesim Bos =
        new(false, Array.Empty<SayfaPlani>(), new Dictionary<int, int>(), false, 1f,
            new Dictionary<int, float>(), "olcum kurulamadi");

    // ---- ANA GIRIS ----
    //
    // akilli  : true  -> pencereli eniyileme (sira gerektiginde takas edilir)
    //           false -> sira KORUNUR, yalniz kirma noktalari eniyilenir
    // sabitler: elle tasinmis (pinlenmis) dilek indeksleri - yerleri korunur
    public static Yerlesim Paketle(
        IReadOnlyList<BaskiServisi.Dilek> dilekler,
        string fontKok,
        float sayfaYuksekligi,
        bool akilli = true,
        ISet<int>? sabitler = null)
    {
        if (dilekler.Count == 0)
            return new Yerlesim(true, Array.Empty<SayfaPlani>(), new Dictionary<int, int>(), false, 1f,
                new Dictionary<int, float>(), "dilek yok");

        var olcu = FontOlcusu.Yukle(Path.Combine(fontKok, "Inter-Regular.ttf"));
        if (olcu == null) return Bos with { Not = "font olcusu okunamadi" };

        try
        {
            // 1) ESNEKLIK ARAMASI - her olcek adayi icin bir kez yerlesim kurulur,
            // en iyisi secilir. Kazanc yoksa olcek 1.0'da KALIR: gereksiz yere
            // fotograf kucultmeyiz.
            var sabitKumeOn = sabitler ?? new HashSet<int>();
            float[] yukseklikler = Array.Empty<float>();
            List<List<int>> sayfalar = new();
            var secilenOlcek = 1f;
            var enIyiPuan = double.MaxValue;

            foreach (var olcek in OlcekAdaylari)
            {
                var y = new float[dilekler.Count];
                for (var i = 0; i < dilekler.Count; i++)
                    y[i] = KartYuksekligi(dilekler[i], olcu, olcek);

                var s = akilli
                    ? PencereliYerlesim(y, sayfaYuksekligi, sabitKumeOn, new HashSet<int>())
                    : SiraliYerlesim(y, sayfaYuksekligi);

                // Puan: once SAYFA SAYISI, sonra kotuluk (bosluk karelerinin toplami).
                // Olcek 1.0 esitlikte KAZANIR - kucultme ancak gercek kazanc varsa.
                var kotuluk = 0.0;
                for (var k = 0; k < s.Count - 1; k++)
                {
                    var bos = sayfaYuksekligi - s[k].Sum(i => y[i]);
                    if (bos > 0) kotuluk += bos * bos;
                }
                var puan = s.Count * 1_000_000.0 + kotuluk;

                if (puan < enIyiPuan - 0.5)
                {
                    enIyiPuan = puan; secilenOlcek = olcek;
                    yukseklikler = y; sayfalar = s;
                }
            }

            // 2) SAYFAYA SIGMAYAN DILEKLER - cumle sinirinda bolunur.
            //
            // Onceden bu kartlar QuestPDF'in akisina birakiliyordu ve sayfa CUMLE
            // ORTASINDAN kesiliyordu (canlida: 474pt'lik iki kart). Olcum artik
            // kesin oldugu icin kesme noktasini BIZ secebiliyoruz.
            var parcaliDilekler = new Dictionary<int, List<KartParcasi>>();
            for (var i = 0; i < dilekler.Count; i++)
            {
                if (yukseklikler[i] <= sayfaYuksekligi) continue;
                var parcalar = CumleSinirindaBol(i, dilekler[i], olcu, sayfaYuksekligi, secilenOlcek);
                if (parcalar.Count > 1) parcaliDilekler[i] = parcalar;
            }

            // 3) Bolunmus dilekler kendi sayfalarini alacak sekilde yerlesimi tazele.
            var sabitKume = sabitler ?? new HashSet<int>();
            if (parcaliDilekler.Count > 0)
            {
                sayfalar = akilli
                    ? PencereliYerlesim(yukseklikler, sayfaYuksekligi, sabitKume,
                        parcaliDilekler.Keys.ToHashSet())
                    : SiraliYerlesim(yukseklikler, sayfaYuksekligi);
            }

            // 4) TEK SAYFAYA SIGDIRMA CARESI - hangi tasan dilek, fotografi bir miktar
            // kucultulerek tek sayfaya sigar? Arayuzdeki dugme YALNIZ bunlarda cikar;
            // isleyemeyecek bir dugme gostermek guveni yikar.
            var careler = new Dictionary<int, float>();
            foreach (var i in parcaliDilekler.Keys)
            {
                if (dilekler[i].Foto == null) continue; // fotografsizda care yok
                foreach (var olcek in OlcekAdaylari)
                {
                    if (olcek >= secilenOlcek) continue;
                    if (KartYuksekligi(dilekler[i], olcu, olcek) <= sayfaYuksekligi)
                    {
                        careler[i] = olcek; break;
                    }
                }
            }

            // 3) Sira degisti mi? (dilekler ardisik gelmiyorsa evet)
            var duzSira = sayfalar.SelectMany(s => s).ToList();
            var siraDegisti = false;
            for (var i = 0; i < duzSira.Count; i++)
                if (duzSira[i] != i) { siraDegisti = true; break; }

            // 4) Plana cevir
            var planlar = new List<SayfaPlani>();
            var esleme = new Dictionary<int, int>();
            var no = 1;
            foreach (var sayfa in sayfalar)
            {
                // Sayfada BOLUNMUS bir dilek varsa, onun her parcasi kendi sayfasini
                // alir: bir dilegin devami baska bir dilekle ayni sayfada karismaz.
                var bolunmus = sayfa.FirstOrDefault(i => parcaliDilekler.ContainsKey(i), -1);
                if (bolunmus >= 0 && sayfa.Count == 1)
                {
                    foreach (var parca in parcaliDilekler[bolunmus])
                    {
                        esleme[bolunmus] = esleme.TryGetValue(bolunmus, out var v) ? v : no;
                        planlar.Add(new SayfaPlani(
                            no, new[] { bolunmus }, new[] { parca }, sayfaYuksekligi, 0f));
                        no++;
                    }
                    continue;
                }

                var dolu = sayfa.Sum(i => yukseklikler[i]);
                var tekParcalar = sayfa
                    .Select(i => new KartParcasi(
                        i, BaskiServisi.MetinBicimle(dilekler[i].Mesaj), true, true, false, false, secilenOlcek))
                    .ToList();
                foreach (var i in sayfa) esleme[i] = no;
                planlar.Add(new SayfaPlani(no, sayfa, tekParcalar, dolu,
                    Math.Max(0f, sayfaYuksekligi - dolu)));
                no++;
            }

            return new Yerlesim(true, planlar, esleme, siraDegisti, secilenOlcek, careler, null);
        }
        catch (Exception ex)
        {
            return Bos with { Not = "olcum hatasi: " + ex.Message };
        }
    }

    // ---- SIRALI YERLESIM (sira korunur) ----
    //
    // Kirma noktalari DINAMIK PROGRAMLAMA ile eniyilenir: tum olasi bolunmeler
    // degerlendirilip kotuluk toplami en dusuk olan secilir. Yaklasik degil,
    // matematiksel EN IYI - ve 1000 dilekte bile milisaniyeler surer.
    //
    // SON SAYFA CEZALANDIRILMAZ (TeX''in kurali): defterin son sayfasinin yarim
    // kalmasi dogaldir, onu doldurmaya calismak digerlerini bozar.
    private static List<List<int>> SiraliYerlesim(float[] h, float H)
    {
        var n = h.Length;
        var maliyet = new double[n + 1];
        var onceki = new int[n + 1];
        for (var i = 1; i <= n; i++) maliyet[i] = double.MaxValue;

        for (var i = 1; i <= n; i++)
        {
            var dolu = 0f;
            for (var j = i; j >= 1; j--)
            {
                dolu += h[j - 1];
                // Sayfaya sigmiyor: daha geriye gitmenin anlami yok.
                // (Tek basina sigmayan kart yine de kendi sayfasina konur.)
                if (dolu > H && j != i) break;
                if (maliyet[j - 1] == double.MaxValue) continue;

                var bos = H - dolu;
                var ceza = i == n ? 0.0 : (bos < 0 ? 0.0 : bos * bos);
                var toplam = maliyet[j - 1] + ceza;
                if (toplam < maliyet[i]) { maliyet[i] = toplam; onceki[i] = j - 1; }
            }
        }

        var sayfalar = new List<List<int>>();
        var son = n;
        while (son > 0)
        {
            var bas = onceki[son];
            sayfalar.Add(Enumerable.Range(bas, son - bas).ToList());
            son = bas;
        }
        sayfalar.Reverse();
        return sayfalar;
    }

    // ---- PENCERELI YERLESIM (akilli) ----
    //
    // Sayfa doldurulurken, kalan bosluga en iyi oturan dilek YAKIN PENCEREDEN
    // secilir. Sabitlenmis dilek sirasi geldiginde MUTLAKA o konur - kullanicinin
    // elle verdigi karar her seyin onundedir.
    private static List<List<int>> PencereliYerlesim(
        float[] h, float H, ISet<int> sabitler, ISet<int> bolunmusler)
    {
        var kalan = Enumerable.Range(0, h.Length).ToList();
        var sayfalar = new List<List<int>>();
        var suAnki = new List<int>();
        var dolu = 0f;

        while (kalan.Count > 0)
        {
            // HER SAYFA SIRADAKI DILEKLE BASLAR.
            //
            // Bu kural sirayi koruyan seydir. Bos sayfada da "en iyi oturani ara"
            // deseydik, sayfaya tek basina sigmayan buyuk kartlar surekli atlanip
            // defterin SONUNA birikirdi (olculdu: 1. dilek 7. sayfaya duser).
            // Simdi kayma yalnizca "bosluga alinan komsu" kadardir.
            if (suAnki.Count == 0)
            {
                var bas = kalan[0];
                kalan.RemoveAt(0);
                suAnki.Add(bas);
                dolu += h[bas];
                // Bolunmus dilek KENDI sayfalarini alir - yanina baska dilek gelmez.
                if (bolunmusler.Contains(bas))
                {
                    sayfalar.Add(suAnki); suAnki = new List<int>(); dolu = 0f;
                }
                continue;
            }

            // Sabitlenmis dilek sirada mi? Pazarlik yok - kullanicinin elle verdigi
            // karar her seyin onundedir.
            var ilk = kalan[0];
            if (sabitler.Contains(ilk))
            {
                if (dolu + h[ilk] > H)
                {
                    sayfalar.Add(suAnki); suAnki = new List<int>(); dolu = 0f;
                    continue;
                }
                suAnki.Add(ilk); dolu += h[ilk]; kalan.RemoveAt(0);
                continue;
            }

            // Kalan bosluga en iyi oturan dilek - YAKIN PENCEREDEN.
            var enIyi = -1; var enIyiYukseklik = -1f;
            var sinir = Math.Min(PencereBoyu, kalan.Count);
            for (var k = 0; k < sinir; k++)
            {
                var i = kalan[k];
                // Sabitlenmisin OTESINE gecmeyiz: yeri korunmali.
                if (sabitler.Contains(i)) break;
                if (dolu + h[i] > H) continue;
                if (h[i] > enIyiYukseklik) { enIyiYukseklik = h[i]; enIyi = k; }
            }

            if (enIyi < 0)
            {
                // Bosluga hicbiri sigmadi: sayfayi kapat.
                sayfalar.Add(suAnki); suAnki = new List<int>(); dolu = 0f;
                continue;
            }

            var secilen = kalan[enIyi];
            kalan.RemoveAt(enIyi);
            suAnki.Add(secilen);
            dolu += h[secilen];
        }

        if (suAnki.Count > 0) sayfalar.Add(suAnki);
        return sayfalar;
    }

    // ---- CUMLE SINIRINDA BOLME ----
    //
    // Sayfaya sigmayan dilek, CUMLE bittigi yerden bolunur. Bir ani defterinde
    // cumle ortasindan kesilen metin, okuru cumleyi bastan kurmaya zorlar; kagitta
    // bu bir kusurdur. Devami olan sayfa altta "…devami var", devam sayfasi ustte
    // "…devami" ile isaretlenir - okur nerede kaldigini KAYBETMEZ.
    //
    // Fotograf yalniz ILK parcada, imza blogu yalniz SON parcada gorunur:
    // bir dilek iki kez imzalanmis gibi durmamalidir.
    private static List<KartParcasi> CumleSinirindaBol(
        int indeks, BaskiServisi.Dilek d, FontOlcusu olcu, float H, float fotoOlcek)
    {
        var metin = BaskiServisi.MetinBicimle(d.Mesaj);
        var parcalar = new List<KartParcasi>();

        // Ilk sayfada metne kalan yer: fotograf + dolgu + "devami var" satiri dusulur.
        var fotoYuksekligi = 0f;
        if (d.Foto != null)
        {
            var (_, fy) = BaskiServisi.FotoOlcusu(d.FotoGenislik, d.FotoYukseklik, fotoOlcek);
            fotoYuksekligi = fy + FotoMat * 2 + FotoAltBosluk;
        }

        var kalanMetin = metin;
        var ilk = true;

        // Guvenlik siniri: her tur metni KISALTMAK zorunda; kisaltamiyorsa dongu biter.
        for (var tur = 0; tur < 50 && kalanMetin.Length > 0; tur++)
        {
            var ustPay = KartDolgu * 2 + KartArasi
                         + (ilk ? fotoYuksekligi : DevamSatiri);
            // Son parca olabilir mi? (imza sigiyorsa)
            var sonPayi = ImzaBlogu;
            var devamPayi = DevamSatiri;

            // Once "bu parca SON olabilir mi" denenir - bolmemek her zaman yegdir.
            if (MetinYuksekligi(kalanMetin, olcu) + ustPay + sonPayi <= H)
            {
                parcalar.Add(new KartParcasi(
                    indeks, kalanMetin, ilk, true, false, !ilk, fotoOlcek));
                return parcalar;
            }

            var kullanilabilir = H - ustPay - devamPayi;
            var kesme = KesmeNoktasi(kalanMetin, olcu, kullanilabilir);
            if (kesme <= 0 || kesme >= kalanMetin.Length)
            {
                // Bolunemedi (tek dev cumle): oldugu gibi birak, QuestPDF akista boler.
                parcalar.Add(new KartParcasi(indeks, kalanMetin, ilk, true, false, !ilk, fotoOlcek));
                return parcalar;
            }

            parcalar.Add(new KartParcasi(
                indeks, kalanMetin[..kesme].TrimEnd(), ilk, false, true, !ilk, fotoOlcek));
            kalanMetin = kalanMetin[kesme..].TrimStart();
            ilk = false;
        }

        if (kalanMetin.Length > 0)
            parcalar.Add(new KartParcasi(indeks, kalanMetin, false, true, false, true, fotoOlcek));

        return parcalar;
    }

    // Verilen yukseklige sigan EN UZUN metin parcasinin bitis konumu.
    // Once CUMLE sinirlari denenir; hicbiri sigmazsa kelime sinirina duser.
    private static int KesmeNoktasi(string metin, FontOlcusu olcu, float kullanilabilir)
    {
        if (kullanilabilir <= 0) return 0;

        // Cumle sinirlari: . ! ? … ardindan bosluk gelen konumlar.
        var sinirlar = new List<int>();
        for (var i = 0; i < metin.Length - 1; i++)
        {
            var c = metin[i];
            if (c is '.' or '!' or '?' or '\u2026' && char.IsWhiteSpace(metin[i + 1]))
                sinirlar.Add(i + 1);
        }

        var enIyi = 0;
        foreach (var sinir in sinirlar)
        {
            if (MetinYuksekligi(metin[..sinir], olcu) <= kullanilabilir) enIyi = sinir;
            else break;
        }
        if (enIyi > 0) return enIyi;

        // Cumle siniri sigmadi: kelime sinirina dus (tek uzun cumle durumu).
        var sonBosluk = 0;
        for (var i = 0; i < metin.Length; i++)
        {
            if (!char.IsWhiteSpace(metin[i])) continue;
            if (MetinYuksekligi(metin[..i], olcu) <= kullanilabilir) sonBosluk = i;
            else break;
        }
        return sonBosluk;
    }

    // ---- TEK KARTIN YUKSEKLIGI ----
    // BaskiServisi.DilekKarti'nin cizdigi sirayla, AYNI bilesenlerle.
    public static float KartYuksekligi(BaskiServisi.Dilek d, FontOlcusu olcu, float fotoOlcek = 1f)
    {
        var yukseklik = 0f;

        if (d.Foto != null)
        {
            var (_, fy) = BaskiServisi.FotoOlcusu(d.FotoGenislik, d.FotoYukseklik, fotoOlcek);
            yukseklik += fy + FotoMat * 2 + FotoAltBosluk;
        }

        yukseklik += KartDolgu * 2;
        yukseklik += MetinYuksekligi(BaskiServisi.MetinBicimle(d.Mesaj), olcu);
        yukseklik += ImzaBlogu;
        yukseklik += KartArasi;

        return yukseklik;
    }

    // ---- METIN YUKSEKLIGI - GERCEK OLCUM ----
    // Kelime kelime sarma; "karakter sayisi / ortalama genislik" tahmini YOK.
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

            foreach (var p in EmojiServisi.Ayristir(paragraf))
            {
                if (p.EmojiAnahtar != null)
                {
                    if (satirGenislik + emojiGenislik > IcerikGenisligi && satirGenislik > 0)
                    {
                        satirSayisi++; satirGenislik = 0f;
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

                    // Tek basina satira sigmayan kelime (uzun url gibi) karakter
                    // karakter kirilir - sonsuz donguye girmez.
                    if (genislik > IcerikGenisligi)
                    {
                        satirSayisi += (int)Math.Ceiling(genislik / IcerikGenisligi) - 1;
                        satirGenislik = genislik % IcerikGenisligi;
                        continue;
                    }

                    if (satirGenislik + genislik > IcerikGenisligi && satirGenislik > 0)
                    {
                        satirSayisi++; satirGenislik = 0f;
                    }
                    satirGenislik += genislik;
                }
            }

            toplamSatir += satirSayisi;
        }

        return toplamSatir * satirYuksekligi;
    }
}
