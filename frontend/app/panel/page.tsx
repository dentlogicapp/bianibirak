"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, type Kullanici } from "@/lib/api";
import { MarkaKilidi } from "@/components/marka/MarkaKilidi";

// 0B korumali panel stub. Gercek koruma backend'de (/api/ben); burada UI kapisi.
export default function PanelSayfasi() {
  const router = useRouter();
  const [kullanici, setKullanici] = useState<Kullanici | null>(null);
  const [durum, setDurum] = useState<"yukleniyor" | "hazir">("yukleniyor");

  useEffect(() => {
    api.ben().then((cevap) => {
      if (cevap.ok) {
        setKullanici(cevap.veri);
        setDurum("hazir");
      } else {
        router.replace("/giris");
      }
    });
  }, [router]);

  async function cikis() {
    await api.cikis();
    router.push("/giris");
  }

  if (durum !== "hazir" || !kullanici) {
    return (
      <main className="flex min-h-screen items-center justify-center font-govde text-sm text-ikincil">
        Yükleniyor...
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-icerik px-6 py-16">
      <div className="flex items-center justify-between">
        <MarkaKilidi varyant="wordmark" boyut="kucuk" />
        <button
          onClick={cikis}
          className="rounded-full border border-ayrac px-5 py-2 font-govde text-sm text-ikincil transition-colors hover:text-sarap"
        >
          Çıkış yap
        </button>
      </div>

      <div className="mt-10 rounded-3xl border border-ayrac bg-yuzey p-8">
        <p className="font-govde text-xs uppercase tracking-etiket text-yaldiz">Panel</p>
        <h1 className="mt-3 font-display text-2xl text-murekkep">
          Merhaba {kullanici.ad}
        </h1>
        <p className="mt-2 font-govde text-sm text-ikincil">{kullanici.email}</p>
        <p className="mt-6 font-govde text-sm leading-relaxed text-ikincil">
          Kimlik uçtan uca çalışıyor. Etkinlik kurulumu, çift-link/QR, onay kuyruğu ve
          kürasyon stüdyosu sonraki aşamalarda bu panele eklenecek.
        </p>
      </div>
    </main>
  );
}
