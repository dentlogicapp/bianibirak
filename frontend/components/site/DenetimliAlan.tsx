"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Bulgu } from "@/lib/yazim";

// DENETIMLI METIN ALANI - Word'un yaptigi isi yapar, daha iyi gorunerek.
//
// WORD'UN AYIRT EDICI OZELLIGI: hata METNIN ICINDE isaretlenir. Kullanici nerede
// hata yaptigini ARAMAZ, gorur. Onceki surumumuzde yalniz altta bir liste vardi;
// davetli listedeki kelimeyi metinde bulmak zorundaydi. Bu, denetimi is haline
// getiriyordu - Word bunu 1995'te cozdu, biz de cozeriz.
//
// TEKNIK: <textarea> icine bicimlendirme konamaz. Cozum, iki katmanli mimari:
//
//   [ ARKA KATMAN ]  Ayni metni render eder; hatali kelimeler dalgali altcizgili.
//                    Metin RENGI SEFFAF - yalniz cizgiler gorunur. Tiklanabilir.
//   [ ON KATMAN   ]  Gercek <textarea>; arka plani seffaf, metni gorunur.
//
// Iki katman AYNI font, boyut, satir araligi ve dolguyu kullanir; boylece harfler
// piksel piksel ust uste oturur ve cizgi tam dogru kelimenin altina duser.
// Kaydirma senkronize edilir - uzun metinde de hizada kalir.

type Props = {
  deger: string;
  onDegisim: (yeni: string) => void;
  bulgular: Bulgu[];
  onDuzelt: (bulgu: Bulgu, secilen: string) => void;
  yerTutucu?: string;
  satir?: number;
};

export function DenetimliAlan({
  deger,
  onDegisim,
  bulgular,
  onDuzelt,
  yerTutucu,
  satir = 5,
}: Props) {
  const alanRef = useRef<HTMLTextAreaElement>(null);
  const arkaRef = useRef<HTMLDivElement>(null);
  const [acikBulgu, setAcikBulgu] = useState<number | null>(null);

  // Kaydirma senkronu: textarea kayinca isaretler de kaysin
  function kaydirmaSenkron() {
    if (arkaRef.current && alanRef.current) {
      arkaRef.current.scrollTop = alanRef.current.scrollTop;
    }
  }

  // Metin degisince acik oneri kutusu kapansin (konumlar kaydi)
  useLayoutEffect(() => {
    setAcikBulgu(null);
  }, [deger]);

  // Disari tiklaninca oneri kutusu kapansin
  useEffect(() => {
    if (acikBulgu === null) return;
    function kapat() {
      setAcikBulgu(null);
    }
    document.addEventListener("click", kapat);
    return () => document.removeEventListener("click", kapat);
  }, [acikBulgu]);

  // Metni parcala: [duz metin] [isaretli kelime] [duz metin] ...
  const parcalar: { metin: string; bulgu: Bulgu | null; indeks: number }[] = [];
  let imlec = 0;

  // Yalniz KELIME bulgulari isaretlenir (noktalama/buyuk-harf metinde cizilmez;
  // onlar gorsel gurultu yaratir, listede yeterince gorunurler).
  const isaretlenecek = bulgular
    .filter((b) => b.tur === "yazim" || b.tur === "bilinmeyen" || b.tur === "uygunsuz")
    .sort((a, b) => a.baslangic - b.baslangic);

  for (let i = 0; i < isaretlenecek.length; i++) {
    const b = isaretlenecek[i];
    if (b.baslangic > imlec) {
      parcalar.push({ metin: deger.slice(imlec, b.baslangic), bulgu: null, indeks: -1 });
    }
    parcalar.push({
      metin: deger.slice(b.baslangic, b.bitis),
      bulgu: b,
      indeks: bulgular.indexOf(b),
    });
    imlec = b.bitis;
  }
  if (imlec < deger.length) {
    parcalar.push({ metin: deger.slice(imlec), bulgu: null, indeks: -1 });
  }

  // Iki katmanin BIREBIR ayni olmasi sart - tek kaynak
  const ortakBicim =
    "w-full whitespace-pre-wrap break-words px-4 py-3 font-govde text-sm leading-[1.6]";

  return (
    <div className="relative">
      {/* ARKA KATMAN - isaretler */}
      <div
        ref={arkaRef}
        aria-hidden
        className={`${ortakBicim} pointer-events-none absolute inset-0 overflow-hidden rounded-xl border border-transparent text-transparent`}
      >
        {parcalar.map((p, i) =>
          p.bulgu ? (
            <span
              key={i}
              onClick={(e) => {
                e.stopPropagation();
                setAcikBulgu(acikBulgu === p.indeks ? null : p.indeks);
              }}
              className={`pointer-events-auto cursor-pointer ${
                p.bulgu.tur === "uygunsuz" ? "isaret-uygunsuz" : "isaret-yazim"
              }`}
            >
              {p.metin}
            </span>
          ) : (
            <span key={i}>{p.metin}</span>
          )
        )}
        {/* Son satirdaki cizginin kirpilmamasi icin */}
        {"\n"}
      </div>

      {/* ON KATMAN - gercek girdi */}
      <textarea
        ref={alanRef}
        value={deger}
        onChange={(e) => onDegisim(e.target.value)}
        onScroll={kaydirmaSenkron}
        rows={satir}
        placeholder={yerTutucu}
        spellCheck={false}
        className={`${ortakBicim} relative resize-none rounded-xl border border-ayrac bg-parsomen text-murekkep outline-none placeholder:text-ikincil/45 focus:border-sarap`}
        style={{ backgroundColor: "transparent" }}
      />

      {/* Zemin - textarea seffaf oldugu icin arka plani AYRI cizeriz;
          boylece isaret katmani metnin ALTINDA, zeminin USTUNDE kalir. */}
      <div className="absolute inset-0 -z-10 rounded-xl bg-parsomen" aria-hidden />

      {/* ONERI KUTUSU - Word'un sag tik menusu, ama tek tiklamayla */}
      {acikBulgu !== null && bulgular[acikBulgu] && (
        <OneriKutusu
          bulgu={bulgular[acikBulgu]}
          onSec={(secilen) => {
            onDuzelt(bulgular[acikBulgu], secilen);
            setAcikBulgu(null);
          }}
          onKapat={() => setAcikBulgu(null)}
        />
      )}
    </div>
  );
}

// Oneri kutusu - metnin ALTINA acilir (mobilde klavye ustu kalabalik olmasin)
function OneriKutusu({
  bulgu,
  onSec,
  onKapat,
}: {
  bulgu: Bulgu;
  onSec: (secilen: string) => void;
  onKapat: () => void;
}) {
  const oneriler = bulgu.dogru
    ? [bulgu.dogru, ...(bulgu.oneriler ?? [])]
    : (bulgu.oneriler ?? []);

  const tekil = Array.from(new Set(oneriler)).slice(0, 4);

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="absolute left-0 right-0 top-full z-20 mt-1.5 overflow-hidden rounded-xl border border-ayrac bg-yuzey shadow-[0_10px_30px_rgba(33,26,23,0.16)]"
    >
      <div className="flex items-center justify-between gap-2 border-b border-ayrac bg-parsomen px-3.5 py-2">
        <span className="min-w-0 truncate font-govde text-xs">
          <span className="font-medium text-murekkep">{bulgu.hatali}</span>
          <span className="ml-2 text-ikincil">{bulgu.aciklama}</span>
        </span>
        <button
          type="button"
          onClick={onKapat}
          className="shrink-0 text-ikincil transition-colors hover:text-murekkep"
          aria-label="Kapat"
        >
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" aria-hidden>
            <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {tekil.length > 0 ? (
        <ul>
          {tekil.map((o) => (
            <li key={o}>
              <button
                type="button"
                onClick={() => onSec(o)}
                className="flex w-full items-center gap-2 px-3.5 py-2 text-left font-govde text-sm text-murekkep transition-colors hover:bg-sarap hover:text-parsomen"
              >
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden>
                  <path d="m5 12.5 4.2 4.2L19 7" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" fill="none" />
                </svg>
                {o}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="px-3.5 py-2.5 font-govde text-xs text-ikincil">
          Öneri bulamadım - bir özel ad ya da yeni bir kelime olabilir.
        </p>
      )}
    </div>
  );
}
