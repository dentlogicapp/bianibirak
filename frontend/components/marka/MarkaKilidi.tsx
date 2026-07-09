import { IKON } from "@/lib/marka-yollar";
import { MARKA } from "@/lib/marka";
import { Wordmark } from "@/components/marka/Wordmark";

// Marka kilidi - instruction Bolum 2 katmanli kullanim.
//  tam      : wordmark + tagline (marka anlari)
//  wordmark : yalniz wordmark (fonksiyonel UI)
//  ikon     : monogram Bi/Ani (dar alan)
type Varyant = "tam" | "wordmark" | "ikon";

const wmYukseklik = {
  kucuk: "clamp(20px, 6vw, 28px)",
  orta: "clamp(30px, 8vw, 44px)",
  buyuk: "clamp(40px, 12vw, 88px)",
} as const;
const taglineBoyut = { kucuk: "text-[0.7rem]", orta: "text-xs", buyuk: "text-sm" } as const;
const ikonKutu = { kucuk: "h-9 w-9 rounded-lg", orta: "h-12 w-12 rounded-xl", buyuk: "h-16 w-16 rounded-2xl" } as const;

export function MarkaKilidi({
  varyant = "tam",
  boyut = "orta",
  animasyonlu = false,
  className = "",
}: {
  varyant?: Varyant;
  boyut?: keyof typeof wmYukseklik;
  animasyonlu?: boolean;
  className?: string;
}) {
  if (varyant === "ikon") {
    return (
      <span
        className={`inline-flex ${ikonKutu[boyut]} flex-col items-center justify-center bg-sarap ${className}`}
        role="img"
        aria-label={MARKA.yasalAd}
      >
        <svg viewBox={IKON.bi.viewBox} className="h-[26%] w-auto">
          <path d={IKON.bi.d} fill="#C4A25E" />
        </svg>
        <svg viewBox={IKON.ani.viewBox} className="h-[22%] w-auto">
          <path d={IKON.ani.d} fill="#C4A25E" />
        </svg>
      </span>
    );
  }

  if (varyant === "wordmark") {
    return <Wordmark yukseklik={wmYukseklik[boyut]} animasyonlu={animasyonlu} className={className} />;
  }

  // tam
  return (
    <span className={`inline-flex flex-col items-center ${className}`}>
      <Wordmark yukseklik={wmYukseklik[boyut]} animasyonlu={animasyonlu} />
      <span className={`mt-3 font-govde uppercase tracking-etiket text-ikincil ${taglineBoyut[boyut]}`}>
        {MARKA.tagline}
      </span>
    </span>
  );
}
