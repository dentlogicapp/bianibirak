import { MarkaKilidi } from "@/components/marka/MarkaKilidi";
import { DilekAkisi } from "@/components/marka/DilekAkisi";
import { Buton } from "@/components/ui/Buton";
import { Reveal } from "@/components/ui/Reveal";

// Hero = marka ani. Ferah, sigan, animasyonlu.
export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto flex max-w-icerik flex-col items-center px-6 pb-14 pt-20 text-center sm:pt-28">
        <div className="animate-yumusakGiris w-full">
          <MarkaKilidi varyant="tam" boyut="buyuk" animasyonlu />
        </div>

        {/* tagline ile yaldiz cizgi arasinda: dilek akisi */}
        <div className="mt-12 w-full">
          <DilekAkisi />
        </div>

        <div className="yaldiz-cizgi mt-4 w-40" />

        <Reveal className="w-full">
          <h1 className="mx-auto mt-16 max-w-3xl font-display text-[1.7rem] font-normal leading-[1.4] text-murekkep sm:text-4xl sm:leading-[1.35]">
            Sevdiklerin tarafından kaleme alınarak yazıya dökülen{" "}
            <em className="font-semibold italic text-sarap">her bir satırı</em>, gelecekte
            çocuklarına gösterebileceğin bir{" "}
            <em className="font-semibold italic text-sarap">mirasa dönüştür</em>.
          </h1>
        </Reveal>

        <Reveal gecikme={140} className="w-full">
          <p className="metin-yasli mx-auto mt-10 max-w-2xl font-govde text-[0.95rem] leading-loose text-ikincil sm:text-base">
            Sevdikleriniz, paylaştığınız QR kod veya bağlantı üzerinden tek bir tıkla arayüze
            ulaşır ve en özel dileklerini saniyeler içinde paylaşır. Bu eşsiz anılar dijitalde
            toplanırken, size sadece onları nasıl taçlandırmak istediğinizi seçmek kalır. İster
            baskısını bizim titizlikle hazırladığımız, sınırsız kişiselleştirme seçeneğiyle
            salonunuzun baş köşesini süsleyecek{" "}
            <span className="text-murekkep">özel anı defterinize</span> dönüştürün; ister dijital
            formatta telefonunuzda taşıyarak bu özel hissi dilediğiniz an yeniden yaşayın.
          </p>
        </Reveal>

        <Reveal gecikme={260}>
          <div className="mt-12 flex flex-wrap items-center justify-center gap-4">
            <Buton href="/demo" ton="birincil">
              Örnek Anı Defterini gör
            </Buton>
            <Buton href="#nasil" ton="ikincil">
              Nasıl çalışır
            </Buton>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
