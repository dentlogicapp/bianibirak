"use client";

import { useEffect, useRef, useState } from "react";
import type { KatkiKarsilama } from "@/lib/api";
import { DavetliEkrani } from "@/components/site/DavetliEkrani";

// DAVETLI EKRANI ONIZLEMESI
//
// GERCEGIN KENDISI: DavetliEkrani bileseni, davetlinin gordugu sayfayla AYNI koddur.
// Film seridi, sayac, iliski menusu, yazim denetimi, fotograf alani, "Dileğimi bırak"
// butonu - hepsi burada, cunku ayni bilesen. Ayrismak icin ikinci bir kod YOK.
//
// OLCEK STABILITESI:
// Icerik SABIT genislikte (390px - referans telefon) cizilir, sonra kapsayiciya
// ORANLA kucultulur. Fotograf sayisi, metin uzunlugu, tema - hicbiri bu olcegi
// degistiremez. Yatay tasma MATEMATIKSEL olarak imkansizdir.
//
// Cerceve: telefon maketi YOK. Sade bir kagit yuzeyi, ince kenarlik, yumusak golge.
// Onizleme burada ICERIGIN kendisidir; suslu bir kutu icinde degil.

const REFERANS_GENISLIK = 390;

export function DavetliOnizleme({ veri }: { veri: KatkiKarsilama | null }) {
  const kapRef = useRef<HTMLDivElement>(null);
  const icRef = useRef<HTMLDivElement>(null);
  const [olcek, setOlcek] = useState(1);
  const [yukseklik, setYukseklik] = useState(700);

  // Kapsayici genisligine gore olcek
  useEffect(() => {
    const kap = kapRef.current;
    if (!kap) return;

    function olc() {
      const g = kap!.clientWidth;
      if (g > 0) setOlcek(Math.min(g / REFERANS_GENISLIK, 1));
    }

    olc();
    const g = new ResizeObserver(olc);
    g.observe(kap);
    return () => g.disconnect();
  }, []);

  // Ic yukseklik olceklendikten sonra disariya YANSITILIR; yoksa kapsayici
  // olceklenmemis yuksekligi ayirir ve altta kocaman bir bosluk kalir.
  useEffect(() => {
    const ic = icRef.current;
    if (!ic) return;

    function olc() {
      setYukseklik(ic!.scrollHeight * olcek);
    }

    olc();
    const g = new ResizeObserver(olc);
    g.observe(ic);
    return () => g.disconnect();
  }, [olcek, veri]);

  if (!veri) {
    return (
      <div className="rounded-3xl border border-dashed border-ayrac bg-parsomen px-6 py-20 text-center">
        <p className="font-govde text-sm text-ikincil">Önizleme hazırlanıyor...</p>
      </div>
    );
  }

  return (
    <div
      ref={kapRef}
      className="min-w-0 overflow-hidden rounded-3xl border border-ayrac bg-parsomen"
      style={{ height: yukseklik }}
    >
      {/* SABIT olculerde cizilir, sonra olceklenir. Kapsayici darlasinca icerik
          KUCULUR - akmaz, tasmaz, bozulmaz. */}
      <div
        ref={icRef}
        style={{
          width: REFERANS_GENISLIK,
          transform: `scale(${olcek})`,
          transformOrigin: "top left",
        }}
      >
        <DavetliEkrani
          token=""
          veri={veri}
          onGonderildi={() => {}}
          salt
        />
      </div>
    </div>
  );
}
