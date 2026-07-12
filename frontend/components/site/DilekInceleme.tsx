"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import type { Katki } from "@/lib/api";
import { DefterKarti } from "@/components/site/DefterKarti";

// DILEK INCELEME - onay vermeden ONCE ne onayladigini gormek.
//
// NEDEN: es, listede bir metin parcasi gorup "Onayla"ya basiyordu. Ama o dilege
// bir FOTOGRAF da eklenmis olabilir; deftere hangi olcude, hangi cerceveyle girecegi
// belirsizdi. Yarim bilgiyle verilen onay, KOR onaydir - ve bu defter geri
// alinamaz bir esere gidiyor.
//
// Bu ekran iki sey gosterir:
//   1. KAGITTAKI HALI - davetlinin gordugu onizlemenin, PDF'in ve bu ekranin
//      HEPSI ayni DefterKarti bileseninden beslenir. Ne goruyorsan o basilir.
//   2. DAVETLININ KIMLIGI - ad, iliski, telefon, e-posta, birakma zamani.
//      Es, "bu kim?" diye durmaz; gerekirse davetliye ulasabilir.

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
  onOnayla: () => void;
  onReddet: () => void;
  onKapat: () => void;
}) {
  // ESC ile kapat + arka plan kaydirmasini kilitle
  useEffect(() => {
    function tus(e: KeyboardEvent) {
      if (e.key === "Escape") onKapat();
    }
    document.addEventListener("keydown", tus);
    const eskiTasma = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", tus);
      document.body.style.overflow = eskiTasma;
    };
  }, [onKapat]);

  // Onaylanmis bir dilek icin "Onayla/Reddet" anlamsizdir - eylemler duruma uyar.
  const onaylanmis = katki.durum === "onayli";

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
      className="fixed inset-0 z-50 flex items-end justify-center bg-murekkep/45 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={onKapat}
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-ayrac bg-yuzey shadow-[0_20px_60px_rgba(33,26,23,0.3)] sm:rounded-3xl"
      >
        {/* Basli */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-ayrac px-6 py-4">
          <div className="min-w-0">
            <p
              className={`font-govde text-[0.68rem] uppercase tracking-etiket ${
                onaylanmis ? "text-ikincil" : "text-yaldiz"
              }`}
            >
              {onaylanmis ? "Deftere eklendi" : "Onayını bekliyor"}
            </p>
            <h2 className="mt-0.5 truncate font-display text-lg text-murekkep">
              {katki.davetli_ad}
            </h2>
          </div>
          <button
            type="button"
            onClick={onKapat}
            className="shrink-0 rounded-full p-1.5 text-ikincil transition-colors hover:bg-parsomen hover:text-murekkep"
            aria-label="Kapat"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
              <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Govde - kaydirilabilir */}
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <p className="text-center font-govde text-[0.7rem] uppercase tracking-etiket text-ikincil">
            Defterde böyle görünecek
          </p>

          {/* KAGIT - davetlinin gordugu ve PDF'e basilacak halin AYNISI */}
          <div className="mt-3 overflow-hidden rounded-lg bg-[#fdf9f0] px-4 py-6 shadow-[0_6px_24px_rgba(0,0,0,0.13)]">
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

          {/* DAVETLI KIMLIGI - formda doldurdugu her sey */}
          <div className="mt-5 overflow-hidden rounded-2xl border border-ayrac bg-parsomen">
            <p className="border-b border-ayrac px-4 py-2 font-govde text-[0.68rem] uppercase tracking-etiket text-ikincil">
              Davetli bilgileri
            </p>

            <dl className="divide-y divide-ayrac/60">
              <Satir etiket="Ad Soyad" deger={katki.davetli_ad} />
              <Satir
                etiket="Yakınlık"
                deger={katki.davetli_iliski || "Belirtilmemiş"}
              />
              <Satir
                etiket="Telefon"
                deger={telefonBicim(katki.davetli_telefon)}
                kopyala={katki.davetli_telefon}
                baglanti={`tel:${katki.davetli_telefon}`}
              />
              <Satir
                etiket="E-posta"
                deger={katki.davetli_email || "Paylaşmadı"}
                kopyala={katki.davetli_email || undefined}
                baglanti={katki.davetli_email ? `mailto:${katki.davetli_email}` : undefined}
              />
              <Satir etiket="Bırakma zamanı" deger={`${tarihUzun} · ${saat}`} />
              {katki.foto_url && (
                <Satir
                  etiket="Fotoğraf"
                  deger={
                    katki.foto_genislik > 0
                      ? `${katki.foto_genislik}×${katki.foto_yukseklik} piksel`
                      : "Eklendi"
                  }
                />
              )}
            </dl>
          </div>
        </div>

        {/* Eylemler - duruma uyar */}
        <div className="flex shrink-0 gap-2.5 border-t border-ayrac bg-yuzey px-6 py-4">
          {onaylanmis ? (
            <button
              type="button"
              onClick={onKapat}
              className="w-full rounded-full border border-ayrac px-5 py-2.5 font-govde text-sm text-ikincil transition-colors hover:border-sarap hover:text-sarap"
            >
              Kapat
            </button>
          ) : (
            <>
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
            </>
          )}
        </div>
      </div>
    </div>
  );

  // Portal: modal, panel yerlesiminin taşma/z-index tuzaklarindan bagimsiz olsun
  if (typeof document === "undefined") return null;
  return createPortal(govde, document.body);
}

function Satir({
  etiket,
  deger,
  kopyala,
  baglanti,
}: {
  etiket: string;
  deger: string;
  kopyala?: string;
  baglanti?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2.5">
      <dt className="shrink-0 font-govde text-xs text-ikincil">{etiket}</dt>
      <dd className="flex min-w-0 items-center gap-2">
        {baglanti ? (
          <a
            href={baglanti}
            className="truncate font-govde text-sm text-murekkep underline decoration-ayrac underline-offset-2 transition-colors hover:text-sarap hover:decoration-sarap"
          >
            {deger}
          </a>
        ) : (
          <span className="truncate font-govde text-sm text-murekkep">{deger}</span>
        )}

        {kopyala && (
          <button
            type="button"
            onClick={() => void navigator.clipboard?.writeText(kopyala)}
            className="shrink-0 text-ikincil transition-colors hover:text-sarap"
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

// "05321234567" -> "0532 123 45 67"
function telefonBicim(ham: string): string {
  const r = (ham ?? "").replace(/\D/g, "");
  if (r.length !== 11) return ham || "Belirtilmemiş";
  return `${r.slice(0, 4)} ${r.slice(4, 7)} ${r.slice(7, 9)} ${r.slice(9, 11)}`;
}
