// Varsayilan degerler - backend Sabitler.cs ile tutarli tutulur (tek kaynak ilkesi).
// "Varsayilana don" affordance bu degeri kullanir.
export const VARSAYILAN = {
  karsilamaMetni:
    "Bu ozel gunumuzde bize bir ani birakir misin? Dilegin, defterimizde sonsuza dek yasayacak.",
  promptMetni: "Bize bir dilek, bir ani ya da bir tavsiye birak.",
  kapanisPencereGun: 30,
  minKapanisPencereGun: 30,
  maxKapanisPencereGun: 365,
} as const;
