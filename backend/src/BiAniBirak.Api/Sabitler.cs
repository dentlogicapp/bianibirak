namespace BiAniBirak.Api;

// Uygulama geneli sabitler. Varsayilan degerler tek kaynaktan (tekrar yok).
// Not: tenant-ozel degerler etkinlik_ayarlari'ndan gelir; bunlar yalniz ILK varsayilan.
public static class Sabitler
{
    // Kapanis penceresi varsayilani (gun) - Karar 4 / Belge 05.
    public const int VarsayilanKapanisPencereGun = 30;

    // Kapanis penceresi minimum (gun) - Belge 05 fiyat politikasi: min 30, uzeri orantili ucret.
    public const int MinKapanisPencereGun = 30;

    // Kapanis penceresi maksimum (gun).
    public const int MaxKapanisPencereGun = 365;

    // ---- TUR-BAZLI VARSAYILAN ICERIK BLOKLARI ----
    // Cift, zorunlu alanlar (isimler/tur/tarih) disinda HICBIR SEYE DOKUNMASA BILE
    // etkinlik kusursuz calisir. Isteyen sonradan "Etkinlik & Gorunum"den ozellestirir.
    public sealed record TurVarsayilan(
        string KarsilamaMetni,
        string PromptMetni,
        string SayacAktifCumle,
        string SayacBittiCumle);

    // Dugun
    private static readonly TurVarsayilan Dugun = new(
        KarsilamaMetni:
            "Bugün hayatımızın en güzel gününü yaşıyoruz. Bu mutluluğu bizimle paylaştığın için teşekkür ederiz. " +
            "Bize bir anı bırakır mısın? Yazdıkların, yıllar sonra çocuklarımıza okuyacağımız defterimizde yaşayacak.",
        PromptMetni:
            "Bize bir dilek, bir hatıra ya da bir tavsiye bırak.",
        SayacAktifCumle:
            "Düğünümüze kalan süre",
        SayacBittiCumle:
            "Bugün en güzel günümüz");

    // Nisan
    private static readonly TurVarsayilan Nisan = new(
        KarsilamaMetni:
            "Birlikte yürüyeceğimiz yolun ilk adımını attık. Bu güzel günde yanımızda olduğun için teşekkür ederiz. " +
            "Bize bir anı bırakır mısın? Sözlerin, birlikte yazacağımız hikâyenin ilk sayfası olacak.",
        PromptMetni:
            "Bize bir dilek, bir hatıra ya da bir tavsiye bırak.",
        SayacAktifCumle:
            "Nişanımıza kalan süre",
        SayacBittiCumle:
            "Nişanlandık");

    // Nikah
    private static readonly TurVarsayilan Nikah = new(
        KarsilamaMetni:
            "Bugün birbirimize 'evet' dedik. Bu anlamlı günde bizimle olduğun için teşekkür ederiz. " +
            "Bize bir anı bırakır mısın? Bıraktığın satırlar, ortak defterimizde bir ömür kalacak.",
        PromptMetni:
            "Bize bir dilek, bir hatıra ya da bir tavsiye bırak.",
        SayacAktifCumle:
            "Nikahımıza kalan süre",
        SayacBittiCumle:
            "Artık biriz");

    // Tur -> varsayilan blok. Bilinmeyen tur icin dugun bloguna duser (guvenli varsayilan).
    public static TurVarsayilan TureGoreVarsayilan(string tur) => tur switch
    {
        "nisan" => Nisan,
        "nikah" => Nikah,
        _ => Dugun,
    };

    // Geriye donuk uyumluluk (eski cagrilar): dugun blogundan.
    public const string VarsayilanKarsilamaMetni =
        "Bugün hayatımızın en güzel gününü yaşıyoruz. Bu mutluluğu bizimle paylaştığın için teşekkür ederiz. " +
        "Bize bir anı bırakır mısın? Yazdıkların, yıllar sonra çocuklarımıza okuyacağımız defterimizde yaşayacak.";

    public const string VarsayilanPromptMetni =
        "Bize bir dilek, bir hatıra ya da bir tavsiye bırak.";
}
