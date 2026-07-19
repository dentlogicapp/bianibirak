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
    // 1) MESAJ YOLU - sayfa uyanikken aninda calisir.
    function isle(olay: MessageEvent) {
      if (olay.data?.type === "bianibirak-odak" && olay.data.url) {
        void bekleyeniTemizle();
        router.push(olay.data.url);
      }
    }
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("message", isle);
    }

    // 2) BEKLEYEN HEDEF YOLU - iOS icin BELIRLEYICI olan yol.
    //
    // iOS'ta bildirime ilk dokunus cogu zaman yalnizca uygulamayi one getirir;
    // service worker'in mesaji ya kaybolur ya da navigate reddedilir. Bu yuzden
    // hedefi SW kalici bir depoya (Cache Storage) yazar. Sayfa uyandiginda -
    // mount aninda, sekmeye geri donuldugunde ya da pencere odaklandiginda -
    // bekleyen hedefi okur, TUKETIR ve gider.
    //
    // "Tuketir" onemli: kayit okunur okunmaz silinir, yoksa kullanici uygulamayi
    // her actiginda eski bildirime yeniden yonlendirilirdi.
    async function bekleyeniIsle() {
      const hedef = await bekleyeniOku();
      if (!hedef) return;
      await bekleyeniTemizle();
      router.push(hedef);
    }

    void bekleyeniIsle();

    const gorunurluk = () => {
      if (document.visibilityState === "visible") void bekleyeniIsle();
    };
    document.addEventListener("visibilitychange", gorunurluk);
    window.addEventListener("focus", gorunurluk);

    return () => {
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.removeEventListener("message", isle);
      }
      document.removeEventListener("visibilitychange", gorunurluk);
      window.removeEventListener("focus", gorunurluk);
    };
  }, [router]);
}

// Bekleyen yonlendirme kaydi - SW yazar, sayfa okur ve siler.
const BEKLEYEN_KOVA = "bianibirak-nav";
const BEKLEYEN_ANAHTAR = "/__bekleyen_yonlendirme";

// Eski kayitlar yeniden yonlendirmesin: 2 dakikadan eski istek yok sayilir.
const BEKLEYEN_OMUR_MS = 2 * 60 * 1000;

async function bekleyeniOku(): Promise<string | null> {
  try {
    if (typeof caches === "undefined") return null;
    const kova = await caches.open(BEKLEYEN_KOVA);
    const yanit = await kova.match(BEKLEYEN_ANAHTAR);
    if (!yanit) return null;
    const veri = (await yanit.json()) as { url?: string; zaman?: number };
    if (!veri?.url) return null;
    if (veri.zaman && Date.now() - veri.zaman > BEKLEYEN_OMUR_MS) {
      await bekleyeniTemizle();
      return null;
    }
    return veri.url;
  } catch {
    return null;
  }
}

async function bekleyeniTemizle(): Promise<void> {
  try {
    if (typeof caches === "undefined") return;
    const kova = await caches.open(BEKLEYEN_KOVA);
    await kova.delete(BEKLEYEN_ANAHTAR);
  } catch {
    /* sessiz - temizlik basarisiz olsa da omur kontrolu koruyor */
  }
}
