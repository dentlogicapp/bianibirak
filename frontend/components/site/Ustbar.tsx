"use client";

import Link from "next/link";
import { MarkaKilidi } from "@/components/marka/MarkaKilidi";
import { UserMenu } from "@/components/site/UserMenu";

// Fonksiyonel UI - yalniz wordmark (tagline YOK; instruction Bolum 2). Responsive.
// UserMenu oturum durumunu yonetir (giris/avatar+dropdown) - ekranlari baglar.
export function Ustbar() {
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
          <UserMenu />
        </nav>
      </div>
    </header>
  );
}
