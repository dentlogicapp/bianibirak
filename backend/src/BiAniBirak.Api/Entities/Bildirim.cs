namespace BiAniBirak.Api.Entities;

// Uygulama-ici bildirim (planlama deseni). Push'tan BAGIMSIZ: push izni olmasa da
// uygulama acilinca avatar canina duser. Push gonderimiyle AYNI anda olusturulur.
public class Bildirim
{
    public Guid Id { get; set; }

    // Kime? (alici kullanici)
    public Guid KullaniciId { get; set; }

    // Hangi etkinlik baglaminda (tenant-scoped; null = sistem/hesap bildirimi)
    public Guid? EtkinlikId { get; set; }

    // Tip: "katki_birakildi" | "katki_onaylandi" | "es_katildi" | "sistem"
    public string Tip { get; set; } = string.Empty;

    public string Baslik { get; set; } = string.Empty;
    public string Mesaj { get; set; } = string.Empty;

    // Tiklayinca gidilecek uygulama ici yol (/panel/etkinlik gibi)
    public string? Url { get; set; }

    public bool OkunduMu { get; set; }
    public DateTimeOffset? OkunmaZamani { get; set; }

    public DateTimeOffset CreatedAt { get; set; }
}
