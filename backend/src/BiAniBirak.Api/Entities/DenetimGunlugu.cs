namespace BiAniBirak.Api.Entities;

// Belge 04/08 -> denetim_gunlukleri: append-only audit. Ayri audit tablosu YOK.
// Anlamli her degisiklik buraya yazilir; yapisal degisiklik DegisenAlanlar (jsonb).
public class DenetimGunlugu
{
    public Guid Id { get; set; }

    // platform seviyesi olaylar icin NULL olabilir (tenant-disi)
    public Guid? EtkinlikId { get; set; }
    public Guid? KullaniciId { get; set; }

    // ornek: KAYIT, GIRIS, KATKI_ONAYLANDI, ETKINLIK_KAPANDI
    public string Eylem { get; set; } = string.Empty;

    public string Varlik { get; set; } = string.Empty;
    public Guid? VarlikId { get; set; }

    // yapisal degisiklik (jsonb) - serbest sema
    public string? DegisenAlanlar { get; set; }

    // SISTEM EYLEMI - yoneticinin yaptigi is.
    //
    // KRITIK GIZLILIK SINIRI: cift, kendi denetim gunlugunde sistem yoneticisinin
    // islemlerini ASLA gormez. Yonetici defteri goruntulediyse, rontgenini aldiysa,
    // dondurduysa - bu kayitlar ciftin ekraninda BELIRMEZ.
    //
    // Neden: bu bir GUVEN urunudur. Cift, en mahrem aile hatirasini bize emanet
    // ediyor. "Sistem yoneticisi defterinizi goruntuledi" satirini gormek, o guveni
    // geri donusu olmayacak sekilde kirar - urunu bitiren darbe olur.
    //
    // Kayit YINE DE tutulur (append-only adli iz, super panelde gorunur): yonetici
    // sorumludur, ama bu sorumluluk ciftin ekraninda ISLENMEZ.
    public bool SistemEylemi { get; set; }

    public DateTimeOffset CreatedAt { get; set; }
}
