"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, type Etkinlik } from "@/lib/api";
import { MarkaKilidi } from "@/components/marka/MarkaKilidi";

// 0C aktif etkinlik ekrani. Tenant guard'li /api/etkinlik/aktif'ten beslenir.
// Sureli yasam dongusu sayaci ve zengin cila (KVKK/koyu mod) sonraki asamada buraya oturur.
export default function AktifEtkinlikSayfasi() {
  const router = useRouter();
  const [etkinlik, setEtkinlik] = useState<Etkinlik | null>(null);
  const [durum, setDurum] = useState<"yukleniyor" | "hazir" | "yok">("yukleniyor");

  useEffect(() => {
    api.etkinlikAktif().then((cevap) => {
      if (cevap.ok) {
        setEtkinlik(cevap.veri);
        setDurum("hazir");
      } else if (cevap.durum === 401) {
        router.replace("/giris");
      } else {
        // aktif etkinlik secili degil -> panele don
        setDurum("yok");
      }
    });
  }, [router]);

  if (durum === "yukleniyor") {
    return (
      <main className="flex min-h-screen items-center justify-center font-govde text-sm text-ikincil">
        Yükleniyor...
      </main>
    );
  }

  if (durum === "yok" || !etkinlik) {
    return (
      <main className="mx-auto max-w-icerik px-6 py-16 text-center">
        <p className="font-govde text-sm text-ikincil">
          Aktif bir etkinlik seçili değil.
        </p>
        <button
          onClick={() => router.push("/panel")}
          className="mt-6 rounded-full bg-sarap px-7 py-3 font-govde text-sm font-medium text-parsomen transition-colors hover:bg-sarapKoyu"
        >
          Panele dön
        </button>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-icerik px-6 py-16">
      <div className="flex items-center justify-between">
        <MarkaKilidi varyant="wordmark" boyut="kucuk" />
        <button
          onClick={() => router.push("/panel")}
          className="rounded-full border border-ayrac px-5 py-2 font-govde text-sm text-ikincil transition-colors hover:text-sarap"
        >
          Panel
        </button>
      </div>

      <div className="mt-10 rounded-3xl border border-ayrac bg-yuzey p-8">
        <p className="font-govde text-xs uppercase tracking-etiket text-yaldiz">
          {turEtiketi(etkinlik.tur)} · {durumEtiketi(etkinlik.durum)}
        </p>
        <h1 className="mt-3 font-display text-3xl text-murekkep">
          {etkinlik.es1_ad} &amp; {etkinlik.es2_ad}
        </h1>
        <p className="mt-2 font-govde text-sm text-ikincil">
          Etkinlik tarihi: {etkinlik.etkinlik_tarihi}
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-ayrac bg-parsomen p-5">
            <p className="font-govde text-xs uppercase tracking-etiket text-ikincil">
              Erişim açılışı
            </p>
            <p className="mt-1 font-govde text-sm text-murekkep">
              {tarihMetni(etkinlik.acilis_tarihi)}
            </p>
          </div>
          <div className="rounded-2xl border border-ayrac bg-parsomen p-5">
            <p className="font-govde text-xs uppercase tracking-etiket text-ikincil">
              Erişim kapanışı
            </p>
            <p className="mt-1 font-govde text-sm text-murekkep">
              {tarihMetni(etkinlik.kapanis_tarihi)}
            </p>
          </div>
        </div>

        <p className="mt-8 font-govde text-sm leading-relaxed text-ikincil">
          Çift-link/QR üretimi, davetli katkı toplama, onay kuyruğu ve kürasyon stüdyosu
          sonraki aşamalarda bu ekrana eklenecek. Süreli geri sayım da buraya oturacak.
        </p>
      </div>
    </main>
  );
}

function turEtiketi(tur: string): string {
  if (tur === "dugun") return "Düğün";
  if (tur === "nisan") return "Nişan";
  if (tur === "nikah") return "Nikah";
  return tur;
}

function durumEtiketi(durum: string): string {
  if (durum === "hazirlik") return "Hazırlık";
  if (durum === "aktif") return "Aktif";
  if (durum === "kapali") return "Kapalı";
  if (durum === "arsiv") return "Arşiv";
  return durum;
}

function tarihMetni(iso: string): string {
  const t = new Date(iso);
  if (isNaN(t.getTime())) return iso;
  return t.toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
