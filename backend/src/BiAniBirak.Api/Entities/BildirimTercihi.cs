namespace BiAniBirak.Api.Entities;

// SUPER YONETICI BILDIRIM TERCIHI (Bolum 4-D3) - per-admin, olay basina.
//
// Bir super admin bir olay icin kanalini secer: "anlik" | "ozet" | "kapali".
// Satir YOKSA BildirimKurallari varsayilani gecerlidir - kimse ayar yapmadan bugunku
// davranis korunur (geriye donuk uyumlu). Benzersiz: (KullaniciId, OlayKodu).
public class BildirimTercihi
{
    public Guid Id { get; set; }
    public Guid KullaniciId { get; set; }
    public string OlayKodu { get; set; } = "";   // "gecikmis_imha" | "sistem_hatasi" | "bekleyen_odeme" | "bekleyen_kvkk"
    public string Kanal { get; set; } = "";        // "anlik" | "ozet" | "kapali"
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}
