// Kaynak es etiketi: "1. es"/"2. es" demode; yerine "Aysegul'un yakini" gibi.
// es1 -> es1 adinin yakini, es2 -> es2 adinin yakini.
export function esYakiniEtiketi(kaynakEs: string, es1Ad: string, es2Ad: string): string {
  const ad = kaynakEs === "es1" ? es1Ad : es2Ad;
  return `${ad} tarafının yakını`;
}

// Kisa hali (kart rozeti): "Ayseg. tarafi"
export function esTarafiKisa(kaynakEs: string, es1Ad: string, es2Ad: string): string {
  const ad = kaynakEs === "es1" ? es1Ad : es2Ad;
  return `${ad} tarafı`;
}
