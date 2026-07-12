"use client";

import { useMemo } from "react";

// FILM SERIDI - davetli ekraninin ust bandi.
//
// MOBIL BUG'IN KOK NEDENI (cozuldu): kareler `h-full w-auto` idi; genislikleri ancak
// fotograf YUKLENDIKTEN sonra belli oluyordu. Serit genisligi baslangicta ~0 olunca
// `translate(-50%)` de ~0 kayiyor, sonra fotograflar yuklenince layout siciriyordu.
// Mobilde yukleme yavas oldugu icin serit ortada olup siyah ekran kaliyordu.
//
// COZUM: her karenin oranini ONCEDEN biliyoruz (backend olcuyu gonderiyor).
// `aspect-ratio` ile kutu, fotograf hic yuklenmeden dogru genisligi alir -> layout
// stabil, animasyon ilk kareden itibaren dogru. Fotograf sonra gelip yerine oturur.
//
// RENK: siyah cok baskindi ve sayfayi kesiyordu. Artik tema degiskenlerine bagli
// SICAK KOYU bir zemin (var(--film)) - acik temada koyu kahve, koyu temada daha
// derin. Sayfayla ayni ailedendir, yabanci durmaz.

type Foto = {
  url: string;
  kapak: boolean;
  genislik: number;
  yukseklik: number;
};

const KARE_SANIYE = 5.5;
const VARSAYILAN_ORAN = 3 / 2; // olcu yoksa guvenli varsayilan

export function FilmSeridi({ fotograflar, baslik }: { fotograflar: Foto[]; baslik: string }) {
  const kareler = useMemo(
    () => [...fotograflar].sort((a, b) => Number(b.kapak) - Number(a.kapak)),
    [fotograflar]
  );

  if (kareler.length === 0) return null;

  // Tek fotograf: kaydirma yok, sabit vitrin
  if (kareler.length === 1) {
    return (
      <div className="relative bg-film">
        <Perforasyon />
        <div className="flex h-52 items-center justify-center sm:h-60">
          <Kare foto={kareler[0]} baslik={baslik} />
        </div>
        <Perforasyon />
      </div>
    );
  }

  // Dikissiz dongu: dizi iki kez basilir, animasyon tam yarida basa doner
  const seri = [...kareler, ...kareler];
  const sure = kareler.length * KARE_SANIYE;

  return (
    <div className="film-seridi relative overflow-hidden bg-film">
      <Perforasyon />

      <div className="relative h-52 overflow-hidden sm:h-60">
        <div
          className="film-akis flex h-full w-max items-stretch"
          style={{ animationDuration: `${sure}s` }}
        >
          {seri.map((f, i) => (
            <Kare key={i} foto={f} baslik={baslik} />
          ))}
        </div>

        {/* Kenar erimeleri - serit sonsuza akiyormus hissi */}
        <div className="film-kenar-sol pointer-events-none absolute inset-y-0 left-0 w-12" aria-hidden />
        <div className="film-kenar-sag pointer-events-none absolute inset-y-0 right-0 w-12" aria-hidden />
      </div>

      <Perforasyon />
    </div>
  );
}

// Tek kare.
// - aspect-ratio: fotograf yuklenmeden GENISLIK bilinir (mobil bug'in cozumu)
// - object-contain: kirpma YOK, kadraj korunur
// - cerceve: sicak yaldiz hat (onceki surumde Tailwind ring varsayilanina dusup
//   MAVI ciziyordu - CSS degiskenli renklerde opacity modifier calismaz)
function Kare({ foto, baslik }: { foto: Foto; baslik: string }) {
  const hamOran =
    foto.genislik > 0 && foto.yukseklik > 0
      ? foto.genislik / foto.yukseklik
      : VARSAYILAN_ORAN;

  // YATAY/DIKEY DENGESI - KIRPMA SIFIR.
  //
  // ONCEKI HATA: oran 0.72-1.62 araligina sikistiriliyordu. Modern telefon dikey
  // fotografi 9:16'dir (oran 0.5625) ve bu alt sinira carpip 0.72'ye ZORLANIYORDU:
  // kutu fotograftan genis kaliyor, object-cover fotografi buyutup merkezden
  // kirpiyor -> yakin cekim portrelerde KAFA KESILIYORDU. (Yatay ve uzak-dikey
  // fotograflar sinirin ustunde kaldigi icin sorunsuz gorunuyordu.)
  //
  // COZUM: kutu, fotografin GERCEK oranini alir. Kutu orani = fotograf orani
  // oldugunda object-cover'in kirpacak hicbir sey kalmaz - kayip MATEMATIKSEL
  // OLARAK sifir. Dikey kare dar olur; olsun. Gercek bir film seridinde de
  // farkli formatlar yan yana durur - kirpilmis bir yuz, dar bir kareden bin kat
  // kotudur.
  //
  // Tek sinir ustte: asiri panorama (oran > 2.4) seridi bozar. O nadir durumda
  // merkez kirpma yapilir; panoramada bu zararsizdir (yuz merkezdedir).
  const oran = Math.min(hamOran, 2.4);

  return (
    <div
      className="film-kare relative h-full shrink-0"
      style={{ aspectRatio: `${oran}` }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={foto.url}
        alt={baslik}
        loading="eager"
        className="h-full w-full object-cover"
        // Kirpma gerekirse (yalniz asiri panoramada) UST kisim korunur:
        // portrelerde yuz ust yaridadir.
        style={{ objectPosition: "center 32%" }}
        draggable={false}
      />
    </div>
  );
}

// 35mm perforasyon - nostalji tasiyicisi. Delikler zeminden BIR TIK acik;
// sert beyaz degil (goz tirmalamaz).
function Perforasyon() {
  return (
    <div className="film-perforasyon flex h-3 items-center gap-[9px] overflow-hidden px-2" aria-hidden>
      {Array.from({ length: 44 }).map((_, i) => (
        <span key={i} className="film-delik h-[6px] w-[10px] shrink-0 rounded-[1.5px]" />
      ))}
    </div>
  );
}
