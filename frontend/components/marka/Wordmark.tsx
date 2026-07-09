import { WORDMARK } from "@/lib/marka-yollar";

// BiAniBirak wordmark - 3 hizali SVG path (Fraunces glyphlerinden).
// Path oldugu icin runtime font yuklemesine bagli DEGIL: her yerde birebir ayni.
// yukseklik string olabilir (ornek: "clamp(40px,12vw,88px)") -> responsive sigma.
export function Wordmark({
  yukseklik = 82,
  animasyonlu = false,
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
      className={`inline-flex max-w-full items-end leading-none ${className}`}
      role="img"
      aria-label="BiAnıBırak"
    >
      <svg viewBox={WORDMARK.bi.viewBox} style={st} className="block overflow-visible">
        <path d={WORDMARK.bi.d} fill="#6E2438" />
      </svg>
      <svg
        viewBox={WORDMARK.ani.viewBox}
        style={st}
        className={`block overflow-visible ${animasyonlu ? "marka-ani" : ""}`}
      >
        <path d={WORDMARK.ani.d} fill="#6E2438" />
      </svg>
      <svg viewBox={WORDMARK.birak.viewBox} style={st} className="block overflow-visible">
        <path d={WORDMARK.birak.d} fill="#6E2438" />
      </svg>
    </span>
  );
}
