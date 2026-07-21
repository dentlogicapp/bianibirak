"use client";

import { useRef, useState } from "react";

// KAYDIRARAK SIL - dokunmatik cihazlarda satir eylemi.
//
// NEDEN BOYLE:
// Mobilde bir liste satirinin yanina kalici bir "Sil" butonu koymak iki sey birden
// bozar: satir daralir (isim kirpilir) ve geri alinamayacak bir eylem parmagin
// surekli menzilinde durur. Dunya capinda yerlesmis cozum, eylemi KAYDIRMA ile
// ortaya cikarmaktir: niyet olmadan gorunmez, niyet varken bir hareket uzakta.
//
// TASARIM KARARLARI:
//
//  1. YALNIZ SOLA. Saga kaydirma yok sayilir. iOS'ta ekranin solundan saga kaydirma
//     tarayicinin "geri" hareketidir; ayni jesti burada da kullansaydik kullanici
//     silmeye calisirken sayfayi terk ederdi.
//
//  2. touch-action: pan-y. Dikey kaydirma DOKUNULMADAN gecer - menu kendi icinde
//     kaydirilabilir kalir. Bu satir olmadan liste, parmak nereye denk gelirse
//     orada kilitlenir.
//
//  3. EKSEN KILIDI. Ilk 6 pikselde yon secilir: yatay ise biz aliriz, dikey ise
//     tamamen birakiriz. Kilit olmadan capraz hareketler hem sayfayi kaydirir hem
//     satiri surukler - kullanici hicbirini kontrol edemez.
//
//  4. ESIK. Panelin dortte biri gecilmeden birakilirsa satir yayla geri kapanir.
//     Kaza sürtünmesi yaratmadan niyeti okumanin yolu budur.
//
//  5. FARE DISARIDA. Fare ile yatay surukleme metin secimiyle cakisir; masaustunde
//     eylem, satirin uzerine gelince beliren (x) ile yapilir. Kaydirma DOKUNMATIGE
//     ozgudur, tek erisim yolu DEGILDIR - klavye ve fare kullanicisi disarida kalmaz.
//
//  6. ACIKKEN ICERIK TIKLANMAZ. Panel acikken satira dokunmak satiri KAPATIR,
//     altindaki eylemi calistirmaz. Yoksa "silmek icin actim, yanlislikla defteri
//     degistirdim" olurdu.
//
// Acik/kapali durumu DISARIDAN yonetilir (acikMi/onAc/onKapat): boylece listede
// ayni anda yalnizca TEK satir acik kalir. Bu bilgi bilesenin icinde tutulsaydi her
// satir kendi basina acilir, ekran eylem panelleriyle dolardi.
const PANEL_GENISLIK = 88;
const ESIK_ORAN = 0.25;
const KILIT_ESIGI = 6;

type Props = {
  acikMi: boolean;
  onAc: () => void;
  onKapat: () => void;
  onSil: () => void;
  silEtiket?: string;
  children: React.ReactNode;
};

export function KaydirSil({
  acikMi,
  onAc,
  onKapat,
  onSil,
  silEtiket = "Sil",
  children,
}: Props) {
  const [suruklenen, setSuruklenen] = useState(false);
  const [ofset, setOfset] = useState(0);
  const basla = useRef<{ x: number; y: number; kilit: "yok" | "yatay" | "dikey" } | null>(null);

  const gorunen = suruklenen ? ofset : acikMi ? -PANEL_GENISLIK : 0;

  function basladi(e: React.PointerEvent) {
    // Fare disarida - masaustunde (x) var (bkz. karar 5).
    if (e.pointerType === "mouse") return;
    basla.current = { x: e.clientX, y: e.clientY, kilit: "yok" };
  }

  function hareket(e: React.PointerEvent) {
    const b = basla.current;
    if (!b) return;

    const dx = e.clientX - b.x;
    const dy = e.clientY - b.y;

    // EKSEN KILIDI - yon bir kez secilir, sonra degismez.
    if (b.kilit === "yok") {
      if (Math.abs(dx) < KILIT_ESIGI && Math.abs(dy) < KILIT_ESIGI) return;
      b.kilit = Math.abs(dx) > Math.abs(dy) ? "yatay" : "dikey";
      if (b.kilit === "yatay") setSuruklenen(true);
    }
    if (b.kilit !== "yatay") return;

    const taban = acikMi ? -PANEL_GENISLIK : 0;
    // Saga tasma YOK (Math.min 0), panelden fazla acilma YOK (Math.max).
    setOfset(Math.min(0, Math.max(-PANEL_GENISLIK, taban + dx)));
  }

  function bitti() {
    const b = basla.current;
    basla.current = null;
    if (!b || b.kilit !== "yatay") {
      setSuruklenen(false);
      return;
    }
    if (ofset <= -PANEL_GENISLIK * ESIK_ORAN) onAc();
    else onKapat();
    setSuruklenen(false);
  }

  return (
    <div className="relative overflow-hidden rounded-lg">
      {/* EYLEM PANELI - satirin ALTINDA durur, icerik kayinca ortaya cikar.
          Kapaliyken tiklanamaz: gorunmeyen bir butonun tiklanabilir olmasi,
          ekran okuyucu kullanicisi icin hayalet eylem demektir. */}
      <div
        className="absolute inset-y-0 right-0 flex items-stretch"
        style={{ width: PANEL_GENISLIK }}
        aria-hidden={!acikMi}
      >
        <button
          type="button"
          tabIndex={acikMi ? 0 : -1}
          onClick={onSil}
          className="flex w-full items-center justify-center gap-1 bg-sarap font-govde text-xs font-medium text-parsomen"
          style={{ pointerEvents: acikMi ? "auto" : "none" }}
        >
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" aria-hidden>
            <path
              d="M5 7h14M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7M6.5 7l.7 12a2 2 0 0 0 2 1.9h5.6a2 2 0 0 0 2-1.9l.7-12"
              stroke="currentColor"
              strokeWidth={1.6}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </svg>
          {silEtiket}
        </button>
      </div>

      {/* ICERIK - kayan katman. Surukleme sirasinda gecis KAPALI (parmagi birebir
          takip etmeli), birakildiginda ACIK (yayla oturur). */}
      <div
        onPointerDown={basladi}
        onPointerMove={hareket}
        onPointerUp={bitti}
        onPointerCancel={bitti}
        onClickCapture={(e) => {
          if (!acikMi) return;
          e.preventDefault();
          e.stopPropagation();
          onKapat();
        }}
        className="relative bg-yuzey"
        style={{
          transform: `translateX(${gorunen}px)`,
          transition: suruklenen ? "none" : "transform 180ms ease-out",
          touchAction: "pan-y",
        }}
      >
        {children}
      </div>
    </div>
  );
}
