# BiAnıBırak - Yol Haritası & Karar Günlüğü

> Bu dosya, oturumlar arası SÜREKLİLİK içindir. Instruction (kalıcı çerçeve) DEĞİL;
> projenin GÜNCEL yol haritası + alınan kararlar + biten işler + açık konular + pahalı
> öğrenilen dersler. Her önemli karardan sonra güncellenir. Güncel kod durumu daima
> repodan; bu dosya "neden / ne kararlaştırıldı / sırada ne var" hafızasıdır.

**Son güncelleme: 2026-07-20** — İkinci büyük oturum. **Destek sistemi** (kullanıcı ↔ yönetici
konuşması, 62 maddelik SSS bilgi tabanı), **süper panel elden geçirme** (Sistem Nabzı, tehlikeli
eylem katmanı, dondurmanın gerçekten çalışması), **bildirim altyapısının kökten onarımı**
(service worker sözdizimi hatası, iOS izin yakması, tıklama kararlılığı) ve çok sayıda
canlı hata düzeltmesi tamamlandı. **Sırada: Ödeme CTA'sı → Defter Zaman Tüneli.**

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

### ★ DESTEK SİSTEMİ `[2026-07-20]`
Kullanıcı ↔ sistem yöneticisi yazışması. **Sürtünme sıfır:** ad, e-posta, kategori, öncelik
hiçbiri sorulmaz — kimlik oturumdan gelir.
- Menüde çıkışın üstünde **"Sorun Bildir & Destek Al"** (kendi ayraçlı alanı)
- WhatsApp benzeri balonlar; **tek konuşma**, her mesajda yeni bilet açılmaz
- **Tüm süper yöneticilere** aynı anda push + uygulama içi (kuyruk yok — tek kişilik ekipte
  kuyruk, cevapsız kalmanın bahanesi olur). Sessiz saate tabi değil.
- Süper panelde **"Destek Talepleri"** sekmesi: iki bölme, bekleyenler üstte, derin bağlantı
  (`?sekme=destek&talep=id`) → **kaydır + vurgula**
- **Okundu ✓✓** (yönetici konuşmayı açtığı an damgalanır)
- **Defter bağlamı** — "Defteri incele" düğmesiyle teşhis ekranına atlama
- **Otomatik ilk yanıt** ("BiAnıBırak" adıyla; gerçek yanıtı taklit etmez)
- **Proaktif mesaj** — yönetici talep beklemeden yazar, bildirim başlığı duruma özel
- **Çözüldü / Yeniden aç** — geri alınabilir; onay penceresi yok (*geri alınabilirlik
  hatayı sıfırlar, onay yalnız azaltır*)
- **24 saat sonra kalıcı silme** + canlı sayaç ("silinmeye 17 saat"). **Arşiv YOK** — "biz
  saklamıyoruz" sözü destek yazışmaları için de geçerli.
- **7 gün sessizlikte otomatik kapanma** (`DestekTemizlemeGorevi`)
- Yanıtsız kapatma uyarısı · kullanıcı kendi kapatabilir · tam denetim izi
- Rol ve ad **dondurulur** — yönetici yetkisini kaybetse bile geçmiş tutarlı kalır

### ★ SSS / BİLGİ TABANI `[2026-07-20]`
**62 madde, 7 kategori, üç kademeli ağaç** (Kategori > Alt Kategori > Soru/Cevap).
- Destek penceresinde **varsayılan sekme** — insanların çoğu sormadan önce yanıtını bulmayı
  tercih eder; yazışması varsa doğrudan yazışma açılır
- Arama (soru + cevap içinde), sonuç yoksa "Bize yazın"
- **Görüntülenme sayacı** — çok açılan madde, çözülmesi gereken bir ürün sorununu işaret eder
- Süper panelde **"Sık Sorulanlar"** yönetimi: ekle/düzenle/pasife al, kategori otomatik
  tamamlama. **Tohum yalnız tablo boşsa çalışır** — yoksa her deploy yöneticinin
  düzenlemelerini silerdi.
- Cevaplar KURAL F'ye uygun: hiçbirinde gün sayısı, DPI veya teknik taahhüt yok

### ★ SÜPER PANEL ELDEN GEÇİRME `[2026-07-20]`
- **Sistem Nabzı şeridi** — disk %, bekleyen destek, gecikmiş imha, imhası yakın, bekleyen
  ödeme, KVKK. **Tıklanabilir** (sayıyı görüp "nerede?" diye aranmaz). Renk seyrek kullanılır.
- **`TehlikeliEylem` onay katmanı** — tek dil, üç şiddet (bilgi/uyarı/kritik). *"Emin misiniz?"
  diye sormaz, NE OLACAĞINI anlatır.* Kritikte yazarak teyit. ESC kapatır, ENTER onaylamaz.
- **DONDURMA ARTIK GERÇEK** — önceden yalnız davetli yazımını engelliyordu; çift kürasyon
  yapabiliyor, **PDF indirebiliyordu**. Yeni kural: dondurulmuş defter **salt okunur**
  (`DondurmaGuard`, 11 uçta, HTTP 423). Çift **bant görür** + her iki eşe bildirim gider.
- **Kalıcı sil Çöp sekmesine taşındı** — Defterler'de `!silindi_mi` iken pasif duruyordu;
  görünüp çalışmayan buton = bozuk buton. *Bir eylem, ancak yapılabilir olduğu yerde gösterilir.*
- **Silme FK zinciri tamamlandı** — `davetiye_onizleme`, `kurasyonlar`(+öğe/çıktı),
  `etkinlik_gorselleri` eksikti → 500 üretiyordu.

### ★ BİLDİRİM ALTYAPISI — KÖKTEN ONARIM `[2026-07-20]`
Uzun ve pahalı bir hata zinciri; hepsi kanıtla çözüldü:
1. **`sw.js`'te sözdizimi hatası** — düzenleme sırasında fazladan kapanış bırakılmıştı. Worker
   kurulamıyor ("redundant"), bildirimler tamamen ölü. Diğer tüm düzeltmeler bu yüzden
   işe yaramıyordu. → **`npm run build` artık `node --check public/sw.js` çalıştırıyor.**
2. **Kurulum önbellek yüzünden çöküyordu** — `cache.add("/")` reddedilince `waitUntil`
   reddediliyor, worker aktifleşmiyor, `serviceWorker.ready` sonsuza dek asılı kalıyordu.
   → önbellek `try/catch` içine alındı: *kritik olmayan işlem kritik kurulumu engelleyemez.*
3. **`serviceWorker.ready` asılı kalınca durum okunamıyordu** — başlangıç değeri
   `"desteklenmiyor"` olduğu için ekran sonsuza dek "bu cihaz desteklemiyor" diyordu ve
   **sessiz saatler de gizleniyordu**. → zaman aşımlı `swHazir()`, yeni `hazir-degil` durumu,
   başlangıç `"yukleniyor"`. *Bilmemek ile desteklememek aynı şey değildir.*
4. **iOS izni ilk saniyede yakılıyordu** — izin 1200 ms'lik zamanlayıcıyla isteniyordu; iOS
   jest dışı isteği reddeder ve **bir daha sorulamaz**. → izin artık **yalnız kullanıcı
   dokunuşuyla** istenir.
5. **Tıklama "bazen" çalışıyordu** — üç mekanizma (postMessage + navigate + bekleyen hedef)
   yarışıyordu. → **tek yol**: odakla + mesajla; `navigate` kullanılmaz. Ayrıca menü
   parametreyi reaktif okumadığı için aynı sayfadayken hiç tetiklenmiyordu → **olay tabanlı**
   açma (`bianibirak-destek-ac`); adres artık tetikleyici değil, yan ürün.
6. **Tanılama eklendi** — hangi yeteneğin eksik olduğunu ölçer (arka plan servisi, bildirim
   altyapısı, izin sistemi, ana ekrana ekli mi, iOS sürümü) ve **gerçek sebebi** yazar.
   iOS'ta "cihazın desteklemiyor" yerine **"Uygulamayı ana ekrana ekleyin" + 5 adım.**
7. **Sessiz bildirim kalmadı** — URL'siz bildirime tıklayınca metin açılır; imha bildirimi
   `/etkinliklerim?imha=1`'e gidip açıklayıcı bant gösterir.

### ★ CANLI EVRE ROZETİ `[2026-07-20]`
`Durum = "hazirlik"` kurulumda yazılıp **hiç değişmiyordu** — düğünü geçmiş defter de
"Hazırlık" diyordu. Yerine **tarihlerden türeyen** evre (`lib/durum.ts`): `toplaniyor` ·
`son-gunler` · `indirme` · `sonlaniyor` · `donduruldu` · `imha`. Her evre rozet + tek cümle +
**şimdi yapılacak tek iş** verir. **Üç ekran tek kaynak:** `/etkinliklerim`, `/gelen-dilekler`,
süper panel. *Ayrı bir "yönetici dili" uydurmak, destekte yanlış anlaşılmanın en yaygın sebebidir.*

### ★ DİL: "BİRİNCİ/İKİNCİ EŞ" KALDIRILDI `[2026-07-20]`
"eş" + sıra sayısı birleşimi ikinci evlilik çağrışımı yapıyordu. Form etiketleri **"İlk isim /
İkinci isim"** (sıra kişiye değil, kapaktaki yazıma ait). Rol etiketlerinde sıra tamamen
kaldırıldı — **gerçek isim** gösteriliyor. *En kibar çözüm, insanı adıyla anmaktır.*

### ★ ONAM KAYITLARINDA DAVETLİ KİMLİĞİ `[2026-07-20]`
Davetlinin `KullaniciId`'si kasıtlı null (hesap açmaz); kod bunu "anonim" sanıyordu. Oysa
beyan ettiği ad/telefon/e-posta **dileğin kendisinde** duruyor ve onam kaydı `KatkiId` ile ona
bağlı. Dışa aktarımda artık **ad, e-posta, telefon** görünüyor; "Hesap Silinmiş" sütunu
**"Kayıt Durumu"**na dönüştü. *Elimizde duran kimliği göstermemek, kaydı işlevsiz bırakır.*

### ★ TARİH KİLİDİ — SİSTEM AÇIĞI KAPATILDI `[2026-07-20]`
**Açık:** Tüm yaşam döngüsü (toplama kapanışı, indirme penceresi, **imha**) özel günden
türetilir. Tarih serbestçe ileri alınabildiği için bir çift, tarihi her seferinde biraz
ileri atarak defterini **sonsuza kadar yaşatabilir**, imha hiç çalışmazdı → veri sonsuza
dek saklanır, disk şişer ve **"20 gün sonra silinir" sözü anlamsız hale gelir.** Bu bir
kaynak sorunu değil, **verilen sözün ihlali**.

**Kural:** Özel gün **gelmeden** önce tarih serbestçe değişir (düğün ertelenebilir — meşru
ihtiyaç). Özel gün **geçtikten sonra takvim KİLİTLENİR.**
- Backend: `409 TARIH_KILITLI`
- Yanıtta `tarih_kilitli` bayrağı → arayüz alanı kapatır (defense in depth)
- **Uyarı ilk kayıttan itibaren her tarih alanının altında** — *bir kural, uygulandığı
  andan önce anlatılır*; sonradan öğrenen kullanıcı destek yazar

### ★ DİĞER DÜZELTMELER `[2026-07-20]`
- **Modal portal kuralı** — header'daki `backdrop-blur`, içindeki `position: fixed` için
  konumlandırma bağlamı yaratıyordu; destek penceresi ekran dışına taşıyordu → `Portal`
- **Whitespace tutarsızlığı** — önizleme satır sonlarını yutuyor, PDF koruyordu. Önizlemeye
  `whitespace-pre-wrap` + girişte normalleştirme (3+ boş satır → 2)
- **Destek gönder butonu** neden kapalı olduğunu söylemiyordu → canlı sayaçlı uyarı
- **Yeni Etkinlik Defteri Aç** menüye eklendi (Ayarlar'dan Etkinliklerim kaldırılınca yol kalmamıştı)
- **PWA sürekli giriş ekranı** — `start_url: "/giris"` idi ve sayfa oturumu kontrol etmiyordu;
  oturum hiç düşmüyordu, açılış adresi yanlıştı

## 3. YAPILACAK — Sıralı

### 3.1 ▶ ÖDEME CTA'SI `[SIRADA — bir sonraki iş]` `[onaylandı 2026-07-20]`
İki aşamalı: **bilgilendirme ekranı** → **kesin ödeme**.
- Onaylanan bonuslar: **"bu ne değildir" bölümü** (ödeme süreyi UZATMAZ, defter yine 20. günde
  silinir) · **havale sonrası bekleme ekranı** ("ödemeniz kontrol ediliyor") · **ödeme sonrası
  ilk indirme rehberi** (indir → yedekle → matbaaya ver)
- **Reddedilen:** "fiyatın yanında ne aldığın" (sayfa/dilek sayısı listesi)
- **KARAR:** CTA yalnızca **ödeme aktifken görünür** — inert haldeyken kafa karışıklığı yaratmaz

### 3.2 ▶ DEFTER ZAMAN TÜNELİ `[SIRADA]` `[onaylandı 2026-07-20]`
Bir defterin doğumundan bugüne tüm olayları tek dikey akışta.
- Onaylanan bonusların **tamamı**: `denetim_gunlukleri`'nden beslenir (**yeni tablo yok**) ·
  anlamlı olay **kümeleme** ("14 dilek onaylandı, 3 gün içinde") · **sessizlik boşlukları**
  ("12 gün hareketsiz") · **destek konuşmaları da akışta**

### 3.3 ▶ E-POSTA ALTYAPISI `[YENİ KARAR 2026-07-19]`
**Karar:** Şifre yenileme akışı için e-posta gönderimi kurulacak; başka zaruri amaç
görülmüyor ama altyapı bir kez düzgün kurulur.
- Sağlayıcı seçimi (Resend / Postmark / Brevo / SMTP) — maliyet + teslim edilebilirlik karşılaştırması
- **Görsel olarak mükemmel HTML mail şablonu** (marka lockup, "Senden Bize Kalan", responsive)
- Şifre sıfırlama: token + süre sınırı + tek kullanım + audit
- **DİKKAT — İYS/6563:** pazarlama e-postası YOK, yalnız **işlemsel** (transactional) mail.
  E-posta toplama kararı hâlâ "toplanmayacak" (ölçüm dönemi).
- SPF/DKIM/DMARC kurulumu (domain artık bizde: www.bianibirak.com)

### 3.4 ▶ DEFTER KÜNYESİ (Aşama 2)
Aşama 1'in lockup altyapısı taşınır. Defterin ilk ve son iç sayfasına gömülü marka künyesi:
- Lockup + karekodun TAM ALTINA **www.bianibirak.com** (düz yazı, wordmark'ı sarmaz)
- **Otomatik tema kancası** (sayfa fon rengine göre açık/koyu)
- **Flatten ile çıkarılamaz gömme** (kompozisyona kaynar)
- `DefterDerleyici`'ye cerrahi entegrasyon (paralel yapı YASAK)

### 3.5 ▶ DIŞ KAPAKLAR (Aşama 3) — en büyük iş
- Kalın materyal ön + arka dış kapak (iç sayfadan ayrı)
- **Kapak fotoğrafı: EŞLER SEÇER** (akıllı varsayılanla)
- **Kapaklar AYRI PDF** (ciltli albüm akışı: sırt payı, taşma/wrap farklı)
- **Sırt (spine) ilk sürümden enterprise**
- **Arka dış kapak = marka künyesi**
- Kapak-PDF akışı matbaa deneme baskısında netleşir

### 3.6 ▶ ÖDEME AKTİVASYONU `[hukuki statü netleşince]`
Kod hazır (havale, inert — `odeme_ayarlari` 0 satır → herkes indirir).
1. `odeme_ayarlari` satırı (IBAN + fiyat + Aktif=true)
2. **İki kanal stratejisi:** web = havale/kart · mağaza = IAP (mağazalar dijital içerikte
   kendi ödemesini ZORUNLU kılar; fiziksel baskı satışı ayrı ve serbest)
3. İleride iyzico/PayTR karşılaştırması

### 3.7 ▶ KİŞİSELLEŞTİRME MOTORU `[Musa vurguladı — yol haritasında YOKTU]`
"Anı defteri üzerinde **binlerce düzenleme ve kişiselleştirme**" hedefi. Dış kapaklardan sonra,
tanıtım sitesinden önce. Kapsam netleştirilecek: tipografi seçenekleri, sayfa düzeni varyantları,
renk/tema paletleri, bölüm başlıkları, dilek yerleşimi, kapak kompozisyonu.
**Karar bekliyor:** ne kadarı ücretsiz, ne kadarı premium?

### 3.8 ▶ TANITIM SİTESİ + SATIŞ MOTORU `[ödeme çalıştıktan sonra]`
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
| **Sağlık ucu** (`/api/saglik`) | Tek satır JSON: DB erişilebilir mi, disk %, son imha görevi. "Sistem ayakta mı?" sorusunu ölçümle yanıtlar. ~30 satır, mimariye dokunmaz. | Öneri sunuldu 2026-07-20 |
| **Deneme defteri (seed)** | Tek komutla gerçekçi dolu defter (dilekler, fotoğraflar, farklı evreler). Her özelliği elle veri girmeden test etmeyi sağlar. | Öneri sunuldu 2026-07-20 |
| **Test bildirimi düğmesi** | Süper panelde "Bana test bildirimi gönder". Bildirim teşhisini dakikalara indirir. ~20 satır. | Öneri sunuldu 2026-07-20 |
| **Hata görünürlüğü** | Süper panelde "son 20 hata" (mesaj + zaman + uç). 500'ler için SSH gerekmez. | Öneri sunuldu 2026-07-20 |
| **GitHub token temizliği** | `omniasistan-cli` (classic, `repo` kapsamı) 7 gün içinde doluyor. Geniş yetkili, projelerimize ait değil. Kullanılmıyorsa **revoke**; yeni token gerekiyorsa **fine-grained**. Önce `git remote -v` ile deploy'un SSH mi HTTPS mi kullandığı doğrulanmalı. | Karar bekliyor 2026-07-20 |
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

44. **Bir paket dosyası lokale ulaşmazsa hata O TURDA görünmez** — bağımlı dosya güncellenince
    ortaya çıkar. `git status --short` ile dosya sayısını doğrula. `[2026-07-20]`
45. **`backdrop-filter`/`transform` taşıyan ata, içindeki `position: fixed` için konumlandırma
    bağlamı yaratır** — tam ekran katmanlar portal ile `document.body`'ye taşınmalı.
    Belirti: modal ekran dışında/sıkışmış görünür. `[2026-07-20]`
46. **Alan/property eklemeden önce GREP ET** — `KapanmaZamani`'ı iki kez ekledim, derleme
    kırıldı (CS0102). "Zaten var mı?" kontrolü bir saniye, hata bir tur. `[2026-07-20]`
47. **EF ilişkisi tanımlı değilse ekleme SIRASI bilinmez** — FK'li tabloya çocuk kayıt önce
    yazılmaya çalışılır, 500 döner. `HasOne/WithMany` yalnız sırayı öğretmek için bile gerekir. `[2026-07-20]`
48. **Etkinliğe bağlı YENİ tablo eklenince SİLME ZİNCİRİ güncellenir** — `davetiye_onizleme`,
    `kurasyonlar`, `etkinlik_gorselleri` zincirde yoktu; kalıcı silme 500 veriyordu. Hata
    veritabanı katmanında olduğu için ekranda sebebi görünmez. `[2026-07-20]`
49. **Service worker JS'ini DOĞRULA** — `sw.js`'te sözdizimi hatası worker'ı "redundant"
    yapar ve bildirimleri tamamen öldürür. C#/TSX denge kontrolü bunu yakalamaz.
    → `npm run build` artık `node --check public/sw.js` çalıştırıyor. `[2026-07-20]`
50. **Kritik olmayan işlem kritik kurulumu engelleyemez** — `cache.add("/")` reddedilince
    SW kurulumu çöküyor, `serviceWorker.ready` sonsuza dek asılı kalıyordu. Önbellek
    isteğe bağlıdır; `try/catch` içine alınır. `[2026-07-20]`
51. **Bir promise'in çözüleceğini VARSAYMA** — `serviceWorker.ready` aktif worker yoksa hiç
    çözülmez, hata da fırlatmaz. Sonsuz bekleyiş zaman aşımıyla sınırlanır ve **zaman aşımının
    kendi anlamı** olur (`hazir-degil` ≠ `desteklenmiyor`). `[2026-07-20]`
52. **Başlangıç durumu bir VARSAYIMDIR** — `useState("desteklenmiyor")` yüzünden durum
    okunamadığında ekran "desteklemiyor" diyordu. *Bilmemek ile desteklememek aynı şey
    değildir.* `[2026-07-20]`
53. **iOS'ta izin YALNIZ kullanıcı jesti içinde istenir** — zamanlayıcıyla istenen izin
    reddedilir ve **bir daha sorulamaz**. Uygulama kendi iznini ilk saniyede yakar. `[2026-07-20]`
54. **Bir iş için TEK mekanizma** — postMessage + navigate + bekleyen-hedef aynı anda
    çalışınca yarıştılar; sonuç "bazen çalışan" bir sistem oldu ki bu, hiç çalışmayandan
    daha kötüdür (güven kaybettirir, teşhis edilemez). `[2026-07-20]`
55. **Reaktif olmayan parametre okuması "bazen çalışır" üretir** — `useEffect(..., [])` içinde
    `window.location.search` okumak, hedef sayfa zaten açıkken hiç tetiklenmez. Adres
    **tetikleyici değil yan ürün** olmalı; olay tabanlı çözüm kesindir. `[2026-07-20]`
56. **Bir kontrol engellediğinde SEBEBİNİ göstermek zorundadır** — destek gönder butonu
    10 karakter şartıyla kapalıydı ama bunu hiçbir yerde yazmıyordu; kullanıcı uygulamayı
    bozuk sanır. `[2026-07-20]`
57. **Görünüp çalışmayan buton = bozuk buton** — kalıcı sil, koşul sağlanmadığında pasif
    duruyordu. *Bir eylem, ancak yapılabilir olduğu yerde gösterilir.* `[2026-07-20]`
58. **Geri alınabilirlik, onay penceresinden üstündür** — onay hatayı azaltır, geri
    alınabilirlik **sıfırlar**. Geri dönüşsüz işlemde ise yazarak teyit şarttır. `[2026-07-20]`
59. **Saklanan durum gerçekle arasını açar** — `Durum = "hazirlik"` bir kez yazılıp hiç
    değişmedi. Türetilebilen hiçbir şey saklanmamalı (`lib/durum.ts` tarihlerden türetir). `[2026-07-20]`

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
  yasal metin → `YasalMetinler` kanonik dizi; **defter evresi → `lib/durum.ts`**;
  **dondurma → `DondurmaGuard`**; **tehlikeli eylem onayı → `TehlikeliEylem`**;
  **destek konuşması → `DestekUclari`**; **SSS → `sss_maddeleri` (kod değil DB)**.
- **Tam ekran katmanlar PORTAL ile** (`components/site/Portal.tsx`) — header'daki blur,
  `position: fixed`'i bozar.
- **`npm run build` sw.js sözdizimini doğrular** — bozuk service worker build'i geçemez.
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
   (Musa eşinin üzerine şirket açıyor; 1-2 ay. Bu sürede IBAN, sonra mağaza IAP.)
2. **Matbaa deneme baskısı** → Bölüm 0-B. **CMYK sorusu sorulmadı.** Dış kapak akışı buna bağlı.
3. **Fiyat** — 2.490₺ önerisi kesinleşmedi.
4. **Arkadaş düğünleri hangi hafta** — ölçüm takvimi (Ağustos).
5. **GitHub token** (`omniasistan-cli`) — 7 gün içinde doluyor; revoke/fine-grained kararı.
   Önce `git remote -v` ile deploy bağımlılığı doğrulanmalı.
6. **Kişiselleştirme motoru kapsamı** → Bölüm 3.7. Ne kadarı ücretsiz, ne kadarı premium?
7. **Dijital Arşiv** kararı → Bölüm 4.
8. **notlar-backend multi-stage** — "çözebiliyorsak çözelim" denmişti, yapılmadı (~4,5 GB).
9. **QuestPDF Linux render doğrulaması** — önizleme/PDF birebir mi (gözle).
10. **Bonus öneriler** (sağlık ucu, seed defter, test bildirimi, hata görünürlüğü) → Bölüm 4.
