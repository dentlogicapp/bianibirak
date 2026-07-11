namespace BiAniBirak.Api.Entities;

// KURASYON (Belge 03 - Akis 6): toplanani ESERE ceviren katman.
// Katkilarin KENDISI dokunulmaz (Karar 2 - ozgunluk); secim/sira/duzen burada tutulur.
// Etkinlik basina TEK kurasyon (unique EtkinlikId).
public class Kurasyon
{
    public Guid Id { get; set; }
    public Guid EtkinlikId { get; set; }

    // Editoryel sablon: "klasik" | "modern" | "zarif"
    public string Tema { get; set; } = "klasik";

    // ---- KAPAK ----
    public string? KapakBaslik { get; set; }      // varsayilan: "Ayse & Musa"
    public string? KapakAltBaslik { get; set; }   // varsayilan: tarih + tur
    public string? KapakGorselUrl { get; set; }   // opsiyonel cift fotografi

    // ---- ITHAF (mirasa ruh katan sayfa - B4) ----
    public string? IthafMetni { get; set; }

    // ---- KAPANIS SAYFASI ----
    public string? KapanisMetni { get; set; }

    // Gruplama: "taraf" (gelinin/damadin tarafindan) | "kronolojik" | "bolum" (ozel basliklar)
    public string GruplamaTipi { get; set; } = "taraf";

    // Defterde tarih gosterilsin mi? (dilek altinda "12 Temmuz 2026")
    public bool TarihGoster { get; set; } = true;

    // Durum: "taslak" | "tamamlandi" (tamamlandi = Kuzey Yildizi metrigi)
    public string Durum { get; set; } = "taslak";
    public DateTimeOffset? TamamlanmaZamani { get; set; }

    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}
