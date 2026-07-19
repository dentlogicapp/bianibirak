using System.Security.Claims;
using BiAniBirak.Api.Data;
using BiAniBirak.Api.Entities;
using BiAniBirak.Api.Servisler;
using Microsoft.EntityFrameworkCore;

namespace BiAniBirak.Api.Uclar;

// DESTEK SISTEMI UCLARI
//
// URUN DURUSU: kullanicinin derdini anlatmasi ile bizim duymamiz arasinda SIFIR adim
// olmali. E-posta adresi sorulmaz, kategori sectirilmez, bilet numarasi verilmez -
// bunlarin hepsi kullaniciyi eleyen surtunmedir. Kullanici yazar; kimlik JWT'den gelir.
//
// ULASILABILIRLIK GARANTISI: talep, TUM super yoneticilere ayni anda push + uygulama
// ici bildirim olarak duser. "Kime atandi, kim gordu" gibi bir kuyruk yonetimi YOK -
// tek kisilik bir ekipte bu kuyruk, cevapsiz kalmanin bahanesi olur.
//
// KONUSMA MODELI (WhatsApp benzeri): tek talep = tek konusma. Iki taraf da ayni
// akista yazar. Durum otomatik yurur: kullanici yazinca "acik", yonetici yazinca
// "yanitlandi". Kapatmayi yalniz yonetici yapar.
public static class DestekUclari
{
    private const int AzamiMetin = 4000;

    public static void DestekUclariniEkle(this WebApplication app)
    {
        // Kullanici tarafi
        app.MapGet("/api/destek", Konusmam).RequireAuthorization();
        app.MapPost("/api/destek", Gonder).RequireAuthorization();

        // SSS (bilgi tabani) - okuma herkese acik degil, oturum yeter.
        app.MapGet("/api/sss", SssAgac).RequireAuthorization();
        app.MapPost("/api/sss/{id:guid}/goruntulendi", SssGoruntulendi).RequireAuthorization();

        // Super yonetici tarafi
        app.MapGet("/api/super/destek", SuperListe).RequireAuthorization();
        app.MapGet("/api/super/sss", SuperSssListe).RequireAuthorization();
        app.MapPost("/api/super/sss", SuperSssKaydet).RequireAuthorization();
        app.MapDelete("/api/super/sss/{id:guid}", SuperSssSil).RequireAuthorization();
        app.MapGet("/api/super/destek/{id:guid}", SuperKonusma).RequireAuthorization();
        app.MapPost("/api/super/destek/{id:guid}/yanit", SuperYanit).RequireAuthorization();
        app.MapPost("/api/super/destek/{id:guid}/kapat", SuperKapat).RequireAuthorization();
    }

    private static bool Kimlik(HttpContext ctx, out Guid id)
    {
        id = Guid.Empty;
        return Guid.TryParse(ctx.User.FindFirstValue(ClaimTypes.NameIdentifier), out id);
    }

    private static IResult Hata(int durum, string kod, string mesaj)
        => Results.Json(new { hata = kod, mesaj }, statusCode: durum);

    private static async Task<Kullanici?> KullaniciAl(BiAniBirakDbContext db, Guid id, CancellationToken ct)
        => await db.Kullanicilar.AsNoTracking()
            .FirstOrDefaultAsync(k => k.Id == id && k.DeletedAt == null, ct);

    // Ilk mesajdan okunabilir bir konu turet - kullaniciya "konu yaz" dedirtmeden.
    private static string KonuTuret(string metin)
    {
        var t = metin.Trim().Replace("\r", " ").Replace("\n", " ");
        while (t.Contains("  ")) t = t.Replace("  ", " ");
        if (t.Length <= 60) return t;
        var parca = t[..60];
        var bosluk = parca.LastIndexOf(' ');
        return (bosluk > 25 ? parca[..bosluk] : parca) + "...";
    }

    // ---------------- KULLANICI ----------------

    // Kullanicinin kendi konusmasi: en son talep + tum mesajlari.
    private static async Task<IResult> Konusmam(
        HttpContext ctx, BiAniBirakDbContext db, CancellationToken ct)
    {
        if (!Kimlik(ctx, out var kid)) return Hata(401, "ERISIM_YOK", "Oturum bulunamadı.");

        var talepler = await db.DestekTalepleri.AsNoTracking()
            .Where(t => t.KullaniciId == kid)
            .OrderByDescending(t => t.SonMesajZamani)
            .ToListAsync(ct);

        var idler = talepler.Select(t => t.Id).ToList();
        var mesajlar = await db.DestekMesajlari.AsNoTracking()
            .Where(m => idler.Contains(m.TalepId))
            .OrderBy(m => m.CreatedAt)
            .ToListAsync(ct);

        // Kullanici konusmayi acti: yonetici yanitlari OKUNDU sayilir.
        var acikOlanlar = await db.DestekTalepleri
            .Where(t => t.KullaniciId == kid && t.KullaniciOkunmamis > 0)
            .ToListAsync(ct);
        if (acikOlanlar.Count > 0)
        {
            foreach (var t in acikOlanlar) t.KullaniciOkunmamis = 0;
            await db.SaveChangesAsync(ct);
        }

        return Results.Ok(new
        {
            talepler = talepler.Select(t => new
            {
                id = t.Id,
                konu = t.Konu,
                durum = t.Durum,
                son_mesaj = t.SonMesajZamani,
                created_at = t.CreatedAt,
                // Bu andan ONCE gonderdigi mesajlar "Okundu" gorunur.
                yonetici_okudu = t.YoneticiOkuduZamani,
                mesajlar = mesajlar.Where(m => m.TalepId == t.Id).Select(m => new
                {
                    id = m.Id,
                    yonetici_mi = m.YoneticiMi,
                    gonderen_ad = m.GonderenAd,
                    metin = m.Metin,
                    created_at = m.CreatedAt,
                }),
            }),
        });
    }

    // Kullanici mesaj gonderir. Acik talebi varsa ONUN altina eklenir (konusma
    // parcalanmaz); yoksa yeni talep acilir.
    private static async Task<IResult> Gonder(
        HttpContext ctx, BiAniBirakDbContext db, PushGonderici push,
        DestekGirdi girdi, CancellationToken ct)
    {
        if (!Kimlik(ctx, out var kid)) return Hata(401, "ERISIM_YOK", "Oturum bulunamadı.");

        var metin = (girdi.Metin ?? string.Empty).Trim();
        if (metin.Length < 10)
            return Hata(400, "DOGRULAMA_HATASI",
                "Lütfen durumu biraz daha açıklayın - en az birkaç cümle yazın.");
        if (metin.Length > AzamiMetin)
            return Hata(400, "DOGRULAMA_HATASI", "Mesaj çok uzun.");

        var kullanici = await KullaniciAl(db, kid, ct);
        if (kullanici == null) return Hata(401, "ERISIM_YOK", "Oturum bulunamadı.");

        Guid.TryParse(ctx.User.FindFirstValue("aktif_etkinlik_id"), out var etkinlikId);
        var simdi = DateTimeOffset.UtcNow;

        // KAPALI OLMAYAN talep varsa ona ekle - her mesajda yeni bilet acmak,
        // yoneticinin ekranini ayni konunun parcalariyla doldurur.
        var talep = await db.DestekTalepleri
            .Where(t => t.KullaniciId == kid && t.Durum != "kapali")
            .OrderByDescending(t => t.SonMesajZamani)
            .FirstOrDefaultAsync(ct);

        var yeniTalep = talep == null;
        if (talep == null)
        {
            talep = new DestekTalebi
            {
                Id = Guid.NewGuid(),
                KullaniciId = kid,
                EtkinlikId = etkinlikId == Guid.Empty ? null : etkinlikId,
                Konu = KonuTuret(metin),
                Durum = "acik",
                SonMesajZamani = simdi,
                KullaniciOkunmamis = 0,
                YoneticiOkunmamis = 0,
                CreatedAt = simdi,
                UpdatedAt = simdi,
            };
            db.DestekTalepleri.Add(talep);

            // ONCE TALEP YAZILIR (savunma katmani).
            // EF iliskisi tanimli oldugu icin sira zaten dogrudur; ama mesaj bir
            // YABANCI ANAHTARLA talebe baglidir ve bu baglantinin yanlis sirada
            // yazilmasi istegi 500'e dusurur. Yeni talepte tek ekstra gidis-gelis
            // karsiliginda bu risk TAMAMEN kapanir.
            await db.SaveChangesAsync(ct);
        }

        talep.Durum = "acik";              // kullanici yazdi -> yanit bekleniyor
        talep.SonMesajZamani = simdi;
        talep.UpdatedAt = simdi;
        talep.YoneticiOkunmamis += 1;

        db.DestekMesajlari.Add(new DestekMesaji
        {
            Id = Guid.NewGuid(),
            TalepId = talep.Id,
            GonderenKullaniciId = kid,
            YoneticiMi = false,
            GonderenAd = kullanici.Ad,
            Metin = metin,
            CreatedAt = simdi,
        });

        // OTOMATIK ILK YANIT - sessizlik en cok kaygilandiran seydir.
        // Yeni acilan talepte, kullanici "ulasti mi?" diye beklemesin diye sistem
        // hemen bir balon dusurur. Bu bir OTOMATIK MESAJDIR ve oyle gorunur;
        // gercek yaniti taklit etmez (guveni yanlis yerden kazanmayiz).
        if (yeniTalep)
        {
            db.DestekMesajlari.Add(new DestekMesaji
            {
                Id = Guid.NewGuid(),
                TalepId = talep.Id,
                GonderenKullaniciId = kid,
                YoneticiMi = true,
                GonderenAd = "BiAnıBırak",
                Metin =
                    "İletiniz sistem yöneticilerimize ulaştı. En kısa sürede buradan "
                    + "dönüş yapacağız; yanıt geldiğinde ayrıca bildirim alacaksınız.",
                CreatedAt = simdi.AddSeconds(1),
            });
        }

        await db.SaveChangesAsync(ct);

        // TUM super yoneticilere haber ver. Sessiz saate TABI DEGIL: destek talebi,
        // kullanicinin bize ulasabildigi TEK kanaldir; sabahi beklemek cevapsiz
        // kalma riskini buyutur.
        var yoneticiler = await db.Kullanicilar.AsNoTracking()
            .Where(k => k.SuperAdmin && k.DeletedAt == null)
            .Select(k => k.Id)
            .ToListAsync(ct);

        var ozet = KonuTuret(metin);
        foreach (var yid in yoneticiler)
        {
            // KENDI TALEBINE DE BILDIRIM GIDER.
            // Sistem yoneticisi de bir kullanicidir ve talebi TAM OLARAK bir kullanici
            // talebi gibi islemelidir: ayni kuyruga duser, ayni sekilde yanitlanir.
            // Kendine bildirim gitmesi ayrica canli akisi test etmenin en dogal yoludur.
            await push.GonderAsync(
                yid,
                "Yeni destek talebi",
                $"{kullanici.Ad}: {metin}",
                "/super-panel?sekme=destek",
                null,
                sessizSaateTabi: false,
                ct,
                pushGovde: $"{kullanici.Ad} bir destek talebi gönderdi: {ozet}");
        }

        return Results.Ok(new { ok = true, talep_id = talep.Id });
    }

    // ---------------- SUPER YONETICI ----------------

    private static async Task<(bool ok, Kullanici? kullanici)> SuperMi(
        HttpContext ctx, BiAniBirakDbContext db, CancellationToken ct)
    {
        if (!Kimlik(ctx, out var kid)) return (false, null);
        var k = await KullaniciAl(db, kid, ct);
        return (k != null && k.SuperAdmin, k);
    }

    private static async Task<IResult> SuperListe(
        HttpContext ctx, BiAniBirakDbContext db, CancellationToken ct)
    {
        var (ok, _) = await SuperMi(ctx, db, ct);
        if (!ok) return Hata(403, "ERISIM_YOK", "Bu alana yalnız sistem yöneticisi erişebilir.");

        var talepler = await db.DestekTalepleri.AsNoTracking()
            .OrderByDescending(t => t.SonMesajZamani)
            .Take(200)
            .ToListAsync(ct);

        var kullaniciIdler = talepler.Select(t => t.KullaniciId).Distinct().ToList();
        var kullanicilar = await db.Kullanicilar.AsNoTracking()
            .Where(k => kullaniciIdler.Contains(k.Id))
            .Select(k => new { k.Id, k.Ad, k.Email })
            .ToListAsync(ct);

        // Son mesaj onizlemesi - listede "ne yazmis" gorunsun, acmadan.
        var talepIdler = talepler.Select(t => t.Id).ToList();
        var sonMesajlar = await db.DestekMesajlari.AsNoTracking()
            .Where(m => talepIdler.Contains(m.TalepId))
            .GroupBy(m => m.TalepId)
            .Select(g => g.OrderByDescending(x => x.CreatedAt).First())
            .ToListAsync(ct);

        return Results.Ok(new
        {
            bekleyen = talepler.Count(t => t.Durum == "acik"),
            talepler = talepler.Select(t =>
            {
                var k = kullanicilar.FirstOrDefault(x => x.Id == t.KullaniciId);
                var son = sonMesajlar.FirstOrDefault(m => m.TalepId == t.Id);
                return new
                {
                    id = t.Id,
                    konu = t.Konu,
                    durum = t.Durum,
                    son_mesaj = t.SonMesajZamani,
                    okunmamis = t.YoneticiOkunmamis,
                    kullanici_ad = k?.Ad ?? "-",
                    kullanici_email = k?.Email ?? "-",
                    son_metin = son?.Metin ?? "",
                    son_yonetici_mi = son?.YoneticiMi ?? false,
                };
            }),
        });
    }

    private static async Task<IResult> SuperKonusma(
        Guid id, HttpContext ctx, BiAniBirakDbContext db, CancellationToken ct)
    {
        var (ok, _) = await SuperMi(ctx, db, ct);
        if (!ok) return Hata(403, "ERISIM_YOK", "Bu alana yalnız sistem yöneticisi erişebilir.");

        var talep = await db.DestekTalepleri.FirstOrDefaultAsync(t => t.Id == id, ct);
        if (talep == null) return Hata(404, "TALEP_BULUNAMADI", "Talep bulunamadı.");

        var mesajlar = await db.DestekMesajlari.AsNoTracking()
            .Where(m => m.TalepId == id)
            .OrderBy(m => m.CreatedAt)
            .ToListAsync(ct);

        var sahip = await db.Kullanicilar.AsNoTracking()
            .Where(k => k.Id == talep.KullaniciId)
            .Select(k => new { k.Ad, k.Email })
            .FirstOrDefaultAsync(ct);

        // Yonetici konusmayi acti -> okunmamis sifirlanir.
        // OKUNDU DAMGASI - kullanici "gordunuz mu?" diye tekrar yazmasin.
        talep.YoneticiOkunmamis = 0;
        talep.YoneticiOkuduZamani = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(ct);

        return Results.Ok(new
        {
            id = talep.Id,
            konu = talep.Konu,
            durum = talep.Durum,
            kullanici_ad = sahip?.Ad ?? "-",
            kullanici_email = sahip?.Email ?? "-",
            etkinlik_id = talep.EtkinlikId,
            created_at = talep.CreatedAt,
            mesajlar = mesajlar.Select(m => new
            {
                id = m.Id,
                yonetici_mi = m.YoneticiMi,
                gonderen_ad = m.GonderenAd,
                metin = m.Metin,
                created_at = m.CreatedAt,
            }),
        });
    }

    private static async Task<IResult> SuperYanit(
        Guid id, HttpContext ctx, BiAniBirakDbContext db, PushGonderici push,
        DestekGirdi girdi, CancellationToken ct)
    {
        var (ok, yonetici) = await SuperMi(ctx, db, ct);
        if (!ok || yonetici == null)
            return Hata(403, "ERISIM_YOK", "Bu alana yalnız sistem yöneticisi erişebilir.");

        var metin = (girdi.Metin ?? string.Empty).Trim();
        if (metin.Length == 0) return Hata(400, "DOGRULAMA_HATASI", "Boş yanıt gönderilemez.");
        if (metin.Length > AzamiMetin) return Hata(400, "DOGRULAMA_HATASI", "Yanıt çok uzun.");

        var talep = await db.DestekTalepleri.FirstOrDefaultAsync(t => t.Id == id, ct);
        if (talep == null) return Hata(404, "TALEP_BULUNAMADI", "Talep bulunamadı.");

        var simdi = DateTimeOffset.UtcNow;
        db.DestekMesajlari.Add(new DestekMesaji
        {
            Id = Guid.NewGuid(),
            TalepId = talep.Id,
            GonderenKullaniciId = yonetici.Id,
            YoneticiMi = true,
            GonderenAd = yonetici.Ad,
            Metin = metin,
            CreatedAt = simdi,
        });

        talep.Durum = "yanitlandi";
        talep.SonMesajZamani = simdi;
        talep.UpdatedAt = simdi;
        talep.KullaniciOkunmamis += 1;
        await db.SaveChangesAsync(ct);

        // Kullaniciya haber ver - bekledigi cevap geldi.
        await push.GonderAsync(
            talep.KullaniciId,
            "Destek talebiniz yanıtlandı",
            metin,
            // "/destek" diye bir SAYFA YOK - destek bir modaldir. Onceden bu adrese
            // yonlendiriliyordu ve bildirime tiklayan kullanici bos/hatali ekranla
            // karsilasiyordu. Artik uygulamayi acip modali TETIKLEYEN adrese gider.
            "/gelen-dilekler?destek=1",
            null,
            sessizSaateTabi: true,
            ct,
            pushGovde: "Destek talebinize yanıt verildi.");

        return Results.Ok(new { ok = true });
    }

    private static async Task<IResult> SuperKapat(
        Guid id, HttpContext ctx, BiAniBirakDbContext db, CancellationToken ct)
    {
        var (ok, _) = await SuperMi(ctx, db, ct);
        if (!ok) return Hata(403, "ERISIM_YOK", "Bu alana yalnız sistem yöneticisi erişebilir.");

        var talep = await db.DestekTalepleri.FirstOrDefaultAsync(t => t.Id == id, ct);
        if (talep == null) return Hata(404, "TALEP_BULUNAMADI", "Talep bulunamadı.");

        talep.Durum = "kapali";
        talep.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(ct);

        return Results.Ok(new { ok = true });
    }

    // ---------------- SSS / BILGI TABANI ----------------

    // Agac halinde doner: kategori > alt kategori > maddeler.
    // Istemci duz liste alip gruplamak zorunda kalmaz - siralama TEK yerde (burada)
    // belirlenir ve her istemci ayni sirayi gorur.
    private static async Task<IResult> SssAgac(BiAniBirakDbContext db, CancellationToken ct)
    {
        var maddeler = await db.SssMaddeleri.AsNoTracking()
            .Where(m => m.Aktif)
            .OrderBy(m => m.Sira)
            .ToListAsync(ct);

        var agac = maddeler
            .GroupBy(m => m.Kategori)
            .Select(k => new
            {
                kategori = k.Key,
                alt_kategoriler = k.GroupBy(m => m.AltKategori).Select(a => new
                {
                    alt_kategori = a.Key,
                    maddeler = a.Select(m => new
                    {
                        id = m.Id,
                        soru = m.Soru,
                        cevap = m.Cevap,
                    }),
                }),
            });

        return Results.Ok(new { agac });
    }

    // Hangi maddenin gercekten aciliyor oldugunu OLC. Bu sayi, bir sonraki urun
    // kararini yonlendirir: cok acilan bir madde, cozulmesi gereken bir SORUNDUR.
    private static async Task<IResult> SssGoruntulendi(
        Guid id, BiAniBirakDbContext db, CancellationToken ct)
    {
        await db.SssMaddeleri.Where(m => m.Id == id)
            .ExecuteUpdateAsync(s => s.SetProperty(m => m.GoruntulenmeSayisi, m => m.GoruntulenmeSayisi + 1), ct);
        return Results.Ok(new { ok = true });
    }

    private static async Task<IResult> SuperSssListe(
        HttpContext ctx, BiAniBirakDbContext db, CancellationToken ct)
    {
        var (ok, _) = await SuperMi(ctx, db, ct);
        if (!ok) return Hata(403, "ERISIM_YOK", "Bu alana yalnız sistem yöneticisi erişebilir.");

        var maddeler = await db.SssMaddeleri.AsNoTracking()
            .OrderBy(m => m.Sira)
            .Select(m => new
            {
                id = m.Id,
                kategori = m.Kategori,
                alt_kategori = m.AltKategori,
                soru = m.Soru,
                cevap = m.Cevap,
                sira = m.Sira,
                aktif = m.Aktif,
                goruntulenme = m.GoruntulenmeSayisi,
            })
            .ToListAsync(ct);

        return Results.Ok(new { maddeler });
    }

    // Tek uc hem EKLER hem GUNCELLER (Id varsa guncelle, yoksa ekle).
    // Iki ayri uc, iki ayri dogrulama ve kacinilmaz olarak ayrisan iki davranis demekti.
    private static async Task<IResult> SuperSssKaydet(
        HttpContext ctx, BiAniBirakDbContext db, SssGirdi girdi, CancellationToken ct)
    {
        var (ok, _) = await SuperMi(ctx, db, ct);
        if (!ok) return Hata(403, "ERISIM_YOK", "Bu alana yalnız sistem yöneticisi erişebilir.");

        var kategori = (girdi.Kategori ?? "").Trim();
        var alt = (girdi.AltKategori ?? "").Trim();
        var soru = (girdi.Soru ?? "").Trim();
        var cevap = (girdi.Cevap ?? "").Trim();

        if (kategori.Length == 0 || alt.Length == 0 || soru.Length == 0 || cevap.Length == 0)
            return Hata(400, "DOGRULAMA_HATASI", "Kategori, alt kategori, soru ve cevap zorunludur.");

        var simdi = DateTimeOffset.UtcNow;

        if (girdi.Id.HasValue)
        {
            var m = await db.SssMaddeleri.FirstOrDefaultAsync(x => x.Id == girdi.Id.Value, ct);
            if (m == null) return Hata(404, "MADDE_BULUNAMADI", "Madde bulunamadı.");
            m.Kategori = kategori;
            m.AltKategori = alt;
            m.Soru = soru;
            m.Cevap = cevap;
            m.Sira = girdi.Sira ?? m.Sira;
            m.Aktif = girdi.Aktif ?? m.Aktif;
            m.UpdatedAt = simdi;
            await db.SaveChangesAsync(ct);
            return Results.Ok(new { ok = true, id = m.Id });
        }

        var enBuyuk = await db.SssMaddeleri.AnyAsync(ct)
            ? await db.SssMaddeleri.MaxAsync(x => x.Sira, ct)
            : 0;

        var yeni = new SssMaddesi
        {
            Id = Guid.NewGuid(),
            Kategori = kategori,
            AltKategori = alt,
            Soru = soru,
            Cevap = cevap,
            Sira = girdi.Sira ?? (enBuyuk + 1),
            Aktif = girdi.Aktif ?? true,
            CreatedAt = simdi,
            UpdatedAt = simdi,
        };
        db.SssMaddeleri.Add(yeni);
        await db.SaveChangesAsync(ct);
        return Results.Ok(new { ok = true, id = yeni.Id });
    }

    private static async Task<IResult> SuperSssSil(
        Guid id, HttpContext ctx, BiAniBirakDbContext db, CancellationToken ct)
    {
        var (ok, _) = await SuperMi(ctx, db, ct);
        if (!ok) return Hata(403, "ERISIM_YOK", "Bu alana yalnız sistem yöneticisi erişebilir.");

        await db.SssMaddeleri.Where(m => m.Id == id).ExecuteDeleteAsync(ct);
        return Results.Ok(new { ok = true });
    }
}

public record DestekGirdi(string? Metin);

public record SssGirdi(
    Guid? Id, string? Kategori, string? AltKategori,
    string? Soru, string? Cevap, int? Sira, bool? Aktif);
