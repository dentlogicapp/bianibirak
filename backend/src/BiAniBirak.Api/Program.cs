// BiAniBirak.Api - giris noktasi.
// Asama 4: kimlik cekirdegi (JwtBearer + host-scoped cerez okuma) + servis kayitlari.
using System.Text;
using BiAniBirak.Api;            // Sabitler (yasam dongusu gun sayilari)
using BiAniBirak.Api.Data;
using BiAniBirak.Api.Entities;
using BiAniBirak.Api.Kimlik;
using BiAniBirak.Api.Servisler;
using BiAniBirak.Api.Uclar;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

// --- Postgres (env: ConnectionStrings__Postgres; compose Asama 7) ---
var postgresBaglanti = builder.Configuration.GetConnectionString("Postgres");
builder.Services.AddDbContext<BiAniBirakDbContext>(secenek => secenek.UseNpgsql(postgresBaglanti));

// --- JWT ayarlari (env: Jwt__Secret / Jwt__Issuer / Jwt__Audience / Jwt__GecerlilikGun) ---
var jwtGizli = builder.Configuration["Jwt:Secret"];
var jwtGizliEksik = string.IsNullOrWhiteSpace(jwtGizli);
if (jwtGizliEksik)
{
    // Yalniz lokal gelistirme icin gecici; uretimde env ZORUNLU (asagida uyari loglanir).
    jwtGizli = "GELISTIRME-GECICI-ANAHTAR-URETIMDE-ENV-ILE-DEGISTIR-0123456789";
}
var jwtYayinci = builder.Configuration["Jwt:Issuer"] ?? "bianibirak";
var jwtHedef = builder.Configuration["Jwt:Audience"] ?? "bianibirak";
var jwtGun = int.TryParse(builder.Configuration["Jwt:GecerlilikGun"], out var g) ? g : 7;

// --- Servisler ---
builder.Services.AddSingleton<SifreServisi>();
builder.Services.AddSingleton<HizSiniri>();
builder.Services.AddSingleton<PushGonderici>();

// IMHA GOREVI - kapanis + SaklamaGun sonrasi tam imha (Belge 08).
// Saatlik calisir, idempotent. KVKK taahhudumuzun kodla karsiligi.
builder.Services.AddHostedService<ImhaGorevi>();

// HATIRLATMA GOREVI - indirme takvimi (+2, +10, +15, +20, +25, +30, son hafta her gun).
// Kimse mirasini "hatirlatilmadi" diye kaybetmesin.
builder.Services.AddHostedService<HatirlatmaGorevi>();

// ODEME SURE GOREVI: bekleyen odemenin gecerliligi dolunca "suresi_doldu"ya ceker.
// Olu kayitlar birikmesin, cift eski fiyatla odemeye kalkmasin.
builder.Services.AddHostedService<OdemeSureGorevi>();
builder.Services.AddHostedService<CopTemizlemeGorevi>();
builder.Services.AddHostedService<DiskGozcusu>();
builder.Services.AddHostedService<DestekTemizlemeGorevi>(); // 7 gun sessizlikte kapat, 24 saat sonra sil   // disk %75/85/92 esiklerinde super admin uyarisi
builder.Services.AddSingleton(new JwtServisi(jwtGizli!, jwtYayinci, jwtHedef, jwtGun));
builder.Services.AddSingleton<DepolamaServisi>();

// --- Kimlik dogrulama: JwtBearer (Authorization header VEYA host-scoped cerez) ---
builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(secenek =>
    {
        secenek.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = jwtYayinci,
            ValidateAudience = true,
            ValidAudience = jwtHedef,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtGizli!)),
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromMinutes(1),
        };
        // Native: Authorization: Bearer. Web: host-scoped cerez (CerezYardimcisi).
        secenek.Events = new JwtBearerEvents
        {
            OnMessageReceived = baglam =>
            {
                if (string.IsNullOrEmpty(baglam.Token) &&
                    baglam.Request.Cookies.TryGetValue(CerezYardimcisi.CerezAdi, out var cerez))
                {
                    baglam.Token = cerez;
                }
                return Task.CompletedTask;
            },
        };
    });

builder.Services.AddAuthorization();

var app = builder.Build();

if (jwtGizliEksik)
{
    app.Logger.LogWarning(
        "Jwt:Secret env'de yok - GELISTIRME anahtari kullaniliyor. Uretimde Jwt__Secret ZORUNLU.");
}

// Idempotent sema: baglanti verildiginde her acilista guvenle uygulanir.
if (!string.IsNullOrWhiteSpace(postgresBaglanti))
{
    using var kapsam = app.Services.CreateScope();
    var db = kapsam.ServiceProvider.GetRequiredService<BiAniBirakDbContext>();
    SemaKurucu.Uygula(db);

    // YASAL METINLER - idempotent seed. Bos bir veritabaninda kimse kaydolamazdi:
    // onaylanacak metin yoktu. Metin VARSA dokunulmaz (super panelden yapilan
    // duzenleme restart'ta ezilmez).
    await YasalMetinler.SeedAsync(db);
    await SssTohumu.TohumlaAsync(db);   // bilgi tabani ilk hali (tablo bossa)

    app.Logger.LogInformation("Idempotent sema uygulandi + yasal metinler hazir.");
}

app.UseAuthentication();
app.UseAuthorization();

// ============ GORUNTULEME MODU YAZMA KORUMASI (OWASP A01) ============
// Super admin baska bir ani defterine SALT-OKUNUR girer. Otorite JWT claim'idir
// (goruntuleme_modu=true); frontend header'ina ASLA guvenilmez.
// Yazma metodu + tenant yolu -> 403 + audit (adli iz).
// Istisnalar (kilitlenme onleme):
//   /api/super/*  -> goruntulemeyi bitirebilmeli + super admin islemleri serbest
//   /api/kimlik/* -> giris/cikis kimlik islemi; tenant verisi yazimi degil
app.Use(async (ctx, sonraki) =>
{
    if (ctx.User?.FindFirst("goruntuleme_modu")?.Value == "true")
    {
        var metot = ctx.Request.Method;
        var yazma = HttpMethods.IsPost(metot) || HttpMethods.IsPut(metot)
                    || HttpMethods.IsPatch(metot) || HttpMethods.IsDelete(metot);

        var yol = ctx.Request.Path.Value ?? string.Empty;
        var superYolu = yol.StartsWith("/api/super", StringComparison.OrdinalIgnoreCase);
        var kimlikYolu = yol.StartsWith("/api/kimlik", StringComparison.OrdinalIgnoreCase);

        if (yazma && !superYolu && !kimlikYolu)
        {
            // Adli iz: yazma denemesi audit'e yazilir (Belge 08 - impersonation her zaman audit'e).
            using var kapsam = ctx.RequestServices.CreateScope();
            var db = kapsam.ServiceProvider.GetRequiredService<BiAniBirakDbContext>();
            Guid.TryParse(ctx.User.FindFirst("sub")?.Value, out var aktorId);
            Guid.TryParse(ctx.User.FindFirst("aktif_etkinlik_id")?.Value, out var hedefId);
            db.DenetimGunlukleri.Add(new DenetimGunlugu
            {
                Id = Guid.NewGuid(),
                EtkinlikId = hedefId == Guid.Empty ? null : hedefId,
                KullaniciId = aktorId == Guid.Empty ? null : aktorId,
                Eylem = "GORUNTULEME_YAZMA_ENGELLENDI",
                Varlik = "sistem",
                DegisenAlanlar = System.Text.Json.JsonSerializer.Serialize(new { metot, yol }),
                CreatedAt = DateTimeOffset.UtcNow,
            });
            await db.SaveChangesAsync();

            ctx.Response.StatusCode = 403;
            await ctx.Response.WriteAsJsonAsync(new
            {
                hata = "GORUNTULEME_MODU",
                mesaj = "Görüntüleme modundasın - bu defterde değişiklik yapamazsın.",
            });
            return;
        }
    }
    await sonraki();
});

app.KimlikUclariniEkle();
app.EtkinlikUclariniEkle();
app.KatkiUclariniEkle();
app.CihazUclariniEkle();
app.BildirimUclariniEkle();
app.DavetUclariniEkle();
app.SuperUclariniEkle();
app.OnayUclariniEkle();          // Onay: eksik onay tespiti, tek seferlik modal, davetli metni
app.SuperTeshisUclariniEkle();   // Teshis: saglik skoru, defter detayi, olcum, rontgen
app.KurasyonUclariniEkle();
app.GorselUclariniEkle();
app.DavetiyeKarekodumUclariniEkle(); // Davetiye karekodu: ciftin kendi kisa kodu + /d/{kod} cozumleme
app.OdemeUclariniEkle();         // Odeme: durum, MSS/On Bilgilendirme, baslat, "havalemi yaptim"
app.SuperOdemeUclariniEkle();    // Super: odeme onayla/reddet, IBAN+fiyat ayarlari
app.CopUclariniEkle();           // Cop kutusu: reddedilen dilekler, geri al, kalici sil
app.DestekUclariniEkle();        // Destek: kullanici <-> super yonetici konusmasi

// SAGLIK UCU
//
// Anonim cagrida yalniz "ayakta miyim" bilgisi doner - bu, dis izleme araclarinin
// (uptime monitor) gormesi gereken tek seydir ve hicbir ic bilgi sizdirmaz.
//
// SUPER ADMIN cagirdiginda AYRINTI acilir: veritabani gercekten yanit veriyor mu,
// disk ne durumda, imha gorevi calisiyor mu, gecikmis is var mi. Boylece "sistem
// ayakta mi?" sorusu TAHMINLE degil OLCUMLE yanitlanir - ve bunun icin sunucuya
// SSH atmak gerekmez.
//
// Ayri bir uc ACILMADI: tek adres, iki derinlik. Iki uc olsaydi biri gunceltilir,
// digeri unutulur ve ikisi farkli sey soylerdi.
app.MapGet("/api/saglik", async (HttpContext ctx, BiAniBirakDbContext db, DepolamaServisi depo) =>
{
    var temel = new
    {
        durum = "ayakta",
        servis = "BiAniBirak.Api",
        zaman = DateTimeOffset.UtcNow,
    };

    // Super admin mi? Degilse temel yanit yeter.
    Guid.TryParse(ctx.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value,
        out var kid);
    var superMi = kid != Guid.Empty && await db.Kullanicilar.AsNoTracking()
        .AnyAsync(k => k.Id == kid && k.SuperAdmin && k.DeletedAt == null);
    if (!superMi) return Results.Ok(temel);

    // --- AYRINTI ---
    var simdi = DateTimeOffset.UtcNow;

    // Veritabani GERCEKTEN yanit veriyor mu - baglanti havuzu "acik" gorunup sorgu
    // takilabilir. Bir sorgu calistirmadan "iyi" demek, olcum degil varsayimdir.
    bool dbTamam;
    long dbMs = 0;
    try
    {
        var sayac = System.Diagnostics.Stopwatch.StartNew();
        _ = await db.Etkinlikler.AsNoTracking().CountAsync();
        sayac.Stop();
        dbMs = sayac.ElapsedMilliseconds;
        dbTamam = true;
    }
    catch { dbTamam = false; }

    // Disk - DiskGozcusu ile AYNI olcum kaynagi.
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
            diskBos = $"{Math.Round(enIyi.AvailableFreeSpace / 1024.0 / 1024.0 / 1024.0, 1)} GB";
        }
    }
    catch { /* olculemezse "-" gorunur */ }

    // IMHA GOREVI CALISIYOR MU?
    // "Suresi dolmus ama hala duran" defter varsa gorev ya durmustur ya hata aliyordur.
    // Bu, sessizce birikip diski dolduran en tehlikeli arizadir - fark edilmesi gerekir.
    var imhaGecikmis = await db.Etkinlikler.CountAsync(e =>
        !e.ImhaEdildi && !e.SilindiMi &&
        e.KapanisTarihi.AddDays(Sabitler.SaklamaGun) <= simdi);
    var sonImha = await db.Etkinlikler.AsNoTracking()
        .Where(e => e.ImhaZamani != null)
        .OrderByDescending(e => e.ImhaZamani)
        .Select(e => e.ImhaZamani)
        .FirstOrDefaultAsync();

    return Results.Ok(new
    {
        temel.durum,
        temel.servis,
        temel.zaman,
        veritabani = new { tamam = dbTamam, yanit_ms = dbMs },
        disk = new { yuzde = diskYuzde, bos = diskBos },
        imha = new { gecikmis = imhaGecikmis, son_calisma = sonImha },
        bekleyen = new
        {
            destek = await db.DestekTalepleri.CountAsync(t => t.Durum == "acik"),
            odeme = await db.Odemeler.CountAsync(o => o.Durum == "bekliyor"),
        },
    });
});

app.Run();
