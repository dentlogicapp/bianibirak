namespace BiAniBirak.Api.Entities;

// Belge 04 -> paylasim_baglantilari. Her ese ayri token/QR (cift-link + izolasyon).
// EtkinlikId = tenant. Kural: etkinlik basina iki satir; (EtkinlikId, Es) unique.
// Token tahmin edilemez + benzersiz; public URL + QR bu tokene baglanir (Belge 08).
public class PaylasimBaglantisi
{
    public Guid Id { get; set; }

    // tenant anahtari
    public Guid EtkinlikId { get; set; }

    // es1 | es2  (hangi esin linki)
    public string Es { get; set; } = string.Empty;

    // tahmin edilemez, benzersiz paylasim tokeni
    public string Token { get; set; } = string.Empty;

    // KISA KOD - davetiye karekodunun gittigi kisa adres kodu.
    //
    // Neden ayri ve kisa: Token ~43 karakter. O kadar veriyi tasiyan bir karekod cok
    // yogun modul icerir; kucuk basildiginda telefon okuyamaz. Davetiyede karekod
    // KUCUK olmali (ciftin istegi). Cozum: kisa kod -> /d/{KisaKod} -> /k/{Token}
    // yonlendirmesi. Kisa link = az modul = kucukken bile okunur.
    //
    // Mevcut linklere ilk erisimde tembel atanir (nullable baslar).
    public string? KisaKod { get; set; }

    public bool Aktif { get; set; } = true;

    public DateTimeOffset CreatedAt { get; set; }
}
