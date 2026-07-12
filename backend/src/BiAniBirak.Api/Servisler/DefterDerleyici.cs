using BiAniBirak.Api.Data;
using BiAniBirak.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace BiAniBirak.Api.Servisler;

// DEFTER DERLEYICI - bir etkinligin PDF'ini uretmenin TEK yolu.
//
// NEDEN AYRI SERVIS:
// PDF uretimi (dilekleri topla, gorselleri diskten oku, olcuyu coz, BaskiServisi'ne
// ver) yaklasik 100 satirlik bir istir. Bu is IKI yerden cagrilir:
//   1. Kurasyon studyosu - cift kendi defterini indirir (tenant scope).
//   2. Super panel "Defter Rontgeni" - yonetici destek icin uretir (sistem scope).
//
// Ikinci cagriyi kopyalayarak yazmak, iki kopyanin kacinilmaz olarak ayrismasi
// demektir: kurasyona bir ozellik eklendiginde rontgen eski PDF'i uretir ve yonetici
// "cift ne goruyor" sorusuna YANLIS cevap alir. Destek araci yanlis bilgi veriyorsa
// destek aracindan kotudur.
//
// Bu yuzden is TEK yerde durur. Iki uc da buraya cagirir; tenant kontrolu CAGIRANIN
// sorumlulugudur (bu servis yetki bilmez, yalniz derler).
public static class DefterDerleyici
{
    public sealed record Sonuc(byte[] Pdf, Kurasyon Kurasyon, int DilekSayisi);

    public sealed record Hata(string Kod, string Mesaj);

    // Etkinligin defterini derler. Yetki/tenant kontrolu CAGIRANDA yapilmis olmalidir.
    // BELGE - PDF'e de goruntuye de donusturulebilen ara form.
    //
    // Onizleme PNG uretir (96 DPI, ekran), indirme PDF uretir (300 DPI, baski). Ikisi
    // de AYNI belgeden gelir - yani onizlemede gordugun sey, bastiginda alacagin seyin
    // BIREBIR AYNISIDIR. Sadece cozunurluk farkli.
    //
    // Bu ayrim, filigranin yerini alan is modelidir: gormek bedava, BASMAK ucretli.
    public static async Task<(QuestPDF.Infrastructure.IDocument? belge, Hata? hata)> BelgeAsync(
        Guid etkinlikId,
        BiAniBirakDbContext db,
        DepolamaServisi depo,
        string icerikKoku,
        CancellationToken ct = default)
    {
        var (eser, hata) = await EserAsync(etkinlikId, db, depo, icerikKoku, ct);
        if (hata != null) return (null, hata);
        return (BaskiServisi.DefterBelgesi(eser!.Eser), null);
    }

    public static async Task<(Sonuc? sonuc, Hata? hata)> DerleAsync(
        Guid etkinlikId,
        BiAniBirakDbContext db,
        DepolamaServisi depo,
        string icerikKoku)
    {
        var (veri, hata) = await EserAsync(etkinlikId, db, depo, icerikKoku);
        if (hata != null) return (null, hata);

        var pdf = BaskiServisi.DefterUret(veri!.Eser);
        return (new Sonuc(pdf, veri.Kurasyon, veri.DilekSayisi), null);
    }

    private sealed record EserVeri(
        BaskiServisi.EserVerisi Eser, Kurasyon Kurasyon, int DilekSayisi);

    private static async Task<(EserVeri? veri, Hata? hata)> EserAsync(
        Guid etkinlikId,
        BiAniBirakDbContext db,
        DepolamaServisi depo,
        string icerikKoku,
        CancellationToken ct = default)
    {
        var etkinlik = await db.Etkinlikler.AsNoTracking()
            .FirstOrDefaultAsync(e => e.Id == etkinlikId && !e.SilindiMi);
        if (etkinlik == null)
            return (null, new Hata("ETKINLIK_BULUNAMADI", "Etkinlik bulunamadı."));

        var kurasyon = await db.Kurasyonlar.AsNoTracking()
            .FirstOrDefaultAsync(k => k.EtkinlikId == etkinlikId);
        if (kurasyon == null)
            return (null, new Hata("KURASYON_BULUNAMADI", "Bu defter için kürasyon açılmamış."));

        // Esere DAHIL edilen dilekler, kurulan sirayla
        var dilekler = await db.KurasyonOgeleri.AsNoTracking()
            .Where(o => o.KurasyonId == kurasyon.Id && o.Dahil)
            .OrderBy(o => o.Sira)
            .Join(db.Katkilar.AsNoTracking().Where(k => !k.SilindiMi),
                o => o.KatkiId, k => k.Id,
                (o, k) => new
                {
                    k.DavetliAd,
                    k.DavetliIliski,
                    k.Mesaj,
                    k.KaynakEs,
                    k.CreatedAt,
                    k.FotoAnahtari,
                    k.FotoGenislik,
                    k.FotoYukseklik,
                })
            .ToListAsync();

        if (dilekler.Count == 0)
            return (null, new Hata("DILEK_YOK", "Esere en az bir dilek eklenmeli."));

        var gorseller = await db.EtkinlikGorselleri.AsNoTracking()
            .Where(g => g.EtkinlikId == etkinlikId)
            .OrderBy(g => g.Sira)
            .ToListAsync();

        async Task<BaskiServisi.Gorsel?> GorselYukle(EtkinlikGorseli? g)
        {
            if (g == null) return null;
            var veri = await depo.OkuAsync(g.DepolamaAnahtari);
            if (veri == null) return null;

            // Eski kayitlarda olcu 0 olabilir. Bayttan coz - yanlis olcu, cercevede
            // beyaz bosluk demektir; buna izin verilmez.
            var gg = g.Genislik;
            var yy = g.Yukseklik;
            if (gg <= 0 || yy <= 0)
            {
                var olcu = GorselOlcer.Coz(veri);
                gg = olcu?.Genislik ?? 0;
                yy = olcu?.Yukseklik ?? 0;
            }
            return new BaskiServisi.Gorsel(veri, gg, yy);
        }

        var kapakG = await GorselYukle(gorseller.FirstOrDefault(g => g.Konum == "kapak"));
        var ithafG = await GorselYukle(gorseller.FirstOrDefault(g => g.Konum == "ithaf"));
        var kapanisG = await GorselYukle(gorseller.FirstOrDefault(g => g.Konum == "kapanis"));

        var bolumG = new List<BaskiServisi.Gorsel>();
        foreach (var g in gorseller.Where(g => g.Konum == "bolum"))
        {
            var y = await GorselYukle(g);
            if (y != null) bolumG.Add(y);
        }

        var dilekListe = new List<BaskiServisi.Dilek>();
        foreach (var d in dilekler)
        {
            byte[]? foto = null;
            var fg = d.FotoGenislik;
            var fy = d.FotoYukseklik;

            if (d.FotoAnahtari != null)
            {
                foto = await depo.OkuAsync(d.FotoAnahtari);
                if (foto != null && (fg <= 0 || fy <= 0))
                {
                    var olcu = GorselOlcer.Coz(foto);
                    fg = olcu?.Genislik ?? 0;
                    fy = olcu?.Yukseklik ?? 0;
                }
            }

            dilekListe.Add(new BaskiServisi.Dilek(
                d.DavetliAd, d.DavetliIliski, d.Mesaj, d.KaynakEs, d.CreatedAt, foto, fg, fy));
        }

        BaskiServisi.Hazirla(icerikKoku);

        var eser = new BaskiServisi.EserVerisi(
            Tema: kurasyon.Tema,
            GruplamaTipi: kurasyon.GruplamaTipi,
            KapakBaslik: kurasyon.KapakBaslik ?? $"{etkinlik.Es1Ad} & {etkinlik.Es2Ad}",
            KapakAltBaslik: kurasyon.KapakAltBaslik ?? "",
            IthafMetni: kurasyon.IthafMetni,
            KapanisMetni: kurasyon.KapanisMetni,
            TarihGoster: kurasyon.TarihGoster,
            Es1Ad: etkinlik.Es1Ad,
            Es2Ad: etkinlik.Es2Ad,
            Dilekler: dilekListe,
            KapakGorseli: kapakG,
            IthafGorseli: ithafG,
            KapanisGorseli: kapanisG,
            BolumGorselleri: bolumG);

        return (new EserVeri(eser, kurasyon, dilekler.Count), null);
    }
}
