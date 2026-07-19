using System.Security.Claims;
using System.Text.Json;
using BiAniBirak.Api.Data;
using BiAniBirak.Api.Entities;
using BiAniBirak.Api.Kimlik;
using BiAniBirak.Api.Modeller;
using BiAniBirak.Api.Servisler;
using Microsoft.EntityFrameworkCore;

namespace BiAniBirak.Api.Uclar;

// SUPER PANEL (planlama super-admin deseni, BiAniBirak'a uyarlanmis).
// TENANT = ETKINLIK (ani defteri). Super admin tum defterleri gorur/yonetir.
//
// GUVENLIK DISIPLINI:
//  - Her uc SuperAdminMi() ile korunur (JWT super_admin claim + DB dogrulamasi).
//  - Baska deftere giris SALT-OKUNUR (goruntuleme_modu JWT claim); yazma korumasi
//    Program.cs'teki global middleware'de (server-authoritative).
//  - Iki asamali silme: once cope at (SilindiMi), sonra kalici sil (teyit + aktif koruma).
//  - Son super admin kendini kaldiramaz (sistem kilitlenmesi onlenir).
//  - Her islem denetim_gunlukleri'ne (append-only adli iz).
public static class SuperUclari
{
    public static void SuperUclariniEkle(this WebApplication app)
    {
        // Sistem sagligi
        app.MapGet("/api/super/ozet", Ozet).RequireAuthorization();

        // Defterler
        app.MapGet("/api/super/defterler", Defterler).RequireAuthorization();
        app.MapPost("/api/super/defter/{id:guid}/goruntule", Goruntule).RequireAuthorization();
        app.MapPost("/api/super/goruntule/bitir", GoruntulemeBitir).RequireAuthorization();
        app.MapPost("/api/super/defter/{id:guid}/dondur", Dondur).RequireAuthorization();
        app.MapDelete("/api/super/defter/{id:guid}", DefterCopeAt).RequireAuthorization();
        app.MapPost("/api/super/defter/{id:guid}/geri-al", DefterGeriAl).RequireAuthorization();
        app.MapPost("/api/super/defter/{id:guid}/kalici-sil", DefterKaliciSil).RequireAuthorization();

        // Moderasyon (uygunsuz dilek kaldirma)
        app.MapDelete("/api/super/katki/{id:guid}", KatkiKaldir).RequireAuthorization();
        app.MapPost("/api/super/katki/{id:guid}/geri-al", KatkiGeriAl).RequireAuthorization();

        // Cop kutusu (silinen defterler + kaldirilan dilekler)
        app.MapGet("/api/super/cop", CopKutusu).RequireAuthorization();

        // Kullanicilar
        app.MapGet("/api/super/kullanicilar", Kullanicilar).RequireAuthorization();
        app.MapPost("/api/super/kullanici/{id:guid}/super-admin", SuperAdminAta).RequireAuthorization();
        app.MapPost("/api/super/kullanici/{id:guid}/askiya-al", KullaniciAskiyaAl).RequireAuthorization();
        app.MapPost("/api/super/kullanici/{id:guid}/sil", KullaniciSil).RequireAuthorization();

        // Canli akis (tum sistem denetim gunlugu)
        app.MapGet("/api/super/akis", CanliAkis).RequireAuthorization();

        // KVKK yonetimi
        app.MapGet("/api/super/kvkk/metinler", KvkkMetinler).RequireAuthorization();
        app.MapPut("/api/super/kvkk/metin/{anahtar}", KvkkMetinGuncelle).RequireAuthorization();
        app.MapGet("/api/super/kvkk/talepler", KvkkTalepler).RequireAuthorization();
        app.MapPost("/api/super/kvkk/talep/{id:guid}", KvkkTalepIsle).RequireAuthorization();
    }

    private static IResult Hata(int kod, string hataKodu, string mesaj)
        => Results.Json(new { hata = hataKodu, mesaj }, statusCode: kod);

    private static bool KullaniciKimligi(HttpContext ctx, out Guid id)
    {
        var ham = ctx.User.FindFirstValue(ClaimTypes.NameIdentifier)
                  ?? ctx.User.FindFirstValue("sub");
        return Guid.TryParse(ham, out id);
    }

    // Yetki: JWT claim + DB dogrulamasi (claim eskimis olabilir - defense in depth).
    private static async Task<(bool ok, Kullanici? kullanici)> SuperAdminMi(
        HttpContext ctx, BiAniBirakDbContext db)
    {
        if (!KullaniciKimligi(ctx, out var id)) return (false, null);
        var k = await db.Kullanicilar.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id);
        if (k == null || !k.SuperAdmin) return (false, null);
        return (true, k);
    }

    // DENETIM (super panel) - HER KAYIT SISTEM EYLEMIDIR.
    //
    // SistemEylemi = true SABITTIR, parametre DEGILDIR. Bilerek boyle:
    // parametre olsaydi bir gun biri unutur ve yonetici eylemi ciftin denetim
    // sayfasina duserdi. Bu dosyadan yazilan hicbir kayit ciftin ekraninda
    // GORUNEMEZ - dilin izin verdigi en sert garanti budur.
    //
    // Kayit yine de tutulur: yonetici sorumludur, iz silinmez, super panelde
    // ve Canli Akis'ta gorunur. Gizlenen sey ADLI IZ degil, ciftin EKRANI.
    private static async Task Denetim(
        BiAniBirakDbContext db, Guid? etkinlikId, Guid aktorId,
        string eylem, string varlik, Guid? varlikId, object? degisen = null)
    {
        db.DenetimGunlukleri.Add(new DenetimGunlugu
        {
            Id = Guid.NewGuid(),
            EtkinlikId = etkinlikId,
            KullaniciId = aktorId,
            Eylem = eylem,
            Varlik = varlik,
            VarlikId = varlikId,
            DegisenAlanlar = degisen == null ? null : JsonSerializer.Serialize(degisen),
            SistemEylemi = true,   // <- SABIT. Bu dosyadan yazilan her kayit gizlidir.
            CreatedAt = DateTimeOffset.UtcNow,
        });
        await db.SaveChangesAsync();
    }

    // ---------------- SISTEM SAGLIGI ----------------
    private static async Task<IResult> Ozet(HttpContext ctx, BiAniBirakDbContext db, DepolamaServisi depo)
    {
        var (ok, _) = await SuperAdminMi(ctx, db);
        if (!ok) return Hata(403, "ERISIM_YOK", "Bu alana yalnız sistem yöneticisi erişebilir.");

        var yediGunOnce = DateTimeOffset.UtcNow.AddDays(-7);

        var defterToplam = await db.Etkinlikler.CountAsync(e => !e.SilindiMi);
        var defterAktif = await db.Etkinlikler.CountAsync(e => !e.SilindiMi && e.Durum == "aktif");
        var defterDonduruldu = await db.Etkinlikler.CountAsync(e => !e.SilindiMi && e.Donduruldu);
        var defterCopte = await db.Etkinlikler.CountAsync(e => e.SilindiMi);
        var defterYeni = await db.Etkinlikler.CountAsync(e => !e.SilindiMi && e.CreatedAt >= yediGunOnce);

        var kullaniciToplam = await db.Kullanicilar.CountAsync(k => k.DeletedAt == null);
        var superAdminSayi = await db.Kullanicilar.CountAsync(k => k.SuperAdmin && k.DeletedAt == null);

        var dilekToplam = await db.Katkilar.CountAsync(k => !k.SilindiMi);
        var dilekBeklemede = await db.Katkilar.CountAsync(k => !k.SilindiMi && k.Durum == "beklemede");
        var dilekOnayli = await db.Katkilar.CountAsync(k => !k.SilindiMi && k.Durum == "onayli");
        var dilekRed = await db.Katkilar.CountAsync(k => !k.SilindiMi && k.Durum == "red");
        var dilekKaldirilan = await db.Katkilar.CountAsync(k => k.SilindiMi);
        var dilekYeni = await db.Katkilar.CountAsync(k => !k.SilindiMi && k.CreatedAt >= yediGunOnce);

        var kvkkBekleyen = await db.KvkkTalepleri.CountAsync(t => t.Durum == "yeni" || t.Durum == "islemde");

        // ---- SISTEM NABZI ----
        // Panele girer girmez "her sey yolunda mi?" sorusunun cevabi. Bu sayilarin
        // hepsi MUDAHALE GEREKTIREN durumlardir; suslu istatistik degildir.
        var simdiNabiz = DateTimeOffset.UtcNow;
        var imhaGecikmis = await db.Etkinlikler.CountAsync(e =>
            !e.ImhaEdildi && !e.SilindiMi &&
            e.KapanisTarihi.AddDays(Sabitler.SaklamaGun) <= simdiNabiz);
        var destekBekleyen = await db.DestekTalepleri.CountAsync(t => t.Durum == "acik");
        var odemeBekleyen = await db.Odemeler.CountAsync(o => o.Durum == "bekliyor");
        var imhaYakin = await db.Etkinlikler.CountAsync(e =>
            !e.ImhaEdildi && !e.SilindiMi &&
            e.KapanisTarihi.AddDays(Sabitler.SaklamaGun) > simdiNabiz &&
            e.KapanisTarihi.AddDays(Sabitler.SaklamaGun) <= simdiNabiz.AddDays(Sabitler.IndirmeGun));

        // Disk: medya kokunun bagli oldugu surucu. DiskGozcusu ile AYNI olcum -
        // iki farkli yerde iki farkli sayi gostermek guveni yikar.
        int diskYuzde = 0;
        string diskBos = "-";
        try
        {
            var yol = Path.GetFullPath(depo.Kok);
            DriveInfo? enIyi = null;
            foreach (var d in DriveInfo.GetDrives())
            {
                if (!d.IsReady) continue;
                if (!yol.StartsWith(d.RootDirectory.FullName, StringComparison.Ordinal)) continue;
                if (enIyi == null || d.RootDirectory.FullName.Length > enIyi.RootDirectory.FullName.Length)
                    enIyi = d;
            }
            if (enIyi != null)
            {
                diskYuzde = (int)Math.Round((enIyi.TotalSize - enIyi.AvailableFreeSpace) * 100.0 / enIyi.TotalSize);
                var bos = enIyi.AvailableFreeSpace / 1024.0 / 1024.0 / 1024.0;
                diskBos = $"{Math.Round(bos, 1)} GB";
            }
        }
        catch { /* olculemezse nabizda "-" gorunur, panel yine calisir */ }

        return Results.Json(new
        {
            nabiz = new
            {
                disk_yuzde = diskYuzde,
                disk_bos = diskBos,
                imha_gecikmis = imhaGecikmis,
                imha_yakin = imhaYakin,
                destek_bekleyen = destekBekleyen,
                odeme_bekleyen = odemeBekleyen,
                kvkk_bekleyen = kvkkBekleyen,
                dilek_beklemede = dilekBeklemede,
            },
            defter = new
            {
                toplam = defterToplam,
                aktif = defterAktif,
                donduruldu = defterDonduruldu,
                copte = defterCopte,
                yeni_7gun = defterYeni,
            },
            kullanici = new { toplam = kullaniciToplam, super_admin = superAdminSayi },
            dilek = new
            {
                toplam = dilekToplam,
                beklemede = dilekBeklemede,
                onayli = dilekOnayli,
                red = dilekRed,
                kaldirilan = dilekKaldirilan,
                yeni_7gun = dilekYeni,
            },
            kvkk = new { bekleyen_talep = kvkkBekleyen },
        });
    }

    // ---------------- DEFTERLER ----------------
    private static async Task<IResult> Defterler(
        HttpContext ctx, BiAniBirakDbContext db, string? ara, string? durum, bool cop = false)
    {
        var (ok, _) = await SuperAdminMi(ctx, db);
        if (!ok) return Hata(403, "ERISIM_YOK", "Bu alana yalnız sistem yöneticisi erişebilir.");

        var sorgu = db.Etkinlikler.AsNoTracking().Where(e => e.SilindiMi == cop);

        if (!string.IsNullOrWhiteSpace(ara))
        {
            var a = ara.Trim().ToLower();
            sorgu = sorgu.Where(e => e.Es1Ad.ToLower().Contains(a) || e.Es2Ad.ToLower().Contains(a));
        }
        if (!string.IsNullOrWhiteSpace(durum))
            sorgu = sorgu.Where(e => e.Durum == durum);

        var defterler = await sorgu.OrderByDescending(e => e.CreatedAt).Take(200).ToListAsync();
        var idler = defterler.Select(e => e.Id).ToList();

        // Uyeler: ad + rol (tek sorgu - N+1 yok). Defter kartinda kimler oldugu gorunur.
        var uyeKayitlari = await db.EtkinlikUyelikleri.AsNoTracking()
            .Where(u => idler.Contains(u.EtkinlikId))
            .Join(db.Kullanicilar, u => u.KullaniciId, k => k.Id,
                (u, k) => new { u.EtkinlikId, u.Rol, k.Ad, k.Email, u.CreatedAt })
            .ToListAsync();

        var dilekSayilari = await db.Katkilar.AsNoTracking()
            .Where(k => idler.Contains(k.EtkinlikId) && !k.SilindiMi)
            .GroupBy(k => k.EtkinlikId)
            .Select(g => new
            {
                g.Key,
                Toplam = g.Count(),
                Beklemede = g.Count(x => x.Durum == "beklemede"),
            })
            .ToDictionaryAsync(x => x.Key, x => new { x.Toplam, x.Beklemede });

        // Aktif paylasim baglantisi olan defterler (saglik skorunun en kritik ceyregi:
        // link paylasilmadan defter DOLAMAZ).
        var linkliSet = (await db.PaylasimBaglantilari.AsNoTracking()
            .Where(p => idler.Contains(p.EtkinlikId) && p.Aktif)
            .Select(p => p.EtkinlikId)
            .Distinct()
            .ToListAsync())
            .ToHashSet();

        // Hareketsizlik: son 30 gunde denetim kaydi yok mu?
        var otuzGunOnce = DateTimeOffset.UtcNow.AddDays(-30);
        // !SistemEylemi ZORUNLU: yoneticinin kendi islemi (goruntuleme, rontgen)
        // ciftin AKTIFLIGI DEGILDIR. Filtre olmasaydi, bir deftere bakmak onu
        // "hareketli" gosterir ve saglik skoru YALAN soylerdi - teshis araci
        // kendi olcumunu bozardi.
        var hareketli = await db.DenetimGunlukleri.AsNoTracking()
            .Where(d => d.EtkinlikId != null && idler.Contains(d.EtkinlikId!.Value)
                        && !d.SistemEylemi
                        && d.CreatedAt >= otuzGunOnce)
            .Select(d => d.EtkinlikId!.Value)
            .Distinct()
            .ToListAsync();

        return Results.Json(defterler.Select(e => new
        {
            id = e.Id,
            es1_ad = e.Es1Ad,
            es2_ad = e.Es2Ad,
            tur = e.Tur,
            etkinlik_tarihi = e.EtkinlikTarihi,
            durum = e.Durum,
            donduruldu = e.Donduruldu,
            silindi_mi = e.SilindiMi,
            silinme_zamani = e.SilinmeZamani,
            created_at = e.CreatedAt,
            uyeler = uyeKayitlari
                .Where(u => u.EtkinlikId == e.Id)
                .OrderBy(u => u.Rol)
                .Select(u => new { ad = u.Ad, email = u.Email, rol = u.Rol, katildi = u.CreatedAt }),
            uye_sayisi = uyeKayitlari.Count(u => u.EtkinlikId == e.Id),
            // Yetim defter: hic uyesi kalmamis (ornegin tek uye silinmis) - mudahale gerekir.
            yetim = !uyeKayitlari.Any(u => u.EtkinlikId == e.Id),
            dilek_sayisi = dilekSayilari.TryGetValue(e.Id, out var ds) ? ds.Toplam : 0,
            bekleyen_dilek = dilekSayilari.TryGetValue(e.Id, out var ds2) ? ds2.Beklemede : 0,
            hareketsiz = !hareketli.Contains(e.Id) && e.CreatedAt < otuzGunOnce,

            // SAGLIK SKORU - 4 ceyrek x 25 puan (Planlama Defteri deseni, urune uyarlandi):
            //   kurulum : es adlari + tarih dolu mu?
            //   link    : aktif paylasim baglantisi var mi?  <- en kritik esik
            //   katki   : en az bir dilek geldi mi?          <- deger kaniti
            //   aktif   : son 30 gunde hareket var mi?
            // Yonetici, LISTEDEN batan defteri gorur; detaya inmesi gerekmez.
            saglik =
                (!string.IsNullOrWhiteSpace(e.Es1Ad) && !string.IsNullOrWhiteSpace(e.Es2Ad) ? 25 : 0)
                + (linkliSet.Contains(e.Id) ? 25 : 0)
                + ((dilekSayilari.TryGetValue(e.Id, out var ds3) ? ds3.Toplam : 0) > 0 ? 25 : 0)
                + (hareketli.Contains(e.Id) ? 25 : 0),
        }));
    }

    // GORUNTULE (impersonation): gecici JWT, hedef defter aktif, SALT-OKUNUR (1 saat).
    // Super admin o deftere ZATEN UYE ise normal yetkiyle girer (goruntuleme modu KAPALI).
    private static async Task<IResult> Goruntule(
        Guid id, HttpContext ctx, BiAniBirakDbContext db, JwtServisi jwt, HttpResponse yanit)
    {
        var (ok, kullanici) = await SuperAdminMi(ctx, db);
        if (!ok || kullanici == null)
            return Hata(403, "ERISIM_YOK", "Bu alana yalnız sistem yöneticisi erişebilir.");

        var defter = await db.Etkinlikler.AsNoTracking()
            .FirstOrDefaultAsync(e => e.Id == id && !e.SilindiMi);
        if (defter == null)
            return Hata(404, "ETKINLIK_BULUNAMADI", "Defter bulunamadı.");

        // Zaten uye mi? -> normal yetki (kendi defteri gibi yazabilir)
        var uyeMi = await db.EtkinlikUyelikleri.AsNoTracking()
            .AnyAsync(u => u.EtkinlikId == id && u.KullaniciId == kullanici.Id);

        var token = uyeMi
            ? jwt.Uret(kullanici, id) // uye: normal, goruntuleme_modu=false
            : jwt.Uret(kullanici, id, goruntulemeModu: true, sureSaat: 1); // salt-okunur, 1 saat

        CerezYardimcisi.Yaz(yanit, token, jwt.GecerlilikGun);

        await Denetim(db, id, kullanici.Id, "DEFTER_GORUNTULEME_BASLADI", "etkinlikler", id,
            new { uye_mi = uyeMi, goruntuleme_modu = !uyeMi });

        return Results.Json(new
        {
            ok = true,
            goruntuleme_modu = !uyeMi,
            defter = new { id = defter.Id, es1_ad = defter.Es1Ad, es2_ad = defter.Es2Ad },
            gecerlilik_bitis = uyeMi ? (DateTimeOffset?)null : DateTimeOffset.UtcNow.AddHours(1),
        });
    }

    // Goruntulemeyi bitir: normal JWT'ye don (aktif etkinlik claim'i temizlenir).
    private static async Task<IResult> GoruntulemeBitir(
        HttpContext ctx, BiAniBirakDbContext db, JwtServisi jwt, HttpResponse yanit)
    {
        var (ok, kullanici) = await SuperAdminMi(ctx, db);
        if (!ok || kullanici == null)
            return Hata(403, "ERISIM_YOK", "Bu alana yalnız sistem yöneticisi erişebilir.");

        // Kendi uyeliklerinden birine don (varsa); yoksa tenant'siz JWT
        var kendiUyelik = await db.EtkinlikUyelikleri.AsNoTracking()
            .FirstOrDefaultAsync(u => u.KullaniciId == kullanici.Id);

        var token = jwt.Uret(kullanici, kendiUyelik?.EtkinlikId);
        CerezYardimcisi.Yaz(yanit, token, jwt.GecerlilikGun);

        await Denetim(db, null, kullanici.Id, "DEFTER_GORUNTULEME_BITTI", "sistem", null);

        return Results.Json(new { ok = true, aktif_etkinlik_id = kendiUyelik?.EtkinlikId });
    }

    // DONDUR / COZ - dondurulmus defter SALT OKUNURDUR (bkz. DondurmaGuard):
    // cift gorebilir ama hicbir yazim yapamaz ve BASKI NUSHASINI INDIREMEZ; davetli
    // yazimlari zaten kapalidir.
    //
    // CIFTE HABER VERILIR: sessiz dondurma, kullanicinin "uygulama bozuldu" sanmasina
    // yol acar; destek yuku ve guven kaybi uretir. Neyin neden olduguni SOYLERIZ.
    private static async Task<IResult> Dondur(
        Guid id, HttpContext ctx, BiAniBirakDbContext db, PushGonderici push)
    {
        var (ok, kullanici) = await SuperAdminMi(ctx, db);
        if (!ok || kullanici == null)
            return Hata(403, "ERISIM_YOK", "Bu alana yalnız sistem yöneticisi erişebilir.");

        var defter = await db.Etkinlikler.FirstOrDefaultAsync(e => e.Id == id && !e.SilindiMi);
        if (defter == null)
            return Hata(404, "ETKINLIK_BULUNAMADI", "Defter bulunamadı.");

        defter.Donduruldu = !defter.Donduruldu;
        await db.SaveChangesAsync();

        await Denetim(db, id, kullanici.Id,
            defter.Donduruldu ? "DEFTER_DONDURULDU" : "DEFTER_COZULDU",
            "etkinlikler", id, new { donduruldu = defter.Donduruldu });

        // Her iki ese de bildir - defter ortaktir.
        var uyeler = await db.EtkinlikUyelikleri.AsNoTracking()
            .Where(u => u.EtkinlikId == id).Select(u => u.KullaniciId).ToListAsync();

        var baslik = defter.Donduruldu
            ? "Defteriniz geçici olarak donduruldu"
            : "Defteriniz yeniden açıldı";
        var govde = defter.Donduruldu
            ? "Anı defteriniz geçici olarak donduruldu. Bu süre boyunca defteriniz "
              + "görüntülenebilir ancak değişiklik yapılamaz, yeni dilek alınamaz ve "
              + "baskıya hazır nüsha indirilemez. Sebebini öğrenmek ve çözmek için "
              + "bizimle iletişime geçin."
            : "Anı defteriniz yeniden açıldı. Dilek toplama, düzenleme ve indirme "
              + "işlemlerinize kaldığınız yerden devam edebilirsiniz.";
        var pushKisa = defter.Donduruldu
            ? "Defteriniz geçici olarak donduruldu - değişiklik ve indirme kapalı."
            : "Defteriniz yeniden açıldı - kaldığınız yerden devam edebilirsiniz.";

        foreach (var kid in uyeler)
        {
            await push.GonderAsync(kid, baslik, govde, "/gelen-dilekler", id,
                sessizSaateTabi: false, pushGovde: pushKisa);
        }

        return Results.Json(new { ok = true, donduruldu = defter.Donduruldu });
    }

    // Cope at (soft delete - geri alinabilir)
    private static async Task<IResult> DefterCopeAt(Guid id, HttpContext ctx, BiAniBirakDbContext db)
    {
        var (ok, kullanici) = await SuperAdminMi(ctx, db);
        if (!ok || kullanici == null)
            return Hata(403, "ERISIM_YOK", "Bu alana yalnız sistem yöneticisi erişebilir.");

        var defter = await db.Etkinlikler.FirstOrDefaultAsync(e => e.Id == id && !e.SilindiMi);
        if (defter == null)
            return Hata(404, "ETKINLIK_BULUNAMADI", "Defter bulunamadı.");

        defter.SilindiMi = true;
        defter.SilinmeZamani = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync();

        await Denetim(db, id, kullanici.Id, "DEFTER_COPE_ATILDI", "etkinlikler", id,
            new { es1 = defter.Es1Ad, es2 = defter.Es2Ad });

        return Results.Json(new { ok = true });
    }

    private static async Task<IResult> DefterGeriAl(Guid id, HttpContext ctx, BiAniBirakDbContext db)
    {
        var (ok, kullanici) = await SuperAdminMi(ctx, db);
        if (!ok || kullanici == null)
            return Hata(403, "ERISIM_YOK", "Bu alana yalnız sistem yöneticisi erişebilir.");

        var defter = await db.Etkinlikler.FirstOrDefaultAsync(e => e.Id == id && e.SilindiMi);
        if (defter == null)
            return Hata(404, "ETKINLIK_BULUNAMADI", "Çöp kutusunda böyle bir defter yok.");

        defter.SilindiMi = false;
        defter.SilinmeZamani = null;
        await db.SaveChangesAsync();

        await Denetim(db, id, kullanici.Id, "DEFTER_GERI_ALINDI", "etkinlikler", id);
        return Results.Json(new { ok = true });
    }

    // KALICI SIL - geri alinamaz. Uc katmanli kaza korumasi (planlama deseni):
    //  - Once cope atilmis olmali
    //  - Cift adi teyidi ("Ayse & Musa" birebir yazilmali)
    //  - Super admin kendi AKTIF defterini kalici silemez (oturum bozulmasin)
    private static async Task<IResult> DefterKaliciSil(
        Guid id, KaliciSilIstek istek, HttpContext ctx, BiAniBirakDbContext db)
    {
        var (ok, kullanici) = await SuperAdminMi(ctx, db);
        if (!ok || kullanici == null)
            return Hata(403, "ERISIM_YOK", "Bu alana yalnız sistem yöneticisi erişebilir.");

        var defter = await db.Etkinlikler.FirstOrDefaultAsync(e => e.Id == id);
        if (defter == null)
            return Hata(404, "ETKINLIK_BULUNAMADI", "Defter bulunamadı.");

        // Koruma - once cope atilmali
        if (!defter.SilindiMi)
            return Hata(400, "ONCE_COPE_AT", "Kalıcı silmeden önce defter çöp kutusuna atılmalı.");

        // Koruma - cift adi teyidi
        var beklenen = $"{defter.Es1Ad} & {defter.Es2Ad}";
        if (!string.Equals(istek.Teyit?.Trim(), beklenen, StringComparison.Ordinal))
            return Hata(400, "TEYIT_ESLESMEDI",
                $"Teyit eşleşmedi. Silmek için tam olarak şunu yaz: {beklenen}");

        // Koruma - kendi aktif defteri degil
        var aktifClaim = ctx.User.FindFirstValue("aktif_etkinlik_id");
        if (Guid.TryParse(aktifClaim, out var aktifId) && aktifId == id)
            return Hata(400, "AKTIF_DEFTER_SILINEMEZ",
                "Şu an açık olan defteri kalıcı silemezsin. Önce başka bir deftere geç.");

        // Iliskili kayitlari sil (FK model seviyesinde - manuel temizlik)
        var katkiIdler = await db.Katkilar.Where(k => k.EtkinlikId == id).Select(k => k.Id).ToListAsync();
        db.KatkiMedyalari.RemoveRange(db.KatkiMedyalari.Where(m => katkiIdler.Contains(m.KatkiId)));
        db.Katkilar.RemoveRange(db.Katkilar.Where(k => k.EtkinlikId == id));
        db.PaylasimBaglantilari.RemoveRange(db.PaylasimBaglantilari.Where(p => p.EtkinlikId == id));
        db.EtkinlikAyarlari.RemoveRange(db.EtkinlikAyarlari.Where(a => a.EtkinlikId == id));
        db.UyeDavetleri.RemoveRange(db.UyeDavetleri.Where(d => d.EtkinlikId == id));
        db.EtkinlikUyelikleri.RemoveRange(db.EtkinlikUyelikleri.Where(u => u.EtkinlikId == id));
        db.Bildirimler.RemoveRange(db.Bildirimler.Where(b => b.EtkinlikId == id));
        db.ErtelenenBildirimler.RemoveRange(db.ErtelenenBildirimler.Where(b => b.EtkinlikId == id));

        var adlar = $"{defter.Es1Ad} & {defter.Es2Ad}";
        db.Etkinlikler.Remove(defter);

        // Denetim kaydi KALIR (adli iz) ama EtkinlikId'si null'a duser
        var denetimler = await db.DenetimGunlukleri.Where(d => d.EtkinlikId == id).ToListAsync();
        foreach (var d in denetimler) d.EtkinlikId = null;

        await db.SaveChangesAsync(); // atomik

        await Denetim(db, null, kullanici.Id, "DEFTER_KALICI_SILINDI", "etkinlikler", id,
            new { defter = adlar });

        return Results.Json(new { ok = true });
    }

    // ---------------- MODERASYON ----------------
    // Uygunsuz dilek kaldirma (Belge 08: raporla/kaldir). Cop kutusuna duser.
    private static async Task<IResult> KatkiKaldir(Guid id, HttpContext ctx, BiAniBirakDbContext db)
    {
        var (ok, kullanici) = await SuperAdminMi(ctx, db);
        if (!ok || kullanici == null)
            return Hata(403, "ERISIM_YOK", "Bu alana yalnız sistem yöneticisi erişebilir.");

        var katki = await db.Katkilar.FirstOrDefaultAsync(k => k.Id == id && !k.SilindiMi);
        if (katki == null)
            return Hata(404, "KATKI_BULUNAMADI", "Dilek bulunamadı.");

        katki.SilindiMi = true;
        katki.SilinmeZamani = DateTimeOffset.UtcNow;
        katki.SilenKullaniciId = kullanici.Id;
        await db.SaveChangesAsync();

        await Denetim(db, katki.EtkinlikId, kullanici.Id, "DILEK_MODERASYONLA_KALDIRILDI",
            "katkilar", id, new { davetli = katki.DavetliAd });

        return Results.Json(new { ok = true });
    }

    private static async Task<IResult> KatkiGeriAl(Guid id, HttpContext ctx, BiAniBirakDbContext db)
    {
        var (ok, kullanici) = await SuperAdminMi(ctx, db);
        if (!ok || kullanici == null)
            return Hata(403, "ERISIM_YOK", "Bu alana yalnız sistem yöneticisi erişebilir.");

        var katki = await db.Katkilar.FirstOrDefaultAsync(k => k.Id == id && k.SilindiMi);
        if (katki == null)
            return Hata(404, "KATKI_BULUNAMADI", "Çöp kutusunda böyle bir dilek yok.");

        katki.SilindiMi = false;
        katki.SilinmeZamani = null;
        katki.SilenKullaniciId = null;
        await db.SaveChangesAsync();

        await Denetim(db, katki.EtkinlikId, kullanici.Id, "DILEK_GERI_ALINDI", "katkilar", id);
        return Results.Json(new { ok = true });
    }

    // ---------------- COP KUTUSU ----------------
    private static async Task<IResult> CopKutusu(HttpContext ctx, BiAniBirakDbContext db)
    {
        var (ok, _) = await SuperAdminMi(ctx, db);
        if (!ok) return Hata(403, "ERISIM_YOK", "Bu alana yalnız sistem yöneticisi erişebilir.");

        var defterler = await db.Etkinlikler.AsNoTracking()
            .Where(e => e.SilindiMi)
            .OrderByDescending(e => e.SilinmeZamani)
            .Select(e => new
            {
                id = e.Id,
                es1_ad = e.Es1Ad,
                es2_ad = e.Es2Ad,
                tur = e.Tur,
                silinme_zamani = e.SilinmeZamani,
            })
            .ToListAsync();

        var dilekler = await db.Katkilar.AsNoTracking()
            .Where(k => k.SilindiMi)
            .OrderByDescending(k => k.SilinmeZamani)
            .Take(100)
            .Select(k => new
            {
                id = k.Id,
                etkinlik_id = k.EtkinlikId,
                davetli_ad = k.DavetliAd,
                mesaj = k.Mesaj,
                silinme_zamani = k.SilinmeZamani,
            })
            .ToListAsync();

        return Results.Json(new { defterler, dilekler });
    }

    // ---------------- KULLANICILAR ----------------
    private static async Task<IResult> Kullanicilar(
        HttpContext ctx, BiAniBirakDbContext db, string? ara)
    {
        var (ok, _) = await SuperAdminMi(ctx, db);
        if (!ok) return Hata(403, "ERISIM_YOK", "Bu alana yalnız sistem yöneticisi erişebilir.");

        // Askidakiler de listelenir (geri acilabilsinler) - "askida" bayragiyla isaretlenir.
        var sorgu = db.Kullanicilar.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(ara))
        {
            var a = ara.Trim().ToLower();
            sorgu = sorgu.Where(k => k.Email.ToLower().Contains(a) || k.Ad.ToLower().Contains(a));
        }

        var kullanicilar = await sorgu.OrderByDescending(k => k.CreatedAt).Take(200).ToListAsync();
        var idler = kullanicilar.Select(k => k.Id).ToList();

        var uyelikler = await db.EtkinlikUyelikleri.AsNoTracking()
            .Where(u => idler.Contains(u.KullaniciId))
            .Join(db.Etkinlikler.Where(e => !e.SilindiMi), u => u.EtkinlikId, e => e.Id,
                (u, e) => new { u.KullaniciId, u.Rol, e.Es1Ad, e.Es2Ad })
            .ToListAsync();

        return Results.Json(kullanicilar.Select(k => new
        {
            id = k.Id,
            ad = k.Ad,
            email = k.Email,
            super_admin = k.SuperAdmin,
            askida = k.DeletedAt != null,
            created_at = k.CreatedAt,
            defterler = uyelikler
                .Where(u => u.KullaniciId == k.Id)
                .Select(u => new { defter = $"{u.Es1Ad} & {u.Es2Ad}", rol = u.Rol }),
        }));
    }

    // Super admin ata/kaldir. KORUMA: son super admin kendini kaldiramaz.
    private static async Task<IResult> SuperAdminAta(
        Guid id, SuperAdminAtaIstek istek, HttpContext ctx, BiAniBirakDbContext db)
    {
        var (ok, aktor) = await SuperAdminMi(ctx, db);
        if (!ok || aktor == null)
            return Hata(403, "ERISIM_YOK", "Bu alana yalnız sistem yöneticisi erişebilir.");

        var hedef = await db.Kullanicilar.FirstOrDefaultAsync(k => k.Id == id && k.DeletedAt == null);
        if (hedef == null)
            return Hata(404, "KULLANICI_BULUNAMADI", "Kullanıcı bulunamadı.");

        // KORUMA: yetkiyi kaldiriyorsa ve bu SON super admin ise reddet (sistem kilitlenir).
        if (!istek.SuperAdmin && hedef.SuperAdmin)
        {
            var superSayi = await db.Kullanicilar.CountAsync(k => k.SuperAdmin && k.DeletedAt == null);
            if (superSayi <= 1)
                return Hata(400, "SON_SUPER_ADMIN",
                    "Sistemdeki son yöneticinin yetkisi kaldırılamaz.");
        }

        hedef.SuperAdmin = istek.SuperAdmin;
        await db.SaveChangesAsync();

        await Denetim(db, null, aktor.Id,
            istek.SuperAdmin ? "SUPER_ADMIN_ATANDI" : "SUPER_ADMIN_KALDIRILDI",
            "kullanicilar", id, new { hedef = hedef.Email });

        return Results.Json(new { ok = true, super_admin = hedef.SuperAdmin });
    }

    // Askiya al / geri ac (soft delete - DeletedAt). Giris yapamaz, verisi durur, geri alinabilir.
    // KVKK "silme talebi" akisiyla uyumlu: once askiya al, yasal sure sonunda kalici sil.
    private static async Task<IResult> KullaniciAskiyaAl(
        Guid id, HttpContext ctx, BiAniBirakDbContext db)
    {
        var (ok, aktor) = await SuperAdminMi(ctx, db);
        if (!ok || aktor == null)
            return Hata(403, "ERISIM_YOK", "Bu alana yalnız sistem yöneticisi erişebilir.");

        if (id == aktor.Id)
            return Hata(400, "KENDINI_ASKIYA_ALAMAZ", "Kendi hesabını askıya alamazsın.");

        var hedef = await db.Kullanicilar.FirstOrDefaultAsync(k => k.Id == id);
        if (hedef == null)
            return Hata(404, "KULLANICI_BULUNAMADI", "Kullanıcı bulunamadı.");

        var askidaydi = hedef.DeletedAt != null;
        hedef.DeletedAt = askidaydi ? null : DateTimeOffset.UtcNow;
        await db.SaveChangesAsync();

        await Denetim(db, null, aktor.Id,
            askidaydi ? "KULLANICI_GERI_ACILDI" : "KULLANICI_ASKIYA_ALINDI",
            "kullanicilar", id, new { hedef = hedef.Email });

        return Results.Json(new { ok = true, askida = !askidaydi });
    }

    // KALICI SIL - geri alinamaz. Korumalar:
    //  - Kendini silemez
    //  - Son super admin silinemez
    //  - E-posta teyidi (yanlis kullanici silme korumasi)
    // Denetim izi KORUNUR (KullaniciId null'a duser - adli iz kaybolmaz).
    private static async Task<IResult> KullaniciSil(
        Guid id, KullaniciSilIstek istek, HttpContext ctx, BiAniBirakDbContext db)
    {
        var (ok, aktor) = await SuperAdminMi(ctx, db);
        if (!ok || aktor == null)
            return Hata(403, "ERISIM_YOK", "Bu alana yalnız sistem yöneticisi erişebilir.");

        if (id == aktor.Id)
            return Hata(400, "KENDINI_SILEMEZ", "Kendi hesabını silemezsin.");

        var hedef = await db.Kullanicilar.FirstOrDefaultAsync(k => k.Id == id);
        if (hedef == null)
            return Hata(404, "KULLANICI_BULUNAMADI", "Kullanıcı bulunamadı.");

        // Koruma - e-posta teyidi
        if (!string.Equals(istek.Teyit?.Trim(), hedef.Email, StringComparison.OrdinalIgnoreCase))
            return Hata(400, "TEYIT_ESLESMEDI",
                $"Teyit eşleşmedi. Silmek için tam olarak şunu yaz: {hedef.Email}");

        // Koruma - son super admin
        if (hedef.SuperAdmin)
        {
            var superSayi = await db.Kullanicilar.CountAsync(k => k.SuperAdmin && k.DeletedAt == null);
            if (superSayi <= 1)
                return Hata(400, "SON_SUPER_ADMIN", "Sistemdeki son yöneticinin hesabı silinemez.");
        }

        var email = hedef.Email;

        // Bagimli kayitlar (FK model seviyesinde - manuel temizlik)
        db.Bildirimler.RemoveRange(db.Bildirimler.Where(b => b.KullaniciId == id));
        db.ErtelenenBildirimler.RemoveRange(db.ErtelenenBildirimler.Where(b => b.KullaniciId == id));
        db.Cihazlar.RemoveRange(db.Cihazlar.Where(c => c.KullaniciId == id));
        db.EtkinlikUyelikleri.RemoveRange(db.EtkinlikUyelikleri.Where(u => u.KullaniciId == id));

        // Denetim izi KORUNUR - yalniz aktor bagi kopar (adli iz kaybolmaz)
        var denetimler = await db.DenetimGunlukleri.Where(d => d.KullaniciId == id).ToListAsync();
        foreach (var d in denetimler) d.KullaniciId = null;

        db.Kullanicilar.Remove(hedef);
        await db.SaveChangesAsync(); // atomik

        await Denetim(db, null, aktor.Id, "KULLANICI_SILINDI", "kullanicilar", id, new { email });

        return Results.Json(new { ok = true });
    }

    // ---------------- CANLI AKIS ----------------
    // Tum sistem denetim gunlugu (tenant filtresiz - super admin gorusu).
    private static async Task<IResult> CanliAkis(
        HttpContext ctx, BiAniBirakDbContext db, int? limit)
    {
        var (ok, _) = await SuperAdminMi(ctx, db);
        if (!ok) return Hata(403, "ERISIM_YOK", "Bu alana yalnız sistem yöneticisi erişebilir.");

        var n = Math.Clamp(limit ?? 50, 1, 200);

        var kayitlar = await db.DenetimGunlukleri.AsNoTracking()
            .OrderByDescending(d => d.CreatedAt)
            .Take(n)
            .ToListAsync();

        var kullaniciIdler = kayitlar.Where(d => d.KullaniciId != null)
            .Select(d => d.KullaniciId!.Value).Distinct().ToList();
        var etkinlikIdler = kayitlar.Where(d => d.EtkinlikId != null)
            .Select(d => d.EtkinlikId!.Value).Distinct().ToList();

        var kullanicilar = await db.Kullanicilar.AsNoTracking()
            .Where(k => kullaniciIdler.Contains(k.Id))
            .ToDictionaryAsync(k => k.Id, k => k.Ad);
        var etkinlikler = await db.Etkinlikler.AsNoTracking()
            .Where(e => etkinlikIdler.Contains(e.Id))
            .ToDictionaryAsync(e => e.Id, e => $"{e.Es1Ad} & {e.Es2Ad}");

        return Results.Json(kayitlar.Select(d => new
        {
            id = d.Id,
            eylem = d.Eylem,
            varlik = d.Varlik,
            aktor = d.KullaniciId != null && kullanicilar.TryGetValue(d.KullaniciId.Value, out var ad)
                ? ad : "Sistem",
            defter = d.EtkinlikId != null && etkinlikler.TryGetValue(d.EtkinlikId.Value, out var e)
                ? e : null,
            degisen_alanlar = d.DegisenAlanlar,
            created_at = d.CreatedAt,
        }));
    }

    // ---------------- KVKK YONETIMI ----------------
    private static async Task<IResult> KvkkMetinler(HttpContext ctx, BiAniBirakDbContext db)
    {
        var (ok, _) = await SuperAdminMi(ctx, db);
        if (!ok) return Hata(403, "ERISIM_YOK", "Bu alana yalnız sistem yöneticisi erişebilir.");

        var metinler = await db.SistemMetinleri.AsNoTracking()
            .OrderBy(m => m.Anahtar)
            .Select(m => new
            {
                anahtar = m.Anahtar,
                baslik = m.Baslik,
                icerik = m.Icerik,
                yururluk_tarihi = m.YururlukTarihi,
                updated_at = m.UpdatedAt,
            })
            .ToListAsync();

        return Results.Json(metinler);
    }

    private static async Task<IResult> KvkkMetinGuncelle(
        string anahtar, SistemMetniGuncelleIstek istek, HttpContext ctx, BiAniBirakDbContext db)
    {
        var (ok, kullanici) = await SuperAdminMi(ctx, db);
        if (!ok || kullanici == null)
            return Hata(403, "ERISIM_YOK", "Bu alana yalnız sistem yöneticisi erişebilir.");

        var simdi = DateTimeOffset.UtcNow;
        var metin = await db.SistemMetinleri.FirstOrDefaultAsync(m => m.Anahtar == anahtar);

        if (metin == null)
        {
            metin = new SistemMetni
            {
                Id = Guid.NewGuid(),
                Anahtar = anahtar,
                Baslik = istek.Baslik ?? anahtar,
                Icerik = istek.Icerik ?? string.Empty,
                YururlukTarihi = simdi,
                GuncelleyenKullaniciId = kullanici.Id,
                CreatedAt = simdi,
                UpdatedAt = simdi,
            };
            db.SistemMetinleri.Add(metin);
        }
        else
        {
            // ONCE FOTOGRAF: eski surumun anlik goruntusu. Degisiklikten sonra eski
            // icerige ulasmanin yolu YOKTUR - EF nesneyi yerinde degistirir.
            var eski = OnayServisi.AnlikAl(metin);

            if (istek.Baslik != null) metin.Baslik = istek.Baslik.Trim();
            if (istek.Icerik != null) metin.Icerik = istek.Icerik;
            if (istek.YururlukTarihi.HasValue) metin.YururlukTarihi = istek.YururlukTarihi.Value;
            metin.GuncelleyenKullaniciId = kullanici.Id;
            metin.UpdatedAt = simdi;

            // ARSIVLE + DAMGALA - kanit zincirinin can damari.
            //
            // Arsiv olmadan hash ANLAMSIZDIR: kullanicinin onayladigi hash'in hangi
            // metne karsilik geldigini gosteremezsek, "bir metni onayladi" demekten
            // oteye gecemeyiz. Eski surum arsivlenir; hash'ten metne kopru kurulur.
            //
            // Damga unutulsaydi: metin degisir ama hash eski kalirdi - kullanicinin
            // GORMEDIGI metni "onayladiniz" diye gosterirdik. Mahkemede aleyhimize
            // donen bir sahtelik.
            OnayServisi.ArsivleVeDamgala(db, metin, eski, kullanici.Id);
        }

        await db.SaveChangesAsync();
        await Denetim(db, null, kullanici.Id, "KVKK_METNI_GUNCELLENDI", "sistem_metinleri",
            metin.Id, new { anahtar });

        return Results.Json(new { ok = true });
    }

    private static async Task<IResult> KvkkTalepler(
        HttpContext ctx, BiAniBirakDbContext db, string? durum)
    {
        var (ok, _) = await SuperAdminMi(ctx, db);
        if (!ok) return Hata(403, "ERISIM_YOK", "Bu alana yalnız sistem yöneticisi erişebilir.");

        var sorgu = db.KvkkTalepleri.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(durum))
            sorgu = sorgu.Where(t => t.Durum == durum);

        var talepler = await sorgu
            .OrderBy(t => t.Durum == "yeni" ? 0 : 1)
            .ThenBy(t => t.SonYanitTarihi)
            .Take(200)
            .Select(t => new
            {
                id = t.Id,
                email = t.Email,
                tip = t.Tip,
                aciklama = t.Aciklama,
                durum = t.Durum,
                sonuc_notu = t.SonucNotu,
                son_yanit_tarihi = t.SonYanitTarihi,
                created_at = t.CreatedAt,
            })
            .ToListAsync();

        return Results.Json(talepler);
    }

    private static async Task<IResult> KvkkTalepIsle(
        Guid id, KvkkTalepIsleIstek istek, HttpContext ctx, BiAniBirakDbContext db)
    {
        var (ok, kullanici) = await SuperAdminMi(ctx, db);
        if (!ok || kullanici == null)
            return Hata(403, "ERISIM_YOK", "Bu alana yalnız sistem yöneticisi erişebilir.");

        var talep = await db.KvkkTalepleri.FirstOrDefaultAsync(t => t.Id == id);
        if (talep == null)
            return Hata(404, "TALEP_BULUNAMADI", "Talep bulunamadı.");

        var gecerli = new[] { "yeni", "islemde", "tamamlandi", "reddedildi" };
        if (!gecerli.Contains(istek.Durum))
            return Hata(400, "DOGRULAMA_HATASI", "Geçersiz talep durumu.");

        talep.Durum = istek.Durum;
        talep.SonucNotu = istek.SonucNotu;
        talep.IsleyenKullaniciId = kullanici.Id;
        talep.IslemZamani = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync();

        await Denetim(db, null, kullanici.Id, "KVKK_TALEBI_ISLENDI", "kvkk_talepleri", id,
            new { durum = istek.Durum });

        return Results.Json(new { ok = true });
    }
}
