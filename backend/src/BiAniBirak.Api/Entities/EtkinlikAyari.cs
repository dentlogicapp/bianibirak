namespace BiAniBirak.Api.Entities;

// Belge 04 -> etkinlik_ayarlari. Hardcoded YASAK -> her sey buradan (Bolum 3).
// EtkinlikId ile bire-bir (unique). Kapak/tema/karsilama/prompt + kapanis penceresi.
public class EtkinlikAyari
{
    public Guid Id { get; set; }

    // tenant anahtari (bire-bir: her etkinlige tek ayar satiri)
    public Guid EtkinlikId { get; set; }

    public string? MarkaKapak { get; set; }
    public string? Tema { get; set; }
    public string? KarsilamaMetni { get; set; }

    // davetliye rehber soru/yonlendirme
    public string? PromptMetni { get; set; }

    // kapanis penceresi (gun) - varsayilan 30 (Karar 4 / Belge 05)
    public int KapanisPencereGun { get; set; } = 30;

    // genisletilebilir serbest ayarlar (jsonb)
    public string? Ayarlar { get; set; }

    public DateTimeOffset UpdatedAt { get; set; }
}
