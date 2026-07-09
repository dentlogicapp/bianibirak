import { MarkaKilidi } from "@/components/marka/MarkaKilidi";
import { DilekAkisi } from "@/components/marka/DilekAkisi";
import { Buton } from "@/components/ui/Buton";

// Hero = marka ani. Animasyonlu wordmark + tagline + dilek akisi + tez + premium metin.
export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto flex max-w-icerik flex-col items-center px-6 pb-8 pt-20 text-center sm:pt-24">
        <div className="animate-yumusakGiris">
          <MarkaKilidi varyant="tam" boyut="buyuk" animasyonlu />
        </div>

        {/* tagline ile yaldiz cizgi arasinda: dilek akisi */}
        <div className="mt-8 w-full">
          <DilekAkisi />
        </div>

        <div className="yaldiz-cizgi mt-3 w-40" />

        <h1 className="mt-12 max-w-3xl font-display text-3xl font-normal leading-snug text-murekkep sm:text-4xl">
          Sevdiklerin tarafından kaleme alınarak yazıya dökülen{" "}
          <em className="font-semibold italic text-sarap">her bir satırı</em>, gelecekte
          çocuklarına gösterebileceğin bir{" "}
          <em className="font-semibold italic text-sarap">mirasa dönüştür</em>.
        </h1>

        <p className="mt-6 max-w-2xl font-govde text-base leading-relaxed text-ikincil">
          Sevdikleriniz, paylaştığınız QR kod veya bağlantı üzerinden tek bir tıkla arayüze
          ulaşır ve en özel dileklerini saniyeler içinde paylaşır. Bu eşsiz anılar dijitalde
          toplanırken, size sadece onları nasıl taçlandırmak istediğinizi seçmek kalır. İster
          baskısını bizim titizlikle hazırladığımız, sınırsız kişiselleştirme seçeneğiyle
          salonunuzun baş köşesini süsleyecek <span className="text-murekkep">özel anı
          defterinize</span> dönüştürün; ister dijital formatta telefonunuzda taşıyarak bu
          özel hissi dilediğiniz an yeniden yaşayın.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Buton href="/demo" ton="birincil">
            Örnek Anı Defterini gör
          </Buton>
          <Buton href="#nasil" ton="ikincil">
            Nasıl çalışır
          </Buton>
        </div>
      </div>
    </section>
  );
}
