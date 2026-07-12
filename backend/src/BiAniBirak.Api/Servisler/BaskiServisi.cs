using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace BiAniBirak.Api.Servisler;

// BASKIYA HAZIR DEFTER - eserin kendisi.
//
// TASARIM ILKELERI (onceki dizginin kusurlarindan ogrenildi):
//
//  1. SAHIPLIK NET OLMALI. Onceki dizgide fotograf dilegin ustunde, imza altinda
//     duruyordu; okuyan "bu fotograf hangi dilege ait?" diye durakliyordu. Cozum:
//     her dilek KAPALI BIR KART. Fotograf, metin ve imza ayni cercevede - sahiplik
//     bir bakista anlasilir.
//
//  2. FOTOGRAF BUYUK VE ORANINA SADIK. Cerceve fotografa uyar, fotograf cerceveye
//     zorlanmaz. Kutu orani fotografin oranina ESIT kurulur - yanda beyaz bosluk
//     KALMAZ (onceki surumun en bariz kusuru buydu). Olcu, fotografin kendi
//     baytlarindan okunur; istemciye guvenilmez.
//
//  3. SUSLEME TASIYICI OLMALI, DEKOR DEGIL. Ayraclar sayfayi bolumler, goze
//     duraklama noktasi verir. Tema degisince susleme dili de degisir.
//
//  4. TIPOGRAFI SESSIZ OLMALI. Fraunces yalniz baslik/imza; Inter govde metni.
//     Hiyerarsi net, satir araligi genis - goz yorulmadan sayfalarca okur.
public static class BaskiServisi
{
    // Baski paleti - kagit icin secildi, ekran icin degil
    private const string MurekkepYumusak = "#3A2F28";
    private const string Sarap = "#6E2438";
    private const string Yaldiz = "#A8823C";
    private const string YaldizSolgun = "#C9A96A";
    private const string Ikincil = "#6C5F50";
    private const string Kagit = "#FDF9F0";
    private const string KartYuzey = "#FFFDF8";  // karti kagittan bir tik ayirir
    private const string KartHat = "#E8DCC4";

    private const string BaslikFont = "Fraunces Basli";
    private const string GovdeFont = "Inter Govde";

    private static bool _hazir;
    private static readonly object _kilit = new();

    public static void Hazirla(string kokDizin)
    {
        if (_hazir) return;
        lock (_kilit)
        {
            if (_hazir) return;
            QuestPDF.Settings.License = LicenseType.Community;

            var fontDizin = Path.Combine(kokDizin, "Varliklar", "Fontlar");
            if (Directory.Exists(fontDizin))
            {
                foreach (var yol in Directory.GetFiles(fontDizin, "*.ttf"))
                {
                    using var akis = File.OpenRead(yol);
                    QuestPDF.Drawing.FontManager.RegisterFont(akis);
                }
            }
            _hazir = true;
        }
    }

    // ---------------- VERI ----------------
    public sealed record Dilek(
        string DavetliAd,
        string Iliski,
        string Mesaj,
        string KaynakEs,
        DateTimeOffset Birakilma,
        byte[]? Foto,
        int FotoGenislik,
        int FotoYukseklik);

    public sealed record Gorsel(byte[] Veri, int Genislik, int Yukseklik);

    public sealed record EserVerisi(
        string Tema,
        string GruplamaTipi,
        string KapakBaslik,
        string KapakAltBaslik,
        string? IthafMetni,
        string? KapanisMetni,
        bool TarihGoster,
        string Es1Ad,
        string Es2Ad,
        IReadOnlyList<Dilek> Dilekler,
        Gorsel? KapakGorseli,
        Gorsel? IthafGorseli,
        Gorsel? KapanisGorseli,
        IReadOnlyList<Gorsel> BolumGorselleri);

    // ---------------- OLCU MANTIGI ----------------
    private enum Yon { Yatay, Kare, Dikey }

    private static Yon YonBul(int g, int y)
    {
        if (g <= 0 || y <= 0) return Yon.Yatay;
        var oran = (float)g / y;
        if (oran >= 1.15f) return Yon.Yatay;
        if (oran <= 0.87f) return Yon.Dikey;
        return Yon.Kare;
    }

    // Orana SADIK olculeme: fotograf hangi tavana once carparsa ona gore kucultulur.
    // Donen kutu, fotografin orani ile AYNI - bu yuzden icinde bosluk kalmaz.
    private static (float G, float Y) Olcule(int g, int y, float azamiG, float azamiY)
    {
        var oran = g > 0 && y > 0 ? (float)g / y : 3f / 2f;

        var gg = azamiG;
        var yy = gg / oran;

        if (yy > azamiY)
        {
            yy = azamiY;
            gg = yy * oran;
        }
        return (gg, yy);
    }

    // FOTOGRAF CERCEVESI: yaldiz hat + beyaz pasepartu (mat). Gercek bir albumde
    // fotograf boyle durur - "yapistirilmis" degil, CERCEVELENMIS.
    private static void Cerceveli(IContainer kap, byte[] veri, float g, float y, float mat = 4f)
    {
        kap.Width(g + mat * 2).Height(y + mat * 2)
            .Background("#FFFFFF")
            .Border(0.7f).BorderColor(Yaldiz)
            .Padding(mat)
            // ---- UseOriginalImage: CIFTE SIKISTIRMAYI ONLER ----
            //
            // QuestPDF varsayilan olarak her gorseli hedef DPI'ya gore YENIDEN
            // BOYUTLANDIRIR ve JPEG'e YENIDEN SIKISTIRIR (ImageRasterDpi=288,
            // ImageCompressionQuality=High).
            //
            // Bizim fotograflarimiz depoya girmeden ONCE zaten sikistiriliyor
            // (tarayicida 1600px / q88 JPEG). QuestPDF'in ikinci kez sikistirmasi
            // NESIL KAYBI uretir: sikistirilmisi yeniden sikistirmak, her seferinde
            // biraz daha bozar. Sonuc: baski PDF'inde yazilar kusursuz (onlar VEKTOR),
            // ama fotograflar yumusak ve artefaktli.
            //
            // UseOriginalImage, yeniden boyutlandirmayi ve sikistirmayi TAMAMEN
            // atlatir - kaynak veri oldugu gibi gomulur. Ikinci sikistirma HIC olmaz.
            //
            // ONIZLEMEYI BOZMAZ: onizleme sayfayi 96 DPI'da rasterize eder; gomulu
            // gorsel tam kalite olsa bile sayfa 96 DPI'ya duser. Paywall yerinde kalir.
            //
            // Depolama yuku YOK: fotograflar zaten diskte, PDF anlik uretilip
            // gonderiliyor - saklanmiyor. Artan tek sey indirilen dosyanin boyutu;
            // matbaaya giden bir eser icin bu kusur degil, GEREKLILIKTIR.
            .Image(veri).FitArea().UseOriginalImage();
    }

    // ---------------- BELGE ----------------
    // ODEME SONRASI: baskiya hazir PDF (300 DPI, tam kalite).
    public static byte[] DefterUret(EserVerisi eser)
        => DefterBelgesi(eser).GeneratePdf();

    // BELGE - hem PDF'e hem GORUNTUYE donusturulebilen ara form.
    //
    // FILIGRAN YOK. Onceki surumde satin alma oncesi "ONIZLEME" yazili PDF
    // indiriliyordu; bugun herhangi bir goruntu modeli o yaziyi saniyeler icinde
    // siler - ustelik silmeye bile gerek yok, dosya ZATEN elde.
    //
    // Yeni model: onizleme PDF DEGIL, 96 DPI goruntudur (OnizlemeServisi). Ayni
    // belgeden uretilir - yani cift, onizlemede tam olarak bastiracagi seyi gorur.
    // Fark yalniz cozunurluktedir: ekranda kusursuz, kagitta bulanik.
    //
    // Gormek bedava, BASMAK ucretli.
    public static IDocument DefterBelgesi(EserVerisi eser)
    {
        var belge = Document.Create(kapsayici =>
        {
            kapsayici.Page(sayfa =>
            {
                SayfaKur(sayfa, eser, altbilgi: false);
                sayfa.Content().Element(k => Kapak(k, eser));
            });

            if (!string.IsNullOrWhiteSpace(eser.IthafMetni) || eser.IthafGorseli != null)
            {
                kapsayici.Page(sayfa =>
                {
                    SayfaKur(sayfa, eser, altbilgi: false);
                    sayfa.Content().Element(k => Ithaf(k, eser));
                });
            }

            kapsayici.Page(sayfa =>
            {
                SayfaKur(sayfa, eser, altbilgi: true);
                sayfa.Content().Element(k => Dilekler(k, eser));
            });

            if (!string.IsNullOrWhiteSpace(eser.KapanisMetni) || eser.KapanisGorseli != null)
            {
                kapsayici.Page(sayfa =>
                {
                    SayfaKur(sayfa, eser, altbilgi: false);
                    sayfa.Content().Element(k => Kapanis(k, eser));
                });
            }
        });

        // ---- BELGE AYARLARI - BASKI STANDARDI ----
        //
        // QuestPDF varsayilanlari: ImageRasterDpi = 288, ImageCompressionQuality = High.
        //
        // Iki sorun vardi:
        //   1. 288 DPI, matbaanin istedigi 300 DPI'nin ALTINDA.
        //   2. "High" bile bir JPEG sikistirmasidir - zaten sikistirilmis kaynagi
        //      yeniden sikistirir (nesil kaybi).
        //
        // Fotograflar icin asil cozum UseOriginalImage (bkz. Cerceveli). Bu ayarlar
        // ONUN KAPSAMINA GIRMEYEN her sey icin ikinci savunma hatti: dinamik uretilen
        // ogeler, ileride eklenecek gorseller, kutuphanenin ic olceklemeleri.
        //
        // Onizlemeyi ETKILEMEZ: GenerateImages, ImageRasterDpi'yi kendi RasterDpi'siyla
        // (96) EZER - QuestPDF'in DocumentGenerator'i bunu acikca yapar. Yani onizleme
        // 96 DPI kalir, paywall yerinde durur.
        return belge.WithSettings(new DocumentSettings
        {
            ImageRasterDpi = BaskiDpi,
            ImageCompressionQuality = ImageCompressionQuality.Best,
        });
    }

    // Matbaa standardi. 288 (QuestPDF varsayilani) bunun altindadir.
    private const int BaskiDpi = 300;

    private static void SayfaKur(PageDescriptor sayfa, EserVerisi eser, bool altbilgi)
    {
        sayfa.Size(PageSizes.A5);
        sayfa.MarginTop(18, Unit.Millimetre);
        sayfa.MarginBottom(16, Unit.Millimetre);
        sayfa.MarginLeft(20, Unit.Millimetre);   // cilt payi
        sayfa.MarginRight(15, Unit.Millimetre);
        sayfa.PageColor(Kagit);
        sayfa.DefaultTextStyle(x =>
            x.FontFamily(GovdeFont).FontSize(10).FontColor(MurekkepYumusak));

        if (altbilgi)
        {
            // Sayfa numarasi: yaldiz hatlar arasinda - kitap hissi
            sayfa.Footer().PaddingTop(10).AlignCenter().Row(satir =>
            {
                satir.AutoItem().PaddingTop(5).Width(16).Height(0.5f).Background(YaldizSolgun);
                satir.AutoItem().PaddingHorizontal(9).Text(t =>
                {
                    t.DefaultTextStyle(x =>
                        x.FontFamily(BaslikFont).FontSize(8.5f).FontColor(Ikincil));
                    t.CurrentPageNumber();
                });
                satir.AutoItem().PaddingTop(5).Width(16).Height(0.5f).Background(YaldizSolgun);
            });
        }

    }

    // ---------------- SUSLEME ----------------
    // Tema, susleme DILINI degistirir: klasik simetrik ve toren gibi; zarif ince ve
    // sessiz; modern tek hat, kararli.
    private static void Ayrac(IContainer kap, string tema, float genislik = 60)
    {
        switch (tema)
        {
            case "klasik":
                kap.AlignCenter().Row(r =>
                {
                    r.AutoItem().PaddingTop(4).Width(genislik / 2 - 9).Height(0.7f)
                        .Background(Yaldiz);
                    r.AutoItem().PaddingHorizontal(6).Text("◆").FontSize(5.5f).FontColor(Yaldiz);
                    r.AutoItem().PaddingTop(4).Width(genislik / 2 - 9).Height(0.7f)
                        .Background(Yaldiz);
                });
                break;

            case "zarif":
                kap.AlignCenter().Column(c =>
                {
                    c.Item().AlignCenter().Width(genislik).Height(0.5f).Background(Yaldiz);
                    c.Item().Height(2.5f);
                    c.Item().AlignCenter().Width(genislik * 0.42f).Height(0.5f)
                        .Background(YaldizSolgun);
                });
                break;

            default: // modern - tek kararli hat
                kap.AlignCenter().Width(genislik * 0.5f).Height(1.4f).Background(Yaldiz);
                break;
        }
    }

    // ---------------- KAPAK ----------------
    private static void Kapak(IContainer kap, EserVerisi eser)
    {
        var italik = eser.Tema == "zarif";

        kap.Column(sutun =>
        {
            // KAPAK FOTOGRAFI - buyuk, orana sadik, merkezde
            if (eser.KapakGorseli != null)
            {
                var kg = eser.KapakGorseli;
                var (g, y) = Olcule(kg.Genislik, kg.Yukseklik, azamiG: 296f, azamiY: 258f);

                sutun.Item().Height(2);
                sutun.Item().AlignCenter().Element(c => Cerceveli(c, kg.Veri, g, y, mat: 5f));
                sutun.Item().Height(26);
            }
            else
            {
                sutun.Item().Height(74);
            }

            sutun.Item().Element(c => Ayrac(c, eser.Tema, 70));
            sutun.Item().Height(24);

            sutun.Item().AlignCenter().Text(eser.KapakBaslik)
                .FontFamily(BaslikFont).FontSize(30).FontColor(Sarap).Italic(italik);

            sutun.Item().Height(11);

            sutun.Item().AlignCenter().Text(eser.KapakAltBaslik.ToUpperInvariant())
                .FontFamily(GovdeFont).FontSize(8).FontColor(Ikincil).LetterSpacing(0.24f);

            sutun.Item().Height(48);

            sutun.Item().AlignCenter().Column(marka =>
            {
                marka.Item().AlignCenter().Text("Bi Anı Bırak")
                    .FontFamily(BaslikFont).FontSize(13).FontColor(Sarap);
                marka.Item().Height(3);
                marka.Item().AlignCenter().Text("SENDEN BİZE KALAN")
                    .FontFamily(GovdeFont).FontSize(6).FontColor(Yaldiz).LetterSpacing(0.3f);
            });
        });
    }

    // ---------------- ITHAF ----------------
    private static void Ithaf(IContainer kap, EserVerisi eser)
    {
        var italik = eser.Tema == "zarif";

        kap.AlignMiddle().Column(sutun =>
        {
            if (eser.IthafGorseli != null)
            {
                var ig = eser.IthafGorseli;
                var (g, y) = Olcule(ig.Genislik, ig.Yukseklik, azamiG: 276f, azamiY: 208f);
                sutun.Item().AlignCenter().Element(c => Cerceveli(c, ig.Veri, g, y));
                sutun.Item().Height(26);
            }

            sutun.Item().Element(c => Ayrac(c, eser.Tema, 50));
            sutun.Item().Height(22);

            if (!string.IsNullOrWhiteSpace(eser.IthafMetni))
            {
                sutun.Item().PaddingHorizontal(6).AlignCenter().Text(eser.IthafMetni)
                    .FontFamily(GovdeFont).FontSize(11).LineHeight(1.8f)
                    .FontColor(MurekkepYumusak).Italic(italik);
                sutun.Item().Height(22);
            }

            sutun.Item().Element(c => Ayrac(c, eser.Tema, 50));
            sutun.Item().Height(18);

            sutun.Item().AlignCenter().Text($"{eser.Es1Ad} & {eser.Es2Ad}")
                .FontFamily(BaslikFont).FontSize(13).FontColor(Sarap);
        });
    }

    // ---------------- DILEKLER ----------------
    private static void Dilekler(IContainer kap, EserVerisi eser)
    {
        var bloklar = new List<(string? Baslik, List<Dilek> Dilekler)>();

        if (eser.GruplamaTipi == "taraf")
        {
            var es1 = eser.Dilekler.Where(d => d.KaynakEs == "es1").ToList();
            var es2 = eser.Dilekler.Where(d => d.KaynakEs == "es2").ToList();
            if (es1.Count > 0) bloklar.Add(($"{eser.Es1Ad} tarafından", es1));
            if (es2.Count > 0) bloklar.Add(($"{eser.Es2Ad} tarafından", es2));
            if (bloklar.Count == 0) bloklar.Add((null, eser.Dilekler.ToList()));
        }
        else
        {
            bloklar.Add((null, eser.Dilekler.ToList()));
        }

        kap.Column(sutun =>
        {
            var bolumSirasi = 0;

            foreach (var (baslik, dilekler) in bloklar)
            {
                if (baslik != null)
                {
                    // Bolum ayraci gorseli - bolume nefes verir
                    if (bolumSirasi < eser.BolumGorselleri.Count)
                    {
                        var bg = eser.BolumGorselleri[bolumSirasi];
                        var (g, y) = Olcule(bg.Genislik, bg.Yukseklik, azamiG: 276f, azamiY: 168f);
                        sutun.Item().PaddingTop(bolumSirasi > 0 ? 16 : 0).ShowEntire()
                            .AlignCenter().Element(c => Cerceveli(c, bg.Veri, g, y));
                    }
                    bolumSirasi++;

                    sutun.Item().PaddingTop(18).PaddingBottom(16).ShowEntire().Column(bs =>
                    {
                        bs.Item().AlignCenter().Text(baslik)
                            .FontFamily(BaslikFont).FontSize(16).FontColor(Sarap)
                            .Italic(eser.Tema == "zarif");
                        bs.Item().Height(9);
                        bs.Item().Element(c => Ayrac(c, eser.Tema, 56));
                    });
                }

                foreach (var d in dilekler)
                {
                    // Her dilek BOLUNMEZ (ShowEntire): sayfa ortasindan kesilmez.
                    sutun.Item().PaddingBottom(16).ShowEntire()
                        .Element(c => DilekKarti(c, d, eser));
                }
            }
        });
    }

    // DILEK KARTI - kapali birim.
    // Fotograf, metin ve imza AYNI cercevede durur; okuyan hangi fotografin hangi
    // dilege ait oldugunu DUSUNMEZ, gorur. Fotografsiz dilek cercevesiz akar -
    // sayfa gereksiz kutularla dolmaz, tipografi kendi basina tasir.
    private static void DilekKarti(IContainer kap, Dilek d, EserVerisi eser)
    {
        var italik = eser.Tema == "zarif";
        var fotoVar = d.Foto != null;

        var govde = fotoVar
            ? kap.Background(KartYuzey).Border(0.6f).BorderColor(KartHat).Padding(13)
            : kap.PaddingVertical(4);

        govde.Column(kart =>
        {
            if (fotoVar)
            {
                // BUYUK ve orana sadik. Dikey kare yukseklige, yatay kare genislige
                // yaslanir; ikisi de sayfada nefes alir, hicbiri deforme olmaz.
                var yon = YonBul(d.FotoGenislik, d.FotoYukseklik);
                var (azamiG, azamiY) = yon switch
                {
                    Yon.Dikey => (198f, 232f),
                    Yon.Kare => (216f, 216f),
                    _ => (268f, 182f),
                };
                var (fg, fy) = Olcule(d.FotoGenislik, d.FotoYukseklik, azamiG, azamiY);

                kart.Item().AlignCenter().Element(c => Cerceveli(c, d.Foto!, fg, fy, mat: 3.5f));
                kart.Item().Height(13);
            }

            kart.Item().AlignCenter().Text(d.Mesaj)
                .FontFamily(GovdeFont).FontSize(10.5f).LineHeight(1.72f)
                .FontColor(MurekkepYumusak).Italic(italik);

            kart.Item().Height(10);

            // IMZA BLOGU - ayracla metinden ayrilir; kime ait oldugu NET
            kart.Item().Element(c => Ayrac(c, eser.Tema, 34));
            kart.Item().Height(8);

            kart.Item().AlignCenter().Text(d.DavetliAd)
                .FontFamily(BaslikFont).FontSize(10.5f).FontColor(Sarap);

            if (!string.IsNullOrWhiteSpace(d.Iliski))
            {
                kart.Item().Height(3);
                kart.Item().AlignCenter().Text(d.Iliski)
                    .FontFamily(GovdeFont).FontSize(7.8f).FontColor(Ikincil)
                    .LetterSpacing(0.05f);
            }

            if (eser.TarihGoster)
            {
                kart.Item().Height(3);
                kart.Item().AlignCenter().Text(TarihMetni(d.Birakilma))
                    .FontFamily(GovdeFont).FontSize(6.8f).FontColor(YaldizSolgun);
            }
        });
    }

    // ---------------- KAPANIS ----------------
    private static void Kapanis(IContainer kap, EserVerisi eser)
    {
        var italik = eser.Tema == "zarif";

        kap.AlignMiddle().Column(sutun =>
        {
            if (!string.IsNullOrWhiteSpace(eser.KapanisMetni))
            {
                sutun.Item().PaddingHorizontal(6).AlignCenter().Text(eser.KapanisMetni)
                    .FontFamily(GovdeFont).FontSize(11).LineHeight(1.8f)
                    .FontColor(MurekkepYumusak).Italic(italik);
                sutun.Item().Height(28);
            }

            if (eser.KapanisGorseli != null)
            {
                var kg = eser.KapanisGorseli;
                var (g, y) = Olcule(kg.Genislik, kg.Yukseklik, azamiG: 276f, azamiY: 208f);
                sutun.Item().AlignCenter().Element(c => Cerceveli(c, kg.Veri, g, y));
                sutun.Item().Height(32);
            }

            sutun.Item().Element(c => Ayrac(c, eser.Tema, 44));
            sutun.Item().Height(18);

            sutun.Item().AlignCenter().Column(marka =>
            {
                marka.Item().AlignCenter().Text("Bi Anı Bırak")
                    .FontFamily(BaslikFont).FontSize(11).FontColor(Sarap);
                marka.Item().Height(2);
                marka.Item().AlignCenter().Text("SENDEN BİZE KALAN")
                    .FontFamily(GovdeFont).FontSize(5.5f).FontColor(Yaldiz).LetterSpacing(0.3f);
            });
        });
    }

    private static string TarihMetni(DateTimeOffset t)
    {
        var kultur = new System.Globalization.CultureInfo("tr-TR");
        return t.ToLocalTime().ToString("d MMMM yyyy", kultur);
    }
}
