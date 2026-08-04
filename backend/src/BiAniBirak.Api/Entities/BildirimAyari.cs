namespace BiAniBirak.Api.Entities;

// SUPER YONETICI BILDIRIM AYARI (Bolum 4-D3) - per-admin, kisisel gunluk ozet saati.
//
// Ayri tablo (Kullanici'yi sismeden): ozet saati yalniz super adminler icin anlamli.
// Satir yoksa varsayilan saat (9 - TR) gecerli. PK = KullaniciId (admin basina tek satir).
public class BildirimAyari
{
    public Guid KullaniciId { get; set; }   // PK
    public int OzetSaati { get; set; } = 9;  // gunluk ozet TR saati (0-23)
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}
