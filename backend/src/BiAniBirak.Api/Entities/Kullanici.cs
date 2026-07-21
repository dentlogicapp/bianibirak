namespace BiAniBirak.Api.Entities;

// Belge 04 -> kullanicilar tablosu.
// Ekosistem standardi kolonlar snake_case (email, sifre_hash, super_admin,
// created_at/updated_at/deleted_at); domain kolonlar PascalCase ASCII (Id, Ad).
public class Kullanici
{
    public Guid Id { get; set; }

    // ekosistem standardi: e-posta benzersiz
    public string Email { get; set; } = string.Empty;

    // bcrypt hash (Asama 4'te doldurulur)
    public string SifreHash { get; set; } = string.Empty;

    public string Ad { get; set; } = string.Empty;

    // Cinsiyet: "kadin" | "erkek" | null (Profilim; opsiyonel).
    public string? Cinsiyet { get; set; }

    public bool SuperAdmin { get; set; }

    // Sessiz saatler (push ertelemesi) - "HH:mm" TR saati. Aktifse aralikta bildirim ertelenir.
    public bool SessizSaatAktif { get; set; }
    public string? SessizSaatBaslangic { get; set; } // "22:00"
    public string? SessizSaatBitis { get; set; } // "08:00"

    // AKTIF DEFTER - CIHAZLAR ARASI SENKRONUN TEK DOGRULUK KAYNAGI.
    //
    // NEDEN BURAYA TASINDI:
    // Aktif defter bugune kadar YALNIZCA JWT claim'inde (aktif_etkinlik_id)
    // yasiyordu; yani her cihazin kendi cerezinde muhurlu duruyordu. Web'de
    // defter degistirildiginde web kendine yeni bir muhur yaziyor, telefonun
    // muhrune kimse dokunmuyordu. Telefon sunucuya "ben hangi defterdeyim" diye
    // sorsa bile sunucunun verecegi bir cevap YOKTU - bilgi orada durmuyordu.
    // Ne kadar sik sorulursa sorulsun senkron IMKANSIZDI.
    //
    // Artik dogruluk kaynagi burasi, JWT ise onun ONBELLEGI. Tenant guard
    // (AktifTenant) hala CLAIM'e bakar - izolasyon disiplini degismedi; bu kolon
    // yalnizca "hangi deftere gecilmeli" sorusunu yanitlar.
    //
    // Yabanci anahtar YOK: defter kalici silinebilir ve o an bu alan olu bir
    // kimlige isaret eder. Cozum kisitlama degil DOGRULAMA - /api/durum bu degeri
    // bildirmeden once uyeligi kontrol eder, yoksa null doner.
    public Guid? AktifEtkinlikId { get; set; }

    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
    // HATIRLATMA BILDIRIMI ICIN - defter imha edildikten SONRA da saklanir.
    //
    // Defter ve icindeki her sey 20. gunde tamamen silinir; isimler, dilekler,
    // fotograflar hicbiri kalmaz. Ama "bu kullanicinin bir ozel gunu vardi ve ne
    // zamandi" bilgisi hesaba bagli olarak durur - yil donumlerinde (3/6/9/12 ay)
    // hatirlatma gonderebilmek icin.
    //
    // KVKK metninde ACIKCA yazilidir: bu iki alan DEFTER VERISI DEGILDIR, yalniz
    // bildirim icin kullanilir ve hesap silindiginde birlikte silinir. Bildirim
    // metinlerinde isim ya da defter icerigi YER ALMAZ - zaten silinmislerdir.
    public DateTimeOffset? SonOzelGun { get; set; }
    public string? SonEtkinlikTuru { get; set; }

    // Hangi hatirlatma esikleri gonderildi (3,6,9,12) - virgullu liste. Tekrar
    // gonderimi engeller; ayri tablo acmaya degmeyecek kadar kucuk bir izdir.
    public string? HatirlatmaGonderilen { get; set; }

    public DateTimeOffset? DeletedAt { get; set; }
}
