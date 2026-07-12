namespace BiAniBirak.Api.Entities;

// SISTEM METNI SURUMU - arsiv. Kanit zincirinin kayip halkasi.
//
// PROBLEM (bu tablo olmadan):
// Kullanici 1 Ocak'ta Kullanim Kosullari'ni onayladi; onay kaydina o metnin hash'i
// yazildi. 1 Mart'ta metni guncelledik. Simdi kullanici "ben boyle bir sey kabul
// etmedim" diyor.
//
// Elimizde: onun onayladigi HASH var. Ama o hash'in KARSILIK GELDIGI METIN yok -
// cunku ustune yazdik. Yani ispatlayabildigimiz tek sey "bir metni onayladi";
// HANGI metni oldugunu gosteremiyoruz.
//
// Hash, ancak metin de saklanirsa kanittir. Aksi halde elimizde anlamsiz bir
// karakter dizisi kalir.
//
// COZUM: her guncellemede ESKI surum buraya arsivlenir. Hash'ten metne gidilir.
// Bu tablo APPEND-ONLY: hicbir zaman silinmez, guncellenmez.
public class SistemMetinSurumu
{
    public Guid Id { get; set; }

    // Hangi metin (kvkk_es, kullanim_kosullari, ...)
    public string Anahtar { get; set; } = string.Empty;

    // Surum damgasi ve hash - onay kaydiyla eslesen anahtar cift.
    public string Surum { get; set; } = string.Empty;
    public string Hash { get; set; } = string.Empty;

    // METNIN TAM HALI. Buyuk olabilir; olsun. Hukuki kanitin bedeli birkac kilobayttir.
    public string Baslik { get; set; } = string.Empty;
    public string Icerik { get; set; } = string.Empty;

    public DateTimeOffset YururlukTarihi { get; set; }

    // Bu surumu kim yururluge koydu (super admin) - denetim izi.
    public Guid? GuncelleyenKullaniciId { get; set; }

    // Arsivlenme ani.
    public DateTimeOffset CreatedAt { get; set; }
}
