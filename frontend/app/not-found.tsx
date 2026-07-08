import { Ustbar } from "@/components/site/Ustbar";
import { Altbilgi } from "@/components/site/Altbilgi";
import { Buton } from "@/components/ui/Buton";

// App Router 404. Duz JSX; <Html>/<Head>/<body> YOK (onlar layout'un isi).
// Bu dosyanin varligi, Next'in Pages-Router default hata sayfasina (ki <Html>
// import eder) dusmesini ONLER.
export default function BulunamadiSayfasi() {
  return (
    <>
      <Ustbar />
      <main className="mx-auto flex max-w-icerik flex-col items-center px-6 py-28 text-center">
        <p className="font-govde text-xs uppercase tracking-etiket text-yaldiz">
          404
        </p>
        <h1 className="mt-4 font-display text-3xl text-murekkep sm:text-4xl">
          Bu sayfa bulunamadı
        </h1>
        <p className="mt-4 max-w-md font-govde text-sm leading-relaxed text-ikincil">
          Aradığın defter taşınmış ya da hiç var olmamış olabilir. Ana sayfadan
          yeniden başlayabilirsin.
        </p>
        <div className="mt-8">
          <Buton href="/" ton="birincil">
            Ana sayfaya dön
          </Buton>
        </div>
      </main>
      <Altbilgi />
    </>
  );
}
