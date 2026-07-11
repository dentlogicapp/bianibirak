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
    public sealed record Dilek(string DavetliAd, string Mesaj, string KaynakEs, DateTimeOffset Birakilma);

    // Eserin tum kurgusu
    public sealed record EserVerisi(
        string Tema,
        string GruplamaTipi,
        string KapakBaslik,
        string KapakAltBaslik,
        string? IthafMetni,
        string? KapanisMetni,
        bool QrKoprusuAktif,
        string Es1Ad,
        string Es2Ad,
        string DijitalDefterUrl,
        IReadOnlyList<Dilek> Dilekler,
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

            // --- KAPANIS + QR KOPRUSU ---
            if (!string.IsNullOrWhiteSpace(eser.KapanisMetni) || eser.QrKoprusuAktif)
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
            sutun.Item().Height(40);

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
            foreach (var (baslik, dilekler) in bloklar)
            {
                if (baslik != null)
                {
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
                    // Her dilek bolunmez bir birim (sayfa ortasindan kesilmez)
                    sutun.Item().PaddingBottom(20).ShowEntire().Column(dc =>
                    {
                        var metinKap = ortali ? dc.Item().AlignCenter() : dc.Item();
                        metinKap.Text(d.Mesaj)
                            .FontFamily(GovdeFont).FontSize(10.5f).LineHeight(1.7f)
                            .FontColor(MurekkepYumusak).Italic(italik);

                        dc.Item().Height(7);

                        var imzaKap = ortali ? dc.Item().AlignCenter() : dc.Item();
                        imzaKap.Text(d.DavetliAd)
                            .FontFamily(BaslikFont).FontSize(10).FontColor(Sarap);

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

    // ---------- KAPANIS + QR ----------
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

            // Kitap-ici QR koprusu (B5): basili defteri dijitale baglar
            if (eser.QrKoprusuAktif)
            {
                sutun.Item().AlignCenter().Column(qr =>
                {
                    qr.Item().AlignCenter().Width(72).Height(72)
                        .Image(QrPng(eser.DijitalDefterUrl));
                    qr.Item().Height(8);
                    qr.Item().AlignCenter().Text("DİJİTAL DEFTER")
                        .FontFamily(GovdeFont).FontSize(6.5f).FontColor(Yaldiz).LetterSpacing(0.25f);
                    qr.Item().Height(3);
                    qr.Item().AlignCenter().Text("Okutunca dileklerin tamamına ulaşırsın")
                        .FontFamily(GovdeFont).FontSize(7).FontColor(Ikincil);
                });
                sutun.Item().Height(36);
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

    // QR (kitap-ici kopru): test edilmis kutuphane - basili kod OKUNMAK zorunda.
    private static byte[] QrPng(string url)
    {
        using var uretec = new QRCoder.QRCodeGenerator();
        // ECC-M: kagit uzerinde leke/kirisiklik toleransi (~%15 kurtarma)
        using var veri = uretec.CreateQrCode(url, QRCoder.QRCodeGenerator.ECCLevel.M);
        var png = new QRCoder.PngByteQRCode(veri);
        return png.GetGraphic(10); // 10 piksel/modul -> baskida net
    }
}
