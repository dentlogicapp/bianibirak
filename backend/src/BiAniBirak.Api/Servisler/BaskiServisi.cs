using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace BiAniBirak.Api.Servisler;

// BASKIYA HAZIR DEFTER (Belge 01: "Rakip ZIP verir; biz ESER uretiriz").
//
// TASARIM:
//  - Gercek tipografi: marka fontlari (Fraunces + Inter) PDF'e GOMULUR. Container'da
//    sistem fontu yok; gomme olmazsa Turkce karakterler bozulur ve eser coper.
//  - Baski paylari: A5 dikey, ic kenar (cilt payi) daha genis - gercek kitap olcusu.
//  - 3 editoryel sablon: klasik (ortali, susleme) / modern (sola yasli, ferah) /
//    zarif (italik, yaldiz vurgu).
//  - Filigran: satin alma oncesi onizleme (Belge 05 paywall matrisi).
public static class BaskiServisi
{
    // Marka paleti (baski - CMYK'ya yakin, ekran degil kagit icin secildi)
    private const string Murekkep = "#211A17";
    private const string MurekkepYumusak = "#3A2F28";
    private const string Sarap = "#6E2438";
    private const string Yaldiz = "#A8823C";
    private const string Ikincil = "#6C5F50";
    private const string Kagit = "#FDF9F0";

    private const string BaslikFont = "Fraunces Basli";
    private const string GovdeFont = "Inter Govde";

    private static bool _hazir;
    private static readonly object _kilit = new();

    // Fontlari bir kez kaydet (uygulama omru boyunca).
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

    // Esere girecek tek dilek
    public sealed record Dilek(
        string DavetliAd,
        string Iliski,        // "Gelinin universite arkadasi" - 20 yil sonra kim oldugunu hatirlatir
        string Mesaj,
        string KaynakEs,
        DateTimeOffset Birakilma,
        byte[]? Foto,         // davetli basina en fazla 1
        int FotoGenislik,
        int FotoYukseklik);

    // Cift gorseli (kapak/ithaf/bolum/kapanis)
    public sealed record Gorsel(byte[] Veri, string? Altyazi, int Genislik, int Yukseklik);

    // ---------------- CERCEVE MIMARISI ----------------
    // Bir fotografin oranini bilmeden dogru cerceve kurulamaz. Muze/albüm mantigi:
    // cerceve fotografin oranina UYAR, fotograf cerceveye zorlanmaz. Kirpma YOK -
    // davetlinin cektigi kare oldugu gibi kagida gecer (FitArea).
    private enum Yon { Yatay, Kare, Dikey }

    private static Yon YonBul(int g, int y)
    {
        if (g <= 0 || y <= 0) return Yon.Yatay; // olcu yoksa guvenli varsayilan
        var oran = (float)g / y;
        if (oran >= 1.2f) return Yon.Yatay;
        if (oran <= 0.85f) return Yon.Dikey;
        return Yon.Kare;
    }

    // Verilen YUKSEKLIK butcesine gore, orana saygili (genislik, yukseklik) dondurur.
    private static (float G, float Y) Olcule(int g, int y, float yukseklikButcesi, float azamiGenislik)
    {
        var oran = g > 0 && y > 0 ? (float)g / y : 4f / 3f;
        var yy = yukseklikButcesi;
        var gg = yy * oran;
        if (gg > azamiGenislik)
        {
            gg = azamiGenislik;
            yy = gg / oran;
        }
        return (gg, yy);
    }

    // MUZE CERCEVESI: ince yaldiz hat + beyaz pasepartu (mat) + ic golge hissi.
    // Photoshop/Canva'nin yaptigi "sticker" degil; gercek bir albumde fotograf boyle durur.
    private static void Cerceveli(IContainer kap, byte[] veri, float g, float y)
    {
        kap.Width(g).Height(y)
            .Border(0.7f).BorderColor(Yaldiz)   // yaldiz hat
            .Background("#FFFFFF")               // pasepartu
            .Padding(3.5f)                       // mat payi
            .Image(veri).FitArea();
    }

    // Eserin tum kurgusu
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
        // Cift gorselleri - YOKSA tipografik kapak yine de eser kalitesinde
        // (Musa: "Foto zenginlestirme, zorunluluk degil")
        Gorsel? KapakGorseli,
        Gorsel? IthafGorseli,
        Gorsel? KapanisGorseli,
        IReadOnlyList<Gorsel> BolumGorselleri,
        bool Filigranli);

    public static byte[] DefterUret(EserVerisi eser)
    {
        var belge = Document.Create(kapsayici =>
        {
            // --- KAPAK ---
            kapsayici.Page(sayfa =>
            {
                SayfaKur(sayfa, eser.Filigranli);
                sayfa.Content().Element(k => Kapak(k, eser));
            });

            // --- ITHAF ---
            if (!string.IsNullOrWhiteSpace(eser.IthafMetni))
            {
                kapsayici.Page(sayfa =>
                {
                    SayfaKur(sayfa, eser.Filigranli);
                    sayfa.Content().Element(k => Ithaf(k, eser));
                });
            }

            // --- DILEKLER (akan sayfalar; QuestPDF sayfa kirilimini kendi yonetir) ---
            kapsayici.Page(sayfa =>
            {
                SayfaKur(sayfa, eser.Filigranli);
                sayfa.Content().Element(k => Dilekler(k, eser));
                AltbilgiKur(sayfa);
            });

            // --- KAPANIS ---
            if (!string.IsNullOrWhiteSpace(eser.KapanisMetni) || eser.KapanisGorseli != null)
            {
                kapsayici.Page(sayfa =>
                {
                    SayfaKur(sayfa, eser.Filigranli);
                    sayfa.Content().Element(k => Kapanis(k, eser));
                });
            }
        });

        return belge.GeneratePdf();
    }

    // ---------- SAYFA ISKELETI ----------
    private static void SayfaKur(PageDescriptor sayfa, bool filigranli)
    {
        sayfa.Size(PageSizes.A5);
        // Baski paylari: ic kenar (cilt) genis, dis kenar dar - gercek kitap olcusu
        sayfa.MarginTop(20, Unit.Millimetre);
        sayfa.MarginBottom(18, Unit.Millimetre);
        sayfa.MarginLeft(22, Unit.Millimetre);
        sayfa.MarginRight(16, Unit.Millimetre);
        sayfa.PageColor(Kagit);
        sayfa.DefaultTextStyle(x => x.FontFamily(GovdeFont).FontSize(10).FontColor(MurekkepYumusak));

        if (filigranli)
        {
            // Onizleme filigrani (Belge 05: satin alma oncesi GORUR, indiremez).
            // Rotasyon KULLANILMIYOR - QuestPDF surumleri arasinda Rotate imzasi degisiyor;
            // filigranin gorevi caydiricilik, dekor degil. Sade ve garanti calisan yol.
            sayfa.Foreground().AlignCenter().AlignMiddle().Text("ÖNİZLEME")
                .FontFamily(BaslikFont).FontSize(56).FontColor("#6E243814");
        }
    }

    private static void AltbilgiKur(PageDescriptor sayfa)
    {
        sayfa.Footer().AlignCenter().Text(metin =>
        {
            metin.DefaultTextStyle(x => x.FontFamily(GovdeFont).FontSize(7).FontColor(Ikincil));
            metin.CurrentPageNumber();
        });
    }

    // ---------- KAPAK ----------
    private static void Kapak(IContainer kap, EserVerisi eser)
    {
        var ortali = eser.Tema != "modern";
        var italik = eser.Tema == "zarif";

        kap.Column(sutun =>
        {
            // KAPAK GORSELI (varsa): YARIM SAYFAYA yaklasan, oran-duyarli, muze cerceveli.
            // YOKSA: saf tipografik kapak - eser kalitesi dusmez (Musa karari).
            if (eser.KapakGorseli != null)
            {
                var kg = eser.KapakGorseli;
                var yon = YonBul(kg.Genislik, kg.Yukseklik);
                // Dikey fotograf kapakta gorkemlidir; yatay daha genis ama alcak durur.
                var butce = yon switch
                {
                    Yon.Dikey => 250f,
                    Yon.Kare => 220f,
                    _ => 185f,
                };
                var (g, y) = Olcule(kg.Genislik, kg.Yukseklik, butce, 300f);

                sutun.Item().Height(6);
                sutun.Item().AlignCenter().Element(c => Cerceveli(c, kg.Veri, g, y));
                sutun.Item().Height(24);
            }
            else
            {
                sutun.Item().Height(40);
            }

            // Ust susleme
            if (eser.Tema == "klasik")
            {
                sutun.Item().AlignCenter().Row(satir =>
                {
                    satir.AutoItem().Width(30).Height(1).Background(Yaldiz);
                    satir.AutoItem().PaddingHorizontal(6).PaddingTop(-3)
                        .Text("◆").FontSize(6).FontColor(Yaldiz);
                    satir.AutoItem().Width(30).Height(1).Background(Yaldiz);
                });
                sutun.Item().Height(28);
            }
            else if (eser.Tema == "zarif")
            {
                sutun.Item().Height(1).Background(Yaldiz);
                sutun.Item().Height(28);
            }

            // Baslik
            var baslikKap = ortali ? sutun.Item().AlignCenter() : sutun.Item();
            baslikKap.Text(eser.KapakBaslik)
                .FontFamily(BaslikFont).FontSize(30).FontColor(Sarap)
                .Italic(italik);

            sutun.Item().Height(10);

            var altKap = ortali ? sutun.Item().AlignCenter() : sutun.Item();
            altKap.Text(eser.KapakAltBaslik.ToUpperInvariant())
                .FontFamily(GovdeFont).FontSize(8).FontColor(Ikincil).LetterSpacing(0.22f);

            sutun.Item().Height(60);

            // Marka kilidi (tam lockup - miras ani)
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

    // ---------- ITHAF ----------
    private static void Ithaf(IContainer kap, EserVerisi eser)
    {
        var italik = eser.Tema == "zarif";

        kap.AlignMiddle().Column(sutun =>
        {
            if (eser.IthafGorseli != null)
            {
                var ig = eser.IthafGorseli;
                var (g, y) = Olcule(ig.Genislik, ig.Yukseklik,
                    YonBul(ig.Genislik, ig.Yukseklik) == Yon.Dikey ? 215f : 165f, 290f);
                sutun.Item().AlignCenter().Element(c => Cerceveli(c, ig.Veri, g, y));
                sutun.Item().Height(22);
            }

            sutun.Item().AlignCenter().Width(40).Height(1).Background(Yaldiz);
            sutun.Item().Height(22);

            sutun.Item().PaddingHorizontal(10).Text(eser.IthafMetni ?? "")
                .FontFamily(GovdeFont).FontSize(11).LineHeight(1.75f)
                .FontColor(MurekkepYumusak).Italic(italik);

            sutun.Item().Height(22);
            sutun.Item().AlignCenter().Width(40).Height(1).Background(Yaldiz);

            sutun.Item().Height(16);
            sutun.Item().AlignCenter().Text($"{eser.Es1Ad} & {eser.Es2Ad}")
                .FontFamily(BaslikFont).FontSize(12).FontColor(Sarap);
        });
    }

    // ---------- DILEKLER ----------
    private static void Dilekler(IContainer kap, EserVerisi eser)
    {
        var ortali = eser.Tema != "modern";
        var italik = eser.Tema == "zarif";

        // Gruplama
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
            var bolumSayaci = 0;

            foreach (var (baslik, dilekler) in bloklar)
            {
                if (baslik != null)
                {
                    // BOLUM AYRACI GORSELI (varsa): basligin ustunde, bolume nefes verir
                    if (bolumSayaci < eser.BolumGorselleri.Count)
                    {
                        var bg = eser.BolumGorselleri[bolumSayaci];
                        var (g, y) = Olcule(bg.Genislik, bg.Yukseklik,
                            YonBul(bg.Genislik, bg.Yukseklik) == Yon.Dikey ? 175f : 135f, 290f);
                        sutun.Item().PaddingTop(10).ShowEntire().Column(bc =>
                        {
                            var kap2 = ortali ? bc.Item().AlignCenter() : bc.Item();
                            kap2.Element(c => Cerceveli(c, bg.Veri, g, y));
                            if (!string.IsNullOrWhiteSpace(bg.Altyazi))
                            {
                                bc.Item().Height(5);
                                var ak = ortali ? bc.Item().AlignCenter() : bc.Item();
                                ak.Text(bg.Altyazi)
                                    .FontFamily(GovdeFont).FontSize(7.5f)
                                    .FontColor(Ikincil).Italic();
                            }
                        });
                    }
                    bolumSayaci++;

                    sutun.Item().PaddingTop(14).PaddingBottom(4).Element(b =>
                    {
                        var bk = ortali ? b.AlignCenter() : b;
                        bk.Column(bs =>
                        {
                            bs.Item().Text(baslik)
                                .FontFamily(BaslikFont).FontSize(15).FontColor(Sarap).Italic(italik);
                            bs.Item().Height(5);
                            bs.Item().Element(c =>
                            {
                                var ck = ortali ? c.AlignCenter() : c;
                                ck.Width(36).Height(1).Background(Yaldiz);
                            });
                        });
                    });
                    sutun.Item().Height(10);
                }

                foreach (var d in dilekler)
                {
                    // DILEK BLOGU - bolunmez birim (ShowEntire: sayfa ortasindan kesilmez).
                    //
                    // FOTOGRAFLI dilek yaklasik YARIM SAYFA yukseklik alir; boylece iki
                    // fotografli dilek bir sayfayi DOGAL olarak doldurur, ucuncusu yeni
                    // sayfaya akar. Manuel sayfa kirma YOK - dizgi kendi ritmini bulur.
                    // (Icerik yuksekligi ~487pt; fotografli blok ~230pt.)
                    sutun.Item().PaddingBottom(d.Foto != null ? 22 : 20).ShowEntire().Column(dc =>
                    {
                        if (d.Foto != null)
                        {
                            // Oran-duyarli olculeme: dikey fotograf uzar, yatay genisler.
                            // Kirpma yok - davetlinin kadraji korunur.
                            var yon = YonBul(d.FotoGenislik, d.FotoYukseklik);
                            var butce = yon switch
                            {
                                Yon.Dikey => 186f,  // dikey: yukseklige yaslanir
                                Yon.Kare => 168f,
                                _ => 150f,          // yatay: genisler, daha az yukseklik yer
                            };
                            var (fg, fy) = Olcule(d.FotoGenislik, d.FotoYukseklik, butce, 300f);

                            var fotoKap = ortali ? dc.Item().AlignCenter() : dc.Item();
                            fotoKap.Element(c => Cerceveli(c, d.Foto, fg, fy));
                            dc.Item().Height(12);
                        }

                        var metinKap = ortali ? dc.Item().AlignCenter() : dc.Item();
                        metinKap.Text(d.Mesaj)
                            .FontFamily(GovdeFont).FontSize(10.5f).LineHeight(1.7f)
                            .FontColor(MurekkepYumusak).Italic(italik);

                        dc.Item().Height(7);

                        // IMZA: ad + ILISKI (20 yil sonra "bu kimdi?" sorusunu oldurur)
                        var imzaKap = ortali ? dc.Item().AlignCenter() : dc.Item();
                        imzaKap.Text(d.DavetliAd)
                            .FontFamily(BaslikFont).FontSize(10).FontColor(Sarap);

                        if (!string.IsNullOrWhiteSpace(d.Iliski))
                        {
                            dc.Item().Height(2);
                            var iliskiKap = ortali ? dc.Item().AlignCenter() : dc.Item();
                            iliskiKap.Text(d.Iliski)
                                .FontFamily(GovdeFont).FontSize(7.5f).FontColor(Ikincil)
                                .LetterSpacing(0.06f);
                        }

                        if (eser.TarihGoster)
                        {
                            dc.Item().Height(2);
                            var tarihKap = ortali ? dc.Item().AlignCenter() : dc.Item();
                            tarihKap.Text(TarihMetni(d.Birakilma))
                                .FontFamily(GovdeFont).FontSize(6.8f).FontColor(Yaldiz);
                        }

                        // Klasik temada dilekler arasi ince ayrac
                        if (eser.Tema == "klasik")
                        {
                            dc.Item().Height(14);
                            dc.Item().AlignCenter().Width(18).Height(0.6f).Background(Yaldiz);
                        }
                    });
                }
            }
        });
    }

    // ---------- KAPANIS ----------
    private static void Kapanis(IContainer kap, EserVerisi eser)
    {
        var italik = eser.Tema == "zarif";

        kap.AlignMiddle().Column(sutun =>
        {
            if (!string.IsNullOrWhiteSpace(eser.KapanisMetni))
            {
                sutun.Item().PaddingHorizontal(8).AlignCenter().Text(eser.KapanisMetni)
                    .FontFamily(GovdeFont).FontSize(11).LineHeight(1.75f)
                    .FontColor(MurekkepYumusak).Italic(italik);
                sutun.Item().Height(30);
            }

            // KAPANIS GORSELI (varsa) - eserin son nefesi
            if (eser.KapanisGorseli != null)
            {
                var kg = eser.KapanisGorseli;
                var (g, y) = Olcule(kg.Genislik, kg.Yukseklik,
                    YonBul(kg.Genislik, kg.Yukseklik) == Yon.Dikey ? 215f : 165f, 290f);
                sutun.Item().AlignCenter().Element(c => Cerceveli(c, kg.Veri, g, y));

                if (!string.IsNullOrWhiteSpace(eser.KapanisGorseli.Altyazi))
                {
                    sutun.Item().Height(6);
                    sutun.Item().AlignCenter().Text(eser.KapanisGorseli.Altyazi)
                        .FontFamily(GovdeFont).FontSize(7.5f).FontColor(Ikincil).Italic();
                }
                sutun.Item().Height(32);
            }

            // Marka kilidi
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

    // Tarih metni (Turkce): "12 Temmuz 2026"
    private static string TarihMetni(DateTimeOffset t)
    {
        var kultur = new System.Globalization.CultureInfo("tr-TR");
        return t.ToLocalTime().ToString("d MMMM yyyy", kultur);
    }
}
