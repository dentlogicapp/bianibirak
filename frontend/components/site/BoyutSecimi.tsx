"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

// BOYUT SECIMI - indirmeden onceki son karar.
//
// NEDEN VAR:
// Cift, defterini A5 indirip matbaaya "A3 bas" derse, matbaa belgeyi buyutur. ISO 216
// sayesinde duzen bozulmaz (A serisinin orani ayni) - ama FOTOGRAFLAR SEYRELIR:
// 300 DPI'lik bir goruntu iki kat buyutuldugunde 150 DPI'a duser. Yazilar kusursuz
// kalir (vektor), fotograflar yumusar.
//
// Belgeyi DOGRUDAN hedef boyutta uretirsek fotograf o olcude yerlestirilir ve kalite
// korunur. Bu yuzden secim indirme aninda sorulur - sonradan telafisi yok.
//
// Cift bunu BILMEZ. Soylemezsek, matbaadan donen kitaba bakip "fotograflar neden
// bulanik" der - ve sucu bizde arar. Haklidir da: soylemeyen biziz.

export type Boyut = "a5" | "a4" | "a3";

// FOTOGRAF COZUNURLUGU - her boyutta ACIKCA gosterilir.
//
// Kaynak fotograflar 1600 piksel (davetli telefonundan yukluyor, sunucuya inmeden
// once sikistiriliyor). Sayfa buyudukce ayni fotograf daha genis bir alana yayilir
// ve SEYRELIR:
//
//   A5 -> 430 DPI  (fazlasiyla yeterli)
//   A4 -> 303 DPI  (baski standardinin tam ustunde)
//   A3 -> 214 DPI  (standardin ALTINDA - yazilar kusursuz kalir, fotograflar yumusar)
//
// Bu sayilari GIZLEMIYORUZ. Cift ne aldigini bilmeli; "fotograflariniz bozulmasin"
// deyip, onerdigimiz boyutta bozulmasina goz yumamayiz.
//
// A4 ONERILEN: hem yeterince buyuk (album olcusu, fotograflar nefes alir), hem tam
// baski standardi. Sektor de burada - Blurb ve Shutterfly'in ana urunleri 8x10 /
// 8x11 inc, yani A4 civari.
const BOYUTLAR: {
  kod: Boyut;
  ad: string;
  olcu: string;
  aciklama: string;
  netlik: "en-yuksek" | "yuksek";
  onerilen?: boolean;
}[] = [
  {
    kod: "a5",
    ad: "A5",
    olcu: "148 × 210 mm",
    aciklama: "Roman ölçüsü. Elde tutması rahat, küçük ve mahrem.",
    netlik: "en-yuksek",
  },
  {
    kod: "a4",
    ad: "A4",
    olcu: "210 × 297 mm",
    aciklama: "Albüm ölçüsü. Fotoğraflar nefes alır, yazı rahat okunur.",
    netlik: "en-yuksek",
    onerilen: true,
  },
  {
    kod: "a3",
    ad: "A3",
    olcu: "297 × 420 mm",
    aciklama: "Anıt ölçüsü. Gösterişli; en büyük boy.",
    netlik: "yuksek",
  },
];



export function BoyutSecimi({
  acik,
  onKapat,
  onSec,
  uretiliyor,
}: {
  acik: boolean;
  onKapat: () => void;
  onSec: (boyut: Boyut) => void;
  uretiliyor: boolean;
}) {
  // Varsayilan = ONERILEN. Rozeti A4'e verip varsayilani A5 birakmak, kullaniciya
  // "onerdigimizi kendimiz secmiyoruz" demektir.
  const [secili, setSecili] = useState<Boyut>("a4");

  useEffect(() => {
    if (!acik) return;
    const eski = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function tus(e: KeyboardEvent) {
      if (e.key === "Escape" && !uretiliyor) onKapat();
    }
    window.addEventListener("keydown", tus);

    return () => {
      document.body.style.overflow = eski;
      window.removeEventListener("keydown", tus);
    };
  }, [acik, onKapat, uretiliyor]);

  if (!acik || typeof document === "undefined") return null;

  const govde = (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-murekkep/80 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={() => !uretiliyor && onKapat()}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-parsomen shadow-[0_0_80px_rgba(33,26,23,0.5)] sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-1 shrink-0 bg-gradient-to-r from-yaldiz/30 via-yaldiz to-yaldiz/30" aria-hidden />

        <div className="shrink-0 border-b border-ayrac px-6 py-5 text-center">
          <h2 className="font-display text-xl text-murekkep">
            Hangi boyutta bastıracaksın?
          </h2>
          <p className="metin-yasli mt-1.5 font-govde text-sm leading-relaxed text-ikincil">
            Defterin seçtiğin ölçüde üretilir. Düzen, tipografi ve cilt payı her
            boyutta birebir aynı kalır.
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <div className="space-y-2.5">
            {BOYUTLAR.map((b) => (
              <button
                key={b.kod}
                type="button"
                onClick={() => setSecili(b.kod)}
                className={`flex w-full min-w-0 items-center gap-4 rounded-2xl border p-4 text-left transition-colors ${
                  secili === b.kod
                    ? "border-sarap bg-sarap/[0.06]"
                    : "border-ayrac bg-yuzey hover:border-ikincil"
                }`}
              >
                {/* Olcu gostergesi - kagitlarin GERCEK orani (1:kok2) */}
                <span className="flex h-12 w-12 shrink-0 items-center justify-center">
                  <span
                    className={`block rounded-sm border-2 transition-colors ${
                      secili === b.kod
                        ? "border-sarap bg-sarap/10"
                        : "border-ikincil/40 bg-parsomen"
                    }`}
                    style={{
                      width: b.kod === "a5" ? 20 : b.kod === "a4" ? 28 : 36,
                      height: b.kod === "a5" ? 28 : b.kod === "a4" ? 40 : 51,
                    }}
                    aria-hidden
                  />
                </span>

                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline gap-2">
                    <span className="font-display text-base text-murekkep">{b.ad}</span>
                    <span className="font-govde text-xs tabular-nums text-ikincil">
                      {b.olcu}
                    </span>
                    {b.onerilen && (
                      <span className="rounded-full bg-yaldiz/15 px-2 py-0.5 font-govde text-[0.55rem] uppercase tracking-etiket text-yaldiz">
                        Önerilen
                      </span>
                    )}
                  </span>
                  <span className="mt-0.5 block font-govde text-xs text-ikincil">
                    {b.aciklama}
                  </span>

                  {/* NETLIK - NITEL.
                      Sayisal bir standart (DPI) YAZILMAZ: bir taahhut sayisi vermek,
                      kaynak fotografin kalitesinden bagimsiz olarak bizi hukuken
                      baglar. Cift'e dogru olan bilgi zaten sudur: bu boyda fotograflar
                      ne kadar net gorunur. Kaynak fotograf zayifsa hicbir sayi onu
                      kurtarmaz - o yuzden vaat degil, BEKLENTI yazariz. */}
                  <span className="mt-1 flex items-center gap-1.5">
                    <span
                      className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                        b.netlik === "en-yuksek" ? "bg-yaldiz" : "bg-yaldiz/60"
                      }`}
                      aria-hidden
                    />
                    <span className="font-govde text-[0.62rem] text-ikincil">
                      {b.netlik === "en-yuksek"
                        ? "Fotoğraflar en yüksek netlikte - telefon galerindeki gibi"
                        : "Fotoğraflar yüksek netlikte; çok büyük boy olduğu için yakından bakıldığında yumuşama görülebilir"}
                    </span>
                  </span>
                </span>

                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                    secili === b.kod ? "border-sarap bg-sarap" : "border-ayrac"
                  }`}
                  aria-hidden
                >
                  {secili === b.kod && (
                    <svg viewBox="0 0 24 24" className="h-3 w-3 text-parsomen">
                      <path
                        d="m5 13 4 4L19 7"
                        stroke="currentColor"
                        strokeWidth={3}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill="none"
                      />
                    </svg>
                  )}
                </span>
              </button>
            ))}
          </div>

          {/* ONEMLI UYARI - sonradan telafisi olmayan bir secim.
              Cift bunu BILMEZ; soylemezsek matbaadan donen kitaba bakip "fotograflar
              neden bulanik" der ve haklidir. */}
          <div className="mt-5 rounded-2xl border border-sarap/35 bg-sarap/[0.05] p-4">
            <p className="flex items-start gap-2.5">
              <span className="mt-0.5 shrink-0 text-sarap" aria-hidden>
                <svg viewBox="0 0 24 24" className="h-4 w-4">
                  <path
                    d="M12 9v4m0 3h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"
                    stroke="currentColor"
                    strokeWidth={1.6}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                </svg>
              </span>
              <span className="min-w-0">
                <span className="block font-govde text-xs font-semibold uppercase tracking-etiket text-sarap">
                  Önemli uyarı
                </span>
                <span className="metin-yasli mt-1 block font-govde text-xs leading-relaxed text-ikincil">
                  Defterinizi hangi boyutta{" "}
                  <span className="font-medium text-murekkep">bastıracaksanız</span>,
                  indirirken o boyutu seçin. Bu, fotoğraflarınızın kâğıtta bozulmadan,
                  net çıkmasını sağlayan{" "}
                  <span className="font-medium text-murekkep">
                    sonradan telafisi olmayan
                  </span>{" "}
                  bir seçimdir.
                </span>
                <span className="metin-yasli mt-1.5 block font-govde text-xs leading-relaxed text-ikincil">
                  Küçük boyutta indirilen bir defteri matbaada büyütmek, fotoğrafları
                  seyreltir ve yumuşatır. Yazılar etkilenmez; bozulan yalnızca
                  anılarınızdır.
                </span>
                <span className="metin-yasli mt-1.5 block font-govde text-xs leading-relaxed text-ikincil">
                  Çıktınızı matbaaya göndereceksiniz — lütfen bunu dikkate alın.
                  Mutluluklar{" "}
                  <span className="text-sarap" aria-label="kalp">
                    ♥
                  </span>
                </span>
              </span>
            </p>
          </div>
        </div>

        <div className="shrink-0 space-y-2 border-t border-ayrac bg-yuzey px-6 py-4">
          <button
            type="button"
            onClick={() => onSec(secili)}
            disabled={uretiliyor}
            className="w-full rounded-full bg-sarap px-5 py-3 font-govde text-sm font-medium text-parsomen transition-colors hover:bg-sarapKoyu disabled:opacity-40"
          >
            {uretiliyor
              ? "Eser hazırlanıyor..."
              : `${BOYUTLAR.find((b) => b.kod === secili)?.ad} olarak indir`}
          </button>
          <button
            type="button"
            onClick={onKapat}
            disabled={uretiliyor}
            className="w-full rounded-full px-5 py-2 font-govde text-xs text-ikincil transition-colors hover:text-murekkep disabled:opacity-40"
          >
            Vazgeç
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(govde, document.body);
}
