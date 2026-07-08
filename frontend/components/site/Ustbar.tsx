import Link from "next/link";
import { MarkaKilidi } from "@/components/marka/MarkaKilidi";

// Fonksiyonel UI - yalniz wordmark (tagline YOK; instruction Bolum 2).
export function Ustbar() {
  return (
    <header className="w-full border-b border-ayrac/60">
      <div className="mx-auto flex max-w-icerik items-center justify-between px-6 py-5">
        <Link href="/" aria-label="Ana sayfa">
          <MarkaKilidi varyant="wordmark" boyut="kucuk" />
        </Link>
        <nav className="flex items-center gap-6 font-govde text-sm text-ikincil">
          <Link href="/demo" className="transition-colors hover:text-sarap">
            Demo
          </Link>
        </nav>
      </div>
    </header>
  );
}
