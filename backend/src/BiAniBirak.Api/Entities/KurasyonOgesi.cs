namespace BiAniBirak.Api.Entities;

// Kurasyon ogesi: bir onayli katkinin ESERDEKI yeri.
// Katkinin metnine DOKUNULMAZ; yalniz dahil/haric, sira ve bolum burada.
public class KurasyonOgesi
{
    public Guid Id { get; set; }
    public Guid KurasyonId { get; set; }
    public Guid KatkiId { get; set; }

    // Cift bu dilegi esere dahil etti mi? (kurasyon = eleme; "her seyi al" DEGIL)
    public bool Dahil { get; set; } = true;

    // Eserdeki sira (kucukten buyuge)
    public int Sira { get; set; }

    // Ozel bolum basligi (GruplamaTipi = "bolum" ise kullanilir)
    public string? BolumBasligi { get; set; }

    public DateTimeOffset CreatedAt { get; set; }
}
