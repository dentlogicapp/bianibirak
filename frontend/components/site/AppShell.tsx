"use client";

import Link from "next/link";
import { MarkaKilidi } from "@/components/marka/MarkaKilidi";
import { UserMenu } from "@/components/site/UserMenu";
import { BildirimBaslatici } from "@/components/site/BildirimBaslatici";
import { useSwOdakDinleyici } from "@/lib/odak";

// Uygulama kabugu: TEK navigasyon noktasi = avatar menusu (planlama deseni).
// Alt sekme bari YOK - menu kalabaligi ve mobil olcek bozulmasi onlenir.
export function AppShell({ children }: { children: React.ReactNode }) {
  useSwOdakDinleyici(); // push tiklamasi -> client-side yonlendirme (her sayfada)

  return (
    <div className="min-h-screen bg-parsomen">
      {/* Ust bar - logo (wordmark) + avatar menusu */}
      <header className="sticky top-0 z-40 border-b border-ayrac/60 bg-parsomen/90 backdrop-blur">
        <div className="mx-auto flex max-w-icerik items-center justify-between px-5 py-3 sm:px-6">
          <Link href="/panel/etkinlik" aria-label="Defter">
            <MarkaKilidi varyant="wordmark" boyut="kucuk" animasyonlu />
          </Link>
          <UserMenu />
        </div>
      </header>

      <main className="mx-auto max-w-icerik px-5 pb-16 pt-6 sm:px-6">{children}</main>

      <BildirimBaslatici />
    </div>
  );
}
