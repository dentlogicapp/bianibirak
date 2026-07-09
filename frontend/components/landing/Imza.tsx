import { Reveal } from "@/components/ui/Reveal";

const maddeler = [
  { ikon: "🔗", baslik: "Size Özel Paylaşım", metin: "Her iki tarafa özel oluşturulan benzersiz bağlantılarla kendi sevdiklerinize kolayca ulaşın." },
  { ikon: "✔️", baslik: "Kusursuz Kontrol", metin: "Defterinizde yer alacak tüm mesajları kalıcı hale gelmeden önce gözden geçirin ve onaylayın." },
  { ikon: "💎", baslik: "Kalıcı Bir Miras", metin: "Sevdiklerinizin iyi dileklerini, nesilden nesile aktarılacak eşsiz bir aile mirasına dönüştürün." },
];

export function Imza() {
  return (
    <section id="nasil" className="mx-auto max-w-icerik px-6 py-24 sm:py-28">
      <Reveal>
        <h2 className="text-center font-display text-[1.7rem] leading-tight text-murekkep sm:text-4xl">
          İki Taraf, Tek Defter
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-center font-govde text-base leading-relaxed text-ikincil">
          Benzersiz hikayenizi iki farklı pencereden, tek bir eserde buluşturun.
        </p>
      </Reveal>

      <div className="mx-auto mt-16 grid max-w-4xl grid-cols-1 gap-7 sm:grid-cols-3">
        {maddeler.map((m, idx) => (
          <Reveal key={m.baslik} gecikme={idx * 150}>
            <div className="h-full rounded-3xl border border-ayrac bg-yuzey/60 px-8 py-10 text-left">
              <span className="text-3xl" aria-hidden="true">{m.ikon}</span>
              <h3 className="mt-5 font-display text-xl text-murekkep">{m.baslik}</h3>
              <p className="mt-3 font-govde text-[0.95rem] leading-relaxed text-ikincil">{m.metin}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
