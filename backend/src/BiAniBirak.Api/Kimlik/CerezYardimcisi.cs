namespace BiAniBirak.Api.Kimlik;

// Auth cerezi tek doğruluk kaynağı. HttpOnly + Secure + SameSite=Lax + HOST-ONLY.
// Domain attribute YOK -> yalniz bianibirak.dentlogicapp.com; Notlar'in .dentlogicapp.com
// parent cerezi KULLANILMAZ (uc sinir: host-scoped cerez). Ayni-origin /api ile uyumlu.
public static class CerezYardimcisi
{
    public const string CerezAdi = "bianibirak_oturum";

    private static CookieOptions Secenek(DateTimeOffset sonaErme) => new()
    {
        HttpOnly = true,
        Secure = true,
        SameSite = SameSiteMode.Lax,
        Path = "/",
        // Domain BILINCLI OLARAK verilmez -> host-only cerez.
        Expires = sonaErme,
        IsEssential = true,
    };

    public static void Yaz(HttpResponse yanit, string token, int gecerlilikGun)
        => yanit.Cookies.Append(CerezAdi, token, Secenek(DateTimeOffset.UtcNow.AddDays(gecerlilikGun)));

    public static void Sil(HttpResponse yanit)
        => yanit.Cookies.Append(CerezAdi, string.Empty, Secenek(DateTimeOffset.UnixEpoch));
}
