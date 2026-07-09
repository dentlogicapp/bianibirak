import { WORDMARK } from "@/lib/marka-yollar";

// BiAniBirak wordmark - 3 hizali SVG path (Fraunces glyphlerinden).
// Path oldugu icin runtime font yuklemesine bagli DEGIL: her yerde birebir ayni.
// animasyonlu=true iken "Ani" zipla+scale+bukelemun renk animasyonu calisir.
export function Wordmark({
  yukseklik = 82,
  animasyonlu = false,
  className = "",
}: {
  yukseklik?: number;
  animasyonlu?: boolean;
  className?: string;
}) {
  const h = { height: yukseklik, width: "auto" as const };
  return (
    <span
      className={`inline-flex items-end leading-none ${className}`}
      role="img"
      aria-label="BiAnıBırak"
    >
      <svg viewBox={WORDMARK.bi.viewBox} style={h} className="block overflow-visible">
        <path d={WORDMARK.bi.d} fill="#6E2438" />
      </svg>
      <svg
        viewBox={WORDMARK.ani.viewBox}
        style={h}
        className={`block overflow-visible ${animasyonlu ? "marka-ani" : ""}`}
      >
        <path d={WORDMARK.ani.d} fill="#6E2438" />
      </svg>
      <svg viewBox={WORDMARK.birak.viewBox} style={h} className="block overflow-visible">
        <path d={WORDMARK.birak.d} fill="#6E2438" />
      </svg>
    </span>
  );
}
