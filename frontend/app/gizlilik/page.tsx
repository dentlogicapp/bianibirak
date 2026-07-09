import Link from "next/link";
import { MarkaKilidi } from "@/components/marka/MarkaKilidi";

// Gizlilik Politikasi - placeholder. Nihai icerik avukat/DPO onayindan gecer (Belge 08).
export const metadata = { title: "Gizlilik Politikası" };

export default function GizlilikSayfasi() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <Link href="/giris" aria-label="Geri">
        <MarkaKilidi varyant="wordmark" boyut="kucuk" />
      </Link>
      <h1 className="mt-10 font-display text-3xl text-murekkep">Gizlilik Politikası</h1>
      <div className="mt-6 space-y-4 font-govde text-sm leading-relaxed text-ikincil">
        <p>
          Gizliliğiniz bizim için esastır. Verilerinizi en az veri ilkesiyle toplar, en
          kısa süre saklar ve yalnızca açık amaç için kullanırız.
        </p>
        <p>
          Ödeme verileriniz lisanslı sağlayıcıda tutulur; kart bilgileriniz bizde
          saklanmaz. Aktarımda ve depolamada şifreleme uygulanır.
        </p>
        <p className="text-xs italic">
          Bu metnin nihai hukuki içeriği yürürlüğe girmeden önce güncellenecektir.
        </p>
      </div>
    </main>
  );
}
