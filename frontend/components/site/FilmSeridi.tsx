"use client";

import { useMemo } from "react";

// FILM SERIDI - davetli ekraninin ust bandi.
//
// ONCEKI TASARIMIN HATASI: coklu dilim + zamanlayici. Kareler bazen bir saniye bile
// durmadan degisiyordu; goz neye baktigini anlayamiyordu. Kok neden: her dilim kendi
// setInterval'ini calistiriyordu ve gecis suresi bekleme suresine EKLENIYORDU.
//
// YENI TASARIM: zamanlayici YOK. Tek bir kesintisiz CSS kaydirmasi.
//  - Serit sabit hizda akar (fotograf basina ~5.5 sn) - ritim mutlak, siçrama yok.
//  - Kareler DIZI ikiye kopyalanir; birinci kopya bitince ikinci tam ayni yerde
//    baslar. Boylece dongu DIKISSIZ - kullanici basa donusu goremez.
//  - Perforasyon (film delikleri) ustte ve altta; 35mm negatif nostaljisi.
//  - Her kare kendi cercevesinde, TAM BOYUTTA (object-contain) - kirpma YOK.
//    Davetlinin/ciftin cektigi kadraj bozulmaz.
//  - Fare uzerine gelince serit yavaslar (durur gibi) - inceleme daveti.
//
// Performans: tek transform animasyonu, GPU'da calisir. Zamanlayici, state,
// yeniden render YOK.

type Foto = { url: string; altyazi: string | null; kapak: boolean };

const KARE_SANIYE = 5.5; // her karenin gecis suresi

export function FilmSeridi({ fotograflar, baslik }: { fotograflar: Foto[]; baslik: string }) {
  // Kapak once - seridin ilk karesi cift'in sectigi kare olsun
  const kareler = useMemo(
    () => [...fotograflar].sort((a, b) => Number(b.kapak) - Number(a.kapak)),
    [fotograflar]
  );

  if (kareler.length === 0) return null;

  // Tek fotograf: kaydirmaya gerek yok, sabit vitrin
  if (kareler.length === 1) {
    return (
      <div className="relative bg-[#100c0a]">
        <Perforasyon konum="ust" />
        <div className="flex h-56 items-center justify-center px-3 py-2 sm:h-64">
          <Kare foto={kareler[0]} baslik={baslik} />
        </div>
        <Perforasyon konum="alt" />
      </div>
    );
  }

  // Dikissiz dongu: dizi iki kez basilir, animasyon tam yarida basa doner
  const seri = [...kareler, ...kareler];
  const sure = kareler.length * KARE_SANIYE;

  return (
    <div className="film-seridi relative overflow-hidden bg-[#100c0a]">
      <Perforasyon konum="ust" />

      <div className="relative h-56 overflow-hidden sm:h-64">
        <div
          className="film-akis absolute inset-y-0 left-0 flex items-center gap-3 px-3 py-2"
          style={{ animationDuration: `${sure}s` }}
        >
          {seri.map((f, i) => (
            <Kare key={i} foto={f} baslik={baslik} />
          ))}
        </div>

        {/* Kenar karartmalari - serit sonsuza akiyormus hissi */}
        <div
          className="pointer-events-none absolute inset-y-0 left-0 w-14"
          style={{
            background: "linear-gradient(to right, #100c0a 0%, rgba(16,12,10,0) 100%)",
          }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-y-0 right-0 w-14"
          style={{
            background: "linear-gradient(to left, #100c0a 0%, rgba(16,12,10,0) 100%)",
          }}
          aria-hidden
        />
      </div>

      <Perforasyon konum="alt" />
    </div>
  );
}

// Tek kare - TAM BOYUT (kirpma yok), ince yaldiz hat
function Kare({ foto, baslik }: { foto: Foto; baslik: string }) {
  return (
    <figure className="relative h-full shrink-0">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={foto.url}
        alt={foto.altyazi ?? baslik}
        className="h-full w-auto max-w-none rounded-[2px] object-contain shadow-[0_2px_16px_rgba(0,0,0,0.5)] ring-1 ring-yaldiz/25"
        draggable={false}
      />
      {foto.altyazi && (
        <figcaption className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/75 to-transparent px-2 pb-1.5 pt-6 text-center font-govde text-[0.6rem] text-parsomen/90">
          {foto.altyazi}
        </figcaption>
      )}
    </figure>
  );
}

// 35mm film perforasyonu - nostalji tasiyicisi
function Perforasyon({ konum }: { konum: "ust" | "alt" }) {
  return (
    <div
      className={`flex h-[13px] items-center justify-start gap-[9px] overflow-hidden bg-[#0a0706] px-2 ${
        konum === "ust" ? "border-b border-black/60" : "border-t border-black/60"
      }`}
      aria-hidden
    >
      {Array.from({ length: 40 }).map((_, i) => (
        <span
          key={i}
          className="h-[7px] w-[11px] shrink-0 rounded-[1.5px] bg-[#efe7d5]/85"
        />
      ))}
    </div>
  );
}
