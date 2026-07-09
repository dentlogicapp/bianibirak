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

    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
    public DateTimeOffset? DeletedAt { get; set; }
}
