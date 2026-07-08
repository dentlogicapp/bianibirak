import { MarkaKilidi } from "@/components/marka/MarkaKilidi";
import { Buton } from "@/components/ui/Buton";

// Hero = tez. Marka ani -> tam kilit. Acilista yumusak giris (reduced-motion'a saygi).
export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto flex max-w-icerik flex-col items-center px-6 pb-8 pt-20 text-center sm:pt-28">
        <div className="animate-yumusakGiris">
          <MarkaKilidi varyant="tam" boyut="buyuk" />
        </div>

        <div className="yaldiz-cizgi mt-12 w-32" />

        <h1 className="mt-12 max-w-3xl font-display text-3xl font-normal leading-snug text-murekkep sm:text-4xl">
          Sevdiklerinin sözlerini, yıllar sonra çocuklarına
          gösterebileceğin bir mirasa dönüştür.
        </h1>

        <p className="mt-6 max-w-xl font-govde text-base leading-relaxed text-ikincil">
          Davetliler tek bir dokunuşla dilek bırakır. Sen onları baskıya hazır
          bir hatıra defterine ve slayta çevirirsin. Uygulama yok, hesap yok,
          dağınıklık yok.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Buton href="/demo" ton="birincil">
            Örnek defteri gör
          </Buton>
          <Buton href="#nasil" ton="ikincil">
            Nasıl çalışır
          </Buton>
        </div>
      </div>
    </section>
  );
}
