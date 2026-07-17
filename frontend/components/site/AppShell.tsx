"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { MarkaKilidi } from "@/components/marka/MarkaKilidi";
import { UserMenu } from "@/components/site/UserMenu";
import { BildirimBaslatici } from "@/components/site/BildirimBaslatici";
import { GoruntulemeBandi } from "@/components/site/GoruntulemeBandi";
import { OnayKapisi } from "@/components/site/OnayKapisi";
import { useSwOdakDinleyici } from "@/lib/odak";

// Uygulama kabugu: TEK navigasyon noktasi = avatar menusu + baglamsal ust bar.
// Kok sayfada wordmark, alt sayfalarda "< Baslik" (geri = EBEVEYN sayfa, tarayici
// gecmisi DEGIL - kullanici nereden gelirse gelsin ayni yere doner).
type Sayfa = { baslik: string; ebeveyn: string | null };

const HIYERARSI: Record<string, Sayfa> = {
  "/gelen-dilekler": { baslik: "Gelen Dilekler", ebeveyn: null }, // kok
  "/dilek-baglantisi": { baslik: "Dilek Bağlantısını Paylaş", ebeveyn: "/gelen-dilekler" },
  "/davetiye-karekodu": { baslik: "Davetiyene QR Kodu Ekle", ebeveyn: "/gelen-dilekler" },
  "/cop-kutusu": { baslik: "Çöp Kutusu", ebeveyn: "/gelen-dilekler" },
  "/ayarlar": { baslik: "Ayarlar", ebeveyn: "/gelen-dilekler" },
  "/baskiya-hazir-defter": { baslik: "Baskıya Hazır Defter", ebeveyn: "/gelen-dilekler" },
  "/fotograflar": { baslik: "Fotoğraflar", ebeveyn: "/gelen-dilekler" },
  "/ayarlar/etkinlik": { baslik: "Etkinlik & Görünüm", ebeveyn: "/ayarlar" },
  "/ayarlar/denetim": { baslik: "Denetim Günlüğü", ebeveyn: "/ayarlar" },
  "/ayarlar/es-ekle": { baslik: "Eşini Ekle", ebeveyn: "/ayarlar" },
  "/etkinliklerim": { baslik: "Etkinliklerim", ebeveyn: "/ayarlar" },
  "/super-panel": { baslik: "Süper Panel", ebeveyn: "/gelen-dilekler" },
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const yol = usePathname();

  // ONAY KAPISI - eksik onay varsa panele girilemez.
  //
  // Iki durumda acilir: (1) onay sistemi kurulmadan once kaydolmus kullanici,
  // (2) metin guncellenmis ve eski surum onaylanmis. Ikisinde de elimizde GECERLI
  // bir riza yoktur; rizasiz veri islemeye devam edemeyiz.
  //
  // AppShell'e baglandi cunku panelin HER sayfasinda calismali - tek bir sayfaya
  // koysaydik, kullanici baska bir yola girip kapiyi atlatirdi.
  const [onayGerekli, setOnayGerekli] = useState(true);
  const router = useRouter();
  const [kayan, setKayan] = useState(false);
  useSwOdakDinleyici(); // push tiklamasi -> client-side yonlendirme (her sayfada)

  const sayfa = HIYERARSI[yol] ?? null;
  const kokte = !sayfa || sayfa.ebeveyn === null;

  // Kaydirinca ust bari inceltir (kucuk ekranda icerik alani kazandirir)
  useEffect(() => {
    function kaydir() {
      setKayan(window.scrollY > 8);
    }
    window.addEventListener("scroll", kaydir, { passive: true });
    return () => window.removeEventListener("scroll", kaydir);
  }, []);

  // Sistem/tarayici geri hareketi de EBEVEYN hiyerarsisini izlesin:
  // gecmis bossa (dogrudan link ile gelinmisse) ebeveyne dus.
  function geri() {
    const hedef = sayfa?.ebeveyn ?? "/gelen-dilekler";
    router.push(hedef);
  }

  return (
    <>
      {/* ONAY KAPISI - eksik onay varsa gecilemez. Onaylanmadan panel kullanilamaz. */}
      {onayGerekli && <OnayKapisi onTamam={() => setOnayGerekli(false)} />}

    <div className="min-h-screen bg-parsomen">
      <GoruntulemeBandi />

      <header className="sticky top-0 z-40 border-b border-ayrac/60 bg-parsomen/90 backdrop-blur">
        <div
          className={`mx-auto flex max-w-icerik items-center justify-between px-5 transition-all duration-200 sm:px-6 ${
            kayan ? "py-1.5" : "py-3"
          }`}
        >
          {kokte ? (
            <Link href="/gelen-dilekler" aria-label="Gelen Dilekler" className="min-w-0">
              <span
                className={`block transition-all duration-200 ${
                  kayan ? "scale-90 origin-left" : ""
                }`}
              >
                <MarkaKilidi varyant="wordmark" boyut="kucuk" animasyonlu />
              </span>
            </Link>
          ) : (
            <button
              onClick={geri}
              className="group flex min-w-0 items-center gap-1.5 rounded-lg py-1 pr-2 text-left transition-colors"
              aria-label={`${sayfa!.baslik} - geri`}
            >
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5 shrink-0 text-ikincil transition-colors group-hover:text-sarap"
                aria-hidden
              >
                <path
                  d="M15 5l-7 7 7 7"
                  stroke="currentColor"
                  strokeWidth={1.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              </svg>
              <span className="truncate font-display text-lg text-murekkep transition-colors group-hover:text-sarap sm:text-xl">
                {sayfa!.baslik}
              </span>
            </button>
          )}

          <UserMenu />
        </div>
      </header>

      <main
        key={yol}
        className="sayfa-girisi mx-auto max-w-icerik px-5 pb-16 pt-6 sm:px-6"
      >
        {children}
      </main>

      <BildirimBaslatici />
    </div>
    </>
  );
}
