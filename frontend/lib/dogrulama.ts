// GIRDI DOGRULAMA - davetli formu.
//
// FELSEFE: davetliyi bogmayiz ama COPU de deftere basmayiz. Bir isim yillar sonra
// okunacak; "a", "123", ":)" gibi girdiler eseri bozar.

// AD SOYAD
// - En az iki kelime (ad + soyad) - tek harf/kelime kabul edilmez
// - Rakam, emoji, sembol YASAK
// - Her parca en az 2 harf
export function adDogrula(ham: string): string | null {
  const ad = (ham ?? "").trim().replace(/\s+/g, " ");

  if (ad.length < 3) return "Adını ve soyadını yazar mısın?";

  // Rakam
  if (/\d/.test(ad)) return "Adında rakam olamaz.";

  // Yalnizca harf, bosluk, kesme, tire (emoji/sembol elenir)
  if (!/^[\p{L}\s'’-]+$/u.test(ad)) {
    return "Adında yalnızca harf kullanabilirsin.";
  }

  const parcalar = ad.split(" ").filter((p) => p.length > 0);
  if (parcalar.length < 2) return "Soyadını da ekler misin?";

  // Her parca anlamli uzunlukta olmali ("A B" kabul edilmez)
  if (parcalar.some((p) => p.replace(/['’-]/g, "").length < 2)) {
    return "Ad ve soyadın en az iki harften oluşmalı.";
  }

  if (ad.length > 60) return "Ad çok uzun.";

  // Ayni harfin tekrari ("aaaa bbbb")
  if (parcalar.some((p) => /^(.)\1+$/u.test(p))) {
    return "Gerçek adını yazar mısın?";
  }

  return null;
}

// Ad-soyadi duzgun bicimle: "MUSA deveci" -> "Musa Deveci"
export function adBicimle(ham: string): string {
  return (ham ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((p) =>
      p.length === 0
        ? p
        : p.charAt(0).toLocaleUpperCase("tr-TR") +
          p.slice(1).toLocaleLowerCase("tr-TR")
    )
    .join(" ");
}

// TELEFON - Turkiye cep: 05XX XXX XX XX (11 hane)
// Cift, davetliye ulasmak isteyebilir (duzeltme ricasi); numara GERCEK olmali.
export function telefonRakamlari(ham: string): string {
  return (ham ?? "").replace(/\D/g, "");
}

export function telefonDogrula(ham: string): string | null {
  let r = telefonRakamlari(ham);

  // +90 / 90 onekini duser
  if (r.length === 12 && r.startsWith("90")) r = r.slice(2);
  if (r.length === 10 && r.startsWith("5")) r = "0" + r;

  if (r.length === 0) return "Telefon numaranı yazar mısın?";
  if (!r.startsWith("05")) return "Numara 05 ile başlamalı (örn. 0532 123 45 67).";
  if (r.length !== 11) return `Numara 11 haneli olmalı (şu an ${r.length} hane).`;

  return null;
}

// Gorunum bicimi: "0532 123 45 67"
export function telefonBicimle(ham: string): string {
  let r = telefonRakamlari(ham);
  if (r.length === 12 && r.startsWith("90")) r = r.slice(2);
  if (r.length === 10 && r.startsWith("5")) r = "0" + r;
  r = r.slice(0, 11);

  const p: string[] = [];
  if (r.length > 0) p.push(r.slice(0, 4));
  if (r.length > 4) p.push(r.slice(4, 7));
  if (r.length > 7) p.push(r.slice(7, 9));
  if (r.length > 9) p.push(r.slice(9, 11));
  return p.join(" ");
}

// Normalize (backend'e giden hal): 05321234567
export function telefonNormalize(ham: string): string {
  let r = telefonRakamlari(ham);
  if (r.length === 12 && r.startsWith("90")) r = r.slice(2);
  if (r.length === 10 && r.startsWith("5")) r = "0" + r;
  return r.slice(0, 11);
}

// E-POSTA - ARTIK OPSIYONEL (Musa karari). Yazildiysa gecerli olmali.
export function epostaDogrula(ham: string): string | null {
  const e = (ham ?? "").trim();
  if (e.length === 0) return null; // bos birakilabilir

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e)) {
    return "Geçerli bir e-posta yaz ya da boş bırak.";
  }
  return null;
}
