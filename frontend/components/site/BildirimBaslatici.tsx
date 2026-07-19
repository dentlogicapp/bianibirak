"use client";

import { useEffect, useRef, useState } from "react";
import { pushDestekleniyorMu, pushAboneOl, pushSenkronEt } from "@/lib/push";

// BILDIRIM BASLATICI
//
// KRITIK KURAL: IZIN ASLA KENDILIGINDEN ISTENMEZ - YALNIZ KULLANICI DOKUNUSUYLA.
//
// PAHALI OGRENILEN HATA: burada izin, acilistan 1200 ms sonra bir ZAMANLAYICI ile
// isteniyordu. Chrome'da calisiyordu ama iOS'ta felaketti:
//   iOS, Notification.requestPermission() cagrisini KULLANICI JESTI disinda
//   REDDEDER. Ret kaydedilir. Ve reddedilen izin BIR DAHA SORULAMAZ.
// Yani uygulama, kullanici daha hicbir seye dokunmadan, kendi bildirim iznini
// ilk saniyede YAKIYORDU. Kullanicinin sonradan yapabilecegi hicbir sey kalmiyordu.
//
// YENI DAVRANIS:
//   granted -> sessizce aboneligi tazele
//   denied  -> dokunma (Ayarlar > Bildirimler ekraninda cihaz adimlari anlatilir)
//   default -> DAVET KARTI goster; izin YALNIZCA karta dokununca istenir.
//
// Boylece izin penceresi her zaman bir dokunusun ardindan acilir - hem iOS kuralina
// uyar hem de kullanici ne oldugunu bilerek karar verir.
export function BildirimBaslatici() {
  const [davet, setDavet] = useState(false);
  const calisti = useRef(false);

  useEffect(() => {
    if (calisti.current) return;
    calisti.current = true;
    if (!pushDestekleniyorMu()) return;

    const izin = Notification.permission;
    if (izin === "granted") {
      void pushSenkronEt();   // izinli: aboneligi tazele
      return;
    }
    if (izin === "denied") return; // cihaz ayarindan acilmali

    // default: SORMA - DAVET ET. Izin, davete dokunuldugunda istenir.
    setDavet(true);
  }, []);

  // JEST ICINDE IZIN ISTEME - iOS'un tek kabul ettigi yol.
  async function davetKabul() {
    try {
      const sonuc = await Notification.requestPermission();
      if (sonuc === "granted") {
        await pushAboneOl();
      }
      // Reddedildiyse karti kapatiriz; yol gosterme Ayarlar > Bildirimler'de.
      setDavet(false);
    } catch {
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
