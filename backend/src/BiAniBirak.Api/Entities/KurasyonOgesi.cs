namespace BiAniBirak.Api.Entities;

// Kurasyon ogesi: bir onayli katkinin ESERDEKI yeri.
// Katkinin metnine DOKUNULMAZ; yalniz dahil/haric, sira ve bolum burada.
public class KurasyonOgesi
{
    public Guid Id { get; set; }
    public Guid KurasyonId { get; set; }
    public Guid KatkiId { get; set; }

    // Cift bu dilegi esere dahil etti mi? (kurasyon = eleme; "her seyi al" DEGIL)
    public bool Dahil { get; set; } = true;

    // Eserdeki sira (kucukten buyuge)
    public int Sira { get; set; }

    // Ozel bolum basligi (GruplamaTipi = "bolum" ise kullanilir)
    public string? BolumBasligi { get; set; }

    // SABITLEME: cift bu dilegi ELLE tasidi. Akilli sayfa duzeni ona DOKUNMAZ;
    // yalnizca cevresindeki bosluklari diger dileklerle doldurur. Kullanicinin
    // elle verdigi karar, eniyilemenin onundedir.
    public bool Sabit { get; set; }

    // TEK SAYFAYA SIGDIR: iki sayfaya tasan bir dilek icin cift, fotografin
    // bir miktar kucultulmesini SECEBILIR. Yaziya asla dokunulmaz; kucultme
    // yalniz bu kartta ve yalnizca kullanici istediginde uygulanir.
    public bool TekSayfa { get; set; }

    public DateTimeOffset CreatedAt { get; set; }
}
