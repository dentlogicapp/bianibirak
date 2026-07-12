import { YasalMetinGorunum } from "@/components/site/YasalMetinGorunum";

// Kullanim Kosullari - icerik DB'den gelir (sistem_metinleri).
// Kayit aninda ZORUNLU onay; onay kaydinda bu metnin hash'i saklanir.
export const metadata = { title: "Kullanım Koşulları" };

export default function KosullarSayfasi() {
  return <YasalMetinGorunum anahtar="kullanim_kosullari" />;
}
