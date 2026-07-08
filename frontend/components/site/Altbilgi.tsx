import { MarkaKilidi } from "@/components/marka/MarkaKilidi";
import { MARKA } from "@/lib/marka";

// Marka ani - tam kilit (wordmark + tagline).
export function Altbilgi() {
  const yil = new Date().getFullYear();
  return (
    <footer className="mt-24 border-t border-ayrac/60">
      <div className="mx-auto flex max-w-icerik flex-col items-center gap-6 px-6 py-16 text-center">
        <MarkaKilidi varyant="tam" boyut="kucuk" />
        <div className="yaldiz-cizgi w-24" />
        <p className="font-govde text-xs text-ikincil">
          © {yil} {MARKA.yasalAd}. Toplayıcı değil, kürasyon stüdyosu.
        </p>
      </div>
    </footer>
  );
}
