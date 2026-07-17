"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api, type Kullanici } from "@/lib/api";

// Super admin baska bir deftere SALT-OKUNUR girdiginde ustte kalici bant.
// Yazma korumasi backend'de (global middleware); bu bant yalniz gorunur uyaridir.
export function GoruntulemeBandi() {
  const [ben, setBen] = useState<Kullanici | null>(null);
  const [cikiliyor, setCikiliyor] = useState(false);

  useEffect(() => {
    api.ben().then((c) => {
      if (c.ok) setBen(c.veri);
    });
  }, []);

  if (!ben?.goruntuleme_modu) return null;

  async function cik() {
    setCikiliyor(true);
    const c = await api.superGoruntulemeBitir();
    if (!c.ok) {
      setCikiliyor(false);
      toast.error(c.mesaj);
      return;
    }
    // JWT yenilendi - tam yenileme (claim'ler tazelensin)
    window.location.href = "/super-panel";
  }

  return (
    <div className="sticky top-0 z-50 border-b border-yaldiz/50 bg-yaldiz/20 backdrop-blur">
      <div className="mx-auto flex max-w-icerik items-center justify-between gap-3 px-5 py-2 sm:px-6">
        <div className="flex min-w-0 items-center gap-2">
          <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-yaldiz" aria-hidden>
            <path
              d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6-10-6-10-6Z"
              stroke="currentColor"
              strokeWidth={1.6}
              fill="none"
            />
            <circle cx="12" cy="12" r="2.6" stroke="currentColor" strokeWidth={1.6} fill="none" />
          </svg>
          <p className="min-w-0 truncate font-govde text-xs text-murekkep">
            <span className="font-medium">Görüntüleme modu</span>
            {ben.goruntulenen_defter && (
              <span className="text-ikincil"> · {ben.goruntulenen_defter}</span>
            )}
            <span className="hidden text-ikincil sm:inline"> · salt okunur, değişiklik yapamazsın</span>
          </p>
        </div>
        <button
          onClick={cik}
          disabled={cikiliyor}
          className="shrink-0 rounded-full bg-murekkep px-4 py-1.5 font-govde text-xs font-medium text-parsomen transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {cikiliyor ? "Çıkılıyor..." : "Çık"}
        </button>
      </div>
    </div>
  );
}
