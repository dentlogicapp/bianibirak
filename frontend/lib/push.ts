// Web Push abonelik yardimcilari. Service worker zaten kayitli (PWARegister).
// VAPID public key backend'den cekilir (/api/push/anahtar) - build-arg'a bagimli degil.
import { api } from "./api";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

export function pushDestekleniyorMu(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export type PushDurum = "abone" | "kapali" | "izin-reddedildi" | "desteklenmiyor";

// ---- TANILAMA ----
//
// "Bu cihaz desteklemiyor" demek TESHIS DEGILDIR. Hangi yetenegin eksik oldugunu
// bilmeden ne kullaniciya yol gosterebiliriz ne de sorunu biz cozebiliriz.
//
// iOS GERCEGI (en cok yanilgi buradadir):
//   - Safari SEKMESINDE Web Push YOKTUR. PushManager tanimsizdir.
//   - Yalnizca "Ana Ekrana Ekle" ile KURULMUS uygulamada ve iOS 16.4+ surumde vardir.
//   - Yani "desteklemiyor" cogu zaman cihazin degil, UYGULAMANIN KURULU OLMAMASININ
//     sonucudur - ve bu tamamen cozulebilir bir durumdur.
export type PushTanilama = {
  serviceWorker: boolean;
  pushManager: boolean;
  notification: boolean;
  /** Ana ekrana eklenmis (standalone) olarak mi calisiyor? */
  kurulu: boolean;
  ios: boolean;
  /** iOS surumu (okunabiliyorsa) - Web Push icin 16.4+ gerekir. */
  iosSurum: number | null;
  izin: NotificationPermission | "yok";
  /** Tek cumlelik kok neden - kullaniciya gosterilebilir. */
  sebep: string;
};

export function pushTanilama(): PushTanilama {
  const pencereVar = typeof window !== "undefined";
  const ua = pencereVar ? navigator.userAgent : "";
  const ios =
    /iPad|iPhone|iPod/.test(ua) ||
    (pencereVar && navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  // "OS 16_4" bicimindeki surum damgasini oku.
  let iosSurum: number | null = null;
  const m = ua.match(/OS (\d+)[._](\d+)/);
  if (m) iosSurum = parseFloat(`${m[1]}.${m[2]}`);

  const kurulu =
    pencereVar &&
    (window.matchMedia?.("(display-mode: standalone)").matches === true ||
      // iOS'un kendi bayragi (standart disi ama tek guvenilir isaret).
      (navigator as unknown as { standalone?: boolean }).standalone === true);

  const t: PushTanilama = {
    serviceWorker: pencereVar && "serviceWorker" in navigator,
    pushManager: pencereVar && "PushManager" in window,
    notification: pencereVar && "Notification" in window,
    kurulu,
    ios,
    iosSurum,
    izin: pencereVar && "Notification" in window ? Notification.permission : "yok",
    sebep: "",
  };

  if (!t.serviceWorker) t.sebep = "Tarayıcı arka plan servisini desteklemiyor.";
  else if (ios && !kurulu)
    t.sebep = "iPhone/iPad'de bildirimler yalnızca uygulama ana ekrana eklendiğinde çalışır.";
  else if (ios && iosSurum !== null && iosSurum < 16.4)
    t.sebep = "iOS sürümünüz bildirimleri desteklemiyor (iOS 16.4 ve üzeri gerekir).";
  else if (!t.pushManager) t.sebep = "Tarayıcı anlık bildirim altyapısını sunmuyor.";
  else if (!t.notification) t.sebep = "Tarayıcı bildirim izni sistemini sunmuyor.";
  else t.sebep = "";

  return t;
}

export async function pushDurumu(): Promise<PushDurum> {
  if (!pushDestekleniyorMu()) return "desteklenmiyor";
  if (Notification.permission === "denied") return "izin-reddedildi";
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  return sub ? "abone" : "kapali";
}

function platformBul(): string {
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return "ios";
  if (/android/.test(ua)) return "android";
  return "web";
}

function varsayilanCihazAdi(): string {
  const p = platformBul();
  if (p === "ios") return "iPhone/iPad";
  if (p === "android") return "Android cihaz";
  return "Bu tarayıcı";
}

// Izin iste + abone ol + backend'e kaydet. Hata firlatir (cagiran yakalar).
export async function pushAboneOl(cihazAdi?: string): Promise<void> {
  if (!pushDestekleniyorMu()) throw new Error("Bu cihaz bildirimleri desteklemiyor.");

  // VAPID public key backend'den
  const anahtarCevap = await api.pushAnahtar();
  if (!anahtarCevap.ok || !anahtarCevap.veri.anahtar)
    throw new Error("Bildirim altyapısı henüz hazır değil.");
  const vapidPublic = anahtarCevap.veri.anahtar;

  const izin = await Notification.requestPermission();
  if (izin !== "granted") throw new Error("Bildirim izni verilmedi.");

  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublic) as BufferSource,
    });
  }
  const json = sub.toJSON();
  if (!json.endpoint) throw new Error("Abonelik oluşturulamadı.");

  const cevap = await api.cihazKaydet({
    pushToken: json.endpoint,
    platform: platformBul(),
    p256dh: json.keys?.p256dh,
    auth: json.keys?.auth,
    cihazAdi: cihazAdi ?? varsayilanCihazAdi(),
  });
  if (!cevap.ok) throw new Error(cevap.mesaj);
}

// Bu cihazin aboneligini kaldir (yerel). Backend kaydi sonraki gonderimde 410 ile temizlenir.
export async function pushCikar(): Promise<void> {
  if (!pushDestekleniyorMu()) return;
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (sub) await sub.unsubscribe();
}

// Sessiz senkronizasyon: izin verilmisse aboneligi backend'e (yeniden) kaydeder.
// Uygulama her acilisinda cagirilir; bayat/kayip abonelik sorununu kalici cozer.
// Izin yoksa ISTEMEZ (jest gerektirir) - sadece mevcut izinliyi tazeler.
export async function pushSenkronEt(): Promise<void> {
  try {
    if (!pushDestekleniyorMu()) return;
    if (Notification.permission !== "granted") return; // izin yoksa dokunma

    const anahtarCevap = await api.pushAnahtar();
    if (!anahtarCevap.ok || !anahtarCevap.veri.anahtar) return;
    const vapidPublic = anahtarCevap.veri.anahtar;

    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      // izin var ama abonelik yok -> sessizce olustur
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublic) as BufferSource,
      });
    }
    const json = sub.toJSON();
    if (!json.endpoint) return;

    // Backend'e (yeniden) kaydet - upsert; zaten varsa gunceller, yoksa ekler.
    await api.cihazKaydet({
      pushToken: json.endpoint,
      platform: platformBul(),
      p256dh: json.keys?.p256dh,
      auth: json.keys?.auth,
      cihazAdi: varsayilanCihazAdi(),
    });
  } catch {
    // sessiz: senkronizasyon best-effort
  }
}
