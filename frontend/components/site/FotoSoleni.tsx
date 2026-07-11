"use client";

import { useEffect, useMemo, useState } from "react";

// FOTO SOLENI - davetli ekraninin ust bandi.
//
// TASARIM FELSEFESI: bir slayt gostericisi degil, NEFES ALAN bir vitrin.
//  - Coklu dilim: 2-3 sutun ayni anda, her biri KENDI dongusunu oynatir.
//  - Kaydirilmis zamanlama (staggered): dilimler asla ayni anda donmez; goz surekli
//    bir yerde hareket yakalar - hipnotik, durgun degil.
//  - Ken Burns: her fotograf yavasca buyur ve kayar (kagit uzerinde canli durur).
//  - Capraz gecis: eski kare erirken yeni kare belirir - kesme YOK.
//  - Ambiyans: arkada bulanik, buyutulmus kare; oldugu yerde derinlik yaratir.
//  - Alt erime: parsomen rengine yumusak gecis - foto "yapistirilmis" durmaz.
//
// Fotograf sayisina UYUM SAGLAR: 1 foto -> tek genis sahne; 2 -> iki dilim;
// 3+ -> uc dilim ve her dilim havuzdaki fotograflar arasinda doner.

type Foto = { url: string; altyazi: string | null; kapak: boolean };

const DILIM_SURESI = [4600, 5300, 6100]; // asal-benzeri araliklar: dongu asla senkronlanmaz
const GECIS_MS = 1600;

export function FotoSoleni({ fotograflar, baslik }: { fotograflar: Foto[]; baslik: string }) {
  // Kapak once: vitrinin ilk karesi cift'in sectigi kare olsun
  const havuz = useMemo(() => {
    const sirali = [...fotograflar].sort((a, b) => Number(b.kapak) - Number(a.kapak));
    return sirali;
  }, [fotograflar]);

  const dilimSayisi = havuz.length >= 3 ? 3 : havuz.length;

  if (havuz.length === 0) return null;

  return (
    <div className="relative h-52 w-full overflow-hidden bg-[#1a1512] sm:h-60">
      {/* Ambiyans: bulanik derinlik katmani */}
      <div
        className="absolute inset-0 scale-125 opacity-40 blur-2xl"
        style={{
          backgroundImage: `url(${havuz[0].url})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
        aria-hidden
      />

      {/* Dilimler */}
      <div className="absolute inset-0 flex gap-[2px]">
        {Array.from({ length: dilimSayisi }).map((_, i) => (
          <Dilim
            key={i}
            havuz={havuz}
            baslangic={i}
            adim={dilimSayisi}
            sure={DILIM_SURESI[i % DILIM_SURESI.length]}
            baslik={baslik}
          />
        ))}
      </div>

      {/* Alt erime - parsomene yumusak gecis (foto "yapistirilmis" durmasin) */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-20"
        style={{
          background:
            "linear-gradient(to bottom, rgba(239,231,213,0) 0%, rgba(239,231,213,0.55) 55%, var(--yuzey, #efe7d5) 100%)",
        }}
        aria-hidden
      />

      {/* Ust yaldiz hat - cerceve hissi */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-yaldiz/50" aria-hidden />
    </div>
  );
}

// Tek dilim: havuzdan kendi altkumesini, kendi ritminde dondurur.
function Dilim({
  havuz,
  baslangic,
  adim,
  sure,
  baslik,
}: {
  havuz: Foto[];
  baslangic: number;
  adim: number;
  sure: number;
  baslik: string;
}) {
  // Bu dilimin fotograf serisi: havuzu dilimler arasinda serpistir
  const seri = useMemo(() => {
    const s: Foto[] = [];
    for (let i = baslangic; i < havuz.length; i += adim) s.push(havuz[i]);
    // Dilime hic foto dusmediyse (az foto) havuzdan sirayla besle
    return s.length > 0 ? s : [havuz[baslangic % havuz.length]];
  }, [havuz, baslangic, adim]);

  const [indeks, setIndeks] = useState(0);
  const [gecisTe, setGecisTe] = useState(false);

  useEffect(() => {
    if (seri.length < 2) return;

    // Kaydirilmis baslangic: dilimler ayni anda donmesin
    const gecikme = baslangic * 900;
    let araId: ReturnType<typeof setInterval>;

    const baslatId = setTimeout(() => {
      araId = setInterval(() => {
        setGecisTe(true);
        setTimeout(() => {
          setIndeks((i) => (i + 1) % seri.length);
          setGecisTe(false);
        }, GECIS_MS);
      }, sure);
    }, gecikme);

    return () => {
      clearTimeout(baslatId);
      if (araId) clearInterval(araId);
    };
  }, [seri.length, sure, baslangic]);

  const simdiki = seri[indeks];
  const sonraki = seri[(indeks + 1) % seri.length];

  return (
    <div className="relative min-w-0 flex-1 overflow-hidden">
      {/* Mevcut kare - Ken Burns ile canli */}
      <div
        className="absolute inset-0 transition-opacity duration-[1600ms] ease-in-out"
        style={{ opacity: gecisTe ? 0 : 1 }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={`${simdiki.url}-${indeks}`}
          src={simdiki.url}
          alt={simdiki.altyazi ?? baslik}
          className="h-full w-full object-cover animasyon-kenburns"
        />
      </div>

      {/* Sonraki kare - alttan belirir */}
      {seri.length > 1 && (
        <div
          className="absolute inset-0 transition-opacity duration-[1600ms] ease-in-out"
          style={{ opacity: gecisTe ? 1 : 0 }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={sonraki.url}
            alt=""
            aria-hidden
            className="h-full w-full object-cover animasyon-kenburns-ters"
          />
        </div>
      )}

      {/* Dilim ayirici - ince isik hatti */}
      <div className="pointer-events-none absolute inset-y-0 right-0 w-px bg-parsomen/15" aria-hidden />
    </div>
  );
}
