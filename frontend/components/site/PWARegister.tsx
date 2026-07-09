"use client";

import { useEffect, useState } from "react";

// Service worker kaydi + PWA "Ana ekrana ekle" istemi (#4 temeli).
// Push aboneligi Asama 10'da VAPID ile eklenir; burada kabuk + install nudge.
export function PWARegister() {
  const [istem, setIstem] = useState<any>(null);
  const [gorunur, setGorunur] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Service worker kaydi
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* kayit basarisiz olursa sessiz gec (PWA opsiyonel iyilestirme) */
      });
    }

    // Install prompt yakalama (Android/Chrome)
    const yakala = (e: Event) => {
      e.preventDefault();
      setIstem(e);
      // Zaten yuklu degilse nudge goster
      const yuklu = window.matchMedia("(display-mode: standalone)").matches;
      if (!yuklu) setGorunur(true);
    };
    window.addEventListener("beforeinstallprompt", yakala);
    return () => window.removeEventListener("beforeinstallprompt", yakala);
  }, []);

  async function yukle() {
    if (!istem) return;
    istem.prompt();
    await istem.userChoice;
    setIstem(null);
    setGorunur(false);
  }

  if (!gorunur) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-icerik px-4 pb-4">
      <div className="flex items-center gap-3 rounded-2xl border border-ayrac bg-yuzey px-5 py-4 shadow-lg">
        <div className="min-w-0 flex-1">
          <p className="font-govde text-sm font-medium text-murekkep">
            Uygulamayı ana ekranına ekle
          </p>
          <p className="mt-0.5 font-govde text-xs text-ikincil">
            Daha hızlı erişim ve bildirimler için.
          </p>
        </div>
        <button
          onClick={() => setGorunur(false)}
          className="shrink-0 rounded-full border border-ayrac px-4 py-2 font-govde text-xs text-ikincil transition-colors hover:text-sarap"
        >
          Sonra
        </button>
        <button
          onClick={yukle}
          className="shrink-0 rounded-full bg-sarap px-4 py-2 font-govde text-xs font-medium text-parsomen transition-colors hover:bg-sarapKoyu"
        >
          Ekle
        </button>
      </div>
    </div>
  );
}
