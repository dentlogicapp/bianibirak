// "Bagimsiz Secimler, Ortak Bir Miras" - yatay, tek satir, animasyonlu birlesim
// denklemi (Gelin QR + Damat QR = Tek Defter) + premium metin.

function QrKart({ etiket }: { etiket: string }) {
  return (
    <div className="flex shrink-0 flex-col items-center gap-2">
      <div className="rounded-xl border border-ayrac bg-yuzey p-3 shadow-sm">
        <svg viewBox="0 0 24 24" className="h-9 w-9 sm:h-11 sm:w-11" aria-hidden="true">
          <g fill="#6E2438">
            <rect x="1" y="1" width="7" height="7" rx="1" />
            <rect x="16" y="1" width="7" height="7" rx="1" />
            <rect x="1" y="16" width="7" height="7" rx="1" />
            <rect x="3" y="3" width="3" height="3" fill="#F4EBDA" />
            <rect x="18" y="3" width="3" height="3" fill="#F4EBDA" />
            <rect x="3" y="18" width="3" height="3" fill="#F4EBDA" />
            <rect x="11" y="1" width="2" height="2" /><rect x="13" y="4" width="2" height="2" />
            <rect x="11" y="7" width="2" height="2" /><rect x="16" y="11" width="2" height="2" />
            <rect x="19" y="13" width="2" height="2" /><rect x="21" y="16" width="2" height="2" />
            <rect x="11" y="13" width="2" height="2" /><rect x="13" y="16" width="2" height="2" />
            <rect x="11" y="19" width="2" height="2" /><rect x="16" y="19" width="2" height="2" />
          </g>
        </svg>
      </div>
      <span className="font-govde text-[0.7rem] uppercase tracking-widest text-sarap sm:text-xs">
        {etiket}
      </span>
    </div>
  );
}

export function Birlesim() {
  return (
    <section className="mx-auto max-w-icerik px-6 py-16">
      <h2 className="text-center font-display text-3xl leading-tight text-murekkep sm:text-4xl">
        Bağımsız Seçimler, Ortak Bir Miras
      </h2>

      {/* yatay denklem - tek satir, alt satira DUSMEZ */}
      <div className="mx-auto mt-12 flex max-w-3xl flex-nowrap items-center justify-center gap-3 sm:gap-6">
        <QrKart etiket="Gelin" />
        <span className="birlesim-artı shrink-0 font-display text-2xl text-yaldiz sm:text-3xl" aria-hidden="true">
          +
        </span>
        <QrKart etiket="Damat" />
        <span className="birlesim-esit shrink-0 font-display text-2xl text-yaldiz sm:text-3xl" aria-hidden="true">
          =
        </span>
        <div className="birlesim-defter flex shrink-0 flex-col items-center gap-2">
          <div className="rounded-xl bg-sarap p-3 shadow-md">
            <svg viewBox="0 0 24 24" className="h-9 w-9 sm:h-11 sm:w-11" aria-hidden="true">
              <path
                d="M4 3h6a2 2 0 0 1 2 2 2 2 0 0 1 2-2h6v16h-6a2 2 0 0 0-2 2 2 2 0 0 0-2-2H4z"
                fill="none"
                stroke="#C4A25E"
                strokeWidth="1.4"
                strokeLinejoin="round"
              />
              <line x1="12" y1="5" x2="12" y2="21" stroke="#C4A25E" strokeWidth="1.4" />
            </svg>
          </div>
          <span className="font-govde text-[0.7rem] uppercase tracking-widest text-yaldiz sm:text-xs">
            Tek defter
          </span>
        </div>
      </div>
      <div className="birlesim-hat mx-auto mt-8 w-56" />

      <p className="mx-auto mt-10 max-w-2xl text-center font-govde text-base leading-relaxed text-ikincil">
        Düğün telaşı içinde anılarınızı yönetmek hiç bu kadar zarif olmamıştı. Gelin ve damat
        için ayrı ayrı oluşturulan QR kodlar sayesinde, her iki taraf da kendi sevdiklerinden
        gelen mesajları birbirinden bağımsız ve tamamen kişisel alanlarında inceler. Kendi özel
        ekranlarınızda gözden geçirip onayladığınız bu değerli anılar, finalde hikayenizin ortak
        başyapıtı olan tek bir anı defterinde kusursuzca bütünleşir.
      </p>
    </section>
  );
}
