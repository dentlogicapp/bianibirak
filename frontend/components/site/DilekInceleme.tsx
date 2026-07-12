"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import type { Katki } from "@/lib/api";
import { DefterKarti } from "@/components/site/DefterKarti";

// DILEK INCELEME - onay vermeden ONCE ne onayladigini gormek.
//
// TASARIM KARARLARI:
//
//  1. TAM EKRAN. Onceki surum kucuk bir kutuydu; fotograf ve bilgi satirlarina
//     ulasmak icin KAYDIRMAK gerekiyordu. Bir esere onay veriyoruz - karar aninda
//     her sey AYNI ANDA gorunmeli. Genis ekranda iki sutun (kagit | bilgiler),
//     dar ekranda tek sutun ama tam yukseklik.
//
//  2. AYRI PENCERE HISSI. Onceki cerceve panelin kendisiyle ayni yuzeydi
//     (bg-yuzey + border-ayrac); goz "yeni bir yere gectim" demiyordu. Simdi:
//     koyu mürekkep perdesi + KAGIT yuzeyi (bg-parsomen) + belirgin golge +
//     yaldiz ust serit. Ana desen korunur, ama katman degistigi HISSEDILIR.
//
//  3. KAGITTAKI HALI. Davetlinin onizlemesi, kurasyon studyosu ve PDF ile ayni
//     DefterKarti bileseninden beslenir. Ne goruyorsan o basilir.

export function DilekInceleme({
  katki,
  tema,
  tarihGoster = true,
  yukleniyor,
  onOnayla,
  onReddet,
  onKapat,
}: {
  katki: Katki;
  tema?: string;
  tarihGoster?: boolean;
  yukleniyor: boolean;
  onOnayla?: () => void;
  onReddet?: () => void;
  onKapat: () => void;
}) {
  useEffect(() => {
    function tus(e: KeyboardEvent) {
      if (e.key === "Escape") onKapat();
    }
    document.addEventListener("keydown", tus);
    const eski = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", tus);
      document.body.style.overflow = eski;
    };
  }, [onKapat]);

  const onaylanmis = katki.durum === "onayli";
  const eylemVar = Boolean(onOnayla && onReddet) && !onaylanmis;

  const zaman = new Date(katki.created_at);
  const tarihUzun = zaman.toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const saat = zaman.toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const govde = (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-murekkep/70 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      {/* KAGIT YUZEYI - panelden farkli bir katman oldugu bir bakista anlasilir */}
      <div className="flex h-full w-full flex-col overflow-hidden bg-parsomen shadow-[0_0_80px_rgba(33,26,23,0.5)] sm:m-auto sm:h-[94vh] sm:max-w-5xl sm:rounded-3xl">
        {/* Yaldiz ust serit - "yeni bir sayfadasin" */}
        <div className="h-1 shrink-0 bg-gradient-to-r from-yaldiz/30 via-yaldiz to-yaldiz/30" aria-hidden />

        {/* Basli */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-ayrac px-5 py-4 sm:px-8">
          <div className="min-w-0">
            <p
              className={`font-govde text-[0.66rem] uppercase tracking-etiket ${
                onaylanmis ? "text-ikincil" : "text-yaldiz"
              }`}
            >
              {onaylanmis ? "Deftere eklendi" : "Onayını bekliyor"}
            </p>
            <h2 className="mt-0.5 truncate font-display text-xl text-murekkep sm:text-2xl">
              {katki.davetli_ad}
            </h2>
            {katki.davetli_iliski && (
              <p className="truncate font-govde text-xs text-ikincil">
                {katki.davetli_iliski}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onKapat}
            className="shrink-0 rounded-full border border-ayrac p-2 text-ikincil transition-colors hover:border-sarap hover:text-sarap"
            aria-label="Kapat"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
              <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* GOVDE - genis ekranda IKI SUTUN: kagit solda, bilgiler sagda.
            Boylece fotograf da bilgiler de TEK BAKISTA gorunur; kaydirma gerekmez. */}
        <div className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto lg:grid-cols-[1fr_320px] lg:overflow-hidden">
          {/* Kagit */}
          <div className="min-h-0 overflow-y-auto bg-yuzey/40 px-5 py-6 sm:px-8 lg:py-8">
            <p className="text-center font-govde text-[0.66rem] uppercase tracking-etiket text-ikincil">
              Defterde böyle görünecek
            </p>

            <div className="mx-auto mt-4 max-w-md overflow-hidden rounded-lg bg-[#fdf9f0] px-5 py-7 shadow-[0_10px_36px_rgba(33,26,23,0.18)]">
              <DefterKarti
                ad={katki.davetli_ad}
                iliski={katki.davetli_iliski}
                mesaj={katki.mesaj}
                fotoUrl={katki.foto_url}
                fotoGenislik={katki.foto_genislik}
                fotoYukseklik={katki.foto_yukseklik}
                tarih={tarihGoster ? tarihUzun : null}
                tema={tema}
              />
            </div>
          </div>

          {/* Bilgiler */}
          <aside className="min-h-0 overflow-y-auto border-t border-ayrac px-5 py-6 sm:px-8 lg:border-l lg:border-t-0 lg:px-6">
            <p className="font-govde text-[0.66rem] uppercase tracking-etiket text-ikincil">
              Davetli bilgileri
            </p>

            <dl className="mt-3 space-y-0.5">
              <Satir etiket="Ad Soyad" deger={katki.davetli_ad} />
              <Satir etiket="Yakınlık" deger={katki.davetli_iliski || "Belirtilmemiş"} />
              <Satir
                etiket="Telefon"
                deger={telefonBicim(katki.davetli_telefon)}
                kopyala={katki.davetli_telefon || undefined}
                baglanti={katki.davetli_telefon ? `tel:${katki.davetli_telefon}` : undefined}
              />
              <Satir
                etiket="E-posta"
                deger={katki.davetli_email || "Paylaşmadı"}
                kopyala={katki.davetli_email || undefined}
                baglanti={katki.davetli_email ? `mailto:${katki.davetli_email}` : undefined}
              />
              <Satir etiket="Bırakma zamanı" deger={`${tarihUzun}`} alt={saat} />
              <Satir
                etiket="Fotoğraf"
                deger={
                  katki.foto_url
                    ? katki.foto_genislik > 0
                      ? `${katki.foto_genislik}×${katki.foto_yukseklik}`
                      : "Eklendi"
                    : "Eklenmedi"
                }
              />
            </dl>
          </aside>
        </div>

        {/* Eylemler */}
        <div className="flex shrink-0 gap-2.5 border-t border-ayrac bg-yuzey px-5 py-4 sm:px-8">
          {eylemVar ? (
            <>
              <button
                type="button"
                onClick={onKapat}
                className="hidden rounded-full border border-ayrac px-5 py-2.5 font-govde text-sm text-ikincil transition-colors hover:border-murekkep hover:text-murekkep sm:block"
              >
                Kapat
              </button>
              <div className="flex flex-1 gap-2.5">
                <button
                  type="button"
                  onClick={onReddet}
                  disabled={yukleniyor}
                  className="flex-1 rounded-full border border-ayrac px-5 py-2.5 font-govde text-sm text-ikincil transition-colors hover:border-sarap hover:text-sarap disabled:opacity-60"
                >
                  Reddet
                </button>
                <button
                  type="button"
                  onClick={onOnayla}
                  disabled={yukleniyor}
                  className="flex-[2] rounded-full bg-sarap px-5 py-2.5 font-govde text-sm font-medium text-parsomen transition-colors hover:bg-sarapKoyu disabled:opacity-60"
                >
                  {yukleniyor ? "..." : "Deftere ekle"}
                </button>
              </div>
            </>
          ) : (
            <button
              type="button"
              onClick={onKapat}
              className="w-full rounded-full border border-ayrac px-5 py-2.5 font-govde text-sm text-ikincil transition-colors hover:border-sarap hover:text-sarap"
            >
              Kapat
            </button>
          )}
        </div>
      </div>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(govde, document.body);
}

function Satir({
  etiket,
  deger,
  alt,
  kopyala,
  baglanti,
}: {
  etiket: string;
  deger: string;
  alt?: string;
  kopyala?: string;
  baglanti?: string;
}) {
  return (
    <div className="rounded-xl px-3 py-2.5 transition-colors hover:bg-yuzey">
      <dt className="font-govde text-[0.66rem] uppercase tracking-etiket text-ikincil">
        {etiket}
      </dt>
      <dd className="mt-0.5 flex items-center gap-2">
        {baglanti ? (
          <a
            href={baglanti}
            className="min-w-0 truncate font-govde text-sm text-murekkep underline decoration-ayrac underline-offset-2 transition-colors hover:text-sarap hover:decoration-sarap"
          >
            {deger}
          </a>
        ) : (
          <span className="min-w-0 truncate font-govde text-sm text-murekkep">{deger}</span>
        )}

        {alt && <span className="shrink-0 font-govde text-xs text-ikincil">· {alt}</span>}

        {kopyala && (
          <button
            type="button"
            onClick={() => void navigator.clipboard?.writeText(kopyala)}
            className="ml-auto shrink-0 text-ikincil transition-colors hover:text-sarap"
            aria-label={`${etiket} kopyala`}
            title="Kopyala"
          >
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" aria-hidden>
              <rect x="9" y="9" width="11" height="11" rx="2" stroke="currentColor" strokeWidth={1.6} fill="none" />
              <path d="M5 15V6a2 2 0 0 1 2-2h9" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" fill="none" />
            </svg>
          </button>
        )}
      </dd>
    </div>
  );
}

function telefonBicim(ham: string): string {
  const r = (ham ?? "").replace(/\D/g, "");
  if (r.length !== 11) return ham || "Belirtilmemiş";
  return `${r.slice(0, 4)} ${r.slice(4, 7)} ${r.slice(7, 9)} ${r.slice(9, 11)}`;
}
