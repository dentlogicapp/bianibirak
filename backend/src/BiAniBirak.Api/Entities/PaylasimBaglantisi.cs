namespace BiAniBirak.Api.Entities;

// Belge 04 -> paylasim_baglantilari. Her ese ayri token/QR (cift-link + izolasyon).
// EtkinlikId = tenant. Kural: etkinlik basina iki satir; (EtkinlikId, Es) unique.
// Token tahmin edilemez + benzersiz; public URL + QR bu tokene baglanir (Belge 08).
public class PaylasimBaglantisi
{
    public Guid Id { get; set; }

    // tenant anahtari
    public Guid EtkinlikId { get; set; }

    // es1 | es2  (hangi esin linki)
    public string Es { get; set; } = string.Empty;

    // tahmin edilemez, benzersiz paylasim tokeni
    public string Token { get; set; } = string.Empty;

    public bool Aktif { get; set; } = true;

    public DateTimeOffset CreatedAt { get; set; }
}
