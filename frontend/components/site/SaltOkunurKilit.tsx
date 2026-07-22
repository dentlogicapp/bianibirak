"use client";

import { useEffect, useState } from "react";

// SALT OKUNUR KILIT - inceleme oturumunda arayuzu DURUST hale getirir.
//
// ===================== NEDEN VAR =====================
//
// Backend zaten koruyordu: goruntuleme_modu=true iken her yazim 403 doner ve
// veritabaninda hicbir sey degismez (canlida SQL ile dogrulandi - ayar satirinin
// updated_at'i kilini kipirdatmadi).
//
// Ama ARAYUZ YALAN SOYLUYORDU. Yonetici bir alana yaziyor, React degeri yerel
// state'te tutuyor, sunucu 403 donuyor ve ekranda degisiklik DURUYOR. Sayfa
// degistirip geri gelinceye kadar "degistirdim" saniyor.
//
// Bu bir kozmetik kusur degil: bir yonetim panelinde "yaptim sandim ama olmamis"
// hissi, guvenilmez arac demektir. Teshis icin girdigin bir defterde neyin gercek
// oldugunu bilmiyorsan, o defter hakkinda verdigin her karar supheye duser.
//
// KURAL: kullanicinin yapamayacagi bir seyi, yapabilirmis gibi gostermeyiz.
//
// ===================== NASIL =====================
//
// Uc katman, hepsi YAKALAMA (capture) fazinda - React'in kendi olay isleyicileri
// hic calismadan once kesilir. React state'ine dokunulmaz, hicbir sayfa dosyasi
// degistirilmez; bu yuzden calisan ekranlarda kirilma riski yok.
//
//   1. beforeinput - EN GUCLU KATMAN. Klavye, yapistirma, surukle-birak, mobil
//      klavye, IME (Turkce/emoji), otomatik doldurma - metin bir alana HANGI
//      yoldan girerse girsin bu olaydan gecer. Tek nokta, tam kapsama.
//   2. keydown     - Backspace/Delete/Enter ve Ctrl+V/X gibi beforeinput
//      uretmeyebilen tuslar. Gezinme tuslari (Tab, ok tuslari, Home/End) ve
//      KOPYALAMA (Ctrl+C, Ctrl+A) SERBEST - okumak ve alintilamak tesihisin
//      kendisidir, engellenmemeli.
//   3. click       - anahtar/onay kutusu/dosya secici gibi TIKLAMAYLA deger
//      degistiren ogeler. Duz butonlar serbest birakilir: sekme degistirmek,
//      bir fotografi buyutmek, sayfa gezinmek yazma degildir ve teshis icin
//      gereklidir. O yollardan bir yazim denenirse backend zaten 403 doner.
//
// Gorsel taraf: alanlar soluklasir, imlec "yasak" olur ve YAZI IMLECI GORUNMEZ
// (caret-color: transparent). Tiklayinca yanip sonen bir imlec gormek, "buraya
// yazabilirim" vaadidir - vaat edilmeyecekse gosterilmemeli.
//
// Metin SECILEBILIR kalir: yonetici bir dilegi ya da ayari kopyalayip destek
// yanitina yapistirabilmeli.
//
// ===================== NEDEN BILESEN ICI STIL =====================
//
// Stil globals.css yerine burada duruyor. Sebep kapsam degil RISK: globals.css
// 500 satirlik, canlida calisan ve bu isle ilgisi olmayan onlarca animasyon
// tasiyan bir dosya. Bes satirlik bir kural icin onu yeniden yazmak, ilgisiz bir
// yerde harf hatasi riskini davet etmek olurdu. Kurallar zaten tema
// degiskenlerine dayanmiyor - salt gecirgenlik ve imlec.

export function SaltOkunurKilit() {
  const [kilit, setKilit] = useState(false);

  // Inceleme oturumunda miyiz? Otorite SUNUCUDUR (JWT claim'inden turetilir);
  // istemcide tutulan bir bayrak degil.
  useEffect(() => {
    let iptal = false;
    (async () => {
      try {
        const y = await fetch("/api/ben", { credentials: "include", cache: "no-store" });
        if (!y.ok) return;
        const v = await y.json();
        if (!iptal) setKilit(v?.goruntuleme_modu === true);
      } catch {
        /* ag hatasi: kilit acilmaz. Backend zaten koruyor - burada sessiz kalmak,
           kullaniciyi gereksiz yere kilitlemekten iyidir. */
      }
    })();
    return () => { iptal = true; };
  }, []);

  useEffect(() => {
    if (!kilit) return;

    const kok = document.documentElement;
    kok.setAttribute("data-salt-okunur", "1");

    // Hedef bir GIRDI ALANI mi? contenteditable de dahil.
    function girdiMi(hedef: EventTarget | null): boolean {
      const o = hedef as HTMLElement | null;
      if (!o || !o.tagName) return false;
      const etiket = o.tagName.toLowerCase();
      if (etiket === "input" || etiket === "textarea" || etiket === "select") return true;
      return o.isContentEditable === true;
    }

    // ---- 1. beforeinput: metnin alana girdigi TEK gecit ----
    function girisOncesi(e: Event) {
      if (!girdiMi(e.target)) return;
      e.preventDefault();
      e.stopPropagation();
    }

    // ---- 2. keydown: beforeinput uretmeyen tuslar ----
    // Gezinme ve kopyalama SERBEST; okumak yazma degildir.
    const SERBEST_TUSLAR = new Set([
      "Tab", "Escape", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight",
      "Home", "End", "PageUp", "PageDown", "Shift", "Control", "Alt", "Meta",
    ]);

    function tus(e: KeyboardEvent) {
      if (!girdiMi(e.target)) return;
      if (SERBEST_TUSLAR.has(e.key)) return;
      // Kopyala / tumunu sec serbest - alintilamak tesihisin parcasi.
      if ((e.ctrlKey || e.metaKey) && (e.key === "c" || e.key === "a" || e.key === "C" || e.key === "A")) return;
      e.preventDefault();
      e.stopPropagation();
    }

    // ---- Yapistirma / kesme / surukle-birak ----
    function engelle(e: Event) {
      if (!girdiMi(e.target)) return;
      e.preventDefault();
      e.stopPropagation();
    }

    // ---- 3. click: tiklamayla deger degistiren ogeler ----
    // Duz butonlar (sekme, buyutme, gezinme) SERBEST - teshis icin gerekli.
    function tiklama(e: MouseEvent) {
      const o = e.target as HTMLElement | null;
      if (!o || !o.closest) return;
      const kapali = o.closest(
        'input[type="checkbox"],input[type="radio"],input[type="file"],select,[role="switch"]'
      );
      if (!kapali) return;
      e.preventDefault();
      e.stopPropagation();
    }

    // capture: true -> React'in isleyicileri CALISMADAN once keseriz.
    document.addEventListener("beforeinput", girisOncesi, true);
    document.addEventListener("keydown", tus, true);
    document.addEventListener("paste", engelle, true);
    document.addEventListener("cut", engelle, true);
    document.addEventListener("drop", engelle, true);
    document.addEventListener("click", tiklama, true);

    return () => {
      kok.removeAttribute("data-salt-okunur");
      document.removeEventListener("beforeinput", girisOncesi, true);
      document.removeEventListener("keydown", tus, true);
      document.removeEventListener("paste", engelle, true);
      document.removeEventListener("cut", engelle, true);
      document.removeEventListener("drop", engelle, true);
      document.removeEventListener("click", tiklama, true);
    };
  }, [kilit]);

  if (!kilit) return null;

  return (
    <style>{`
      html[data-salt-okunur="1"] input,
      html[data-salt-okunur="1"] textarea,
      html[data-salt-okunur="1"] select,
      html[data-salt-okunur="1"] [contenteditable="true"] {
        opacity: 0.55;
        cursor: not-allowed;
        /* Yanip sonen imlec "buraya yazabilirsin" vaadidir. Vaat yoksa imlec de yok. */
        caret-color: transparent;
      }
      /* Anahtarlar ve dosya secici de soluk - tiklama zaten kesiliyor,
         gorunum de aynisini SOYLEMELI. */
      html[data-salt-okunur="1"] [role="switch"],
      html[data-salt-okunur="1"] input[type="file"] {
        opacity: 0.55;
        cursor: not-allowed;
      }
      /* Metin SECILEBILIR kalir: yonetici bir dilegi ya da ayari kopyalayip
         destek yanitina yapistirabilmeli. Okumak yazma degildir. */
      html[data-salt-okunur="1"] input,
      html[data-salt-okunur="1"] textarea {
        user-select: text;
      }
    `}</style>
  );
}
