"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, type Etkinlik } from "@/lib/api";
import { AppShell } from "@/components/site/AppShell";

// Yonetim sayfasi (planlama deseni): yonetim araclari tek ekranda toplanir.
// Etkinlik & Gorunum + Denetim Gunlugu + "+ Esini Ekle" bari + es listesi.
export default function YonetimSayfasi() {
  const router = useRouter();
  const [etkinlik, setEtkinlik] = useState<Etkinlik | null>(null);
  const [esKatildi, setEsKatildi] = useState(false);
  const [hedefRol, setHedefRol] = useState("");
  const [durum, setDurum] = useState<"yukleniyor" | "hazir" | "yok">("yukleniyor");

  useEffect(() => {
    (async () => {
      const e = await api.etkinlikAktif();
      if (!e.ok) {
        if (e.durum === 401) router.replace("/giris");
        else setDurum("yok");
        return;
      }
      setEtkinlik(e.veri);
      const d = await api.davetDurum();
      if (d.ok) {
        setEsKatildi(d.veri.es_katildi);
        setHedefRol(d.veri.hedef_rol);
      }
      setDurum("hazir");
    })();
  }, [router]);

  if (durum === "yukleniyor") {
    return (
      <AppShell>
        <div className="flex min-h-[50vh] items-center justify-center font-govde text-sm text-ikincil">
          Yükleniyor...
        </div>
      </AppShell>
    );
  }

  if (durum === "yok" || !etkinlik) {
    return (
      <AppShell>
        <div className="rounded-3xl border border-ayrac bg-yuzey p-10 text-center">
          <p className="font-govde text-sm text-ikincil">Aktif bir etkinlik seçili değil.</p>
          <button
            onClick={() => router.push("/panel")}
            className="mt-6 rounded-full bg-sarap px-7 py-3 font-govde text-sm font-medium text-parsomen transition-colors hover:bg-sarapKoyu"
          >
            Etkinliklerime git
          </button>
        </div>
      </AppShell>
    );
  }

  const benimRol = etkinlik.rol ?? "";
  const benimAd = benimRol === "es1" ? etkinlik.es1_ad : etkinlik.es2_ad;
  const esAd = hedefRol === "es1" ? etkinlik.es1_ad : etkinlik.es2_ad;

  return (
    <AppShell>
      {/* Ust barda "Yonetim" yaziyor - baslik TEKRARLANMAZ; yalniz baglam (hangi defter) */}
      <div className="flex min-w-0 items-center gap-2">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-yaldiz" aria-hidden />
        <p className="truncate font-govde text-xs uppercase tracking-etiket text-ikincil">
          {etkinlik.es1_ad} &amp; {etkinlik.es2_ad}
        </p>
      </div>

      {/* Yonetim araclari (planlama: buton izgarasi) */}
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <AracButonu
          href="/panel/duzenle"
          baslik="Etkinlik & Görünüm"
          aciklama="İsimler, tarih, davetli ekranı, sayaç"
          ikon={
            <path
              d="M4 20h4l10-10-4-4L4 16v4Z M13.5 6.5l4 4"
              stroke="currentColor"
              strokeWidth={1.6}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          }
        />
        <AracButonu
          href="/panel/kurasyon"
          baslik="Kürasyon Stüdyosu"
          aciklama="Dilekleri baskıya hazır bir mirasa dönüştür"
          ikon={
            <>
              <path d="M5 4h9a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4Z" stroke="currentColor" strokeWidth={1.6} strokeLinejoin="round" fill="none" />
              <path d="m11 9 1 2.2 2.2 1-2.2 1L11 15.4 10 13.2 7.8 12.2 10 11.2 11 9Z" stroke="currentColor" strokeWidth={1.2} strokeLinejoin="round" fill="none" />
            </>
          }
        />
        <AracButonu
          href="/panel/paylasim"
          baslik="Paylaşım Bağlantıları"
          aciklama="QR kodlar ve davet bağlantıların"
          ikon={
            <>
              <circle cx="18" cy="5" r="2.5" stroke="currentColor" strokeWidth={1.6} fill="none" />
              <circle cx="6" cy="12" r="2.5" stroke="currentColor" strokeWidth={1.6} fill="none" />
              <circle cx="18" cy="19" r="2.5" stroke="currentColor" strokeWidth={1.6} fill="none" />
              <path d="m8.2 10.8 7.6-4.6M8.2 13.2l7.6 4.6" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" />
            </>
          }
        />
        <AracButonu
          href="/panel/denetim"
          baslik="Denetim Günlüğü"
          aciklama="Defterde yapılan tüm işlemler"
          ikon={
            <>
              <path d="M9 5h6M4 9h16v11H4z" stroke="currentColor" strokeWidth={1.6} strokeLinejoin="round" fill="none" />
              <path d="M8 13h8M8 16h5" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" />
            </>
          }
        />
        <AracButonu
          href="/panel"
          baslik="Etkinliklerim"
          aciklama="Yeni etkinlik oluştur, aralarında geçiş yap"
          ikon={
            <>
              <path
                d="M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7Z"
                stroke="currentColor"
                strokeWidth={1.6}
                fill="none"
              />
              <path d="M4 9h16M8 3v4M16 3v4" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" />
            </>
          }
        />
      </div>

      {/* + Esini Ekle bari (planlama "Yeni Kullanici" bari) */}
      {!esKatildi && (
        <Link
          href="/panel/es-ekle"
          className="mt-4 flex items-center justify-center gap-2 rounded-2xl bg-sarap px-6 py-3.5 font-govde text-sm font-medium text-parsomen transition-colors hover:bg-sarapKoyu"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
            <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
          </svg>
          Eşini Ekle
        </Link>
      )}

      {/* Es listesi (planlama kullanici listesi) */}
      <section className="mt-6 overflow-hidden rounded-3xl border border-ayrac bg-yuzey">
        <div className="border-b border-ayrac px-6 py-3">
          <p className="font-govde text-[0.65rem] uppercase tracking-etiket text-ikincil">
            Defter üyeleri
          </p>
        </div>

        <div className="divide-y divide-ayrac">
          <UyeSatiri ad={benimAd} rol={benimRol} etiket="Sen" katildi />
          <UyeSatiri ad={esAd} rol={hedefRol} etiket="Eşin" katildi={esKatildi} />
        </div>
      </section>
    </AppShell>
  );
}

function AracButonu({
  href,
  baslik,
  aciklama,
  ikon,
}: {
  href: string;
  baslik: string;
  aciklama: string;
  ikon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex min-w-0 items-start gap-3 rounded-2xl border border-ayrac bg-yuzey p-5 transition-colors hover:border-sarap"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sarap/10 text-sarap">
        <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" aria-hidden>
          {ikon}
        </svg>
      </span>
      <span className="min-w-0">
        <span className="block font-govde text-sm font-medium text-murekkep">{baslik}</span>
        <span className="mt-0.5 block font-govde text-xs leading-snug text-ikincil">
          {aciklama}
        </span>
      </span>
    </Link>
  );
}

function UyeSatiri({
  ad,
  rol,
  etiket,
  katildi,
}: {
  ad: string;
  rol: string;
  etiket: string;
  katildi: boolean;
}) {
  const basHarf = (ad || "?").trim().charAt(0).toLocaleUpperCase("tr-TR");
  return (
    <div className="flex min-w-0 items-center gap-3 px-6 py-4">
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-display text-sm ${
          katildi ? "bg-sarap text-parsomen" : "border border-dashed border-ayrac text-ikincil"
        }`}
      >
        {basHarf}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-govde text-sm font-medium text-murekkep">{ad}</span>
        <span className="block font-govde text-xs text-ikincil">
          {etiket} · {rol === "es1" ? "Birinci eş" : "İkinci eş"}
        </span>
      </span>
      <span
        className={`shrink-0 rounded-full px-2.5 py-1 font-govde text-[0.6rem] uppercase tracking-etiket ${
          katildi ? "bg-yaldiz/20 text-yaldiz" : "bg-ayrac/40 text-ikincil"
        }`}
      >
        {katildi ? "Katıldı" : "Bekliyor"}
      </span>
    </div>
  );
}
