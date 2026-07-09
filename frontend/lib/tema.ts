"use client";

import { useEffect, useState } from "react";

export type Tema = "acik" | "koyu";
const ANAHTAR = "bianibirak-tema";
const VARSAYILAN: Tema = "acik";

// Temayi html elementine uygula (dark class ekle/cikar).
function temayiUygula(tema: Tema) {
  if (typeof document === "undefined") return;
  const html = document.documentElement;
  if (tema === "koyu") html.classList.add("dark");
  else html.classList.remove("dark");
}

// Temayi oku (localStorage veya varsayilan).
function temayiOku(): Tema {
  if (typeof window === "undefined") return VARSAYILAN;
  try {
    const v = window.localStorage.getItem(ANAHTAR);
    if (v === "koyu") return "koyu";
    if (v === "acik") return "acik";
  } catch {
    /* localStorage erisimi yoksa varsayilan */
  }
  return VARSAYILAN;
}

// Temayi kaydet + uygula.
function temayiKaydet(tema: Tema) {
  try {
    window.localStorage.setItem(ANAHTAR, tema);
  } catch {
    /* sessiz gec */
  }
  temayiUygula(tema);
}

// useTema hook - toggle icin.
export function useTema(): [Tema, () => void] {
  const [tema, setTemaState] = useState<Tema>(VARSAYILAN);

  useEffect(() => {
    const baslangic = temayiOku();
    setTemaState(baslangic);
    temayiUygula(baslangic);
  }, []);

  const tersle = () => {
    const yeni: Tema = tema === "acik" ? "koyu" : "acik";
    setTemaState(yeni);
    temayiKaydet(yeni);
  };

  return [tema, tersle];
}

// SSR flash-onleme: layout head'ine inline gomulur; CSS'ten once html.dark ayarlar.
export const TEMA_INLINE_SCRIPT = `
(function(){
  try {
    var t = localStorage.getItem('${ANAHTAR}');
    if (t === 'koyu') document.documentElement.classList.add('dark');
  } catch(e) {}
})();
`;
