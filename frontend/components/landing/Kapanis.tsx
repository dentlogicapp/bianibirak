import { Buton } from "@/components/ui/Buton";

export function Kapanis() {
  return (
    <section className="mx-auto max-w-icerik px-6 py-16">
      <div className="rounded-3xl border border-ayrac bg-yuzey px-8 py-16 text-center sm:px-16">
        <h2 className="mx-auto max-w-2xl font-display text-2xl leading-snug text-murekkep sm:text-3xl">
          Önce kalitesini gör, sonra karar ver.
        </h2>
        <p className="mx-auto mt-4 max-w-lg font-govde text-sm leading-relaxed text-ikincil">
          Örnek defter salt-okunur bir önizlemedir. Hesap açmadan gezebilirsin.
        </p>
        <div className="mt-8">
          <Buton href="/demo" ton="birincil">
            Örnek defteri aç
          </Buton>
        </div>
      </div>
    </section>
  );
}
