"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { kisaKodCoz } from "@/lib/api";
import { MarkaKilidi } from "@/components/marka/MarkaKilidi";

// /d/{kod} - davetiye karekodunun gittigi kisa adres.
//
// Karekod uzun token yerine bu kisa kodu tasir (kucuk basildiginda okunsun diye).
// Burada kod tokene cozulur ve davetli karsilama sayfasina (/k/{token}) gecilir.
//
// Markali bir an: davetli, dilek birakma sayfasina gecerken bir kirilma degil, bir
// karsilama gorur. replace() kullanilir - geri tusu bu ara sayfaya donmesin.
export default function KisaKodYonlendir() {
  const params = useParams();
  const kod = typeof params.kod === "string" ? params.kod : "";
  const [durum, setDurum] = useState<"cozuluyor" | "bulunamadi">("cozuluyor");

  useEffect(() => {
    if (!kod) {
      setDurum("bulunamadi");
      return;
    }
    let iptal = false;
    kisaKodCoz(kod).then((token) => {
      if (iptal) return;
      if (token) {
        window.location.replace(`/k/${token}`);
      } else {
        setDurum("bulunamadi");
      }
    });
    return () => {
      iptal = true;
    };
  }, [kod]);

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
      <MarkaKilidi varyant="tam" boyut="orta" />

      {durum === "cozuluyor" ? (
        <p className="mt-8 font-govde text-sm text-ikincil">Karşılama sayfası açılıyor…</p>
      ) : (
        <div className="mt-8 max-w-sm">
          <p className="font-serif text-lg text-murekkep">Bu bağlantı bulunamadı</p>
          <p className="mt-2 font-govde text-sm text-ikincil">
            Karekod geçersiz veya süresi dolmuş olabilir. Bağlantıyı paylaşan çiftle
            iletişime geçebilirsin.
          </p>
        </div>
      )}
    </div>
  );
}
