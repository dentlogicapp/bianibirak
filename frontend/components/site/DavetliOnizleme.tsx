"use client";

import { useEffect, useRef, useState } from "react";

// DAVETLI EKRANI ONIZLEMESI - GERCEK sayfanin kendisi.
//
// NEDEN TAKLIT DEGIL, GERCEK:
// Onceki iki surumde onizleme, davetli ekranini "taklit eden" ayri bir dizgiydi.
// Her seferinde ayristi: once film seridi yoktu, sonra form yoktu, sonra tipografi
// kaydi. Iki ayri dizgi tutmak, kacinilmaz olarak yalan soyleyen bir onizleme
// uretir - ve cift, gonderdigi linkin nasil gorunecegini YANLIS bilir.
//
// Cozum: davetli sayfasinin KENDISINI goster. Ayrisma matematiksel olarak imkansiz;
// cunku iki sey degil, TEK sey var.
//
// OLCEK STABILITESI (ikinci kok sorun):
// Onizleme, kapsayicinin genisligine gore akiyordu. Fotograf yuklenince film seridi
// genisliyor, dar ekranda tasip sayfayi daginik gosteriyordu. Simdi ic genislik
// SABIT (CIHAZ_GENISLIK = 390px, referans telefon). Kapsayici ne kadar dar olursa
// olsun icerik BOZULMAZ; yalnizca olceklenir. Fotograf sayisi, metin uzunlugu,
// hicbir sey bu olcegi degistiremez - matematiksel olarak sabittir.

const CIHAZ_GENISLIK = 390; // referans telefon genisligi (iPhone 14/15 sinifi)
const CIHAZ_YUKSEKLIK = 780;

export function DavetliOnizleme({
  token,
  yenilemeAnahtari,
}: {
  token: string | null;
  // Bu deger degisince onizleme yenilenir (oto-kaydet sonrasi).
  yenilemeAnahtari: string;
}) {
  const kapRef = useRef<HTMLDivElement>(null);
  const [olcek, setOlcek] = useState(1);
  const [sr, setSr] = useState(0); // iframe yeniden yukleme sayaci

  // Kapsayici genisligine gore olcek: icerik SABIT 390px, kutu ne olursa olsun sigar
  useEffect(() => {
    const kap = kapRef.current;
    if (!kap) return;

    function olcegiKur() {
      const genislik = kap!.clientWidth;
      if (genislik > 0) setOlcek(Math.min(genislik / CIHAZ_GENISLIK, 1));
    }

    olcegiKur();
    const gozlemci = new ResizeObserver(olcegiKur);
    gozlemci.observe(kap);
    return () => gozlemci.disconnect();
  }, []);

  // Degisiklikler kaydedildikce onizlemeyi tazele (gereksiz yeniden yukleme yok:
  // yalniz anahtar degisince).
  useEffect(() => {
    if (!token) return;
    const zaman = setTimeout(() => setSr((s) => s + 1), 900);
    return () => clearTimeout(zaman);
  }, [yenilemeAnahtari, token]);

  if (!token) {
    return (
      <div className="rounded-3xl border border-dashed border-ayrac bg-parsomen px-6 py-16 text-center">
        <p className="font-govde text-sm text-ikincil">
          Paylaşım bağlantın hazırlanıyor...
        </p>
      </div>
    );
  }

  return (
    <div ref={kapRef} className="min-w-0">
      {/* CIHAZ CERCEVESI - "davetli bunu boyle gorecek" */}
      <div
        className="relative mx-auto overflow-hidden rounded-[2rem] border-[7px] border-murekkep bg-murekkep shadow-[0_16px_44px_rgba(33,26,23,0.22)]"
        style={{
          width: CIHAZ_GENISLIK * olcek + 14,
          height: CIHAZ_YUKSEKLIK * olcek + 14,
        }}
      >
        {/* Ic yuzey: SABIT olculerde cizilir, sonra olceklenir.
            Kapsayici darlasinca icerik kuculur - AKMAZ, BOZULMAZ. */}
        <div
          className="overflow-hidden rounded-[1.6rem] bg-parsomen"
          style={{
            width: CIHAZ_GENISLIK,
            height: CIHAZ_YUKSEKLIK,
            transform: `scale(${olcek})`,
            transformOrigin: "top left",
          }}
        >
          <iframe
            key={sr}
            src={`/k/${token}?onizleme=1`}
            title="Davetli ekranı önizlemesi"
            className="h-full w-full border-0"
            // Davetli sayfasi kendi icinde calisir; bu bir GORUNTU'dur, etkilesim
            // beklenmez. Ayni kokendir - ek izin gerekmez.
            scrolling="yes"
          />
        </div>
      </div>

      <p className="mt-3 text-center font-govde text-[0.68rem] text-ikincil">
        Davetlinin gördüğü ekranın kendisi - bağlantıyı açtığında bunu görecek.
      </p>
    </div>
  );
}
