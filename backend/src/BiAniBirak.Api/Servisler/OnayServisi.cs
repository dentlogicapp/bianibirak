using System.Security.Cryptography;
using System.Text;
using BiAniBirak.Api.Data;
using BiAniBirak.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace BiAniBirak.Api.Servisler;

// ONAY SERVISI - hukuki kanitin uretildigi yer.
//
// SENARYO (bu kodun var olma sebebi):
// Kullanici defterini indirmez, 37 gun gecer, veri imha edilir. Doner ve der ki:
// "Boyle bir sey kabul etmedim, verimi geri istiyorum, aksi halde dava ederim."
//
// Elimizde su olmali: o kisinin, kayit aninda, TAM OLARAK NE OKUDUGU. Metni bugun
// degistirmis olsak bile, ONUN gordugu metin ispatlanabilmeli.
//
// Cozum: HASH. Onay aninda metnin SHA-256'si kaydedilir. Metin bir harf degisse hash
// tamamen degisir - yani "sonradan degistirdiniz" iddiasi curur. Metin surumleri de
// saklanir; hash'ten metne gidilebilir.
//
// Bu, kullaniciya karsi bir silah degil; ADALETIN iki tarafi icin de kanittir. Metni
// gercekten degistirmissek, hash bunu ELE VERIR - biz de sorumluyuz.
public static class OnayServisi
{
    // KAYIT SIRASINDA ZORUNLU ONAYLAR. Biri eksikse kayit TAMAMLANMAZ.
    //
    // Neden zorunlu: "kabul etmis sayilirsiniz" turu ortuk rizalar KVKK'da gecersizdir
    // (m.3/1-a: acik riza = belirli bir konuya iliskin, BILGILENDIRILMEYE dayanan,
    // OZGUR IRADEYLE aciklanan). Kutucugu isaretlemeyen kaydolamaz.
    public static readonly string[] ZorunluMetinler =
    {
        "kvkk_aydinlatma",
        "kullanim_kosullari",
    };

    // SHA-256 (hex, kucuk harf). Metin normalize edilir: satir sonu farkliliklari
    // (CRLF/LF) hash'i degistirmemeli - yoksa ayni metin iki farkli hash uretir ve
    // kanit degeri coker.
    public static string HashUret(string icerik)
    {
        var normal = (icerik ?? "").Replace("\r\n", "\n").Trim();
        var bayt = SHA256.HashData(Encoding.UTF8.GetBytes(normal));
        return Convert.ToHexString(bayt).ToLowerInvariant();
    }

    // Surum damgasi: yururluk tarihinden turetilir. Insan okunur, siralanabilir.
    public static string SurumUret(DateTimeOffset yururluk)
        => yururluk.ToString("yyyy-MM-dd");

    // Metin kaydedilirken/guncellenirken hash ve surum TAZELENIR. Bu cagri
    // unutulursa kanit zinciri kirilir - bu yuzden tek yerden yapilir.
    public static void MetniDamgala(SistemMetni metin)
    {
        metin.Hash = HashUret(metin.Icerik);
        metin.Surum = SurumUret(metin.YururlukTarihi);
    }

    // Kayit aninda gosterilen metinler - kullanici NEYI onayladigini bilmeli.
    public static async Task<List<SistemMetni>> ZorunluMetinleriGetirAsync(
        BiAniBirakDbContext db, CancellationToken ct = default)
    {
        var metinler = await db.SistemMetinleri.AsNoTracking()
            .Where(m => ZorunluMetinler.Contains(m.Anahtar))
            .ToListAsync(ct);

        // Hash bos ise (eski kayit) ANINDA hesapla - kanit zincirinde bosluk olamaz.
        foreach (var m in metinler.Where(x => string.IsNullOrEmpty(x.Hash)))
        {
            m.Hash = HashUret(m.Icerik);
            m.Surum = SurumUret(m.YururlukTarihi);
        }

        return metinler;
    }

    // ONAYI KAYDET - append-only. Her metin icin AYRI kayit: kullanici KVKK'yi
    // onayladi ama kosullari onaylamadi gibi bir durum ayirt edilebilmeli.
    //
    // IP ve tarayici: "bu gercekten o kisi miydi?" sorusuna delil. Tek basina kanit
    // degil, ama zincirin halkasi.
    public static async Task KaydetAsync(
        BiAniBirakDbContext db,
        Guid kullaniciId,
        IEnumerable<SistemMetni> metinler,
        string? ip,
        string? tarayici,
        CancellationToken ct = default)
    {
        var simdi = DateTimeOffset.UtcNow;

        foreach (var m in metinler)
        {
            db.KullanimOnaylari.Add(new KullanimOnayi
            {
                Id = Guid.NewGuid(),
                KullaniciId = kullaniciId,
                MetinAnahtar = m.Anahtar,
                MetinSurum = string.IsNullOrEmpty(m.Surum) ? SurumUret(m.YururlukTarihi) : m.Surum,
                MetinHash = string.IsNullOrEmpty(m.Hash) ? HashUret(m.Icerik) : m.Hash,
                IpAdresi = ip,
                TarayiciBilgisi = Kisalt(tarayici, 400),
                CreatedAt = simdi,
            });
        }

        await db.SaveChangesAsync(ct);
    }

    // Istek baglamindan IP - proxy arkasindaysa X-Forwarded-For ilk deger.
    public static string? IpAl(HttpContext ctx)
    {
        var iletilen = ctx.Request.Headers["X-Forwarded-For"].FirstOrDefault();
        if (!string.IsNullOrWhiteSpace(iletilen))
            return iletilen.Split(',')[0].Trim();

        return ctx.Connection.RemoteIpAddress?.ToString();
    }

    public static string? TarayiciAl(HttpContext ctx)
        => ctx.Request.Headers.UserAgent.FirstOrDefault();

    private static string? Kisalt(string? s, int azami)
        => string.IsNullOrEmpty(s) ? s : (s.Length <= azami ? s : s[..azami]);
}
