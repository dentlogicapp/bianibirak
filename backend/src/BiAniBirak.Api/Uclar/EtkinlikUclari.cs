using System.Globalization;
using System.Security.Claims;
using System.Text.Json;
using BiAniBirak.Api.Data;
using BiAniBirak.Api.Entities;
using BiAniBirak.Api.Kimlik;
using BiAniBirak.Api.Modeller;
using BiAniBirak.Api.Servisler;
using Microsoft.EntityFrameworkCore;

namespace BiAniBirak.Api.Uclar;

// Tenant cekirdegi uclari: etkinlik olustur / etkinliklerim / aktif-yap / aktif.
// Tenant = etkinlik. Izolasyon: aktif etkinlik JWT claim'inde + uyelik dogrulamasi.
// Atomik yazim (tek SaveChangesAsync), append-only audit, hata kodlari KAPITAL_UNDERSCORE.
public static class EtkinlikUclari
{
    private static readonly string[] GecerliTurler = { "dugun", "nisan", "nikah" };
    private const int VarsayilanKapanisPencereGun = 30; // Belge 04/05 - ayar gelene kadar

    public static void EtkinlikUclariniEkle(this WebApplication app)
    {
        app.MapPost("/api/etkinlik", EtkinlikOlustur).RequireAuthorization();
        app.MapGet("/api/etkinliklerim", Etkinliklerim).RequireAuthorization();
        app.MapPost("/api/etkinlik/{id}/aktif-yap", AktifYap).RequireAuthorization();
        app.MapGet("/api/etkinlik/aktif", AktifEtkinlik).RequireAuthorization();
        app.MapGet("/api/etkinlik/aktif/linkler", AktifLinkler).RequireAuthorization();
        app.MapGet("/api/etkinlik/aktif/ayarlar", AktifAyarlar).RequireAuthorization();
        app.MapPut("/api/etkinlik/aktif/ayarlar", AktifAyarlarGuncelle).RequireAuthorization();
    }

    private static IResult Hata(int durum, string kod, string mesaj)
        => Results.Json(new { hata = kod, mesaj }, statusCode: durum);

    // Oturumdaki kullanici kimligi (sub claim).
    private static bool KullaniciKimligi(HttpContext ctx, out Guid id)
    {
        var ham = ctx.User.FindFirstValue(ClaimTypes.NameIdentifier)
                  ?? ctx.User.FindFirstValue("sub");
        return Guid.TryParse(ham, out id);
    }

    // Tenant guard: aktif_etkinlik_id claim'i + kullanicinin o etkinlige UYELIGI.
    // Defense in depth: claim yok -> ERISIM_YOK; uye degil -> ERISIM_YOK (sizinti yok).
    private static async Task<(bool ok, Guid etkinlikId, string rol)> AktifTenant(
        HttpContext ctx, BiAniBirakDbContext db, Guid kullaniciId)
    {
        var ham = ctx.User.FindFirstValue("aktif_etkinlik_id");
        if (!Guid.TryParse(ham, out var etkinlikId))
            return (false, Guid.Empty, string.Empty);

        var uyelik = await db.EtkinlikUyelikleri.AsNoTracking()
            .FirstOrDefaultAsync(u => u.EtkinlikId == etkinlikId && u.KullaniciId == kullaniciId);
        if (uyelik == null)
            return (false, Guid.Empty, string.Empty);

        return (true, etkinlikId, uyelik.Rol);
    }

    private static object EtkinlikYaniti(Etkinlik e, string? rol = null)
        => new
        {
            id = e.Id,
            tur = e.Tur,
            es1_ad = e.Es1Ad,
            es2_ad = e.Es2Ad,
            etkinlik_tarihi = e.EtkinlikTarihi.ToString("yyyy-MM-dd"),
            acilis_tarihi = e.AcilisTarihi,
            kapanis_tarihi = e.KapanisTarihi,
            durum = e.Durum,
            rol,
        };

    private static async Task<IResult> EtkinlikOlustur(
        EtkinlikOlusturIstek istek, HttpContext ctx, BiAniBirakDbContext db)
    {
        if (!KullaniciKimligi(ctx, out var kullaniciId))
            return Hata(401, "ERISIM_YOK", "Oturum bulunamadi.");

        var tur = (istek.Tur ?? "").Trim().ToLowerInvariant();
        var es1 = (istek.Es1Ad ?? "").Trim();
        var es2 = (istek.Es2Ad ?? "").Trim();

        if (!GecerliTurler.Contains(tur) || es1.Length < 2 || es2.Length < 2)
            return Hata(400, "DOGRULAMA_HATASI",
                "Tur (dugun/nisan/nikah) ve iki es adi gereklidir.");

        if (!DateOnly.TryParse(istek.EtkinlikTarihi, CultureInfo.InvariantCulture,
                DateTimeStyles.None, out var etkinlikTarihi))
            return Hata(400, "DOGRULAMA_HATASI", "Gecerli bir etkinlik tarihi gereklidir.");

        // Acilis: verilmezse simdi. Kapanis: verilmezse etkinlik + 30 gun.
        var simdi = DateTimeOffset.UtcNow;
        var acilis = simdi;
        if (!string.IsNullOrWhiteSpace(istek.AcilisTarihi) &&
            DateTimeOffset.TryParse(istek.AcilisTarihi, CultureInfo.InvariantCulture,
                DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal, out var a))
            acilis = a;

        DateTimeOffset kapanis;
        if (!string.IsNullOrWhiteSpace(istek.KapanisTarihi) &&
            DateTimeOffset.TryParse(istek.KapanisTarihi, CultureInfo.InvariantCulture,
                DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal, out var k))
            kapanis = k;
        else
            kapanis = new DateTimeOffset(
                etkinlikTarihi.ToDateTime(TimeOnly.MinValue), TimeSpan.Zero)
                .AddDays(VarsayilanKapanisPencereGun);

        if (kapanis <= acilis)
            return Hata(400, "DOGRULAMA_HATASI", "Kapanis tarihi acilistan sonra olmalidir.");

        var etkinlik = new Etkinlik
        {
            Id = Guid.NewGuid(),
            Tur = tur,
            Es1Ad = es1,
            Es2Ad = es2,
            EtkinlikTarihi = etkinlikTarihi,
            AcilisTarihi = acilis,
            KapanisTarihi = kapanis,
            Durum = "hazirlik", // Belge 03: satin alma sonrasi hazirlik; odeme Asama 7'de baglanir
            UstOrganizatorId = null,
            CreatedAt = simdi,
            UpdatedAt = simdi,
        };

        // olusturan = es1 uyesi
        var uyelik = new EtkinlikUyeligi
        {
            Id = Guid.NewGuid(),
            EtkinlikId = etkinlik.Id,
            KullaniciId = kullaniciId,
            Rol = "es1",
            CreatedAt = simdi,
        };

        // cift-link: her ese ayri tahmin edilemez token (Belge 03 Akis 2 / Belge 08)
        var linkEs1 = new PaylasimBaglantisi
        {
            Id = Guid.NewGuid(),
            EtkinlikId = etkinlik.Id,
            Es = "es1",
            Token = TokenUreteci.Uret(),
            Aktif = true,
            CreatedAt = simdi,
        };
        var linkEs2 = new PaylasimBaglantisi
        {
            Id = Guid.NewGuid(),
            EtkinlikId = etkinlik.Id,
            Es = "es2",
            Token = TokenUreteci.Uret(),
            Aktif = true,
            CreatedAt = simdi,
        };

        // etkinlik ayari (hardcoded yasak altyapisi; kapanis penceresi burada tutulur)
        var ayar = new EtkinlikAyari
        {
            Id = Guid.NewGuid(),
            EtkinlikId = etkinlik.Id,
            KapanisPencereGun = VarsayilanKapanisPencereGun,
            UpdatedAt = simdi,
        };

        db.Etkinlikler.Add(etkinlik);
        db.EtkinlikUyelikleri.Add(uyelik);
        db.PaylasimBaglantilari.Add(linkEs1);
        db.PaylasimBaglantilari.Add(linkEs2);
        db.EtkinlikAyarlari.Add(ayar);
        db.DenetimGunlukleri.Add(new DenetimGunlugu
        {
            Id = Guid.NewGuid(),
            EtkinlikId = etkinlik.Id,
            KullaniciId = kullaniciId,
            Eylem = "ETKINLIK_OLUSTURULDU",
            Varlik = "etkinlikler",
            VarlikId = etkinlik.Id,
            DegisenAlanlar = JsonSerializer.Serialize(new { tur, es1, es2 }),
            CreatedAt = simdi,
        });
        await db.SaveChangesAsync(); // tek SaveChanges = atomik (etkinlik+uyelik+2 link+ayar+audit)

        return Results.Json(EtkinlikYaniti(etkinlik, "es1"));
    }

    private static async Task<IResult> Etkinliklerim(HttpContext ctx, BiAniBirakDbContext db)
    {
        if (!KullaniciKimligi(ctx, out var kullaniciId))
            return Hata(401, "ERISIM_YOK", "Oturum bulunamadi.");

        // Kullanicinin uye oldugu etkinlikler (rol ile).
        var liste = await (
            from u in db.EtkinlikUyelikleri.AsNoTracking()
            join e in db.Etkinlikler.AsNoTracking() on u.EtkinlikId equals e.Id
            where u.KullaniciId == kullaniciId && e.DeletedAt == null
            orderby e.CreatedAt descending
            select new { e, u.Rol }).ToListAsync();

        return Results.Json(liste.Select(x => EtkinlikYaniti(x.e, x.Rol)));
    }

    private static async Task<IResult> AktifYap(
        string id, HttpContext ctx, BiAniBirakDbContext db,
        JwtServisi jwtServisi, HttpResponse yanit)
    {
        if (!KullaniciKimligi(ctx, out var kullaniciId))
            return Hata(401, "ERISIM_YOK", "Oturum bulunamadi.");
        if (!Guid.TryParse(id, out var etkinlikId))
            return Hata(400, "DOGRULAMA_HATASI", "Gecersiz etkinlik kimligi.");

        // Uyelik dogrulamasi: kullanici bu etkinligin uyesi mi? (izolasyon)
        var uyelik = await db.EtkinlikUyelikleri.AsNoTracking()
            .FirstOrDefaultAsync(u => u.EtkinlikId == etkinlikId && u.KullaniciId == kullaniciId);
        if (uyelik == null)
            return Hata(403, "ERISIM_YOK", "Bu etkinlige uye degilsiniz.");

        var kullanici = await db.Kullanicilar.AsNoTracking()
            .FirstOrDefaultAsync(k => k.Id == kullaniciId && k.DeletedAt == null);
        if (kullanici == null)
            return Hata(401, "ERISIM_YOK", "Kullanici bulunamadi.");

        // JWT'yi aktif_etkinlik_id dolu olarak yeniden uret + cerezi guncelle.
        var token = jwtServisi.Uret(kullanici, etkinlikId);
        CerezYardimcisi.Yaz(yanit, token, jwtServisi.GecerlilikGun);

        return Results.Json(new { aktif_etkinlik_id = etkinlikId, rol = uyelik.Rol });
    }

    private static async Task<IResult> AktifEtkinlik(HttpContext ctx, BiAniBirakDbContext db)
    {
        if (!KullaniciKimligi(ctx, out var kullaniciId))
            return Hata(401, "ERISIM_YOK", "Oturum bulunamadi.");

        // Tenant guard: aktif claim + uyelik.
        var (ok, etkinlikId, rol) = await AktifTenant(ctx, db, kullaniciId);
        if (!ok)
            return Hata(403, "ERISIM_YOK", "Aktif etkinlik yok veya uye degilsiniz.");

        // Tenant filtresi: WHERE Id = @aktif (izolasyon siniri).
        var etkinlik = await db.Etkinlikler.AsNoTracking()
            .FirstOrDefaultAsync(e => e.Id == etkinlikId && e.DeletedAt == null);
        if (etkinlik == null)
            return Hata(404, "ETKINLIK_BULUNAMADI", "Etkinlik bulunamadi.");

        return Results.Json(EtkinlikYaniti(etkinlik, rol));
    }

    // Aktif etkinligin cift-linkleri (es1/es2 token + public URL).
    private static async Task<IResult> AktifLinkler(HttpContext ctx, BiAniBirakDbContext db)
    {
        if (!KullaniciKimligi(ctx, out var kullaniciId))
            return Hata(401, "ERISIM_YOK", "Oturum bulunamadi.");
        var (ok, etkinlikId, _) = await AktifTenant(ctx, db, kullaniciId);
        if (!ok)
            return Hata(403, "ERISIM_YOK", "Aktif etkinlik yok veya uye degilsiniz.");

        var linkler = await db.PaylasimBaglantilari.AsNoTracking()
            .Where(p => p.EtkinlikId == etkinlikId)
            .OrderBy(p => p.Es)
            .ToListAsync();

        return Results.Json(linkler.Select(p => new
        {
            es = p.Es,
            token = p.Token,
            aktif = p.Aktif,
        }));
    }

    // Aktif etkinligin ayarlari (hardcoded yasak; tenant ayarindan okunur).
    private static async Task<IResult> AktifAyarlar(HttpContext ctx, BiAniBirakDbContext db)
    {
        if (!KullaniciKimligi(ctx, out var kullaniciId))
            return Hata(401, "ERISIM_YOK", "Oturum bulunamadi.");
        var (ok, etkinlikId, _) = await AktifTenant(ctx, db, kullaniciId);
        if (!ok)
            return Hata(403, "ERISIM_YOK", "Aktif etkinlik yok veya uye degilsiniz.");

        var ayar = await db.EtkinlikAyarlari.AsNoTracking()
            .FirstOrDefaultAsync(a => a.EtkinlikId == etkinlikId);
        if (ayar == null)
            return Hata(404, "AYAR_BULUNAMADI", "Etkinlik ayari bulunamadi.");

        return Results.Json(AyarYaniti(ayar));
    }

    // Aktif etkinligin ayarlarini guncelle (karsilama/tema/kapanis penceresi).
    private static async Task<IResult> AktifAyarlarGuncelle(
        EtkinlikAyarGuncelleIstek istek, HttpContext ctx, BiAniBirakDbContext db)
    {
        if (!KullaniciKimligi(ctx, out var kullaniciId))
            return Hata(401, "ERISIM_YOK", "Oturum bulunamadi.");
        var (ok, etkinlikId, _) = await AktifTenant(ctx, db, kullaniciId);
        if (!ok)
            return Hata(403, "ERISIM_YOK", "Aktif etkinlik yok veya uye degilsiniz.");

        var ayar = await db.EtkinlikAyarlari
            .FirstOrDefaultAsync(a => a.EtkinlikId == etkinlikId);
        if (ayar == null)
            return Hata(404, "AYAR_BULUNAMADI", "Etkinlik ayari bulunamadi.");

        // Yalniz gonderilen alanlar guncellenir (null = degistirme).
        if (istek.MarkaKapak != null) ayar.MarkaKapak = istek.MarkaKapak.Trim();
        if (istek.Tema != null) ayar.Tema = istek.Tema.Trim();
        if (istek.KarsilamaMetni != null) ayar.KarsilamaMetni = istek.KarsilamaMetni.Trim();
        if (istek.PromptMetni != null) ayar.PromptMetni = istek.PromptMetni.Trim();
        if (istek.KapanisPencereGun.HasValue)
        {
            var gun = istek.KapanisPencereGun.Value;
            if (gun < 1 || gun > 365)
                return Hata(400, "DOGRULAMA_HATASI", "Kapanis penceresi 1-365 gun araliginda olmalidir.");
            ayar.KapanisPencereGun = gun;
        }
        ayar.UpdatedAt = DateTimeOffset.UtcNow;

        db.DenetimGunlukleri.Add(new DenetimGunlugu
        {
            Id = Guid.NewGuid(),
            EtkinlikId = etkinlikId,
            KullaniciId = kullaniciId,
            Eylem = "AYAR_GUNCELLENDI",
            Varlik = "etkinlik_ayarlari",
            VarlikId = ayar.Id,
            DegisenAlanlar = JsonSerializer.Serialize(new
            {
                istek.MarkaKapak,
                istek.Tema,
                istek.KarsilamaMetni,
                istek.PromptMetni,
                istek.KapanisPencereGun,
            }),
            CreatedAt = ayar.UpdatedAt,
        });
        await db.SaveChangesAsync(); // atomik: ayar + audit

        return Results.Json(AyarYaniti(ayar));
    }

    private static object AyarYaniti(EtkinlikAyari a)
        => new
        {
            marka_kapak = a.MarkaKapak,
            tema = a.Tema,
            karsilama_metni = a.KarsilamaMetni,
            prompt_metni = a.PromptMetni,
            kapanis_pencere_gun = a.KapanisPencereGun,
        };
}
