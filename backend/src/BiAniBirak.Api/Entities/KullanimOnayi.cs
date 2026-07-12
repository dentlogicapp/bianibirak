namespace BiAniBirak.Api.Entities;

// KULLANIM ONAYI - hukuki kanit kaydi.
//
// NEDEN VAR:
// Bir kullanici, defterini indirmeden 37 gunun gecmesine izin verir ve verisi imha
// edilir. Sonra doner ve der ki: "Ben boyle bir sey kabul etmedim. Verimi geri isterim.
// Yoksa dava ederim."
//
// O anda elimizde SUNLAR olmalidir:
//   1. Bu kullanicinin, kayit aninda hangi metni GORDUGU,
//   2. O metnin o tarihte tam olarak NE YAZDIGI (kelimesi kelimesine),
//   3. Onayin NE ZAMAN, HANGI IP'den, HANGI TARAYICIDAN verildigi.
//
// Metnin "o tarihte ne yazdigini" ispat etmenin yolu HASH'tir: metin degistiginde
// hash degisir. Kullanicinin onayladigi hash, o gunku metnin hash'idir. Metni sonradan
// degistirsek bile, eski hash eski metni isaret eder - ve eski metin surumu saklanir.
//
// Bu kayit, kullanici hesabini SILSE BILE durur. KVKK m.5/2-e: "bir hakkin tesisi,
// kullanilmasi veya korunmasi icin veri islemenin zorunlu olmasi" - hukuki savunma
// hakki, acik riza olmadan da veri islemeyi mesru kilar. Sakladigimiz sey PII degil:
// kullanici kimligi (UUID), hash, zaman, IP. Ad, e-posta, telefon YOK.
public class KullanimOnayi
{
    public Guid Id { get; set; }

    // Kullanici SILINSE BILE bu kayit kalir; KullaniciId null'a duser ama hash ve
    // zaman durur. "Bir kullanici su tarihte su metni onayladi" bilgisi korunur.
    public Guid? KullaniciId { get; set; }

    // Hangi metin: "kvkk_aydinlatma" | "kullanim_kosullari" | "acik_riza"
    public string MetinAnahtar { get; set; } = string.Empty;

    // Metnin o gunku SURUMU (yururluk tarihi damgasi). Metin guncellenince artar.
    public string MetinSurum { get; set; } = string.Empty;

    // SHA-256 (hex). Kanitin kalbi: metnin o gunku hali, kelimesi kelimesine.
    public string MetinHash { get; set; } = string.Empty;

    // Onay baglami - "bu gercekten o kisi miydi?" sorusuna delil.
    public string? IpAdresi { get; set; }
    public string? TarayiciBilgisi { get; set; }

    // Onayin verildigi an. Bu kayit APPEND-ONLY: hicbir zaman guncellenmez.
    public DateTimeOffset CreatedAt { get; set; }
}
