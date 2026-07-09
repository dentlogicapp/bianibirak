"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MarkaKilidi } from "@/components/marka/MarkaKilidi";
import { api } from "@/lib/api";

// Fonksiyonel UI - yalniz wordmark (tagline YOK; instruction Bolum 2). Responsive.
// Oturum durumuna gore giris/panel baglantisi (ekranlari birbirine baglar).
export function Ustbar() {
  const [oturum, setOturum] = useState<"bilinmiyor" | "var" | "yok">("bilinmiyor");

  useEffect(() => {
    api.ben().then((c) => setOturum(c.ok ? "var" : "yok"));
  }, []);

  return (
    <header className="w-full border-b border-ayrac/60">
      <div className="mx-auto flex max-w-icerik items-center justify-between gap-3 px-5 py-4 sm:px-6 sm:py-5">
        <Link href="/" aria-label="Ana sayfa" className="min-w-0">
          <MarkaKilidi varyant="wordmark" boyut="kucuk" />
        </Link>
        <nav className="flex shrink-0 items-center gap-4">
          <Link
            href="/demo"
            className="font-govde text-xs text-ikincil transition-colors hover:text-sarap sm:text-sm"
          >
            Örnek Anı Defteri
          </Link>
          {oturum === "var" ? (
            <Link
              href="/panel"
              className="rounded-full bg-sarap px-5 py-2 font-govde text-xs font-medium text-parsomen transition-colors hover:bg-sarapKoyu sm:text-sm"
            >
              Panelim
            </Link>
          ) : (
            <Link
              href="/giris"
              className="rounded-full bg-sarap px-5 py-2 font-govde text-xs font-medium text-parsomen transition-colors hover:bg-sarapKoyu sm:text-sm"
            >
              Giriş
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
