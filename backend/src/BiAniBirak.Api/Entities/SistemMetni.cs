namespace BiAniBirak.Api.Entities;

// KVKK / gizlilik / aydinlatma metinleri - super panelden yonetilir.
// Hardcoded yasak: /kvkk ve /gizlilik sayfalari bu tablodan okur.
// Anahtar ornekleri: "kvkk_aydinlatma", "gizlilik_politikasi", "kullanim_kosullari",
// "saklama_imha_politikasi", "cerez_politikasi".
public class SistemMetni
{
    public Guid Id { get; set; }

    // Benzersiz anahtar (ASCII, snake_case)
    public string Anahtar { get; set; } = string.Empty;

    // Kullaniciya gorunen baslik
    public string Baslik { get; set; } = string.Empty;

    // Markdown/duz metin govde
    public string Icerik { get; set; } = string.Empty;

    // Yururluk tarihi (metin surumleme; kullaniciya "son guncelleme" olarak gosterilir)
    public DateTimeOffset YururlukTarihi { get; set; }

    // SURUM + HASH - hukuki kanitin temeli.
    //
    // Kullanici bir metni onayladiginda, o metnin HASH'i onay kaydina yazilir. Metni
    // sonradan degistirsek bile, kullanicinin onayladigi hash ESKI metni isaret eder.
    // "Siz bunu onayladiniz" demek icin, o gunku metnin ne oldugunu ISPAT edebilmeliyiz.
    //
    // Surum: yururluk tarihinden turetilen insan-okunur damga ("2026-07-12").
    // Hash  : icerigin SHA-256'si (hex). Bir harf degisse hash tamamen degisir.
    public string Surum { get; set; } = string.Empty;
    public string Hash { get; set; } = string.Empty;

    public Guid? GuncelleyenKullaniciId { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}
