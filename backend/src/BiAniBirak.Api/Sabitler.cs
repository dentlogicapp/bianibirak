namespace BiAniBirak.Api;

// Uygulama geneli sabitler. Varsayilan degerler tek kaynaktan (tekrar yok).
// Not: tenant-ozel degerler etkinlik_ayarlari'ndan gelir; bunlar yalniz ILK varsayilan.
public static class Sabitler
{
    // Etkinlik olusturulurken ayara yazilan varsayilan karsilama metni (0D.3).
    // Cift hicbir sey yazmasa da etkinlik tam/kusursuz olusur (zero-friction).
    public const string VarsayilanKarsilamaMetni =
        "Bu ozel gunumuzde bize bir ani birakir misin? Dilegin, defterimizde sonsuza dek yasayacak.";

    // Davetliye rehber prompt varsayilani.
    public const string VarsayilanPromptMetni =
        "Bize bir dilek, bir ani ya da bir tavsiye birak.";

    // Kapanis penceresi varsayilani (gun) - Karar 4 / Belge 05.
    public const int VarsayilanKapanisPencereGun = 30;
}
