namespace BiAniBirak.Api.Entities;

// Belge 04 -> katki_medyalari. Opsiyonel foto (ust paket - Belge 05).
// Sema Asama 3'te kurulur; gercek object-storage + yukleme Asama 6'da eklenir.
// EtkinlikId denormalize (tenant filtresi icin).
public class KatkiMedyasi
{
    public Guid Id { get; set; }

    public Guid KatkiId { get; set; }

    // tenant anahtari (denormalize; filtre icin)
    public Guid EtkinlikId { get; set; }

    // foto  (gelecek: ses | video)
    public string Tur { get; set; } = string.Empty;

    // nesne depolama anahtari (Asama 6'da doldurulur)
    public string StorageKey { get; set; } = string.Empty;

    public DateTimeOffset CreatedAt { get; set; }
}
