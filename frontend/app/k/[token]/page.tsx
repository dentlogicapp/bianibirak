"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api, type KatkiKarsilama } from "@/lib/api";
import { MarkaKilidi } from "@/components/marka/MarkaKilidi";
import { DavetliEkrani, TesekkurEkrani } from "@/components/site/DavetliEkrani";

export default function KatkiSayfasi() {
  const params = useParams();
  const token = String(params.token || "");
  const [veri, setVeri] = useState<KatkiKarsilama | null>(null);
  const [durum, setDurum] = useState<"yukleniyor" | "hazir" | "gecersiz">("yukleniyor");
  const [gonderildi, setGonderildi] = useState(false);

  useEffect(() => {
    if (!token) return;
    api.katkiKarsilama(token).then((c) => {
      if (c.ok) {
        setVeri(c.veri);
        setDurum("hazir");
      } else {
        setDurum("gecersiz");
      }
    });
  }, [token]);

  if (durum === "yukleniyor") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-parsomen font-govde text-sm text-ikincil">
        Yükleniyor...
      </main>
    );
  }

  if (durum === "gecersiz" || !veri) {
    return (
      <EkranKabuk>
        <p className="font-display text-xl text-murekkep">Bağlantı bulunamadı</p>
        <p className="mt-3 font-govde text-sm text-ikincil">
          Bu bağlantı geçersiz veya kaldırılmış olabilir.
        </p>
      </EkranKabuk>
    );
  }

  const ciftAdi = `${veri.es1_ad} & ${veri.es2_ad}`;

  // Kapali etkinlik - nazik ekran
  if (veri.kapandi) {
    return (
      <EkranKabuk>
        <p className="font-govde text-xs uppercase tracking-etiket text-yaldiz">
          {ciftAdi}
        </p>
        <p className="mt-4 font-display text-xl text-murekkep">Defter kapandı</p>
        <p className="mt-3 font-govde text-sm text-ikincil">
          Bu anı defteri artık yeni dilek almıyor. İlginiz için teşekkürler.
        </p>
      </EkranKabuk>
    );
  }

  // Henuz acilmamis
  if (!veri.acildi) {
    return (
      <EkranKabuk>
        <p className="font-govde text-xs uppercase tracking-etiket text-yaldiz">
          {ciftAdi}
        </p>
        <p className="mt-4 font-display text-xl text-murekkep">Çok yakında</p>
        <p className="mt-3 font-govde text-sm text-ikincil">
          Bu defter henüz açılmadı. Birazdan tekrar uğrayın.
        </p>
      </EkranKabuk>
    );
  }

  // TESEKKUR + SATIS MOTORU
  if (gonderildi) {
    return <TesekkurEkrani ciftAdi={ciftAdi} tur={veri.tur} />;
  }

  // Katki formu
  return (
    <DavetliEkrani token={token} veri={veri} onGonderildi={() => setGonderildi(true)} />
  );
}

// ---- Ekran kabugu (davetli icin sade, marka anI) ----
function EkranKabuk({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-parsomen px-6 py-16">
      <div className="w-full max-w-md text-center">
        <div className="mb-8 flex justify-center">
          <MarkaKilidi varyant="tam" boyut="kucuk" />
        </div>
        <div className="rounded-3xl border border-ayrac bg-yuzey p-8">{children}</div>
      </div>
    </main>
  );
}

// ---- Katki formu ----