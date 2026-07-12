"use client";

// DURUM BANDI - "Yazılıyor..." / "Tüm değişiklikler kayıtlı".
//
// ONCEKI HATANIN KOKU: bant `fixed` idi ama sayfa ALT BOSLUK birakmiyordu. Icerik
// bandin altina giriyor, zemin de yari saydam oldugu icin (bg-parsomen/90 + blur)
// altindaki metin bandin icinden GORUNUYORDU. Kaydirinca bant "yerinden ayriliyor,
// sayfayla birlikte kayiyor" gibi duruyordu - halbuki kayan icerikti.
//
// COZUM:
//   - Zemin OPAK: altindan hicbir sey sizmaz.
//   - Ust kenarda ince golge: bant, sayfanin USTUNDE durdugunu belli eder.
//   - Sayfa alt boslugu bilesenin kendi isi: <DurumBandiBoslugu /> ile birlikte
//     kullanilir; her sayfada elle pb-16 yazmayi unutma riski KALKAR.
//
// Bu bilesen, oto-kaydet kullanan HER sayfanin tek kaynagidir (kurasyon, duzenle
// ve sonradan eklenecekler). Iki ayri kopya kacinilmaz olarak ayrisir.

export function DurumBandi({
  metin,
  sinif,
}: {
  metin: string;
  sinif?: string;
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-ayrac bg-parsomen shadow-[0_-6px_20px_rgba(33,26,23,0.06)]">
      <div className="mx-auto flex max-w-icerik items-center justify-between px-5 py-2.5 sm:px-6">
        <span className={`font-govde text-xs ${sinif ?? "text-ikincil"}`}>{metin}</span>
      </div>
    </div>
  );
}

// Sayfanin en altina konur: son icerik bandin ALTINDA kalmasin.
export function DurumBandiBoslugu() {
  return <div className="h-14" aria-hidden />;
}
