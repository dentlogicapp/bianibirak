"use client";

import { useEffect, useRef, useState } from "react";

type Dilek = { d: string; viewBox: string; aspect: number };

// Hero'da tagline ile yaldiz cizgi arasinda: 20 iyi-niyet dilegini sirayla,
// kalem soldan saga yazar gibi (reveal + kalem), sonsuz donguyle gosterir.
// Dilekler path olarak public/veri/dilekler.json'dan yuklenir (bundle sismez).
export function DilekAkisi() {
  const [dilekler, setDilekler] = useState<Dilek[]>([]);
  const [i, setI] = useState(0);
  const reduced = useRef(false);

  useEffect(() => {
    reduced.current =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let iptal = false;
    fetch("/veri/dilekler.json")
      .then((r) => r.json())
      .then((d: Dilek[]) => {
        if (!iptal) setDilekler(d);
      })
      .catch(() => {});
    return () => {
      iptal = true;
    };
  }, []);

  const H = 40;
  const MAXW = 680;
  const aktif = dilekler[i];
  let w = 0,
    h = H,
    sure = 2600;
  if (aktif) {
    w = Math.round(H * aktif.aspect);
    if (w > MAXW) {
      w = MAXW;
      h = Math.round(w / aktif.aspect);
    }
    const yazMs = Math.min(3200, Math.max(1800, w * 3.4));
    sure = Math.round(yazMs / 0.58);
  }

  useEffect(() => {
    if (!dilekler.length) return;
    const bekle = reduced.current ? 3600 : sure + 450;
    const t = window.setTimeout(
      () => setI((p) => (p + 1) % dilekler.length),
      bekle
    );
    return () => clearTimeout(t);
  }, [i, dilekler, sure]);

  return (
    <div className="flex min-h-[56px] items-center justify-center">
      {aktif && (
        <div
          key={i}
          className="dilek-sar yaz"
          style={
            {
              "--tw": `${w}px`,
              "--sure": `${sure}ms`,
            } as React.CSSProperties
          }
        >
          <div className="dilek-wrap">
            <svg
              className="dilek-wm"
              viewBox={aktif.viewBox}
              style={{ width: w, height: h }}
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d={aktif.d} />
            </svg>
          </div>
          <span className="dilek-kalem" aria-hidden="true">
            <svg viewBox="0 0 32 46" xmlns="http://www.w3.org/2000/svg">
              <g transform="rotate(38 16 23)">
                <path
                  d="M16 4 L21.5 29 L16 37 L10.5 29 Z"
                  fill="#C4A25E"
                  stroke="#8A6B33"
                  strokeWidth="0.9"
                />
                <line x1="16" y1="12" x2="16" y2="31" stroke="#8A6B33" strokeWidth="1" />
                <circle cx="16" cy="22" r="1.8" fill="#6E2438" />
                <path d="M14 2.4 H18 L17 5.4 H15 Z" fill="#211A17" />
              </g>
            </svg>
          </span>
        </div>
      )}
    </div>
  );
}
