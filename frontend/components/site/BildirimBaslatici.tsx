"use client";

import { useEffect, useRef, useState } from "react";
import { pushDestekleniyorMu, pushAboneOl, pushSenkronEt } from "@/lib/push";

// Uygulama acilisinda bildirim baslatici (enterprise):
// 1) Izin GRANTED ise -> sessizce aboneligi tazele (bayat abonelik cozumu).
// 2) Izin DEFAULT ise -> kisa gecikmeyle sistem izin formunu bir kez tetikle;
//    verilmezse ekranda hafif bir davet gosterir (kullanici jestiyle tekrar dener).
// 3) Izin DENIED ise -> dokunmaz (kullanici cihaz ayarindan acmali).
export function BildirimBaslatici() {
  const [davet, setDavet] = useState(false);
  const calisti = useRef(false);

  useEffect(() => {
    if (calisti.current) return;
    calisti.current = true;
    if (!pushDestekleniyorMu()) return;

    const izin = Notification.permission;
    if (izin === "granted") {
      // Izinli: aboneligi backend'e tazele
      void pushSenkronEt();
      return;
    }
    if (izin === "denied") return;

    // izin === "default": acilista bir kez iste (cogu tarayici jest istemez).
    const zaman = setTimeout(async () => {
      try {
        const sonuc = await Notification.requestPermission();
        if (sonuc === "granted") {
          await pushAboneOl();
        } else {
          setDavet(true); // verilmedi -> hafif davet goster
        }
      } catch {
        setDavet(true);
      }
    }, 1200);

    return () => clearTimeout(zaman);
  }, []);

  async function davetKabul() {
    try {
      await pushAboneOl();
      setDavet(false);
    } catch {
      // hala verilmedi - cihaz ayarindan acilmali
      setDavet(false);
    }
  }

  if (!davet) return null;

  return (
    <div className="fixed inset-x-4 bottom-24 z-50 mx-auto max-w-sm rounded-2xl border border-ayrac bg-yuzey p-4 shadow-xl md:bottom-6">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sarap/10">
          <svg viewBox="0 0 24 24" className="h-5 w-5 text-sarap" aria-hidden>
            <path d="M18 8a3 3 0 0 0-6 0v3l-2 3h10l-2-3V8Z" stroke="currentColor" strokeWidth={1.6} strokeLinejoin="round" fill="none" />
            <path d="M13 18a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" fill="none" />
          </svg>
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-govde text-sm font-medium text-murekkep">Bildirimleri aç</p>
          <p className="mt-0.5 font-govde text-xs text-ikincil">
            Sana bir anı bırakıldığında haberdar olmak için bildirimlere izin ver.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={davetKabul}
              className="rounded-full bg-sarap px-4 py-1.5 font-govde text-xs font-medium text-parsomen transition-colors hover:bg-sarapKoyu"
            >
              İzin ver
            </button>
            <button
              onClick={() => setDavet(false)}
              className="rounded-full border border-ayrac px-4 py-1.5 font-govde text-xs text-ikincil transition-colors hover:text-murekkep"
            >
              Şimdi değil
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
