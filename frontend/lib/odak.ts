"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";

// Bildirimden gelen ?focus={katkiId} -> dilegi bul, yumusak scroll + cerceve vurgusu,
// sonra parametreyi temizle (planlama useFocusNot deseni).
// Retry tabanli: dilekler henuz yuklenmemisse kisa araliklarla tekrar dener.
export function useOdakKatki(hazir: boolean) {
  const arama = useSearchParams();
  const router = useRouter();
  const yol = usePathname();
  const odakId = arama.get("focus");

  useEffect(() => {
    if (!odakId || !hazir) return;
    let iptal = false;
    let denemeler = 0;
    let zaman: ReturnType<typeof setTimeout>;

    const dene = () => {
      if (iptal) return;
      const el = document.querySelector(`[data-katki-id="${odakId}"]`) as HTMLElement | null;
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("odak-vurgu");
        setTimeout(() => el.classList.remove("odak-vurgu"), 4700);
        router.replace(yol, { scroll: false }); // focus paramini temizle
      } else if (denemeler < 25) {
        denemeler++;
        zaman = setTimeout(dene, 200);
      }
    };

    zaman = setTimeout(dene, 250);
    return () => {
      iptal = true;
      clearTimeout(zaman);
    };
  }, [odakId, hazir, router, yol]);
}

// GLOBAL: push bildirimine tiklaninca SW'den gelen mesaj -> client-side yonlendirme.
// AppShell'de monte edilir; boylece kullanici hangi sayfadaysa olsun push tiklamasi calisir.
export function useSwOdakDinleyici() {
  const router = useRouter();

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    // TEK YOL: service worker mesaji -> gezinme.
    //
    // Bir donem buraya "bekleyen hedef" (Cache Storage) mekanizmasi eklenmisti;
    // amaci iOS'ta kaybolan mesajlari kurtarmakti. Ama service worker'daki
    // navigate() ve postMessage ile YARISTI ve sonucu ongorulemez hale getirdi:
    // kullanici bazen iki kez yonlendiriliyor, bazen eski bir kayit yuzunden
    // alakasiz bir sayfaya dusuyordu. Kaldirildi.
    //
    // Simdi tek kural gecerli: service worker odaklar ve mesaj gonderir; sayfa
    // mesaji alir ve gider. Sayfa kapaliysa service worker zaten dogru adresle
    // yeni pencere acar - mesaja gerek kalmaz.
    function isle(olay: MessageEvent) {
      if (olay.data?.type === "bianibirak-odak" && olay.data.url) {
        router.push(olay.data.url);
      }
    }

    navigator.serviceWorker.addEventListener("message", isle);
    return () => navigator.serviceWorker.removeEventListener("message", isle);
  }, [router]);
}
