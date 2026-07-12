import { YasalMetinGorunum } from "@/components/site/YasalMetinGorunum";

// Davetli KVKK - AYRI metin. Davetli bir sozlesme tarafi degil, KONUKTUR:
// ondan kullanim kosullarini kabul etmesi istenmez. Isi 2 dakika surer; once
// 9 maddelik sozlesme okutmak surtunmedir.
export const metadata = { title: "KVKK Aydınlatma Metni (Davetli)" };

export default function KvkkDavetliSayfasi() {
  return <YasalMetinGorunum anahtar="kvkk_davetli" />;
}
