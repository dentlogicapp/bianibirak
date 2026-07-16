namespace BiAniBirak.Api.Entities;

// ODEME - "miras, bir kereye mahsus".
//
// ===================== SAGLAYICIDAN BAGIMSIZ =====================
//
// Bu tablo HAVALE tablosu DEGILDIR. Odemenin KENDISIDIR.
//
// Bugun havale ile tahsil ediyoruz. Yarin iyzico, obur gun App Store IAP olacak.
// Ucu de AYNI kaydi uretir; degisen tek sey Saglayici alani ve tahsilatin nasil
// dogrulandigidir.
//
// Boyle kurulmasaydi: "havale_odemeleri" tablosu acar, sonra "iyzico_odemeleri"
// acar, paywall'i her ikisine ayri ayri sorar, birinde bug cikar ve odemis bir cift
// defterini indiremezdi. Paralel yapi = drift = guven kaybi.
//
// Paywall TEK SORU sorar: "bu etkinlikte Durum='onaylandi' bir odeme var mi?"
// Parayi kimin tahsil ettigi onu ilgilendirmez.
public class Odeme
{
    public Guid Id { get; set; }

    // TENANT. Odeme ETKINLIGE aittir, kullaniciya degil.
    //
    // Neden: defteri iki es ortak yonetir. Es1 oderse, Es2 de indirebilmelidir -
    // ayni eserin sahibidirler. Odemeyi kullaniciya baglasaydik, Es2 "odeme
    // gerekli" duvarina carpardi ve ikinci kez odemeye kalkardi.
    public Guid EtkinlikId { get; set; }

    // Odemeyi BASLATAN kullanici (kim odedi - denetim ve iletisim icin).
    public Guid? KullaniciId { get; set; }

    // TUTAR ANLIK KAYDEDILIR - ayardan degil, kayittan okunur.
    //
    // Fiyat yarin degisirse, bugun havale talimati almis ama henuz odememis ciftin
    // odeyecegi tutar DEGISMEZ. Aksi halde: cift 500 TL talimati alir, biz fiyati
    // 600'e cikaririz, o 500 gonderir, tutar tutmaz, odeme askida kalir. Onun sucu
    // degil - bizim.
    public decimal Tutar { get; set; }
    public string ParaBirimi { get; set; } = "TRY";

    // SAGLAYICI: "havale" | ileride "iyzico" | "iap_apple" | "iap_google"
    public string Saglayici { get; set; } = "havale";

    // REFERANS KODU - havalenin aciklamasina ELLE yazilir.
    //
    // Insan tarafindan okunacak: telefonda soylenecek, banka ekranina yazilacak.
    // Bu yuzden karisan karakterler alfabeden CIKARILDI (0/O, 1/I/l, 5/S).
    // Bkz. ReferansUreteci.
    //
    // iyzico/IAP'de bu alan saglayicinin islem kimligini tasir.
    public string ReferansKodu { get; set; } = string.Empty;

    // DURUM MAKINESI:
    //   bekliyor      -> cift talimati aldi, para henuz gorulmedi
    //   onaylandi     -> para hesapta goruldu (havalede: yonetici onayi)
    //   reddedildi    -> tutar/aciklama tutmadi, ya da cift vazgecti
    //   suresi_doldu  -> SonGecerlilik gecti, kimse odemedi
    //
    // YALNIZ "onaylandi" indirme yetkisi verir.
    public string Durum { get; set; } = "bekliyor";

    // Onay izi - kim, ne zaman, neden.
    public Guid? OnaylayanKullaniciId { get; set; }
    public DateTimeOffset? OnayZamani { get; set; }

    // Yonetici notu (eksik tutar, farkli isimden gelen havale, iade talebi...).
    // Cift bunu GORMEZ; ic kayittir.
    public string? Not { get; set; }

    // SURELI: bekleyen odeme sonsuza kadar acik kalamaz.
    //
    // Kalsaydi: cift 3 ay once talimat alir, unutur; biz "bekleyen odeme" listesinde
    // olu kayitlarla bogulurduk. Ayrica fiyat degisince eski talimatlar yaniltici olurdu.
    public DateTimeOffset SonGecerlilik { get; set; }

    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}
