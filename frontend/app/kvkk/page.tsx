import { YasalMetinGorunum } from "@/components/site/YasalMetinGorunum";

// KVKK Aydinlatma Metni - icerik DB'den gelir (sistem_metinleri).
// Hardcoded metin YASAK: kullanicinin okudugu ile onayladigi metin ayni olmali.
export const metadata = { title: "KVKK Aydınlatma Metni" };

export default function KvkkSayfasi() {
  return <YasalMetinGorunum anahtar="kvkk_aydinlatma" />;
}
