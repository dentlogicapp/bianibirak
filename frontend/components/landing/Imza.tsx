// IMZA OGESI: "Iki taraf, tek defter".
// Urunun ozgun mekanigi (cift-link + birlesim-oncesi izolasyon) gorsellestirilir:
// iki ayri taraf, onaydan sonra tek bir deftere birlesir.
export function Imza() {
  return (
    <section id="nasil" className="mx-auto max-w-icerik px-6 py-20">
      <p className="text-center font-govde text-xs uppercase tracking-etiket text-yaldiz">
        İki taraf, tek defter
      </p>
      <h2 className="mx-auto mt-4 max-w-2xl text-center font-display text-2xl leading-snug text-murekkep sm:text-3xl">
        Her iki tarafın da kendi linki olur. Dilekler, birleşmeden önce ait
        olduğu tarafça onaylanır.
      </h2>

      <div className="mt-14 grid grid-cols-1 items-stretch gap-6 sm:grid-cols-[1fr_auto_1fr]">
        <TarafKart
          etiket="Gelinin tarafı"
          metin="Kendi QR'ı, kendi onay kuyruğu. Davetliler dilek bırakır."
        />
        <div className="flex items-center justify-center">
          <span
            className="font-display text-3xl text-yaldiz"
            aria-hidden="true"
          >
            +
          </span>
        </div>
        <TarafKart
          etiket="Damadın tarafı"
          metin="Kendi QR'ı, kendi onay kuyruğu. İki taraf birbirini görmez."
        />
      </div>

      <div className="mx-auto mt-6 flex max-w-md flex-col items-center">
        <div className="yaldiz-cizgi w-full" />
        <div className="mt-6 rounded-2xl border border-ayrac bg-yuzey px-8 py-6 text-center">
          <p className="font-display text-lg text-murekkep">
            Onaylananlar, tek bir hatıra defterinde buluşur.
          </p>
        </div>
      </div>
    </section>
  );
}

function TarafKart({ etiket, metin }: { etiket: string; metin: string }) {
  return (
    <div className="rounded-2xl border border-ayrac bg-yuzey/70 px-7 py-8">
      <p className="font-govde text-xs uppercase tracking-etiket text-sarap">
        {etiket}
      </p>
      <p className="mt-3 font-govde text-sm leading-relaxed text-ikincil">
        {metin}
      </p>
    </div>
  );
}
