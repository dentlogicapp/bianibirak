// BiAniBirak.Api - giris noktasi.
// Asama 4: kimlik cekirdegi (JwtBearer + host-scoped cerez okuma) + servis kayitlari.
using System.Text;
using BiAniBirak.Api.Data;
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
builder.Services.AddSingleton(new JwtServisi(jwtGizli!, jwtYayinci, jwtHedef, jwtGun));

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
    app.Logger.LogInformation("Idempotent sema uygulandi (kullanicilar, denetim_gunlukleri, etkinlikler, etkinlik_uyelikleri, uye_davetleri).");
}

app.UseAuthentication();
app.UseAuthorization();

app.KimlikUclariniEkle();
app.EtkinlikUclariniEkle();
app.KatkiUclariniEkle();
app.CihazUclariniEkle();
app.BildirimUclariniEkle();

// Saglik ucu (anonim)
app.MapGet("/api/saglik", () => Results.Ok(new
{
    durum = "ayakta",
    servis = "BiAniBirak.Api",
    zaman = DateTimeOffset.UtcNow
}));

app.Run();
