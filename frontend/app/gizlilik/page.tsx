import { YasalMetinGorunum } from "@/components/site/YasalMetinGorunum";

// Gizlilik Politikasi - icerik DB'den (sistem_metinleri, anahtar: gizlilik).
export const metadata = { title: "Gizlilik Politikası" };

export default function GizlilikSayfasi() {
  return <YasalMetinGorunum anahtar="gizlilik" />;
}
