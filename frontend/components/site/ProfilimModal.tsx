"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { api, type Kullanici } from "@/lib/api";
import { useOtoKaydet, otoKayitEtiket } from "@/lib/oto-kaydet";
import { BildirimAyari } from "@/components/site/BildirimAyari";

// Profilim modali (planlama deseni + gorseldeki tam form):
// E-posta (degistirilemez) + Ad Soyad + Cinsiyet + [otomatik kaydet] +
// Bildirim izni + Sessiz saatler (BildirimAyari) + Guvenlik (sifremi yenile).
export function ProfilimModal({
  kullanici,
  onKapat,
  onGuncellendi,
}: {
  kullanici: Kullanici;
  onKapat: () => void;
  onGuncellendi: (k: Kullanici) => void;
}) {
  const [ad, setAd] = useState(kullanici.ad);
  const [cinsiyet, setCinsiyet] = useState<string | null>(kullanici.cinsiyet);
  const [hata, setHata] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // ESC ile kapat + govde scroll kilidi
  useEffect(() => {
    function esc(e: KeyboardEvent) {
      if (e.key === "Escape") onKapat();
    }
    document.addEventListener("keydown", esc);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", esc);
      document.body.style.overflow = "";
    };
  }, [onKapat]);

  const degistiMi = ad !== kullanici.ad || cinsiyet !== kullanici.cinsiyet;

  async function kaydet(): Promise<boolean> {
    setHata("");
    if (ad.trim().length < 2) {
      setHata("Ad en az 2 karakter olmalıdır.");
      return false;
    }
    const cevap = await api.profilGuncelle({ ad: ad.trim(), cinsiyet });
    if (!cevap.ok) {
      setHata(cevap.mesaj);
      return false;
    }
    onGuncellendi(cevap.veri);
    return true;
  }

  const durum = useOtoKaydet(JSON.stringify({ ad, cinsiyet }), degistiMi, kaydet);
  const gosterge = otoKayitEtiket(durum);

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-start justify-center overflow-y-auto bg-murekkep/50 p-4 backdrop-blur-sm sm:items-center"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onKapat();
      }}
    >
      <div className="my-8 w-full max-w-md overflow-hidden rounded-3xl border border-ayrac bg-yuzey shadow-2xl">
        {/* Baslik */}
        <div className="flex items-center justify-between border-b border-ayrac px-6 py-4">
          <h2 className="font-display text-xl text-murekkep">Profilim</h2>
          <button
            onClick={onKapat}
            aria-label="Kapat"
            className="flex h-8 w-8 items-center justify-center rounded-full text-ikincil transition-colors hover:bg-yuzeyKoyu hover:text-murekkep"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="max-h-[75vh] overflow-y-auto px-6 py-5">
          {/* E-POSTA (degistirilemez) */}
          <label className="block font-govde text-xs uppercase tracking-etiket text-ikincil">
            E-posta
          </label>
          <div className="mt-2 flex items-center justify-between gap-2 rounded-xl border border-ayrac bg-parsomen px-4 py-3">
            <span className="flex items-center gap-2 truncate font-govde text-sm text-murekkep">
              <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-ikincil" aria-hidden>
                <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth={1.6} fill="none" />
                <path d="m4 7 8 6 8-6" stroke="currentColor" strokeWidth={1.6} fill="none" />
              </svg>
              {kullanici.email}
            </span>
            <span className="shrink-0 rounded-full bg-yuzeyKoyu px-2.5 py-1 font-govde text-[0.6rem] uppercase tracking-etiket text-ikincil">
              Değiştirilemez
            </span>
          </div>

          {/* AD SOYAD */}
          <label className="mt-5 block font-govde text-xs uppercase tracking-etiket text-ikincil">
            Ad Soyad
          </label>
          <input
            value={ad}
            onChange={(e) => setAd(e.target.value)}
            className="mt-2 w-full rounded-xl border border-ayrac bg-parsomen px-4 py-3 font-govde text-sm text-murekkep outline-none focus:border-sarap"
          />

          {/* CINSIYET */}
          <label className="mt-5 block font-govde text-xs uppercase tracking-etiket text-ikincil">
            Cinsiyet
          </label>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {[
              { deger: "kadin", etiket: "Kadın" },
              { deger: "erkek", etiket: "Erkek" },
            ].map((o) => {
              const secili = cinsiyet === o.deger;
              return (
                <button
                  key={o.deger}
                  onClick={() => setCinsiyet(secili ? null : o.deger)}
                  className={`rounded-xl border px-4 py-3 font-govde text-sm transition-colors ${
                    secili
                      ? "border-sarap bg-sarap/10 font-medium text-sarap"
                      : "border-ayrac bg-parsomen text-ikincil hover:border-sarap/50"
                  }`}
                >
                  {o.etiket}
                </button>
              );
            })}
          </div>

          {hata && <p className="mt-3 font-govde text-sm text-sarap">{hata}</p>}
          {gosterge && (
            <p className={`mt-3 font-govde text-xs ${gosterge.sinif}`}>{gosterge.metin}</p>
          )}

          {/* BILDIRIM + SESSIZ SAATLER (mevcut bilesen) */}
          <div className="mt-6 border-t border-ayrac pt-2">
            <BildirimAyari yalin />
          </div>

          {/* GUVENLIK */}
          <div className="mt-6 border-t border-ayrac pt-5">
            <p className="font-govde text-xs uppercase tracking-etiket text-ikincil">Güvenlik</p>
            <Link
              href="/sifre-sifirla"
              onClick={onKapat}
              className="mt-3 flex items-center gap-2.5 rounded-xl border border-ayrac bg-parsomen px-4 py-3 font-govde text-sm text-murekkep transition-colors hover:border-sarap"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4 text-ikincil" aria-hidden>
                <rect x="5" y="10" width="14" height="10" rx="2" stroke="currentColor" strokeWidth={1.6} fill="none" />
                <path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" fill="none" />
              </svg>
              Şifremi yenile
            </Link>
            <p className="mt-2 font-govde text-xs text-ikincil">
              E-posta adresine bir şifre yenileme bağlantısı gönderilir.
            </p>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
