# BiAniBirak

Bir etkinligi (dugun / nisan / nikah) merkeze alan, davetlilerin QR/link ile dilek
biraktigi, toplananlari baskiya hazir bir hatira mirasina (defter + slayt) donusturen
multi-tenant, cok-sektorel SaaS/PWA uygulamasi.

Konumlandirma: ani toplayici degil, kurasyon studyosu. Toplama arac, MIRAS amac.

## Repo yapisi (monorepo)

```
bianibirak/
  frontend/                       Next.js 15 + TypeScript + Tailwind (PWA hazir)
  backend/                        (0B) .NET 8 API + EF Core + Npgsql
  deploy/
    caddy-bianibirak.caddy        Paylasilan Caddy'ye eklenecek additive site blogu
  docker-compose.production.yml   frontend (+0B: backend, postgres) - Caddy PAYLASILIR
  .env.example
```

## Onemli mimari not: Caddy PAYLASILIR

Bu sunucuda 80/443 mevcut (Notlar) Caddy'sindedir. BiAniBirak AYRI Caddy KURMAZ.
Kendi konteynerleri host'a port PUBLISH ETMEZ; paylasilan `notlar_default` agina
katilir ve mevcut `notlar_caddy` onlara konteyner ADIYLA proxy'ler. TLS'i paylasilan
Caddy yonetir. Detay: `deploy/caddy-bianibirak.caddy`.

## Lokal build (deploy oncesi ZORUNLU)

Frontend:
```
cd frontend
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
npm install
npm run build
```
Basari = sayfa listesi + "Compiled successfully".

## Deploy (paylasilan sunucu, additive)

Sunucuda `/opt/bianibirak` altinda git pull + compose up. Detay proje kilavuzunda.
