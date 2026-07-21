"use client";

import { useEffect, useRef } from "react";
import { Portal } from "@/components/site/Portal";

// TAM EKRAN KATMAN - modal kabugunun TEK dogruluk kaynagi.
//
// NEDEN VAR:
// Uygulamada uc ayri modal vardi ve ucu de kabugu ayri ayri kurmustu. Sonuc,
// her birinde FARKLI eksikler:
//
//   DestekModal      : portal VAR · scroll kilidi YOK · ESC YOK   · odak tuzagi YOK
//   ProfilimModal    : portal VAR · scroll kilidi VAR · ESC VAR   · odak tuzagi YOK
//   TehlikeliEylem   : portal YOK · scroll kilidi YOK · ESC VAR   · odak tuzagi YOK
//
// Ucuncu satirdaki portal eksigi canlida bir hataya donustu: onay penceresi
// avatar menusunden acilinca ekranin ustune tasti ve %80'i gorunmez oldu.
// Sebep, Portal.tsx'te zaten yazili: header'daki backdrop-blur, icindeki
// "position: fixed" icin yeni bir konumlandirma baglami yaratir.
//
// Bu, tek tek duzeltilecek uc hata degil; UC AYRI UYGULAMA olmasinin
// kacinilmaz sonucu. Dorduncusunu yazan da kendi eksigini uretecekti.
// Kabuk buraya tasindi: bes davranis tek yerde, bir kez dogru.
//
//   1. PORTAL         - document.body'ye tasinir; ustundeki hicbir ata
//                       (blur, transform, filter) konumlandirmayi bozamaz.
//   2. SCROLL KILIDI  - arka sayfa kaymaz. Mobilde bu kozmetik degil: pencere
//                       aciken arkayi kaydirmak, pencereyi ekrandan kacirir.
//   3. ESC            - kapatmanin klavye yolu. Her pencerede AYNI tus.
//   4. ODAK TUZAGI    - Tab, pencerenin icinde doner. Geri alinamaz bir islemde
//                       odagin arkadaki menuye kacmasi, yanlis dugmeye basma
//                       yoludur; ayrica ekran okuyucu kullanicisi pencerenin
//                       nerede bittigini anlayamaz.
//   5. ODAK IADESI    - pencere kapaninca odak, ACAN ogeye geri doner. Yoksa
//                       klavye kullanicisi sayfanin basina firlar.
//
// KAPSAM: bu turda YALNIZ TehlikeliEylem buna baglandi. DestekModal ve
// ProfilimModal kendi kabuklarini korur ve bu turda hic acilmadi - calisan
// ekranlara ayni anda dokunmamak icin bilincli bir sinir. Tasima bir sonraki
// turda, kendi testiyle yapilir.

type Props = {
  acik: boolean;
  onKapat: () => void;
  /** Zemine tiklayinca kapansin mi? Varsayilan: evet. */
  zeminKapatir?: boolean;
  /** Ekran okuyucuya pencerenin adi (baslik metni). */
  etiket?: string;
  children: React.ReactNode;
};

// Odaklanabilir ogeler - odak tuzagi bu kumede doner.
const ODAKLANABILIR =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

export function TamEkranKatman({
  acik,
  onKapat,
  zeminKapatir = true,
  etiket,
  children,
}: Props) {
  const kutuRef = useRef<HTMLDivElement>(null);
  // Pencereyi acan oge - kapaninca odak buraya doner.
  const oncekiOdak = useRef<HTMLElement | null>(null);

  // SCROLL KILIDI - onceki degeri saklayip iade eder.
  //
  // Duz "overflow = ''" YAZILMAZ: ic ice pencere acilirsa (ornegin onay
  // penceresinin ustunde bir onay) icteki kapandiginda distaki de kilidi
  // kaybederdi. Onceki deger saklanarak katman katman geri sarilir.
  useEffect(() => {
    if (!acik) return;
    const onceki = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = onceki;
    };
  }, [acik]);

  // ODAK: acilista pencereye, kapanista acan ogeye.
  useEffect(() => {
    if (!acik) return;
    oncekiOdak.current = document.activeElement as HTMLElement | null;

    // Bir sonraki kareye birakilir: icerideki autoFocus'lu alan (ornegin teyit
    // girdisi) once yerlesir. Zaten odaklanmis bir alan varsa ONA DOKUNULMAZ -
    // kullaniciyi yazmaya hazir alandan koparmak kaba olurdu.
    const zaman = window.setTimeout(() => {
      const kutu = kutuRef.current;
      if (!kutu) return;
      if (kutu.contains(document.activeElement)) return;
      const ilk = kutu.querySelector<HTMLElement>(ODAKLANABILIR);
      (ilk ?? kutu).focus();
    }, 0);

    return () => {
      window.clearTimeout(zaman);
      oncekiOdak.current?.focus?.();
    };
  }, [acik]);

  // ESC ile kapat + TAB ile odak tuzagi.
  //
  // ENTER ile ONAY YOK: geri alinamaz islemlerde kaza riski. Kullanici
  // dugmeye kasitla basmali.
  useEffect(() => {
    if (!acik) return;

    function tus(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onKapat();
        return;
      }
      if (e.key !== "Tab") return;

      const kutu = kutuRef.current;
      if (!kutu) return;
      const ogeler = Array.from(kutu.querySelectorAll<HTMLElement>(ODAKLANABILIR))
        .filter((o) => o.offsetParent !== null || o === document.activeElement);
      if (ogeler.length === 0) {
        e.preventDefault();
        return;
      }

      const ilk = ogeler[0];
      const son = ogeler[ogeler.length - 1];
      const etkin = document.activeElement as HTMLElement | null;

      // Kenarlarda sarmala: sondan ileri -> basa, bastan geri -> sona.
      if (!e.shiftKey && etkin === son) {
        e.preventDefault();
        ilk.focus();
      } else if (e.shiftKey && etkin === ilk) {
        e.preventDefault();
        son.focus();
      } else if (etkin && !kutu.contains(etkin)) {
        // Odak bir sekilde disari kacmissa geri al.
        e.preventDefault();
        ilk.focus();
      }
    }

    window.addEventListener("keydown", tus);
    return () => window.removeEventListener("keydown", tus);
  }, [acik, onKapat]);

  if (!acik) return null;

  return (
    <Portal>
      <div
        className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-murekkep/70 p-4 backdrop-blur-sm"
        // onMouseDown KULLANILIR, onClick DEGIL: pencere icinde metin secerken
        // fare zemine tasip birakilirsa onClick tetiklenir ve pencere kapanir -
        // kullanici yazdigini kaybeder. mousedown, baslangic noktasina bakar.
        onMouseDown={(e) => {
          if (!zeminKapatir) return;
          if (e.target === e.currentTarget) onKapat();
        }}
        role="dialog"
        aria-modal="true"
        aria-label={etiket}
      >
        <div ref={kutuRef} tabIndex={-1} className="my-auto w-full outline-none">
          {children}
        </div>
      </div>
    </Portal>
  );
}
