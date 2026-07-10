"use client";

import { useEffect, useRef, useState } from "react";

// Otomatik kaydetme durumu (gosterge icin).
export type OtoKayitDurum = "bos" | "yaziliyor" | "kaydediliyor" | "kaydedildi" | "hata";

// Otomatik kaydetme hook'u (planlama deseni):
// - deger degisince `gecikme` ms debounce; sonra kaydeder.
// - kaydet butonu YOK; her alan degisimi otomatik yazilir.
// - durum gostergesi doner ("Kaydediliyor..." / "Kaydedildi").
//
// izle: JSON.stringify(degerler) gibi degisimi yakalayan string.
// degistiMi: kaydedilecek fark var mi (ilk yuklemede false).
// kaydet: async () => boolean (basari) - gercek API cagrisi.
export function useOtoKaydet(
  izle: string,
  degistiMi: boolean,
  kaydet: () => Promise<boolean>,
  gecikme = 1200
): OtoKayitDurum {
  const [durum, setDurum] = useState<OtoKayitDurum>("bos");
  const ilkRef = useRef(true);
  const zamanRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Ilk render'da (mount) kaydetme - sadece kullanici degisikliginde.
    if (ilkRef.current) {
      ilkRef.current = false;
      return;
    }
    if (!degistiMi) return;

    setDurum("yaziliyor");
    if (zamanRef.current) clearTimeout(zamanRef.current);
    zamanRef.current = setTimeout(async () => {
      setDurum("kaydediliyor");
      const ok = await kaydet();
      setDurum(ok ? "kaydedildi" : "hata");
      if (ok) {
        // "Kaydedildi" kisa sure gorunsun, sonra soluklas
        setTimeout(() => setDurum((d) => (d === "kaydedildi" ? "bos" : d)), 2000);
      }
    }, gecikme);

    return () => {
      if (zamanRef.current) clearTimeout(zamanRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [izle]);

  return durum;
}

// Durum -> Turkce etiket + renk sinifi (gosterge icin).
export function otoKayitEtiket(durum: OtoKayitDurum): { metin: string; sinif: string } | null {
  switch (durum) {
    case "yaziliyor":
      return { metin: "Yazılıyor...", sinif: "text-ikincil" };
    case "kaydediliyor":
      return { metin: "Kaydediliyor...", sinif: "text-yaldiz" };
    case "kaydedildi":
      return { metin: "Kaydedildi", sinif: "text-yaldiz" };
    case "hata":
      return { metin: "Kaydedilemedi - bağlantını kontrol et", sinif: "text-sarap" };
    default:
      return null;
  }
}
