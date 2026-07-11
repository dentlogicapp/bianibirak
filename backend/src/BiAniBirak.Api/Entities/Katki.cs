namespace BiAniBirak.Api.Entities;

// Belge 04 -> katkilar. Davetli dilekleri; birlesim-oncesi izolasyon.
// EtkinlikId = tenant. KaynakEs (es1/es2) hangi linkten geldigini isaretler.
// Katki once YALNIZCA ilgili esin onay kuyruguna duser (Durum=beklemede).
public class Katki
{
    public Guid Id { get; set; }

    // tenant anahtari
    public Guid EtkinlikId { get; set; }

    // hangi paylasim linkinden geldi
    public Guid PaylasimBaglantiId { get; set; }

    // es1 | es2 - hangi esin kuyruguna dusecek (izolasyon)
    public string KaynakEs { get; set; } = string.Empty;

    // davetli kimlik/iletisim (Belge 08: ad+email+telefon ZORUNLU - Musa karari)
    public string DavetliAd { get; set; } = string.Empty;
    public string DavetliEmail { get; set; } = string.Empty;
    public string DavetliTelefon { get; set; } = string.Empty;

    public string Mesaj { get; set; } = string.Empty;

    // dilek | foto  (gelecek: ses | video). Asama 3'te daima dilek.
    public string Tur { get; set; } = string.Empty;

    // beklemede | onayli | red | duzeltme_talep_edildi (Asama 4'te gecisler)
    public string Durum { get; set; } = string.Empty;

    public Guid? OnaylayanKullaniciId { get; set; }
    public DateTimeOffset? OnayZamani { get; set; }

    // duzeltme akisi (Asama 4)
    public string? DuzeltmeNotu { get; set; }
    public Guid? DuzeltmeSablonId { get; set; }
    public string? DuzeltmeTokeni { get; set; }
    public DateTimeOffset? DuzeltmeTalepZamani { get; set; }

    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }

    // ---- SUPER PANEL MODERASYON ----
    // Uygunsuz icerik kaldirma (Belge 08: raporla/kaldir). Cop kutusuna duser, geri alinabilir.
    public bool SilindiMi { get; set; }
    public DateTimeOffset? SilinmeZamani { get; set; }
    public Guid? SilenKullaniciId { get; set; }
}
