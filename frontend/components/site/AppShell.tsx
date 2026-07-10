"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MarkaKilidi } from "@/components/marka/MarkaKilidi";
import { UserMenu } from "@/components/site/UserMenu";

// Enterprise app-shell (dunya-devi deseni):
// - Mobil: sabit ALT tab bar (basparmak erisimi, buyuk hedefler - Belge 07 mobil-oncelik)
// - Masaustu: UST bar (genis ekranda alt bar tuhaf durur)
// Icerik ortada; navigasyon her ekranda kalici (amator "Panel'e tikla geri git" YOK).

type Sekme = {
  ad: string;
  yol: string;
  ikon: (aktif: boolean) => React.ReactNode;
};

const SEKMELER: Sekme[] = [
  {
    ad: "Etkinlikler",
    yol: "/panel",
    ikon: (a) => (
      <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden>
        <path
          d="M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7Z"
          stroke="currentColor"
          strokeWidth={a ? 2 : 1.6}
        />
        <path d="M4 9h16M8 3v4M16 3v4" stroke="currentColor" strokeWidth={a ? 2 : 1.6} strokeLinecap="round" />
      </svg>
    ),
  },
  {
    ad: "Defter",
    yol: "/panel/etkinlik",
    ikon: (a) => (
      <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden>
        <path
          d="M5 4h9a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4Z"
          stroke="currentColor"
          strokeWidth={a ? 2 : 1.6}
          strokeLinejoin="round"
        />
        <path d="M17 7h2v13H8" stroke="currentColor" strokeWidth={a ? 2 : 1.6} strokeLinecap="round" strokeLinejoin="round" />
        <path d="M8 8h6M8 11h6" stroke="currentColor" strokeWidth={a ? 2 : 1.6} strokeLinecap="round" />
      </svg>
    ),
  },
  {
    ad: "Paylaşım",
    yol: "/panel/paylasim",
    ikon: (a) => (
      <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden>
        <circle cx="18" cy="5" r="2.5" stroke="currentColor" strokeWidth={a ? 2 : 1.6} />
        <circle cx="6" cy="12" r="2.5" stroke="currentColor" strokeWidth={a ? 2 : 1.6} />
        <circle cx="18" cy="19" r="2.5" stroke="currentColor" strokeWidth={a ? 2 : 1.6} />
        <path d="m8.2 10.8 7.6-4.6M8.2 13.2l7.6 4.6" stroke="currentColor" strokeWidth={a ? 2 : 1.6} strokeLinecap="round" />
      </svg>
    ),
  },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  function aktifMi(yol: string) {
    if (yol === "/panel") return pathname === "/panel";
    return pathname.startsWith(yol);
  }

  return (
    <div className="min-h-screen bg-parsomen">
      {/* Masaustu ust bar */}
      <header className="sticky top-0 z-40 hidden border-b border-ayrac/60 bg-parsomen/80 backdrop-blur md:block">
        <div className="mx-auto flex max-w-icerik items-center justify-between gap-4 px-6 py-4">
          <Link href="/" aria-label="Ana sayfa" className="shrink-0">
            <MarkaKilidi varyant="wordmark" boyut="kucuk" />
          </Link>
          <nav className="flex items-center gap-1">
            {SEKMELER.map((s) => {
              const aktif = aktifMi(s.yol);
              return (
                <Link
                  key={s.yol}
                  href={s.yol}
                  className={`flex items-center gap-2 rounded-full px-4 py-2 font-govde text-sm transition-colors ${
                    aktif
                      ? "bg-sarap/10 text-sarap"
                      : "text-ikincil hover:bg-yuzey hover:text-murekkep"
                  }`}
                >
                  <span className={aktif ? "text-sarap" : "text-ikincil"}>{s.ikon(aktif)}</span>
                  {s.ad}
                </Link>
              );
            })}
          </nav>
          <div className="shrink-0">
            <UserMenu />
          </div>
        </div>
      </header>

      {/* Mobil ust bar (sade: logo + profil; navigasyon altta) */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-ayrac/60 bg-parsomen/80 px-5 py-3 backdrop-blur md:hidden">
        <Link href="/" aria-label="Ana sayfa">
          <MarkaKilidi varyant="wordmark" boyut="kucuk" />
        </Link>
        <UserMenu />
      </header>

      {/* Icerik - mobilde alt bar icin alt bosluk */}
      <main className="mx-auto max-w-icerik px-5 pb-28 pt-6 sm:px-6 md:pb-16">
        {children}
      </main>

      {/* Mobil sabit ALT tab bar */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-ayrac/60 bg-parsomen/90 backdrop-blur md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        aria-label="Ana navigasyon"
      >
        <div className="mx-auto flex max-w-md items-stretch justify-around">
          {SEKMELER.map((s) => {
            const aktif = aktifMi(s.yol);
            return (
              <Link
                key={s.yol}
                href={s.yol}
                className={`flex flex-1 flex-col items-center gap-1 py-2.5 font-govde text-[0.7rem] transition-colors ${
                  aktif ? "text-sarap" : "text-ikincil"
                }`}
                aria-current={aktif ? "page" : undefined}
              >
                {s.ikon(aktif)}
                <span className={aktif ? "font-medium" : ""}>{s.ad}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
