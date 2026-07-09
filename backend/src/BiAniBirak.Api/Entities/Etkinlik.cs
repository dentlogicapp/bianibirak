namespace BiAniBirak.Api.Entities;

// Belge 04 -> etkinlikler tablosu. TENANT = izolasyon siniri.
// Domain kolonlar PascalCase ASCII (Id, Tur, EtkinlikTarihi, Durum...);
// ekosistem standardi kolonlar snake_case (created_at/updated_at/deleted_at).
// Sureli yasam dongusu (Bolum 3): AcilisTarihi/EtkinlikTarihi/KapanisTarihi.
public class Etkinlik
{
    public Guid Id { get; set; }

    // dugun | nisan | nikah  (gelecekte genisler: mezuniyet, dogum...)
    public string Tur { get; set; } = string.Empty;

    public string Es1Ad { get; set; } = string.Empty;
    public string Es2Ad { get; set; } = string.Empty;

    // etkinligin gerceklesecegi gun (yalniz tarih)
    public DateOnly EtkinlikTarihi { get; set; }

    // erisim penceresi: acilis -> kapanis
    public DateTimeOffset AcilisTarihi { get; set; }
    public DateTimeOffset KapanisTarihi { get; set; }

    // hazirlik | aktif | kapali | arsiv (durum makinesi - Belge 03)
    public string Durum { get; set; } = string.Empty;

    // gelecek B2B2C ust organizator; bugun daima NULL (Bolum 3: additive)
    public Guid? UstOrganizatorId { get; set; }

    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
    public DateTimeOffset? DeletedAt { get; set; }
}
