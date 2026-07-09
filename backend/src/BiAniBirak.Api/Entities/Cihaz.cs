namespace BiAniBirak.Api.Entities;

// Belge 04 -> cihazlar. Native + Web Push hazirligi (web-oncelikli ama bastan hazir).
// Web Push: PushToken=endpoint URL (benzersiz), p256dh+auth ile sifreleme.
// Native token'da p256dh/auth null (FCM/APNs - gelecek).
public class Cihaz
{
    public Guid Id { get; set; }

    public Guid KullaniciId { get; set; }

    // web | ios | android
    public string Platform { get; set; } = "web";

    // Web Push endpoint URL (benzersiz) veya native push token
    public string PushToken { get; set; } = string.Empty;

    // Web Push sifreleme anahtarlari (native'de null)
    public string? PushP256dh { get; set; }
    public string? PushAuth { get; set; }

    public string? CihazAdi { get; set; }

    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset SonAktiflik { get; set; }
}
