"use client";

import { useEffect, useState } from "react";

// SALT OKUNUR OTURUM BAYRAGI - tek kaynak.
//
// ===================== NEDEN HOOK =====================
//
// SaltOkunurKilit bileseni DOM duzeyinde metin girisini keser (beforeinput,
// keydown, paste, drop) ve girdi alanlarini soluklastirir. Ama BUTONLARA
// dokunamaz - ve dokunmamalidir:
//
//   "Sonraki sayfa" bir butondur, calismalidir.
//   "Sablonu degistir" de bir butondur, calismamalidir.
//
// Hicbir genel DOM kurali bu ikisini ayirt edemez; o ayrimi yalnizca sayfanin
// KENDISI bilir. Bu yuzden sayfalar bayragi okur ve YAZMA yapan butonlari
// disabled eder; okuma/gezinme butonlarina dokunmaz.
//
// ===================== NEDEN ONBELLEK =====================
//
// Uc tuketici var (kilit bileseni + iki sayfa) ve hepsi ayni soruyu soruyor.
// Onbelleksiz her biri /api/ben cagirirdi: ayni yanit icin uc istek, ustelik
// sayfa gecislerinde tekrar tekrar. Modul duzeyinde tek bir Promise tutulur;
// ilk soran cagriyi baslatir, digerleri ayni yanita baglanir.
//
// TAM SAYFA YENILEMEDE sifirlanir - ki zaten goruntuleme moduna girmek ve
// cikmak tam yenileme ile olur (JWT degisir). Yani bayrak asla eskimez.
//
// OTORITE SUNUCUDUR: deger JWT claim'inden turetilir (/api/ben -> goruntuleme_modu).
// Istemcide tutulan bir bayrak degildir; kullanici onu degistiremez. Zaten
// degistirse bile backend her yazimi 403 doner - bu katman ARAYUZUN DURUST
// OLMASI icindir, guvenlik icin degil.

let onbellek: Promise<boolean> | null = null;

function sor(): Promise<boolean> {
  if (onbellek) return onbellek;
  onbellek = (async () => {
    try {
      const y = await fetch("/api/ben", { credentials: "include", cache: "no-store" });
      if (!y.ok) return false;
      const v = await y.json();
      return v?.goruntuleme_modu === true;
    } catch {
      // Ag hatasi: kilit ACILMAZ. Backend zaten koruyor; kullaniciyi gereksiz
      // yere kilitlemektense arayuzu normal birakmak dogrudur.
      onbellek = null; // tekrar denenebilsin
      return false;
    }
  })();
  return onbellek;
}

export function useSaltOkunur(): boolean {
  const [deger, setDeger] = useState(false);

  useEffect(() => {
    let iptal = false;
    void sor().then((v) => {
      if (!iptal) setDeger(v);
    });
    return () => { iptal = true; };
  }, []);

  return deger;
}
