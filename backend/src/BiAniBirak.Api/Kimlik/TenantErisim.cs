using System.Security.Claims;
using BiAniBirak.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace BiAniBirak.Api.Kimlik;

// TENANT COZUMU - "hangi defterdeyim ve hangi rolle?" sorusunun TEK yaniti.
//
// ===================== NEDEN AYRI BIR DOSYA =====================
//
// Bu mantik bugune kadar her uc dosyasinda AYRI AYRI kopyalanmisti
// (EtkinlikUclari, KurasyonUclari, CopUclari, GorselUclari...). Hepsi ayni seyi
// yapiyordu ve hepsi ayni eksigi tasiyordu; bir tanesine kural eklemek
// digerlerini SESSIZCE geride birakiyordu. Nitekim oyle oldu: super yonetici
// uye olmadigi bir defteri goruntuledigunde her uc 403 donuyor, teshis araci
// hicbir ise yaramiyordu.
//
// Artik kural burada. Diger uc dosyalari kendi kopyalarini zaman icinde buraya
// baglar; her baglanan dosya ayni davranisi kazanir, ayrisma imkani kalmaz.
//
// ===================== IKI YOL =====================
//
// 1) UYELIK - normal yol. Kullanici o defterin uyesidir; rol "es1" ya da "es2".
//    Izolasyonun temeli budur ve DEGISMEDI.
//
// 2) SALT-OKUNUR INCELEME - super yonetici, uyesi OLMADIGI bir defteri
//    inceleyebilir. Rol "inceleme"dir.
//
//    Bu bir ayricalik degil, DESTEK ZORUNLULUGU: "defterim bozuk" diyen bir
//    cifte, deftere hic bakmadan yardim etmek mumkun degildir. Alternatifi
//    cifte "ekran goruntusu gonderin" demektir - hem yavas hem asagilayici.
//
//    UC KATMANLI KORUMA:
//      a) JWT'de goruntuleme_modu=true olmali (SuperUclari.Goruntule uretir,
//         1 saat omurlu). Frontend header'ina ASLA guvenilmez.
//      b) Kullanici DB'de HALA super admin olmali (claim eskimis olabilir).
//      c) Program.cs'teki global write-guard, bu claim varken TUM yazimlari
//         403 yapar. Yani okuma acilirken yazma kapali kalir.
//
//    ROL "inceleme" SECIMI BILINCLIDIR:
//      - Onay kuyrugu KaynakEs == rol ile filtrelenir; "inceleme" hicbir
//        katkiyla eslesmez -> kuyruk BOS doner. Bir esin onaysiz kuyrugu,
//        esinin bile goremedigi alandir; yoneticiye acmak sistemin en sert
//        kuralini ilk zorlandigi yerde bukmek olurdu.
//      - Paylasim linkleri de Es == rol ile filtrelenir -> BOS doner. Yonetici
//        ciftin davetli token'ini gormez; gormesi gereken bir sey degildir.
//      - Ortak defter (onayli dilekler), ayarlar, gorseller, kurasyon ve ciftin
//        kendi denetim gunlugu GORUNUR - teshis icin gereken tam da bunlardir.
//      - Yazma yollarinda "katki.KaynakEs != rol" kontrolu "inceleme" ile
//        asla tutmaz; write-guard'a ek ikinci katman.
public static class TenantErisim
{
    // Uye olmayan super yoneticinin salt-okunur rolu. "es1"/"es2" ile ASLA
    // cakismaz; kuyruk ve link filtrelerinde bos kume uretmesi bu yuzdendir.
    public const string IncelemeRol = "inceleme";

    public static bool IncelemeMi(string rol) => rol == IncelemeRol;

    public static async Task<(bool ok, Guid etkinlikId, string rol)> CozAsync(
        HttpContext ctx, BiAniBirakDbContext db, Guid kullaniciId,
        CancellationToken ct = default)
    {
        var ham = ctx.User.FindFirstValue("aktif_etkinlik_id");
        if (!Guid.TryParse(ham, out var etkinlikId))
            return (false, Guid.Empty, string.Empty);

        // ---- YOL 1: UYELIK ----
        var uyelik = await db.EtkinlikUyelikleri.AsNoTracking()
            .FirstOrDefaultAsync(u => u.EtkinlikId == etkinlikId && u.KullaniciId == kullaniciId, ct);
        if (uyelik != null)
            return (true, etkinlikId, uyelik.Rol);

        // ---- YOL 2: SALT-OKUNUR INCELEME ----
        // Claim yoksa burada biter: sizinti yok, ayni "erisim yok" yaniti.
        if (ctx.User.FindFirstValue("goruntuleme_modu") != "true")
            return (false, Guid.Empty, string.Empty);

        // DB DOGRULAMASI - defense in depth. Yetki JWT uretildikten sonra
        // kaldirilmis olabilir; claim'e tek basina guvenilmez.
        var superMi = await db.Kullanicilar.AsNoTracking()
            .AnyAsync(k => k.Id == kullaniciId && k.SuperAdmin && k.DeletedAt == null, ct);
        if (!superMi)
            return (false, Guid.Empty, string.Empty);

        // Defter gercekten var mi? Yoksa 403 yerine bos bir tenant baglami
        // uretir, sonraki sorgular anlamsizca bos doner ve hata teshisi zorlasir.
        var varMi = await db.Etkinlikler.AsNoTracking()
            .AnyAsync(e => e.Id == etkinlikId, ct);
        if (!varMi)
            return (false, Guid.Empty, string.Empty);

        return (true, etkinlikId, IncelemeRol);
    }
}
