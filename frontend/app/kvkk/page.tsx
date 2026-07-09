import Link from "next/link";
import { MarkaKilidi } from "@/components/marka/MarkaKilidi";

// KVKK Aydinlatma Metni - placeholder. Nihai icerik avukat/DPO onayindan gecer (Belge 08).
export const metadata = { title: "KVKK Aydınlatma Metni" };

export default function KvkkSayfasi() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <Link href="/giris" aria-label="Geri">
        <MarkaKilidi varyant="wordmark" boyut="kucuk" />
      </Link>
      <h1 className="mt-10 font-display text-3xl text-murekkep">KVKK Aydınlatma Metni</h1>
      <div className="mt-6 space-y-4 font-govde text-sm leading-relaxed text-ikincil">
        <p>
          BiAnıBırak olarak kişisel verilerinizin güvenliğine önem veriyoruz. Bu metin,
          6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında hangi verilerinizi,
          hangi amaçla işlediğimizi açıklar.
        </p>
        <p>
          Toplanan veriler yalnızca etkinlik amacıyla (dilek toplama, kürasyon, iletişim)
          işlenir; amaç dışı kullanılmaz. Verileriniz saklama süresi sonunda kalıcı olarak
          silinir. Erişim, düzeltme ve silme haklarınız için bizimle iletişime
          geçebilirsiniz.
        </p>
        <p className="text-xs italic">
          Bu metnin nihai hukuki içeriği yürürlüğe girmeden önce güncellenecektir.
        </p>
      </div>
    </main>
  );
}
