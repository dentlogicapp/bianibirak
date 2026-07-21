namespace BiAniBirak.Api;

// Uygulama geneli sabitler. Varsayilan degerler tek kaynaktan (tekrar yok).
// Not: tenant-ozel degerler etkinlik_ayarlari'ndan gelir; bunlar yalniz ILK varsayilan.
public static class Sabitler
{
    // ================== YASAM DONGUSU - TEK KANON ==================
    //
    // ONCEKI MODELIN HATASI: kapanis penceresi cifte birakilmisti (30-365 gun) ve imha
    // "kapanis + 37" idi. Sonuc: her defterin takvimi FARKLI, hicbir cift ne zaman ne
    // olacagini bilmiyor, destek "sizin defterinizde su tarih" demek zorunda kaliyordu.
    // Ustelik frontend ile backend AYRI hesap yapiyordu - cizelge yalan soyluyordu.
    //
    // YENI MODEL - KURULUM ZAMANINDAN BAGIMSIZ, HER DEFTERDE AYNI:
    //
    //   Acilis      : defter kurulur kurulmaz (davetli girisleri hemen baslar)
    //   Ozel gun    : EtkinlikTarihi (cift belirler - tek degisken budur)
    //   Toplama sonu: Ozel gun + 15 gun  -> yeni dilek YAZILAMAZ
    //   Son indirme : Ozel gun + 20 gun  -> bu ana kadar eser indirilmeli
    //   IMHA        : Ozel gun + 20 gun  -> her sey yok edilir, geri donusu YOK
    //
    // Kurasyon (defter duzenleme) BASTAN SONA aciktir: kurulumdan imhaya kadar cift
    // defterini duzenleyebilir. Kapanan sey yalniz DAVETLI GIRISIDIR.
    //
    // NEDEN 20 GUN (onceki model 37 idi):
    // Sure kisaldi ki KALITE artabilsin. Ayni diskte fotograflari cok daha yuksek
    // cozunurlukte (telefon galerisi kalitesinde) saklayabilmenin bedeli, veriyi daha
    // kisa sure tutmaktir. Miras KAGITTA kalicidir - sunucuda degil. Urun sozu de bu:
    // "bunu indir, bas, sakla; biz saklamiyoruz".
    //
    // Son 5 gun BILINCLI olarak toplamanin kapandigi ve uyarilarin SAAT bazina
    // dustugu kritik penceredir - cift o pencerede tek is yapar: indirir.

    // Ozel gunden sonra davetli girislerinin acik kaldigi sure.
    public const int ToplamaGun = 15;

    // Toplama kapandiktan sonra eserin indirilebilecegi son sure.
    public const int IndirmeGun = 5;

    // Ozel gunden IMHA'ya kadar toplam sure. 15 + 5 = 20.
    public const int ToplamGun = ToplamaGun + IndirmeGun;

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

    // SAKLAMA (kapanis SONRASI): toplama kapandiktan sonra eser bu kadar gun durur,
    // sonra TAM IMHA. IndirmeGun ile aynidir - iki isim, tek gercek.
    //
    // Tek kanon: imha = ozel gun + ToplamGun (20). Kod, cizelge ve yasal metin
    // AYNI sayiyi soyler; ayri hesap yapan ikinci bir yer YOKTUR.
    public const int SaklamaGun = IndirmeGun;

    // COP KUTUSU SURELERI - iki farkli saat, tek cop kutusu.
    //
    // DILEK 30 gun: tek bir dilegin kaybi sinirlidir; bolca dusunme payi verilir.
    // DEFTER 5 gun: tum eser soz konusudur ama sonsuza kadar tutmak "silinir"
    // sozunu curutur. 5 gun, pismanlik icin yeterli, disk icin kabul edilebilir.
    public const int CopDilekGun = 30;
    public const int CopDefterGun = 5;

    // Bildirim saatleri (Turkiye saati, UTC+3). Sabah ve aksam - insanin telefonuna
    // baktigi saatler.
    public const int BildirimSabahSaat = 10;
    public const int BildirimAksamSaat = 19;
    public const int TurkiyeSaatFarki = 3;

    // Editoryel temalar (PDF + onizleme ortak sozlugu)
    public static readonly string[] Temalar = { "klasik", "modern", "zarif" };
}
