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

// TURKCE IYELIK EKI - "Musa'nin", "Aysegul'un", "Zeynep'in"
//
// Kural: son UNLU harfe gore ek secilir (buyuk unlu uyumu).
//   a, i(noktasiz) -> in    |  e, i -> in   |  o, u -> un   |  o(noktali), u(noktali) -> un
// Ad UNLU ile bitiyorsa araya kaynastirma "n" girer: Musa -> Musa'nin
// Kesme isareti ozel adlarda zorunludur (TDK).
export function iyelikEki(ad: string): string {
  const temiz = (ad ?? "").trim();
  if (temiz.length === 0) return "";

  const unluler = "aeıioöuüAEIİOÖUÜ";
  const kucuk = temiz.toLocaleLowerCase("tr-TR");

  // Sondan ilk unluyu bul
  let sonUnlu = "";
  for (let i = kucuk.length - 1; i >= 0; i--) {
    if (unluler.includes(kucuk[i])) {
      sonUnlu = kucuk[i];
      break;
    }
  }

  // Buyuk unlu uyumu: son unlu eki belirler
  let ek = "ın";
  if (sonUnlu === "e" || sonUnlu === "i") ek = "in";
  else if (sonUnlu === "o" || sonUnlu === "u") ek = "un";
  else if (sonUnlu === "ö" || sonUnlu === "ü") ek = "ün";

  // Ad unlu ile bitiyorsa kaynastirma "n"
  const sonHarf = kucuk[kucuk.length - 1];
  const kaynastirma = unluler.includes(sonHarf) ? "n" : "";

  return `${temiz}'${kaynastirma}${ek}`;
}

// "Musa ile" / "Aysegul ile" - yalin hal (ek gerektirmeyen kaliplarda)
export function ileKalibi(ad: string): string {
  return `${(ad ?? "").trim()} ile`;
}
