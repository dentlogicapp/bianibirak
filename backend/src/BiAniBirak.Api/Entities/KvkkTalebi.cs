namespace BiAniBirak.Api.Entities;

// KVKK ilgili kisi talepleri (Belge 08 madde 11): erisim, duzeltme, silme, itiraz.
// Talep kanali + surec + yasal sureler super panelden yonetilir; her adim audit'e duser.
public class KvkkTalebi
{
    public Guid Id { get; set; }

    // Talep sahibi (kayitli kullanici ise) - anonim davetli talebi de olabilir (null)
    public Guid? KullaniciId { get; set; }

    // Iletisim (anonim talep icin zorunlu)
    public string Email { get; set; } = string.Empty;

    // Tip: "erisim" | "duzeltme" | "silme" | "itiraz"
    public string Tip { get; set; } = string.Empty;

    // Talebin metni
    public string Aciklama { get; set; } = string.Empty;

    // Durum: "yeni" | "islemde" | "tamamlandi" | "reddedildi"
    public string Durum { get; set; } = "yeni";

    // Yonetici notu / sonuc
    public string? SonucNotu { get; set; }

    // Yasal sure takibi (KVKK: 30 gun)
    public DateTimeOffset SonYanitTarihi { get; set; }

    public Guid? IsleyenKullaniciId { get; set; }
    public DateTimeOffset? IslemZamani { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}
