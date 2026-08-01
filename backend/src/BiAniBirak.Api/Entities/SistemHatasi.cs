namespace BiAniBirak.Api.Entities;

// SISTEM HATASI - yakalanmamis exception kaydi (1.2 hata gorunurlugu).
//
// Global hata middleware'i (Program.cs) best-effort yazar; super panel "son 20 hata"
// olarak gosterir. AMAC: sessizce loglanan 500'leri Musa'ya GORUNUR kilmak - bir bug
// stdout'ta kaybolmasin, panelde belirsin.
//
// KISISEL VERI TUTULMAZ: istek govdesi loglanmaz; yalniz yol/metot/exception bilgisi
// ve (varsa) aktor kullanici kimligi. Iz (stack) ve mesaj kisaltilir.
public class SistemHatasi
{
    public Guid Id { get; set; }
    public string Yol { get; set; } = "";       // istek yolu (path)
    public string Metot { get; set; } = "";      // GET/POST/PUT/DELETE...
    public string Mesaj { get; set; } = "";      // exception.Message (kisaltilmis)
    public string Tip { get; set; } = "";        // exception tipi (FullName)
    public string? Iz { get; set; }              // stack trace (kisaltilmis)
    public Guid? KullaniciId { get; set; }        // varsa (best-effort)
    public int Durum { get; set; } = 500;
    public DateTimeOffset CreatedAt { get; set; }
}
