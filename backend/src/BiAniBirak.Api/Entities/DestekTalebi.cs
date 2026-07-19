namespace BiAniBirak.Api.Entities;

// DESTEK TALEBI - kullanicinin sistem yoneticileriyle konusma basligi.
//
// TASARIM: bir kullanicinin AYNI ANDA birden fazla acik talebi olabilir ama tipik
// kullanim tek konusmadir. Her talep bir KONU'dur; mesajlar altinda akar (WhatsApp
// benzeri). Kullanici hicbir bilgi girmez - kimlik JWT'den gelir.
//
// Durum: "acik" (yonetici yaniti bekleniyor) | "yanitlandi" (yonetici yazdi, kullanici
// okumadi) | "kapali" (cozuldu). Durum, LISTEDE oncelik siralamasi icin kritiktir:
// yonetici hangi konusmanin kendisini bekledigini bir bakista gormelidir.
public class DestekTalebi
{
    public Guid Id { get; set; }

    // Talebi acan kullanici.
    public Guid KullaniciId { get; set; }

    // Talep acilirken aktif olan defter (varsa) - baglam icin, zorunlu degil.
    public Guid? EtkinlikId { get; set; }

    // Ilk mesajdan turetilen kisa konu - listede okunabilirlik icin.
    public string Konu { get; set; } = string.Empty;

    // "acik" | "yanitlandi" | "kapali"
    public string Durum { get; set; } = "acik";

    // Siralama ve "yeni mesaj var mi" icin - her mesajda guncellenir.
    public DateTimeOffset SonMesajZamani { get; set; }

    // Okunmamis sayaclari: iki taraf da "bende kac yeni var" gorur.
    public int KullaniciOkunmamis { get; set; }
    public int YoneticiOkunmamis { get; set; }

    // OKUNDU ISARETI: yonetici konusmayi actigi an. Kullanici, bu andan ONCE
    // gonderdigi mesajlarin yaninda "Okundu" gorur.
    //
    // NEDEN ONEMLI: destek yukunun en buyuk kaynagi "gordunuz mu?" belirsizligidir.
    // Kullanici gorulduğunu bilmezse ayni seyi tekrar yazar; iki taraf da yorulur.
    public DateTimeOffset? YoneticiOkuduZamani { get; set; }

    // KAPANMA DAMGASI - "cozuldu" isaretlendigi an.
    //
    // Iki isi vardir:
    //   1) Kullaniciya ve yoneticiye KALICI SILINMEYE KALAN SUREYI gosterir.
    //   2) Arka plan gorevi 24 saati dolan konusmayi mesajlariyla birlikte siler.
    //
    // Yeniden acilirsa NULL'a doner - sayac durur, silme iptal olur.
    public DateTimeOffset? KapanmaZamani { get; set; }

    // Son hareket - 7 gun sessiz kalan "yanitlandi" konusmalari otomatik kapatmak icin.
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}
