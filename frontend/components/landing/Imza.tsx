// "Iki Taraf, Tek Defter" - baslik + giris + 3 madde (kullanicinin istedigi yapi).
const maddeler = [
  {
    ikon: "🔗",
    baslik: "Size Özel Paylaşım",
    metin:
      "Her iki tarafa özel oluşturulan benzersiz bağlantılarla kendi sevdiklerinize kolayca ulaşın.",
  },
  {
    ikon: "✔️",
    baslik: "Kusursuz Kontrol",
    metin:
      "Defterinizde yer alacak tüm mesajları kalıcı hale gelmeden önce gözden geçirin ve onaylayın.",
  },
  {
    ikon: "💎",
    baslik: "Kalıcı Bir Miras",
    metin:
      "Sevdiklerinizin iyi dileklerini, nesilden nesile aktarılacak eşsiz bir aile mirasına dönüştürün.",
  },
];

export function Imza() {
  return (
    <section id="nasil" className="mx-auto max-w-icerik px-6 py-20">
      <h2 className="text-center font-display text-3xl leading-tight text-murekkep sm:text-4xl">
        İki Taraf, Tek Defter
      </h2>
      <p className="mx-auto mt-4 max-w-2xl text-center font-govde text-base leading-relaxed text-ikincil">
        Benzersiz hikayenizi iki farklı pencereden, tek bir eserde buluşturun.
      </p>

      <div className="mx-auto mt-12 grid max-w-4xl grid-cols-1 gap-6 sm:grid-cols-3">
        {maddeler.map((m) => (
          <div
            key={m.baslik}
            className="rounded-2xl border border-ayrac bg-yuzey/70 px-7 py-8 text-left"
          >
            <span className="text-2xl" aria-hidden="true">
              {m.ikon}
            </span>
            <h3 className="mt-4 font-display text-lg text-murekkep">{m.baslik}</h3>
            <p className="mt-2 font-govde text-sm leading-relaxed text-ikincil">{m.metin}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
