import { MARKA } from "@/lib/marka";

// Marka kilidi - instruction Bolum 2 katmanli kullanim.
//  tam      : wordmark + tagline (yalniz marka anlari: hero, footer, kapak, cikti)
//  wordmark : yalniz logotype (yogun/fonksiyonel UI: nav, header)
//  ikon     : monogram (cok dar alan)
type Varyant = "tam" | "wordmark" | "ikon";

const boyutlar = {
  kucuk: { wordmark: "text-2xl", tagline: "text-[0.7rem]", ikon: "h-8 w-8" },
  orta: { wordmark: "text-4xl", tagline: "text-xs", ikon: "h-10 w-10" },
  buyuk: {
    wordmark: "text-6xl sm:text-7xl",
    tagline: "text-sm",
    ikon: "h-14 w-14",
  },
} as const;

export function MarkaKilidi({
  varyant = "tam",
  boyut = "orta",
  className = "",
}: {
  varyant?: Varyant;
  boyut?: keyof typeof boyutlar;
  className?: string;
}) {
  const b = boyutlar[boyut];

  if (varyant === "ikon") {
    return (
      <span
        className={`inline-flex ${b.ikon} items-center justify-center rounded-lg bg-sarap ${className}`}
        aria-label={MARKA.yasalAd}
      >
        <span className="font-display italic text-yaldizAcik">B</span>
      </span>
    );
  }

  const Wordmark = (
    <span
      className={`font-display font-medium leading-none tracking-tight text-murekkep ${b.wordmark}`}
    >
      {MARKA.wordmarkParcalar.map((parca, i) => (
        <span key={parca}>
          {i > 0 ? " " : ""}
          {parca === "Bi" ? <span className="text-sarap">{parca}</span> : parca}
        </span>
      ))}
    </span>
  );

  if (varyant === "wordmark") {
    return (
      <span className={`inline-flex items-baseline ${className}`}>
        {Wordmark}
      </span>
    );
  }

  // varyant === "tam"
  return (
    <span className={`inline-flex flex-col items-center ${className}`}>
      {Wordmark}
      <span
        className={`mt-3 font-govde uppercase tracking-etiket text-ikincil ${b.tagline}`}
      >
        {MARKA.tagline}
      </span>
    </span>
  );
}
