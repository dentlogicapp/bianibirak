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

    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}
