using BiAniBirak.Api.Entities;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace BiAniBirak.Api.Servisler;

// ONAY KANIT BELGESI - avukata veya mahkemeye sunulabilir TEK dosya.
//
// NEDEN VAR:
// Bir kullanici "ben bunu kabul etmedim, verimi geri istiyorum" dediginde, elimizdeki
// kanit veritabaninda dagilmis durumda: onay kaydi bir tabloda, metnin o gunku hali
// baska bir tabloda, kullanici bilgisi ucuncu bir tabloda.
//
// Avukata "su SQL'i calistirin" diyemeyiz. Kanit, TEK BIR BELGE olarak elde tutulabilir
// olmalidir: kim, ne zaman, nereden, HANGI METNI onayladi - ve o metnin tam hali.
//
// Bu belge onu uretir. Icinde:
//   1. Onay kimligi (kullanici, zaman, IP, tarayici)
//   2. Metnin PARMAK IZI (SHA-256) - degistirilmedigi ispatlanabilir
//   3. Metnin O GUNKU TAM HALI (arsivden) - kelimesi kelimesine
//
// Ucuncu madde kritiktir: hash tek basina anlamsizdir. "Bir metni onayladi"
// diyebilmek yetmez; HANGI metni oldugunu gostermek gerekir.
public static class KanitBelgesi
{
    private const string BaslikFont = "Fraunces Basli";
    private const string GovdeFont = "Inter Govde";

    private static readonly Color Murekkep = Color.FromHex("#211A17");
    private static readonly Color Ikincil = Color.FromHex("#6C5F50");
    private static readonly Color Sarap = Color.FromHex("#6E2438");
    private static readonly Color Yaldiz = Color.FromHex("#A8823C");
    private static readonly Color Kagit = Color.FromHex("#FDF9F0");
    private static readonly Color Hat = Color.FromHex("#E8DCC4");

    public sealed record Veri(
        KullanimOnayi Onay,
        string? KullaniciAd,
        string? KullaniciEmail,
        bool KullaniciSilinmis,
        SistemMetinSurumu? Surum,      // arsivden - onayin verildigi ANDAKI metin
        string? DavetliAd,             // davetli onayi ise
        string? DefterAdi);

    public static byte[] Uret(Veri v)
    {
        var o = v.Onay;
        var davetliMi = o.KullaniciId == null;

        return Document.Create(belge =>
        {
            belge.Page(sayfa =>
            {
                sayfa.Size(PageSizes.A4);
                sayfa.Margin(2, Unit.Centimetre);
                sayfa.PageColor(Kagit);
                sayfa.DefaultTextStyle(t => t.FontFamily(GovdeFont).FontSize(9).FontColor(Murekkep));

                sayfa.Header().Column(k =>
                {
                    k.Item().Text("BiAnıBırak")
                        .FontFamily(BaslikFont).FontSize(16).FontColor(Sarap);
                    k.Item().Text("Kullanım Onayı Kanıt Belgesi")
                        .FontFamily(BaslikFont).FontSize(11).FontColor(Ikincil);
                    k.Item().PaddingTop(6).LineHorizontal(1).LineColor(Yaldiz);
                });

                sayfa.Content().PaddingVertical(14).Column(k =>
                {
                    k.Spacing(12);

                    // ---- 1. ONAYI VEREN ----
                    Bolum(k, "1. ONAYI VEREN");

                    if (davetliMi)
                    {
                        Satir(k, "Sıfat", "Davetli (anonim)");
                        Satir(k, "Bıraktığı ad", string.IsNullOrWhiteSpace(v.DavetliAd)
                            ? "(belirtilmemiş)" : v.DavetliAd);
                        Satir(k, "İlgili defter", v.DefterAdi ?? "(imha edilmiş)");
                        Satir(k, "Dilek kimliği", o.KatkiId?.ToString() ?? "-");

                        k.Item().PaddingTop(3).Text(
                            "Not: Davetliden hesap açması veya kimlik bilgisi vermesi istenmez. " +
                            "Rızanın kanıtı, bıraktığı dileğe bağlanan bu kayıttır.")
                            .FontSize(7.5f).Italic().FontColor(Ikincil);
                    }
                    else
                    {
                        Satir(k, "Sıfat", "Hesap sahibi");
                        Satir(k, "Ad", v.KullaniciAd ?? "(hesap silinmiş)");
                        Satir(k, "E-posta", v.KullaniciEmail ?? "(hesap silinmiş)");
                        Satir(k, "Kullanıcı kimliği", o.KullaniciId?.ToString() ?? "-");

                        if (v.KullaniciSilinmis)
                            k.Item().PaddingTop(3).Text(
                                "Not: Bu hesap silinmiştir. Onay kaydı, KVKK m.5/2-e " +
                                "(bir hakkın tesisi, kullanılması veya korunması) uyarınca " +
                                "saklanmaya devam etmektedir.")
                                .FontSize(7.5f).Italic().FontColor(Sarap);
                    }

                    // ---- 2. ONAY ANI ----
                    Bolum(k, "2. ONAY ANI VE BAĞLAMI");
                    Satir(k, "Onay zamanı (UTC)",
                        o.CreatedAt.ToString("dd MMMM yyyy, HH:mm:ss"));
                    Satir(k, "Onay zamanı (TR)",
                        o.CreatedAt.ToOffset(TimeSpan.FromHours(3)).ToString("dd MMMM yyyy, HH:mm:ss"));
                    Satir(k, "IP adresi", o.IpAdresi ?? "(kaydedilmemiş)");
                    Satir(k, "Tarayıcı", Kirp(o.TarayiciBilgisi, 110));

                    // ---- 3. ONAYLANAN METIN ----
                    Bolum(k, "3. ONAYLANAN METİN");
                    Satir(k, "Metin", o.MetinAnahtar);
                    Satir(k, "Sürüm", o.MetinSurum);

                    k.Item().PaddingTop(4).Column(h =>
                    {
                        h.Item().Text("Parmak izi (SHA-256)")
                            .FontSize(7.5f).FontColor(Ikincil);
                        h.Item().Background(Color.FromHex("#FFFDF8"))
                            .Border(1).BorderColor(Hat).Padding(5)
                            .Text(o.MetinHash).FontSize(7.5f).FontColor(Murekkep);
                    });

                    k.Item().PaddingTop(2).Text(
                        "Parmak izi, metnin o günkü halinden matematiksel olarak türetilir. " +
                        "Metnin tek bir harfi değişse parmak izi tamamen değişir. Aşağıdaki metnin " +
                        "parmak izi yukarıdakiyle aynıysa, onaylanan metin ile burada gösterilen " +
                        "metin BİREBİR AYNIDIR.")
                        .FontSize(7.5f).Italic().FontColor(Ikincil);

                    // ---- 4. METNIN TAM HALI ----
                    Bolum(k, "4. METNİN ONAY ANINDAKİ TAM HALİ");

                    if (v.Surum == null)
                    {
                        k.Item().Background(Color.FromHex("#FBEEF0"))
                            .Border(1).BorderColor(Sarap).Padding(8)
                            .Text("UYARI: Bu sürümün arşiv kaydı bulunamadı. Onay kaydındaki " +
                                  "parmak izi geçerlidir, ancak metnin tam hali arşivden " +
                                  "getirilemedi. Bu, arşivleme sistemi kurulmadan önce verilmiş " +
                                  "bir onay olabilir.")
                            .FontSize(8).FontColor(Sarap);
                    }
                    else
                    {
                        Satir(k, "Başlık", v.Surum.Baslik);
                        Satir(k, "Yürürlük", v.Surum.YururlukTarihi.ToString("dd MMMM yyyy"));

                        // Dogrulama: arsivdeki hash, onaydaki hash ile ayni mi?
                        var uyumlu = string.Equals(v.Surum.Hash, o.MetinHash, StringComparison.Ordinal);

                        k.Item().PaddingTop(3)
                            .Background(uyumlu ? Color.FromHex("#F5F1E4") : Color.FromHex("#FBEEF0"))
                            .Border(1).BorderColor(uyumlu ? Yaldiz : Sarap).Padding(6)
                            .Text(uyumlu
                                ? "DOĞRULANDI: Arşivdeki metnin parmak izi, onay kaydındaki parmak izi ile aynıdır."
                                : "UYUMSUZ: Arşiv kaydı ile onay kaydının parmak izleri farklıdır.")
                            .FontSize(8).SemiBold()
                            .FontColor(uyumlu ? Murekkep : Sarap);

                        k.Item().PaddingTop(8)
                            .Background(Color.FromHex("#FFFDF8"))
                            .Border(1).BorderColor(Hat).Padding(10)
                            .Text(v.Surum.Icerik).FontSize(8).LineHeight(1.4f);
                    }
                });

                sayfa.Footer().Column(k =>
                {
                    k.Item().PaddingTop(6).LineHorizontal(0.5f).LineColor(Hat);
                    k.Item().PaddingTop(4).Row(r =>
                    {
                        r.RelativeItem().Text(
                            $"Belge üretim tarihi: {DateTimeOffset.UtcNow.ToOffset(TimeSpan.FromHours(3)):dd.MM.yyyy HH:mm} (TR)")
                            .FontSize(7).FontColor(Ikincil);
                        r.ConstantItem(120).AlignRight().Text(t =>
                        {
                            t.CurrentPageNumber().FontSize(7).FontColor(Ikincil);
                            t.Span(" / ").FontSize(7).FontColor(Ikincil);
                            t.TotalPages().FontSize(7).FontColor(Ikincil);
                        });
                    });
                });
            });
        }).GeneratePdf();
    }

    private static void Bolum(ColumnDescriptor k, string baslik)
    {
        k.Item().PaddingTop(6).Text(baslik)
            .FontFamily(BaslikFont).FontSize(10).FontColor(Sarap);
    }

    private static void Satir(ColumnDescriptor k, string etiket, string deger)
    {
        k.Item().Row(r =>
        {
            r.ConstantItem(120).Text(etiket).FontSize(8).FontColor(Ikincil);
            r.RelativeItem().Text(deger).FontSize(8.5f).FontColor(Murekkep);
        });
    }

    private static string Kirp(string? s, int azami)
    {
        if (string.IsNullOrWhiteSpace(s)) return "(kaydedilmemiş)";
        return s.Length <= azami ? s : s[..azami] + "...";
    }
}
