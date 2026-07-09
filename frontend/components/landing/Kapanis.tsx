import { Buton } from "@/components/ui/Buton";
import { Reveal } from "@/components/ui/Reveal";

export function Kapanis() {
  return (
    <section className="mx-auto max-w-icerik px-6 py-20 sm:py-24">
      <Reveal>
        <div className="rounded-[2rem] border border-ayrac bg-yuzey px-8 py-16 text-center sm:px-16 sm:py-20">
          <h2 className="mx-auto max-w-2xl font-display text-2xl leading-snug text-murekkep sm:text-3xl">
            Kusursuzluğu Deneyimleyin
          </h2>
          <p className="metin-yasli mx-auto mt-5 max-w-xl font-govde text-[0.95rem] leading-loose text-ikincil sm:text-base">
            Kararınızı vermeden önce sunduğumuz zarafeti yakından inceleyin. Hiçbir üyelik adımıyla
            vakit kaybetmeden, sizin için hazırladığımız örnek anı defterinin sayfaları arasında
            dolaşabilir ve arayüzümüzü hemen şimdi keşfedebilirsiniz.
          </p>
          <div className="mt-10">
            <Buton href="/demo" ton="birincil">Örnek Anı Defterini Aç</Buton>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
