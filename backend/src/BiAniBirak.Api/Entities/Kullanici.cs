namespace BiAniBirak.Api.Entities;

// Belge 04 -> kullanicilar tablosu.
// Ekosistem standardi kolonlar snake_case (email, sifre_hash, super_admin,
// created_at/updated_at/deleted_at); domain kolonlar PascalCase ASCII (Id, Ad).
public class Kullanici
{
    public Guid Id { get; set; }

    // ekosistem standardi: e-posta benzersiz
    public string Email { get; set; } = string.Empty;

    // bcrypt hash (Asama 4'te doldurulur)
    public string SifreHash { get; set; } = string.Empty;

    public string Ad { get; set; } = string.Empty;

    public bool SuperAdmin { get; set; }

    // Sessiz saatler (push ertelemesi) - "HH:mm" TR saati. Aktifse aralikta bildirim ertelenir.
    public bool SessizSaatAktif { get; set; }
    public string? SessizSaatBaslangic { get; set; } // "22:00"
    public string? SessizSaatBitis { get; set; } // "08:00"

    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
    public DateTimeOffset? DeletedAt { get; set; }
}
