using System.Text.Json;
using BiAniBirak.Api.Data;
using BiAniBirak.Api.Entities;
using Microsoft.EntityFrameworkCore;
using WebPush;

namespace BiAniBirak.Api.Servisler;

// Web Push gonderim servisi (Planlama deseni). Bir kullanicinin tum abone cihazlarina
// gonderir; gecersiz (410/404) abonelikleri otomatik temizler; sessiz saatte erteler;
// her gonderimi denetim_gunlukleri'ne yazar.
public class PushGonderici
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IConfiguration _config;
    private readonly ILogger<PushGonderici> _log;
    private readonly WebPushClient _client = new();

    public PushGonderici(IServiceScopeFactory scopeFactory, IConfiguration config, ILogger<PushGonderici> log)
    {
        _scopeFactory = scopeFactory;
        _config = config;
        _log = log;
    }

    // Kullaniciya push gonder. sessizSaateTabi=true -> sessiz aralikta ertele.
    // etkinlikId audit + erteleme tenant izolasyonu icin.
    public async Task GonderAsync(
        Guid kullaniciId, string baslik, string govde, string? url = null,
        Guid? etkinlikId = null, bool sessizSaateTabi = true, CancellationToken ct = default)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<BiAniBirakDbContext>();

        // UYGULAMA-ICI BILDIRIM (avatar cani): push izninden ve sessiz saatten BAGIMSIZ.
        // Her zaman olusur; kullanici uygulamayi acinca gorur. Push sadece "anlik haber verme".
        db.Bildirimler.Add(new Bildirim
        {
            Id = Guid.NewGuid(),
            KullaniciId = kullaniciId,
            EtkinlikId = etkinlikId,
            Tip = BildirimTipi(url),
            Baslik = baslik,
            Mesaj = govde,
            Url = url,
            OkunduMu = false,
            CreatedAt = DateTimeOffset.UtcNow,
        });
        await db.SaveChangesAsync(ct);

        var pub = _config["Vapid:PublicKey"];
        var priv = _config["Vapid:PrivateKey"];
        var subject = _config["Vapid:Subject"] ?? "mailto:destek@dentlogicapp.com";
        if (string.IsNullOrWhiteSpace(pub) || string.IsNullOrWhiteSpace(priv))
        {
            _log.LogWarning("Push gonderilemedi: VAPID anahtarlari yapilandirilmamis.");
            return;
        }
        var vapid = new VapidDetails(subject, pub, priv);

        // Sessiz saat kontrolu -> ertele (yalniz PUSH ertelenir; can bildirimi yukarida dustu)
        if (sessizSaateTabi)
        {
            var k = await db.Kullanicilar.AsNoTracking()
                .Where(x => x.Id == kullaniciId)
                .Select(x => new { x.SessizSaatAktif, x.SessizSaatBaslangic, x.SessizSaatBitis })
                .FirstOrDefaultAsync(ct);
            if (k is not null && k.SessizSaatAktif &&
                SessizSaatteMi(k.SessizSaatBaslangic, k.SessizSaatBitis))
            {
                db.ErtelenenBildirimler.Add(new ErtelenenBildirim
                {
                    Id = Guid.NewGuid(),
                    EtkinlikId = etkinlikId,
                    KullaniciId = kullaniciId,
                    Baslik = baslik,
                    Govde = govde,
                    Url = url,
                    CreatedAt = DateTimeOffset.UtcNow,
                });
                await db.SaveChangesAsync(ct);
                return;
            }
        }

        // Yalniz Web Push abone cihazlar (p256dh + auth dolu)
        var cihazlar = await db.Cihazlar
            .Where(c => c.KullaniciId == kullaniciId && c.PushP256dh != null && c.PushAuth != null)
            .ToListAsync(ct);
        if (cihazlar.Count == 0) return;

        var payload = JsonSerializer.Serialize(new
        {
            title = baslik,
            body = govde,
            data = new { url },
        });

        var basarili = 0;
        var gecersizler = new List<Cihaz>();
        foreach (var c in cihazlar)
        {
            try
            {
                var sub = new PushSubscription(c.PushToken, c.PushP256dh, c.PushAuth);
                await _client.SendNotificationAsync(sub, payload, vapid);
                basarili++;
            }
            catch (WebPushException ex)
            {
                var kod = (int)ex.StatusCode;
                if (kod == 410 || kod == 404) gecersizler.Add(c); // gecersiz abonelik -> temizle
                else _log.LogWarning(ex, "Push hatasi (cihaz {CihazId}, kod {Kod})", c.Id, kod);
            }
            catch (Exception ex)
            {
                _log.LogError(ex, "Push beklenmeyen hata (cihaz {CihazId})", c.Id);
            }
        }

        if (gecersizler.Count > 0)
        {
            db.Cihazlar.RemoveRange(gecersizler);
            await db.SaveChangesAsync(ct);
        }

        // Teslimat denetimi (append-only audit)
        db.DenetimGunlukleri.Add(new DenetimGunlugu
        {
            Id = Guid.NewGuid(),
            EtkinlikId = etkinlikId,
            KullaniciId = kullaniciId,
            Eylem = "PUSH_GONDERILDI",
            Varlik = "cihazlar",
            VarlikId = kullaniciId,
            DegisenAlanlar = JsonSerializer.Serialize(new
            {
                baslik,
                cihaz_sayisi = cihazlar.Count,
                basarili,
                temizlenen = gecersizler.Count,
            }),
            CreatedAt = DateTimeOffset.UtcNow,
        });
        await db.SaveChangesAsync(ct);
    }

    // TR saati (UTC+3) ile sessiz saat araliginda miyiz? Gece yarisi gecisini destekler.
    // Bildirim tipi: url'e gore basit siniflandirma (frontend ikon/renk icin).
    private static string BildirimTipi(string? url)
    {
        if (string.IsNullOrWhiteSpace(url)) return "sistem";
        if (url.Contains("/gelen-dilekler")) return "katki";
        return "sistem";
    }

    public static bool SessizSaatteMi(string? baslangic, string? bitis)
    {
        if (!TimeOnly.TryParse(baslangic, out var bas) || !TimeOnly.TryParse(bitis, out var bit))
            return false;
        var simdi = TimeOnly.FromDateTime(DateTime.UtcNow.AddHours(3));
        if (bas == bit) return false;
        if (bas < bit) return simdi >= bas && simdi < bit;   // ayni gun
        return simdi >= bas || simdi < bit;                  // gece yarisi gecisi
    }
}
