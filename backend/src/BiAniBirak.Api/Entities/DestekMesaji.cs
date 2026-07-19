namespace BiAniBirak.Api.Entities;

// DESTEK MESAJI - bir talebin altindaki tek konusma balonu.
//
// GondericiKullaniciId her zaman DOLUDUR (yonetici de bir kullanicidir) - "kim yazdi"
// sorusu asla belirsiz kalmaz. YoneticiMi, o anki rolu dondurur: yonetici sonradan
// yetkisini kaybetse bile GECMIS konusmada yonetici olarak gorunmeye devam eder.
// Rolu anlik hesaplasaydik, gecmis yaziyor gibi olurdu.
public class DestekMesaji
{
    public Guid Id { get; set; }
    public Guid TalepId { get; set; }

    public Guid GonderenKullaniciId { get; set; }

    // Yazildigi ANDAKI rol - dondurulmus.
    public bool YoneticiMi { get; set; }

    // Gorunen ad da dondurulur: kullanici adini degistirse bile gecmis tutarli kalir.
    public string GonderenAd { get; set; } = string.Empty;

    public string Metin { get; set; } = string.Empty;

    public DateTimeOffset CreatedAt { get; set; }
}
