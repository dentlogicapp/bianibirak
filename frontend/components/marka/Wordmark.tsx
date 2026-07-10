import { WORDMARK } from "@/lib/marka-yollar";

// BiAniBirak wordmark - 3 hizali SVG path (Fraunces glyphlerinden).
// Renkler CSS degiskenli (koyu modda sarimsi). "Ani" HER ZAMAN animasyonlu:
// acik modda sarap<->yaldiz gecisli, koyu modda sarimsi(yaldiz)<->sarap gecisli.
export function Wordmark({
  yukseklik = 82,
  animasyonlu = true,
  className = "",
}: {
  yukseklik?: number | string;
  animasyonlu?: boolean;
  className?: string;
}) {
  const h = typeof yukseklik === "number" ? `${yukseklik}px` : yukseklik;
  const st = { height: h, width: "auto" as const };
  return (
    <span
      className={`marka-wordmark inline-flex max-w-full items-end leading-none ${className}`}
      role="img"
      aria-label="BiAnıBırak"
    >
      <svg viewBox={WORDMARK.bi.viewBox} style={st} className="marka-bi block overflow-visible">
        <path d={WORDMARK.bi.d} />
      </svg>
      <svg
        viewBox={WORDMARK.ani.viewBox}
        style={st}
        className={`block overflow-visible ${animasyonlu ? "marka-ani" : "marka-ani-statik"}`}
      >
        <path d={WORDMARK.ani.d} />
      </svg>
      <svg viewBox={WORDMARK.birak.viewBox} style={st} className="marka-birak block overflow-visible">
        <path d={WORDMARK.birak.d} />
      </svg>
    </span>
  );
}
