namespace BiAniBirak.Api.Entities;

// CIFT GORSELLERI (en fazla 8 - Musa karari).
// Ayni havuz uc yerde kullanilir: davetli karsilama ekrani, panel, defter (PDF).
// Cift her an degistirebilir, siralayabilir, defterdeki KONUMUNU secebilir.
public class EtkinlikGorseli
{
    public Guid Id { get; set; }
    public Guid EtkinlikId { get; set; }

    // Depolama anahtari ({EtkinlikId}/{guid}.jpg) - dosya adi ASLA kullanicidan gelmez
    public string DepolamaAnahtari { get; set; } = string.Empty;

    // Defterdeki rolu: "kapak" | "ithaf" | "bolum" | "kapanis" | "galeri"
    // galeri = deftere girmez, yalniz davetli ekraninda/panelde gorunur
    public string Konum { get; set; } = "galeri";

    // Sira (galeri gosterimi + ayni konumda birden fazla varsa)
    public int Sira { get; set; }

    // Cift kendi yazisini ekleyebilir (defterde gorsel altina basilir)
    public string? Altyazi { get; set; }

    public int Genislik { get; set; }
    public int Yukseklik { get; set; }
    public long Bayt { get; set; }

    public DateTimeOffset CreatedAt { get; set; }
}
