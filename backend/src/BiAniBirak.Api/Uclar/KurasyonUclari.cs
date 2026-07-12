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
    }

    // BASKIYA HAZIR DEFTER (Belge 01 - asil deger).
    // onizleme=true -> filigranli (satin alma oncesi; Belge 05 paywall matrisi).
    private static async Task<IResult> DefterPdf(
        HttpContext ctx, BiAniBirakDbContext db, IWebHostEnvironment ortam,
        DepolamaServisi depo, bool onizleme = false)
    {
        if (!KullaniciKimligi(ctx, out var kullaniciId))
            return Hata(401, "ERISIM_YOK", "Oturum bulunamadı.");
        var (ok, etkinlikId, _) = await AktifTenant(ctx, db, kullaniciId);
        if (!ok)
            return Hata(403, "ERISIM_YOK", "Aktif etkinlik yok veya bu etkinliğe üye değilsin.");

        var etkinlik = await db.Etkinlikler.AsNoTracking()
            .FirstOrDefaultAsync(e => e.Id == etkinlikId && !e.SilindiMi);
        if (etkinlik == null)
            return Hata(404, "ETKINLIK_BULUNAMADI", "Etkinlik bulunamadı.");

        var kurasyon = await db.Kurasyonlar.AsNoTracking()
            .FirstOrDefaultAsync(k => k.EtkinlikId == etkinlikId);
        if (kurasyon == null)
            return Hata(404, "KURASYON_BULUNAMADI", "Önce kürasyon stüdyosunu aç.");

        // Esere DAHIL edilen dilekler, kurulan sirayla
        var dilekler = await db.KurasyonOgeleri.AsNoTracking()
            .Where(o => o.KurasyonId == kurasyon.Id && o.Dahil)
            .OrderBy(o => o.Sira)
            .Join(db.Katkilar.AsNoTracking().Where(k => !k.SilindiMi),
                o => o.KatkiId, k => k.Id,
                (o, k) => new
                {
                    k.DavetliAd,
                    k.DavetliIliski,
                    k.Mesaj,
                    k.KaynakEs,
                    k.CreatedAt,
                    k.FotoAnahtari,
                    k.FotoGenislik,
                    k.FotoYukseklik,
                })
            .ToListAsync();

        if (dilekler.Count == 0)
            return Hata(400, "DILEK_YOK", "Esere en az bir dilek eklemelisin.");

        // Cift gorselleri (konumlara gore)
        var gorseller = await db.EtkinlikGorselleri.AsNoTracking()
            .Where(g => g.EtkinlikId == etkinlikId)
            .OrderBy(g => g.Sira)
            .ToListAsync();

        async Task<BaskiServisi.Gorsel?> GorselYukle(EtkinlikGorseli? g)
        {
            if (g == null) return null;
            var veri = await depo.OkuAsync(g.DepolamaAnahtari);
            if (veri == null) return null;

            // Eski kayitlarda olcu 0 olabilir (istemci-olcu bug'i oncesi). Bayttan coz -
            // yanlis olcu, cercevede beyaz bosluk demektir; buna izin verilmez.
            var gg = g.Genislik;
            var yy = g.Yukseklik;
            if (gg <= 0 || yy <= 0)
            {
                var olcu = GorselOlcer.Coz(veri);
                gg = olcu?.Genislik ?? 0;
                yy = olcu?.Yukseklik ?? 0;
            }
            return new BaskiServisi.Gorsel(veri, gg, yy);
        }

        var kapakG = await GorselYukle(gorseller.FirstOrDefault(g => g.Konum == "kapak"));
        var ithafG = await GorselYukle(gorseller.FirstOrDefault(g => g.Konum == "ithaf"));
        var kapanisG = await GorselYukle(gorseller.FirstOrDefault(g => g.Konum == "kapanis"));

        var bolumG = new List<BaskiServisi.Gorsel>();
        foreach (var g in gorseller.Where(g => g.Konum == "bolum"))
        {
            var y = await GorselYukle(g);
            if (y != null) bolumG.Add(y);
        }

        // Davetli fotograflari
        var dilekListe = new List<BaskiServisi.Dilek>();
        foreach (var d in dilekler)
        {
            byte[]? foto = null;
            var fg = d.FotoGenislik;
            var fy = d.FotoYukseklik;

            if (d.FotoAnahtari != null)
            {
                foto = await depo.OkuAsync(d.FotoAnahtari);
                if (foto != null && (fg <= 0 || fy <= 0))
                {
                    var olcu = GorselOlcer.Coz(foto);
                    fg = olcu?.Genislik ?? 0;
                    fy = olcu?.Yukseklik ?? 0;
                }
            }

            dilekListe.Add(new BaskiServisi.Dilek(
                d.DavetliAd, d.DavetliIliski, d.Mesaj, d.KaynakEs, d.CreatedAt, foto, fg, fy));
        }

        BaskiServisi.Hazirla(ortam.ContentRootPath);

        var eser = new BaskiServisi.EserVerisi(
            Tema: kurasyon.Tema,
            GruplamaTipi: kurasyon.GruplamaTipi,
            KapakBaslik: kurasyon.KapakBaslik ?? $"{etkinlik.Es1Ad} & {etkinlik.Es2Ad}",
            KapakAltBaslik: kurasyon.KapakAltBaslik ?? "",
            IthafMetni: kurasyon.IthafMetni,
            KapanisMetni: kurasyon.KapanisMetni,
            TarihGoster: kurasyon.TarihGoster,
            Es1Ad: etkinlik.Es1Ad,
            Es2Ad: etkinlik.Es2Ad,
            Dilekler: dilekListe,
            KapakGorseli: kapakG,
            IthafGorseli: ithafG,
            KapanisGorseli: kapanisG,
            BolumGorselleri: bolumG,
            Filigranli: onizleme);

        var pdf = BaskiServisi.DefterUret(eser);

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
            }),
            Filigranli = onizleme,
            DilekSayisi = dilekler.Count,
            OlusturanKullaniciId = kullaniciId,
            CreatedAt = DateTimeOffset.UtcNow,
        });
        await Denetim(db, etkinlikId, kullaniciId,
            onizleme ? "ESER_ONIZLENDI" : "ESER_INDIRILDI", kurasyon.Id,
            new { dilek_sayisi = dilekler.Count, tema = kurasyon.Tema });
        await db.SaveChangesAsync();

        var dosyaAdi = Temizle($"{etkinlik.Es1Ad}-{etkinlik.Es2Ad}-ani-defteri")
                       + (onizleme ? "-onizleme" : "") + ".pdf";

        return Results.File(pdf, "application/pdf", dosyaAdi);
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
