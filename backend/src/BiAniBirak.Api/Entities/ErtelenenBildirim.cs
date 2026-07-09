namespace BiAniBirak.Api.Entities;

// Sessiz saatte gonderilemeyen push'lar burada birikir; sessiz saat bitince
// toplu gonderilir, sonra silinir (Planlama deseni). EtkinlikId tenant izolasyonu.
public class ErtelenenBildirim
{
    public Guid Id { get; set; }

    // tenant (nullable: platform seviyesi de olabilir)
    public Guid? EtkinlikId { get; set; }

    public Guid KullaniciId { get; set; }

    public string Baslik { get; set; } = string.Empty;
    public string Govde { get; set; } = string.Empty;
    public string? Url { get; set; }

    public DateTimeOffset CreatedAt { get; set; }
}
