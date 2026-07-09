import type { Metadata } from "next";
import Link from "next/link";
import { Ustbar } from "@/components/site/Ustbar";
import { Altbilgi } from "@/components/site/Altbilgi";
import { MarkaKilidi } from "@/components/marka/MarkaKilidi";

export const metadata: Metadata = {
  title: "Örnek Anı Defteri",
  description: "Salt-okunur örnek anı defteri önizlemesi.",
};

// 0A: STATIK, salt-okunur "ornek defter kalitesi" yer tutucu.
const ornekDilekler = [
  {
    ad: "Ayşe Yıldız",
    taraf: "Gelinin tarafı",
    mesaj:
      "İlk tanıştığınız günü hatırlıyorum. O günden beri yüzünüzdeki gülümseme hiç eksilmedi. Bir ömür böyle kalın.",
  },
  {
    ad: "Mehmet Demir",
    taraf: "Damadın tarafı",
    mesaj:
      "Kardeşim, seni bu kadar mutlu görmek dünyaya bedel. İyi ki varsınız, iyi ki birbirinizi buldunuz.",
  },
  {
    ad: "Zeynep Kaya",
    taraf: "Gelinin tarafı",
    mesaj:
      "Birlikte geçireceğiniz her yıl, bugünkü kadar taze olsun. Sevginiz eksilmesin, sofranız bereketli olsun.",
  },
];

export default function DemoSayfasi() {
  return (
    <>
      <Ustbar />
      <main className="mx-auto max-w-icerik px-6 py-16">
        <div className="mx-auto max-w-2xl text-center">
          <p className="font-govde text-xs uppercase tracking-etiket text-yaldiz">
            Örnek Anı Defterini Keşfedin
          </p>
          <p className="mt-5 font-govde text-base leading-relaxed text-ikincil">
            Kalitemizi hiçbir soru işareti kalmadan, şeffafça inceleyin. Bu önizleme, anılarınızın
            nasıl ölümsüzleşeceğinin birebir yansımasıdır. Kendi hikayenizi başlatmak; benzersiz
            bağlantı linkinizi/QR kodunuzu üretmek ve tüm toplama/indirme özelliklerine tam erişim
            sağlamak için kendi paketinizi aktifleştirerek bu ayrıcalıklı deneyime hemen adım
            atabilirsiniz.
          </p>
        </div>

        {/* Defter kapagi - marka ani, tam kilit */}
        <div className="relative mx-auto mt-14 max-w-2xl">
          <div className="rounded-t-3xl border border-b-0 border-ayrac bg-yuzey px-8 py-14 text-center">
            <MarkaKilidi varyant="tam" boyut="orta" />
            <p className="mt-8 font-display text-xl italic text-sarap">Elif &amp; Kaan</p>
            <p className="mt-1 font-govde text-xs uppercase tracking-etiket text-ikincil">
              12 Eylül 2026
            </p>
          </div>

          <div className="relative overflow-hidden rounded-b-3xl border border-ayrac bg-parsomen">
            <div
              className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center"
              aria-hidden="true"
            >
              <span className="rotate-[-24deg] font-display text-6xl font-medium text-murekkep/5">
                ÖRNEK ÖNİZLEME
              </span>
            </div>
            <ul className="divide-y divide-ayrac/70">
              {ornekDilekler.map((d) => (
                <li key={d.ad} className="px-8 py-8">
                  <p className="font-display text-lg leading-relaxed text-murekkep">
                    &ldquo;{d.mesaj}&rdquo;
                  </p>
                  <p className="mt-4 font-govde text-sm text-murekkep">
                    {d.ad}
                    <span className="ml-2 text-xs uppercase tracking-etiket text-yaldiz">
                      {d.taraf}
                    </span>
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Paywall - premium CTA */}
        <div className="mx-auto mt-12 max-w-2xl rounded-2xl border border-ayrac bg-yuzey px-8 py-10 text-center">
          <p className="font-display text-2xl text-murekkep">
            Kendi Hikayenizi Ölümsüzleştirmeye Hazır mısınız?
          </p>
          <p className="mx-auto mt-4 max-w-xl font-govde text-sm leading-relaxed text-ikincil">
            Size özel benzersiz bağlantı linkinizi/QR kodunuzu oluşturmak, davetlilerinizin değerli
            mesajlarını toplamaya başlamak ve bu eşsiz anıları ister dijitalde ister kusursuz bir
            fiziksel baskıyla taçlandırmak için son bir adım kaldı. Tüm bu ayrıcalıklara premium
            deneyimle ulaşabilirsiniz.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-4">
            <span className="inline-flex cursor-not-allowed items-center justify-center rounded-full bg-sarap/40 px-7 py-3 font-govde text-sm font-medium text-parsomen">
              Paketi aktifleştir (yakında)
            </span>
            <Link
              href="/"
              className="font-govde text-sm text-ikincil transition-colors hover:text-sarap"
            >
              Ana sayfaya dön
            </Link>
          </div>
        </div>
      </main>
      <Altbilgi />
    </>
  );
}
