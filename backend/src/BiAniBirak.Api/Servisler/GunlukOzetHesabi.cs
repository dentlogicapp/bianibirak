using BiAniBirak.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace BiAniBirak.Api.Servisler;

// GUNLUK OZET - TEK KAYNAK (Bolum 4-D, "ozet-hazir").
//
// "Bugun ne durumda?" sorusunun YAPISAL cevabi. Push gunluk ozeti (D-B) SIMDI bunu
// kullanir; MAIL gunluk ozeti (FAZ 4 sonrasi) AYNI hesaptan beslenir - toplulastirma
// mantigi iki kez yazilmaz. Veri kaynagi TEK; sunum katmanlari (push / mail / PDF) ayri.
// "Bir sayi tek yerden uretilir" ilkesi: nabizla AYNI sorgular kullanilir.
public sealed record GunlukOzet(
    int BekleyenOdeme,
    int BekleyenKvkk,
    int BekleyenDestek,
    int GecikmisImha,
    int SistemHatasiBugun,
    int YeniDefterBugun,
    int YeniDilekBugun)
{
    // Mudahale gereken toplam is. 0 ise "her sey yolunda".
    public int BekleyenToplam => BekleyenOdeme + BekleyenKvkk + BekleyenDestek + GecikmisImha;
}

public static class GunlukOzetHesabi
{
    // Bugunku durumu hesaplar. Nabizla (SuperUclari.Ozet) AYNI sorgular - panel ile
    // ozet ayni sayiyi soyler.
    public static async Task<GunlukOzet> HesaplaAsync(BiAniBirakDbContext db, CancellationToken ct)
    {
        var simdi = DateTimeOffset.UtcNow;
        var gunBasi = new DateTimeOffset(simdi.UtcDateTime.Date, TimeSpan.Zero);

        var bekleyenOdeme = await db.Odemeler.CountAsync(o => o.Durum == "bekliyor", ct);
        var bekleyenKvkk = await db.KvkkTalepleri.CountAsync(
            t => t.Durum == "yeni" || t.Durum == "islemde", ct);
        var bekleyenDestek = await db.DestekTalepleri.CountAsync(t => t.Durum == "acik", ct);

        // Gecikmis imha - EF-guvenli on filtre + bellekte kesin (Sabitler.ImhaAni tek kaynak).
        var adaylar = await db.Etkinlikler.AsNoTracking()
            .Where(e => !e.ImhaEdildi && !e.SilindiMi
                        && (e.EtkinlikTarihi.AddDays(Sabitler.ToplamGun) <= simdi
                            || e.OzelSaklamaGun != null))
            .Select(e => new { e.EtkinlikTarihi, e.OzelSaklamaGun })
            .ToListAsync(ct);
        var gecikmisImha = adaylar.Count(
            e => Sabitler.ImhaAni(e.EtkinlikTarihi, e.OzelSaklamaGun) <= simdi);

        var sistemHatasiBugun = await db.SistemHatalari.CountAsync(h => h.CreatedAt >= gunBasi, ct);
        var yeniDefterBugun = await db.Etkinlikler.CountAsync(
            e => !e.SilindiMi && e.CreatedAt >= gunBasi, ct);
        var yeniDilekBugun = await db.Katkilar.CountAsync(
            k => !k.SilindiMi && k.CreatedAt >= gunBasi, ct);

        return new GunlukOzet(bekleyenOdeme, bekleyenKvkk, bekleyenDestek, gecikmisImha,
            sistemHatasiBugun, yeniDefterBugun, yeniDilekBugun);
    }

    // Bildirim/mail METNI - TEK yer. Push simdi bunu render eder; mail (FAZ 4 sonrasi)
    // ayni ozetten render edecek (PDF brief zenginlestirebilir ama sayilar buradan gelir).
    public static (string Baslik, string Govde) Metin(GunlukOzet o)
    {
        var isler = new System.Collections.Generic.List<string>();
        if (o.BekleyenOdeme > 0) isler.Add($"{o.BekleyenOdeme} bekleyen ödeme");
        if (o.BekleyenKvkk > 0) isler.Add($"{o.BekleyenKvkk} KVKK talebi");
        if (o.BekleyenDestek > 0) isler.Add($"{o.BekleyenDestek} açık destek");
        if (o.GecikmisImha > 0) isler.Add($"{o.GecikmisImha} gecikmiş imha");

        var baslik = isler.Count == 0
            ? "Günlük özet · bekleyen iş yok"
            : "Günlük özet · " + string.Join(", ", isler);

        var govde = new System.Text.StringBuilder();
        govde.Append(isler.Count == 0
            ? "Bekleyen bir iş yok - her şey yolunda. "
            : "Bugün ilgilenmen gerekenler: " + string.Join(", ", isler) + ". ");

        // Gunun aktivitesi (bilgi - mudahale gerektirmez).
        govde.Append($"Son 24 saatte {o.YeniDilekBugun} yeni dilek, {o.YeniDefterBugun} yeni defter");
        if (o.SistemHatasiBugun > 0)
            govde.Append($"; {o.SistemHatasiBugun} sistem hatası");
        govde.Append('.');

        return (baslik, govde.ToString());
    }
}
