using System.Security.Claims;
using System.Text.Json;
using BiAniBirak.Api.Data;
using BiAniBirak.Api.Entities;
using BiAniBirak.Api.Modeller;
using BiAniBirak.Api.Servisler;
using Microsoft.EntityFrameworkCore;

namespace BiAniBirak.Api.Uclar;

// KURASYON STUDYOSU (Belge 03 - Akis 6). Toplanani ESERE ceviren katman.
//
// TASARIM DISIPLINI:
//  - Katkinin METNI dokunulmaz (Karar 2 - ozgunluk). Yalniz secim/sira/duzen kurgulanir.
//  - Kurasyon acilinca onayli dilekler OTOMATIK oge olur; sonradan onaylananlar
//    her erisimde SENKRONIZE edilir (dilek kaybi imkansiz).
//  - Silinen (moderasyonla kaldirilan) dilegin ogesi otomatik dusurulur.
//  - Her yazim tenant filtreli (AktifEtkinlikId) + audit.
public static class KurasyonUclari
{
    public static void KurasyonUclariniEkle(this WebApplication app)
    {
        app.MapGet("/api/etkinlik/aktif/kurasyon", KurasyonGetir).RequireAuthorization();
        app.MapPut("/api/etkinlik/aktif/kurasyon", KurasyonGuncelle).RequireAuthorization();
        app.MapPut("/api/etkinlik/aktif/kurasyon/oge/{katkiId:guid}", OgeGuncelle).RequireAuthorization();
        app.MapPost("/api/etkinlik/aktif/kurasyon/sirala", Sirala).RequireAuthorization();
        app.MapPost("/api/etkinlik/aktif/kurasyon/tamamla", Tamamla).RequireAuthorization();
        app.MapGet("/api/etkinlik/aktif/kurasyon/defter.pdf", DefterPdf).RequireAuthorization();

        // ONIZLEME - PDF DEGIL, GORUNTU.
        //
        // Eski surumde burada "?onizleme=true" ile FILIGRANLI PDF indiriliyordu. Bu,
        // urunu bedava dagitmakti: filigran bir goruntu modeliyle saniyeler icinde
        // silinir - ustelik silmeye bile gerek yok, baskiya hazir dosya ZATEN elde.
        //
        // Simdi: PDF hic uretilmez. Sunucu 96 DPI PNG gonderir. Ekranda kusursuz,
        // kagitta bulanik. Gormek bedava, BASMAK ucretli.
        app.MapGet("/api/etkinlik/aktif/kurasyon/onizleme", OnizlemeBilgi).RequireAuthorization();
        app.MapGet("/api/etkinlik/aktif/kurasyon/onizleme/{sayfa:int}.png", OnizlemeSayfa).RequireAuthorization();
    }

    // BASKIYA HAZIR DEFTER - 300 DPI, tam kalite (Belge 01: asil deger).
    //
    // FILIGRANLI SURUM YOK. "onizleme=true" parametresi KALDIRILDI: satin alma
    // oncesi dosya vermek, urunu bedava dagitmaktir. Onizleme icin OnizlemeSayfa
    // ucu var - PDF degil, 96 DPI goruntu doner.
    //
    // Odeme katmani baglandiginda bu uc paywall'in ARDINA gecer; onizleme ucu acik
    // kalir. Paywall'in cizgisi tam olarak burasidir.
    private static async Task<IResult> DefterPdf(
        HttpContext ctx, BiAniBirakDbContext db, IWebHostEnvironment ortam,
        DepolamaServisi depo, string? boyut = null)
    {
        if (!KullaniciKimligi(ctx, out var kullaniciId))
            return Hata(401, "ERISIM_YOK", "Oturum bulunamadı.");
        var (ok, etkinlikId, _) = await AktifTenant(ctx, db, kullaniciId);
        if (!ok)
            return Hata(403, "ERISIM_YOK", "Aktif etkinlik yok veya bu etkinliğe üye değilsin.");

        // DONDURULMUS DEFTER SALT OKUNUR - yazim ve BASKI NUSHASI INDIRME kapalidir.
        // Okuma serbest (onizleme/goruntuleme): dondurma bir DURDURMA'dir, veriyi
        // kullanicidan saklamak degil.
        if (await DondurmaGuard.DonduruldumuAsync(db, etkinlikId))
            return DondurmaGuard.Reddet();

        var etkinlik = await db.Etkinlikler.AsNoTracking()
            .FirstOrDefaultAsync(e => e.Id == etkinlikId && !e.SilindiMi);
        if (etkinlik == null)
            return Hata(404, "ETKINLIK_BULUNAMADI", "Etkinlik bulunamadı.");

        // ================= PAYWALL CIZGISI =================
        //
        // Bu SATIR, urunun tum is modelidir.
        //
        // Ucretsiz: toplama, kurma, duzenleme, kurasyon, TAM ONIZLEME (96 DPI).
        // Ucretli : YALNIZCA bu uc - baskiya hazir 300 DPI PDF.
        //
        // Onizleme ucu (/kurasyon/onizleme) BILINCLI olarak ACIK kalir. Cift eserini
        // doyasiya gorur, gurur duyar, paylasmak ister. Odedigi sey GORUNTU degil,
        // BASKI KALITESIDIR. "Toplamak ucretsiz. Miras, bir kereye mahsus."
        //
        // Kontrol TEK YERDE (OdemeServisi) - ikinci bir odeme kontrolu yazilirsa,
        // birinde unutulan bir kosul odemis bir ciftin defterini kilitler.
        //
        // NOT: odeme sistemi kapaliysa (OdemeAyari.Aktif=false) bu kontrol true doner -
        // acil durum kolu. Defterin 37 gunluk omru var; odeme arizasi yuzunden miras
        // imha edilemez.
        if (!await OdemeServisi.IndirmeYetkisiVarMiAsync(etkinlikId, db))
            return Hata(402, "ODEME_GEREKLI",
                "Baskıya hazır defterini indirmek için ödeme gerekli.");

        // PDF uretimi TEK yerde: DefterDerleyici. Super panel "Defter Rontgeni" de
        // ayni servisi cagirir - iki kopya olsaydi kacinilmaz olarak ayrisir ve
        // yonetici, cift'in gordugunden BASKA bir PDF gorurdu.
        // BOYUT: cift, basimi hangi olcude yaptiracaksa o boyut secilir. Belge
        // dogrudan o olcude uretilir - yazicidan buyutmeye birakilirsa fotograflar
        // seyrelir (A3'e buyutmede 300 DPI -> ~215 DPI).
        var sayfaBoyutu = BaskiServisi.BoyutCoz(boyut);

        var (derleme, derlemeHatasi) = await DefterDerleyici.DerleAsync(
            etkinlikId, db, depo, ortam.ContentRootPath, sayfaBoyutu);

        if (derlemeHatasi != null)
            return Hata(
                derlemeHatasi.Kod is "DILEK_YOK" or "DUZEN_HATASI" ? 400 : 404,
                derlemeHatasi.Kod,
                derlemeHatasi.Kod == "KURASYON_BULUNAMADI"
                    ? "Önce kürasyon stüdyosunu aç."
                    : derlemeHatasi.Kod == "DILEK_YOK"
                        ? "Esere en az bir dilek eklemelisin."
                        : derlemeHatasi.Mesaj);

        var kurasyon = derleme!.Kurasyon;
        var pdf = derleme.Pdf;

        // Surumleme (B6): her cikti kaydedilir - kim, ne zaman, hangi ayarlarla
        db.KurasyonCiktilari.Add(new KurasyonCiktisi
        {
            Id = Guid.NewGuid(),
            KurasyonId = kurasyon.Id,
            EtkinlikId = etkinlikId,
            Tip = "defter_pdf",
            AyarlarAnlik = JsonSerializer.Serialize(new
            {
                tema = kurasyon.Tema,
                gruplama = kurasyon.GruplamaTipi,
                kapak = kurasyon.KapakBaslik,
                tarih = kurasyon.TarihGoster,
                boyut = sayfaBoyutu.Kod,
            }),
            DilekSayisi = derleme.DilekSayisi,
            OlusturanKullaniciId = kullaniciId,
            CreatedAt = DateTimeOffset.UtcNow,
        });
        // Her PDF cikisi GERCEK INDIRMEDIR - onizleme diye bir cikti tipi yok.
        // Hatirlatma gorevi bu kayda bakar: "indirdi mi?" sorusunun yaniti.
        await Denetim(db, etkinlikId, kullaniciId,
            "ESER_INDIRILDI", kurasyon.Id,
            new { dilek_sayisi = derleme.DilekSayisi, tema = kurasyon.Tema, boyut = sayfaBoyutu.Kod });
        await db.SaveChangesAsync();

        // Dosya adinda boyut: cift birden fazla boy indirirse karistirmasin.
        var dosyaAdi = Temizle($"{etkinlik.Es1Ad}-{etkinlik.Es2Ad}-ani-defteri")
                       + $"-{sayfaBoyutu.Kod}.pdf";

        return Results.File(pdf, "application/pdf", dosyaAdi);
    }

    // ---------------- ONIZLEME (goruntu) ----------------

    // Kac sayfa, hangi cozunurlukte - goruntuleyici bunu bilerek yuklenir.
    private static async Task<IResult> OnizlemeBilgi(
        HttpContext ctx, BiAniBirakDbContext db, IWebHostEnvironment ortam,
        DepolamaServisi depo)
    {
        if (!KullaniciKimligi(ctx, out var kullaniciId))
            return Hata(401, "ERISIM_YOK", "Oturum bulunamadı.");
        var (ok, etkinlikId, _) = await AktifTenant(ctx, db, kullaniciId);
        if (!ok)
            return Hata(403, "ERISIM_YOK", "Aktif etkinlik yok veya bu etkinliğe üye değilsin.");

        var (sayfalar, hata) = await OnizlemeServisi.SayfalarAsync(
            etkinlikId, db, depo, ortam.ContentRootPath);

        if (hata != null)
            return Hata(hata.Kod is "DILEK_YOK" or "DUZEN_HATASI" ? 400 : 404, hata.Kod, hata.Mesaj);

        return Results.Json(new
        {
            sayfa_sayisi = sayfalar!.Count,
            onizleme_dpi = OnizlemeServisi.OnizlemeDpi,
            baski_dpi = OnizlemeServisi.BaskiDpi,
        });
    }

    // TEK SAYFA - PNG. Kullanicinin eline dosya GECMEZ, goruntu gecer.
    //
    // "Farkli kaydet" derse elinde 96 DPI bir PNG olur: ekranda guzel, A4'e
    // basildiginda gorunur sekilde bulanik. Baski 300 DPI ister; bu onun ucte biri.
    // Kopyalamayi ENGELLEMIYORUZ - kopyanin ISE YARAMAMASINI sagliyoruz.
    private static async Task<IResult> OnizlemeSayfa(
        int sayfa, HttpContext ctx, BiAniBirakDbContext db, IWebHostEnvironment ortam,
        DepolamaServisi depo)
    {
        if (!KullaniciKimligi(ctx, out var kullaniciId))
            return Hata(401, "ERISIM_YOK", "Oturum bulunamadı.");
        var (ok, etkinlikId, _) = await AktifTenant(ctx, db, kullaniciId);
        if (!ok)
            return Hata(403, "ERISIM_YOK", "Aktif etkinlik yok veya bu etkinliğe üye değilsin.");

        var (sayfalar, hata) = await OnizlemeServisi.SayfalarAsync(
            etkinlikId, db, depo, ortam.ContentRootPath);

        if (hata != null)
            return Hata(hata.Kod is "DILEK_YOK" or "DUZEN_HATASI" ? 400 : 404, hata.Kod, hata.Mesaj);

        if (sayfa < 0 || sayfa >= sayfalar!.Count)
            return Hata(404, "SAYFA_BULUNAMADI", "Sayfa bulunamadı.");

        // Onbellek: parmak izi degismedikce tarayici tekrar istemesin.
        ctx.Response.Headers.CacheControl = "private, max-age=300";

        return Results.File(sayfalar[sayfa], "image/png");
    }

    // Dosya adi icin ASCII-guvenli sadelestirme (Turkce karakterler indirmede bozulmasin)
    private static string Temizle(string ham)
    {
        var esleme = new Dictionary<char, char>
        {
            ['ç'] = 'c', ['Ç'] = 'C', ['ğ'] = 'g', ['Ğ'] = 'G', ['ı'] = 'i', ['İ'] = 'I',
            ['ö'] = 'o', ['Ö'] = 'O', ['ş'] = 's', ['Ş'] = 'S', ['ü'] = 'u', ['Ü'] = 'U',
        };
        var yapi = new System.Text.StringBuilder();
        foreach (var h in ham)
        {
            var c = esleme.TryGetValue(h, out var yerine) ? yerine : h;
            if (char.IsLetterOrDigit(c) || c == '-') yapi.Append(c);
            else if (c == ' ') yapi.Append('-');
        }
        return yapi.ToString().ToLowerInvariant();
    }

    private static IResult Hata(int kod, string hataKodu, string mesaj)
        => Results.Json(new { hata = hataKodu, mesaj }, statusCode: kod);

    private static bool KullaniciKimligi(HttpContext ctx, out Guid id)
    {
        var ham = ctx.User.FindFirstValue(ClaimTypes.NameIdentifier)
                  ?? ctx.User.FindFirstValue("sub");
        return Guid.TryParse(ham, out id);
    }

    private static async Task<(bool ok, Guid etkinlikId, string rol)> AktifTenant(
        HttpContext ctx, BiAniBirakDbContext db, Guid kullaniciId)
    {
        var claim = ctx.User.FindFirstValue("aktif_etkinlik_id");
        if (!Guid.TryParse(claim, out var etkinlikId))
            return (false, Guid.Empty, "");
        var uyelik = await db.EtkinlikUyelikleri.AsNoTracking()
            .FirstOrDefaultAsync(u => u.EtkinlikId == etkinlikId && u.KullaniciId == kullaniciId);
        if (uyelik == null) return (false, Guid.Empty, "");
        return (true, etkinlikId, uyelik.Rol);
    }

    private static async Task Denetim(
        BiAniBirakDbContext db, Guid etkinlikId, Guid kullaniciId,
        string eylem, Guid? varlikId, object? degisen = null)
    {
        db.DenetimGunlukleri.Add(new DenetimGunlugu
        {
            Id = Guid.NewGuid(),
            EtkinlikId = etkinlikId,
            KullaniciId = kullaniciId,
            Eylem = eylem,
            Varlik = "kurasyonlar",
            VarlikId = varlikId,
            DegisenAlanlar = degisen == null ? null : JsonSerializer.Serialize(degisen),
            CreatedAt = DateTimeOffset.UtcNow,
        });
    }

    // Kurasyonu getir (yoksa TURE GORE varsayilanlarla olustur) + onayli dilekleri SENKRONIZE et.
    private static async Task<IResult> KurasyonGetir(HttpContext ctx, BiAniBirakDbContext db)
    {
        if (!KullaniciKimligi(ctx, out var kullaniciId))
            return Hata(401, "ERISIM_YOK", "Oturum bulunamadı.");
        var (ok, etkinlikId, _) = await AktifTenant(ctx, db, kullaniciId);
        if (!ok)
            return Hata(403, "ERISIM_YOK", "Aktif etkinlik yok veya bu etkinliğe üye değilsin.");

        var etkinlik = await db.Etkinlikler.AsNoTracking()
            .FirstOrDefaultAsync(e => e.Id == etkinlikId);
        if (etkinlik == null)
            return Hata(404, "ETKINLIK_BULUNAMADI", "Etkinlik bulunamadı.");

        var simdi = DateTimeOffset.UtcNow;
        var kurasyon = await db.Kurasyonlar.FirstOrDefaultAsync(k => k.EtkinlikId == etkinlikId);

        if (kurasyon == null)
        {
            var v = Sabitler.KurasyonVarsayilan(etkinlik.Tur, etkinlik.Es1Ad, etkinlik.Es2Ad,
                etkinlik.EtkinlikTarihi);
            kurasyon = new Kurasyon
            {
                Id = Guid.NewGuid(),
                EtkinlikId = etkinlikId,
                Tema = "klasik",
                KapakBaslik = v.KapakBaslik,
                KapakAltBaslik = v.KapakAltBaslik,
                IthafMetni = v.IthafMetni,
                KapanisMetni = v.KapanisMetni,
                GruplamaTipi = "taraf",
                TarihGoster = true,
                Durum = "taslak",
                CreatedAt = simdi,
                UpdatedAt = simdi,
            };
            db.Kurasyonlar.Add(kurasyon);
            await Denetim(db, etkinlikId, kullaniciId, "KURASYON_BASLATILDI", kurasyon.Id);
            await db.SaveChangesAsync();
        }

        // SENKRONIZASYON: onayli + silinmemis dilekler oge olarak var mi?
        var onayliKatkilar = await db.Katkilar.AsNoTracking()
            .Where(k => k.EtkinlikId == etkinlikId && k.Durum == "onayli" && !k.SilindiMi)
            .OrderBy(k => k.CreatedAt)
            .ToListAsync();

        var mevcutOgeler = await db.KurasyonOgeleri
            .Where(o => o.KurasyonId == kurasyon.Id)
            .ToListAsync();

        var mevcutKatkiIdler = mevcutOgeler.Select(o => o.KatkiId).ToHashSet();
        var onayliIdler = onayliKatkilar.Select(k => k.Id).ToHashSet();

        var degisti = false;
        var siraSayaci = mevcutOgeler.Count == 0 ? 0 : mevcutOgeler.Max(o => o.Sira) + 1;

        // Yeni onaylananlari ekle (kayip imkansiz)
        foreach (var k in onayliKatkilar.Where(k => !mevcutKatkiIdler.Contains(k.Id)))
        {
            db.KurasyonOgeleri.Add(new KurasyonOgesi
            {
                Id = Guid.NewGuid(),
                KurasyonId = kurasyon.Id,
                KatkiId = k.Id,
                Dahil = true,
                Sira = siraSayaci++,
                CreatedAt = simdi,
            });
            degisti = true;
        }

        // Artik onayli olmayan (geri alinan / moderasyonla kaldirilan) ogeleri dusur
        var dusecekler = mevcutOgeler.Where(o => !onayliIdler.Contains(o.KatkiId)).ToList();
        if (dusecekler.Count > 0)
        {
            db.KurasyonOgeleri.RemoveRange(dusecekler);
            degisti = true;
        }

        if (degisti) await db.SaveChangesAsync();

        // Tam veri (oge + katki birlesimi)
        var ogeler = await db.KurasyonOgeleri.AsNoTracking()
            .Where(o => o.KurasyonId == kurasyon.Id)
            .Join(db.Katkilar.AsNoTracking(), o => o.KatkiId, k => k.Id, (o, k) => new
            {
                katki_id = k.Id,
                davetli_ad = k.DavetliAd,
                davetli_iliski = k.DavetliIliski,
                // Iletisim: cift, esere alacagi bir dilegin sahibine gerekirse
                // ulasabilmeli (duzeltme ricasi, tesekkur). Bu uc RequireAuthorization
                // + tenant altinda; davetli tarafina ASLA donmez.
                davetli_telefon = k.DavetliTelefon,
                davetli_email = k.DavetliEmail,
                mesaj = k.Mesaj,
                kaynak_es = k.KaynakEs,
                birakilma = k.CreatedAt,
                foto_url = k.FotoAnahtari != null ? "/api/gorsel/" + k.FotoAnahtari : null,
                // Olcu: kurasyon onizlemesi, kagittaki kartin AYNISINI cizer.
                // Olcu olmadan cerceve orani bilinemez -> onizleme yalan soyler.
                foto_genislik = k.FotoGenislik,
                foto_yukseklik = k.FotoYukseklik,
                dahil = o.Dahil,
                sira = o.Sira,
                bolum_basligi = o.BolumBasligi,
            })
            .OrderBy(x => x.sira)
            .ToListAsync();

        // Cift gorselleri - canli onizleme GERCEGI gostermeli
        var gorseller = await db.EtkinlikGorselleri.AsNoTracking()
            .Where(g => g.EtkinlikId == etkinlikId)
            .OrderBy(g => g.Sira)
            .Select(g => new
            {
                url = "/api/gorsel/" + g.DepolamaAnahtari,
                konum = g.Konum,
            })
            .ToListAsync();

        return Results.Json(new
        {
            tema = kurasyon.Tema,
            kapak_baslik = kurasyon.KapakBaslik,
            kapak_alt_baslik = kurasyon.KapakAltBaslik,
            kapak_gorsel_url = kurasyon.KapakGorselUrl,
            ithaf_metni = kurasyon.IthafMetni,
            kapanis_metni = kurasyon.KapanisMetni,
            gruplama_tipi = kurasyon.GruplamaTipi,
            tarih_goster = kurasyon.TarihGoster,
            durum = kurasyon.Durum,
            tamamlanma_zamani = kurasyon.TamamlanmaZamani,
            // Baglam (onizleme icin)
            es1_ad = etkinlik.Es1Ad,
            es2_ad = etkinlik.Es2Ad,
            tur = etkinlik.Tur,
            etkinlik_tarihi = etkinlik.EtkinlikTarihi,
            ogeler,
            gorseller,
        });
    }

    // Kurasyon ayarlari (tema, kapak, ithaf, gruplama, kapanis)
    private static async Task<IResult> KurasyonGuncelle(
        KurasyonGuncelleIstek istek, HttpContext ctx, BiAniBirakDbContext db)
    {
        if (!KullaniciKimligi(ctx, out var kullaniciId))
            return Hata(401, "ERISIM_YOK", "Oturum bulunamadı.");
        var (ok, etkinlikId, _) = await AktifTenant(ctx, db, kullaniciId);
        if (!ok)
            return Hata(403, "ERISIM_YOK", "Aktif etkinlik yok veya bu etkinliğe üye değilsin.");

        // DONDURULMUS DEFTER SALT OKUNUR - yazim ve BASKI NUSHASI INDIRME kapalidir.
        // Okuma serbest (onizleme/goruntuleme): dondurma bir DURDURMA'dir, veriyi
        // kullanicidan saklamak degil.
        if (await DondurmaGuard.DonduruldumuAsync(db, etkinlikId))
            return DondurmaGuard.Reddet();

        var kurasyon = await db.Kurasyonlar.FirstOrDefaultAsync(k => k.EtkinlikId == etkinlikId);
        if (kurasyon == null)
            return Hata(404, "KURASYON_BULUNAMADI", "Önce kürasyon stüdyosunu aç.");

        var gecerliTemalar = new[] { "klasik", "modern", "zarif" };
        if (istek.Tema != null)
        {
            if (!gecerliTemalar.Contains(istek.Tema))
                return Hata(400, "DOGRULAMA_HATASI", "Geçersiz tema.");
            kurasyon.Tema = istek.Tema;
        }

        var gecerliGruplama = new[] { "taraf", "kronolojik", "bolum" };
        if (istek.GruplamaTipi != null)
        {
            if (!gecerliGruplama.Contains(istek.GruplamaTipi))
                return Hata(400, "DOGRULAMA_HATASI", "Geçersiz gruplama tipi.");
            kurasyon.GruplamaTipi = istek.GruplamaTipi;
        }

        if (istek.KapakBaslik != null) kurasyon.KapakBaslik = istek.KapakBaslik.Trim();
        if (istek.KapakAltBaslik != null) kurasyon.KapakAltBaslik = istek.KapakAltBaslik.Trim();
        if (istek.KapakGorselUrl != null) kurasyon.KapakGorselUrl = istek.KapakGorselUrl.Trim();
        if (istek.IthafMetni != null) kurasyon.IthafMetni = istek.IthafMetni.Trim();
        if (istek.KapanisMetni != null) kurasyon.KapanisMetni = istek.KapanisMetni.Trim();
        if (istek.TarihGoster.HasValue) kurasyon.TarihGoster = istek.TarihGoster.Value;

        kurasyon.UpdatedAt = DateTimeOffset.UtcNow;
        await Denetim(db, etkinlikId, kullaniciId, "KURASYON_GUNCELLENDI", kurasyon.Id,
            new { tema = kurasyon.Tema, gruplama = kurasyon.GruplamaTipi });
        await db.SaveChangesAsync();

        return Results.Json(new { ok = true });
    }

    // Tek ogenin dahil/haric ve bolum basligi
    private static async Task<IResult> OgeGuncelle(
        Guid katkiId, OgeGuncelleIstek istek, HttpContext ctx, BiAniBirakDbContext db)
    {
        if (!KullaniciKimligi(ctx, out var kullaniciId))
            return Hata(401, "ERISIM_YOK", "Oturum bulunamadı.");
        var (ok, etkinlikId, _) = await AktifTenant(ctx, db, kullaniciId);
        if (!ok)
            return Hata(403, "ERISIM_YOK", "Aktif etkinlik yok veya bu etkinliğe üye değilsin.");

        // DONDURULMUS DEFTER SALT OKUNUR - yazim ve BASKI NUSHASI INDIRME kapalidir.
        // Okuma serbest (onizleme/goruntuleme): dondurma bir DURDURMA'dir, veriyi
        // kullanicidan saklamak degil.
        if (await DondurmaGuard.DonduruldumuAsync(db, etkinlikId))
            return DondurmaGuard.Reddet();

        var kurasyon = await db.Kurasyonlar.AsNoTracking()
            .FirstOrDefaultAsync(k => k.EtkinlikId == etkinlikId);
        if (kurasyon == null)
            return Hata(404, "KURASYON_BULUNAMADI", "Önce kürasyon stüdyosunu aç.");

        var oge = await db.KurasyonOgeleri
            .FirstOrDefaultAsync(o => o.KurasyonId == kurasyon.Id && o.KatkiId == katkiId);
        if (oge == null)
            return Hata(404, "OGE_BULUNAMADI", "Bu dilek eserde bulunamadı.");

        if (istek.Dahil.HasValue) oge.Dahil = istek.Dahil.Value;
        if (istek.BolumBasligi != null)
            oge.BolumBasligi = string.IsNullOrWhiteSpace(istek.BolumBasligi)
                ? null : istek.BolumBasligi.Trim();

        await db.SaveChangesAsync();
        return Results.Json(new { ok = true });
    }

    // Toplu siralama (surukle-birak / yukari-asagi sonucu)
    private static async Task<IResult> Sirala(
        SiralaIstek istek, HttpContext ctx, BiAniBirakDbContext db)
    {
        if (!KullaniciKimligi(ctx, out var kullaniciId))
            return Hata(401, "ERISIM_YOK", "Oturum bulunamadı.");
        var (ok, etkinlikId, _) = await AktifTenant(ctx, db, kullaniciId);
        if (!ok)
            return Hata(403, "ERISIM_YOK", "Aktif etkinlik yok veya bu etkinliğe üye değilsin.");

        // DONDURULMUS DEFTER SALT OKUNUR - yazim ve BASKI NUSHASI INDIRME kapalidir.
        // Okuma serbest (onizleme/goruntuleme): dondurma bir DURDURMA'dir, veriyi
        // kullanicidan saklamak degil.
        if (await DondurmaGuard.DonduruldumuAsync(db, etkinlikId))
            return DondurmaGuard.Reddet();

        var kurasyon = await db.Kurasyonlar.AsNoTracking()
            .FirstOrDefaultAsync(k => k.EtkinlikId == etkinlikId);
        if (kurasyon == null)
            return Hata(404, "KURASYON_BULUNAMADI", "Önce kürasyon stüdyosunu aç.");

        if (istek.KatkiIdler == null || istek.KatkiIdler.Length == 0)
            return Hata(400, "DOGRULAMA_HATASI", "Sıralama listesi boş.");

        var ogeler = await db.KurasyonOgeleri
            .Where(o => o.KurasyonId == kurasyon.Id)
            .ToListAsync();

        // Gelen sirayla yeniden numaralandir (atomik)
        for (var i = 0; i < istek.KatkiIdler.Length; i++)
        {
            var oge = ogeler.FirstOrDefault(o => o.KatkiId == istek.KatkiIdler[i]);
            if (oge != null) oge.Sira = i;
        }
        await db.SaveChangesAsync();

        return Results.Json(new { ok = true });
    }

    // Mirasi TAMAMLA - Kuzey Yildizi metrigi (Belge 01).
    private static async Task<IResult> Tamamla(HttpContext ctx, BiAniBirakDbContext db)
    {
        if (!KullaniciKimligi(ctx, out var kullaniciId))
            return Hata(401, "ERISIM_YOK", "Oturum bulunamadı.");
        var (ok, etkinlikId, _) = await AktifTenant(ctx, db, kullaniciId);
        if (!ok)
            return Hata(403, "ERISIM_YOK", "Aktif etkinlik yok veya bu etkinliğe üye değilsin.");

        // DONDURULMUS DEFTER SALT OKUNUR - yazim ve BASKI NUSHASI INDIRME kapalidir.
        // Okuma serbest (onizleme/goruntuleme): dondurma bir DURDURMA'dir, veriyi
        // kullanicidan saklamak degil.
        if (await DondurmaGuard.DonduruldumuAsync(db, etkinlikId))
            return DondurmaGuard.Reddet();

        var kurasyon = await db.Kurasyonlar.FirstOrDefaultAsync(k => k.EtkinlikId == etkinlikId);
        if (kurasyon == null)
            return Hata(404, "KURASYON_BULUNAMADI", "Önce kürasyon stüdyosunu aç.");

        var dahilSayi = await db.KurasyonOgeleri
            .CountAsync(o => o.KurasyonId == kurasyon.Id && o.Dahil);
        if (dahilSayi == 0)
            return Hata(400, "DILEK_YOK", "Esere en az bir dilek eklemelisin.");

        kurasyon.Durum = "tamamlandi";
        kurasyon.TamamlanmaZamani = DateTimeOffset.UtcNow;
        kurasyon.UpdatedAt = DateTimeOffset.UtcNow;

        await Denetim(db, etkinlikId, kullaniciId, "MIRAS_TAMAMLANDI", kurasyon.Id,
            new { dilek_sayisi = dahilSayi, tema = kurasyon.Tema });
        await db.SaveChangesAsync();

        return Results.Json(new { ok = true, dilek_sayisi = dahilSayi });
    }
}
