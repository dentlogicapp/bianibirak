"use client";

import { useEffect, useState } from "react";
import { FilmSeridi } from "@/components/site/FilmSeridi";

// DAVETLI KARSILAMA - davetlinin bagLantiyi actiginda gordugu ILK sey.
//
// TEK DOGRULUK KAYNAGI: hem gercek davetli ekrani (/k/{token}) hem panel'deki
// canli onizleme (/panel/duzenle) BU bilesenden beslenir. Onceki surumde
// onizleme, gercek ekrani "taklit eden" ayri bir dizgiydi - film seridi yoktu,
// tipografi farkliydi. Cift, gonderdigi linkin nasil gorunecegini YANLIS
// biliyordu. Iki dizgi kacinilmaz olarak ayrisir; tek bilesen ayrisamaz.

export type KarsilamaGorseli = {
  url: string;
  kapak: boolean;
  genislik: number;
  yukseklik: number;
};

export function DavetliKarsilama({
  ciftAdi,
  karsilama,
  promptMetni,
  gorseller,
  sayacAktif,
  etkinlikTarihi,
  sayacAktifCumle,
  sayacBittiCumle,
}: {
  ciftAdi: string;
  karsilama: string;
  promptMetni: string | null;
  gorseller: KarsilamaGorseli[];
  sayacAktif: boolean;
  etkinlikTarihi: string;
  sayacAktifCumle: string | null;
  sayacBittiCumle: string | null;
}) {
  return (
    <>
      {/* CIFT GORSELLERI: davetli cift'i gorur -> duygusal bag -> daha icten dilek.
          TUM fotograflar dongude; sabit sergi degil, nefes alan bir vitrin. */}
      <FilmSeridi fotograflar={gorseller} baslik={ciftAdi} />

      <div className="px-8 pb-8 pt-9 text-center">
        {/* CIFT ADI - ekranin ODAK NOKTASI. Davetli buraya bakip "dogru yerdeyim" der. */}
        <h1 className="font-display text-[2rem] leading-[1.15] text-sarap sm:text-[2.4rem]">
          {ciftAdi}
        </h1>

        {/* Yaldiz ayrac - baslik ile metni ayirir, toren hissi verir */}
        <div className="mx-auto mt-4 flex w-fit items-center gap-2" aria-hidden>
          <span className="h-px w-9 bg-yaldiz/70" />
          <span className="h-1 w-1 rotate-45 bg-yaldiz" />
          <span className="h-px w-9 bg-yaldiz/70" />
        </div>

        <p className="metin-yasli mx-auto mt-5 max-w-sm font-govde text-[0.95rem] leading-relaxed text-murekkep">
          {karsilama}
        </p>

        {sayacAktif && (
          <DavetliSayac
            hedef={etkinlikTarihi}
            aktifCumle={sayacAktifCumle}
            bittiCumle={sayacBittiCumle}
          />
        )}

        {/* PROMPT - sayacin ALTINDA, ortali. Davetliye ne yapacagini soyleyen
            son cumle; forma koprudur. */}
        {promptMetni && (
          <p className="mx-auto mt-7 max-w-sm text-center font-display text-base italic leading-snug text-sarap">
            {promptMetni}
          </p>
        )}
      </div>
    </>
  );
}

export function DavetliSayac({
  hedef,
  aktifCumle,
  bittiCumle,
}: {
  hedef: string;
  aktifCumle: string | null;
  bittiCumle: string | null;
}) {
  const [sk, setSk] = useState(() => hesapla(hedef));

  useEffect(() => {
    setSk(hesapla(hedef));
    const i = setInterval(() => setSk(hesapla(hedef)), 1000);
    return () => clearInterval(i);
  }, [hedef]);

  const cumle = sk.gecti
    ? bittiCumle || "Hedef tarihe ulaşıldı"
    : aktifCumle || "Etkinliğe kalan süre";

  return (
    <div className="mt-5 rounded-2xl border border-ayrac bg-parsomen px-5 py-4 text-center">
      <p className="font-govde text-xs uppercase tracking-etiket text-ikincil">{cumle}</p>
      <div className="mt-3 flex items-end justify-center gap-3">
        <SayacRakam d={sk.gun} e="gün" vurgu />
        <SayacRakam d={sk.sa} e="saat" />
        <SayacRakam d={sk.dk} e="dk" />
        <SayacRakam d={sk.sn} e="sn" />
      </div>
    </div>
  );
}

function SayacRakam({ d, e, vurgu }: { d: number; e: string; vurgu?: boolean }) {
  return (
    <span className="inline-flex flex-col items-center">
      <span
        className={
          vurgu
            ? "font-display text-2xl leading-none text-sarap"
            : "font-display text-lg leading-none text-murekkep"
        }
      >
        {d.toString().padStart(2, "0")}
      </span>
      <span className="mt-1 font-govde text-[0.55rem] uppercase tracking-etiket text-ikincil">
        {e}
      </span>
    </span>
  );
}

function hesapla(hedefIso: string) {
  const hedef = new Date(hedefIso).getTime();
  if (isNaN(hedef)) return { gecti: false, gun: 0, sa: 0, dk: 0, sn: 0 };
  const fark = hedef - Date.now();
  const mutlak = Math.abs(fark);
  return {
    gecti: fark < 0,
    gun: Math.floor(mutlak / 86400000),
    sa: Math.floor((mutlak % 86400000) / 3600000),
    dk: Math.floor((mutlak % 3600000) / 60000),
    sn: Math.floor((mutlak % 60000) / 1000),
  };
}
