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
    // KAPSAMLAR
    public const string KapsamEs = "es";
    public const string KapsamDavetli = "davetli";

    // ZORUNLU METINLER ARTIK KATALOGTAN OKUNUR - kodda sabit liste YOK.
    //
    // Sabit liste olsaydi, yeni bir zorunlu metin eklemek DEPLOY gerektirirdi. Katalog
    // (Planlama Defteri'nin sema deseni) bunu super panele tasir: yonetici metni ekler,
    // "zorunlu" isaretler, biter.
    //
    // Neden zorunlu: "kabul etmis sayilirsiniz" turu ortuk rizalar KVKK'da GECERSIZDIR
    // (m.3/1-a: acik riza = bilgilendirilmeye dayanan, OZGUR IRADEYLE aciklanan).
    public static async Task<List<SistemMetni>> ZorunluMetinlerAsync(
        BiAniBirakDbContext db, string kapsam, CancellationToken ct = default)
    {
        var metinler = await db.SistemMetinleri.AsNoTracking()
            .Where(m => m.Kapsam == kapsam && m.Zorunlu && !m.Deprecated)
            .OrderBy(m => m.Sira)
            .ToListAsync(ct);

        // Hash bos ise (eski kayit) aninda hesapla - kanit zincirinde bosluk olamaz.
        foreach (var m in metinler.Where(x => string.IsNullOrEmpty(x.Hash)))
        {
            m.Hash = HashUret(m.Icerik);
            m.Surum = SurumUret(m.YururlukTarihi);
        }

        return metinler;
    }

    // GERI UYUMLULUK: eski cagrilar icin (kayit ucu). Es kapsamindaki zorunlu anahtarlar.
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

    // ARSIVLE + DAMGALA - metin guncellenirken cagrilir.
    //
    // ONCE eski surum arsivlenir, SONRA yeni damga vurulur. Sira onemli: once
    // damgalasaydik, eski icerigi kaybederdik ve arsive YENI metni yazardik.
    //
    // NEDEN ARSIV SART:
    // Kullanici 1 Ocak'ta metni onayladi (hash A). 1 Mart'ta metni degistirdik
    // (hash B). Kullanici "onaylamadim" diyor. Elimizde hash A var - ama A'nin
    // karsilik geldigi METIN yok, ustune yazdik. Yani "bir metni onayladi"
    // diyebiliyoruz, HANGI metni oldugunu gosteremiyoruz.
    //
    // Hash, ancak metin de saklanirsa kanittir.
    // ESKI SURUM ANLIK GORUNTUSU - guncelleme YAPILMADAN ONCE alinir.
    //
    // Bu record olmadan arsivleme calismaz: metin nesnesi guncellendikten sonra eski
    // icerige ulasmanin yolu yoktur (EF nesneyi yerinde degistirir). Once fotograf
    // cek, sonra degistir.
    public sealed record Anlik(
        string Anahtar, string Surum, string Hash,
        string Baslik, string Icerik, DateTimeOffset YururlukTarihi);

    public static Anlik AnlikAl(SistemMetni m)
        => new(m.Anahtar, m.Surum, m.Hash, m.Baslik, m.Icerik, m.YururlukTarihi);

    // ARSIVLE + DAMGALA. Cagri sirasi:
    //   1. var eski = OnayServisi.AnlikAl(metin);     <- ONCE fotograf
    //   2. metin.Icerik = yeniIcerik;                 <- sonra degistir
    //   3. OnayServisi.ArsivleVeDamgala(db, metin, eski, aktorId);
    public static void ArsivleVeDamgala(
        BiAniBirakDbContext db, SistemMetni metin, Anlik eski, Guid? guncelleyen)
    {
        var yeniHash = HashUret(metin.Icerik);

        // Icerik gercekten degistiyse ESKI surumu arsivle. Degismediyse arsivde
        // gereksiz kopya birikmesin (ornegin yalniz baslik duzeltilmisse).
        if (!string.IsNullOrEmpty(eski.Hash) && eski.Hash != yeniHash)
        {
            db.SistemMetinSurumleri.Add(new SistemMetinSurumu
            {
                Id = Guid.NewGuid(),
                Anahtar = eski.Anahtar,
                Surum = eski.Surum,
                Hash = eski.Hash,
                Baslik = eski.Baslik,
                Icerik = eski.Icerik,          // ESKI metin - kanitin ta kendisi
                YururlukTarihi = eski.YururlukTarihi,
                GuncelleyenKullaniciId = guncelleyen,
                CreatedAt = DateTimeOffset.UtcNow,
            });
        }

        MetniDamgala(metin);
    }

    // ILK SURUMU ARSIVLE - metin olusturulurken. Boylece HER surum arsivde bulunur,
    // ilki dahil. "Ilk metin arsivde yok" bosluğu, en eski kullanicilarin onayini
    // ispatlanamaz kilardi.
    public static void IlkSurumuArsivle(
        BiAniBirakDbContext db, SistemMetni metin, Guid? guncelleyen = null)
    {
        db.SistemMetinSurumleri.Add(new SistemMetinSurumu
        {
            Id = Guid.NewGuid(),
            Anahtar = metin.Anahtar,
            Surum = metin.Surum,
            Hash = metin.Hash,
            Baslik = metin.Baslik,
            Icerik = metin.Icerik,
            YururlukTarihi = metin.YururlukTarihi,
            GuncelleyenKullaniciId = guncelleyen,
            CreatedAt = DateTimeOffset.UtcNow,
        });
    }

    // Kayit aninda gosterilen metinler (es kapsami).
    public static Task<List<SistemMetni>> ZorunluMetinleriGetirAsync(
        BiAniBirakDbContext db, CancellationToken ct = default)
        => ZorunluMetinlerAsync(db, KapsamEs, ct);

    // EKSIK ONAYLAR - bu kullanicinin HANGI zorunlu metinleri onaylamadigi.
    //
    // Iki durumda dolu doner:
    //   1. Kullanici bu sistem kurulmadan ONCE kaydolmus (onay kaydi hic yok),
    //   2. Metin GUNCELLENMIS ve kullanici eski surumu onaylamis (hash tutmuyor).
    //
    // Ikinci durum kritik: metni degistirip "zaten onaylamisti" demek, onay ALMAMAK'tir.
    // Yeni metne yeni onay gerekir - yoksa gecerli bir rizamiz yok.
    public static async Task<List<SistemMetni>> EksikOnaylarAsync(
        BiAniBirakDbContext db, Guid kullaniciId, CancellationToken ct = default)
    {
        var zorunlu = await ZorunluMetinlerAsync(db, KapsamEs, ct);
        if (zorunlu.Count == 0) return new List<SistemMetni>();

        var onaylar = await db.KullanimOnaylari.AsNoTracking()
            .Where(o => o.KullaniciId == kullaniciId)
            .Select(o => new { o.MetinAnahtar, o.MetinHash })
            .ToListAsync(ct);

        var onayliHashler = onaylar
            .Select(o => $"{o.MetinAnahtar}:{o.MetinHash}")
            .ToHashSet(StringComparer.Ordinal);

        // GUNCEL hash ile eslesen onay yoksa, o metin EKSIKTIR.
        return zorunlu
            .Where(m => !onayliHashler.Contains($"{m.Anahtar}:{m.Hash}"))
            .ToList();
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
