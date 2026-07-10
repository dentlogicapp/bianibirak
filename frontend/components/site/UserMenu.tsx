"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, type Kullanici } from "@/lib/api";
import { useTema } from "@/lib/tema";
import { ProfilimModal } from "@/components/site/ProfilimModal";

// Avatar menusu (planlama deseni): bolumlu dropdown.
// Bolum 1 - Etkinlik: Etkinlik Ayarlari, Denetim Gunlugu.
// Bolum 2 - Hesap: Bildirimler & Sessiz Saatler, Sifre Degistir, Tema, Cikis.
// Koyu tonda avatar belirgin (dolu sarap zemin).
export function UserMenu() {
  const router = useRouter();
  const [kullanici, setKullanici] = useState<Kullanici | null>(null);
  const [oturum, setOturum] = useState<"bilinmiyor" | "var" | "yok">("bilinmiyor");
  const [acik, setAcik] = useState(false);
  const [profilAcik, setProfilAcik] = useState(false);
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
      {/* Avatar - koyu tonda belirgin (dolu sarap zemin + parsomen harf) */}
      <button
        onClick={() => setAcik((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={acik}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-sarap font-display text-sm font-medium text-parsomen shadow-sm ring-1 ring-sarap/30 transition-transform hover:scale-105"
      >
        {basHarf}
      </button>

      {acik && (
        <div className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-ayrac bg-yuzey shadow-xl">
          {/* Kullanici basligi */}
          <div className="flex items-center gap-3 border-b border-ayrac px-4 py-3.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sarap font-display text-base font-medium text-parsomen">
              {basHarf}
            </span>
            <div className="min-w-0">
              <p className="truncate font-govde text-sm font-medium text-murekkep">
                {kullanici.ad}
              </p>
              <p className="truncate font-govde text-xs text-ikincil">{kullanici.email}</p>
            </div>
          </div>

          {/* Bolum 1 - Etkinlik */}
          <div className="border-b border-ayrac p-1.5">
            <p className="px-3 pb-1 pt-1.5 font-govde text-[0.65rem] uppercase tracking-etiket text-ikincil">
              Etkinlik
            </p>
            <MenuLink href="/panel/duzenle" onClick={() => setAcik(false)} ikon={
              <path d="M4 20h4l10-10-4-4L4 16v4Z M13.5 6.5l4 4" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" fill="none" />
            }>
              Etkinlik Ayarları
            </MenuLink>
            <MenuLink href="/panel/denetim" onClick={() => setAcik(false)} ikon={
              <>
                <path d="M9 5h6M4 9h16v11H4z" stroke="currentColor" strokeWidth={1.6} strokeLinejoin="round" fill="none" />
                <path d="M8 13h8M8 16h5" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" />
              </>
            }>
              Denetim Günlüğü
            </MenuLink>
          </div>

          {/* Bolum 2 - Hesap */}
          <div className="p-1.5">
            <p className="px-3 pb-1 pt-1.5 font-govde text-[0.65rem] uppercase tracking-etiket text-ikincil">
              Hesap
            </p>
            <button
              onClick={() => {
                setAcik(false);
                setProfilAcik(true);
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 font-govde text-sm text-murekkep transition-colors hover:bg-yuzeyKoyu"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4 text-ikincil" aria-hidden>
                <circle cx="12" cy="8" r="3.2" stroke="currentColor" strokeWidth={1.6} fill="none" />
                <path d="M5 20a7 7 0 0 1 14 0" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" fill="none" />
              </svg>
              Profilim
            </button>

            {/* Tema */}
            <button
              onClick={temaTersle}
              className="flex w-full items-center justify-between gap-2.5 rounded-lg px-3 py-2 font-govde text-sm text-murekkep transition-colors hover:bg-yuzeyKoyu"
            >
              <span className="flex items-center gap-2.5">
                <svg viewBox="0 0 24 24" className="h-4 w-4 text-ikincil" aria-hidden>
                  {tema === "acik" ? (
                    <path d="M20 14A8 8 0 0 1 10 4a8 8 0 1 0 10 10Z" stroke="currentColor" strokeWidth={1.6} strokeLinejoin="round" fill="none" />
                  ) : (
                    <>
                      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth={1.6} fill="none" />
                      <path d="M12 3v2M12 19v2M3 12h2M19 12h2M6 6l1.5 1.5M16.5 16.5 18 18M6 18l1.5-1.5M16.5 7.5 18 6" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" />
                    </>
                  )}
                </svg>
                {tema === "acik" ? "Koyu tema" : "Açık tema"}
              </span>
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

            {/* Cikis */}
            <button
              onClick={cikis}
              className="mt-0.5 flex w-full items-center gap-2.5 rounded-lg px-3 py-2 font-govde text-sm text-sarap transition-colors hover:bg-yuzeyKoyu"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
                <path d="M14 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-2M9 12h11M17 9l3 3-3 3" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" fill="none" />
              </svg>
              Çıkış yap
            </button>
          </div>
        </div>
      )}

      {profilAcik && (
        <ProfilimModal
          kullanici={kullanici}
          onKapat={() => setProfilAcik(false)}
          onGuncellendi={(k) => setKullanici(k)}
        />
      )}
    </div>
  );
}

// Menu ici link (ikon + metin)
function MenuLink({
  href,
  onClick,
  ikon,
  children,
}: {
  href: string;
  onClick: () => void;
  ikon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-2.5 rounded-lg px-3 py-2 font-govde text-sm text-murekkep transition-colors hover:bg-yuzeyKoyu"
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4 text-ikincil" aria-hidden>
        {ikon}
      </svg>
      {children}
    </Link>
  );
}
