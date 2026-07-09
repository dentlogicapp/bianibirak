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
