"use client";

import { useCallback, useEffect, useState } from "react";
import { onizlemeBilgi, onizlemeSayfaUrl, type OnizlemeBilgi } from "@/lib/api";
import { TamEkranKatman } from "@/components/site/TamEkranKatman";

// DEFTER ONIZLEME - "gormek bedava, BASMAK ucretli".
//
// ===================== FILIGRANIN YERINI ALAN SEY =====================
//
// Eski surumde cift, satin alma oncesi FILIGRANLI PDF indiriyordu. Bu, urunu bedava
// dagitmakti: bugun herhangi bir goruntu modeli filigrani saniyeler icinde siler -
// ustelik silmeye bile gerek yok, baskiya hazir dosya ZATEN elde ediliyordu.
//
// Ve bunu fark etmezdik. Satis dusuk gelir, "urunu begenmediler" derdik. Oysa
// begenmislerdi - bedava almislardi.
//
// ===================== YERINE NE KOYDUK =====================
//
// Burada gordugunuz sey, bastiginizda alacaginiz seyin BIREBIR AYNISIDIR. Ayni belge,
// ayni tipografi, ayni sayfa akisi, ayni yerlestirme. Tek fark: COZUNURLUK.
//
// Bu goruntuler 96 DPI'dir - ekranin dogal cozunurlugu. Ekranda kusursuz gorunur.
// Ama A4'e basildiginda gorunur sekilde bulanik cikar: baski 300 DPI ister, bu onun
// ucte biri. Metin kenarlari yumusar, ince yaldiz cizgiler kirilir, tipografi dagilir.
//
// Yani cift ekranda GURUR DUYAR; basmaya kalkarsa UTANIR. Kopyalamayi engellemiyoruz -
// kopyanin ISE YARAMAMASINI sagliyoruz. Blurb, Shutterfly, Mixbook: hepsi boyle yapar.
//
// Ve filigrandan USTUNDUR: filigran urunu cirkinlestirir, satin alma arzusunu DUSURUR.
// Temiz onizleme urunu guzel gosterir, arzuyu YUKSELTIR.
//
// ---------------------------------------------------------------------------
// TAM EKRAN: dogrulanmis modal kabugu (TamEkranKatman) + DOKUNMATIGE UYGUN KONTROL.
//
// KOK NEDEN (duzeltilen): onceki tam ekran kendi "fixed inset-0" katmanini kuruyor,
// kapat (x) "absolute right-5 top-5" ile yerlesiyordu. Iki ayri kusur:
//   1) Ust atada backdrop-blur olan sayfada "fixed" o ataya gore konumlanip (x)
//      ekran disina tasiyordu (Portal.tsx'te yazili kural).
//   2) Kontroller acik renk ince cizgiydi; acik/soluk zemin uzerinde kayboluyordu.
//      Cevirme bolgeleri "opacity-0 hover:opacity-100" idi - DOKUNMATIKTE HOVER YOK,
//      yani telefonda HIC gorunmuyorlardi. Masaustu-ozel bir cozumdu.
//
// COZUM (kokten):
//   - Tam ekran, projenin dogrulanmis kabugu TamEkranKatman'a tasindi (Portal + ESC +
//     odak tuzagi + odak iadesi + scroll kilidi kabuktan gelir).
//   - Zemin immersif KOYU (koyuZemin) - sayfa one cikar, kontroller okunur.
//   - Butun kontroller KATI, HER ZAMAN GORUNUR cip: murekkep dolgu + parsomen ikon +
//     golge + ince halka. murekkep ile parsomen tema ne olursa olsun BIRBIRININ ZITTI,
//     yani cip her iki temada da kendi icinde kontrastli ve zeminden ayrisir.
//   - Dokunmatik icin GORUNUR ALT GEZINME CUBUGU (onceki - sayfa - sonraki). Kenar
//     dokunma bolgeleri masaustu icin bonus olarak kalir; birincil gorunur denetim
//     alt cubuktur.
//
// Kagit (sayfa gorseli + kenar cevirme bolgeleri) TEK KAYNAK bir ic bilesende: inline
// ve tam ekran AYNI koddan beslenir, iki yerde ayrisan davranis olusamaz.
export function DefterOnizleme() {
  const [bilgi, setBilgi] = useState<OnizlemeBilgi | null>(null);
  const [sayfa, setSayfa] = useState(0);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState("");
  const [hataKodu, setHataKodu] = useState("");
  const [tamEkran, setTamEkran] = useState(false);

  useEffect(() => {
    void (async () => {
      const c = await onizlemeBilgi();
      if (c.ok) setBilgi(c.veri);
      else { setHata(c.mesaj); setHataKodu(c.hata); }
      setYukleniyor(false);
    })();
  }, []);

  const ileri = useCallback(() => {
    setSayfa((s) => (bilgi && s < bilgi.sayfa_sayisi - 1 ? s + 1 : s));
  }, [bilgi]);

  const geri = useCallback(() => {
    setSayfa((s) => (s > 0 ? s - 1 : s));
  }, []);

  // Klavye: ok tuslariyla sayfa cevir (masaustu okuma hissi), iki modda da.
  // ESC ARTIK BURADA DEGIL: tam ekran kabugu (TamEkranKatman) sahiplenir.
  useEffect(() => {
    function tus(e: KeyboardEvent) {
      if (e.key === "ArrowRight") ileri();
      if (e.key === "ArrowLeft") geri();
    }
    window.addEventListener("keydown", tus);
    return () => window.removeEventListener("keydown", tus);
  }, [ileri, geri]);

  if (yukleniyor) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center rounded-3xl border border-ayrac bg-yuzey">
        <p className="font-govde text-sm text-ikincil">Defteriniz hazırlanıyor...</p>
      </div>
    );
  }

  if (hata || !bilgi) {
    // DURUSTLUK: ipucu satiri ARTIK KOSULLU. Onceden her hatada "en az bir dilek
    // eklemeniz gerekir" yaziyordu; 500/402 gibi ilgisiz hatalarda kullaniciyi
    // yanlis yere yonlendiriyordu (teshis kaybi).
    const dilekYok = hataKodu === "DILEK_YOK";
    return (
      <div className="rounded-3xl border border-dashed border-ayrac bg-parsomen px-6 py-12 text-center">
        <p className="font-govde text-sm text-ikincil">
          {hata || "Önizleme hazırlanamadı."}
        </p>
        {dilekYok ? (
          <p className="mt-1.5 font-govde text-xs text-ikincil">
            Esere en az bir dilek eklemeniz gerekir.
          </p>
        ) : (
          <p className="mt-1.5 font-govde text-xs text-ikincil">
            Sorun sürerse sayfayı yenile; devam ederse bize bildir.
          </p>
        )}
      </div>
    );
  }

  const sonSayfa = bilgi.sayfa_sayisi - 1;

  return (
    <div className="space-y-4">
      {/* INLINE KAGIT - gercek defterin kendisi, sayfa akisinda */}
      <Kagit
        sayfa={sayfa}
        sonSayfa={sonSayfa}
        ileri={ileri}
        geri={geri}
        tamEkran={false}
      />

      {/* TAM EKRAN - dogrulanmis kabuk + immersif koyu zemin + katI gorunur kontrol */}
      <TamEkranKatman
        acik={tamEkran}
        onKapat={() => setTamEkran(false)}
        etiket="Defter önizleme"
        koyuZemin
      >
        <div
          className="mx-auto flex w-full max-w-3xl flex-col items-center gap-5"
          // Kagit uzerinde metin secip fareyi zemine birakinca pencere kapanmasin.
          onMouseDown={(e) => e.stopPropagation()}
        >
          {/* Sayfa + kose kapatma dugmesi. Sarmalayici w-fit: (x) tam sayfa
              kosesine oturur, notch'un altinda kalir. */}
          <div className="relative mx-auto w-fit max-w-full">
            <Kagit
              sayfa={sayfa}
              sonSayfa={sonSayfa}
              ileri={ileri}
              geri={geri}
              tamEkran
            />
            <button
              type="button"
              onClick={() => setTamEkran(false)}
              className="absolute right-2 top-2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-murekkep/90 text-parsomen shadow-lg ring-1 ring-parsomen/30 backdrop-blur-sm transition-transform hover:scale-105 active:scale-95"
              aria-label="Kapat"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
                <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {/* GORUNUR ALT GEZINME - dokunmatikte tek birincil denetim. Katı cipler. */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={geri}
              disabled={sayfa === 0}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-murekkep/90 text-parsomen shadow-lg ring-1 ring-parsomen/25 transition-transform hover:scale-105 active:scale-95 disabled:opacity-30 disabled:hover:scale-100"
              aria-label="Önceki sayfa"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
                <path d="m15 5-7 7 7 7" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
              </svg>
            </button>

            <span className="rounded-full bg-murekkep/90 px-4 py-2 font-govde text-xs tabular-nums text-parsomen shadow-lg ring-1 ring-parsomen/25">
              {sayfa + 1} / {bilgi.sayfa_sayisi}
            </span>

            <button
              type="button"
              onClick={ileri}
              disabled={sayfa >= sonSayfa}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-murekkep/90 text-parsomen shadow-lg ring-1 ring-parsomen/25 transition-transform hover:scale-105 active:scale-95 disabled:opacity-30 disabled:hover:scale-100"
              aria-label="Sonraki sayfa"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
                <path d="m9 5 7 7-7 7" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
              </svg>
            </button>
          </div>
        </div>
      </TamEkranKatman>

      {/* Kumanda - inline mod */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={geri}
          disabled={sayfa === 0}
          className="rounded-full border border-ayrac px-4 py-2 font-govde text-xs text-ikincil transition-colors hover:border-murekkep hover:text-murekkep disabled:opacity-30"
        >
          Önceki
        </button>

        <div className="flex items-center gap-2">
          <span className="font-govde text-xs tabular-nums text-ikincil">
            {sayfa + 1} / {bilgi.sayfa_sayisi}
          </span>
          <button
            type="button"
            onClick={() => setTamEkran(true)}
            className="rounded-full border border-ayrac p-1.5 text-ikincil transition-colors hover:border-sarap hover:text-sarap"
            aria-label="Tam ekran"
            title="Tam ekran"
          >
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" aria-hidden>
              <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </svg>
          </button>
        </div>

        <button
          type="button"
          onClick={ileri}
          disabled={sayfa >= sonSayfa}
          className="rounded-full border border-ayrac px-4 py-2 font-govde text-xs text-ikincil transition-colors hover:border-murekkep hover:text-murekkep disabled:opacity-30"
        >
          Sonraki
        </button>
      </div>

      {/* Sayfa seridi - hizli gezinme */}
      {bilgi.sayfa_sayisi > 1 && (
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {Array.from({ length: bilgi.sayfa_sayisi }).map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setSayfa(i)}
              className={`h-1.5 shrink-0 rounded-full transition-all ${
                i === sayfa ? "w-6 bg-sarap" : "w-1.5 bg-ayrac hover:bg-ikincil/40"
              }`}
              aria-label={`Sayfa ${i + 1}`}
            />
          ))}
        </div>
      )}

      {/* DURUST COZUNURLUK ANLATIMI.
          Saklamak yerine acikca soylemek hem guven verir hem FARKI HISSETTIRIR:
          "demek ki bastigim sey daha da iyi olacak." Bu, satisin kendisidir. */}
      <div className="rounded-2xl border border-ayrac bg-parsomen p-4">
        <p className="font-govde text-[0.66rem] uppercase tracking-etiket text-ikincil">
          Gördüğünüz nedir?
        </p>
        <p className="metin-yasli mt-1.5 font-govde text-xs leading-relaxed text-ikincil">
          Bu, defterinizin{" "}
          <span className="font-medium text-murekkep">birebir aynısıdır</span> — aynı
          tipografi, aynı sayfa düzeni, aynı yerleşim. Tek fark çözünürlük: burada
          ekran kalitesi ({bilgi.onizleme_dpi} DPI) görüyorsunuz.
        </p>
        <p className="metin-yasli mt-1.5 font-govde text-xs leading-relaxed text-ikincil">
          Baskıya hazır nüsha{" "}
          <span className="font-medium text-murekkep">{bilgi.baski_dpi} DPI</span>'dır —
          kâğıtta keskin, net, kitap kalitesinde. Yaldız çizgiler ince kalır, yazı
          kenarları dağılmaz.
        </p>
      </div>
    </div>
  );
}

// KAGIT - sayfa gorseli + kenar cevirme bolgeleri. TEK KAYNAK: inline ve tam ekran
// ayni bilesenden beslenir. Tek fark boyutlama: inline dar (max-w-md), tam ekran
// gorunum yuksekligine sigar (max-h-[72vh]) ve kenar bolgeleri gorsele hizali kalir
// (w-fit). Kenar cevirme bolgeleri masaustunde hover ile belirir; dokunmatikte
// birincil gorunur denetim tam ekrandaki alt gezinme cubugudur.
function Kagit({
  sayfa,
  sonSayfa,
  ileri,
  geri,
  tamEkran,
}: {
  sayfa: number;
  sonSayfa: number;
  ileri: () => void;
  geri: () => void;
  tamEkran: boolean;
}) {
  return (
    <div className={`relative mx-auto ${tamEkran ? "w-fit max-w-full" : "max-w-md"}`}>
      {/* KITAP GOLGESI - bir dosyaya degil, bir ESERE bakiyorsunuz hissi.
          Fiziksel baski satisina da kopru: bu bir kitap. */}
      <div
        className="overflow-hidden rounded-r-lg rounded-l-sm bg-[#fdf9f0] shadow-[0_18px_50px_-12px_rgba(33,26,23,0.45),-3px_0_0_0_rgba(33,26,23,0.08),-6px_0_0_0_rgba(33,26,23,0.04)]"
        // SAG TIK KAPALI: kesin cozum degil (ekran goruntusu hep alinabilir),
        // ama surtunme yaratir. Asil koruma COZUNURLUK - 96 DPI bir goruntu
        // kagitta ise yaramaz.
        onContextMenu={(e) => e.preventDefault()}
      >
        <img
          src={onizlemeSayfaUrl(sayfa)}
          alt={`Sayfa ${sayfa + 1}`}
          className={`block select-none ${tamEkran ? "mx-auto max-h-[72vh] w-auto" : "w-full"}`}
          draggable={false}
          onDragStart={(e) => e.preventDefault()}
        />
      </div>

      {/* Sayfa cevirme - kagidin kenarlarinda, kitap gibi (masaustu bonus) */}
      {sayfa > 0 && (
        <button
          type="button"
          onClick={geri}
          className="absolute left-0 top-0 flex h-full w-1/4 cursor-w-resize items-center justify-start pl-1 opacity-0 transition-opacity hover:opacity-100"
          aria-label="Önceki sayfa"
        >
          <span className="rounded-full bg-murekkep/70 p-2 text-parsomen backdrop-blur">
            <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
              <path d="m15 5-7 7 7 7" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </svg>
          </span>
        </button>
      )}

      {sayfa < sonSayfa && (
        <button
          type="button"
          onClick={ileri}
          className="absolute right-0 top-0 flex h-full w-1/4 cursor-e-resize items-center justify-end pr-1 opacity-0 transition-opacity hover:opacity-100"
          aria-label="Sonraki sayfa"
        >
          <span className="rounded-full bg-murekkep/70 p-2 text-parsomen backdrop-blur">
            <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
              <path d="m9 5 7 7-7 7" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </svg>
          </span>
        </button>
      )}
    </div>
  );
}
