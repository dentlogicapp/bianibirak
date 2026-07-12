namespace BiAniBirak.Api.Entities;

// Cikti surumleme (B6): her export kaydedilir - kim, ne zaman, hangi ayarlarla.
// Cift "gecen ayki halini" geri alabilir; audit + guven.
public class KurasyonCiktisi
{
    public Guid Id { get; set; }
    public Guid KurasyonId { get; set; }
    public Guid EtkinlikId { get; set; }

    // Tip: "defter_pdf" | "slayt" | "tesekkur_kartlari"
    public string Tip { get; set; } = string.Empty;

    // Uretim anindaki kurasyon ayarlarinin anlik goruntusu (JSONB)
    public string AyarlarAnlik { get; set; } = "{}";


    public int SayfaSayisi { get; set; }
    public int DilekSayisi { get; set; }

    public Guid? OlusturanKullaniciId { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}
