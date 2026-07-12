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

    // etkinligin gerceklesecegi an (tarih + saat - Musa karari #6)
    public DateTimeOffset EtkinlikTarihi { get; set; }

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

    // ---- SUPER PANEL ----
    // Cop kutusu (iki asamali silme: once cope at, sonra kalici sil)
    public bool SilindiMi { get; set; }
    public DateTimeOffset? SilinmeZamani { get; set; }

    // Dondurma (kotuye kullanim - Belge 08): davetli YAZIMI reddedilir, cift okuyabilir.
    public bool Donduruldu { get; set; }

    // ---- IMHA TAKVIMI (Belge 08: kapanis + SaklamaGun sonrasi TAM IMHA) ----
    //
    // Bu urun bir MIRAS vaadi veriyor ama sonsuz saklama vaadi VERMIYOR: kapanistan
    // 37 gun sonra defter tumuyle yok edilir. Bu, KVKK "gerektiginden uzun sure
    // saklamama" ilkesinin kodla karsiligidir - ve rakiplerden ayiran bir DURUS'tur.
    //
    // Ama imha, ciftin mirasini kaybetmesi ANLAMINA GELMEZ: uyarilariz. Iki kez.
    // Uyari gonderildigini isaretlemezsek her cron turunda tekrar gonderir ve
    // cifti bogariz - bu yuzden bayrak tutulur.
    public bool ImhaUyari14Gonderildi { get; set; }
    public bool ImhaUyari3Gonderildi { get; set; }

    // Imha tamamlandi. Satir SILINMEZ: "bu defter vardi ve imha edildi" kaydi
    // KVKK kanitidir. Icerik (dilekler, fotograflar, kisisel veri) YOK EDILIR.
    public bool ImhaEdildi { get; set; }
    public DateTimeOffset? ImhaZamani { get; set; }
}
