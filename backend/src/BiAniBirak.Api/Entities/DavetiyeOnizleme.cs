namespace BiAniBirak.Api.Entities;

// DAVETIYE ONIZLEME - ciftin PAYLASTIGI karekod onizleme durumu.
//
// Iki es AYNI onizlemeyi duzenler: biri zemin rengini/boyutu/konumu degistirdiginde
// digeri (yakin-canli polling ile) ayni degisikligi gorur. Telefonda konusurken birlikte
// karar verebilsinler diye. Son duzenleyen esin hali kalicidir; menu tekrar acildiginda
// her iki es de son hali gorur.
//
// Etkinlik basina TEK satir (EtkinlikId = PK). Onizleme durumu ORTAKTIR - bu, katki
// izolasyonuna aykiri degildir; burada paylasilan sadece gorsel tercih (renk/boyut/konum),
// katki/onay kuyrugu DEGIL.
public class DavetiyeOnizleme
{
    // tenant = PK (etkinlik basina tek satir)
    public Guid EtkinlikId { get; set; }

    // davetiye zemin rengi (hex, "#525151")
    public string Zemin { get; set; } = "#525151";

    // karekod olcegi (davetiyenin yuzdesi)
    public int Olcek { get; set; } = 35;

    // karekod merkez konumu (yuzde)
    public double PosX { get; set; } = 50;
    public double PosY { get; set; } = 100;

    // son duzenleyen es (es1 | es2) - "esiniz duzenliyor" + son-hal atifi icin
    public string? SonDuzenleyen { get; set; }

    public DateTimeOffset UpdatedAt { get; set; }
}
