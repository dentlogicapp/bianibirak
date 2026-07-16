// BiAniBirak.Api - giris noktasi.
// Asama 4: kimlik cekirdegi (JwtBearer + host-scoped cerez okuma) + servis kayitlari.
using System.Text;
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

// Saglik ucu (anonim)
app.MapGet("/api/saglik", () => Results.Ok(new
{
    durum = "ayakta",
    servis = "BiAniBirak.Api",
    zaman = DateTimeOffset.UtcNow
}));

app.Run();
