// Uc sakin deger noktasi. Numarali degil (sira bilgi tasimaz); sakin liste.
const noktalar = [
  {
    baslik: "Toplayıcı değil, stüdyo",
    metin:
      "Çoğu araç bir ZIP dosyası bırakıp bırakır. Biz dağınık dilekleri editöryel kalitede, baskıya hazır bir esere çeviririz.",
  },
  {
    baslik: "Davetli için sıfır sürtünme",
    metin:
      "QR'ı okut, dileğini yaz, bitti. Uygulama indirmek ya da hesap açmak yok. Dede de kullanır, arkadaş da.",
  },
  {
    baslik: "Kalıcı bir yadigâr",
    metin:
      "Çıktı ucuz bir dosya değil; yüksek çözünürlüklü, baskıya hazır bir defter ve bir slayt. Yıllar sonra da elde durur.",
  },
];

export function DegerOnermesi() {
  return (
    <section className="mx-auto max-w-icerik px-6 py-16">
      <div className="grid grid-cols-1 gap-10 sm:grid-cols-3">
        {noktalar.map((n) => (
          <div key={n.baslik}>
            <div className="yaldiz-cizgi w-10" />
            <h3 className="mt-5 font-display text-xl text-murekkep">
              {n.baslik}
            </h3>
            <p className="mt-3 font-govde text-sm leading-relaxed text-ikincil">
              {n.metin}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
