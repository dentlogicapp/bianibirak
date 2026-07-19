"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

// PORTAL - tam ekran katmanlari DOGRU yere tasir.
//
// PAHALI OGRENILEN HATA (canlida yakalandi):
// Modal, avatar menusunun icinde render ediliyordu. Menu de AppShell'in header'i
// icindedir ve o header'da "backdrop-blur" vardir.
//
// CSS kurali: backdrop-filter (ve transform, filter, perspective, will-change),
// icindeki "position: fixed" ogeler icin YENI BIR KONUMLANDIRMA BAGLAMI yaratir.
// Yani "fixed inset-0" artik EKRANA degil, o ince header seridine gore hesaplanir.
// Sonuc: tam ekran acilmasi gereken pencere, basligin icine sikisir ve ekranin
// disinda kalir - kullanici pencerenin yalnizca bir kirintisini gorur.
//
// Bu bir stil hatasi degil, YAPISAL bir hatadir: modalin DOM'da nerede durdugu
// meselesidir. Cozum de yapisaldir - katman document.body'ye tasinir. Boylece
// ustundeki hicbir ata onu etkileyemez.
//
// KURAL: tam ekran katmanlar (modal, sheet, onay penceresi) HER ZAMAN portal ile
// render edilir - ozellikle header/nav gibi blur veya transform tasiyan alanlarin
// icinde duruyorsa.
export function Portal({ children }: { children: React.ReactNode }) {
  const [hazir, setHazir] = useState(false);

  // Sunucuda document yoktur; yalnizca istemcide baglanir.
  useEffect(() => {
    setHazir(true);
  }, []);

  if (!hazir || typeof document === "undefined") return null;
  return createPortal(children, document.body);
}
