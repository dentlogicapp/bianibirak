namespace BiAniBirak.Api.Entities;

// Belge 04 -> etkinlik_uyelikleri. Cift = iki uye (Karar 5).
// EtkinlikId = tenant. Kural: etkinlik basina tam iki satir; (EtkinlikId, Rol) unique.
public class EtkinlikUyeligi
{
    public Guid Id { get; set; }

    // tenant anahtari
    public Guid EtkinlikId { get; set; }

    public Guid KullaniciId { get; set; }

    // es1 | es2
    public string Rol { get; set; } = string.Empty;

    public DateTimeOffset CreatedAt { get; set; }
}
