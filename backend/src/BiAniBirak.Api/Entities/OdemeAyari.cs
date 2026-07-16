namespace BiAniBirak.Api.Entities;

// ODEME AYARLARI - tek satir. Super panelden yonetilir.
//
// HARDCODED DEGER YASAK (mimari sabit). IBAN kodda yazsaydi:
//   - Banka degistirmek DEPLOY gerektirirdi
//   - Fiyat degistirmek DEPLOY gerektirirdi
//   - Yanlis IBAN canlida duzeltilene kadar para BASKASINA giderdi
//
// Hepsi veritabaninda, hepsi anlik degistirilebilir.
public class OdemeAyari
{
    public Guid Id { get; set; }

    // ---- HAVALE BILGILERI ----
    public string Iban { get; set; } = string.Empty;
    public string AliciAd { get; set; } = string.Empty;
    public string BankaAd { get; set; } = string.Empty;

    // ---- FIYAT ----
    //
    // Tek fiyat. "Miras, bir kereye mahsus" (Belge 05).
    //
    // Boyuta gore kademeli fiyat DUSUNULMEDI: cift A3 secmek zorunda kalmasin diye
    // degil, A3'un DAHA IYI oldugu izlenimi dogmasin diye. Boyut bir TERCIHTIR,
    // bir UPGRADE degil. Fiyat farki koyarsak, kucuk boyut secen cift "eksik bir sey
    // aldim" hisseder - oysa A4 en dogru secimdir.
    public decimal Tutar { get; set; }
    public string ParaBirimi { get; set; } = "TRY";

    // Bekleyen odemenin gecerlilik suresi (gun).
    public int GecerlilikGun { get; set; } = 7;

    // ---- KONTROL ----
    //
    // Aktif=false -> odeme sistemi KAPALI. Indirme ucu ODEME OLMADAN calisir.
    //
    // Bu bir "acil durum kolu"dur: odeme altyapisinda bir sorun cikarsa (yanlis IBAN,
    // banka arizasi, hukuki engel), paywall'i aninda kaldirip ciftlerin mirasini
    // kurtarabiliriz. 37 gunluk pencere bekleyemez - defter imha olur.
    //
    // Ayrica lansman oncesi test icin: sistem hazir ama para almiyoruz.
    public bool Aktif { get; set; }

    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}
