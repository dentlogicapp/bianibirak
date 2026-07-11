"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, type Kullanici, type Bildirim, type Etkinlik } from "@/lib/api";
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
  const [bildirimler, setBildirimler] = useState<Bildirim[]>([]);
  const [okunmamis, setOkunmamis] = useState(0);
  const [etkinlikler, setEtkinlikler] = useState<Etkinlik[]>([]);
  const [aktifId, setAktifId] = useState<string | null>(null);
  const [gecis, setGecis] = useState(false);
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

  // Bildirim cekme (planlama deseni): 15sn polling + pencere odaginda tazele.
  useEffect(() => {
    if (oturum !== "var") return;

    let iptal = false;
    async function cek() {
      const c = await api.bildirimler();
      if (!iptal && c.ok) {
        setBildirimler(c.veri.bildirimler);
        setOkunmamis(c.veri.okunmamis_sayisi);
      }
    }
    void cek();
    const zaman = setInterval(cek, 15000);
    function odak() {
      void cek();
    }
    window.addEventListener("focus", odak);
    return () => {
      iptal = true;
      clearInterval(zaman);
      window.removeEventListener("focus", odak);
    };
  }, [oturum]);

  // Etkinlikler + aktif etkinlik (switcher icin - planlama workspace deseni).
  useEffect(() => {
    if (oturum !== "var") return;
    api.etkinliklerim().then((c) => {
      if (c.ok) setEtkinlikler(c.veri);
    });
    api.etkinlikAktif().then((c) => {
      if (c.ok) setAktifId(c.veri.id);
    });
  }, [oturum]);

  // Etkinlik degistir -> JWT yenilenir -> hard refresh (planlama deseni)
  function etkinlikDegistir(id: string) {
    if (gecis) return;
    setGecis(true);
    api.etkinlikAktifYap(id).then((c) => {
      if (c.ok) {
        window.location.href = "/panel/etkinlik";
      } else {
        setGecis(false);
      }
    });
  }

  function bildirimeTikla(b: Bildirim) {
    if (!b.url) return;

    // TEK TIK, SIFIR SURTUNME: navigasyon SENKRON ve ONCE.
    // Ag istegi (durum kontrolu) tiklama anina KOYULMAZ - hedef rota zaten sabit
    // (/panel/etkinlik). Dilegin durumu (onayli/red/yok) defter sayfasinda islenir.
    const eslesme = b.url.match(/focus=([0-9a-fA-F-]{36})/);
    const hedef = eslesme ? `/panel/etkinlik?focus=${eslesme[1]}` : b.url;
    router.push(hedef);

    // Navigasyondan SONRA: menuyu kapat + okundu isaretle (ates-et-unut).
    setAcik(false);
    if (!b.okundu_mu) {
      setBildirimler((o) => o.map((x) => (x.id === b.id ? { ...x, okundu_mu: true } : x)));
      setOkunmamis((s) => Math.max(0, s - 1));
      void api.bildirimOkundu(b.id);
    }
  }

  async function bildirimSil(id: string) {
    const hedef = bildirimler.find((x) => x.id === id);
    setBildirimler((o) => o.filter((x) => x.id !== id));
    if (hedef && !hedef.okundu_mu) setOkunmamis((s) => Math.max(0, s - 1));
    void api.bildirimSil(id);
  }

  async function bildirimTumunuTemizle() {
    setBildirimler([]);
    setOkunmamis(0);
    void api.bildirimTumunuSil();
  }

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
      {/* Avatar - koyu tonda belirgin (dolu sarap zemin + parsomen harf) + bildirim rozeti */}
      <button
        onClick={() => setAcik((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={acik}
        className="relative flex h-9 w-9 items-center justify-center rounded-full bg-sarap font-display text-sm font-medium text-parsomen shadow-sm ring-1 ring-sarap/30 transition-transform hover:scale-105"
      >
        {basHarf}
        {okunmamis > 0 && (
          <span className="rozet-nabiz absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-yaldiz px-1 font-govde text-[0.6rem] font-bold text-murekkep ring-2 ring-parsomen">
            {okunmamis > 9 ? "9+" : okunmamis}
          </span>
        )}
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

          {/* Bolum 1 - Gezinme (planlama sirasi: Profilim ust, sonra ana yollar) */}
          <div className="border-b border-ayrac p-1.5">
            <MenuDugme
              onClick={() => {
                setAcik(false);
                setTimeout(() => setProfilAcik(true), 50);
              }}
              ikon={
                <>
                  <circle cx="12" cy="8.5" r="3.4" stroke="currentColor" strokeWidth={1.6} fill="none" />
                  <path d="M5 19.5a7 7 0 0 1 14 0" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" fill="none" />
                </>
              }
            >
              Profilim
            </MenuDugme>

            <MenuLink href="/panel/etkinlik" onClick={() => setAcik(false)} ikon={
              <>
                <path d="M5 4h9a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4Z" stroke="currentColor" strokeWidth={1.6} strokeLinejoin="round" fill="none" />
                <path d="M8 8h6M8 11h6" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" />
              </>
            }>
              Defter
            </MenuLink>

            <MenuLink href="/panel/paylasim" onClick={() => setAcik(false)} ikon={
              <>
                <circle cx="18" cy="5" r="2.3" stroke="currentColor" strokeWidth={1.6} fill="none" />
                <circle cx="6" cy="12" r="2.3" stroke="currentColor" strokeWidth={1.6} fill="none" />
                <circle cx="18" cy="19" r="2.3" stroke="currentColor" strokeWidth={1.6} fill="none" />
                <path d="m8.2 10.8 7.6-4.6M8.2 13.2l7.6 4.6" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" />
              </>
            }>
              Paylaşım
            </MenuLink>

            <MenuLink href="/panel/yonetim" onClick={() => setAcik(false)} ikon={
              <path d="M12 3.5 5 6.2v5c0 4.2 2.9 8.1 7 9.3 4.1-1.2 7-5.1 7-9.3v-5L12 3.5Z" stroke="currentColor" strokeWidth={1.6} strokeLinejoin="round" fill="none" />
            }>
              Yönetim
            </MenuLink>
          </div>

          {/* Diger etkinliklerin (yalniz 2+ etkinlik varsa - planlama workspace switcher) */}
          {etkinlikler.length >= 2 && (
            <div className="border-b border-ayrac p-1.5">
              <p className="px-3 pb-1 pt-1.5 font-govde text-[0.65rem] uppercase tracking-etiket text-ikincil">
                Diğer etkinliklerin
              </p>
              {etkinlikler
                .filter((e) => e.id !== aktifId)
                .map((e) => (
                  <button
                    key={e.id}
                    disabled={gecis}
                    onClick={() => etkinlikDegistir(e.id)}
                    className="flex w-full min-w-0 items-center gap-2.5 rounded-lg px-3 py-2 text-left font-govde text-sm text-murekkep transition-colors hover:bg-yuzeyKoyu disabled:opacity-50"
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-ikincil" aria-hidden>
                      <path
                        d="M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7Z"
                        stroke="currentColor"
                        strokeWidth={1.6}
                        fill="none"
                      />
                      <path d="M4 9h16M8 3v4M16 3v4" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" />
                    </svg>
                    <span className="min-w-0 flex-1 truncate">
                      {e.es1_ad} &amp; {e.es2_ad}
                    </span>
                    <span className="shrink-0 font-govde text-[0.6rem] uppercase tracking-etiket text-ikincil">
                      {turKisa(e.tur)}
                    </span>
                  </button>
                ))}
            </div>
          )}

          {/* Bolum 2 - Tema + Bildirimler + Cikis */}
          <div className="p-1.5">
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

            {/* BILDIRIMLER (tema ile cikis arasi) */}
            <div className="my-1.5 border-t border-ayrac pt-1.5">
              <div className="flex items-center justify-between px-3 pb-1 pt-1">
                <p className="font-govde text-[0.65rem] uppercase tracking-etiket text-ikincil">
                  Bildirimler
                </p>
                {bildirimler.length > 0 && (
                  <button
                    onClick={bildirimTumunuTemizle}
                    className="font-govde text-[0.65rem] text-ikincil transition-colors hover:text-sarap"
                  >
                    Tümünü temizle
                  </button>
                )}
              </div>

              {bildirimler.length === 0 ? (
                <p className="px-3 py-2 font-govde text-xs text-ikincil">
                  Yeni bildirim yok.
                </p>
              ) : (
                <div className="max-h-64 overflow-y-auto">
                  {bildirimler.slice(0, 8).map((b) => (
                    <div
                      key={b.id}
                      className="group flex items-start gap-2.5 rounded-lg px-3 py-2.5 transition-colors hover:bg-yuzeyKoyu"
                    >
                      {/* Tip ikonu */}
                      <span
                        className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                          b.okundu_mu ? "bg-yuzeyKoyu text-ikincil" : "bg-sarap/12 text-sarap"
                        }`}
                      >
                        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" aria-hidden>
                          <path
                            d="M5 4h9a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4Z"
                            stroke="currentColor"
                            strokeWidth={1.6}
                            strokeLinejoin="round"
                            fill="none"
                          />
                          <path d="M8 9h6M8 12h4" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" />
                        </svg>
                      </span>

                      <button
                        onClick={() => bildirimeTikla(b)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <p
                          className={`truncate font-govde text-xs font-medium ${
                            b.okundu_mu ? "text-ikincil" : "text-sarap"
                          }`}
                        >
                          {b.baslik}
                        </p>
                        <p
                          className={`mt-0.5 line-clamp-2 font-govde text-[0.7rem] leading-snug ${
                            b.okundu_mu ? "text-ikincil/70" : "text-murekkep"
                          }`}
                        >
                          {b.mesaj}
                        </p>
                        <p className="mt-0.5 font-govde text-[0.6rem] text-ikincil">
                          {gecenSure(b.created_at)}
                        </p>
                      </button>

                      {/* Okunmamis noktasi */}
                      {!b.okundu_mu && (
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-sarap" aria-hidden />
                      )}

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          bildirimSil(b.id);
                        }}
                        aria-label="Bildirimi sil"
                        className="shrink-0 self-center p-1 text-ikincil opacity-0 transition-opacity hover:text-sarap group-hover:opacity-100"
                      >
                        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" aria-hidden>
                          <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

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

// Menu ogesi - buton (Profilim gibi modal acanlar icin)
function MenuDugme({
  onClick,
  ikon,
  children,
}: {
  onClick: () => void;
  ikon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left font-govde text-sm text-murekkep transition-colors hover:bg-yuzeyKoyu"
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-ikincil" aria-hidden>
        {ikon}
      </svg>
      {children}
    </button>
  );
}

// Gecen sure metni ("3 dk once", "2 sa once", "dun", ...)
function gecenSure(iso: string): string {
  const t = new Date(iso).getTime();
  if (isNaN(t)) return "";
  const fark = Math.floor((Date.now() - t) / 1000);
  if (fark < 60) return "az önce";
  if (fark < 3600) return `${Math.floor(fark / 60)} dk önce`;
  if (fark < 86400) return `${Math.floor(fark / 3600)} sa önce`;
  const gun = Math.floor(fark / 86400);
  if (gun === 1) return "dün";
  if (gun < 7) return `${gun} gün önce`;
  return new Date(iso).toLocaleDateString("tr-TR", { day: "numeric", month: "long" });
}

// Etkinlik turu kisa etiketi (switcher rozeti)
function turKisa(tur: string): string {
  if (tur === "dugun") return "Düğün";
  if (tur === "nisan") return "Nişan";
  if (tur === "nikah") return "Nikah";
  return tur;
}
