namespace BiAniBirak.Api.Modeller;

// Istek govdeleri (JSON). Minimal ve sade.
public record KayitIstek(string Ad, string Email, string Sifre);
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
    string Mesaj);

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
