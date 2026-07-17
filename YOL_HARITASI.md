# BiAnıBırak - Yol Haritası & Karar Günlüğü

> Bu dosya, oturumlar arası SÜREKLİLİK içindir. Instruction (kalıcı çerçeve) DEĞİL;
> projenin GÜNCEL yol haritası + alınan kararlar + biten işler + açık konular + pahalı
> öğrenilen dersler. Her önemli karardan sonra güncellenir. Güncel kod durumu daima
> repodan; bu dosya "neden / ne kararlaştırıldı / sırada ne var" hafızasıdır.

**Son güncelleme: 2026-07-17** — DAVETİYE KAREKODU (Aşama 1) tamamlandı ve canlıda.
Ödeme (havale) kodu yazıldı, canlıda ama **inert** (Aktif=false). Menü isimleri
kullanıcı-dostu hale getirildi. **Sırada: Aşama 2 (Defter künyesi) veya ödeme (hukuki
statü netleşince).**

Canlı: https://bianibirak.dentlogicapp.com

---

## 0. EN KRİTİK AÇIK KARARLAR — HER OTURUMDA HATIRLATILACAK

### ⚠ A) KAYNAK FOTOĞRAF ÇÖZÜNÜRLÜĞÜ: 1600px → 2400px?

> **Musa'nın talimatı (2026-07-13):** *"Bu öneriyi yol haritasının SON ADIMI olarak
> ısrarla hatırlat. Ben deneme çıktılarını alıp karşılaştırdıktan sonra nihai kararı
> vereceğim."*

**Mevcut durum:** `frontend/lib/gorsel.ts` → `AZAMI_KENAR = 1600`, `KALITE = 0.88`.

| Boyut | Foto çözünürlüğü | Durum |
|---|---|---|
| A5 | 430 DPI | Fazlasıyla yeterli |
| A4 | 303 DPI | Baskı standardının tam üstünde |
| A3 | **214 DPI** | **Standardın ALTINDA — fotoğraflar yumuşar** |

**Öneri:** 2400px → A3 de 321 DPI. **Bedeli:** dosyalar ~2 kat (16→35 MB geçici, 37 gün).
**Etki:** tüm yükleme akışı. **KARAR BEKLİYOR** — deneme baskısı karşılaştırması. Matbaa
deneme baskısı (Hafta 2) bu kararla birlikte yapılmalı.

### ⚠ B) HUKUKİ STATÜ — ÖDEMENİN ÖN ŞARTI

> **Musa sigortalı kamu işinde çalışıyor.** 657 sayılı Kanun m.28 memur ticaret yasağı:
> şahıs şirketi / ticari kazanç yasak. GVK 20/B (App Store IAP vergi istisnası) bile
> kurtarmaz (o da ticari kazanç). Aile üyesi adına şirket fiili duruma bakılırsa korumaz
> (Danıştay içtihadı).

**Statü SORULDU, HENÜZ NET DEĞİL:**
- Memur (4/c) → ticaret yasak
- Kamu işçisi (4/a) → 657 uygulanmaz ama kurum yönetmeliği / TİS yasaklayabilir
- Sözleşmeli (4/B) → ayrı değerlendirme

**PENDING (Musa):** (1) kesin statüyü netleştir, (2) idare hukukçusu + mali müşavir görüşü —
**ödeme AÇILMADAN ÖNCE.** Ödeme kodu hazır ve inert bekliyor; statü çözülene kadar
kimseye ödeme gösterilmez. **HER OTURUMDA HATIRLAT.**

---

## 1. ÜRÜN KURALLARI — İHLAL EDİLEMEZ

### KURAL A — ÖDEME ÖNCE, DÜRÜSTLÜK SONRA `[2026-07-13]`
İndir butonu ÖNCE ödeme, SONRA boyut+uyarı ekranı, EN SON indirme. Ödeme öncesi hiçbir
"ama" / DPI tablosu gösterilmez (kararsız çifti caydırır). Dürüstlük satın alma SONRASI
doğru kullanım rehberidir. **Havale akışında bu kuruldu; `BoyutSecimi` modalı ödeme
sonrasına taşındı (KURAL A akışı frontend'de aktif).**

### KURAL B — FİLİGRAN YASAK `[2026-07-13]`
Filigran kilit değil hız tümseği; AI siler + dosya zaten elde. Yerine ÇÖZÜNÜRLÜK:
önizleme 96 DPI (PDF hiç üretilmez), indirme 300 DPI. Filigran ürünü çirkinleştirir →
arzuyu düşürür. **Not:** Davetiye/defter marka künyesi (karekod + logo) bu kurala AYKIRI
DEĞİL — o ödeme dayatan bir filigran değil, mirasın tasarlanmış kalıcı parçası; ürünü
tamamlar, bozmaz.

### KURAL C — PAYWALL ÇİZGİSİ
Ücretsiz: dilek toplama, defter kurma/düzenleme, kürasyon, tam önizleme (96 DPI).
Ücretli: yalnızca baskıya hazır PDF indirme (`/api/etkinlik/aktif/kurasyon/defter.pdf`).

### KURAL D — ZAMAN MODELİ TEK KANON
`Sabitler.cs`: ToplamaGun=30, IndirmeGun=7, ToplamGun=37. İmha = etkinlik + 37 gün.

### KURAL E — SÜPER ADMİN EYLEMLERİ ÇİFTİN DENETİMİNDE GÖRÜNMEZ
`denetim_gunlukleri.SistemEylemi` yaz-sabit + oku-filtre. Süper panel yine görür.
İstisna: `ODEME_ONAYLANDI` → SistemEylemi=false (çift güven duysun); `ODEME_REDDEDILDI` → true.

---

## 2. NEREDEYİZ — Biten İşler (canlı, doğrulandı)

### Temel katmanlar
- **Kimlik** — kayıt/giriş/çıkış/ben, JWT + bcrypt, host-scoped çerez, append-only audit
- **Tenant çekirdeği** — TENANT = ETKİNLİK. `etkinlikler` + `etkinlik_uyelikleri`
  (rol: es1/es2) + `uye_davetleri`. JWT'de `aktif_etkinlik_id`.
- **Çift-link izolasyonu (WEDGE)** — her eşin AYRI token'ı. Katkı `KaynakEs` etiketli,
  YALNIZ ilgili eşin kuyruğuna düşer. Bir eş diğerinin onaysız kuyruğunu göremez.
- **Davetli katkı** — public `/k/{token}`, login YOK, PII zorunlu değil. Pencere kontrolü,
  rate limit, EXIF/GPS silme.
- **Moderasyon** — onayla/reddet. Çift katkı metnini düzenleyemez. Red bildirilmez.
- **Push** — VAPID web push, sessiz saat. **PWA** — sw.js, manifest, ikonlar.
- **Süper panel** — impersonation (JWT claim otoritesi), iki aşamalı silme, dondurma,
  moderasyon, canlı akış, son-süper-admin koruması, teşhis (DefterDetay, olçum, röntgen).

### Aşama 6 — KÜRASYON STÜDYOSU + MİRAS ÇIKTISI ✓
- QuestPDF (backend .NET), gerçek tipografi (Fraunces/Inter self-host TTF), cilt payı.
- `DefterDerleyici` — PDF üretiminin TEK kaynağı. Kürasyon (seçim/sıra/tema/kapak/ithaf).

### Yaşam döngüsü, hatırlatma, hukuki onay ✓
- `ImhaGorevi` (kapanış+37 tam imha, dosyalar EN SON, PII-free sistem kaydı).
- `HatirlatmaGorevi` (13 bildirimlik takvim, +37 SON GÜN sabah).
- **Hukuki onay sistemi** — metin kataloğu (`sistem_metinleri`, kapsam es/davetli),
  sürüm arşivi (hash→metin), onay kayıtları (append-only, IP+tarayıcı), Onay Kapısı
  (geçilemez modal), Kanıt PDF'i, KVKK Yönetimi (süper panel).

### Filigran kaldırma + fotoğraf kalitesi + boyut seçimi ✓
- `Filigranli` DROP, `OnizlemeServisi` (GenerateImages 96 DPI, PDF üretilmez, önbellek).
- `UseOriginalImage()` (çifte sıkıştırma = nesil kaybı fix), ImageRasterDpi=300.
- Boyut A5/A4/A3 (`.Scale()`, ISO 216 tek katsayı, margin de ölçeklenir). Önerilen = A4.

### ★ DAVETİYE KAREKODU (Aşama 1) — TAMAMLANDI, CANLIDA `[2026-07-17]`
Menüde **"Davetiyene QR Kodu Ekle"**. Çift, davetiyesine basacağı QR'ı üretir, önizler,
matbaaya WhatsApp ile gönderir.

**Fonsuz lockup (marka bloğu):** wordmark + "Senden Bize Kalan" + yaldız çizgi + karekod.
Hiçbir arka plan yok (şeffaf) — davetiyeye/deftere doğrudan bırakılır, fonu davetiyeden
alır. TEK işlevsel istisna: karekodun altındaki beyaz pul (okunurluk; koyu davetiyede
şeffaf QR okunmaz). ÇAĞRI METNİ YOK.
- **"Anı" şaraba EN UZAK tonda** (animasyonun en parlak ucu): açık #c4a25e, koyu #d4af6a.
  Bi/Bırak = şarap (açık #6e2438, koyu #c17a4a). Kağıtta animasyon yok, sabit durur.
- **Otomatik tema:** davetiye zemininin parlaklığından açık/koyu kendiliğinden seçilir
  (manuel tema toggle KALDIRILDI). Eşik: perceived luminance < 0.58 → koyu.

**Kısa link (küçük baskıda okunurluk):** karekod uzun token değil `/d/{KisaKod}` taşır
(az modül = küçükken okunur). `PaylasimBaglantisi.KisaKod` (nullable, tembel atanır,
`KisaKodUreteci` 5 karakter, karışmayan alfabe "ACDEFGHJKMNPQRTUVWXY34679"). `/d/{kod}`
frontend sayfası kodu tokene çözüp `/k/{token}`e yönlendirir (markalı splash). Kısa link
frontend'de `${origin}/d/{kisaKod}` kurulur — domain değişince otomatik döner.

**Formatlar (geniş yelpaze):** SVG (vektör/matbaa), PNG+WEBP (şeffaf), JPG (beyaz zemin),
PDF. Hepsi TEK ZIP'te. **WEBP "(önerilen)"** etiketli (şeffaf+küçük+yüksek kalite;
matbaa profesyoneli zaten doğru formatı seçer). Raster **8× ölçek** (~2400px, 6cm baskıda
~760 DPI — standardın kat kat üstü). **Para maliyeti YOK** — tüm üretim tarayıcıda
(client-side), sunucu/depolama yok.

**SVG slogan OUTLINE (font-bağımsız):** "SENDEN BİZE KALAN" Inter SemiBold ile önceden
path'e çevrilip sabit gömüldü (`SLOGAN_PATH`, fonttools ile offline üretildi). Matbaada
Inter olmasa bile SVG'de yazı birebir aynı görünür. Wordmark zaten vektördü; rasterlar
canvas fillText ile font-gömülü.

**Premium önizleme (örnek davetiye üstünde):** altın çift çerçeve, GERÇEK eş isimleri +
GERÇEK tarih (etkinlik verisinden; tarih yatay "01 Eylül 2026 · Salı" yaldız çizgiler
arasında). Çiçek/botanik KALDIRILDI (Musa isteği; isim+mesaj puntoları büyütüldü).
- **Sınırsız zemin rengi** — native renk seçici (petek/spektrum). Hazır swatch YOK.
- **Sürükle + boyutlandır** — karekod pointer ile taşınır (iç çerçeve dışına taşmaz;
  clamp), boyut kaydırıcısı (%16-56); boyutta merkez korunur.
- **JPG dürüst önizleme** — (formatta seçilirse) beyaz zemin gösterilir. (Format seçici
  UI kaldırıldı; formatlar yönergede yazılı.)

**PAYLAŞIMLI ÖNİZLEME + YAKIN-CANLI SENKRON:** `davetiye_onizleme` tablosu (etkinlik başına
tek satır, ortak). İki eş ayni taslağı düzenler; değişiklik ~3 sn'de (polling) diğerine
yansır — telefonda konuşurken birlikte karar. **Otomatik kaydet** ("Kaydediliyor→Kaydedildi
✓ · eşinizin ekranına da yansır"), **"Eşiniz düzenliyor…"** izi. Son düzenleyenin hali
kalıcı. `GET/PUT /api/etkinlik/aktif/davetiye-onizleme`. **NOT:** proje SSE/canlı-push
altyapısı YOK (mevcut push = Web Push bildirimi); bu yüzden polling seçildi. **Aynı hesap
çoklu cihaz da senkron olur** (uygula-koşulu rol'e göre değil, sadece "daha yeni"ye göre).

**İki karekod tek gönderim (matbaa):** Gönder butonu HER İKİ eşin karekodunu iki ayrı ZIP
olarak birlikte paylaşır (`navigator.share` çoklu dosya): `{Ad}_davetiye_karekodum_{tema}.zip`
(Türkçe ASCII'ye çevrilir, matbaada karışmaz). WhatsApp dosya paylaşımı yalnız mobil
`navigator.share` destekli yerde; masaüstünde iki ZIP iner + WhatsApp Web açılır.
**İzolasyon ihlali DEĞİL** — KisaKod public link, onaysız kuyruk değil.
`GET /api/etkinlik/aktif/davetiye-karekodum` → iki KisaKod + iki isim.

**Premium işaretçi ipuçları:** el emojisi yerine markaya uygun pointer (Lucide). Sürükle/
boyut/renk için üç ipucu; tema-duyarlı renk (her zaman görünür). Her birine bir kez
dokununca kaybolur (cihaz başına localStorage), "Önizlemeyi sıfırla" geri getirir.

**Diğer:** sarı yanıp sönen önemli uyarı (tek taraf / iki ayrı davetiye), üst bar geri-git
deseni (AppShell hiyerarşi), yönerge iki yana yaslı.

**Dosyalar** — Backend: `Entities/{PaylasimBaglantisi(+KisaKod), DavetiyeOnizleme}`,
`Servisler/KisaKodUreteci`, `Uclar/DavetiyeKarekodumUclari`, `Data/{DbContext,SemaKurucu}`.
Frontend: `app/panel/davetiye-karekodum/page.tsx`, `app/d/[kod]/page.tsx`,
`lib/{lockup,indir,api}.ts`, `components/site/{AppShell,UserMenu}`. Paketler: `jspdf`,
`jszip`, `qrcode`.

### ★ ÖDEME (HAVALE) — YAZILDI, CANLIDA ama İNERT `[2026-07-17]`
Kod canlıda ama `odeme_ayarlari` 0 satır → `OdemeServisi.IndirmeYetkisiVarMiAsync` "açık"
döner (acil kol: herkes indirir) → **kimseye ödeme gösterilmez.** Hukuki statü (Bölüm 0-B)
netleşince ayar satırı IBAN+fiyatla oluşturulup açılacak.
- `Entities/{Odeme, OdemeAyari}`, `Servisler/{OdemeServisi, OdemeSureGorevi, ReferansUreteci}`
  (BAB-XXXXX referans, karışmayan alfabe), `Uclar/{OdemeUclari, SuperOdemeUclari}`,
  `KurasyonUclari` paywall guard (402 ODEME_GEREKLI, Aktif=false iken true döner).
- Havale akışı: MSS + Ön Bilgilendirme (kapsam="odeme"), **cayma hakkı YOK** (6502 m.15 +
  Yönetmelik 15/1-ğ, anında ifa). `OdemeSureGorevi` (saatlik, süresi_doldu).
- **KİRİK KOD DERSİ:** ödeme kodu ilk deploy'da derlenmedi — `OnayServisi.ZorunluMetinlerAsync`
  iki yerde `(kapsam, db, ct)` çağrılmıştı; doğru imza `(db, kapsam, ct)`. Cross-service
  imzalar tek tek doğrulandı. (Bkz. Ders 22.)
- **Fiyat önerisi: 2.490₺** (999₺ değil — tek-seferlik miras için düşük). Kesinleşmedi.

### ★ MENÜ İSİMLERİ — KULLANICI-DOSTU `[2026-07-17]`
Teknolojiyle arası zayıf çift bile anlasın diye (avatar menü + AppShell üst bar tutarlı):
Defter→**Gelen Dilekler** · Baskı Stüdyosu→**Baskıya Hazır Defter** · Paylaşım→**Dilek
Bağlantısını Paylaş** · Davetiye Karekodum→**Davetiyene QR Kodu Ekle** · Yönetim→**Ayarlar**.
Fotoğraflar ve Süper Panel aynen.

---

## 3. SIRADAKİ İŞLER

### ▶ AŞAMA 2 — DEFTER KÜNYESİ `[SIRADA — önerilen bir sonraki iş]`
Aşama 1'in lockup altyapısı doğrudan taşınır. Defterin ilk ve son iç sayfasına gömülü
marka künyesi:
- Lockup: wordmark + "Senden Bize Kalan" + yaldız çizgi + karekod. "Anı" yaldız tonda.
- Karekodun TAM ALTINA domain: **www.bianibirak.com** ("Senden Bize Kalan" font/yapısıyla,
  www./.com sarması wordmark'ı sarmaz — düz yazı). Karekod marka adresine gider.
- **Otomatik tema kancası CANLI kurulacak** — defter sayfa fon rengine göre açık/koyu
  lockup kendiliğinden. (Kişiselleştirme gelince gerçek fon okunur; gelene kadar açık.)
- **Flatten ile çıkarılamaz gömme** — kapak/sayfa kompozisyonuna piksellere kaynar,
  ayrı katman/annotation değil. Dürüst sınır: normal kullanıcı çıkaramaz ama "mutlak
  imkansız" değil (hiçbir dijital dosya %100 düzenlenemez değildir). KURAL B ile çelişmez.
- **DefterDerleyici'ye cerrahi entegrasyon** (paralel yapı YASAK). Şimdilik yalnız açık
  tema da yeterli olabilir ama otomatik tema kancası tercih edildi (enterprise).
- **DOMAIN:** www.bianibirak.com satın alınacak (birkaç güne). Kısa link tabanı gelince
  otomatik döner (request/origin tabanlı).

### ▶ AŞAMA 3 — DIŞ KAPAKLAR `[Aşama 2 sonrası — en büyük iş]`
Fotoğraf albümü gibi kalın materyal ön + arka dış kapak (defter iç sayfasından ayrı):
- **Kapak fotoğrafı: EŞLER SEÇER, akıllı varsayılanla** (ilk sürümde otomatik seçip sonra
  seçim ekleyebiliriz).
- **Kapaklar AYRI PDF** (ciltli albüm iş akışı: sırt payı, taşma/wrap farklı).
- **Sırt (spine): ilk sürümden itibaren enterprise** kurgulanır.
- **Arka dış kapak = marka anı / künye** (reklam + miras künyesi orada yaşar).
- Kapak-PDF akışı ve foto seçim detayları Hafta 2 matbaa deneme baskısında netleşir.

### ▶ TUR D — ÖDEME AKTİVASYONU `[hukuki statü netleşince — Bölüm 0-B]`
Kod hazır (havale, inert). Statü + hukukçu + mali müşavir sonrası:
1. `odeme_ayarlari` satırı (IBAN + fiyat + Aktif=true).
2. Nihai hedef: **App Store / Google Play IAP** (GVK 20/B vergi istisnası) — ama o da
   ticari kazanç; statü buna da bakar. Capacitor + IAP (Tur G).
3. İleride iyzico/PayTR (web ödeme) — sağlayıcı karşılaştırması sunulacak.
> **Native kırmızı çizgi:** dijital erişim = IAP zorunlu; fiziksel baskı = harici ödeme
> (komisyon yok). Ayrım modelde baştan kurulu.

### İŞ / ÖLÇÜM PLANI `[referans — 2026-07-16 danışmanlık]`
- **8 Türkçe rakip** (Anı Topla, OrtakAlan, DüğünAnılarımız, Anıdepola, Düğün Galeri,
  Storpix, Guestories, Fotify) — hepsi TOPLAYICI, hiçbiri kürasyon/baskı yapmıyor =
  **gerçek fark**. Pazar ~552.237 çift/yıl (TÜİK).
- **5 zayıflık:** tek-seferlik satış (LTV=fiyat), DAĞITIM (plan yok — en büyük risk),
  mevsimsellik, geç satın-alma anı, hukuki statü. Zarar riski düşük (37 gün imha, başabaş
  ~15 satış/yıl). **3 ürün = 3 yarım ürün UYARISI** (odak şart).
- **Ölçüm — 3 gerçek düğün:** 2 arkadaş (Ağustos) + Musa'nın kendi düğünü (1 Eylül).
  Ödeme AÇILMAYACAK (hediye + hukuk). Ölç: tarama → katkı → "ben de istiyorum" tık →
  hesap açma. K-faktörü ölçülmeli. **PENDING (Musa):** arkadaş düğünleri hangi hafta.
- **E-POSTA TOPLANMAYACAK** — İYS/MERSİS zorunlu (6563 sayılı kanun; şirketsiz ticari
  ileti gönderilemez, ceza 15.000₺/ileti). Yerine anonim tık + hesap açtırma.

### TUR E/F/G — BÜYÜME / KİŞİSELLEŞTİRME / GELECEK
- E: **paylaşılabilir önizleme linki** (her defter satış kanalı), SEO/satış sayfaları.
- F: 8 tema × 5 kâğıt × 5 çerçeve × 4 kapak, "Tasarım" sekmesi, 3B kitap görünümü.
- G: slayt + AI kürasyon, fiziksel baskı (matbaa ortağı), Capacitor+IAP, süper alarmlar,
  B2B2C (`Etkinlik.UstOrganizatorId` nullable, additive — bugünkü B2C bozulmaz).

### ⚠ SON ADIM — KAYNAK ÇÖZÜNÜRLÜĞÜ + HUKUKİ STATÜ
→ **Bölüm 0.** İkisi de karar bekliyor. **ISRARLA HATIRLAT.**

---

## 4. PAHALI ÖĞRENİLEN DERSLER

1. **`ExecuteSqlRaw` `String.Format` uygular** — DDL için raw ADO.NET (`SemaKurucu`).
2. **Container'da sistem fontu YOK** — QuestPDF TTF ister (`Varliklar/Fontlar/`).
3. **Minimal API `IFormFile` olmayanı QUERY'den bind eder** — boyut server-side ölçülür.
4. **Tailwind opacity-modifier CSS-değişkenli renkte GEÇERSİZ** → `rgba`/`box-shadow`.
5. **`blob:` URL kırılgan** (service worker) → `data:` URL.
6. **`object-cover` kırpar** — kutu oranı = foto oranı.
7. **CSS grid item default `min-width:auto`** — `min-w-0` zinciri şart.
8. **iframe `X-Frame-Options: DENY`** — header doğru, mimariyi düzelt.
9. **Brace/paren denge kontrolü comment+string+char literal STRIP etmeli** — proper tokenizer.
10. **Süper admin eylemleri çiftin denetiminde GÖRÜNMEMELİ** — `SistemEylemi` yaz-sabit+oku-filtre.
11. **Zaman modeli tek kanon** — user-configurable pencere çizelgeyi yalancı yapar.
12. **İmhada dosyalar EN SON** (DB commit sonrası), denetim de silinir (PII-free kayıt).
13. **Hash tek başına ANLAMSIZ** — metin de arşivlenmeli.
14. **Idempotent seed'de ERKEN RETURN geriye dönük onarımı ATLAR** — onarım her zaman çalışmalı.
15. **`docker exec` servis adı `bianibirak-postgres`** (bare `postgres` çalışmaz).
16. **Filigran kilit değil** — çözünürlük.
17. **QuestPDF `GenerateImages` ~30MB/çağrı** → önbellek zorunlu, deploy sonrası gözle doğrula.
18. **QuestPDF görüntüleri YENİDEN SIKIŞTIRIR** → `UseOriginalImage()`.
19. **`Scale()` margin'e dokunmaz** — margin'i de ölçekle.
20. **PDF yazıcı kâğıt boyutunu ZORLAYAMAZ** — PDF'in kendi sayfa boyutu tek kontrol.
21. **VAR-SAY-MA** — her düzeltme kanıta dayanmalı (gerçek dosya/kolon/spec).
22. **Kod "build geçti" kaydı YANLIŞ olabilir** — ödeme kodu hiç derlenmemişti
    (`ZorunluMetinlerAsync` arg sırası). Cross-service çağrıları imzalarıyla tek tek eşleştir. `[2026-07-17]`
23. **`package.json` değişince `package-lock.json` da commit'lenmeli** — sunucu `npm ci`
    lock senkron ister, yoksa build patlar (jspdf/jszip eklerken yandı). `[2026-07-17]`
24. **`docker compose up -d --build` çalışan container'ı OTOMATİK yenilemeyebilir** — image
    build olur ama eski container koşmaya devam eder ("Up 15 hours"). `--force-recreate` gerekir. `[2026-07-17]`
25. **Tarayıcı indirmede `(1).zip` ekler** — Musa yanlış (eski) zip'i açıp durabilir; komutta
    en son indirileni teyit ettir. `[2026-07-17]`
26. **SVG `<text>` matbaada font-fallback'e düşer** (Inter yoksa) — sabit metinleri offline
    outline path'e çevir (fonttools). Raster'lar canvas fillText ile zaten font-gömülü. `[2026-07-17]`
27. **SVG `<img>` ile rasterize edilince belge fontuna erişemez** (font-sandbox) — canvas
    `fillText` belge fontunu kullanır; raster üretimi canvas primitifleriyle yapılmalı. `[2026-07-17]`
28. **Küçük baskıda QR okunurluğu = KISA LİNK** (az veri = iri modül). Error-correction değil,
    link uzunluğu belirleyici. `[2026-07-17]`
29. **`navigator.share` dosya paylaşımı yalnız mobilde güvenilir** — masaüstünde `canShare({files})`
    çoğu tarayıcıda false; fallback indir + WhatsApp Web. `[2026-07-17]`
30. **localStorage GERÇEK uygulamada serbest** — yasak yalnız Claude.ai artifact'lerinde;
    bu Next.js app'i, kalıcılık için localStorage/DB kullanılır. `[2026-07-17]`
31. **Aynı hesap çoklu cihaz senkronu** — uygula-koşulu `sonDuzenleyen != rol`'e bağlanırsa
    aynı kullanıcının iki cihazı senkron OLMAZ; koşul sadece "daha yeni sürüm" olmalı,
    rol yalnız "eşiniz düzenliyor" ibaresi için. `[2026-07-17]`

---

## 5. MİMARİ SABİTLER (hatırlatma)

- **TENANT = ETKİNLİK.** Her tenant-scoped tabloda `EtkinlikId`.
- **Çift-link birleşim-öncesi izolasyon** — wedge, asla ihlal edilmez. (KisaKod public link;
  matbaaya iki karekod göndermek bu izolasyona aykırı değildir.)
- **Süreli yaşam döngüsü** — pencere kontrolü backend'de.
- **Erişim satışı ≠ fiziksel ürün** — native'de IAP ayrımı.
- **Web-öncelikli PWA**, native sonra.
- **Append-only audit** — `denetim_gunlukleri`; ayrı audit tablosu YOK.
- **Defense in depth** — kritik sınırlarda en az 2 katman.
- **Hardcoded değer YASAK** — tenant/etkinlik ayarlarından çek.
- **Paralel yapı YASAK** — mevcuda entegre. (PDF TEK kaynak: `DefterDerleyici`. Lockup TEK
  kaynak: `lib/lockup.ts` frontend; defter künyesi backend'de aynı tasarım tokenlarıyla.)
- **Migration idempotent + filtreli.**

---

## 6. ALTYAPI

- VPS `46.225.101.248` (Ubuntu 24), SSH `bianibirak-prod`, repo `/opt/bianibirak`
- Servisler: `bianibirak-frontend`, `bianibirak-backend`, `bianibirak-postgres`
- Postgres: user `bianibirakuser`, db `bianibirak`
- Medya: volume `bianibirak_medya:/veri/medya`
- Paylaşımlı Caddy: `/api/*` → backend:8080, else → frontend:3000
- Deploy: `cd /opt/bianibirak && git pull && docker compose -f docker-compose.production.yml up -d --build <servis>`
  — **container yenilenmezse `--force-recreate` ekle** (Ders 24).
- Lokal: `C:\Projeler\bianibirak` (yazılır); indirmeler `C:\Users\Win10\Downloads`.
- **Push sonrası: project knowledge SYNC gerekir** (otomatik değil).
- **Deploy öncesi lokal build ZORUNLU** (frontend `npm run build`, backend `dotnet build`).
  Backend build = Musa'nın gate'i (Claude container'ında .NET SDK yok).

---

## 7. AÇIK KONULAR

1. **Hukuki statü (memur ticaret yasağı)** → Bölüm 0-B. Ödemenin ön şartı. Hukukçu + mali
   müşavir. **HER OTURUMDA HATIRLAT.**
2. **Kaynak çözünürlüğü 2400px?** → Bölüm 0-A. Deneme baskısı karşılaştırması.
3. **Domain www.bianibirak.com** — satın alınacak (Aşama 2 künye + kısa link için).
4. **Fiyat** — öneri 2.490₺, kesinleşmedi.
5. **Arkadaş düğünleri hangi hafta** — ölçüm takvimi (Ağustos).
6. **Aşama 2 açık nokta:** defter künyesinde şimdilik yalnız açık tema mı, otomatik tema mı
   (KARAR: otomatik tema kancası kurulacak).
7. **Aşama 3 açık noktalar:** kapak-PDF akışı + foto seçim → Hafta 2 matbaa deneme baskısı.
8. **QuestPDF Linux render doğrulaması** — önizleme/PDF birebir mi (gözle).
9. **Ödeme sağlayıcısı** (iyzico vs PayTR) — web ödeme gerekirse; asıl hedef IAP.
