# BiAnıBırak - Yol Haritası & Karar Günlüğü

> Bu dosya, oturumlar arası SÜREKLİLİK içindir. Instruction (kalıcı çerçeve) DEĞİL;
> projenin GÜNCEL yol haritası + alınan kararlar + biten işler + açık konular + pahalı
> öğrenilen dersler. Her önemli karardan sonra güncellenir. Güncel kod durumu daima
> repodan; bu dosya "neden/ne kararlaştırıldı/sırada ne var" hafızasıdır.

Son güncelleme: 2026-07-11 (Süper Panel tamamlandı; Aşama 6 Kürasyon başlıyor)

---

## 1. NEREDEYIZ - Biten Aşamalar (canlı, doğrulandı)

Canlı: https://bianibirak.dentlogicapp.com

- **0B Kimlik** - kayıt/giriş/çıkış/ben + JWT + bcrypt + host-scoped çerez + append-only audit.
- **0C Tenant çekirdeği** - etkinlikler + etkinlik_uyelikleri (rol es1/es2) + uye_davetleri.
  Etkinlik oluştur (hazirlik + es1 üyelik + audit, atomik). Aktif-yap (JWT'ye
  aktif_etkinlik_id claim). AktifTenant guard rolü döndürür. FK'ler MODEL seviyesinde
  (EF insert sırası için - 0C dersi).
- **2 Paylaşım + Ayar** - paylasim_baglantilari (es1/es2 ayrı token) + etkinlik_ayarlari
  (karşılama/prompt/kapanış penceresi/tema). QR frontend-side (qrcode lib). Public URL
  /k/{token}.
- **0D Cila & Kabuk** - KVKK girişten kaldırıldı (footer link deseni), datetime saat
  ölçeği, zero-friction (Sabitler varsayılan), düzenle/iki-adımlı-sil, PWA (sw.js API
  asla cache + manifest start_url /giris), süreç zaman çizelgesi. Kapanış min 30 gün.
- **0D.5 App-Shell** - dark mode (CSS değişkenli tema, flash-önleme inline script) +
  UserMenu (avatar + tema toggle + çıkış). Dağınık çıkış butonları tek menüde. Ekranlar
  UserMenu + Ustbar ile bağlandı.
- **3 Davetli Katkı** - katkilar + katki_medyalari. Public /k/{token} (login YOK):
  GET karşılama (okuma yüzeyi minimal), POST katkı bırak. Güvenlik: token doğrula +
  pencere kontrolü (ETKINLIK_ACILMADI/ETKINLIK_KAPALI) + rate limit (HizSiniri, token+IP
  10dk'da 5) + ad/email/telefon zorunlu (Belge 08). KaynakEs token'dan; Durum=beklemede.
  Frontend: sade davetli yüzeyi + KVKK rıza + teyit/kapalı/açılmamış ekranları.
- **4 Moderasyon + İzolasyon** - GET kuyruk (WHERE KaynakEs=rol AND Durum=beklemede -
  wedge izolasyonu; bir eş diğerinin kuyruğunu göremez), onayla/reddet (KaynakEs sahiplik
  + beklemede kontrolü + audit), GET defter (her iki eşin onaylılarının birleşimi).
  Frontend: OnayKuyrugu + OrtakDefter bileşenleri.
- **10-A Push** - cihazlar + ertelenen_bildirimler + kullanicilar sessiz saat kolonları.
  PushGonderici (WebPush 1.0.13, VAPID env, 410/404 otomatik temizlik, sessiz saat
  erteleme, audit PUSH_GONDERILDI). CihazUclari (VAPID public key + cihaz kayıt + sessiz
  saat GET/PUT). Tetikler: katkı bırakılınca → KaynakEs sahibi eşe; onaylanınca → diğer
  eşe. Frontend: push.ts (VAPID backend'den çekilir) + BildirimAyari (izin + sessiz saat).
  VAPID anahtarları sunucu .env'de (repoya girmez). DOĞRULANDI: push canlı çalışıyor.

DB: 11 tablo (kullanicilar, denetim_gunlukleri, etkinlikler, etkinlik_uyelikleri,
uye_davetleri, paylasim_baglantilari, etkinlik_ayarlari, katkilar, katki_medyalari,
cihazlar, ertelenen_bildirimler).

---

### Bu oturumda tamamlananlar (2026-07-11)

- **UI Mükemmelleştirme (6 öbek)** - koyu-mod yaldız wordmark + animasyonlu "Anı"; davetli
  yönlendirme metni (kaynak_es); otomatik kaydetme (useOtoKaydet, 1.2sn debounce);
  Profilim modalı (createPortal - stacking context dersi); push kalıcı çözüm
  (pushSenkronEt: her açılışta sessiz yeniden abonelik).
- **Eş kimliği bug fix** - EtkinlikOlustur'da `Rol="es1"` HARDCODED idi; kurucu her zaman
  es1 oluyordu. Form artık "Bu hesap hangi eşe ait?" sorar (KurucuEs).
- **Uygulama-içi bildirim (avatar çanı)** - `bildirimler` tablosu. KRİTİK TASARIM: bildirim
  push'tan ve sessiz saatten BAĞIMSIZ oluşur (PushGonderici içinde VAPID kontrolünden ÖNCE).
  Push sadece "anlık haber verme" katmanı; çan her zaman dolar. 15sn polling + focus refresh.
- **Bildirimden dileğe odak** - `?focus={katkiId}` + useOdakKatki (retry'lı scroll + 4.5sn
  çerçeve vurgusu). Dilek onaylı/reddedilmişse toast uyarısı. SW push tıklaması global
  dinleyiciyle (AppShell) client-side yönlendirir.
- **sonner toast** (planlama birebir) - uyarılar açılır pencerede, satır içi banner DEĞİL.
- **Anlık güncelleme prensibi** - onaylanan dilek O AN kuyruktan ortak deftere taşınır
  (optimistic, yenileme yok). Bu prensip tüm uygulamada standart.
- **Menü mimarisi (v2)** - alt sekme barı TAMAMEN kaldırıldı; tek navigasyon = avatar menüsü.
  Sıra (planlama): Profilim → Defter → Paylaşım → Yönetim → Süper Panel → Diğer etkinliklerin
  → Tema → Bildirimler → Çıkış. **Yönetim bir SAYFA** (/panel/yonetim): araç ızgarası +
  "+ Eşini Ekle" barı + üye listesi.
- **Bağlamsal üst bar** - kökte wordmark, alt sayfalarda `‹ Başlık`. Geri = EBEVEYN sayfa
  (tarayıcı geçmişi değil - deterministik). Kaydırınca inceltme + 160ms sayfa geçişi.
- **Etkinlik & Görünüm** - 3 sekme (Etkinlik / Davetli Ekranı / Sayaç), her sekmede sağda
  CANLI ÖNİZLEME. Sayaç açık/kapalı toggle + cümleler. TÜR-BAZLI VARSAYILANLAR
  (Sabitler.TureGoreVarsayilan): düğün/nişan/nikah için ayrı kusursuz Türkçe bloklar -
  çift hiçbir şeye dokunmasa bile etkinlik kusursuz çalışır.
- **Eşini Ekle (davet)** - mail servisi YOK; paylaşılabilir davet linki + QR + Web Share.
  Tek kullanımlık token (uye_davetleri). Katılınca JWT yenilenir, doğrudan deftere düşer,
  kurucuya push + çan bildirimi.
- **İzolasyon sıkılaştırma** - eşler YALNIZ kendi paylaşım bağlantısını görür
  (AktifLinkler'de `WHERE Es == rol`). Yanlış link paylaşımı = çift-link izolasyonunun
  çökmesi. UI'da gizlemek YETMEZ - backend filtresi.
- **SÜPER PANEL** - `super_admin` yetkisi (JWT claim + DB doğrulaması). 5 sekme:
  Defterler / Kullanıcılar / Çöp Kutusu / KVKK / Canlı Akış.
  - **Görüntüleme modu (impersonation)**: geçici JWT (1 saat), `goruntuleme_modu=true`.
    **Global write-guard middleware** (Program.cs, UseAuthentication sonrası): claim + yazma
    metodu + tenant yolu → 403 + audit. OTORİTE JWT CLAIM'İ; frontend header'ına ASLA
    güvenilmez (OWASP A01). İstisna: /api/super/* + /api/kimlik/* (kilitlenme önleme).
    Süper admin o deftere ZATEN ÜYE ise normal yetkiyle girer (görüntüleme modu kapalı).
  - **İki aşamalı silme**: çöpe at (SilindiMi) → kalıcı sil (çift adı teyidi + aktif defter
    koruması). Denetim izi KORUNUR (EtkinlikId null'a düşer).
  - **Dondurma** (kötüye kullanım): davetli YAZIMI reddedilir (guest token dahil - backend).
  - **Moderasyon**: uygunsuz dilek kaldırma → çöp kutusu (çiftin kuyruk/defterinden de düşer).
  - **KVKK yönetimi**: `sistem_metinleri` (yasal metinler, hardcoded yasak) + `kvkk_talepleri`
    (erişim/düzeltme/silme/itiraz, 30 gün yasal süre takibi).
  - **Canlı akış**: tüm sistem denetim günlüğü, 10sn yenileme, Türkçe eylem sözlüğü.
  - **Korumalar**: son süper admin kendini kaldıramaz/silinemez; kendini askıya alamaz;
    `(EtkinlikId, KullaniciId)` unique (aynı kişi bir deftere iki rolle giremez).
  - Kullanıcı askıya alma (soft delete, DeletedAt) + kalıcı silme (e-posta teyidi).
  - Yetim defter (üyesi kalmamış) + hareketsiz defter (30 gün) işaretleri.

## 2. KESİN KARARLAR - Sıradaki Büyük İşler (Musa onayladı, yapılacak)

### AŞAMA 6 - KÜRASYON STÜDYOSU + MİRAS ÇIKTISI (ŞU AN BAŞLIYOR - Kuzey Yıldızı)

Belge 01: "Rakip ZIP verir; biz editöryel, baskıya-hazır bir ESER üretiriz."
Belge 03 Akış 6. Bu adımın tamamlanması = Kuzey Yıldızı metriği "tamamlanan miras".

**Teknik karar (Musa onayladı):**
- **PDF: QuestPDF (backend, .NET)** - print-ready. Gerçek tipografi (Fraunces/Inter
  self-host), sayfa akışı, kırım payı, yüksek çözünürlük. Frontend PDF kütüphaneleri
  (jsPDF/html2canvas) ekran-görüntüsü kalitesi verir = "export", "eser" DEĞİL → konumlandırmaya aykırı, REDDEDİLDİ.
- **Slayt: web tabanlı oynatıcı** (tam ekran, geçişli, klavye/dokunmatik) + PDF slayt export.

**3 tur:**
1. Kürasyon veri modeli + stüdyo ekranı (seçim / sıralama / gruplama / tema / kapak / ithaf)
2. PDF üretimi (QuestPDF) + filigranlı önizleme (paywall köprüsü)
3. Slayt oynatıcı + teşekkür kartı + AI kürasyon

**Onaylanan bonuslar:**
- B1 **AI-destekli kürasyon** (Belge 05'te tam pakete dahil): tema gruplaması, bölüm
  başlığı önerisi, sıralama önerisi. Çift onaylar/reddeder. "Kürasyon stüdyosu"
  iddiasını gerçek kılan şey.
- B2 **Teşekkür kartı export** (Belge 05, tam paket): davetliye özel kart (adı + alıntı).
  Viral döngü: kartı alan kendi düğününde ister.
- B3 **Filigranlı önizleme**: satın alma öncesi çift mirasını GÖRÜR, indiremez
  (Belge 05 paywall matrisi). Ödeme aşamasına köprü.
- B4 **İthaf sayfası**: çiftin kendi paragrafı. Mirasa ruh katar.
- B5 **Kitap-içi QR köprüsü** (Belge 05 "lansman sonrası"): basılı defterin son sayfasında
  QR → dijital defter. Altyapı şimdi konur.
- B6 **Çıktı sürümleme**: her export kaydedilir (kim/ne zaman/hangi ayarlarla), geri alınabilir.

## 3. AÇIK KONULAR - Çözülmesi Gerekenler

### K1) Durum kapısı açığı (ÖNEMLİ - Musa fark etti)
Şu an /k/{token} katkı kabulü sadece tarih penceresine bakıyor, "Durum"a BAKMIYOR.
Sonuç: hazirlik durumundaki etkinliğe katkı düştü. DOĞRU mantık: ödeme almadan aktif
olmaz, aktif olmadan katkı kabul edilmez. Çözüm: katkı kabulüne Durum=aktif şartı ekle
(hazirlik/kapali/arsiv → reddet). Bu, Aşama 5 (yaşam döngüsü) + Aşama 7 (ödeme) ile tam
çözülür: ÖDEME etkinliği aktif yapar. Test için bir etkinlik manuel aktif yapıldı
(3936e5ec) - geçici; ödeme gelince manuel aktifleştirme yerini ödeme-sonrası-aktife
bırakır.

### K2) Etkinlik hazirlik→aktif geçiş mekanizması YOK
Şu an hiçbir mekanizma etkinliği aktif yapmıyor (manuel SQL dışında). Tasarım: açılış
tarihi gelince mi (job/okuma-anı-hesap) yoksa ödeme sonrası mı? KARAR: ödeme sonrası
aktifleşir (Musa: "ödeme almadan aktif olmaması zaten"). Aşama 7'ye bağlı.

### K3) es2 üyeliği - ÇÖZÜLDÜ (2026-07-11)
Eşini Ekle akışı kuruldu: paylaşılabilir davet linki (mail servisi gerekmiyor).
Eş katılınca üyelik oluşur, JWT yenilenir, kendi kuyruğunu yönetir, push alır.


### K4) Mail servisi - KAPSAM DIŞI (karar)
Davet linki paylaşımıyla çözüldü; mail servisi lansman için gerekmiyor.
KVKK talep kanalı için ileride e-posta gerekebilir (Aşama 7+ ile birlikte değerlendirilir).


## 4. STANDART AŞAMA SIRASI (Belge 09) & Durum

- 0B kimlik ✓ | 0C tenant ✓ | 2 paylaşım ✓ | 0D cila ✓ | 0D.5 app-shell ✓
- 3 davetli katkı ✓ | 4 moderasyon ✓
- 10-A push ✓
- **SIRADA (enterprise sıra):**
  - 10-B Akıllı Paylaşım (bağımsız, ödemeye bağlı değil - hızlı değer)
  - 5 Yaşam döngüsü (durum kapısı K1/K2 - ödemeyle iç içe)
  - 7 Ödeme (iyzico/PayTR; IAP vs fiziksel ayrımı; etkinliği aktif yapar)
  - Viral hediye döngüsü (7 ile bağlı)
  - 6 Kürasyon/export (defter PDF + slayt → North Star: tamamlanan miras)
  - 8 Demo/önizleme paywall | 9 Fiziksel baskı
  - Sonra: Capacitor + IAP (native mağaza; rehber erişimi 10-B'nin native tamamlayıcısı)

---

## 5. PAHALI ÖĞRENİLEN DERSLER (tekrar etmemek için)

- **Caddy inode:** Caddyfile sed-inode-swap sonrası eski container eski inode'a bağlı
  kalır; `caddy reload` "unchanged" der. Çözüm: `docker compose ... up -d
  --force-recreate --no-deps caddy` (notlar projesi, docker-compose.production.yml).
- **FK model seviyesinde:** FK yalnız DB'de olup DbContext modelinde yoksa EF insert
  sırasını bilmez → 23503. HasOne/WithMany/HasForeignKey MODELE eklenir.
- **WebPush sürümü:** nuget'te en yüksek 1.0.13 (1.0.24 YOK). API tüm sürümlerde özdeş
  (VapidDetails/PushSubscription/SendNotificationAsync/WebPushException.StatusCode).
- **Web Push bayat SW/abonelik:** sw.js değişince eski service worker abonelikleri
  "başarılı" (basarili>0) görünüp bildirimi GÖSTERMEYEBİLİR. Şüpheli push davranışında
  İLK teşhis: DELETE FROM cihazlar + cihazda PWA sil/temizle/yeniden kur → taze abonelik.
  basarili>0 ama bildirim yok = neredeyse her zaman bayat SW/abonelik.
- **VAPID frontend'de değil backend'den:** push.ts VAPID public key'i /api/push/anahtar'
  dan çeker; frontend build-arg'a bağlı değil (anahtar değişince frontend rebuild gerekmez).
- **Deploy sıra:** VAPID gibi env-bağlı özellikte önce .env + compose, sonra tek deploy
  (iki kez deploy etme).

---

### Bu oturumda öğrenilenler (2026-07-11)

- **VAR-SAY-MA (en pahalı ders, defalarca tekrarlandı).** Kodu/DB'yi OKUMADAN değer
  varsaymak, tekrar tekrar bug üretti:
  - Katkı durum değerleri `beklemede`/`onayli`/`red` — ben `onaylandi`/`reddedildi`
    varsaydım, hiç eşleşmedi, onay/red uyarıları hiç çıkmadı.
  - `super_admin` kolonu ZATEN vardı (snake_case). Kontrol etmeden ikinci eşleme +
    PascalCase kolon ekledim → EF yanlış kolonu okudu, süper panel açılmadı.
  - `email` kolonu snake_case (PostgreSQL ekosistem standardı - Türkçeleştirilmez,
    PascalCase yapılmaz). SQL'de `"Email"` yazdım, patladı.
  → **Kural: her alan/kolon/imza için önce grep ile GERÇEK kodu oku, sonra yaz.**
- **Referansı kopyala, "benzerini" yazma.** Planlama Defteri elimde çalışır haldeyken,
  onu okumak yerine kendi versiyonumu yazdım → toast yerine banner, tıklama akışında
  gereksiz ağ isteği, 5 tur kayıp. Planlama'nın GERÇEK kodunu oku ve deseni kopyala.
- **Tıklama handler'ında ağ isteği = sürtünme.** Planlama durum kontrolünü tıklama anında
  yapıyor çünkü HEDEF ROTA DEĞİŞİYOR. Bizde hedef sabit (/panel/etkinlik) → ağ isteğini
  tıklamaya koymak akışı kırdı (ilk tık yutuluyordu). Navigasyon SENKRON olmalı;
  durum kontrolü hedef sayfada.
- **Wrapper bileşenler prop'u ezer.** MarkaKilidi'nin `animasyonlu=false` varsayılanı,
  Wordmark'ın `true` varsayılanını eziyordu. Sarmalayıcıda prop'u geçir.
- **Modal → createPortal(document.body).** Avatar menüsünün stacking context'i modalı
  gizliyordu (açılıyor ama görünmüyor).
- **min-w-0 zinciri.** Grid/flex çocuklarında `min-width:auto` varsayılanı, uzun URL'in
  `truncate`'ini kırıp konteyneri genişletiyor → mobilde yatay taşma. Kart + kutu + buton
  satırına `min-w-0`, butona `shrink-0`.
- **Kullanıcıya görünen metin TÜRKÇE, identifier ASCII.** Push metinlerini ve hata
  mesajlarını ASCII yazdım (kural: identifier'lar ASCII, string/UI metinleri Türkçe).
- **Expand-Archive yapılmadan git "nothing to commit" der.** Zip açılmadıysa dosya değişmez.

## 6. KALICI MİMARİ HATIRLATMALAR (instruction'dan, sık dokunulan)

- Tenant = etkinlik. Her tenant-scoped sorgu WHERE EtkinlikId=@aktif.
- Çift-link izolasyonu: bir eş diğerinin onaysız kuyruğunu göremez (wedge kalbi).
- Süreli yaşam döngüsü: açılış/etkinlik/kapanış; kapanışta yazım kapanır, export açılır.
- Native: dijital = IAP zorunlu; fiziksel baskı = harici ödeme (komisyon yok).
- Web-öncelikli PWA, native sonra (additive).
- Idempotent + filtreli migration; tek-seferlik veri taşıma Program.cs'e YAZILMAZ.
- Hardcoded YASAK - tenant/etkinlik ayarından çek.
- ASCII-safe identifier; Türkçe yalnız yorum/UI/string.
- Deploy öncesi lokal build zorunlu (backend dotnet build + frontend npm run build).
- Push sonrası knowledge SYNC hatırlat.
