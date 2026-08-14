# BiAnıBırak — Yol Haritası & Karar Günlüğü

> Bu dosya, oturumlar arası SÜREKLİLİK içindir. Instruction (kalıcı çerçeve) DEĞİL;
> projenin GÜNCEL yol haritası + alınan kararlar + biten işler + açık konular + pahalı
> öğrenilen dersler. Her önemli karardan sonra güncellenir. Güncel kod durumu daima
> repodan; bu dosya "neden / ne kararlaştırıldı / sırada ne var" hafızasıdır.

**Son güncelleme: 2026-08-14** — **B (baskıya hazır menü düzeni) ✅**, **İLAVE (anı sonu
noktalama) ✅** ve büyük bir **BASKI KALİTESİ turu**: önizleme canlı senkronu, **renkli emoji
mimarisi** (font değil görüntü), tofu kalkanı, Türkçe büyük harf, **PDF metin katmanı onarımı**.
Sıradaki: **C-1 SayfaPaketleyici**. Ayrıntı Bölüm 3'te; dersler 90-96.

Canlı: **https://www.bianibirak.com** (eski `bianibirak.dentlogicapp.com` → 301 yönlendirme)

---

## 0. EN KRİTİK AÇIK KARARLAR — HER OTURUMDA HATIRLATILACAK

### ⚠ A) HUKUKİ STATÜ — ÖDEMENİN ÖN ŞARTI `[AÇIK]`
Musa sigortalı kamu işinde. 657 m.28 memur ticaret yasağı kapsamı statüye göre değişir
(memur 4/c yasak · işçi 4/a · sözleşmeli 4/B). **Statü HENÜZ NET DEĞİL.**
Ödeme AÇILMADAN ÖNCE: statü netleştir + idare hukukçusu + mali müşavir.
**Yeni bilgi [2026-07-19]:** Musa eşinin üzerine şirket açma yolunu seçti (1-2 ay).
Bu süreçte IBAN/havale ile başlanacak; şirket kurulunca mağaza IAP'ye geçilecek.

### ⚠ B) MATBAA DENEME BASKISI `[AÇIK]`
Vektör PDF/EPS CorelDRAW'da doğrulandı (Inkscape ile Musa test etti, bozunma yok).
**Bekleyen:** gerçek deneme baskısı → kâğıt üzerinde fotoğraf netliği + kapak akışı.
Matbaaya sorulacak: **CMYK dönüşümünü siz mi yapıyorsunuz, dosyayı CMYK ister misiniz?**

### ⚠ C) FİYAT `[AÇIK]`
Öneri **2.490₺** (tek seferlik miras). Kesinleşmedi.

### ⚠ D) DİĞER AÇIK KARARLAR
| Konu | Karar gereken | Nerede |
|---|---|---|
| **Konfeti** | Tek seferlik (~2,5 sn, önerilen) mi, sürekli döngü mü? | Faz 3.2 |
| **Sıralı karşılama** | Yapılsın mı? Önizleme sunuldu, karar Faz 3'e bırakıldı | Faz 3.3 |
| **Kişiselleştirme kapsamı** | Ne kadarı ücretsiz, ne kadarı premium? | Faz 5.3 |
| **`GIRIS` saklama süresi** `[YENİ 2026-08-10]` | Giriş kayıtları (en kalabalık ikinci grup) şu an 2 yıl saklanıyor. Güvenlik izi ile hacim arasında denge: **90 gün önerisi** bekliyor. | Bölüm 3-E4 |
| **E1-b gerçek diff** `[YENİ 2026-08-10]` | `AYAR/ETKINLIK_GUNCELLENDI` yalnız YENİ değeri yazıyor; "önce → sonra" için denetim yazan ~15 nokta değişmeli. Ayrı ve dikkatli bir iş. | Bölüm 4-E |
| **GitHub token** | `omniasistan-cli` (classic, `repo`) doluyor. Revoke mu, fine-grained yeni token mı? Önce `git remote -v` ile deploy bağımlılığı doğrulanmalı | Altyapı |
| ~~B2B2C çelişkisi~~ | ✅ **ÇÖZÜLDÜ `[2026-08-09]`** — Instructions Bölüm 3 güncellendi: organizatör katmanı **istenmiyor**, lansman ve ileri aşamalar **saf B2C** (tenant = etkinlik, çift doğrudan satın alır). İki belge artık uyumlu. | — |

---

## 0.1 TEMEL KARAR — CANLI SENKRON `[2026-08-04, ONAYLI, BAĞLAYICI]`

**Karar:** Uygulamadaki her değişiklik, sayfa yenilemeye gerek kalmadan **tüm ekranlara**
yansır: aynı ekranda, aynı cihazın diğer sekmelerinde, diğer cihazlarda ve **aynı ekranı gören
tüm kullanıcılarda** (eşler, süper yönetici).

**Tetikleyen olay (canlıda):** Bildirim "kalıcı silinmeye 44 saat" derken, sabahtan beri açık
duran "Dilek Bağlantısını Paylaş" ekranı hâlâ "72 saat" gösteriyordu. İki sayı da aynı imha
anından hesaplanıyordu; fark, birinin TAZE diğerinin DONMUŞ olmasıydı.

**Kök neden — üç ayrı katman:**
1. **Zaman akışı görünmez bir değişim kaynağıdır.** `defterDurumu()` her çağrıldığında
   `Date.now()` okur; bileşen yeniden render olmazsa değer donar. Damga tabanlı senkron bunu
   **göremez** — sunucuda değişen bir şey yoktur. → merkezi canlı saat gerekir.
2. **Yerel değişiklikler yayılmıyor.** Bir ekrandaki yazma, aynı sekmedeki diğer bileşenlere
   hiç, diğer sekmelere ancak bir sonraki yoklamada (≤5 sn) ulaşıyor.
3. **Kapsam boşluğu.** Veri gösteren her ekran ilgili damga alanını dinlemiyor.

**Dört aşama — DURUM `[2026-08-09]`:**
| Aşama | Kapsam | Durum |
|---|---|---|
| **1a. Canlı saat** (`lib/saat.ts`) | Tek tik kaynağı (30 sn), tüm aboneler aynı "şimdi". `ZamanCizelgesi` (asıl şikâyet), `cop-kutusu`, `etkinliklerim`, `gelen-dilekler`. | ✅ canlıda |
| **1b. Canlı saat — yönetici** | Süper panel (defter rozetleri, çöp sayacı, Canlı Akış "geçen süre") + `UserMenu` bildirim zamanları. | ✅ canlıda |
| **2. Yerel anlık yayın** | `senkron.ts → senkronYayinla(yol)` + alan-bilinçli BroadcastChannel; **`api.ts/istek()` içinde TEK NOKTA** — başarılı her GET-dışı istek kendi alanlarını anında yayınlar. Bilinmeyen yol → tüm alanlar (yeni özellik sessizce kaçamaz). | ✅ canlıda |
| **3a. Dinleyiciler — ana ekranlar** | `gelen-dilekler` (kuyruk+defter), süper panel özet/nabız (defterler+ayar), `cop-kutusu`, `etkinliklerim`. **Tazeleme sayacı deseni**: mevcut `useEffect` aynen yeniden çalışır, çekme kodunun tek satırı değişmez. | ✅ canlıda |
| **3b. Dinleyiciler — süper panel sekmeleri** | Defterler, Kullanıcılar, Çöp → kendi `useCallback cek`'lerine doğrudan abone. (Bildirim tercihleri ve Hatalar: karşılığı olan senkron alanı yok — bilinçli kapsam dışı.) | ✅ canlıda |
| **4. SSE (sunucu itmesi)** | ❌ **YAPILMAYACAK `[2026-08-09, Musa kararı]`** — diğer cihaz/eş ekranında mevcut ≤5 sn (damga yoklaması) yeterli görüldü. SSE'nin bedeli (kalıcı bağlantı yönetimi, ters vekil tamponlama, yeniden bağlanma, sunucuda sekme başına bağlantı) kazancına değmiyor. **Aynı cihazda zaten anında.** İhtiyaç doğarsa yeniden değerlendirilir. |

**Bağlayıcı kural:** Bundan sonra eklenen **her** özellik böyle kurulur. Veri gösteren ekran o
verinin değişimini dinlemek, geri sayım gösteren ekran canlı saate bağlanmak zorundadır.
**"Sayfayı yenileyince düzelir" kabul edilemez.**

**Mimari not:** Aşama 1-3 SSE olmadan da doğru çalışır. SSE bir **hız** katmanıdır, doğruluk
katmanı değil — bu ayrım korunur.

---

## 1. ÜRÜN KURALLARI — İHLAL EDİLEMEZ

### KURAL A — ÖDEME ÖNCE, DÜRÜSTLÜK SONRA `[2026-07-13]`
Ödeme öncesi hiçbir "ama" / teknik tablo gösterilmez (kararsız çifti caydırır). Dürüstlük
satın alma SONRASI doğru kullanım rehberidir. `BoyutSecimi` modalı ödeme sonrasına taşındı.

### KURAL B — FİLİGRAN YASAK `[2026-07-13]`
Filigran kilit değil hız tümseği. Yerine ÇÖZÜNÜRLÜK: önizleme düşük (96 DPI görüntü),
indirme tam kalite (300 DPI PDF). **Not:** Davetiye/defter marka künyesi (karekod + logo) bu
kurala AYKIRI DEĞİL.

### KURAL C — PAYWALL ÇİZGİSİ
Ücretsiz: dilek toplama, defter kurma/düzenleme, kürasyon, tam önizleme.
Ücretli: yalnızca baskıya hazır PDF indirme. Kontrol TEK YERDE (`OdemeServisi`).

### KURAL D — ZAMAN MODELİ TEK KANON `[GÜNCELLENDİ 2026-07-19]`
`Sabitler.cs`: **ToplamaGun=15, IndirmeGun=5, ToplamGun=20.**
- Özel gün + 15 → davetli girişleri kapanır
- Özel gün + 20 → **TAM İMHA**, istisnasız
- **Kürasyon ve indirme kurulumdan imhaya kadar HER AN açıktır**; kapanan tek şey davetli girişi.
- **Neden kısa:** süre kısaldı ki KALİTE artabilsin. Aynı diskte fotoğrafları çok daha yüksek
  çözünürlükte saklamanın bedeli, veriyi daha kısa tutmaktır.
- **İSTİSNA [2026-07-25]:** VIP defter için `OzelSaklamaGun` deftere özel uzatılabilir.
  Kanon korunur; yalnız o defter için sayı değişir.
- **İMHA ANI TEK KAYNAK `[2026-08-01]`:** `Sabitler.ImhaAni(EtkinlikTarihi, OzelSaklamaGun)`
  = özel gün + `Max(OzelSaklamaGun ?? ToplamGun, ToplamGun)`. Bu hesap **başka hiçbir yerde
  tekrarlanmaz** (7 nokta buraya hizalandı).
- **KAPANIŞ ANI TEK KAYNAK `[2026-08-09]`:** `Sabitler.KapanisAni(EtkinlikTarihi)` = özel gün
  + `ToplamaGun`. `etkinlikler.KapanisTarihi` sütunu **artık okunmaz** (kurulum anındaki
  ToplamaGun'u dondurur; kanon değişince yalancı olur). Gösterim ve davetli kapı kontrolü
  AYNI kaynaktan okur — ekran ile kapı asla ayrışamaz.
- **TOPLAM GÜN (gösterim) `[2026-08-09]`:** `Sabitler.ToplamGunGercek(OzelSaklamaGun)` — VIP
  dahil. Çizelge etiketi ile imha tarihi aynı gerçeği söyler.
- `Sabitler.cs` ayrıca `SaklamaGun=5` taşır (çöp/kapanış sonrası saklama).

### KURAL E — VIP YALNIZ UZATIR `[2026-08-01, kritik açıktan doğdu]`
VIP saklama bir defteri **asla kısaltamaz, asla imhaya sokamaz**. Üç katman:
(1) `ImhaAni`'de `Max(...)` tabanı — DB'de yanlış değer olsa bile imha varsayılandan erken
olamaz; (2) uçta `deger >= ToplamGun` **ve** "oluşan imha anı gelecekte olmalı" (aksi hâlde
`409 IMHA_TEHLIKELI`); (3) modalda kırmızı uyarı + Kaydet kilidi.
Bir defteri gerçekten yok etmek "Çöpe at → kalıcı sil" akışıdır (teyitli, geri alınabilir pencere).

---

## 2. MİMARİ SABİTLER (hatırlatma)

- **TENANT = ETKİNLİK.** Her tenant-scoped tabloda `EtkinlikId`.
- **Çift-link birleşim-öncesi izolasyon** — wedge, asla ihlal edilmez. Her eşin AYRI paylaşım
  token'ı + AYRI onay kuyruğu; bir eş diğerinin onaysız kuyruğunu göremez.
- **Süreli yaşam döngüsü** — pencere kontrolü backend'de (frontend disabled + backend 403).
- **Atomik transaction** her yazımda (tek `SaveChangesAsync`).
- **Append-only audit** — `denetim_gunlukleri`, `DegisenAlanlar` JSONB. Ayrı audit tablosu yok.
- **Defense in depth** — kritik sınırlarda en az 2 katman.
- **Hardcoded değer yasak** — tenant/etkinlik ayarından çekilir.
- **Paralel yapı yasak** — mevcuda entegre.
- **Migration idempotent + filtreli.**
- **Süper admin eylemleri çiftin denetiminde GÖRÜNMEZ** (`SistemEylemi=true`).
- **TenantErisim = tenant çözümünün TEK kaynağı** `[2026-07-25]` (bkz. Bölüm 3).
- **Görev idempotency = AUDIT TABANLI** `[2026-08-03]` — `denetim_gunlukleri` (Eylem +
  `VarlikId` + zaman penceresi). `Bildirim.Tip`'e bakma: `PushGonderici` Tip'i url'den türetip ezer.
- **Bildirim kuralları TEK MERKEZ** `[2026-08-02]` — `BildirimKurallari` (kanal, sessiz saat,
  url, audit eylemi, per-admin çözümleme). Görev + disk gözcüsü + günlük özet + ileride mail
  hep buradan okur.
- **Günlük özet TEK KAYNAK** `[2026-08-03]` — `GunlukOzetHesabi`. Push bugün; **mail (FAZ 4
  sonrası) aynı hesaptan** beslenir, toplulaştırma iki kez yazılmaz.
- **CANLI SENKRON** `[2026-08-04]` — Bölüm 0.1, bağlayıcı.

---

## 3. TAMAMLANAN İŞLER

### `[2026-07-25]` Üçüncü oturum — canlıda

> Bu oturumun tüm paketleri deploy edildi. Kök nedenler ve gerekçeler kod yorumlarında.

### Paket A — Tema + modal altyapısı
`globals.css`'e `--uyari` RGB-kanal token'ı (açık `154 90 30`, koyu `232 145 58`);
`tailwind.config.ts`'e `uyari` token + geçici `amber→uyari` köprüsü. Yeni `TamEkranKatman.tsx`
(portal + scroll kilidi + ESC + odak tuzağı), `TehlikeliEylem.tsx` butonu her zaman `bg-sarap`.

### Paket B — Senkron altyapısı
`Kullanici.cs`'e `AktifEtkinlikId Guid?` (FK yok, doğrulama `/api/durum`'da). Yeni
`frontend/lib/senkron.ts` (damga tabanlı `/api/durum` polling). `EtkinlikUclari`'na `/api/durum`
ucu; `AktifYap` DB'ye yazar. `AppShell`'e `useSenkron()`.

### Paket C — Senkron sertleştirme + görüntüleme regresyonu
`SuperUclari`'na `AktifDefteriYaz` yardımcısı. Kök neden: `Goruntule` JWT'yi çeviriyor ama
`AktifEtkinlikId`'yi (DB) yazmıyordu → claim/DB ayrışıyor, senkron kullanıcıyı eski deftere
fırlatıyordu. Üye olduğu defteri görüntüleyende DB yazılır, gerçek impersonation'da yazılmaz.
`senkron.ts`'e odak kısıtlaması (`ANLIK_ARA_MS=2000`), `navigator.onLine`, 401'de döngü durur.

### Paket D — Salt-okunur inceleme (tenant çözümü tek kaynak)
Yeni `Kimlik/TenantErisim.cs` — tenant çözümünün TEK doğruluk kaynağı. **Kök neden:** tenant
çözümü DÖRT uç dosyasında kopyalanmıştı, üyelik istisnası hiçbirinde yoktu; bir tanesine kural
eklemek diğerlerini sessizce geride bırakıyordu. İki yol: üyelik (rol es1/es2) + salt-okunur
inceleme (rol sabiti `IncelemeRol="inceleme"`). Üç katman koruma: JWT `goruntuleme_modu` +
DB süper admin doğrulaması + Program.cs write-guard. `inceleme` rolü hiçbir KaynakEs/Es ile
eşleşmez → **kuyruk ve linkler boş** (Musa kararı: kuyruk boş kalsın); ortak defter/ayarlar/
denetim görünür.

### Paket E1 — Audit sızıntısı
Write-guard'ın `GORUNTULEME_YAZMA_ENGELLENDI` kaydına `SistemEylemi = true`. **Kök neden:**
middleware kaydı kendi yazıyor, `SistemEylemi=false` varsayılan → çiftin denetim ekranındaki
`!SistemEylemi` filtresini geçiyordu. Canlıda SQL ile doğrulandı: inceleme oturumunda ayar
değiştirme `etkinlik_ayarlari.updated_at`'i DEĞİŞTİRMEDİ (backend gerçekten koruyor).

### Paket E2 — Arayüz kilidi
Yeni `SaltOkunurKilit.tsx` — inceleme oturumunda girdi alanlarını kilitler (yakalama fazında
beforeinput/keydown/paste/cut/drop/click keser; alanlar soluk + `caret-color: transparent`;
kopyalama ve gezinme serbest). `AppShell`'e bağlandı. **Kök neden:** backend 403 dönüyordu ama
React değeri yerel state'te tutuyor, ekran "değişti" gibi kalıyordu — arayüz yalan söylüyordu.

### Paket E3 — Kürasyon + görsel uçları
`GorselUclari` ve `KurasyonUclari` → `TenantErisim`'e bağlandı, yazımlarda `IncelemeReddi` guard.
İki tuzak: (1) `defter.pdf` GET ama `ESER_INDIRILDI` denetimi + `kurasyon_ciktilari` kaydı yazıyor
→ hatırlatma görevini susturur → inceleme oturumunda indirme kapatıldı, önizleme açık. (2)
`KurasyonGetir` GET ama kürasyon yoksa oluşturuyor.

### Paket E4 — Önizleme senkronu
`KurasyonGetir`'de OLUŞTURMA (kürasyon yoksa sıfırdan) inceleme'de bloke; SENKRONİZASYON
(onaylı dilekleri öğe yapmak, türetilmiş/idempotent) inceleme'de DE çalışır. **Kök neden:**
E3'te senkron bloğu tamamen atlanmıştı → onaylı ama henüz öğe olmamış dilekler önizlemede
görünmüyordu; koruma teşhisi kör etti.

### Paket E5 — Buton kilidi + çöp uçları
Yeni `lib/salt-okunur.ts` (inceleme bayrağının tek kaynağı, modül önbelleği). `fotograflar` ve
`baskiya-hazir-defter` sayfalarında YAZMA butonları `disabled` (gezinme/önizleme/sekme serbest).
`CopUclari` → `TenantErisim` (inceleme'de çöp listesi boş, `DefterKaliciSil`'e aktifTutanlar
temizliği). **Ders:** genel DOM kuralı "sonraki sayfa" ile "şablonu değiştir" butonunu ayıramaz;
o ayrımı yalnız sayfa bilir → butonlar sayfada kilitlenir.

### Paket F — Oturum dayanıklılığı `[deploy sürüyor]`
Yeni `lib/oturum.ts` — `oturumDustu(cevap)` yalnız `durum===401` true. **Kök neden:** `api.ts`
ağ hatasında `{ok:false, durum:0}` döner; sayfalar yalnız `!ok`'a bakıp giriş ekranına atıyordu
= ağ blibi = oturum düştü sanılıyordu. Gerçek kusur üç dosyada: `etkinliklerim`, `super-panel`
(koşulsuz atıyordu → "ağ yok" ekranı + online toparlanma), `UserMenu` (ağ hatasında avatar
"Giriş" butonuna dönüyordu → "bilinmiyor" nötr kalır). `api.ts`'e DOKUNULMADI (1400 satır, risk).

---

### `[2026-07-31 → 2026-08-04]` Dördüncü oturum — canlıda

**Yaşam döngüsü / arayüz dürüstlüğü**
- **G-1** `lib/durum.ts`: "Dilek toplanıyor · Kalıcı silinmeye son: N gün" tam metni +
  `siliniyor` evresi ayrıldı ("silindi" yalnız `imha_edildi=true` iken) + **Mühürle butonu
  kaldırıldı** (Bölüm 4'teki karar uygulandı).
- **G-2** Faz 2 zamanlama düzeltmesi (imha anı `.Date` kırpmasından kurtarıldı).
- **Tam ekran (x)** düzeltmesi (`TamEkranKatman` deseni + `koyuZemin` prop'u).

**I) VIP kalıcı saklama** ✅ — `etkinlikler.OzelSaklamaGun` (nullable). Süper panelde 👑 VIP
rozeti, "Özel süre" kısayolu, paylaşılan `VipSaklamaModal`, detay düzenleme. Varsayılan uzatma
3650 gün, üst sınır 36500. `imha_tarihi` üreten 7 nokta `Sabitler.ImhaAni`'ye hizalandı.
- **KRİTİK AÇIK KAPATILDI `[2026-08-01]`:** alt sınır 16 idi → varsayılandan (20) kısa değere
  izin veriyordu; özel günü GEÇMİŞ bir defterde bu, imha anını geçmişe çekip defteri **anında
  ve sessizce imha ettirdi** (deneme defteri, içeriksiz — gerçek kayıp yok, açık gerçekti).
  → **KURAL E** (üç katman) kuruldu. Musa'nın gerçek düğün defteri (VIP 3650) SQL ile
  doğrulandı, güvende.

**H) Ad soyad otomatik büyük harf** ✅ — mevcut `lib/dogrulama.ts → adBicimle` (blur'da,
`toLocaleUpperCase("tr-TR")`) eş kayıt (`etkinliklerim`), giriş kaydı ve `ProfilimModal`'a
bağlandı. Davetli formu zaten kullanıyordu (paralel yapı kurulmadı).

**F′) Aktif defterin menüden silinmesi** ✅ — `UserMenu`'de açık defter satırına hafif-daima
görünür (x); onay → çöpe taşı → akıllı geçiş (`kalanlar[0]` → `/gelen-dilekler`, yoksa
`/etkinliklerim`) + "son defterin" uyarısı. Eski "AÇIK DEFTER SİLİNEMEZ" kararı bilinçli
tersine çevrildi (gerekçe kod yorumunda).

**Çöp filtresi düzeltmesi** ✅ — `Etkinliklerim` sorgusu yalnız `DeletedAt`'e bakıyordu; çöp
mekanizması `SilindiMi`'ye taşınmıştı → çöpteki defter menüde/listede duruyordu.

**FAZ 1.2 — Hata görünürlüğü** ✅
- Yeni `Entities/SistemHatasi.cs` + `sistem_hatalari` tablosu (idempotent şema + index).
- `Program.cs` **global hata middleware** (en dışta): best-effort DB kaydı, temiz 500
  (`SUNUCU_HATASI`, stack sızmaz), 30 gün retention, **istemci iptali elenir**
  (`OperationCanceledException` + `RequestAborted`), **iç exception zinciri** yazılır.
- `GET /api/super/hatalar` (son 20) + süper panel **"Hatalar" sekmesi** (boşsa "sistem temiz").

**D) Süper yönetici bildirimleri** ✅ — D1-D5 tümü
- **D-A** `Servisler/BildirimKurallari.cs` (D5 tek merkez) + `Servisler/SuperBildirimGorevi.cs`
  (30 dk döngü): **gecikmiş imha** (günde bir) + **sistem hatası** (3 saatte bir tavan), anlık,
  sessiz saate tabi (D4). İdempotency audit tabanlı.
  - *Keşif:* destek talebi zaten olay-güdümlü (`DestekUclari` anında push atar) → D'de
    TEKRARLANMADI (çift bildirim önlendi). Disk zaten `DiskGozcusu`'nda.
- **D-B** `Servisler/GunlukOzetHesabi.cs` — **TEK KAYNAK** (bekleyen ödeme/KVKK/destek,
  gecikmiş imha, bugünkü hata/defter/dilek) + günlük özet bildirimi. **Mail'e hazır.**
- **Disk audit hizalaması** — `DiskGozcusu` idempotency'si `Bildirim.Tip`'ten
  `denetim_gunlukleri`'ne çekildi (eski kontrol tutmuyordu → 6 saatte bir tekrar ediyordu);
  `BildirimKurallari.Disk` + `DiskAuditEylem(esik)`.
- **D-C** Per-admin tercih sistemi (D3): `bildirim_tercihleri` + `bildirim_ayarlari` tabloları,
  `BildirimKurallari.Coz` + `Katalog`, `GET/PUT /api/super/bildirim-tercihleri`, görev
  **per-admin** çözümleme (olay değeri bir kez hesaplanır; her admin için kanal çözülür;
  idempotency `VarlikId=adminId`), süper panel **"Bildirimler" sekmesi** (olay başına
  Anlık/Özet/Kapalı + kişisel özet saati). Geriye dönük uyumlu.

**Tutarlılık / dayanıklılık**
- **Push ↔ defter geri sayım senkronu** ✅ — push "120 saat" derken defter "5 gün" diyordu.
  `HatirlatmaGorevi.KalanMetni` eklendi (≡ `lib/durum.ts kalanMetin`); push artık eşiği değil
  **gönderim anındaki canlı kalanı** yazar. "İkisi birlikte değişir" notu kodda.
- **Cihaz kaydı yarışı** ✅ — iki sekme aynı PushToken'ı eşzamanlı ekleyip `23505`'e takılıyordu
  → yarış yakalanıp sessizce başarılı dönülüyor.

**CANLI SENKRON** ✅ `[2026-08-09]` — Bölüm 0.1'in kod karşılığı, beş pakette:
- **`lib/saat.ts` (yeni)** — `useSimdi()`: modül düzeyinde TEK zamanlayıcı (30 sn), tüm aboneler
  aynı "şimdi", sekme gizliyken durur, odakta anında tazeler, SSR güvenli. İki ekranın farklı
  sayı göstermesi artık yapısal olarak imkânsız.
- **1a** `ZamanCizelgesi` (asıl şikâyet: `Date.now()` → `useSimdi()`), `cop-kutusu`,
  `etkinliklerim`, `gelen-dilekler`.
- **1b** Süper panel (Defterler rozetleri, Çöp sayacı, Canlı Akış "geçen süre") + `UserMenu`.
- **2** `senkron.ts`: alan-bilinçli BroadcastChannel + `senkronYayinla(yol)`; **`api.ts/istek()`
  içinde TEK ÇAĞRI** — başarılı her yazma ilgili alanları anında yayınlar. Yol→alan haritası,
  bilinmeyen yol tüm alanları yayınlar (yeni özellik sessizce senkron dışı kalamaz).
- **3a** Ana ekranlara dinleyici — **tazeleme sayacı deseni** (mevcut `useEffect` aynen yeniden
  çalışır; çekme kodunun tek satırı değişmedi).
- **3b** Süper panel sekmeleri (Defterler, Kullanıcılar, Çöp) kendi `cek`'lerine abone.
- **Doğrulandı (canlı smoke):** iki sekmede kuyruk senkronu ✅, süper panel dondurma sayacı ✅.
- **SSE yapılmadı** — bilinçli karar (Bölüm 0.1 tablosu).

**ARA TALEP / DÜZELTME TURU** ✅ `[2026-08-09]` — Musa'nın canlı tespitleri, sırayla:

- **Mühürle butonu GERÇEKTEN kaldırıldı.** Belgede 31 Temmuz'da ✅ işaretliydi ama kod hiç
  değişmemişti — **kayıt hatası**: karar doğrulanmadan tamamlandı yazılmıştı. Buton bloğu +
  `mirasiTamamla` + `tamamlaniyor` state'i söküldü; `tamamlandi` türetilmiş sabite çevrildi
  (ölü kod bırakılmadı). **Ders 82.**
- **KAPANIŞ KANONU — `Sabitler.KapanisAni(EtkinlikTarihi)`.** Çizelge "Davetli girişleri
  kapanır · 1 Ekim · özel günden 15 gün sonra" diyordu: etiket kanonu, tarih ESKİ SAKLANMIŞ
  sütunu (ToplamaGun=30 dönemi) gösteriyordu. Kapanış artık her yerde türetilir; **gösterim
  ve davetli KAPI KONTROLÜ aynı yamada** değişti (yalnız ekranı düzeltmek, ekran "kapandı"
  derken davetlinin yazabilmesi demekti). Hizalanan okuyucular: `EtkinlikYaniti`,
  `KatkiUclari` (3 kapı), `SuperTeshisUclari` (röntgen + ölçüm), `SuperUclari`, `ImhaGorevi`.
  Saklanan sütun geriye dönük uyum için duruyor ama **hiçbir okuyucu ona güvenmiyor**.
- **VIP etiketi tutarsızlığı.** İmha tarihi VIP'liydi (2036) ama etiket sabit "20 gün" diyordu
  → `Sabitler.ToplamGunGercek(OzelSaklamaGun)` eklendi; `toplam_gun` VIP dahil döner.
- **Sağlık ucundaki VIP körlüğü.** Gecikmiş imha `KapanisTarihi + SaklamaGun` ile hesaplanıyor,
  `OzelSaklamaGun`'u yok sayıyordu → VIP defter "gecikmiş" görünebilirdi. `Sabitler.ImhaAni`'ye
  çekildi (EF-güvenli ön filtre + bellekte sayım).
- **"Son çıktı: Invalid Date · undefined dilek"** — röntgende. Kök neden **sözleşme kopukluğu**:
  kısayol projeksiyon (`c.DilekSayisi`) camelCase üretiyor, frontend snake_case bekliyordu →
  `undefined` → `new Date(undefined)` ekrana tarayıcının İngilizce metnini basıyordu. Alan
  adları açıkça snake_case yapıldı **+ arayüzde ikinci katman**: kayıt yoksa "Henüz indirilmedi".
  **Ders 83.**
- **İmha edilmiş defter kabukları panelden temizlendi.** İçeriği yok edilmiş defterler aktif
  Defterler listesinde duruyor, üstelik "Yetim / Hareketsiz / müdahale gerekebilir" **yanlış
  alarmı** ve işlevsiz butonlar (Dondur / Özel süre / Çöpe at) taşıyordu. Kural: **imha edilmiş
  defter "defter" değil KANITTIR**; yeri yalnız İmha Arşivi'dir (`.Where(e => e.ImhaEdildi)`
  sorgusu zaten hepsini gösteriyordu - kanıt kaybolmadı). Ölçüm sayaçları da `ImhaEdildi`
  bilincine kavuştu → Ölçüm "İmha gecikmiş 3" derken nabzın "0" demesi çelişkisi bitti.
- **Nabız defter sayaçları.** Beş sayaç imha edilmişleri sayıyordu; ayrıca **"aktif" saklanan
  `Durum` alanından** okunuyordu — o alan kurulumda yazılıp bir daha güncellenmediği için panel
  **her zaman "0 aktif"** diyordu. Aktiflik artık tarihlerden türetiliyor (imha/çöp/dondurulmuş
  değil + davetli penceresi açık), `lib/durum.ts` mantığıyla aynı gerçek. **Ders 59'un tekrarı.**
- **Silinen defter bildirim şeffaflığı.** Üç katman: (1) kalıcı silmede bildirimler sessizce
  yok olmuyor - alıcı başına **tek özet** bildirim kalıyor (`EtkinlikId=null`; eski metinler
  KVKK gereği yaşamıyor; `ImhaGorevi`'nin mevcut deseniyle aynı, paralel yapı kurulmadı);
  (2) `AktifYap` çöpteki (`409 DEFTER_COPTE`) ve imha edilmiş (`404 DEFTER_ULASILAMAZ`) deftere
  geçişi **sunucuda** reddediyor — üyelik kontrolü tek başına yetmiyordu, çünkü çöpte üyelik
  bilinçli olarak duruyor; (3) `UserMenu` geçiş sonucunu **kontrol ediyor** — önceden sunucu
  reddetse bile ekran ilerliyordu. **Ders 84.**


### `[2026-08-10]` E — DENETİM / CANLI AKIŞ ENTERPRISE ✅ KAPANDI

**E1-a Okunurluk** — `frontend/lib/denetim.ts` (yeni, TEK KAYNAK): `DegisenAlanlar` JSONB'si
yıllardır yazılıp hiçbir ekranda okunmuyordu. Artık Türkçe ayrıntıya çevriliyor
("Güncellenen: davet metni, karşılama metni" · "100 gün → varsayılan" · "tema: klasik · A4 · 3 dilek").
Eylem etiketleri iki ekranda ayrı ayrı duruyordu (kaçınılmaz ayrışma) → tek kaynağa taşındı.
Bilinmeyen eylem sessiz kalmaz, okunur hale getirilir.
- *Dürüstlük notu:* kayıtların çoğu "önce → sonra" DEĞİL (yalnız `DEFTER_SAKLAMA_DEGISTIRILDI`
  gerçek diff). `AYAR/ETKINLIK_GUNCELLENDI` yalnız yeni değeri yazıyor → gerçek diff için
  **yazma tarafı** değişmeli (**E1-b**, Bölüm 4'te bekliyor).

**🔴 EŞLER ARASI İZOLASYON — CANLIDA YAKALANDI VE KAPATILDI** `[kritik]`
Denetim ekranı zaten her iki eşin işlemlerini listeliyordu (etiketsiz olduğu için görülmüyordu);
ayrıntı katmanı eklenince "taraf: 2. eş" yazar hale geldi ve **sızıntı görünür oldu**. Bu, ürünün
wedge'inin (birleşim-öncesi izolasyon) ihlaliydi.
- **Kural (backend'de zorunlu):** eşin **onay bekleyen kuyruğuna** ait olaylar (dilek bırakıldı,
  reddedildi, geri alındı, çöpe taşındı, kalıcı silindi) diğer eşe **hiç dönmez**.
- **Bilinçli istisna:** `KATKI_ONAYLANDI` görünür — onaylanan dilek zaten ortak deftere geçer;
  gizlenmesi çiftin kendi eserini yarım görmesi olurdu. Gizlenmesi gereken **reddedilen**dir.
- Süper yönetici salt-okunur incelemede filtre uygulanmaz (teşhis; o ekran çiftin değil).
- **Ders 86.**

**Özne dili** — satırlar artık "kim yaptı" ile başlıyor: **Sen** ikinci tekil ("bir dileği deftere
aldın"), **eşin adıyla** ("Ayşegül baskıya hazır defteri indirdi"), davetli adıyla, sistem olayları
öznesiz. `kaynak_es` **ekrana hiç çıkmaz** (yalnız izolasyon filtresi). Aktör rozeti + gün başlıkları
(Bugün / Dün / 21 Temmuz), satırlarda yalnız saat.

**Gürültü temizliği** — `PUSH_GONDERILDI` çiftin günlüğünden tümüyle çıktı (bildirimi zaten
telefonunda gördü); `basarili / temizlenen / cihaz_sayisi / tip / kaynak_es` hiçbir ekranda
gösterilmiyor (kayıtta duruyorlar - iz bozulmadı).

**E2 Toplulaştırma** — ardışık aynı işlem tek satırda: "3 dileği deftere aldın · 14:32–14:35",
tıklayınca açılır. **Kritik olaylar ASLA toplanmaz** (silme, kalıcı silme, imha, ödeme, yetki,
dondurma, defter oluşturma): her biri tek başına anlamlıdır, katlamak denetimi körleştirir.
Kural: aynı eylem + aynı aktör + 10 dk pencere.

**E3 Filtre + arama** — üç yüzeyde arar: eylem kodu, aktör (ad/e-posta), defter (eş adları).
Ad/defter aramaları önce ID'ye çözülür (N+1 yok). Hızlı tarih aralığı: Tümü / Bugün / 7 / 30 gün
(takvim açtırmak sürtünme). 350 ms debounce; sonuç yoksa açıkça söylenir.

**E4 Sayfalama** — sabit `Take(100)`/`Take(60)` kaydı **sessizce kesiyordu**; bir denetim aracında
sessiz kesme, "kaydın tamamı burada" iddiasını çürütür. **Keyset (imleç)** kullanıldı, offset DEĞİL:
append-only bir günlükte araya giren yeni kayıt offset'te satır tekrarı/atlaması üretir. Yanıt
biçimi **dizi olarak korundu** → backend tek başına güvenle yayına alındı, arayüz sonra eklendi.
Canlı akışta geçmişe inildiğinde **canlı tazeleme duraklatılır** ve bu açıkça yazılır
("Geçmiş görünümü · canlı duraklatıldı" + "Canlıya dön") - yoksa 10 sn'de bir zemin kayardı.

**E4 Katmanlı saklama** `[Musa kararı]` — `Servisler/DenetimTemizlemeGorevi.cs` (yeni):
rutin gürültü **30 gün**, kalıcı iz **2 yıl**, 2 yılı geçen her kayıt silinir.
- **KARA LİSTE, beyaz liste DEĞİL:** yalnız açıkça "rutin" işaretlenenler 30 günde silinir;
  **listelenmemiş ve yarın eklenecek her eylem korunan tarafta** kalır. Envanter taraması
  eylem adını değişkenle yazan yerleri (SUPER_BILDIRIM_*, DISK_UYARI_*, `Denetim(...)` yardımcısı)
  hiç göstermemişti - beyaz liste kursaydık 20+ eylem sessizce silinecekti. **Ders 87.**
- Görev kendi işlemini denetime YAZMAZ (kendi kuyruğunu besleyip döngü yapmasın); sayılar loga.

**E5 CSV** — **yalnız süper panelde**: filtrelenmiş görünüm birebir dosyaya yansır. Çifte CSV
verilmedi (bilinçli: denetim onlar için bir şeffaflık sayfasıdır, tabloya döküp süzmek bir
YÖNETİM eylemidir; KVKK taşınabilirliği ayrı akış). Excel için **UTF-8 BOM** + **noktalı virgül**
ayraç zorunlu.
- **CSV kaçış hatası (v1'de yapıldı, v2'de düzeltildi):** BOM ve satır sonu `\uFEFF` / `\r\n`
  olarak dosyaya düz metin yazılmıştı → dosya tek satır, başında görünür "\uFEFF". Kök neden:
  üretilen kodun kaçış dizileri, üreten aracın (PowerShell) kaçış kurallarıyla karıştırıldı.
  Artık `String.fromCharCode` ile üretiliyor - hiçbir katmanda yorumlanmaz. **Ders 88.**
- Ayrıca ZatenMarker bir **ifade** olarak yazılınca (`'x' + [char]13 + ...`) PowerShell argüman
  konumunda hesaplamadı ve **yanlış pozitif** üretti (fail-safe ters çalıştı). **Ders 89.**

**E6 IP + cihaz** — EKLENMEDİ (önceki karar korundu: çiftin ekranında IP tedirginlik üretir).

---

### `[2026-08-11 → 08-14]` B + İLAVE + BASKI KALİTESİ TURU ✅

**B — Baskıya hazır defter menü düzeni** ✅ Sekmeler: **Defterin** (varsayılan) · **Dilekler** ·
**Çerçeve**. İlk açılışta kullanıcı ESERİNİ görür, sonra düzenler (önce gurur, sonra kurgu).
"Defterin"de sağ sütun kapanır, ızgara tek kolona düşer, sayfa çevirme defteri tam genişlikte
yukarı çıkar. **Blok taşınmadı** - görünürlük sekmeye bağlandı (1200 satırlık kritik dosyada
kes-yapıştır, kazancı olmayan en büyük risktir).

**İLAVE — Anı sonu otomatik noktalama** ✅ Metin harf/rakamla bitiyorsa nokta eklenir; noktalama,
tırnak, parantez, emoji ile bitiyorsa dokunulmaz (tek koşul, uzun "yasaklı karakter" listesinden
hem kısa hem güvenli). **Veri değişmez** - yalnız basımda editöryel biçim. Ölçüm de aynı metni
görür (yoksa eklenen nokta satır taşırıp tahmini kaydırırdı).

**ÖNİZLEME CANLI SENKRONU** ✅ Dilek sırası/çerçeve/tema değişince sayfa çevirme defteri
donuyordu; indirilen PDF ise DOĞRUYDU (sunucu güncel, ekran eski). İki katman:
- **Sürüm damgası:** sunucuya başarılı her yazımdan sonra sayaç artar, önizleme yeniden çeker.
  Stale-while-revalidate (eski sayfa ekranda kalır) + 600 ms sus (ok tuşuna üst üste basınca
  tek üretim) + sayfa kırpma (dilek çıkınca boş sayfada kalma).
- **ASIL KUSUR — tarayıcı önbelleği:** sayfa görüntüleri SABİT adresten geliyordu
  (`/onizleme/0.png`); tarayıcı aynı URL'yi sunucuya sormaz. Sunucunun zaten hesapladığı
  **içerik parmak izi** URL'ye eklendi (`?s=<iz>`): içerik aynıysa önbellek çalışır (hızlı),
  değiştiyse URL değişir ve güncel görüntü iner. **Ders 90.**
- **Bonus:** tazeleme sırasında kâğıdın köşesinde "Defterin güncelleniyor" nabzı.

**RENKLİ EMOJİ — FONT DEĞİL GÖRÜNTÜ** ✅ (`Servisler/EmojiServisi.cs` + 3720 Twemoji PNG)
Yolculuk ve her adımın gerekçesi:
1. Emoji "tofu" (siyah kutu) basılıyordu - gövde fontu (Inter) emoji taşımıyor.
2. Tek renk Noto Emoji yedek fontu denendi → kontur çizimler, sepya sayfada ucuz durdu.
   Ayrıca `FallbackFontFamily` QuestPDF 2024.12'de YOK (doğrulanmamış API kullanıldı - **Ders 91**);
   doğrusu `FontFamily(GovdeFont, EmojiFont)` (params dizi).
3. **Karar: emoji GÖRÜNTÜ olarak basılır.** Font çözümlemesi devreye hiç girmez → harf kaybı,
   kutu, COLR/CBDT güvenilmezliği riski YOK. Twemoji (CC-BY 4.0), 72px **RGBA** PNG.
   Palet moduna sıkıştırma DENENDİ ve geri alındı: palet+alfa SkiaSharp'ta güvenilmez.
4. Ayrıştırma: en uzundan kısaya eşleme - bayrak, ten tonu, ZWJ aile dizileri **tek parça**;
   FE0F'li ve FE0F'siz iki aday denenir (Twemoji adlandırma kuralı). ASCII karakterlerin
   emoji karşılığı YOK, harf/rakam asla emoji sanılmaz.
5. **ASIL KUSUR — varlıklar yayına kopyalanmıyordu:** `csproj` yalnız `Fontlar\*.ttf` taşıyordu,
   `Varliklar\Emoji` imajda hiç oluşmuyordu. Servis klasörü bulamayınca metni dokunmadan
   geçiriyordu. **Ders 92.**
6. **TOFU KALKANI (kalıcı kural):** bir karakter emoji aralığındaysa ama görseli yoksa
   **hiç basılmaz**. Twemoji 15, Unicode 16 emojilerini kapsamıyor - onlar tofu basıyordu ve
   her yıl yenileri eklenecekti. Aralık kuralı bugün var olmayanı da kapsar. **Ders 93.**
7. **Ölçüm:** emoji görsel olduğu için ~2.4 harf genişliğinde; metin uzunluğundan sayınca dar
   tahmin edilip emoji yoğun dilek sayfayı taşırıyordu (kart çerçevesi oluşmuyordu). Ölçüme
   emoji payı eklendi.

**TÜRKÇE BÜYÜK HARF** ✅ Kapakta "NİŞANıMıZ" yazıyordu - `ToUpperInvariant` İngilizce kuralla
çalışır. `tr-TR` kültürüne çekildi → "NİŞANIMIZ".

**PDF METİN KATMANI ONARIMI** ✅ Kopyala-yapıştır ve aramada harfler düşüyordu
("Başkasının" → "Başasının", "Bi Anı Bırak" → "Bi Aı Bırak"). **Görselde sorun yoktu** - metin
katmanında NUL vardı.
- **Kök neden:** Fraunces'ın `rvrn` (zorunlu varyasyon alternatifleri) özelliği harfleri `.alt`
  biçimleriyle değiştiriyor; `.alt` gliflerinin **cmap karşılığı yok**, PDF ters eşlemesi NUL yazıyor.
  Regular/SemiBold: **h, m, n, s, &** · İtalik: **b, d, h, k, l, v, w, &** (kapak italik olduğu için
  oradaki "k" kayboluyordu).
- **Çözüm:** `.alt` çizimleri taban harflere **kalıcı işlendi**, `rvrn`/`ss01` kaldırıldı.
  Koordinat düzeyinde doğrulandı: **çizim ve genişlikler birebir aynı** → sayfada hiçbir görsel
  değişiklik yok, yalnız eşleme düzeldi.
- **Kanıt:** yeni PDF'te belge genelinde **sıfır NUL**; "Başkasının & Defteri", "Bi Anı Bırak",
  "Deneme Altı" tam kopyalanıyor ve aranabiliyor. **Ders 94.**

---

---

## 4. BEKLEYEN İŞLER — ONAYLI, KODLAMA SIRASINDA `[2026-07-25 kararları]`

> Hepsi Musa tarafından onaylandı; kodlama bekliyor. Sıra Bölüm 5'te.

### G) Bildirim + yaşam döngüsü tanısı ✅ **TAMAMLANDI [2026-07-31]**
Üç ayrı kusur, tanı koddan:

1. **"silindi ama duruyor" hissi** — `lib/durum.ts`'te imha evresi `kalanMs <= 0` ile açılıyor
   ve "kalıcı olarak silindi" (GEÇMİŞ ZAMAN) diyor. Ama `ImhaGorevi` henüz çalışmamış olabilir
   → defter fiziksel duruyor (listeleniyor, indiriliyor). **Düzeltme:** `kalanMs <= 0` ama
   `imha_edildi === false` iken metin BEKLEYEN durum ("Süre doldu · kalıcı silme işleniyor");
   yalnız `imha_edildi === true` iken "silindi".
2. **Saatlik (Faz 2) bildirimler gelmiyor** — (a) `HatirlatmaGorevi` imha anını
   `EtkinlikTarihi.Date.AddDays(ToplamGun)` ile buluyor; `.Date` saati gece yarısına kırpıyor,
   oysa her yer `KapanisTarihi + SaklamaGun` (saat korunur) kullanıyor → Faz 2 saat-eşikleri
   kayıyor. **Düzeltme:** Faz 2 imha anını `KapanisTarihi`'nden alsın (saat korunur). (b) Deneme
   defteri "sonlaniyor" evresi doğrudan imhanın üstüne düşüyor → üst eşikler zaten geçmiş.
   **Faz 2 pencere-kapanış bloğu + `ImhaGorevi` sıklığı okunacak** — kesin fix için gerekli.
3. **"Dilek toplanıyor · 16 gün"** eksik etiket — `son-gunler` evresi. **Düzeltme:** "Dilek
   toplanıyor · Kalıcı silinmeye son: N gün" (üç ekran tek kaynak, `lib/durum.ts`).

### Mühürle butonu ✅ **GERÇEKTEN KALDIRILDI [2026-08-09]**
> ⚠ Bu madde 31 Temmuz'da yanlışlıkla ✅ işaretlenmişti; kod o gün DEĞİŞMEMİŞTİ.
> Karar doğrulanmadan "tamamlandı" yazmak, unutmaktan daha zararlıdır (Ders 82).
`kurasyonTamamla` yalnız `Durum="tamamlandi"` yazıyor; hiçbir şeyi kilitlemiyor, bildirimlerle
İLGİSİ YOK (`HatirlatmaGorevi` "tamamlandı"ya bakmıyor — kanıt). İşlevsiz buton.
**Karar:** manuel buton kaldırılır; "tamamlandı" metriği gerçek indirmeden türetilir
(`KurasyonCiktilari` kaydı = eser indirildi = miras tamamlandı).

### I) VIP Anı Defteri ✅ **TAMAMLANDI [2026-08-01]** (alan adı: `OzelSaklamaGun`; bkz. KURAL E)
`etkinlikler` tablosuna nullable **`SaklamaGun`**. Boşsa `Sabitler.ToplamGun` (20), doluysa o
sayı. **Yalnız süper panelden** girilir/değiştirilir/kaldırılır. `ImhaGorevi` ve `lib/durum`
sadece farklı bir sayı okur — ikinci kod dalı yok, sızma yüzeyi yok, geri alınabilir.
**Onaylanan varsayılan uzatma: 3650 gün (10 yıl).** Davetliye TAM yapı gösterilir (karşılama
`saklama_gun` alanı gerçek sayıyı yazar). **Yeni KVKK/şart/gizlilik dokümanı YOK** — mevcut
metinler süreyi dinamik okur; tek defter için gürültü çıkmaz. Gerekçe: "asla silinmez" hukuken
zayıf, "3650 gün" denetlenebilir; KVKK "belirli süre" ister.

### H) Ad soyad otomatik büyük harf ✅ **TAMAMLANDI [2026-08-01]**
Eş kayıt formu (ilk kayıt) + davetli dilek formu. **Tuzak:** CSS `capitalize` Türkçede yanlış
("istanbul"→"Istanbul"). Doğrusu JS `toLocaleUpperCase("tr-TR")`. Dönüşüm **blur'da** (yazarken
değil — imleç zıplamasın); çok kelimeli ad doğru işlenir ("ayşe nur"→"Ayşe Nur").

### F') Aktif defterin menüden silinmesi ✅ **TAMAMLANDI [2026-08-01]**
`UserMenu`'de açık defter silme kapalıydı ("ağacın bastığı dalı kesmek"). Artık `AktifEtkinlikId`
sunucuda tutulduğu için çözülebilir. Akış: onay → çöpe taşı → başka defter varsa ona geç +
`/gelen-dilekler` → yoksa `/etkinliklerim`. "Son defterin" uyarısı buraya da taşınır. Web (x) +
mobil sola-kaydır aynı `TehlikeliEylem` onayına çıkar.

### A) Salon Karekod Seti `[onaylı + tüm bonuslar]`
Menü: **"Salon Karekod Seti"** (avatar altında "Davetiyene QR Kodu Ekle"nin hemen altında).
A3 salon girişi + A5 masa üstü, iki eş için iki ayrı ZIP + beni-oku. `lib/lockup.ts` +
`lib/indir.ts` deseni hazır; yeni olan poster düzeni. Wordmark + QR + `www.bianibirak.com` +
isimler/tarih, vektörel (kayıpsız), matbaaya doğrudan gönder. Bonuslar (hepsi onaylı):
- **A1** Mesafe tipografisi: A3 3m'den, A5 50cm'den okunur — tek iskelet, iki tipografik ölçek.
- **A2** QR fiziksel asgari boyut garantisi (A3 ~4cm, A5 ~2,5cm) — optik gerçek, kod garanti eder.
- **A3** Kesim payı 3mm + kesim işaretleri (matbaa standardı).
- **A4** "Hangi taraf?" ayrımı posterin kendisinde (çift-link izolasyonu görsel olarak).
- **A5** Beni-oku'da matbaa talimatı (A3 kuşe 170gr mat, A5 kuşe 300gr gibi somut öneri).
- **Reddedilenler:** NFC etiket, kişiye özel QR (izolasyon eş düzeyinde — Musa teyit etti),
  masa numarası bazlı ayrı kodlar.

### B) Baskıya Hazır Defter menü düzeni ✅ **TAMAMLANDI [2026-08-11]** (ayrıntı Bölüm 3)
Tamamen frontend, tek dosya (`baskiya-hazir-defter/page.tsx`), backend akışına dokunulmaz.
- "Defterin" bloğu (sayfa çevirme) sekmelerin dışından çıkarılır; artık yalnız varsayılan
  sekmede görünür ve daha yukarı çıkar.
- "Eserin canlı önizlemesi" (sağ sütun) "Düzen" alanından çıkarılır.
- **Sekme adları (Seçenek 1, onaylı):** **Defterin** (varsayılan, sayfa çevirme + tema/gruplama)
  · **Dilekler** (seçim, sıra) · **Çerçeve** (kapak, ithaf, kapanış).
- İlk açılışta "Defterin" açılır → kullanıcı önce eserini görür, sonra düzenler.

### C) Akıllı Sıralama + sayfa düzeni `[onaylı]` — EN BÜYÜK/RİSKLİ · SIRADA

**MOTOR HARİTASI `[2026-08-14 çıkarıldı]`** — kod okunarak doğrulandı:
- `DefterDerleyici` sayfalama YAPMAZ; yalnız veriyi toplar (dilekler, görseller, kurasyon).
  Sayfaları bölen yer **`BaskiServisi`**tir - ve o da bölmüyor: tüm dilekler tek `Column`
  içinde akıyor, **sayfa kırma kararını QuestPDF veriyor**.
- **C2 (bölünme yasağı) ZATEN VAR:** her kart `ShowEntire()`; sığmayan kart (5000 karakterlik
  dilek) bu kilidi alırsa QuestPDF tüm defteri çökertirdi, o yüzden `KartSigarMi` ile önce
  ölçülüp sığmıyorsa bilinçli olarak bölünmeye bırakılıyor. (Cümle sınırında bölme + "…devamı"
  kısmı yok.)
- **C4 (dul satır) KISMEN VAR:** bölüm başlığı `ShowEntire()` ile sarılı.
- **C1 (ölçüm) YOK - asıl kusur:** `KartSigarMi` yüksekliği TAHMİN ediyor ("ortalama karakter
  ~5pt", "satır ~18.1pt"), %86 güvenlik eşiğiyle. Emoji payı eklendi ama temel hâlâ tahmin.
- **C3 (optik denge) YOK:** boşluk her zaman sayfanın ALTINDA birikiyor.
- **Bonus 2 (dilek→sayfa) İMKÂNSIZ:** hangi dileğin hangi sayfaya düştüğünü kimse bilmiyor.

**C'nin gerçek işi: sayfalama kararını QuestPDF'ten geri almak.** O zaman C3 mümkün olur
(boşluğu biz dağıtırız), Bonus 2 mümkün olur (eşlemeyi biz üretiriz), C1 zorunlu olur
(bölmek için doğru ölçmek şart). **C1 olmadan C3 yapılamaz** - yanlış ölçüm = sayfaya 4 kart
koyup 3'ünün sığması = bozuk defter.

**RİSK:** bugün çalışan bir motor var (PDF doğru, önizleme doğru, çökme koruması var).
Sayfalamayı devralmak bu güvenliği bizim üstlenmemiz demektir; yanlış ölçüm
`DocumentLayoutException` → hem indirme hem önizleme çöker.

**Aşamalar `[onaylı]`:**
- **C-1** `SayfaPaketleyici` ayrı sınıf: GERÇEK ölçüm (tahmin değil), sayfalara bölme,
  `dilek → sayfa` eşlemesi. **Hiçbir yerden çağrılmaz** - deploy edilse bile davranış değişmez.
- **C-1b** Doğrulama: mevcut defterlerle karşılaştır (paketleyicinin sayfa sayısı QuestPDF'inkiyle
  tutuyor mu). Kanıt görülmeden bağlanmaz.
- **C-2** Derleyici paketleyiciyi kullanır + **C3 optik denge**. Asıl değişim, tek başına geri alınabilir.
- **C-3** Sıralama seçenekleri (akıllı · kendi sıram · taraflara göre · kronolojik).
- **C-4** **Bonus 2:** Dilekler listesinden "Defterde göster" → o sayfaya atlama. Eşleme,
  paketleyicinin doğal yan çıktısıdır; ayrıca hesaplanmaz.

Bonuslar: **C1** ölçüm tek kaynaktan · **C2** bölünme yasağı + cümle sınırı istisnası ·
**C3** optik denge (boşluk eşit dağıtılır - *"sayfa boşluklarının görsel uyumla doldurulması"*) ·
**C4** dul satır kontrolü. **C5** çift sayfa dengesi - ilk turda çıkarıldı.

### İLAVE) Anı sonu otomatik noktalama ✅ **TAMAMLANDI [2026-08-12]** (ayrıntı Bölüm 3)
Anıların bittiği anda noktalama işareti yoksa otomatik NOKTA konur. Defter görsel bütünlüğü için.
Derleme aşamasında metin normalizasyonu (`DefterDerleyici` / kürasyon çıktısı). **Konum:** C ile
aynı aile (defter görsel bütünlüğü); C'nin bir alt kalemi olarak ya da bağımsız hızlı iş.

### D) Süper yönetici bildirim sistemi ✅ **TAMAMLANDI [2026-08-04]** — D1-D5 tümü
Altyapı hazır (`PushGonderici`, `bildirimler`, `denetim_gunlukleri`). Yeni: olay→seviye→kanal
katmanı. Bonuslar:
- **D1** İki seviye — soru: "bunu bilmezsem 12 saat içinde zarar oluşur mu?"
  - ANLIK push: ödeme geldi · disk kritik/acil · KVKK talebi · destek talebi · imha görevi takıldı
  - GÜNLÜK ÖZET (sabah tek bildirim): yeni kayıtlar · yeni defterler · eş katılımları · kalıcı
    silmeler · kürasyon tamamlamaları
- **D2** Eşik + toplulaştırma (1 saatte 10 kayıt → tek bildirim "10 yeni kayıt"). Bildirim körlüğü
  bir numaralı ölüm sebebi.
- **D3** Yönetici tercih ekranı DB'de (hardcoded yasak).
- **D4** Sessiz saat yalnız ANLIK'a.
- **D5** Tek merkez: `BildirimKurallari` servisi.
- **Reddedilenler:** her dilek/giriş için bildirim, e-posta kanalı (FAZ 4 gelmeden).
- **NOT:** D, günlük özet mail'e HAZIR kurulur ("bu olay özete girer" bayrağı baştan).

### E) Denetim günlüğü + Canlı akış ✅ **TAMAMLANDI [2026-08-10]** (ayrıntı Bölüm 3)
Veri zaten kayıtlı (`DegisenAlanlar` JSONB okunmuyor). Bonuslar:
- **E1-a** Okunurluk ✅ · **E1-b** gerçek eski→yeni diff (yazma tarafı) ⬜ **BEKLİYOR**
- **E2** Toplulaştırma ✅ (kritik olaylar hariç)
- **E3** Filtre + arama ✅
- **E4** Sayfalama — şu an `Take(100)`/`Take(60)` sessizce kesiyor; denetimde sessiz kesme kabul
  edilemez.
- **E5** CSV ✅ (yalnız süper panel)
- **E6** IP + cihaz kaydı — **EKLENMEDİ** (Musa kararı: çiftin ekranında IP tedirginlik üretir;
  veri minimizasyonu).

### Tam ekran defterin (x) butonu ✅ **TAMAMLANDI [2026-07-31]**
Tam ekranda kapatma butonu kayboluyor. Destek modalındaki stabil desenle (`Portal` +
`TamEkranKatman`) düzeltilecek; `DefterOnizleme` bileşeni okunacak.

### Mail günlük özeti — brief bekliyor `[FAZ 4 sonrası]`
Push + uygulama + **PDF'li premium mail** günlük özet (sistem/kullanıcı/defter/içerik/sağlık/
hafıza). Mail altyapısına bağlı (FAZ 4). **Konum:** FAZ 4'ün hemen ardına ayrı brief. Dünyaca
ünlü bir markanın günlük kontrolleri kalitesinde, PDF formatında.
**HAZIRLIK TAMAM `[2026-08-03]`:** `GunlukOzetHesabi` tek kaynak olarak kuruldu; mail geldiğinde
yalnız **teslimat katmanı** eklenecek — toplulaştırma yeniden yazılmayacak.

---

## 5. GÜNCEL İŞ SIRASI `[2026-08-04, onaylı]`

> Sıra bağlayıcıdır; her iş bir öncekinin üstüne kurulur.

**BİTENLER (2026-07-31 → 08-04):** Paket F ✅ · G-1 ✅ · G-2 ✅ · Tam ekran (x) ✅ · I VIP ✅
(+ KURAL E) · H ✅ · F′ ✅ · çöp filtresi ✅ · **1.2 hata görünürlüğü** ✅ · **D bildirimler** ✅

**BİTEN (2026-08-09):** CANLI SENKRON ✅ (1a, 1b, 2, 3a, 3b — SSE bilinçli olarak yapılmadı)
**BİTEN (2026-08-09) — ara talep turu:** mühürle sökümü ✅ · kapanış kanonu ✅ · VIP etiketi ✅ ·
sağlık ucu VIP körlüğü ✅ · "Invalid Date" sözleşme kopukluğu ✅ · imha kabuğu temizliği ✅ ·
nabız sayaçları ✅ · silinen defter bildirim şeffaflığı ✅

**BİTEN (2026-08-10):** **E** denetim/akış enterprise ✅ (E1-a, E2, E3, E4 + katmanlı saklama, E5;
E1-b bekliyor, E6 eklenmedi) · eşler arası izolasyon kapatıldı 🔴
**BİTEN (2026-08-14):** **B** menü düzeni ✅ · **İLAVE** noktalama ✅ · önizleme canlı senkronu ✅ ·
renkli emoji + tofu kalkanı ✅ · Türkçe büyük harf ✅ · PDF metin katmanı ✅

**SIRADA:**

**Sonra:**
2. **B** baskıya hazır menü düzeni (küçük, frontend, tek dosya)
3. **C** akıllı sıralama + sayfa düzeni (C1-C4) + **İLAVE** anı sonu noktalama (büyük, PDF motoru)
4. **A** salon karekod seti (A1-A5 bonuslarıyla)

**FAZ 3 — davetli deneyimi (tek blok):**
5. Davetli karşılama görsel güçlendirme (3.3) + fotoğrafı öne çıkarma/teşvik + gönderim
   sonrası teşekkür/satış motoru sayfası (3.4). Parça parça değil, tek bütün.

**FAZ 4 sonrası:**
6. Mail altyapısı → günlük özet motoru (push + uygulama + PDF mail; `GunlukOzetHesabi` hazır).

---

## 6. FAZLI PLAN

### FAZ 1 — ALTYAPI SAĞLAMLAŞTIRMA ✅ **KAPANDI `[2026-08-04]`** (E hariç — Bölüm 5/5)
- **1.1 Sağlık ucu (`/api/saglik`)** ✅ **canlıda** — anonim: ayakta mı; süper admin: DB yanıt
  süresi, disk %, gecikmiş imha, bekleyen destek/ödeme. `https://www.bianibirak.com/api/saglik`.
- **1.2 Hata görünürlüğü** ✅ **canlıda** — `sistem_hatalari` + global middleware + süper panel
  "Hatalar" sekmesi (son 20: mesaj + zaman + uç + tip).
- **1.4 Süper yönetici bildirimleri (D)** ✅ **canlıda** — merkez + anlık + günlük özet +
  per-admin tercih ekranı.
- **1.3 Deneme defteri (seed)** ✅ **canlıda** — tür + evre seçilerek gerçekçi dolu defter.

### FAZ 2 — ÖDEME CTA'SI + ZAMAN TÜNELİ ⬜
- **2.1 Ödeme CTA'sı** — iki aşamalı: bilgilendirme ekranı → kesin ödeme.

### FAZ 3 — DAVETLİ DENEYİMİ ⬜
- **3.2 Konfeti** `[açık karar]` — tek seferlik mi, döngü mü?
- **3.3 Sıralı karşılama** `[açık karar]` — davetiye→isimler→tarih→sayaç→dilek alanı (~260ms,
  toplam ~1,3sn). **Görsel güçlendirme burada.**
- **3.4 Gönderim sonrası teşekkür ekranı** `[onaylı]` — "Bıraktığın anı defterlerine eklendi" +
  defterden bir kare + "Sen de bir defter aç" + "Bir yakınına öner". Davetli→müşteri dönüşümünün
  tek doğal noktası; premium tanıtım sayfası hissi. **Satış motoru burada.**
- **YENİ madde:** Davetli fotoğraf gönderimini öne çıkarma/teşvik.
- **REDDEDİLDİ:** yazarken canlı önizleme · fotoğraf kalite güvencesi rozeti.
- **Not:** Bu faz gerçek fotoğraf akışı + gerçek davetiye görseliyle eksiksiz önizlenip
  onaylandıktan sonra kodlanır.

### FAZ 4 — E-POSTA ALTYAPISI ⬜
Şifre yenileme akışı için. Sağlayıcı (Resend/Postmark/Brevo/SMTP), marka lockup'lı responsive
HTML şablon, token + süre + tek kullanım + audit, **SPF/DKIM/DMARC**. Sınır: yalnız **işlemsel**
mail — İYS/6563 gereği pazarlama maili YOK. **Ardından:** günlük özet mail brief'i (Bölüm 4).

### FAZ 5 — ESER ⬜
- **5.1 Defter künyesi** — lockup + karekodun altına `www.bianibirak.com`, flatten ile gömme.
- **5.2 Dış kapaklar** — kalın ön/arka kapak, eşler kapak fotoğrafını seçer, ayrı PDF, sırt,
  arka kapak = marka künyesi. Makul varsayılan → matbaa deneme baskısından sonra ince ayar.
- **5.3 Kişiselleştirme motoru** `[açık karar: ne kadarı premium?]` — tipografi, sayfa düzeni
  varyantları, renk/tema, bölüm başlıkları, kapak kompozisyonu.

### FAZ 6 — TİCARET ⬜
- **6.1 Ödeme aktivasyonu** `[hukuki statü netleşince]` — `odeme_ayarlari` (IBAN + fiyat +
  Aktif). İki kanal: web = havale/kart · mağaza = IAP.
- **6.2 Tanıtım sitesi + satış motoru** — kök sayfa, `/demo`, public sayfalar, teşekkür/dilek
  blogu, düğün sonrası push ile blog daveti, SEO.

### BAKIM KALEMLERİ
| # | Konu | Not |
|---|---|---|
| B1 | Matbaa deneme baskısı | + CMYK sorusu + EPS gradyan çizgi kontrolü |
| B2 | Hetzner Volume | Medya ayrı diske. **VIP (10 yıl saklama) kural olursa öne çekilir.** |
| B3 | notlar-backend multi-stage | ~4,5 GB kazanç, risk yok |
| B4 | jspdf 2 → 4 | `dompurify` advisory; risk yolu kapalı; major atlaması vektörü kırabilir |
| B5 | Uluslararasılaşma | Çeviri + her ülke veri rejimi + mağaza vergi. Ayrı oturum. |
| B6 | **DataProtection anahtarları** `[YENİ 2026-08-04]` | `/home/apiuser/.aspnet/DataProtection-Keys` container yeniden kurulunca kayboluyor (logda uyarı). JWT ile çalıştığımız için bugün zararsız; ileride volume ile kalıcılaştırılabilir. |

---

## 7. KAPSAM DIŞI — kalıcı kararlar

- **B2B2C organizatör katmanı** — İSTENMİYOR. Sistem kalıcı olarak B2C: tenant = etkinlik.
  ✅ `[2026-08-09]` Project Instructions Bölüm 3 de bu yönde güncellendi — iki belge uyumlu.
- **Dijital Arşiv ZIP** (orijinal çözünürlüklü fotoğraflar) — İSTENMİYOR.
- **Sabit fiyat kaydı** — kodda tutulmaz; süper panelden girilir.
- **Test bildirimi düğmesi** — gerek görülmedi.

---

## 8. İŞ / ÖLÇÜM PLANI `[referans]`
- 8 Türkçe rakip: hepsi toplayıcı → kürasyon/baskı gerçek fark.
- Pazar ~552.237 çift/yıl.
- **Ölçüm: 3 düğün** (2 arkadaş Ağustos + Musa 1 Eylül) — ödeme AÇILMAYACAK.
- **E-POSTA TOPLANMAYACAK** (İYS/6563) — işlemsel mail hariç.
- **Kapasite:** 6 ayda ~10 eşzamanlı defter. 3200px'te ~3 GB. 25 GB boş. Rahat. (VIP kalıcı
  defterler bu hesaba eklenir; kural olursa B2 öne çekilir.)

---

## 9. PAHALI ÖĞRENİLEN DERSLER

**Önceki oturumlardan:**
1. `ExecuteSqlRaw` `String.Format` uygular → DDL için raw ADO.NET (`SemaKurucu`).
2. Container'da sistem fontu YOK → QuestPDF TTF ister.
3. Minimal API `IFormFile` olmayanı QUERY'den bind eder.
4. Tailwind opacity-modifier CSS-değişkenli renkte GEÇERSİZ (`rgb(var(--x)/<alpha>)` biçimi şart).
5. `blob:` URL kırılgan (service worker) → `data:`.
6. `object-cover` kırpar → kutu oranı = foto oranı.
7. CSS grid item default `min-width:auto` → `min-w-0` zinciri şart.
8. iframe `X-Frame-Options: DENY` → header doğru, mimariyi düzelt.
9. Denge kontrolü comment+string STRIP etmeli → proper tokenizer.
10. Süper admin eylemleri çiftin denetiminde GÖRÜNMEMELİ.
11. Zaman modeli tek kanon — user-configurable pencere çizelgeyi yalancı yapar.
12. İmhada dosyalar EN SON (DB commit sonrası).
48. Etkinliğe bağlı YENİ tablo eklenince SİLME ZİNCİRİ güncellenir.
49. Service worker JS'ini DOĞRULA (`node --check public/sw.js` build'e eklendi).
50. Kritik olmayan işlem kritik kurulumu engelleyemez (`cache.add` try/catch).
51. Bir promise'in çözüleceğini VARSAYMA (`serviceWorker.ready` zaman aşımı).
52. Başlangıç durumu bir VARSAYIMDIR (bilmemek ≠ desteklememek).
53. iOS'ta izin YALNIZ kullanıcı jesti içinde istenir.
54. Bir iş için TEK mekanizma (yarışan üç mekanizma "bazen çalışan" üretir).
55. Reaktif olmayan parametre okuması "bazen çalışır" üretir (olay tabanlı çözüm).
56. Bir kontrol engellediğinde SEBEBİNİ göstermek zorundadır.
57. Görünüp çalışmayan buton = bozuk buton.
58. Geri alınabilirlik onay penceresinden üstündür; geri dönüşsüzde yazarak teyit şart.
59. Saklanan durum gerçekle arasını açar → türetilebilen hiçbir şey saklanmaz (`lib/durum.ts`).

**Bu oturumdan `[2026-07-25]`:**
60. **Tenant çözümü kopyalanırsa ayrışır** — dört uç dosyasında ayrı kopya vardı, kural birine
    eklenince diğerleri sessizce geride kaldı → `TenantErisim` tek kaynak.
61. **`.tsx` denge sayacı JSX metninde ve `${...}` interpolasyonunda yanılır** — gerçek TS
    parser kullan: `tsc --noEmit --jsx preserve ...`; `TS1xxx`/`TS17xx` sözdizimi, `TS2307`/
    `TS7026` beklenen (modül yok / JSX tipi).
62. **`api.ts` ağ hatasında `durum:0` döner, 401 değil** — sayfalar yalnız `!ok`'a bakınca ağ
    blibini oturum düşmesi sanıyor → `oturumDustu` yalnız 401.
63. **GET uçları da yazabilir** — `KurasyonGetir` (kürasyon oluşturur), `defter.pdf`
    (`ESER_INDIRILDI` + `kurasyon_ciktilari`) → write-guard GET'i kesmez; inceleme guard'ı
    GET'lerde de gerekli.
64. **İnceleme'de türetilmiş senkron çalışmalı, oluşturma bloke** — onaylı dilekleri öğe yapmak
    idempotent/türetilmiş; kürasyonu sıfırdan kurmak yeni durum. İkisini aynı kefeye koymak
    teşhisi kör etti.
65. **Arayüz yalan söylememeli** — backend 403 dönse de React yerel state "değişti" gösteriyordu;
    yapılamayacak bir şey yapılabilirmiş gibi gösterilmez (salt-okunur kilit).
66. **`lib/durum` "silindi" demeden önce imha_edildi'yi beklemeli** — imha ANI ile imha İŞLEMİ
    arası pencerede arayüz gerçekleşmemiş silmeyi "oldu" ilan ediyordu.
67. **Faz 2 saat-hassas eşikler `.Date` kırpması kullanmamalı** — imha anı `KapanisTarihi`'nden
    (saat korunur) alınmalı; `EtkinlikTarihi.Date` kırpması saat-eşiklerini kaydırır.


**Dördüncü oturumdan `[2026-07-31 → 2026-08-04]`:**
68. **Değer doğrulaması yetmez, SONUCU doğrula.** VIP'te "≥ alt sınır" kontrolü vardı ama oluşan
    **imha tarihinin** geçmişe düşüp düşmediğine bakılmıyordu → geçmiş tarihli defter anında
    imha edildi. Veri yok eden her yolda "sonuç geçmişte/anında mı?" kilidi zorunlu.
69. **Yumuşak-silme alanı taşınınca onu OKUYAN tüm sorgular birlikte güncellenmeli**
    (`DeletedAt` → `SilindiMi`; liste eski alana bakıp hayalet gösterdi).
70. **İdempotency işaretçisi doğru alana bakmalı.** `DiskGozcusu` `Bildirim.Tip`'e bakıyordu ama
    `PushGonderici` Tip'i url'den türetip eziyor → kontrol hiç tutmuyordu. Görev idempotency'si
    **audit tabanlı** olmalı.
71. **Yama idempotency'si eklenen İÇERİĞE bağlanmalı, anchor'a değil.** `"use client"` anchor'ına
    bakan yama iki kez çalışınca çift import / çift `onBlur` üretti → build kırıldı.
    `ZatenMarker` = eklenecek satırın kendisi.
72. **Global hata middleware istemci iptalini elemeli** (`OperationCanceledException` +
    `RequestAborted`), ayrıca **iç exception zinciri** yazılmalı — `DbUpdateException`'da asıl
    neden `InnerException`'dadır.
73. **Eşzamanlı upsert yarışı gerçektir.** `pushSenkronEt` her açılışta çağrıldığı için iki sekme
    aynı token'ı ekleyip `23505`'e takıldı → benzersizlik ihlali yakalanıp sessizce başarılı.
74. **Aynı bilgiyi iki yer gösteriyorsa tek kuraldan beslenmeli.** Push "120 saat", defter
    "5 gün" diyordu → `KalanMetni` ≡ `kalanMetin` + "ikisi birlikte değişir" notu.
75. **ZAMAN AKIŞI GÖRÜNMEZ BİR DEĞİŞİM KAYNAĞIDIR.** Damga tabanlı senkron sunucuda bir şey
    değişmediği için olay yayınlamaz; ekran açıldığı andaki değeri dondurur → geri sayım
    gösteren her yer **canlı saate** bağlanmalı (Bölüm 0.1).
76. **Büyük/karmaşık dosya değişiminde anchored patch yerine dosyayı BÜTÜNÜYLE yeniden yaz** —
    `Expand-Archive -Force` üzerine yazar, anchor riski sıfır.
77. **Eklemeli aşamalandırma riski böler.** D-C-1a (veri katmanı, davranış değişmez) → D-C-1b
    (görev per-admin) → D-C-2 (ekran); çalışan görev tek turda yeniden yazılmadı.


78. **Yayın kurmak yetmez, DİNLEYEN olmalı.** Aşama 2'de merkezî yayını kurup smoke'ta
    "artık anında" dedim; hiçbir ekran dinlemediği için görünürde hiçbir şey değişmedi.
    Altyapı katmanı tek başına kullanıcıya değer üretmez — tüketici katmanı aynı planda olmalı,
    ve smoke beklentisi ancak zincirin TAMAMI bağlandıktan sonra yazılmalı.
79. **Aynı dosyada birden çok yamada `ZatenMarker` metinleri BENZERSİZ olmalı.** 3b'de üç edit
    aynı marker'ı kullanıyordu; ilki uygulandıktan sonra ikincisi "zaten var" sanıp atlanacaktı.
    Marker, o edit'in kendi eklediği benzersiz yorum satırı olmalı.
80. **`useEffect` içine gömülü veri çekme, dışarıdan tetiklenemez.** Çözüm, çekme kodunu
    `useCallback`'e taşımak (riskli) değil, **tazeleme sayacı**: bir state bağımlılık dizisine
    eklenir, dinleyici sayacı artırır; mevcut effect AYNEN yeniden çalışır. Çalışan mantığa
    dokunmadan senkron kazanılır.
81. **Hook'lar bileşenin en üst seviyesinde olmalı.** `map()` içindeki IIFE'de hesaplanan rozete
    hook konamaz; tik EBEVEYNE kurulur (React hook sayısı render'lar arasında değişemez).


82. **Doğrulanmamış hiçbir iş "tamamlandı" yazılmaz.** Mühürle butonu belgede ✅ göründü, kodda
    duruyordu. Belge yalan söylediğinde, unutmaktan daha kötü olur: iş bir daha hiç ele alınmaz.
    Bir madde ancak KODDAN doğrulandıktan sonra işaretlenir.
83. **Adlandırma sözleşmesi tek yönlüdür.** Kısayol projeksiyon (`.Select(c => new { c.DilekSayisi })`)
    camelCase üretir; proje snake_case konuşuyorsa alan adları AÇIKÇA yazılır. Kopukluk sessiz
    değildir - `undefined` üretir ve tarayıcının İngilizce hata metni ("Invalid Date") kullanıcı
    ekranına düşer. Yönetim ekranı "veri yok" durumunu asla tarayıcı hatasıyla göstermez.
84. **Bir kontrolün reddi kullanıcıya ULAŞMIYORSA o kontrol yoktur.** `bildirimeTikla` sonucu
    kontrol etmeden yönlendiriyordu: sunucu "çöpteki defter" dese bile ekran ilerliyordu.
    Yazma/geçiş çağrılarında dönüş DAİMA kontrol edilir; sunucunun cümlesi aynen gösterilir
    (kendi metnimizi uydurmayız - tek doğruluk kaynağı sunucudur).
85. **Yumuşak-silme üyeliği bilinçli olarak durur; yaşam döngüsü kontrolü ayrı yapılır.**
    Çöpteki defterin üyeliği geri alma için korunur - bu yüzden "üye mi?" kontrolü tek başına
    erişimi engellemez. Tenant kontrolü + yaşam döngüsü kontrolü İKİ AYRI katmandır.


**E turundan `[2026-08-10]`:**
86. **BİR EKRANA VERİ EKLERKEN "BU SATIR KİME AİT VE KİM GÖRMELİ?" SORULMADAN GEÇİLMEZ.**
    Denetim ayrıntısını eklerken `kaynak_es` ekrana çıktı ve bir eş, diğerinin onay/red
    kararlarını okuyabilir hâle geldi - ürünün BİRİNCİ kuralı olan izolasyon, bir "okunurluk
    iyileştirmesi" yüzünden delindi. Görünürlük artıran her değişiklik bir mahremiyet
    değişikliğidir; izolasyon sınırı her seferinde açıkça sorgulanır.
87. **Silme kuralı KARA LİSTE olmalı, beyaz liste değil.** "Sadece şunları sakla" kurulursa
    listede olmayan (ve yarın eklenecek) her şey sessizce silinir. "Şunları sil, gerisi kalsın"
    kurulursa hata yönü güvenli tarafa döner: yanlışlıkla fazla saklarız, asla eksik saklamayız.
    Aynı ilke `senkronYayinla`'da da var (bilinmeyen yol → tüm alanları yayınla).
88. **Üretilen kodun kaçış dizileri, üreten aracın kaçış kurallarıyla karıştırılamaz.**
    Yamaya `\\r\\n` yazılınca dosyaya düz metin olarak düştü ve CSV tek satır oldu.
    Belirsizlik varsa kaçış dizisi yerine KOD NOKTASI kullan (`String.fromCharCode`).
    Ve çıktı dosyası **açılıp bakılmadan** "tamam" denmez.
89. **Fail-safe kontrolün kendisi hatalı yazılabilir.** `ZatenMarker` argüman konumunda ifade
    olarak yazıldı (`'x' + [char]13`), PowerShell hesaplamadı, marker'a yalnız ilk parça bağlandı
    ve yama "zaten uygulanmış" sanıp atladı - koruma ters çalıştı. Marker DAİMA tek parça düz
    metin olmalı; koruma mekanizmasının kendisi de doğrulanmalı.


**Baskı kalitesi turundan `[2026-08-14]`:**
90. **Aynı URL'den gelen içerik değişmiş olabilir - tarayıcı bunu bilmez.** Sürüm damgası
    sunucuyu tazeliyordu ama görüntüler sabit adresten geldiği için tarayıcı kendi
    önbelleğinden veriyordu. Çözüm "cache busting" değil **içerik adresleme**: adres,
    içeriğin kimliğidir (`?s=<parmak izi>`). İçerik aynıysa önbellek çalışır, değiştiyse
    URL değişir.
91. **DOĞRULANMAMIŞ API KULLANMA.** `FallbackFontFamily` QuestPDF 2024.12'de yok; build
    üç satırda kırıldı. Bir metodu hatırlıyor olmak, o sürümde var olduğu anlamına gelmez -
    önce paket sürümü okunur, sonra yazılır. (Aynı sebeple `.Svg()` vektör emoji yolu,
    daha zarif olmasına rağmen SEÇİLMEDİ: doğrulanamıyordu.)
92. **Yeni bir VARLIK türü eklendiğinde kopyalama kuralı da güncellenir.** `csproj` yalnız
    `Fontlar\*.ttf` taşıyordu; 3720 emoji PNG repoda vardı, imajda yoktu. Geliştirmede
    çalışan şey yayında SESSİZCE yok oldu - ve servis "bulamazsam dokunma" davranışı
    yüzünden hata bile vermedi. Yeni varlık = csproj + imaj doğrulaması.
93. **Dış veri kümeleri eskir; kural ona göre yazılır.** Twemoji 15, Unicode 16 emojilerini
    kapsamıyor ve her yıl yenileri çıkacak. "Listede olanı çiz, olmayanı metne düşür" kuralı
    her yıl yeni tofu üretirdi. Doğrusu: **emoji aralığındaysa ve görseli yoksa HİÇ BASMA.**
    Bugün var olmayanı da kapsayan kural, bakım gerektirmez.
94. **Görsel doğru olması metin katmanının doğru olduğu anlamına gelmez.** PDF'te harfler
    doğru çiziliyordu ama kopyalama/aramada NUL çıkıyordu (`rvrn` → `.alt` glifleri, cmap
    karşılığı yok). Bir "baskıya hazır" belgede metin katmanı da üründür: matbaa ön kontrolü,
    arama, erişilebilirlik ona bakar. **Çözüm görünümü bozmadan yapılabilir:** alternatif
    çizimleri taban gliflere işleyip özelliği kaldırmak (koordinat düzeyinde doğrulandı).
95. **Elimdeki dosya kopyası ESKİ olabilir - anchor daima DİSKTEN doğrulanır.** Üç tur üst
    üste aynı dosyaya yanlış anchor yazdım (girinti farklı, bileşen ayrılmış, satır değişmiş).
    Büyük ve çok bileşenli dosyalarda yama yazmadan önce güncel hâli istenir.
96. **Kullanıcıya "hangisi bozuk?" diye sormak çözüm değildir.** Tek bir bozuk emojiyi
    düzeltmek yerine TÜM seti denetlemek (3720 PNG anomali taraması) gerçek kuralı ortaya
    çıkardı. Kullanıcı örnek verir; kök nedeni ve kapsamı BEN bulurum.

---

## 10. DEPLOY RUTİNİ — referans

**Lokal (PowerShell 5.1, TEK TEK komut):**
```
Expand-Archive -Path "C:\Users\Win10\Downloads\<paket>.zip" -DestinationPath "C:\Projeler\bianibirak" -Force
cd C:\Projeler\bianibirak
git status --short
# backend: cd backend\src\BiAniBirak.Api ; dotnet build
# frontend: cd frontend ; Remove-Item -Recurse -Force .next -EA SilentlyContinue ; npm run build
git add -A
git commit -m "..."
git push origin main
```
**Sunucu (Bash):**
```
cd /opt/bianibirak && git pull && docker compose -f docker-compose.production.yml up -d --build --force-recreate <servis>
docker compose -f docker-compose.production.yml logs <servis> --tail 40
```
**SQL test (SUNUCU penceresi):**
```
docker compose -f docker-compose.production.yml exec bianibirak-postgres psql -U bianibirakuser -d bianibirak -c "SELECT ...;"
```
Kolon adları PascalCase, çift tırnak zorunlu. Deploy sonrası: 🧹 rutin (`docker builder prune -a -f`,
`df -h /`) + 📌 knowledge SYNC. JWT değişikliği → koordineli yeniden giriş.

**İndirme klasörü:** Musa'nın tüm indirdikleri `C:\Users\Win10\Downloads`. Komutlar oradan başlar.

**PowerShell yama disiplini:** Türkçe diakritik içeren `.ps1` **UTF-8 BOM** ile yazılır
(BOM'suz = mojibake). Tamamen ASCII ise BOM'suz. Her yama **güvenli-başarısız**: anchor tam 1 kez
eşleşmezse yazmaz; `ZatenMarker` **eklenen içeriğe** bağlanır (Ders 71).

**tsx doğrulama (container):** `tsc --noEmit --jsx preserve --target es2020 --module esnext --moduleResolution bundler --skipLibCheck <dosya>` — sözdizimi hatası = `TS1xxx`/`TS17xx`.

---

## 11. AÇIK NOTLAR / İZLENECEK

- **Madde 8 (uçak modu → giriş):** Paket F üç dosyayı düzeltti. Hâlâ atıyorsa aday `OnayKapisi.tsx`
  (AppShell'de `onayGerekli` başlangıçta true; fetch başarısızsa davranışı bilinmiyor) — o zaman
  istenecek.
- **Canlı senkron:** ✅ tamamlandı (Bölüm 0.1). Senkron dışı bırakılanlar — `DavetliKarsilama`
  (kendi saniyeli sayacı var), `DestekSekmesi` (kendi 60 sn tik'i), `VipSaklamaModal` (girdiye
  bağlı, kısa ömürlü), süper panel Bildirimler/Hatalar sekmeleri (karşılığı olan alan yok).
  Hepsi **bilinçli**; "bir iş için tek mekanizma" ilkesi.
- **Yeni özellik kuralı:** veri gösteren ekran `useSenkronDinle(alan, tazele)` bağlar; geri sayım
  gösteren ekran `useSimdi()` çağırır. Yazma tarafı otomatik (api.ts/istek).
- **Sıradaki iş: E — Denetim/Canlı Akış enterprise.** Önerilen başlangıç: **E4 sayfalama**
  (şu an `Take(100)`/`Take(60)` sessizce kesiyor - denetimde sessiz kesme kabul edilemez) ve
  **E1 diff** (veri `DegisenAlanlar` JSONB'de kayıtlı ama okunmuyor - en yüksek değer/çaba).
- **Bilinçli senkron dışı bırakılanlar** (Bölüm 0.1): `DavetliKarsilama` (kendi saniyeli
  sayacı), `DestekSekmesi` (kendi 60 sn tik'i), `VipSaklamaModal` (girdiye bağlı),
  süper panel Bildirimler/Hatalar sekmeleri (karşılığı olan alan yok).
- **YOL HARİTASI GÜNCELLEME RİTÜELİ:** her güncellemede **(1)** repoya push
  (`git add YOL_HARITASI.md` → commit → push), **(2)** knowledge'daki kopyayı da güncelle.
  İkisi birlikte yapılmazsa iki kaynak ayrışır.
- **YOL_HARITASI güncelliği:** bu dosya push sonrası knowledge SYNC ile tazelenir; repo değiştikçe
  elle sync gerekir (otomatik değil).
