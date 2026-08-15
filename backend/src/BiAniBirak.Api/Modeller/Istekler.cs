namespace BiAniBirak.Api.Modeller;

// Istek govdeleri (JSON). Minimal ve sade.
// Onaylar: kullanicinin kabul ettigi metin anahtarlari ("kvkk_aydinlatma",
// "kullanim_kosullari"). ZorunluMetinler'in TAMAMI gelmelidir; eksikse kayit reddedilir.
// Ortuk riza (varsayilan isaretli kutucuk, "kabul etmis sayilirsiniz") KVKK'da
// GECERSIZDIR - bu yuzden istemci acikca gondermek zorundadir.
public record KayitIstek(string Ad, string Email, string Sifre, string[]? Onaylar = null);
public record GirisIstek(string Email, string Sifre);
public record ProfilGuncelleIstek(string Ad, string? Cinsiyet);

// Etkinlik olusturma (Belge 03 Akis 1: minimal aktivasyon).
// Tur: dugun|nisan|nikah. Tarih ISO (yyyy-MM-dd). Acilis/Kapanis ISO-8601.
// KapanisTarihi bos gelirse backend varsayilani uygular (EtkinlikTarihi + 30 gun).
public record EtkinlikOlusturIstek(
    string Tur,
    string Es1Ad,
    string Es2Ad,
    string EtkinlikTarihi,
    string? AcilisTarihi,
    string? KapanisTarihi,
    string? KurucuEs);

// Etkinlik duzenleme. Null alan = degistirme (kismi guncelleme).
public record EtkinlikGuncelleIstek(
    string? Tur,
    string? Es1Ad,
    string? Es2Ad,
    string? EtkinlikTarihi);

// Davetli katki birakma (public; token URL'de). Ad+email+telefon+mesaj ZORUNLU (Belge 08).
public record KatkiBirakIstek(
    string DavetliAd,
    string DavetliEmail,
    string DavetliTelefon,
    string DavetliIliski,
    string Mesaj,
    // KVKK RIZASI - davetli icin de ZORUNLU.
    //
    // Onceki surumde ekranda kutucuk vardi ama isaretlendigi HICBIR YERE kaydedilmiyordu.
    // Yani rizayi aliyorduk ama ISPATLAYAMIYORDUK. Kutucuk, kanit degildir.
    bool Riza = false);

// Web Push cihaz kaydi (abone).
public record CihazKayitIstek(
    string PushToken,
    string Platform,
    string? P256dh,
    string? Auth,
    string? CihazAdi);

// Sessiz saat ayari ("HH:mm").
public record SessizSaatIstek(
    bool Aktif,
    string? Baslangic,
    string? Bitis);

// Etkinlik ayarlarini guncelle. Null alan = degistirme (kismi guncelleme).
public record EtkinlikAyarGuncelleIstek(
    string? MarkaKapak,
    string? Tema,
    string? KarsilamaMetni,
    string? PromptMetni,
    int? KapanisPencereGun,
    bool? SayacAktif,
    string? SayacAktifCumle,
    string? SayacBittiCumle);

// ---- SUPER PANEL ----

// Kalici silme: cift adi teyidi ("Ayse & Musa" birebir)
public record KaliciSilIstek(string? Teyit);

// Super admin yetkisi ata/kaldir
public record SuperAdminAtaIstek(bool SuperAdmin);

// KVKK/gizlilik metni guncelle
public record SistemMetniGuncelleIstek(
    string? Baslik,
    string? Icerik,
    DateTimeOffset? YururlukTarihi);

// KVKK talebi isle (durum + sonuc notu)
public record KvkkTalepIsleIstek(string Durum, string? SonucNotu);

// Kullanici kalici silme: e-posta teyidi
public record KullaniciSilIstek(string? Teyit);

// ---- KURASYON (Asama 6) ----

// AkilliDuzen: sayfalarin dengeli dolmasi icin dilekler yakin komsulariyla
// yer degistirebilir. Kapaliyken sira BIREBIR korunur.
public record KurasyonGuncelleIstek(
    string? Tema,
    string? KapakBaslik,
    string? KapakAltBaslik,
    string? KapakGorselUrl,
    string? IthafMetni,
    string? KapanisMetni,
    string? GruplamaTipi,
    bool? TarihGoster,
    // AKILLI SAYFA DUZENI: sayfalarin dengeli dolmasi icin dilekler yakin
    // komsulariyla yer degistirebilir. Kapaliyken sira BIREBIR korunur.
    bool? AkilliDuzen);

// Sabit: dilek elle tasindi, akilli duzen ona dokunmasin.
// TekSayfa: iki sayfaya tasan dilegi fotografi kuculterek tek sayfaya sigdir.
public record OgeGuncelleIstek(
    bool? Dahil,
    string? BolumBasligi,
    // Sabit: dilek elle tasindi - akilli duzen ona dokunmaz.
    bool? Sabit,
    // TekSayfa: iki sayfaya tasan dilegi, fotografi bir miktar kuculterek
    // tek sayfaya sigdir. Yaziya ASLA dokunulmaz.
    bool? TekSayfa);

public record SiralaIstek(Guid[]? KatkiIdler);

// ---- GORSELLER ----
public record GorselGuncelleIstek(string? Konum);
public record GorselSiralaIstek(Guid[]? Idler);
