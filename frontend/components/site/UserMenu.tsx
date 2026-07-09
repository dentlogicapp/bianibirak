"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, type Kullanici } from "@/lib/api";
import { useTema } from "@/lib/tema";

// Kullanici menusu: avatar + dropdown (tema toggle + cikis). App-shell tutarli navigasyon.
// Oturum yoksa "Giris" baglantisi gosterir.
export function UserMenu() {
  const router = useRouter();
  const [kullanici, setKullanici] = useState<Kullanici | null>(null);
  const [oturum, setOturum] = useState<"bilinmiyor" | "var" | "yok">("bilinmiyor");
  const [acik, setAcik] = useState(false);
  const [tema, temaTersle] = useTema();
  const kutuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.ben().then((c) => {
      if (c.ok) {
        setKullanici(c.veri);
        setOturum("var");
      } else {
        setOturum("yok");
      }
    });
  }, []);

  // Disari tiklayinca kapat
  useEffect(() => {
    function disari(e: MouseEvent) {
      if (kutuRef.current && !kutuRef.current.contains(e.target as Node)) setAcik(false);
    }
    if (acik) document.addEventListener("mousedown", disari);
    return () => document.removeEventListener("mousedown", disari);
  }, [acik]);

  async function cikis() {
    await api.cikis();
    setAcik(false);
    router.push("/giris");
  }

  if (oturum === "yok") {
    return (
      <Link
        href="/giris"
        className="rounded-full bg-sarap px-5 py-2 font-govde text-xs font-medium text-parsomen transition-colors hover:bg-sarapKoyu sm:text-sm"
      >
        Giriş
      </Link>
    );
  }

  if (oturum === "bilinmiyor" || !kullanici) {
    return <span className="h-9 w-9 rounded-full border border-ayrac bg-yuzey" aria-hidden />;
  }

  const basHarf = (kullanici.ad || "?").trim().charAt(0).toLocaleUpperCase("tr-TR");

  return (
    <div ref={kutuRef} className="relative">
      <button
        onClick={() => setAcik((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={acik}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-ayrac bg-yuzey font-display text-sm text-sarap transition-colors hover:border-sarap"
      >
        {basHarf}
      </button>

      {acik && (
        <div className="absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-2xl border border-ayrac bg-yuzey shadow-lg">
          <div className="border-b border-ayrac px-4 py-3">
            <p className="truncate font-govde text-sm font-medium text-murekkep">
              {kullanici.ad}
            </p>
            <p className="truncate font-govde text-xs text-ikincil">{kullanici.email}</p>
          </div>

          <nav className="p-1.5">
            <Link
              href="/panel"
              onClick={() => setAcik(false)}
              className="block rounded-lg px-3 py-2 font-govde text-sm text-murekkep transition-colors hover:bg-yuzeyKoyu"
            >
              Panelim
            </Link>

            <button
              onClick={temaTersle}
              className="flex w-full items-center justify-between rounded-lg px-3 py-2 font-govde text-sm text-murekkep transition-colors hover:bg-yuzeyKoyu"
            >
              <span>{tema === "acik" ? "Koyu temaya geç" : "Açık temaya geç"}</span>
              <span
                role="switch"
                aria-checked={tema === "koyu"}
                className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
                  tema === "koyu" ? "bg-sarap" : "bg-ayrac"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-parsomen shadow-sm transition-transform ${
                    tema === "koyu" ? "translate-x-4" : "translate-x-0.5"
                  }`}
                />
              </span>
            </button>
          </nav>

          <div className="border-t border-ayrac p-1.5">
            <button
              onClick={cikis}
              className="block w-full rounded-lg px-3 py-2 text-left font-govde text-sm text-sarap transition-colors hover:bg-yuzeyKoyu"
            >
              Çıkış yap
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
