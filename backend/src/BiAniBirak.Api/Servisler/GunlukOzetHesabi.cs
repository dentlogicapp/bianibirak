using BiAniBirak.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace BiAniBirak.Api.Servisler;

// GUNLUK OZET - TEK KAYNAK (Bolum 4-D, "ozet-hazir").
//
// "Bugun ne durumda?" sorusunun YAPISAL cevabi. Push gunluk ozeti bunu kullanir;
// MAIL gunluk ozeti (FAZ 4 sonrasi) AYNI hesaptan beslenir - toplulastirma mantigi
// iki kez yazilmaz. Veri kaynagi TEK; sunum katmanlari (push / mail / PDF) ayri.
// Nabizla (SuperUclari.Ozet) AYNI sorgular - iki yerde iki sayi olmaz.
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

    // Bildirim/mail METNI - TEK yer. "dahil" = bu adminin ozetinde GORUNECEK olay kodlari
    // (gorev, per-admin tercihlerden uretir). Bir olay dahil degilse ozette gorunmez
    // (ornek: admin onu "anlik" secmisse ozette TEKRAR gostermeyiz; "kapali" ise hic).
    // Anahtarlar: "bekleyen_odeme","bekleyen_kvkk","bekleyen_destek","gecikmis_imha","sistem_hatasi".
    public static (string Baslik, string Govde) Metin(GunlukOzet o, ISet<string> dahil)
    {
        var isler = new System.Collections.Generic.List<string>();
        if (dahil.Contains("bekleyen_odeme") && o.BekleyenOdeme > 0)
            isler.Add($"{o.BekleyenOdeme} bekleyen ödeme");
        if (dahil.Contains("bekleyen_kvkk") && o.BekleyenKvkk > 0)
            isler.Add($"{o.BekleyenKvkk} KVKK talebi");
        if (dahil.Contains("bekleyen_destek") && o.BekleyenDestek > 0)
            isler.Add($"{o.BekleyenDestek} açık destek");
        if (dahil.Contains("gecikmis_imha") && o.GecikmisImha > 0)
            isler.Add($"{o.GecikmisImha} gecikmiş imha");

        var baslik = isler.Count == 0
            ? "Günlük özet · bekleyen iş yok"
            : "Günlük özet · " + string.Join(", ", isler);

        var govde = new System.Text.StringBuilder();
        govde.Append(isler.Count == 0
            ? "Bekleyen bir iş yok - her şey yolunda. "
            : "Bugün ilgilenmen gerekenler: " + string.Join(", ", isler) + ". ");

        // Gunun aktivitesi (bilgi - mudahale gerektirmez; her ozette gorunur).
        govde.Append($"Son 24 saatte {o.YeniDilekBugun} yeni dilek, {o.YeniDefterBugun} yeni defter");
        if (dahil.Contains("sistem_hatasi") && o.SistemHatasiBugun > 0)
            govde.Append($"; {o.SistemHatasiBugun} sistem hatası");
        govde.Append('.');

        return (baslik, govde.ToString());
    }
}
