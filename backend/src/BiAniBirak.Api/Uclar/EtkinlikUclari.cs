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

    public static void EtkinlikUclariniEkle(this WebApplication app)
    {
        app.MapPost("/api/etkinlik", EtkinlikOlustur).RequireAuthorization();
        app.MapGet("/api/etkinliklerim", Etkinliklerim).RequireAuthorization();
        app.MapPut("/api/etkinlik/{id}", EtkinlikGuncelle).RequireAuthorization();
        app.MapDelete("/api/etkinlik/{id}", EtkinlikSil).RequireAuthorization();
        app.MapPost("/api/etkinlik/{id}/aktif-yap", AktifYap).RequireAuthorization();
        app.MapGet("/api/etkinlik/aktif", AktifEtkinlik).RequireAuthorization();
        app.MapGet("/api/etkinlik/aktif/linkler", AktifLinkler).RequireAuthorization();
        app.MapGet("/api/etkinlik/aktif/ayarlar", AktifAyarlar).RequireAuthorization();
        app.MapPut("/api/etkinlik/aktif/ayarlar", AktifAyarlarGuncelle).RequireAuthorization();
        app.MapGet("/api/etkinlik/aktif/kuyruk", AktifKuyruk).RequireAuthorization();
        app.MapGet("/api/etkinlik/aktif/defter", AktifDefter).RequireAuthorization();
        app.MapGet("/api/etkinlik/aktif/denetim", AktifDenetim).RequireAuthorization();
        app.MapGet("/api/etkinlik/aktif/katki/{id:guid}", AktifKatkiDurum).RequireAuthorization();
        app.MapPost("/api/katki/{id}/onayla", KatkiOnayla).RequireAuthorization();
        app.MapPost("/api/katki/{id}/reddet", KatkiReddet).RequireAuthorization();
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
            etkinlik_tarihi = e.EtkinlikTarihi,
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

        // Kurucu hangi es? Verilmezse es1 (geriye donuk uyumluluk).
        // Bu, "hangi linkten gelen katki kime duser" dogrulugunu saglar.
        var kurucuEs = (istek.KurucuEs ?? "es1").Trim().ToLowerInvariant();
        if (kurucuEs != "es1" && kurucuEs != "es2")
            return Hata(400, "DOGRULAMA_HATASI", "Kurucu es gecersiz (es1/es2).");

        if (!DateTimeOffset.TryParse(istek.EtkinlikTarihi, CultureInfo.InvariantCulture,
                DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal, out var etkinlikTarihi))
            return Hata(400, "DOGRULAMA_HATASI", "Gecerli bir etkinlik tarihi/saati gereklidir.");

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
            kapanis = etkinlikTarihi.AddDays(Sabitler.VarsayilanKapanisPencereGun);

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

        // olusturan = kendi sectigi es rolunun uyesi (KurucuEs)
        var uyelik = new EtkinlikUyeligi
        {
            Id = Guid.NewGuid(),
            EtkinlikId = etkinlik.Id,
            KullaniciId = kullaniciId,
            Rol = kurucuEs,
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

        // etkinlik ayari - TURE GORE varsayilan blok (dugun/nisan/nikah ayri metinler).
        // Cift zorunlu alanlar disinda hicbir seye dokunmasa bile etkinlik kusursuz calisir.
        var varsayilan = Sabitler.TureGoreVarsayilan(tur);
        var ayar = new EtkinlikAyari
        {
            Id = Guid.NewGuid(),
            EtkinlikId = etkinlik.Id,
            KarsilamaMetni = varsayilan.KarsilamaMetni,
            PromptMetni = varsayilan.PromptMetni,
            KapanisPencereGun = Sabitler.VarsayilanKapanisPencereGun,
            SayacAktif = true,
            SayacAktifCumle = varsayilan.SayacAktifCumle,
            SayacBittiCumle = varsayilan.SayacBittiCumle,
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

    // Etkinlik duzenle (tur/adlar/tarih). Uyelik zorunlu; kismi guncelleme.
    private static async Task<IResult> EtkinlikGuncelle(
        string id, EtkinlikGuncelleIstek istek, HttpContext ctx, BiAniBirakDbContext db)
    {
        if (!KullaniciKimligi(ctx, out var kullaniciId))
            return Hata(401, "ERISIM_YOK", "Oturum bulunamadi.");
        if (!Guid.TryParse(id, out var etkinlikId))
            return Hata(400, "DOGRULAMA_HATASI", "Gecersiz etkinlik kimligi.");

        // Uyelik dogrulamasi (izolasyon)
        var uye = await db.EtkinlikUyelikleri.AsNoTracking()
            .AnyAsync(u => u.EtkinlikId == etkinlikId && u.KullaniciId == kullaniciId);
        if (!uye)
            return Hata(403, "ERISIM_YOK", "Bu etkinlige uye degilsiniz.");

        var etkinlik = await db.Etkinlikler
            .FirstOrDefaultAsync(e => e.Id == etkinlikId && e.DeletedAt == null);
        if (etkinlik == null)
            return Hata(404, "ETKINLIK_BULUNAMADI", "Etkinlik bulunamadi.");

        // Yalniz gonderilen alanlar (null = degistirme)
        if (istek.Tur != null)
        {
            var tur = istek.Tur.Trim().ToLowerInvariant();
            if (!GecerliTurler.Contains(tur))
                return Hata(400, "DOGRULAMA_HATASI", "Gecersiz tur.");
            etkinlik.Tur = tur;
        }
        if (istek.Es1Ad != null)
        {
            var v = istek.Es1Ad.Trim();
            if (v.Length < 2) return Hata(400, "DOGRULAMA_HATASI", "Birinci es adi gecersiz.");
            etkinlik.Es1Ad = v;
        }
        if (istek.Es2Ad != null)
        {
            var v = istek.Es2Ad.Trim();
            if (v.Length < 2) return Hata(400, "DOGRULAMA_HATASI", "Ikinci es adi gecersiz.");
            etkinlik.Es2Ad = v;
        }
        if (istek.EtkinlikTarihi != null)
        {
            if (!DateTimeOffset.TryParse(istek.EtkinlikTarihi, CultureInfo.InvariantCulture,
                    DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal, out var yeniTarih))
                return Hata(400, "DOGRULAMA_HATASI", "Gecerli bir etkinlik tarihi/saati gereklidir.");
            etkinlik.EtkinlikTarihi = yeniTarih;
            // kapanis penceresi ayardan; tarih degisince kapanisi tutarli tut
            var ayar = await db.EtkinlikAyarlari.AsNoTracking()
                .FirstOrDefaultAsync(a => a.EtkinlikId == etkinlikId);
            var gun = ayar?.KapanisPencereGun ?? Sabitler.VarsayilanKapanisPencereGun;
            etkinlik.KapanisTarihi = yeniTarih.AddDays(gun);
        }
        etkinlik.UpdatedAt = DateTimeOffset.UtcNow;

        db.DenetimGunlukleri.Add(new DenetimGunlugu
        {
            Id = Guid.NewGuid(),
            EtkinlikId = etkinlikId,
            KullaniciId = kullaniciId,
            Eylem = "ETKINLIK_GUNCELLENDI",
            Varlik = "etkinlikler",
            VarlikId = etkinlikId,
            DegisenAlanlar = JsonSerializer.Serialize(new
            {
                istek.Tur, istek.Es1Ad, istek.Es2Ad, istek.EtkinlikTarihi,
            }),
            CreatedAt = etkinlik.UpdatedAt,
        });
        await db.SaveChangesAsync();

        return Results.Json(EtkinlikYaniti(etkinlik));
    }

    // Etkinlik sil (soft-delete: DeletedAt). Uyelik zorunlu.
    private static async Task<IResult> EtkinlikSil(
        string id, HttpContext ctx, BiAniBirakDbContext db)
    {
        if (!KullaniciKimligi(ctx, out var kullaniciId))
            return Hata(401, "ERISIM_YOK", "Oturum bulunamadi.");
        if (!Guid.TryParse(id, out var etkinlikId))
            return Hata(400, "DOGRULAMA_HATASI", "Gecersiz etkinlik kimligi.");

        var uye = await db.EtkinlikUyelikleri.AsNoTracking()
            .AnyAsync(u => u.EtkinlikId == etkinlikId && u.KullaniciId == kullaniciId);
        if (!uye)
            return Hata(403, "ERISIM_YOK", "Bu etkinlige uye degilsiniz.");

        var etkinlik = await db.Etkinlikler
            .FirstOrDefaultAsync(e => e.Id == etkinlikId && e.DeletedAt == null);
        if (etkinlik == null)
            return Hata(404, "ETKINLIK_BULUNAMADI", "Etkinlik bulunamadi.");

        var simdi = DateTimeOffset.UtcNow;
        etkinlik.DeletedAt = simdi;
        etkinlik.UpdatedAt = simdi;

        db.DenetimGunlukleri.Add(new DenetimGunlugu
        {
            Id = Guid.NewGuid(),
            EtkinlikId = etkinlikId,
            KullaniciId = kullaniciId,
            Eylem = "ETKINLIK_SILINDI",
            Varlik = "etkinlikler",
            VarlikId = etkinlikId,
            DegisenAlanlar = null,
            CreatedAt = simdi,
        });
        await db.SaveChangesAsync();

        return Results.Json(new { durum = "silindi" });
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
        if (istek.SayacAktif.HasValue) ayar.SayacAktif = istek.SayacAktif.Value;
        if (istek.SayacAktifCumle != null) ayar.SayacAktifCumle = istek.SayacAktifCumle.Trim();
        if (istek.SayacBittiCumle != null) ayar.SayacBittiCumle = istek.SayacBittiCumle.Trim();
        if (istek.KapanisPencereGun.HasValue)
        {
            var gun = istek.KapanisPencereGun.Value;
            if (gun < Sabitler.MinKapanisPencereGun || gun > Sabitler.MaxKapanisPencereGun)
                return Hata(400, "DOGRULAMA_HATASI",
                    $"Kapanis penceresi en az {Sabitler.MinKapanisPencereGun} gun olmalidir (en fazla {Sabitler.MaxKapanisPencereGun}).");
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

    // Denetim gunlugu: aktif etkinligin son 100 kaydi (tenant-scoped; seffaflik).
    // Bildirimden gelen focus icin: dilegin GUNCEL durumu (beklemede/onaylandi/reddedildi).
    // Frontend buna gore dogru yere scroll + highlight yapar ya da uyari gosterir.
    private static async Task<IResult> AktifKatkiDurum(Guid id, HttpContext ctx, BiAniBirakDbContext db)
    {
        if (!KullaniciKimligi(ctx, out var kullaniciId))
            return Hata(401, "ERISIM_YOK", "Oturum bulunamadi.");
        var (ok, etkinlikId, rol) = await AktifTenant(ctx, db, kullaniciId);
        if (!ok)
            return Hata(403, "ERISIM_YOK", "Aktif etkinlik yok veya uye degilsiniz.");

        var katki = await db.Katkilar.AsNoTracking()
            .FirstOrDefaultAsync(k => k.Id == id && k.EtkinlikId == etkinlikId);
        if (katki == null)
            return Hata(404, "KATKI_BULUNAMADI", "Dilek bulunamadı.");

        return Results.Json(new
        {
            id = katki.Id,
            durum = katki.Durum,
            kaynak_es = katki.KaynakEs,
            davetli_ad = katki.DavetliAd,
            // Bu dilek benim kuyrugumda mi (beklemede + benim tarafim)?
            benim_kuyrugumda = katki.Durum == "beklemede" && katki.KaynakEs == rol,
        });
    }

    private static async Task<IResult> AktifDenetim(HttpContext ctx, BiAniBirakDbContext db)
    {
        if (!KullaniciKimligi(ctx, out var kullaniciId))
            return Hata(401, "ERISIM_YOK", "Oturum bulunamadi.");
        var (ok, etkinlikId, _) = await AktifTenant(ctx, db, kullaniciId);
        if (!ok)
            return Hata(403, "ERISIM_YOK", "Aktif etkinlik yok veya uye degilsiniz.");

        var kayitlar = await db.DenetimGunlukleri.AsNoTracking()
            .Where(d => d.EtkinlikId == etkinlikId)
            .OrderByDescending(d => d.CreatedAt)
            .Take(100)
            .ToListAsync();

        return Results.Json(kayitlar.Select(d => new
        {
            id = d.Id,
            eylem = d.Eylem,
            varlik = d.Varlik,
            degisen_alanlar = d.DegisenAlanlar,
            created_at = d.CreatedAt,
        }));
    }

    private static object AyarYaniti(EtkinlikAyari a)
        => new
        {
            marka_kapak = a.MarkaKapak,
            tema = a.Tema,
            karsilama_metni = a.KarsilamaMetni,
            prompt_metni = a.PromptMetni,
            kapanis_pencere_gun = a.KapanisPencereGun,
            sayac_aktif = a.SayacAktif,
            sayac_aktif_cumle = a.SayacAktifCumle,
            sayac_bitti_cumle = a.SayacBittiCumle,
        };

    private static object KatkiYaniti(Katki k)
        => new
        {
            id = k.Id,
            kaynak_es = k.KaynakEs,
            davetli_ad = k.DavetliAd,
            mesaj = k.Mesaj,
            durum = k.Durum,
            created_at = k.CreatedAt,
        };

    // Onay kuyrugu: YALNIZ oturumdaki esin rolune ait bekleyen katkilar (izolasyon).
    // Belge 04: WHERE EtkinlikId=@e AND KaynakEs=@rol AND Durum='beklemede'.
    // Bir es digerinin kuyrugunu ASLA cekemez (wedge - birlesim-oncesi izolasyon).
    private static async Task<IResult> AktifKuyruk(HttpContext ctx, BiAniBirakDbContext db)
    {
        if (!KullaniciKimligi(ctx, out var kullaniciId))
            return Hata(401, "ERISIM_YOK", "Oturum bulunamadi.");
        var (ok, etkinlikId, rol) = await AktifTenant(ctx, db, kullaniciId);
        if (!ok)
            return Hata(403, "ERISIM_YOK", "Aktif etkinlik yok veya uye degilsiniz.");

        var kuyruk = await db.Katkilar.AsNoTracking()
            .Where(k => k.EtkinlikId == etkinlikId && k.KaynakEs == rol && k.Durum == "beklemede")
            .OrderBy(k => k.CreatedAt)
            .ToListAsync();

        return Results.Json(kuyruk.Select(KatkiYaniti));
    }

    // Ortak defter: HER IKI esin onayli katkilarinin birlesimi. Ikisi de gorur.
    // KaynakEs metadata korunur (kurasyonda "gelinin/damadin tarafi").
    private static async Task<IResult> AktifDefter(HttpContext ctx, BiAniBirakDbContext db)
    {
        if (!KullaniciKimligi(ctx, out var kullaniciId))
            return Hata(401, "ERISIM_YOK", "Oturum bulunamadi.");
        var (ok, etkinlikId, _) = await AktifTenant(ctx, db, kullaniciId);
        if (!ok)
            return Hata(403, "ERISIM_YOK", "Aktif etkinlik yok veya uye degilsiniz.");

        var defter = await db.Katkilar.AsNoTracking()
            .Where(k => k.EtkinlikId == etkinlikId && k.Durum == "onayli")
            .OrderBy(k => k.CreatedAt)
            .ToListAsync();

        return Results.Json(defter.Select(KatkiYaniti));
    }

    // Katki onayla: yalniz KENDI KaynakEs'indeki bekleyen katki (sahiplik + izolasyon).
    private static async Task<IResult> KatkiOnayla(
        string id, HttpContext ctx, BiAniBirakDbContext db, PushGonderici push)
        => await KatkiDurumDegistir(id, ctx, db, "onayli", "KATKI_ONAYLANDI", push);

    // Katki reddet: yalniz KENDI KaynakEs'indeki bekleyen katki. Icerik degil eylem kaydi.
    private static async Task<IResult> KatkiReddet(
        string id, HttpContext ctx, BiAniBirakDbContext db)
        => await KatkiDurumDegistir(id, ctx, db, "red", "KATKI_REDDEDILDI", null);

    // Ortak: onayla/reddet. Defense in depth: tenant + KaynakEs sahiplik + beklemede kontrolu.
    private static async Task<IResult> KatkiDurumDegistir(
        string id, HttpContext ctx, BiAniBirakDbContext db, string yeniDurum, string eylem,
        PushGonderici? push)
    {
        if (!KullaniciKimligi(ctx, out var kullaniciId))
            return Hata(401, "ERISIM_YOK", "Oturum bulunamadi.");
        if (!Guid.TryParse(id, out var katkiId))
            return Hata(400, "DOGRULAMA_HATASI", "Gecersiz katki kimligi.");

        var (ok, etkinlikId, rol) = await AktifTenant(ctx, db, kullaniciId);
        if (!ok)
            return Hata(403, "ERISIM_YOK", "Aktif etkinlik yok veya uye degilsiniz.");

        // Tenant + KaynakEs sahiplik: sadece kendi kuyrugundaki bekleyen katki.
        var katki = await db.Katkilar
            .FirstOrDefaultAsync(k => k.Id == katkiId && k.EtkinlikId == etkinlikId);
        if (katki == null)
            return Hata(404, "KATKI_BULUNAMADI", "Katki bulunamadi.");
        if (katki.KaynakEs != rol)
            return Hata(403, "ERISIM_YOK", "Bu katki sizin onay kuyrugunuzda degil.");
        if (katki.Durum != "beklemede")
            return Hata(409, "KATKI_ZATEN_ISLENMIS", "Bu katki zaten islenmis.");

        var simdi = DateTimeOffset.UtcNow;
        katki.Durum = yeniDurum;
        katki.OnaylayanKullaniciId = kullaniciId;
        katki.OnayZamani = simdi;
        katki.UpdatedAt = simdi;

        db.DenetimGunlukleri.Add(new DenetimGunlugu
        {
            Id = Guid.NewGuid(),
            EtkinlikId = etkinlikId,
            KullaniciId = kullaniciId,
            Eylem = eylem,
            Varlik = "katkilar",
            VarlikId = katkiId,
            DegisenAlanlar = JsonSerializer.Serialize(new { kaynak_es = katki.KaynakEs }),
            CreatedAt = simdi,
        });
        await db.SaveChangesAsync(); // atomik: durum + audit

        // Onay tetigi: diger ese "ortak deftere eklendi" bildirimi (fire-and-forget).
        if (yeniDurum == "onayli" && push != null)
        {
            var digerRol = rol == "es1" ? "es2" : "es1";
            var digerUye = await db.EtkinlikUyelikleri.AsNoTracking()
                .FirstOrDefaultAsync(u => u.EtkinlikId == etkinlikId && u.Rol == digerRol);
            if (digerUye != null)
            {
                _ = push.GonderAsync(digerUye.KullaniciId,
                    "Ortak deftere bir anı eklendi",
                    $"{katki.DavetliAd} tarafından bırakılan bir dilek onaylandı ve ortak defterinize eklendi.",
                    url: $"/panel/etkinlik?focus={katki.Id}", etkinlikId: etkinlikId);
            }
        }

        return Results.Json(new { durum = yeniDurum });
    }
}
