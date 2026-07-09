namespace BiAniBirak.Api.Entities;

// Belge 04 -> uye_davetleri. Es2 daveti (Karar 5).
// EtkinlikId = tenant. Token tahmin edilemez + benzersiz; tek-kullanimlik (Belge 08).
public class UyeDaveti
{
    public Guid Id { get; set; }

    // tenant anahtari
    public Guid EtkinlikId { get; set; }

    // tahmin edilemez, benzersiz davet tokeni
    public string Token { get; set; } = string.Empty;

    // bugun daima es2 (davet edilen rol)
    public string HedefRol { get; set; } = string.Empty;

    // beklemede | kullanildi | iptal
    public string Durum { get; set; } = string.Empty;

    public DateTimeOffset CreatedAt { get; set; }
}
