# BiAnıBırak - Yol Haritası & Karar Günlüğü

> Bu dosya, oturumlar arası SÜREKLİLİK içindir. Instruction (kalıcı çerçeve) DEĞİL;
> projenin GÜNCEL yol haritası + alınan kararlar + biten işler + açık konular + pahalı
> öğrenilen dersler. Her önemli karardan sonra güncellenir. Güncel kod durumu daima
> repodan; bu dosya "neden / ne kararlaştırıldı / sırada ne var" hafızasıdır.

**Son güncelleme: 2026-07-19** — Büyük oturum. Domain taşındı (**www.bianibirak.com**),
URL'ler açıklayıcı slug'lara geçti, Çöp Kutusu kuruldu, **saklama modeli 37 → 20 güne**
indirildi (15 toplama + 5 indirme), fotoğraf kalitesi **3200px**'e çıkarıldı, matbaa için
**gerçek vektör PDF + EPS** üretimi kuruldu, bildirim motoru günlük + saat bazlı olarak
yeniden yazıldı, disk gözcüsü eklendi. **Sırada: Süper Panel elden geçirme → E-posta
altyapısı → Defter künyesi → Dış kapaklar → Ödeme → Tanıtım sitesi.**

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

---

## 1. ÜRÜN KURALLARI — İHLAL EDİLEMEZ

### KURAL A — ÖDEME ÖNCE, DÜRÜSTLÜK SONRA `[2026-07-13]`
Ödeme öncesi hiçbir "ama" / teknik tablo gösterilmez (kararsız çifti caydırır). Dürüstlük
satın alma SONRASI doğru kullanım rehberidir. `BoyutSecimi` modalı ödeme sonrasına taşındı.

### KURAL B — FİLİGRAN YASAK `[2026-07-13]`
Filigran kilit değil hız tümseği. Yerine ÇÖZÜNÜRLÜK: önizleme düşük, indirme tam kalite.
**Not:** Davetiye/defter marka künyesi (karekod + logo) bu kurala AYKIRI DEĞİL.

### KURAL C — PAYWALL ÇİZGİSİ
Ücretsiz: dilek toplama, defter kurma/düzenleme, kürasyon, tam önizleme.
Ücretli: yalnızca baskıya hazır PDF indirme.

### KURAL D — ZAMAN MODELİ TEK KANON `[GÜNCELLENDİ 2026-07-19]`
`Sabitler.cs`: **ToplamaGun=15, IndirmeGun=5, ToplamGun=20.**
- Özel gün + 15 → davetli girişleri kapanır
- Özel gün + 20 → **TAM İMHA**, istisnasız
- **Kürasyon ve indirme kurulumdan imhaya kadar HER AN açıktır**; kapanan tek şey davetli girişi.
- **Neden kısaldı:** süre kısaldı ki KALİTE artabilsin. Aynı diskte fotoğrafları çok daha
  yüksek çözünürlükte saklamanın bedeli, veriyi daha kısa tutmaktır. Miras KÂĞITTA
  kalıcıdır, sunucuda değil.
- `KapanisTarihi = EtkinlikTarihi + ToplamaGun` (kanon; kullanıcı değiştiremez).

### KURAL E — SÜPER ADMİN EYLEMLERİ ÇİFTİN DENETİMİNDE GÖRÜNMEZ
`denetim_gunlukleri.SistemEylemi` yaz-sabit + oku-filtre. Süper panel yine görür.
İstisna: `ODEME_ONAYLANDI` → false (çift güven duysun); `ODEME_REDDEDILDI` → true.

### KURAL F — TEKNİK STANDART TAAHHÜDÜ YASAK `[YENİ 2026-07-19]`
Hiçbir metinde, sözleşmede, arayüzde **DPI / piksel / teknik standart sayısı** verilmez.
Bir sayı vermek, kaynak fotoğrafın kalitesinden bağımsız olarak bizi hukuken bağlar.
Yerine NİTEL ifade: *"sistemin sunabildiği en yüksek kalitede"*, *"telefon galerindeki gibi"*.
Uygulandı: Mesafeli Satış, Ön Bilgilendirme, `BoyutSecimi` rozetleri.

---

## 2. TAMAMLANDI — Canlıda, doğrulandı

### Temel katmanlar
- **Kimlik** — kayıt/giriş/çıkış, JWT + bcrypt, host-scoped çerez, append-only audit
- **Tenant çekirdeği** — TENANT = ETKİNLİK. `etkinlikler` + `etkinlik_uyelikleri` (es1/es2)
- **Çift-link izolasyonu (WEDGE)** — her eşin AYRI token'ı, `KaynakEs` etiketli katkı
- **Davetli katkı** — public `/k/{token}`, login YOK, EXIF/GPS silme, rate limit
- **Moderasyon** — onayla/reddet/çöpe taşı
- **Push + PWA** — VAPID web push, sessiz saat, sw.js, manifest
- **Süper panel** — impersonation, iki aşamalı silme, dondurma, teşhis *(NOT: kusurlu — Bölüm 3.1)*
- **Kürasyon + QuestPDF** — gerçek tipografi (Fraunces/Inter TTF), cilt payı, `DefterDerleyici` TEK kaynak
- **Hukuki onay sistemi** — metin kataloğu, sürüm arşivi (hash→metin), onay kayıtları, Onay Kapısı

### ★ DAVETİYE KAREKODU `[2026-07-17]`
FONSUZ lockup (wordmark + "Senden Bize Kalan" + yaldız çizgi + karekod, şeffaf).
Otomatik tema, kısa link `/d/{KisaKod}`, paylaşımlı önizleme + senkron, sürükle/boyutlandır,
sınırsız renk, iki eş için iki ayrı ZIP, slogan outline path (font-bağımsız).

### ★ DOMAIN TAŞIMA `[2026-07-19]`
- **www.bianibirak.com** canlı (Metunic domain, DNS Metunic'te, A kayıtları VPS'e)
- `bianibirak.com` → www'ye 301 · `bianibirak.dentlogicapp.com` → www'ye 301
  (**basılmış QR'lardaki eski linkler çalışmaya devam eder**)
- Let's Encrypt sertifikaları otomatik; paylaşımlı Caddy (`/opt/notlar/deploy/Caddyfile`)
- Çerez host-scoped olduğu için tek seferlik yeniden giriş yaşandı (beklenen)

### ★ URL YENİDEN YAPILANDIRMA `[2026-07-19]`
`/panel/*` → açıklayıcı kök slug'lar. Eski URL'ler `next.config.mjs` içinde **301** ile korunuyor.
`/etkinliklerim` · `/gelen-dilekler` · `/dilek-baglantisi` · `/davetiye-karekodu` ·
`/baskiya-hazir-defter` · `/fotograflar` · `/cop-kutusu` · `/super-panel` ·
`/ayarlar` (hub) + `/ayarlar/etkinlik` `/ayarlar/denetim` `/ayarlar/es-ekle` `/ayarlar/bildirimler`
**Public rotalar DEĞİŞMEDİ:** `/k/[token]`, `/d/[kod]`, `/davet/[token]`.

### ★ ÇÖP KUTUSU `[2026-07-19]`
Planlama Defteri deseniyle birebir (`SilindiMi` flag — paralel yapı YOK).
Red = çöpe taşı · Geri Al = beklemedeye · Kalıcı Sil · **30 gün sonra otomatik imha**
(`CopTemizlemeGorevi`, 3 gün kala uyarı). Onaylı dilek de sonradan çöpe taşınabilir (`/copeat`).
İzolasyon: bir eş diğerinin çöpünü göremez.

### ★ MODERASYON ONAY MODALLARI `[2026-07-19]`
Onayla / Reddet / Çöpe Taşı — üçü de **içerik önizlemeli kesin onay penceresi** ile.
Yanlış dileği işlemeyi önler (Planlama `SilDialog` deseni).

### ★ AVATAR MENÜ + DEFTER BAĞLAMI `[2026-07-19]`
Menü başlığında **"Açık defter"** (isim & isim - tür) — "neredeyim?" sorusu anında yanıtlanır.
Hemen altında **"Diğer defterlerin"** (açık olan hariç) → tıkla, anında geçiş.
Gruplar: Profilim/Fotoğraflar/Ayarlar/Çöp Kutusu/Süper Panel · Gelen Dilekler/Dilek
Bağlantısı/Davetiye QR/Baskıya Hazır Defter · Tema · Bildirimler · Çıkış.
Ayarlar'dan "Etkinliklerim" kaldırıldı (switcher artık menüde).

### ★ MATBAA ÇIKTISI — GERÇEK VEKTÖR `[2026-07-19]`
- **PDF artık gerçek vektör** (`svg2pdf.js`) — önceden canvas→PNG gömülüydü, CorelDRAW'da bozunuyordu
- **EPS eklendi** (hand-rolled PostScript, aynı geometri kaynağından — SVG/PDF/EPS birebir aynı)
- **CDR üretilemez** (kapalı format) — CorelDRAW EPS/PDF'i kendi belgesi gibi açar
- ZIP yapısı: **MATBAA/** (pdf, eps, svg) + **DIJITAL/** (png, webp, jpg) + **OKUBENI.txt**
- QR modülleri **yatay birleştirildi** (run-length): ~5 kat az nesne, dikişsiz
- Zemin şeffaf; yalnız karekod pulu beyaz (okunurluk için ZORUNLU — OKUBENI'de açıklandı)
- **Musa Inkscape ile doğruladı: sıfır bozunma** ✓

### ★ SAKLAMA MODELİ 37 → 20 GÜN `[2026-07-19]`
Bkz. KURAL D. Mevcut defterler idempotent SQL ile yeni takvime taşındı.

### ★ BİLDİRİM MOTORU — GÜNLÜK + SAAT BAZLI `[2026-07-19]`
- **Faz 1 (1..14. gün, her gün 10:00, İKİ EŞE DE):** *"Anı defterinizin kalıcı olarak
  silinmesine N gün kaldı"* — ton merdiveni (bilgilendirici → hatırlatıcı → uyarıcı)
- **Faz 2 (son 5 gün, SAAT bazlı):** imhaya **120/96/72/48/24/12/3 saat** kala.
  *"Kalıcı silinmesine kalan süre N saattir. Bu süre sonunda anı defteriniz uygulamanızdan
  ve veritabanımızdan kalıcı olarak silinerek kaldırılacaktır…"*
- 120 saat = toplamanın kapandığı an (tek bildirimde iki haber)
- **Faz 1 indirene gitmez; Faz 2 indirene DE gider** ("indirdim sanıyordum" hatası ölümcül)
- **İmha sonrası kapanış bildirimi** — defter sessizce yok olmaz (`EtkinlikId=null`, imhadan sağ çıkar)
- **Çift geri sayım kaldırıldı:** `ImhaGorevi` artık uyarı göndermiyor; tek kaynak `HatirlatmaGorevi`

### ★ BİLDİRİM METNİ: PUSH KISA / UYGULAMA İÇİ TAM `[2026-07-19]`
İşletim sistemi kilit ekranında ~120 karakterden sonrasını keser → uzun hukuki cümle yarım
kalıyor, uyarı ciddiyetini yitiriyordu. Artık `PushGonderici.GonderAsync(..., pushGovde:)`
ile **iki ayrı metin**: push = kısa + eyleme çağrı; uygulama içi = tam metin.
Kısa metin verilmezse gövde **son tam kelimede** kesilir + `... Hemen göz atmak için tıkla!`

### ★ YASAL METİN REVİZYON GEÇİŞİ `[2026-07-19]`
**Kritik açık kapatıldı:** seed yalnız EKSİK metni ekliyordu → kodda düzeltilen bir yasal
metin canlıya HİÇ geçmiyordu. Artık kanonik metin DB'dekinden farklıysa: eski sürüm
arşivlenir, yenisi yeni hash + sürümle damgalanır → `EksikOnaylarAsync` otomatik
**yeniden onam** ister. (Saklama süresi gibi esaslı değişiklikte hukuken doğru olan budur.)
Veri sorumlusu tüm metinlerde → **www.bianibirak.com**.

### ★ FOTOĞRAF KALİTESİ 3200px `[2026-07-19]`
`AZAMI_KENAR` 1600 → **3200**, tavan 2 MB → **6 MB** (frontend + backend birlikte).
EXIF/GPS temizliği ve `UseOriginalImage` korundu. Hedef: telefon galerisi netliği.

### ★ ZORUNLU EŞ DAVET ADIMI `[2026-07-19]`
Yeni defter → panele değil **davet adımına** çıkar (`/ayarlar/es-ekle?kurulum=1`).
Ayrı sayfa açılmadı (paralel yapı YASAK) — aynı sayfa kurulum kipine giriyor.
Gerekçe metinde: *defter iki kişiliktir; eş katılmazsa kendi yakınlarından gelen dilekleri
kimse onaylayamaz*. **Zorunlu ama tuzak değil:** bağlantı üretilince "deftere geç" birincil;
üretilmeden "şimdilik atla" ikincil. Sayfa kalıcı — bağlantı kaybolursa buradan yenilenir.

### ★ DİSK GÖZCÜSÜ `[2026-07-19]`
6 saatte bir medya diskini ölçer. **%75 uyarı · %85 kritik · %92 acil** → süper adminlere.
Gün başına tek uyarı (bildirim körlüğü yok), seviye yükselirse hemen bildirir.
Acil eşikte sessiz saat dinlenmez. Medya ayrı Volume'e taşınırsa otomatik doğru diski izler.

### ★ DÜZELTİLEN CANLI HATALAR `[2026-07-19]`
1. **KVKK onam kilidi** — `api.kayit` ve `api.katkiBirak` onay alanlarını gövdeye
   koymuyordu → 400. Kayıt ve dilek bırakma tamamen kırıktı.
2. **Uzun dilek defteri çökertiyordu** — `ShowEntire()` sığmayan kartta
   `DocumentLayoutException` fırlatıyor, önizleme + PDF birlikte ölüyordu. Artık kart
   sığmazsa **sayfalara bölünür** + `DUZEN_HATASI` savunma katmanı.
3. **Türkçe `fi` ligatürü** — `liga` açık olduğu için "fiyat/tarif" gibi kelimelerde i'nin
   noktası yutuluyordu. `font-variant-ligatures: no-common-ligatures`.
4. **Bildirim → yanlış defter** — tıklayınca defter değiştirmiyordu; artık otomatik geçiş
   (uygulama içi + push, `katkiDurum` tüm üyeliklerde arar).
5. **Bayat liste** — dilek kuyrukta olmasına rağmen "erişilemiyor" diyordu; artık listeyi
   tazeleyip kendini onarıyor.
6. **Uzun dilek önizlemesi taşıyordu** — kağıt sabit yükseklik + iç scroll + `dvh` (iOS).
7. **Her dilek kendi kartında** — fotoğrafsız dilekler çerçevesizdi, iki görsel dil vardı.
8. **Yanıltıcı hata mesajı** — her hatada "en az bir dilek ekleyin" yazıyordu; artık
   yalnız gerçekten `DILEK_YOK` ise.
9. **Kapanış penceresi ayar alanı** — düzenlenebilir görünüyor ama backend yok sayıyordu
   (ekran yalan söylüyordu). Kaldırıldı.
10. **Davet paylaşım metni** — *"{Eş adı} olarak anı defterimize…"* → *"Anı defterimize bir
    dilek bırakır mısın?"*

---

## 3. YAPILACAK — Sıralı

### 3.1 ▶ SÜPER PANEL ELDEN GEÇİRME `[SIRADA — bir sonraki iş]`
**Musa'nın bildirdiği gerçek kusurlar:**
- **"Defteri dondur" hiçbir işe yaramıyor** (buton var, etki yok)
- Çöpe düşen **eski defterleri kalıcı silme yok**
- **Kritik işlemlerde onay pencereleri eksik** (geri dönüşsüz eylemler tek tıkla)
- Genel mantıksal boşluklar ve eksikler

**Yaklaşım:** önce **bulgu raporu** (her sekme/buton → backend karşılığı → "çalışıyor /
yarım / hiç bağlı değil"), sonra dünya devlerinin yönetim paneli desenleriyle yeniden kurgu:
geri alınabilir işlemler, tehlikeli eylem ayrımı (kırmızı bölge), çift onay + yazarak teyit,
tam denetim izi, toplu işlem güvenliği, "kim ne zaman ne yaptı" görünürlüğü.

### 3.2 ▶ E-POSTA ALTYAPISI `[YENİ KARAR 2026-07-19]`
**Karar:** Şifre yenileme akışı için e-posta gönderimi kurulacak; başka zaruri amaç
görülmüyor ama altyapı bir kez düzgün kurulur.
- Sağlayıcı seçimi (Resend / Postmark / Brevo / SMTP) — maliyet + teslim edilebilirlik karşılaştırması
- **Görsel olarak mükemmel HTML mail şablonu** (marka lockup, "Senden Bize Kalan", responsive)
- Şifre sıfırlama: token + süre sınırı + tek kullanım + audit
- **DİKKAT — İYS/6563:** pazarlama e-postası YOK, yalnız **işlemsel** (transactional) mail.
  E-posta toplama kararı hâlâ "toplanmayacak" (ölçüm dönemi).
- SPF/DKIM/DMARC kurulumu (domain artık bizde: www.bianibirak.com)

### 3.3 ▶ DEFTER KÜNYESİ (Aşama 2)
Aşama 1'in lockup altyapısı taşınır. Defterin ilk ve son iç sayfasına gömülü marka künyesi:
- Lockup + karekodun TAM ALTINA **www.bianibirak.com** (düz yazı, wordmark'ı sarmaz)
- **Otomatik tema kancası** (sayfa fon rengine göre açık/koyu)
- **Flatten ile çıkarılamaz gömme** (kompozisyona kaynar)
- `DefterDerleyici`'ye cerrahi entegrasyon (paralel yapı YASAK)

### 3.4 ▶ DIŞ KAPAKLAR (Aşama 3) — en büyük iş
- Kalın materyal ön + arka dış kapak (iç sayfadan ayrı)
- **Kapak fotoğrafı: EŞLER SEÇER** (akıllı varsayılanla)
- **Kapaklar AYRI PDF** (ciltli albüm akışı: sırt payı, taşma/wrap farklı)
- **Sırt (spine) ilk sürümden enterprise**
- **Arka dış kapak = marka künyesi**
- Kapak-PDF akışı matbaa deneme baskısında netleşir

### 3.5 ▶ ÖDEME AKTİVASYONU `[hukuki statü netleşince]`
Kod hazır (havale, inert — `odeme_ayarlari` 0 satır → herkes indirir).
1. `odeme_ayarlari` satırı (IBAN + fiyat + Aktif=true)
2. **İki kanal stratejisi:** web = havale/kart · mağaza = IAP (mağazalar dijital içerikte
   kendi ödemesini ZORUNLU kılar; fiziksel baskı satışı ayrı ve serbest)
3. İleride iyzico/PayTR karşılaştırması

### 3.6 ▶ TANITIM SİTESİ + SATIŞ MOTORU `[ödeme çalıştıktan sonra]`
`www.bianibirak.com` kök + `/demo` + tüm public sayfalar:
- Görsel zenginlik, animasyonlar, ürün içi gerçek ekran görüntüleri/videolar (gerekirse AI üretimi)
- Tüm özelliklerin net anlatımı, satış motoru (dönüşüm odaklı)
- **Teşekkür/dilek blogu** — kullanıcılar düğün sonrası deneyimlerini yazar
- **Push ile teşvik:** düğün sonrası duygusal ve ikna edici dille blog'a davet
- SEO, sosyal paylaşım kartları, hız

---

## 4. DEĞERLENDİRME AŞAMASINDA — karar bekliyor

| Konu | Not | Durum |
|---|---|---|
| **Dijital Arşiv ZIP** | Orijinal çözünürlüklü fotoğraflar + defter, ayrı indirme. "Telefon galerisi kalitesi"nin doğru yeri baskı PDF'i değil burasıdır. Satılabilir katma değer. | Öneri sunuldu, karar yok |
| **notlar-backend 5,11 GB** | Dockerfile tek aşamalı → SDK imajı final katmanda. Multi-stage build ile **~4,5 GB kazanç**. Yalnız Notlar'ın Dockerfile'ı değişir, kod değişmez, risk yok. | Musa "çözebiliyorsak çözelim" dedi — YAPILACAK |
| **Hetzner Volume** | Medyayı ayrı diske al: sistem diski dolmaz, canlıyken büyür, kod değişmez. Şu an gerekmiyor (25 GB boş, hedef ~10 düğün/6 ay). Disk gözcüsü %75'te uyarınca yapılır. | Tetikleyici bekliyor |
| **jspdf 2 → 4 yükseltme** | `dompurify` güvenlik advisory'si (jspdf bağımlılığı). Bizde `doc.html()` kullanılmıyor → risk yolu kapalı. `npm audit fix --force` major atlama, PDF üretimini kırabilir. | Bakım turunda, test ederek |
| **Uluslararasılaşma** | Farklı dil/ülke mağazaları. Mimari hazır (tenant metinleri). Engeller: çeviri + her ülkenin veri koruma rejimi (GDPR ayrı metin) + mağaza vergi/fatura. | Ayrı oturumda |
| **B2B2C organizatör katmanı** | Fotoğrafçı/salon/organizasyon şirketi white-label. `UstOrganizatorId` nullable ile additive. | Lansman sonrası |
| **CMYK dönüşümü** | Matbaaya sorulacak: dosyayı CMYK ister misiniz? Şu an RGB. | Matbaa cevabı bekliyor |
| **EPS gradyan çizgi** | PostScript'te alfa yok → uçları sönen yaldız çizgi EPS'te düz renk. Matbaa geri bildirimi bekleniyor. | İzleniyor |
| **Kaynak foto 3200 → daha yüksek?** | 3200'e çıkıldı. Daha ötesi Volume + PDF boyutu sorunu getirir. | Deneme baskısı sonrası |

---

## 5. İŞ / ÖLÇÜM PLANI `[referans]`
- 8 Türkçe rakip: **hepsi toplayıcı** → kürasyon/baskı gerçek fark
- Pazar ~552.237 çift/yıl
- **Ölçüm: 3 düğün** (2 arkadaş Ağustos + Musa 1 Eylül) — ödeme AÇILMAYACAK
- **E-POSTA TOPLANMAYACAK** (İYS/MERSİS 6563) — işlemsel mail hariç
- 3 ürün = 3 yarım UYARI (odak dağılımı riski)
- **Kapasite:** 6 ayda ~10 eşzamanlı defter hedefi. 3200px'te ~3 GB. 25 GB boş. Rahat.

---

## 6. PAHALI ÖĞRENİLEN DERSLER

1. **`ExecuteSqlRaw` `String.Format` uygular** — DDL için raw ADO.NET (`SemaKurucu`).
2. **Container'da sistem fontu YOK** — QuestPDF TTF ister.
3. **Minimal API `IFormFile` olmayanı QUERY'den bind eder.**
4. **Tailwind opacity-modifier CSS-değişkenli renkte GEÇERSİZ.**
5. **`blob:` URL kırılgan** (service worker) → `data:`.
6. **`object-cover` kırpar** — kutu oranı = foto oranı.
7. **CSS grid item default `min-width:auto`** — `min-w-0` zinciri şart.
8. **iframe `X-Frame-Options: DENY`** — header doğru, mimariyi düzelt.
9. **Denge kontrolü comment+string STRIP etmeli** — proper tokenizer.
10. **Süper admin eylemleri çiftin denetiminde GÖRÜNMEMELİ.**
11. **Zaman modeli tek kanon** — user-configurable pencere çizelgeyi yalancı yapar.
12. **İmhada dosyalar EN SON** (DB commit sonrası).
13. **Hash tek başına ANLAMSIZ** — metin de arşivlenmeli.
14. **Idempotent seed'de ERKEN RETURN geriye dönük onarımı ATLAR.**
15. **`docker exec` container adı `bianibirak-postgres`** (compose servis adı çalışmayabilir).
16. **Filigran kilit değil** — çözünürlük.
17. **QuestPDF `GenerateImages` ~30MB/çağrı** → önbellek zorunlu.
18. **QuestPDF görüntüleri YENİDEN SIKIŞTIRIR** → `UseOriginalImage()`.
19. **`Scale()` margin'e dokunmaz.**
20. **PDF yazıcı kâğıt boyutunu ZORLAYAMAZ.**
21. **VAR-SAY-MA** — her düzeltme kanıta dayanmalı.
22. **"Build geçti" kaydı YANLIŞ olabilir** — cross-service imzaları tek tek eşleştir.
23. **`package.json` değişince `package-lock.json` da commit'lenmeli.**
24. **`up -d --build` çalışan container'ı yenilemeyebilir** → `--force-recreate`.
25. **Tarayıcı indirmede `(1).zip` ekler.**
26. **SVG `<text>` matbaada font-fallback'e düşer** → outline path.
27. **SVG `<img>` ile rasterize belge fontuna erişemez** → canvas `fillText`.
28. **Küçük baskıda QR okunurluğu = KISA LİNK.**
29. **`navigator.share` dosya paylaşımı yalnız mobilde güvenilir.**
30. **localStorage gerçek uygulamada serbest.**
31. **Çoklu cihaz senkronu** — apply-koşulu role bağlanırsa aynı hesabın iki cihazı senkron olmaz.
32. **Sohbet arayüzü çıplak domain'i markdown linkine çevirir** — sunucuya yapıştırılan
    komut/konfigürasyon bozulur. Değişken/placeholder + `sed` ile üret; doğrulamada
    `sed 's/\./_DOT_/g'` ile "defuse" ederek oku. `[2026-07-19]`
33. **`sed -i` / `cp` INODE DEĞİŞTİRİR → bind-mount KOPAR.** Konteyner eski inode'u
    görmeye devam eder; host'ta "düzelttim" sanırsın, canlıda hiçbir şey değişmez.
    Bind-mount'lu dosyada `cat > dosya` (yerinde yaz) veya `nano` kullan. `[2026-07-19]`
34. **Bind-mount'lu dosya `:ro` ise konteyner içinden hiç yazılamaz** — `sed -i` "Resource
    busy", `docker cp` "device or resource busy" der. Host tarafından yönetilmeli. `[2026-07-19]`
35. **QuestPDF `ShowEntire()` + sığmayan içerik = `DocumentLayoutException`** → TÜM belge
    üretimi çöker. Kullanıcı girdisi sınırsızsa (5000 karakter mesaj) yükseklik tahmini
    yapıp sığmıyorsa bölünmeye izin ver + `catch` savunma katmanı. `[2026-07-19]`
36. **Tip imzası güncellenip `JSON.stringify` gövdesi unutulunca** alan sessizce
    gönderilmez — backend "onay yok" der, kullanıcı "işaretledim ama olmuyor" der.
    Yarım refactor'ün en sinsi biçimi. `[2026-07-19]`
37. **Seed yalnız EKSİK metni ekler** — revizyon geçişi olmadan kodda düzeltilen yasal
    metin canlıya HİÇ geçmez. Mevzuat değişse bile kullanıcı eski metni onaylamış görünür. `[2026-07-19]`
38. **`PushGonderici` uygulama-içi bildirimi ZATEN oluşturur** — ayrıca `Bildirimler.Add`
    edilirse her uyarı çift görünür. `[2026-07-19]`
39. **Türkçe'de `liga` (fi/ff/fl ligatürü) YANLIŞ** — `fi` bağı i'nin noktasını yutar,
    "fiyat/tarif/sertifika" noktasız görünür. `font-variant-ligatures: no-common-ligatures`. `[2026-07-19]`
40. **jsPDF `addImage` ile üretilen PDF RASTER'dır** — matbaada ölçekleyince bozunur.
    Vektör PDF için `svg2pdf.js` (veya elle PostScript/EPS). `[2026-07-19]`
41. **Yerel liste bayat olabilir** — sunucu "bu kayıt burada" derken istemci listede
    bulamıyorsa HATA gösterme, listeyi TAZELE (kendini onaran davranış). `[2026-07-19]`
42. **Docker build cache sessizce şişer** — 38 GB diskin 24 GB'ını yemişti (%81 dolu).
    `docker builder prune -a -f` risksiz, ~24 GB geri verir. Düzenli çalıştır. `[2026-07-19]`
43. **Push metni ~120 karakterde kesilir** — uzun hukuki uyarı kilit ekranında yarım kalır
    ve ciddiyetini yitirir. Push kısa + çağrı, tam metin uygulama içi. `[2026-07-19]`

---

## 7. MİMARİ SABİTLER (hatırlatma)

- **TENANT = ETKİNLİK.** Her tenant-scoped tabloda `EtkinlikId`.
- **Çift-link birleşim-öncesi izolasyon** — wedge, asla ihlal edilmez.
- **Süreli yaşam döngüsü** — pencere kontrolü backend'de.
- **Erişim satışı ≠ fiziksel ürün** — native'de IAP ayrımı.
- **Web-öncelikli PWA**, native sonra.
- **Append-only audit** — `denetim_gunlukleri`; ayrı audit tablosu YOK.
- **Defense in depth** — kritik sınırlarda en az 2 katman.
- **Hardcoded değer YASAK** — tenant/etkinlik ayarlarından çek.
- **Paralel yapı YASAK** — mevcuda entegre. TEK kaynaklar: PDF → `DefterDerleyici`;
  lockup → `lib/lockup.ts`; çöp → `SilindiMi`; geri sayım → `HatirlatmaGorevi`;
  yasal metin → `YasalMetinler` kanonik dizi.
- **Migration idempotent + filtreli.**

---

## 8. ALTYAPI

- VPS `46.225.101.248` (Ubuntu 24), SSH `bianibirak-prod`, repo `/opt/bianibirak`
- **Disk 38 GB** — 2026-07-19: %30 kullanımda (build cache temizliği sonrası)
- Servisler: `bianibirak-frontend`, `bianibirak-backend`, `bianibirak-postgres`
  (+ komşu proje: `notlar_frontend`, `notlar_backend`, `notlar_postgres`, paylaşımlı `notlar_caddy`)
- Postgres: user `bianibirakuser`, db `bianibirak`
- Medya: volume `bianibirak_medya:/veri/medya`
- **Caddy:** `/opt/notlar/deploy/Caddyfile` (paylaşımlı). www + apex + eski alan 301.
  Referans kopya repoda: `deploy/caddy-bianibirak.caddy`
- Deploy: `cd /opt/bianibirak && git pull && docker compose -f docker-compose.production.yml up -d --build --force-recreate <servis>`
- Lokal: `C:\Projeler\bianibirak`; indirmeler `C:\Users\Win10\Downloads`
- **Push sonrası: project knowledge SYNC gerekir** (otomatik değil)
- **Deploy öncesi lokal build ZORUNLU** — backend build Musa'nın gate'i (Claude'da .NET SDK yok)
- **Rutin:** `docker builder prune -a -f` + `df -h /` (Ders 42)

---

## 9. AÇIK KONULAR

1. **Hukuki statü** → Bölüm 0-A. Ödemenin ön şartı. **HER OTURUMDA HATIRLAT.**
2. **Matbaa deneme baskısı** → Bölüm 0-B. CMYK sorusu dahil.
3. **Fiyat** — 2.490₺ önerisi kesinleşmedi.
4. **Arkadaş düğünleri hangi hafta** — ölçüm takvimi (Ağustos).
5. **Süper panel kusurları** → Bölüm 3.1 (bir sonraki iş).
6. **E-posta sağlayıcı seçimi** → Bölüm 3.2.
7. **QuestPDF Linux render doğrulaması** — önizleme/PDF birebir mi (gözle).
8. **Dijital Arşiv** kararı → Bölüm 4.
