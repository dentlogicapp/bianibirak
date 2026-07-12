using System.Security.Claims;
using BiAniBirak.Api.Data;
using BiAniBirak.Api.Servisler;
using Microsoft.EntityFrameworkCore;

namespace BiAniBirak.Api.Uclar;

// SUPER PANEL - TESHIS KATMANI (Planlama Defteri super-admin deseninden uyarlandi).
//
// Mevcut SuperUclari.cs LISTELER ve YONETIR; bu dosya ANLAR:
//
//  1. SAGLIK SKORU   - hangi defter batiyor? (Planlama'nin 4-ceyrek deseni,
//                      BiAniBirak'a uyarlandi: kurulum / link / katki / aktivite)
//  2. DEFTER DETAYI  - salt-okunur derin gorunum. Liste "sorun var" der; detay
//                      "sorun BU" der. Ikisi olmadan destek koru calisir.
//  3. OLCUM          - donusum hunisi + yasam dongusu takvimi + risk listesi.
//                      Odeme katmani kurulmadan ONCE olcum kurulmali: sonra
//                      kurarsak "odeme mi kotu, urun mu kotu" ayirt EDEMEYIZ.
//  4. DEFTER RONTGENI- yoneticinin, cift'in gordugu PDF'i uretebilmesi. "Ciktim
//                      bozuk" diyen cifte saniyede teshis. Impersonation
//                      gerektirmez - daha az yetki, ayni fayda.
//
// GUVENLIK: her uc SuperAdminMi() ile korunur (JWT claim + DB dogrulamasi).
// Hepsi SALT-OKUNUR; tek yazma, rontgen denetim kaydi.
public static class SuperTeshisUclari
{
    public static void SuperTeshisUclariniEkle(this WebApplication app)
    {
        app.MapGet("/api/super/defter/{id:guid}/detay", DefterDetay).RequireAuthorization();
        app.MapGet("/api/super/olcum", Olcum).RequireAuthorization();
        app.MapGet("/api/super/defter/{id:guid}/rontgen.pdf", DefterRontgen).RequireAuthorization();

        // IMHA - manuel tetikleme. Cron saatlik calisir; bu uc operasyon icindir:
        // "gecikmis imha var" alarmini yonetici ANINDA temizleyebilmeli, bir sonraki
        // turu beklememeli. Ayrica test edilebilirligin tek yolu.
        app.MapPost("/api/super/imha/calistir", ImhaCalistir).RequireAuthorization();
    }

    // ---------------- ORTAK ----------------

    private static bool KullaniciKimligi(HttpContext ctx, out Guid id)
    {
        id = Guid.Empty;
        var ham = ctx.User.FindFirstValue(ClaimTypes.NameIdentifier)
                  ?? ctx.User.FindFirstValue("sub");
        return Guid.TryParse(ham, out id);
    }

    private static async Task<(bool ok, Entities.Kullanici? kullanici)> SuperAdminMi(
        HttpContext ctx, BiAniBirakDbContext db)
    {
        if (!KullaniciKimligi(ctx, out var id)) return (false, null);
        var k = await db.Kullanicilar.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id);
        if (k == null || !k.SuperAdmin) return (false, null);
        return (true, k);
    }

    private static IResult Hata(int kod, string hataKodu, string mesaj)
        => Results.Json(new { hata = hataKodu, mesaj }, statusCode: kod);

    // SAGLIK SKORU - 4 ceyrek x 25 puan (Planlama deseni, urune uyarlandi).
    //
    //   KURULUM (25)  : es adlari + tarih + karsilama metni dolu mu?
    //   LINK    (25)  : en az bir paylasim baglantisi aktif mi? (link paylasilmadan
    //                   defter DOLAMAZ - bu en kritik esik)
    //   KATKI   (25)  : en az bir dilek geldi mi? (urun degerini kanitlayan an)
    //   AKTIF   (25)  : son 30 gunde hareket var mi? (katki ya da guncelleme)
    //
    // 100 = saglikli. 50 alti = mudahale gerektirir.
    private static int SaglikHesapla(bool kurulum, bool link, bool katki, bool aktif)
        => (kurulum ? 25 : 0) + (link ? 25 : 0) + (katki ? 25 : 0) + (aktif ? 25 : 0);

    // ---------------- DEFTER DETAYI (salt-okunur) ----------------

    private static async Task<IResult> DefterDetay(
        Guid id, HttpContext ctx, BiAniBirakDbContext db)
    {
        var (ok, _) = await SuperAdminMi(ctx, db);
        if (!ok) return Hata(403, "ERISIM_YOK", "Bu alana yalnız sistem yöneticisi erişebilir.");

        var e = await db.Etkinlikler.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id);
        if (e == null) return Hata(404, "ETKINLIK_BULUNAMADI", "Defter bulunamadı.");

        // Uyeler (esler)
        var uyeler = await db.EtkinlikUyelikleri.AsNoTracking()
            .Where(u => u.EtkinlikId == id)
            .Join(db.Kullanicilar.AsNoTracking(), u => u.KullaniciId, k => k.Id, (u, k) => new
            {
                k.Id,
                k.Ad,
                k.Email,
                u.Rol,
                k.SuperAdmin,
                askida = k.DeletedAt != null,
                k.CreatedAt,
            })
            .ToListAsync();

        // Katki dagilimi - tek sorgu, N+1 yok
        var katkilar = await db.Katkilar.AsNoTracking()
            .Where(k => k.EtkinlikId == id && !k.SilindiMi)
            .Select(k => new { k.Durum, k.KaynakEs, k.FotoAnahtari, k.CreatedAt })
            .ToListAsync();

        var linkler = await db.PaylasimBaglantilari.AsNoTracking()
            .Where(p => p.EtkinlikId == id)
            .Select(p => new { p.Es, p.Aktif, p.CreatedAt })
            .ToListAsync();

        var kurasyon = await db.Kurasyonlar.AsNoTracking()
            .FirstOrDefaultAsync(k => k.EtkinlikId == id);

        int esereDahil = 0;
        if (kurasyon != null)
        {
            esereDahil = await db.KurasyonOgeleri.AsNoTracking()
                .CountAsync(o => o.KurasyonId == kurasyon.Id && o.Dahil);
        }

        var ciktilar = await db.KurasyonCiktilari.AsNoTracking()
            .Where(c => c.EtkinlikId == id)
            .OrderByDescending(c => c.CreatedAt)
            .Take(5)
            .Select(c => new
            {
                c.Tip,
                c.Filigranli,
                c.DilekSayisi,
                c.CreatedAt,
            })
            .ToListAsync();

        // Medya: kac gorsel, toplam kac bayt (disk maliyeti gorunur olsun)
        var gorseller = await db.EtkinlikGorselleri.AsNoTracking()
            .Where(g => g.EtkinlikId == id)
            .Select(g => new { g.Konum, g.Bayt })
            .ToListAsync();

        var simdi = DateTimeOffset.UtcNow;
        var esik30 = simdi.AddDays(-30);

        var kurulumTam = !string.IsNullOrWhiteSpace(e.Es1Ad)
                         && !string.IsNullOrWhiteSpace(e.Es2Ad)
                         && e.EtkinlikTarihi > DateTimeOffset.MinValue;
        var linkVar = linkler.Any(l => l.Aktif);
        var katkiVar = katkilar.Count > 0;
        var sonKatki = katkilar.Count > 0 ? katkilar.Max(k => k.CreatedAt) : (DateTimeOffset?)null;
        var sonHareket = sonKatki.HasValue && sonKatki > e.UpdatedAt ? sonKatki.Value : e.UpdatedAt;
        var aktif30 = sonHareket >= esik30;

        // Yasam dongusu: acik / kapanmis / imhaya kalan gun
        var kapandi = simdi > e.KapanisTarihi;
        var imhaTarihi = e.KapanisTarihi.AddDays(Sabitler.SaklamaGun);
        var imhayaKalanGun = (int)Math.Ceiling((imhaTarihi - simdi).TotalDays);

        return Results.Json(new
        {
            id = e.Id,
            es1_ad = e.Es1Ad,
            es2_ad = e.Es2Ad,
            tur = e.Tur,
            durum = e.Durum,
            donduruldu = e.Donduruldu,
            silindi = e.SilindiMi,
            created_at = e.CreatedAt,
            updated_at = e.UpdatedAt,

            // Yasam dongusu
            acilis_tarihi = e.AcilisTarihi,
            etkinlik_tarihi = e.EtkinlikTarihi,
            kapanis_tarihi = e.KapanisTarihi,
            kapandi,
            imha_tarihi = imhaTarihi,
            imhaya_kalan_gun = imhayaKalanGun,

            // Saglik
            saglik = SaglikHesapla(kurulumTam, linkVar, katkiVar, aktif30),
            saglik_detay = new
            {
                kurulum = kurulumTam,
                link = linkVar,
                katki = katkiVar,
                aktif_30_gun = aktif30,
            },
            son_hareket = sonHareket,

            uyeler = uyeler.Select(u => new
            {
                id = u.Id,
                ad = u.Ad,
                email = u.Email,
                rol = u.Rol,
                super_admin = u.SuperAdmin,
                askida = u.askida,
                katildi = u.CreatedAt,
            }),

            linkler = linkler.Select(l => new
            {
                es = l.Es,
                aktif = l.Aktif,
                created_at = l.CreatedAt,
            }),

            katki = new
            {
                toplam = katkilar.Count,
                beklemede = katkilar.Count(k => k.Durum == "beklemede"),
                onayli = katkilar.Count(k => k.Durum == "onayli"),
                red = katkilar.Count(k => k.Durum == "red"),
                fotografli = katkilar.Count(k => k.FotoAnahtari != null),
                es1 = katkilar.Count(k => k.KaynakEs == "es1"),
                es2 = katkilar.Count(k => k.KaynakEs == "es2"),
                son_katki = sonKatki,
            },

            kurasyon = kurasyon == null ? null : new
            {
                durum = kurasyon.Durum,
                tema = kurasyon.Tema,
                esere_dahil = esereDahil,
                tamamlanma = kurasyon.TamamlanmaZamani,
            },

            ciktilar,

            medya = new
            {
                adet = gorseller.Count,
                bayt = gorseller.Sum(g => g.Bayt),
            },
        });
    }

    // ---------------- OLCUM ----------------
    //
    // Odeme katmani kurulmadan ONCE bu olcum ayakta olmali. Aksi halde paywall
    // eklendiginde dusen donusumun sebebi bilinemez: odeme mi itti, urun mu zaten
    // tutmuyordu? Bugunku huni, yarinki karsilastirmanin TEMEL CIZGISIDIR.
    private static async Task<IResult> Olcum(HttpContext ctx, BiAniBirakDbContext db)
    {
        var (ok, _) = await SuperAdminMi(ctx, db);
        if (!ok) return Hata(403, "ERISIM_YOK", "Bu alana yalnız sistem yöneticisi erişebilir.");

        var simdi = DateTimeOffset.UtcNow;
        var esik30 = simdi.AddDays(-30);
        var esik7 = simdi.AddDays(-7);

        var defterler = await db.Etkinlikler.AsNoTracking()
            .Where(e => !e.SilindiMi)
            .Select(e => new
            {
                e.Id,
                e.Es1Ad,
                e.Es2Ad,
                e.CreatedAt,
                e.UpdatedAt,
                e.KapanisTarihi,
                e.EtkinlikTarihi,
            })
            .ToListAsync();

        // Toplu sorgular - N+1 YOK
        var linkliSet = (await db.PaylasimBaglantilari.AsNoTracking()
            .Where(p => p.Aktif)
            .Select(p => p.EtkinlikId).Distinct().ToListAsync()).ToHashSet();

        var katkiliSet = (await db.Katkilar.AsNoTracking()
            .Where(k => !k.SilindiMi)
            .Select(k => k.EtkinlikId).Distinct().ToListAsync()).ToHashSet();

        var kurasyonluSet = (await db.KurasyonOgeleri.AsNoTracking()
            .Where(o => o.Dahil)
            .Join(db.Kurasyonlar.AsNoTracking(), o => o.KurasyonId, k => k.Id, (o, k) => k.EtkinlikId)
            .Distinct().ToListAsync()).ToHashSet();

        var indirenSet = (await db.KurasyonCiktilari.AsNoTracking()
            .Where(c => !c.Filigranli)
            .Select(c => c.EtkinlikId).Distinct().ToListAsync()).ToHashSet();

        // Ilk katki zamani (defter basina) - "link -> ilk dilek" gecikmesini olcer
        var ilkKatkilar = (await db.Katkilar.AsNoTracking()
            .Where(k => !k.SilindiMi)
            .GroupBy(k => k.EtkinlikId)
            .Select(g => new { EtkinlikId = g.Key, Ilk = g.Min(x => x.CreatedAt) })
            .ToListAsync())
            .ToDictionary(x => x.EtkinlikId, x => x.Ilk);

        // DONUSUM HUNISI - her adim bir oncekinin ALT KUMESIDIR
        var toplam = defterler.Count;
        var linkli = defterler.Count(d => linkliSet.Contains(d.Id));
        var katkili = defterler.Count(d => katkiliSet.Contains(d.Id));
        var kurasyonlu = defterler.Count(d => kurasyonluSet.Contains(d.Id));
        var indiren = defterler.Count(d => indirenSet.Contains(d.Id));

        // RISK ALTINDAKI DEFTERLER
        // "Link paylasildi, 7 gunden fazla gecti, HALA sifir dilek."
        // Bu cift urunu anlamamis ya da linki hic gondermemistir. Rakiplerin
        // goremedigi sinyal: mudahale edilebilir bir kayip.
        var riskli = defterler
            .Where(d => linkliSet.Contains(d.Id)
                        && !katkiliSet.Contains(d.Id)
                        && d.CreatedAt < esik7)
            .OrderBy(d => d.CreatedAt)
            .Take(20)
            .Select(d => new
            {
                id = d.Id,
                es1_ad = d.Es1Ad,
                es2_ad = d.Es2Ad,
                created_at = d.CreatedAt,
                gun = (int)Math.Floor((simdi - d.CreatedAt).TotalDays),
                sebep = "Link aktif ama hiç dilek gelmemiş",
            })
            .ToList();

        // YASAM DONGUSU TAKVIMI
        var acik = defterler.Count(d => simdi <= d.KapanisTarihi);
        var kapali = defterler.Count(d => simdi > d.KapanisTarihi);

        // Imhaya yaklasanlar (kapanis + saklama suresi). KVKK gorunurlugu:
        // "veri ne zaman yok olacak" sorusunun cevabi PANELDE durmali.
        var imhaYaklasan = defterler
            .Select(d => new
            {
                d.Id,
                d.Es1Ad,
                d.Es2Ad,
                ImhaTarihi = d.KapanisTarihi.AddDays(Sabitler.SaklamaGun),
            })
            .Where(x => x.ImhaTarihi > simdi && x.ImhaTarihi <= simdi.AddDays(14))
            .OrderBy(x => x.ImhaTarihi)
            .Take(20)
            .Select(x => new
            {
                id = x.Id,
                es1_ad = x.Es1Ad,
                es2_ad = x.Es2Ad,
                imha_tarihi = x.ImhaTarihi,
                kalan_gun = (int)Math.Ceiling((x.ImhaTarihi - simdi).TotalDays),
            })
            .ToList();

        // Gecikmis imha: suresi dolmus ama HALA duruyor (cron yok/calismiyor).
        // Bu bir KVKK riskidir; panelde KIRMIZI gorunmeli.
        var imhaGecikmis = defterler.Count(d =>
            d.KapanisTarihi.AddDays(Sabitler.SaklamaGun) <= simdi);

        // Ortalama "link -> ilk dilek" gecikmesi (saat). Urun ne kadar hizli deger
        // uretiyor? Bu sure uzunsa davetli daveti anlamiyordur.
        var gecikmeler = defterler
            .Where(d => ilkKatkilar.ContainsKey(d.Id))
            .Select(d => (ilkKatkilar[d.Id] - d.CreatedAt).TotalHours)
            .Where(s => s >= 0)
            .ToList();

        return Results.Json(new
        {
            huni = new
            {
                defter_acildi = toplam,
                link_paylasildi = linkli,
                ilk_dilek_geldi = katkili,
                kurasyon_yapildi = kurasyonlu,
                eser_indirildi = indiren,
            },
            yasam_dongusu = new
            {
                acik,
                kapali,
                imha_gecikmis = imhaGecikmis,
                saklama_gun = Sabitler.SaklamaGun,
            },
            riskli,
            imha_yaklasan = imhaYaklasan,
            ilk_dilek_gecikme_saat = gecikmeler.Count > 0
                ? Math.Round(gecikmeler.Average(), 1)
                : (double?)null,
            son_30_gun = new
            {
                yeni_defter = defterler.Count(d => d.CreatedAt >= esik30),
                yeni_dilek = await db.Katkilar.AsNoTracking()
                    .CountAsync(k => !k.SilindiMi && k.CreatedAt >= esik30),
            },
        });
    }

    // ---------------- IMHA (manuel tetikleme) ----------------
    //
    // Cron saatlik calisir. Bu uc, yoneticinin alarmi ANINDA temizlemesi icindir:
    // Olcum sekmesinde "3 defter imha gecikmis" yaziyorsa, bir sonraki saati
    // beklemek KVKK riskini uzatmak demektir.
    private static async Task<IResult> ImhaCalistir(
        HttpContext ctx, BiAniBirakDbContext db, IServiceProvider saglayici)
    {
        var (ok, aktor) = await SuperAdminMi(ctx, db);
        if (!ok || aktor == null)
            return Hata(403, "ERISIM_YOK", "Bu alana yalnız sistem yöneticisi erişebilir.");

        var depo = saglayici.GetRequiredService<DepolamaServisi>();
        var simdi = DateTimeOffset.UtcNow;

        var imhaliklar = await db.Etkinlikler
            .Where(e => !e.ImhaEdildi && !e.SilindiMi)
            .ToListAsync();

        var hedefler = imhaliklar
            .Where(e => e.KapanisTarihi.AddDays(Sabitler.SaklamaGun) <= simdi)
            .ToList();

        foreach (var e in hedefler)
        {
            // Imha mantigi TEK yerde (ImhaGorevi): cron ile manuel tetikleme ayni
            // kodu calistirir. Iki kopya olsaydi biri eksik silerdi.
            await ImhaGorevi.ImhaEtAsync(db, depo, e, CancellationToken.None);
        }

        return Results.Json(new { ok = true, imha_edilen = hedefler.Count });
    }

    // ---------------- DEFTER RONTGENI ----------------
    //
    // Yonetici, cift'in gordugu PDF'i uretir. Impersonation'a GEREK YOK: daha az
    // yetki, ayni fayda. "Ciktim bozuk" diyen cifte saniyede teshis.
    //
    // Cikti HER ZAMAN filigranlidir: bu bir DESTEK araci, cift'in odedigi urun degil.
    // Filigransiz cikti uretme yetkisi yalnizca ciftin kendisindedir.
    private static async Task<IResult> DefterRontgen(
        Guid id, HttpContext ctx, BiAniBirakDbContext db,
        DepolamaServisi depo, IWebHostEnvironment ortam)
    {
        var (ok, aktor) = await SuperAdminMi(ctx, db);
        if (!ok || aktor == null)
            return Hata(403, "ERISIM_YOK", "Bu alana yalnız sistem yöneticisi erişebilir.");

        var (derleme, hata) = await DefterDerleyici.DerleAsync(
            id, db, depo, ortam.ContentRootPath, filigranli: true);

        if (hata != null)
            return Hata(hata.Kod == "DILEK_YOK" ? 400 : 404, hata.Kod, hata.Mesaj);

        // Adli iz: yonetici bir ciftin defterini GORDU. Bu kayit silinemez.
        db.DenetimGunlukleri.Add(new Entities.DenetimGunlugu
        {
            Id = Guid.NewGuid(),
            EtkinlikId = id,
            KullaniciId = aktor.Id,
            Eylem = "SUPER_DEFTER_RONTGEN",
            Varlik = "kurasyonlar",
            VarlikId = derleme!.Kurasyon.Id,
            DegisenAlanlar = System.Text.Json.JsonSerializer.Serialize(new
            {
                dilek_sayisi = derleme.DilekSayisi,
                yonetici = aktor.Email,
            }),
            // GIZLILIK SINIRI: cift, yoneticinin defterinin PDF'ini urettigini
            // ASLA gormez. Kayit adli iz olarak durur (super panel gorur), ama
            // ciftin denetim sayfasinda BELIRMEZ.
            SistemEylemi = true,
            CreatedAt = DateTimeOffset.UtcNow,
        });
        await db.SaveChangesAsync();

        return Results.File(derleme.Pdf, "application/pdf", $"rontgen-{id}.pdf");
    }
}
