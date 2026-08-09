"use client";

import { useEffect, useState } from "react";

// CANLI SAAT - "simdi" TEK KAYNAK, tum geri sayimlar buradan beslenir.
//
// ===================== NEDEN VAR =====================
//
// defterDurumu() (lib/durum.ts) her cagrildiginda Date.now() okur: hesap DOGRUDUR,
// ama YALNIZCA cagrildigi an. Bir ekran acilip oylece durursa React yeniden render
// etmez, dolayisiyla o hesap bir daha yapilmaz ve ekran ACILDIGI ANIN degerini
// sonsuza dek gosterir.
//
// CANLIDA YAKALANDI: bildirim "kalici silinmeye 44 saat" derken, sabahtan beri acik
// duran "Dilek Bağlantısını Paylaş" ekrani hala "72 saat" gosteriyordu. Iki sayi da
// ayni imha aninden hesaplaniyordu; fark, birinin TAZE digerinin DONMUS olmasiydi.
//
// Bu bir VERI senkronu sorunu DEGILDIR - hicbir veri degismedi, yalnizca zaman akti.
// Damga tabanli senkron (lib/senkron.ts) bunu goremez: sunucuda degisen bir sey yok.
// Cozum, zamanin kendisini bir "degisim kaynagi" olarak kabul etmektir.
//
// ===================== TASARIM =====================
//
// - TEK zamanlayici, MODUL duzeyinde. On ekran useSimdi() cagirsa bile tarayicida
//   tek bir zincir doner; her bileseninin kendi setInterval'i OLMAZ (pil + tutarlilik).
// - TUM aboneler AYNI "simdi" degerini alir. Iki ekranin ayni anda farkli sayi
//   gostermesi artik yapisal olarak IMKANSIZ - ayni sayidan hesaplarlar.
// - setTimeout ZINCIRI (setInterval degil) - lib/senkron.ts ile ayni disiplin:
//   sekme donarsa istekler/tikler ust uste binmez.
// - Sekme gorunmuyorken tik DURUR (telefon cebindeyken pil harcamaz); gorunur olunca
//   ya da pencere odaga gelince ANINDA bir tik atilir - kullanici geri dondugunde
//   eski sayiyi bir an bile gormez.
// - SSR guvenli: window yoksa hicbir sey kurulmaz, ilk deger yine de dogrudur.
//
// ===================== KULLANIM =====================
//
//   const simdi = useSimdi();              // 30 sn'de bir tazelenir (varsayilan)
//   const durum = defterDurumu(etkinlik);  // artik canli
//
// Donen degeri kullanmak ZORUNLU degildir; cagirmak, bileseni canli tutmaya yeter.
// Ama bagimliligi acik yazmak icin hesaplarda kullanmak yeglenir (ornek: hedef - simdi).
//
// ARALIK NEDEN 30 SANIYE: gosterdigimiz en ince birim "saat"tir (lib/durum.ts
// kalanMetin). Saatte bir yeterli gorunur ama sinir aninda (ornek 48 -> 47 saat)
// kullanicinin gozunun onunde donmesi icin daha sik tazelenir. 30 sn, dakika/saniye
// gosteren sayaclara (destek silme sayaci gibi) da yeter ve maliyeti sifira yakindir:
// tek zamanlayici, ag istegi YOK, yalnizca yeniden render.

const ARALIK_MS = 30_000;

type Dinleyici = (simdi: number) => void;

const dinleyiciler = new Set<Dinleyici>();
let zaman: number | undefined;
let kuruldu = false;

function tik() {
  const simdi = Date.now();
  // Kopya uzerinde gez: bir dinleyici tik sirasinda abonelikten cikarsa
  // (bilesen unmount) dongu bozulmasin.
  for (const d of Array.from(dinleyiciler)) {
    try {
      d(simdi);
    } catch {
      /* bir bilesenin hatasi digerlerinin saatini durdurmasin */
    }
  }
}

function zamanla() {
  if (typeof window === "undefined") return;
  window.clearTimeout(zaman);
  zaman = window.setTimeout(() => {
    if (document.visibilityState === "visible") tik();
    zamanla();
  }, ARALIK_MS);
}

function anindaTik() {
  if (typeof document === "undefined") return;
  if (document.visibilityState !== "visible") return;
  tik();
  zamanla(); // odaga donuste zinciri de tazele (bir sonraki tik tam aralik sonra)
}

// Zamanlayici + olay dinleyicileri BIR KEZ kurulur; ilk abone geldiginde.
// Uygulama omru boyunca yasar (AppShell zaten kalicidir), bu yuzden sokulmez -
// sokup takmak, sekmeler arasi gecislerde gereksiz tik kaybi uretirdi.
function kur() {
  if (kuruldu || typeof window === "undefined") return;
  kuruldu = true;
  document.addEventListener("visibilitychange", anindaTik);
  window.addEventListener("focus", anindaTik);
  zamanla();
}

// ---------------------------------------------------------------------------
// SIMDI - canli zaman damgasi.
//
// Bu hook'u cagiran her bilesen, saat ilerledikce kendiliginden yeniden render olur.
// Geri sayim / kalan sure / "N saat sonra" gosteren HER ekran bunu cagirmalidir.
export function useSimdi(): number {
  const [simdi, setSimdi] = useState<number>(() => Date.now());

  useEffect(() => {
    kur();
    const dinleyici: Dinleyici = (yeni) => setSimdi(yeni);
    dinleyiciler.add(dinleyici);

    // Abone olur olmaz bir kez tazele: bilesen, sekme uzun sure gizli kaldiktan
    // sonra monte edilmis olabilir ve elindeki ilk deger eskimis olabilir.
    setSimdi(Date.now());

    return () => {
      dinleyiciler.delete(dinleyici);
    };
  }, []);

  return simdi;
}
