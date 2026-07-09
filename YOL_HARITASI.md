# BiAnıBırak - Yol Haritası & Karar Günlüğü

> Bu dosya, oturumlar arası SÜREKLİLİK içindir. Instruction (kalıcı çerçeve) DEĞİL;
> projenin GÜNCEL yol haritası + alınan kararlar + biten işler + açık konular + pahalı
> öğrenilen dersler. Her önemli karardan sonra güncellenir. Güncel kod durumu daima
> repodan; bu dosya "neden/ne kararlaştırıldı/sırada ne var" hafızasıdır.

Son güncelleme: 2026-07-10 (Aşama 10-A Push tamamlandıktan sonra)

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

## 2. KESİN KARARLAR - Sıradaki Büyük İşler (Musa onayladı, yapılacak)

### A) Akıllı Paylaşım (10-B) - "Tek Hamlede Davet Gönderimi"
Eş, uygulamadan çıkmadan davetlisine QR/link + davetiye görseli/notu/mesajı TEK
paylaşımda gönderebilmeli. Tüm iş uygulama içinde bitsin.

Teknik gerçek (öngörü): Web/PWA ham rehber erişimi vermez. Contact Picker API yalnız
Android Chrome + her seferinde kullanıcı seçer; iOS Safari'de YOK. Bu yüzden:
- OMURGA: Web Share API Level 2 (navigator.share ile link + görsel/dosya + metin tek
  paylaşımda - her yerde çalışır). Kullanıcı paylaşım sayfasından kişi seçer.
- BONUS katman: Contact Picker (destekleyen cihazda) - rehberden doğrudan seçim.
- Native (Capacitor, ileride): gerçek rehber erişimi + tam native paylaşım. "Rehbere
  direkt erişim" vizyonu TAM burada gerçekleşir. Additive (bugünkü mimariyi bozmaz).

Onaylanan bonuslar:
1. **Görsel/dosya ekleme (ÇEKİRDEK):** eş telefonundaki davetiye görselini/PDF'ini
   link+QR ile aynı paylaşımda gönderir (navigator.share({files,url,text})). Musa'nın
   asıl istediği buydu.
2. **QR'lı davetiye üretimi (OPSİYONEL):** eşin yüklediği davetiye görseline QR + kısa
   çağrı otomatik bindirilip tek görsel üretilir. SEÇENEK olarak sunulur - davetiyesinin
   bozulmasını istemeyen eş atlar, isteyen kullanır. Zorlama YOK.
3. **Hazır mesaj şablonu:** tenant-ayarından gelen, kişiselleştirilebilir paylaşım metni
   (hardcoded değil).
4. **Paylaşım sayacı:** kaç kez paylaşıldı (viral K-faktörü ölçümü, Belge 06). Musa çok
   değerli buldu.

Riskler: Contact Picker iOS'ta yok → Web Share fallback zorunlu. Rehber verisi ASLA
sunucuya gitmez (KVKK, Belge 08) - sadece cihazda paylaşım için. Web Share files desteği
tarayıcıya göre değişir → feature detection + zarif fallback.

Doğru yer: Aşama 2'nin (paylaşım) genişlemesi ama native yetenek gerektirdiği için PWA
cila ailesi (10). Push'tan (10-A) sonra 10-B olarak.

### B) Viral Hediye Döngüsü (Büyüme Motoru)
Davetli dilek bıraktıktan sonra teyit ekranında:
"[Çift] gibi sen de kendi anını ölümsüzleştir ya da bir yakınına hediye et"
→ "Kendim için oluştur" / "Hediye et" → birkaç adımda kendi etkinliği.
Davetliyi müşteriye çeviren K-faktörü döngüsü (Belge 06). ÖDEME (Aşama 7) ile tam
bağlanır (hediye = satın alma), ama teyit CTA + landing şimdi/ödemeyle birlikte kurulur.

---

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

### K3) es2 üyeliği yokken push gidecek kimse yok
es2 linkinden gelen katkı için es2 üyesi yoksa push tetiklenmez (doğru davranış). Eş
daveti akışı (#3 mail) tamamlanınca çözülür. Şimdilik beklenen.

### K4) Eş daveti + mail servisi (#3)
es2'yi uygulamaya davet akışı + SMTP mail servisi henüz yok. Planlama'da kanıtlı SMTP +
şablon deseni var. es2 katılınca kendi kuyruğunu görür + push alır.

---

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
