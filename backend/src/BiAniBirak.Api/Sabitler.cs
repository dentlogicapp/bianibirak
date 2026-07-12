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
    // NOT: Metinler ZAMANDAN BAGIMSIZ yazilir. Davetli linki dugunden haftalar once
    // de acabilir, aylar sonra da - "bugun" demek yanlis olur. Bu yuzden metin,
    // acildigi ana degil, PAYLASILAN ANIYA seslenir.
    private static readonly TurVarsayilan Dugun = new(
        KarsilamaMetni:
            "Hayatımızın en güzel gününü sevdiklerimizle paylaşıyoruz. Bu yolculukta yanımızda " +
            "olduğun için teşekkür ederiz. Bıraktığın satırlar, yıllar sonra çocuklarımıza " +
            "okuyacağımız defterimizde yaşayacak.",
        PromptMetni:
            "Bize bir dilek, hatıra ya da içinden geleni paylaşacağın bir mesaj bırak!",
        SayacAktifCumle:
            "Düğünümüze kalan süre",
        SayacBittiCumle:
            "Hayatımızın en güzel günü");

    // Nisan
    private static readonly TurVarsayilan Nisan = new(
        KarsilamaMetni:
            "Birlikte yürüyeceğimiz yolun ilk adımını atıyoruz. Bu güzel yolculukta yanımızda " +
            "olduğun için teşekkür ederiz. Sözlerin, birlikte yazacağımız hikâyenin ilk " +
            "sayfası olacak.",
        PromptMetni:
            "Bize bir dilek, hatıra ya da içinden geleni paylaşacağın bir mesaj bırak!",
        SayacAktifCumle:
            "Nişanımıza kalan süre",
        SayacBittiCumle:
            "Nişanlandık");

    // Nikah
    private static readonly TurVarsayilan Nikah = new(
        KarsilamaMetni:
            "Birbirimize 'evet' diyoruz. Bu anlamlı yolda bizimle olduğun için teşekkür ederiz. " +
            "Bıraktığın satırlar, ortak defterimizde bir ömür kalacak.",
        PromptMetni:
            "Bize bir dilek, hatıra ya da içinden geleni paylaşacağın bir mesaj bırak!",
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
        "Hayatımızın en güzel gününü sevdiklerimizle paylaşıyoruz. Bu yolculukta yanımızda " +
        "olduğun için teşekkür ederiz. Bıraktığın satırlar, yıllar sonra çocuklarımıza " +
        "okuyacağımız defterimizde yaşayacak.";

    public const string VarsayilanPromptMetni =
        "Bize bir dilek, hatıra ya da içinden geleni paylaşacağın bir mesaj bırak!";

    // ---- KURASYON VARSAYILANLARI (Asama 6) ----
    // Cift hicbir seye dokunmasa bile ESER kusursuz cikar. Editoryel Turkce.
    public sealed record KurasyonVarsayilanBloku(
        string KapakBaslik,
        string KapakAltBaslik,
        string IthafMetni,
        string KapanisMetni);

    public static KurasyonVarsayilanBloku KurasyonVarsayilan(
        string tur, string es1Ad, string es2Ad, DateTimeOffset etkinlikTarihi)
    {
        var kultur = new System.Globalization.CultureInfo("tr-TR");
        var tarihMetni = etkinlikTarihi.ToLocalTime().ToString("d MMMM yyyy", kultur);

        var turAdi = tur switch
        {
            "nisan" => "Nişanımız",
            "nikah" => "Nikahımız",
            _ => "Düğünümüz",
        };

        var ithaf = tur switch
        {
            "nisan" =>
                "Bu defter, birlikte yürüyeceğimiz yolun ilk adımında yanımızda olan herkese aittir. " +
                "Bıraktığınız her satır, yazmaya yeni başladığımız hikâyenin ilk sayfalarında yaşayacak.",
            "nikah" =>
                "Bu defter, birbirimize 'evet' dediğimiz gün bizimle olan herkese aittir. " +
                "Sözleriniz, bir ömür boyu döneceğimiz bu sayfalarda kalacak.",
            _ =>
                "Bu defter, hayatımızın en güzel gününde yanımızda olan herkese aittir. " +
                "Yazdıklarınız yıllar sonra çocuklarımıza okuyacağımız satırlar olacak. " +
                "Bizi biz yapan sevginiz için teşekkür ederiz.",
        };

        var kapanis = tur switch
        {
            "nisan" =>
                "Bu satırlar burada bitiyor; hikâyemiz daha yeni başlıyor.",
            "nikah" =>
                "Burada yazılanlar bizimle kalacak; sevginiz bizimle yürüyecek.",
            _ =>
                "Bu defter kapanıyor ama bıraktıklarınız bizimle kalıyor. " +
                "Bir gün bu sayfaları çocuklarımızla birlikte açacağız.",
        };

        return new KurasyonVarsayilanBloku(
            KapakBaslik: $"{es1Ad} & {es2Ad}",
            KapakAltBaslik: $"{turAdi} · {tarihMetni}",
            IthafMetni: ithaf,
            KapanisMetni: kapanis);
    }

    // SAKLAMA & IMHA (Musa karari): kapanistan sonra 37 gun. Aksiyon yoksa TAM IMHA.
    // Davetli ekraninda ve KVKK metninde acikca gosterilir - guven rozeti.
    public const int SaklamaGun = 37;

    // Editoryel temalar (PDF + onizleme ortak sozlugu)
    public static readonly string[] Temalar = { "klasik", "modern", "zarif" };
}
