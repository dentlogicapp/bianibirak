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
// OLCEK MANTIGI:
//   Icerik HER ZAMAN 390px (referans telefon) genisliginde cizilir; sonra kapsayiciya
//   ORANLA olceklenir. Dizgi bu yuzden hicbir zaman "akmaz" - yalniz buyur/kucul.
//   Fotograf sayisi, metin uzunlugu, tema: hicbiri olcegi degistiremez. Yatay tasma
//   MATEMATIKSEL olarak imkansizdir.
//
//   Dar ekran (mobil/PWA) -> olcek 1'in altina duser, icerik kucultulur.
//   Genis ekran (web)     -> olcek 1'in ustune cikar, onizleme sutunu DOLDURUR.
//                            (Tavan olmasa tipografi kabalasir; 1.55 dengeli sinir.)
//
// Cerceve: telefon maketi YOK. Sade kagit yuzeyi, ince kenarlik. Onizleme burada
// ICERIGIN kendisidir; suslu bir kutunun icinde degil.

const REFERANS_GENISLIK = 390;
const AZAMI_OLCEK = 1.55;

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
      if (g > 0) setOlcek(Math.min(g / REFERANS_GENISLIK, AZAMI_OLCEK));
    }

    olc();
    const g = new ResizeObserver(olc);
    g.observe(kap);
    return () => g.disconnect();
  }, []);

  // Olceklenmis yukseklik disariya YANSITILIR; yoksa kapsayici olceklenmemis
  // yuksekligi ayirir ve altta kocaman bir bosluk kalir.
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
      <div
        ref={icRef}
        style={{
          width: REFERANS_GENISLIK,
          transform: `scale(${olcek})`,
          transformOrigin: "top left",
        }}
      >
        <DavetliEkrani token="" veri={veri} onGonderildi={() => {}} salt />
      </div>
    </div>
  );
}
