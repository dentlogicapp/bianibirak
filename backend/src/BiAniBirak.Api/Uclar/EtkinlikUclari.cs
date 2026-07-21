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

        // SENKRON DAMGASI - cihazlar arasi "bir sey degisti mi?" sorusu.
        //
        // Buraya kondu, ayri bir dosyaya DEGIL: sordugu sorularin cogu tenant
        // cekirdegine ait (aktif defter, kuyruk, ortak defter, ayar) ve bu dosyanin
        // AktifTenant/KullaniciKimligi yardimcilarini kullanir. Ayri dosya acmak,
        // ayni yardimcilarin ikinci bir kopyasini dogururdu.
        app.MapGet("/api/durum", Durum).RequireAuthorization();
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

    // Tenant guard - ARTIK TEK KAYNAKTAN: Kimlik/TenantErisim.
    //
    // Mantik buradan cikarildi cunku ayni kod dort uc dosyasinda kopyalanmisti ve
    // birine eklenen kural digerlerine ULASMIYORDU. Nitekim super yonetici uye
    // olmadigi bir defteri goruntuledigunde her uc 403 donuyordu: teshis araci
    // hicbir ise yaramiyordu, cunku istisna hicbir kopyada yoktu.
    //
    // Cozulen iki yol ve neyi getirdikleri TenantErisim'de ayrintili yazili:
    //   uyelik   -> rol "es1"/"es2" (izolasyonun temeli, DEGISMEDI)
    //   inceleme -> rol "inceleme"  (super yonetici, salt-okunur, uc katman koruma)
    private static Task<(bool ok, Guid etkinlikId, string rol)> AktifTenant(
        HttpContext ctx, BiAniBirakDbContext db, Guid kullaniciId)
        => TenantErisim.CozAsync(ctx, db, kullaniciId);

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

            // IMHA TARIHI BACKEND'DEN GELIR - TEK KANON.
            //
            // Onceki surumde frontend bunu KENDI hesapliyordu ("kapanis + 7 + 10")
            // ve backend baska soyluyordu ("kapanis + 37"). Cizelge kullaniciya
            // YALAN tarih gosteriyordu. Bir zaman urununde bu, ozurle gecistirilecek
            // bir hata degil - urunun temel vaadinin cokusudur.
            //
            // Artik hesap TEK yerde: burada. Frontend yalniz GOSTERIR.
            imha_tarihi = e.KapanisTarihi.AddDays(Sabitler.SaklamaGun),
            toplama_gun = Sabitler.ToplamaGun,
            indirme_gun = Sabitler.IndirmeGun,
            toplam_gun = Sabitler.ToplamGun,
            imha_edildi = e.ImhaEdildi,
            // DONDURULDU - cift bunu GORMELI. Onceden super admin dondurunca cift
            // hicbir fark hissetmiyordu; davetliler sessizce reddediliyor, cift
            // "bende bir sorun yok" saniyordu.
            donduruldu = e.Donduruldu,
            // TARIH KILITLI MI - ozel gun gectiyse arayuz alani KAPATIR.
            // Sunucu zaten reddediyor; bu bayrak kullaniciya "neden yapamiyorum"
            // sorusunu SORDURMADAN yanit vermek icin (defense in depth + iyi UX).
            tarih_kilitli = e.EtkinlikTarihi <= DateTimeOffset.UtcNow,

            durum = e.Durum,
            rol,
        };

    private static async Task<IResult> EtkinlikOlustur(
        EtkinlikOlusturIstek istek, HttpContext ctx, BiAniBirakDbContext db,
        PushGonderici push)
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
            kapanis = etkinlikTarihi.AddDays(Sabitler.ToplamaGun);

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
            KisaKod = KisaKodUreteci.Uret(),
            Aktif = true,
            CreatedAt = simdi,
        };
        var linkEs2 = new PaylasimBaglantisi
        {
            Id = Guid.NewGuid(),
            EtkinlikId = etkinlik.Id,
            Es = "es2",
            Token = TokenUreteci.Uret(),
            KisaKod = KisaKodUreteci.Uret(),
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
            KapanisPencereGun = Sabitler.ToplamaGun,
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

        // HOSGELDIN - sureci BASTA anlat. Sonradan "bilmiyordum" diyen bir cift,
        // bizim iletisim basarisizligimizdir.
        await HosgeldinBildirimi.GonderAsync(
            db, push, kullaniciId, etkinlik.Id, $"{es1} & {es2}", tur);

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

        // Uyelik dogrulamasi (izolasyon). Salt-okunur inceleme burada GECERLI DEGIL:
        // bu bir yazim ucudur ve inceleme rolu hicbir yazim yapamaz.
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

            // ÖZEL GÜN GEÇTİYSE TARİH DEĞİŞTİRİLEMEZ.
            //
            // KAPATILAN ACIK: tum yasam dongusu (toplama kapanisi, indirme penceresi,
            // IMHA) ozel gunden turetilir. Tarih serbestce ileri alinabilseydi, bir
            // cift her seferinde tarihi biraz ileri atarak defterini SONSUZA KADAR
            // yasatabilir, imha hicbir zaman calismazdi. Sonuc: veri sonsuza dek
            // saklanir, disk siser ve "20 gun sonra silinir" sozu ANLAMSIZ hale gelir.
            // Bu yalnizca bir kaynak sorunu degil, VERDIGIMIZ SOZUN ihlalidir.
            //
            // Kural: ozel gun GELMEDEN once tarih serbestce degistirilebilir (dugun
            // ertelenebilir - bu mesru bir ihtiyactir). Ozel gun GECTIKTEN sonra
            // takvim KILITLENIR.
            if (etkinlik.EtkinlikTarihi <= DateTimeOffset.UtcNow)
                return Hata(409, "TARIH_KILITLI",
                    "Özel gününüz geçtiği için tarih artık değiştirilemez. Defterinizin "
                    + "kapanış ve saklama takvimi bu tarihe göre işlemektedir.");

            etkinlik.EtkinlikTarihi = yeniTarih;

            // TEK KANON: kapanis HER ZAMAN ozel gun + ToplamaGun. Ayardan okunmaz.
            // Onceki surumde her defterin penceresi farkli olabiliyordu; kimse ne zaman
            // ne olacagini bilmiyordu. Simdi tek cumle herkese ayni sozu veriyor.
            // Tarih degisirse imha takvimi de kayar - uyari bayraklari sifirlanir,
            // yoksa yeni takvim icin uyari GONDERILMEZ ve cift habersiz kalir.
            etkinlik.KapanisTarihi = yeniTarih.AddDays(Sabitler.ToplamaGun);
            etkinlik.ImhaUyari14Gonderildi = false;
            etkinlik.ImhaUyari3Gonderildi = false;
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

    // Etkinlik sil (cope tasi). Uyelik zorunlu.
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

        // TEK MEKANIZMA: SilindiMi + SilinmeZamani.
        //
        // Onceden burada DeletedAt yaziliyordu; oysa cop kutusu (hem ciftin hem super
        // panelin) SilindiMi bayragina bakiyor. Iki paralel yumusak-silme mekanizmasi
        // vardi ve birbirlerini GORMUYORLARDI: kullanicinin sildigi defter hicbir
        // yerde gorunmuyor, hicbir gorev de temizlemiyordu - gorunmez bir hayalet
        // olarak sonsuza kadar duruyordu.
        var simdi = DateTimeOffset.UtcNow;
        etkinlik.SilindiMi = true;
        etkinlik.SilinmeZamani = simdi;
        etkinlik.UpdatedAt = simdi;

        // SENKRON: silinen defter birinin AKTIF defteriyse, o kaydin uzerinde
        // birakmak digerlerini olu bir kimlige gondermek olurdu. Temizlenir;
        // /api/durum null bildirir ve cihazlar kendi listelerinden secer.
        var aktifTutanlar = await db.Kullanicilar
            .Where(k => k.AktifEtkinlikId == etkinlikId)
            .ToListAsync();
        foreach (var k in aktifTutanlar) k.AktifEtkinlikId = null;

        db.DenetimGunlukleri.Add(new DenetimGunlugu
        {
            Id = Guid.NewGuid(),
            EtkinlikId = etkinlikId,
            KullaniciId = kullaniciId,
            Eylem = "ETKINLIK_COPE_TASINDI",
            Varlik = "etkinlikler",
            VarlikId = etkinlikId,
            DegisenAlanlar = null,
            CreatedAt = simdi,
        });
        await db.SaveChangesAsync();

        return Results.Json(new { durum = "cope_tasindi" });
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

        // AsNoTracking KALDIRILDI: bu kayit artik GUNCELLENIYOR.
        var kullanici = await db.Kullanicilar
            .FirstOrDefaultAsync(k => k.Id == kullaniciId && k.DeletedAt == null);
        if (kullanici == null)
            return Hata(401, "ERISIM_YOK", "Kullanici bulunamadi.");

        // SUNUCU TARAFI DURUM - senkronun temeli.
        //
        // Bu satir olmadan cihazlar arasi defter senkronu IMKANSIZ: aktif defter
        // yalnizca JWT'de dursaydi, telefonun sunucuya soracagi bir soru olmazdi.
        // Yalnizca degistiyse yazilir - her aktif-yap cagrisinda gereksiz UPDATE
        // uretmemek icin (menuden ayni deftere tekrar tiklamak sik bir davranis).
        if (kullanici.AktifEtkinlikId != etkinlikId)
        {
            kullanici.AktifEtkinlikId = etkinlikId;
            kullanici.UpdatedAt = DateTimeOffset.UtcNow;
            await db.SaveChangesAsync();
        }

        // JWT'yi aktif_etkinlik_id dolu olarak yeniden uret + cerezi guncelle.
        var token = jwtServisi.Uret(kullanici, etkinlikId);
        CerezYardimcisi.Yaz(yanit, token, jwtServisi.GecerlilikGun);

        return Results.Json(new { aktif_etkinlik_id = etkinlikId, rol = uyelik.Rol });
    }

    private static async Task<IResult> AktifEtkinlik(HttpContext ctx, BiAniBirakDbContext db)
    {
        if (!KullaniciKimligi(ctx, out var kullaniciId))
            return Hata(401, "ERISIM_YOK", "Oturum bulunamadi.");

        // Tenant guard: aktif claim + uyelik (ya da salt-okunur inceleme).
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

    // ---------------- SENKRON DAMGASI (/api/durum) ----------------
    //
    // SALT OKUNUR ve ICERIKSIZ. Doner: her kapsam icin "kac tane . en son ne zaman"
    // biciminde kisa bir damga. Isim, dilek metni, e-posta, telefon - hicbiri YOK.
    // Istemci damgalari elindekiyle karsilastirir; degisen kapsamin verisini KENDI
    // mevcut ucundan ceker. Boylece yeni bir okuma yolu acilmaz: tenant filtresi,
    // uyelik ve KaynakEs izolasyonu nerede kuruluysa orada kalir.
    //
    // IZOLASYON BURADA DA GECERLI:
    //   kuyruk -> KISIYE OZEL (KaynakEs == rol). Esin kuyrugu senin damgani
    //             degistirmez; cift-link izolasyonu sinyal duzeyinde de korunur.
    //   defter -> ORTAK (onayli katkilar). Ikisi de gormeye zaten yetkili.
    //
    // MALIYET: dort sorgu. Ucu toplulastirilmis (GroupBy) - satirlar istemciye
    // TASINMAZ, sayim ve en-son damgasi veritabaninda hesaplanir. Sekme
    // gorunmuyorken istemci hic sormaz.
    private static async Task<IResult> Durum(
        HttpContext ctx, BiAniBirakDbContext db, CancellationToken ct)
    {
        if (!KullaniciKimligi(ctx, out var kullaniciId))
            return Hata(401, "ERISIM_YOK", "Oturum bulunamadi.");

        // GORUNTULEME MODU - senkron BU OTURUMDA calismaz.
        //
        // Super yonetici baska bir deftere salt-okunur girdiginde JWT gecicidir
        // (1 saat) ve DB'ye YAZILMAZ. Uzlasma calissaydi yoneticiyi inceledigi
        // defterden aninda disari atardi: teshis araci kendi kendini kapatirdi.
        // Bu yuzden claim'in gordugu deger doner - istemci fark GORMEZ.
        var goruntulemeModu = ctx.User.FindFirstValue("goruntuleme_modu") == "true";

        Guid? aktifId;
        if (goruntulemeModu)
        {
            aktifId = Guid.TryParse(ctx.User.FindFirstValue("aktif_etkinlik_id"), out var g)
                ? g : null;
        }
        else
        {
            aktifId = await db.Kullanicilar.AsNoTracking()
                .Where(k => k.Id == kullaniciId && k.DeletedAt == null)
                .Select(k => k.AktifEtkinlikId)
                .FirstOrDefaultAsync(ct);

            // UYELIK DOGRULAMASI - sonsuz dongu korumasi.
            //
            // Defter kalici silinmis ya da uyelik kalkmis olabilir. Dogrulamadan
            // bildirseydik istemci aktif-yap'i cagirir, 403 alir, bir sonraki turda
            // ayni degeri gorur ve AYNI TURU SONSUZA DEK tekrarlardi.
            if (aktifId.HasValue)
            {
                var uyeMi = await db.EtkinlikUyelikleri.AsNoTracking()
                    .AnyAsync(u => u.KullaniciId == kullaniciId && u.EtkinlikId == aktifId.Value, ct);
                if (!uyeMi) aktifId = null;
            }
        }

        // ---- DEFTER LISTESI ----
        // Kullanicinin uye oldugu defterlerin sayisi + en son degisimi. Yeni defter,
        // ad/tarih degisimi, cope tasima ve geri alma - hepsi UpdatedAt'e dokunur.
        // Satir sayisi bir kullanicida birkac tanedir; toplulastirma icin
        // materialize etmek guvenli ve sorgusu basit kalir.
        var defterZamanlari = await (
            from u in db.EtkinlikUyelikleri.AsNoTracking()
            join e in db.Etkinlikler.AsNoTracking() on u.EtkinlikId equals e.Id
            where u.KullaniciId == kullaniciId
            select e.UpdatedAt).ToListAsync(ct);

        var defterlerDamga = DamgaUret(
            defterZamanlari.Count,
            defterZamanlari.Count == 0 ? null : defterZamanlari.Max());

        // ---- BILDIRIMLER ----
        // Okundu/okunmadi ayri gruplanir: rozet sayisi da damgaya girsin. Bir
        // bildirimi baska cihazda okumak burayi degistirir ve rozet senkronlanir.
        var bildirimOzet = await db.Bildirimler.AsNoTracking()
            .Where(b => b.KullaniciId == kullaniciId)
            .GroupBy(b => b.OkunduMu)
            .Select(g => new { Okundu = g.Key, Sayi = g.Count(), Son = g.Max(x => x.CreatedAt) })
            .ToListAsync(ct);

        var bildirimSayi = bildirimOzet.Sum(x => x.Sayi);
        var okunmamis = bildirimOzet.Where(x => !x.Okundu).Sum(x => x.Sayi);
        DateTimeOffset? bildirimSon =
            bildirimOzet.Count == 0 ? null : bildirimOzet.Max(x => x.Son);
        var bildirimDamga = $"{okunmamis}.{DamgaUret(bildirimSayi, bildirimSon)}";

        // Aktif defter yoksa kalan kapsamlarin anlami da yok - sabit damga doner.
        var kuyrukDamga = "-";
        var defterDamga = "-";
        var ayarDamga = "-";

        if (aktifId.HasValue)
        {
            // Rol: kuyruk damgasinin KISIYE OZEL olmasi buna bagli. Inceleme
            // oturumunda uyelik yoktur; rol null kalir ve kuyruk BOS damga uretir -
            // yoneticinin cift-link izolasyonuna sinyal duzeyinde de dokunmamasi icin.
            var rol = await db.EtkinlikUyelikleri.AsNoTracking()
                .Where(u => u.KullaniciId == kullaniciId && u.EtkinlikId == aktifId.Value)
                .Select(u => u.Rol)
                .FirstOrDefaultAsync(ct);

            // TEK SORGU, IKI DAMGA: durum + kaynak es kirilimi.
            var katkiOzet = await db.Katkilar.AsNoTracking()
                .Where(k => k.EtkinlikId == aktifId.Value && !k.SilindiMi)
                .GroupBy(k => new { k.Durum, k.KaynakEs })
                .Select(g => new
                {
                    g.Key.Durum,
                    g.Key.KaynakEs,
                    Sayi = g.Count(),
                    Son = g.Max(x => x.UpdatedAt),
                })
                .ToListAsync(ct);

            // KUYRUK - yalniz BENIM tarafim, yalniz beklemede.
            var kuyruk = katkiOzet
                .Where(x => x.Durum == "beklemede" && x.KaynakEs == rol)
                .ToList();
            kuyrukDamga = DamgaUret(
                kuyruk.Sum(x => x.Sayi),
                kuyruk.Count == 0 ? null : kuyruk.Max(x => x.Son));

            // DEFTER - ortak, onayli.
            var defter = katkiOzet.Where(x => x.Durum == "onayli").ToList();
            defterDamga = DamgaUret(
                defter.Sum(x => x.Sayi),
                defter.Count == 0 ? null : defter.Max(x => x.Son));

            // AYAR - etkinlik ve ayar satirlarinin en son degisimi. Ad, tarih,
            // karsilama metni, sayac, dondurma - hepsi buradan gorunur.
            var etkinlikZaman = await db.Etkinlikler.AsNoTracking()
                .Where(e => e.Id == aktifId.Value)
                .Select(e => (DateTimeOffset?)e.UpdatedAt)
                .FirstOrDefaultAsync(ct);
            var ayarZaman = await db.EtkinlikAyarlari.AsNoTracking()
                .Where(a => a.EtkinlikId == aktifId.Value)
                .Select(a => (DateTimeOffset?)a.UpdatedAt)
                .FirstOrDefaultAsync(ct);

            DateTimeOffset? ayarSon =
                etkinlikZaman.HasValue && ayarZaman.HasValue
                    ? (etkinlikZaman > ayarZaman ? etkinlikZaman : ayarZaman)
                    : etkinlikZaman ?? ayarZaman;
            ayarDamga = DamgaUret(1, ayarSon);
        }

        return Results.Json(new
        {
            aktif_etkinlik_id = aktifId,
            goruntuleme_modu = goruntulemeModu,
            defterler = defterlerDamga,
            bildirim = bildirimDamga,
            kuyruk = kuyrukDamga,
            defter = defterDamga,
            ayar = ayarDamga,
        });
    }

    // Damga: "sayi.tick". Karsilastirilir, cozumlenmez - istemci icin opak bir dize.
    // Sayi da girer cunku bir SILME zamani ileri tasimaz ama sayiyi dusurur.
    private static string DamgaUret(int sayi, DateTimeOffset? enSon)
        => $"{sayi}.{(enSon?.UtcTicks ?? 0)}";

    // Aktif etkinligin cift-linkleri (es1/es2 token + public URL).
    private static async Task<IResult> AktifLinkler(HttpContext ctx, BiAniBirakDbContext db)
    {
        if (!KullaniciKimligi(ctx, out var kullaniciId))
            return Hata(401, "ERISIM_YOK", "Oturum bulunamadı.");
        var (ok, etkinlikId, rol) = await AktifTenant(ctx, db, kullaniciId);
        if (!ok)
            return Hata(403, "ERISIM_YOK", "Aktif etkinlik yok veya bu etkinliğe üye değilsin.");

        // IZOLASYON: her es YALNIZ kendi baglantisini gorur. Esinin baglantisini
        // yanlislikla paylasmasi, gelen katkilarin yanlis kuyruga dusmesine yol acar.
        // Bu yuzden filtre backend'de - UI'da gizlemek yeterli DEGIL.
        //
        // INCELEME ROLU: "inceleme" hicbir Es degeriyle eslesmez -> BOS liste.
        // Yonetici ciftin davetli token'ini gormez; teshis icin gerekli degildir ve
        // sizmasi halinde defterin kapisini acar.
        var linkler = await db.PaylasimBaglantilari.AsNoTracking()
            .Where(p => p.EtkinlikId == etkinlikId && p.Es == rol)
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
        var (ok, etkinlikId, rol) = await AktifTenant(ctx, db, kullaniciId);
        if (!ok)
            return Hata(403, "ERISIM_YOK", "Aktif etkinlik yok veya uye degilsiniz.");

        // YAZIM: inceleme rolu buradan gecemez. Program.cs'teki global write-guard
        // zaten 403 doner; bu ikinci katman (defense in depth) - guard bir gun
        // degisirse bu satir ayakta kalir.
        if (TenantErisim.IncelemeMi(rol))
            return Hata(403, "GORUNTULEME_MODU", "Salt okunur inceleme oturumunda değişiklik yapılamaz.");

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
        // KAPANIS PENCERESI ARTIK DEGISTIRILEMEZ.
        //
        // Her defterde ayni: ozel gun + 30 gun toplama + 7 gun indirme = 37. Degisken
        // sure, cifte esneklik degil BELIRSIZLIK veriyordu: kimse ne zaman ne olacagini
        // bilmiyor, destek her seferinde "sizin defterinizde su tarih" demek zorunda
        // kaliyordu. Tek kural, herkese ayni soz.
        //
        // Gelen istekte bu alan varsa SESSIZCE YOK SAYILIR (eski istemciler kirilmasin);
        // ayar kolonu tarihsel olarak duruyor ama hicbir hesapta OKUNMUYOR.
        ayar.KapanisPencereGun = Sabitler.ToplamaGun;
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

        // BASKA DEFTERDE OLABILIR: bildirim (uygulama ici ya da push) baska bir
        // etkinlige aitse istemci hala eski defterdedir. Dilegi kullanicinin UYE
        // OLDUGU defterler icinde ararız ve hangi deftere ait oldugunu doneriz;
        // istemci o deftere gecip odagi acar. Uyelik disina ASLA bakilmaz - tenant
        // izolasyonu korunur.
        if (katki == null)
        {
            var uyeEtkinlikler = db.EtkinlikUyelikleri.AsNoTracking()
                .Where(u => u.KullaniciId == kullaniciId)
                .Select(u => u.EtkinlikId);

            var baskaDefterde = await db.Katkilar.AsNoTracking()
                .FirstOrDefaultAsync(k => k.Id == id && uyeEtkinlikler.Contains(k.EtkinlikId));

            if (baskaDefterde == null)
                return Hata(404, "KATKI_BULUNAMADI", "Dilek bulunamadı.");

            return Results.Json(new
            {
                id = baskaDefterde.Id,
                durum = baskaDefterde.Durum,
                kaynak_es = baskaDefterde.KaynakEs,
                davetli_ad = baskaDefterde.DavetliAd,
                benim_kuyrugumda = false,
                // Istemci sinyali: bu dilek BASKA defterde - once oraya gec.
                etkinlik_id = baskaDefterde.EtkinlikId,
                baska_defterde = true,
            });
        }

        return Results.Json(new
        {
            id = katki.Id,
            durum = katki.Durum,
            kaynak_es = katki.KaynakEs,
            davetli_ad = katki.DavetliAd,
            // Bu dilek benim kuyrugumda mi (beklemede + benim tarafim)?
            benim_kuyrugumda = katki.Durum == "beklemede" && katki.KaynakEs == rol,
            etkinlik_id = katki.EtkinlikId,
            baska_defterde = false,
        });
    }

    private static async Task<IResult> AktifDenetim(HttpContext ctx, BiAniBirakDbContext db)
    {
        if (!KullaniciKimligi(ctx, out var kullaniciId))
            return Hata(401, "ERISIM_YOK", "Oturum bulunamadi.");
        var (ok, etkinlikId, _) = await AktifTenant(ctx, db, kullaniciId);
        if (!ok)
            return Hata(403, "ERISIM_YOK", "Aktif etkinlik yok veya uye degilsiniz.");

        // GIZLILIK SINIRI - IKINCI KATMAN (defense in depth).
        //
        // Yazma tarafinda SuperUclari her kaydi SistemEylemi=true ile yazar; burada
        // da OKUMA filtrelenir. Iki katman, cunku bu sizinti tek basina urunu
        // bitirebilir: cift kendi denetim sayfasinda "Sistem yoneticisi defterinizi
        // goruntuledi" satirini gorurse, en mahrem aile hatirasini emanet ettigi
        // guven geri donusu olmayacak sekilde kirilir.
        //
        // Kayitlar SILINMEZ - append-only adli iz korunur, super panelde gorunur.
        // Gizlenen sey iz degil, CIFTIN EKRANI.
        var kayitlar = await db.DenetimGunlukleri.AsNoTracking()
            .Where(d => d.EtkinlikId == etkinlikId && !d.SistemEylemi)
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

    // Katki yaniti - ESIN gordugu tam kayit.
    //
    // Es, kendi kuyrugundaki dilegi ONAYLARKEN neye onay verdigini TAM olarak
    // gormeli: metin, fotograf, iliski ve davetlinin iletisim bilgileri. Yarim
    // bilgiyle onay, kor onaydir.
    //
    // PII NOTU: telefon/e-posta YALNIZ etkinlik uyesi eslere doner (bu uclarin
    // hepsi RequireAuthorization + tenant + KaynakEs izolasyonu altinda). Davetli
    // hicbir sekilde baska bir davetlinin bilgisini goremez - onun ucu /api/k/{token}
    // ve orada boyle bir liste YOKTUR.
    private static object KatkiYaniti(Katki k)
        => new
        {
            id = k.Id,
            kaynak_es = k.KaynakEs,
            davetli_ad = k.DavetliAd,
            davetli_iliski = k.DavetliIliski,
            davetli_telefon = k.DavetliTelefon,
            davetli_email = k.DavetliEmail,
            mesaj = k.Mesaj,
            durum = k.Durum,
            created_at = k.CreatedAt,

            // Fotograf: deftere basilacak haliyle gosterilebilmesi icin olcu de gerekir
            foto_url = k.FotoAnahtari != null ? "/api/gorsel/" + k.FotoAnahtari : null,
            foto_genislik = k.FotoGenislik,
            foto_yukseklik = k.FotoYukseklik,
        };

    // Onay kuyrugu: YALNIZ oturumdaki esin rolune ait bekleyen katkilar (izolasyon).
    // Belge 04: WHERE EtkinlikId=@e AND KaynakEs=@rol AND Durum='beklemede'.
    // Bir es digerinin kuyrugunu ASLA cekemez (wedge - birlesim-oncesi izolasyon).
    //
    // INCELEME ROLU: "inceleme" hicbir KaynakEs ile eslesmez -> BOS liste. Bir esin
    // onaysiz kuyrugu, esinin bile goremedigi alandir; yoneticiye acmak sistemin en
    // sert kuralini ilk zorlandigi yerde bukmek olurdu.
    private static async Task<IResult> AktifKuyruk(HttpContext ctx, BiAniBirakDbContext db)
    {
        if (!KullaniciKimligi(ctx, out var kullaniciId))
            return Hata(401, "ERISIM_YOK", "Oturum bulunamadi.");
        var (ok, etkinlikId, rol) = await AktifTenant(ctx, db, kullaniciId);
        if (!ok)
            return Hata(403, "ERISIM_YOK", "Aktif etkinlik yok veya uye degilsiniz.");

        var kuyruk = await db.Katkilar.AsNoTracking()
            .Where(k => k.EtkinlikId == etkinlikId && k.KaynakEs == rol && k.Durum == "beklemede"
                        && !k.SilindiMi)
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
            .Where(k => k.EtkinlikId == etkinlikId && k.Durum == "onayli" && !k.SilindiMi)
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

        // YAZIM: inceleme rolu buradan gecemez (write-guard'a ek ikinci katman).
        if (TenantErisim.IncelemeMi(rol))
            return Hata(403, "GORUNTULEME_MODU", "Salt okunur inceleme oturumunda değişiklik yapılamaz.");

        // DONDURULMUS DEFTER SALT OKUNUR - moderasyon da bir yazimdir.
        if (await DondurmaGuard.DonduruldumuAsync(db, etkinlikId))
            return DondurmaGuard.Reddet();

        // Tenant + KaynakEs sahiplik: sadece kendi kuyrugundaki bekleyen katki.
        var katki = await db.Katkilar
            .FirstOrDefaultAsync(k => k.Id == katkiId && k.EtkinlikId == etkinlikId);
        if (katki == null)
            return Hata(404, "KATKI_BULUNAMADI", "Katki bulunamadi.");
        if (katki.KaynakEs != rol)
            return Hata(403, "ERISIM_YOK", "Bu dilek sizin onayınızı bekleyenler arasında değil.");
        if (katki.Durum != "beklemede")
            return Hata(409, "KATKI_ZATEN_ISLENMIS", "Bu katki zaten islenmis.");

        var simdi = DateTimeOffset.UtcNow;
        katki.Durum = yeniDurum;
        katki.OnaylayanKullaniciId = kullaniciId;
        katki.OnayZamani = simdi;
        katki.UpdatedAt = simdi;

        // RED = COP KUTUSUNA TASI (SuperUclari.KatkiKaldir + Notlar deseniyle birebir).
        // Cop = SilindiMi. 30 gun sayaci = SilinmeZamani. Geri al bunlari temizler.
        if (yeniDurum == "red")
        {
            katki.SilindiMi = true;
            katki.SilinmeZamani = simdi;
            katki.SilenKullaniciId = kullaniciId;
        }

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
                    url: $"/gelen-dilekler?focus={katki.Id}", etkinlikId: etkinlikId);
            }
        }

        return Results.Json(new { durum = yeniDurum });
    }
}
