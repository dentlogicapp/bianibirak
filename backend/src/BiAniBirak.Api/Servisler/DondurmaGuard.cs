using BiAniBirak.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace BiAniBirak.Api.Servisler;

// DONDURMA GUARD - "dondurulmus defter YAZILAMAZ" kuralinin TEK kaynagi.
//
// SORUN (canlida yakalandi): "Defteri dondur" yalniz DAVETLI yazimlarini engelliyordu.
// Cift giris yapip kurasyonu duzenleyebiliyor, fotograf yukleyebiliyor, hatta BASKIYA
// HAZIR PDF'i INDIREBILIYORDU. Yani dondurma, kotuye kullanim ya da odeme sorunu icin
// bir yaptirim degil, davetliye sessizce kapanan bir kapiydi. Super admin "dondurdum"
// diyor, cift hicbir fark hissetmiyor - eylem YAPILMIS GORUNUP YAPILMAMIS oluyordu.
//
// YENI KURAL: dondurulmus defter SALT OKUNUR.
//   - Cift defterini GOREBILIR (miras gozunun onunden kacirilmaz)
//   - Hicbir YAZIM yapamaz: kurasyon, onay/red, cop, fotograf, davetiye onizleme
//   - BASKIYA HAZIR PDF INDIREMEZ (dondurmanin asil yaptirimi budur)
//   - Davetli yazimlari zaten kapali
//
// Okuma serbest birakilir cunku dondurma bir CEZA degil, bir DURDURMA'dir; veriyi
// kullanicidan saklamak KVKK acisindan da savunulamaz.
public static class DondurmaGuard
{
    public const string HataKodu = "DEFTER_DONDURULDU";
    public const string Mesaj =
        "Defteriniz geçici olarak donduruldu. Bu süre boyunca değişiklik yapılamaz ve " +
        "baskıya hazır nüsha indirilemez. Ayrıntı için bizimle iletişime geçin.";

    // Yazim yapan her uc bunu cagirir. true donerse islem REDDEDILMELIDIR.
    public static async Task<bool> DonduruldumuAsync(
        BiAniBirakDbContext db, Guid etkinlikId, CancellationToken ct = default)
        => await db.Etkinlikler.AsNoTracking()
            .AnyAsync(e => e.Id == etkinlikId && e.Donduruldu && !e.SilindiMi, ct);

    public static IResult Reddet()
        => Results.Json(new { hata = HataKodu, mesaj = Mesaj }, statusCode: 423);
}
