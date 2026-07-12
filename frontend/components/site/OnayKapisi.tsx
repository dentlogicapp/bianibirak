"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { MarkaKilidi } from "@/components/marka/MarkaKilidi";

// ONAY KAPISI - gecilemez.
//
// IKI DURUMDA ACILIR:
//
// 1. GECMISTEN GELEN KULLANICI
//    Onay sistemi kurulmadan once kaydolmus hesaplar (test hesaplari dahil). Hicbir
//    onay kaydi yok - yani hukuken elimizde rizalari YOK. Verilerini islemeye devam
//    ediyoruz ama buna izin veren bir belge yok.
//
// 2. METIN GUNCELLENDI
//    Kullanim Kosullari degisti. Eski metni onaylamis kullanicinin onayi, YENI metin
//    icin gecerli DEGILDIR. "Zaten onaylamisti" demek, onay ALMAMAK'tir.
//
// NEDEN GECILEMEZ:
// "Sonra hatirlat" secenegi koysaydik, kullanicilarin cogu onu secerdi ve biz aylarca
// gecersiz rizayla calisirdik. Riza ya vardir ya yoktur; "yakinda olacak" diye bir
// hali yoktur. Kapatma butonu yok, ESC calismiyor, disari tiklama kapatmiyor.
//
// Tek cikis: onayla, ya da cikis yap.

type Metin = {
  anahtar: string;
  baslik: string;
  icerik: string;
  surum: string;
  hash: string;
  yururluk_tarihi: string;
};

export function OnayKapisi({ onTamam }: { onTamam: () => void }) {
  const [metinler, setMetinler] = useState<Metin[] | null>(null);
  const [isaretli, setIsaretli] = useState<Set<string>>(new Set());
  const [acikMetin, setAcikMetin] = useState<Metin | null>(null);
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [hata, setHata] = useState("");

  useEffect(() => {
    void (async () => {
      try {
        const y = await fetch("/api/onay/eksik", { credentials: "include" });
        if (!y.ok) {
          onTamam();
          return;
        }
        const veri = await y.json();
        if (!veri.eksik || veri.eksik.length === 0) {
          onTamam();
          return;
        }
        setMetinler(veri.eksik);
      } catch {
        // Ag hatasi - kullaniciyi kilitleme. Bir sonraki girise birak.
        onTamam();
      }
    })();
  }, [onTamam]);

  // Body kilidi - arkadaki panel kaydirilamaz. ESC KASITLI OLARAK BAGLANMADI:
  // bu kapi kapatilamaz.
  useEffect(() => {
    if (!metinler) return;
    const eski = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = eski;
    };
  }, [metinler]);

  if (!metinler || metinler.length === 0) return null;

  const hepsiIsaretli = metinler.every((m) => isaretli.has(m.anahtar));

  async function onayla() {
    if (!metinler || !hepsiIsaretli) return;
    setGonderiliyor(true);
    setHata("");
    try {
      const y = await fetch("/api/onay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ onaylar: metinler.map((m) => m.anahtar) }),
      });
      if (!y.ok) {
        const g = await y.json().catch(() => null);
        setHata(g?.mesaj ?? "Onay kaydedilemedi.");
        setGonderiliyor(false);
        return;
      }
      onTamam();
    } catch {
      setHata("Bağlantı hatası. Lütfen tekrar deneyin.");
      setGonderiliyor(false);
    }
  }

  async function cikis() {
    await fetch("/api/cikis", { method: "POST", credentials: "include" }).catch(() => {});
    window.location.href = "/giris";
  }

  const govde = (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-murekkep/80 p-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl bg-parsomen shadow-[0_0_80px_rgba(33,26,23,0.5)]">
        <div className="h-1 shrink-0 bg-gradient-to-r from-yaldiz/30 via-yaldiz to-yaldiz/30" aria-hidden />

        <div className="shrink-0 border-b border-ayrac px-6 py-5 text-center">
          <MarkaKilidi varyant="wordmark" boyut="kucuk" />
          <h2 className="mt-3 font-display text-xl text-murekkep">
            Devam etmeden önce
          </h2>
          <p className="metin-yasli mt-1.5 font-govde text-sm leading-relaxed text-ikincil">
            {metinler.length === 1
              ? "Bir metnimiz güncellendi. Okuyup onaylamanız gerekiyor."
              : "Yasal metinlerimizi okuyup onaylamanız gerekiyor."}
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <div className="space-y-3">
            {metinler.map((m) => (
              <div
                key={m.anahtar}
                className={`rounded-2xl border p-4 transition-colors ${
                  isaretli.has(m.anahtar)
                    ? "border-yaldiz/50 bg-yaldiz/[0.06]"
                    : "border-ayrac bg-yuzey"
                }`}
              >
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={isaretli.has(m.anahtar)}
                    onChange={(e) => {
                      const y = new Set(isaretli);
                      if (e.target.checked) y.add(m.anahtar);
                      else y.delete(m.anahtar);
                      setIsaretli(y);
                    }}
                    className="mt-0.5 shrink-0 accent-[color:var(--sarap)]"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block font-govde text-sm font-medium text-murekkep">
                      {m.baslik}
                    </span>
                    <span className="mt-0.5 block font-govde text-xs text-ikincil">
                      Okudum ve kabul ediyorum.
                    </span>
                  </span>
                </label>

                <button
                  type="button"
                  onClick={() => setAcikMetin(m)}
                  className="mt-2 font-govde text-xs font-medium text-sarap hover:underline"
                >
                  Metni oku
                </button>
              </div>
            ))}
          </div>

          {hata && (
            <p className="mt-4 rounded-xl bg-sarap/10 px-4 py-3 font-govde text-xs text-sarap">
              {hata}
            </p>
          )}

          <p className="metin-yasli mt-4 font-govde text-[0.7rem] leading-relaxed text-ikincil">
            Onayınız; onay anı, metnin sürümü ve metnin parmak izi ile birlikte kalıcı
            olarak kaydedilir. Böylece hangi metni onayladığınız her zaman ispatlanabilir.
          </p>
        </div>

        {/* KAPATMA BUTONU YOK - bu kapi gecilemez. Tek cikis: onayla ya da cikis yap. */}
        <div className="shrink-0 space-y-2 border-t border-ayrac bg-yuzey px-6 py-4">
          <button
            type="button"
            onClick={onayla}
            disabled={!hepsiIsaretli || gonderiliyor}
            className="w-full rounded-full bg-sarap px-5 py-3 font-govde text-sm font-medium text-parsomen transition-colors hover:bg-sarapKoyu disabled:opacity-40"
          >
            {gonderiliyor ? "Kaydediliyor..." : "Onaylıyorum, devam et"}
          </button>
          <button
            type="button"
            onClick={cikis}
            className="w-full rounded-full px-5 py-2 font-govde text-xs text-ikincil transition-colors hover:text-murekkep"
          >
            Onaylamıyorum, çıkış yap
          </button>
        </div>
      </div>

      {/* Metin okuyucu - modal ustunde modal */}
      {acikMetin && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-murekkep/85 p-4">
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-parsomen">
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-ayrac px-6 py-4">
              <div className="min-w-0">
                <h3 className="truncate font-display text-lg text-murekkep">
                  {acikMetin.baslik}
                </h3>
                <p className="font-govde text-[0.68rem] text-ikincil">
                  Sürüm {acikMetin.surum}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAcikMetin(null)}
                className="shrink-0 rounded-full border border-ayrac p-2 text-ikincil transition-colors hover:border-sarap hover:text-sarap"
                aria-label="Kapat"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
                  <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
              <div className="metin-yasli whitespace-pre-line font-govde text-sm leading-relaxed text-ikincil">
                {acikMetin.icerik}
              </div>

              <div className="mt-8 rounded-2xl border border-ayrac bg-yuzey p-4">
                <p className="font-govde text-[0.6rem] uppercase tracking-etiket text-ikincil">
                  Metin parmak izi (SHA-256)
                </p>
                <p className="mt-1 break-all font-mono text-[0.62rem] leading-relaxed text-ikincil">
                  {acikMetin.hash}
                </p>
              </div>
            </div>

            <div className="shrink-0 border-t border-ayrac bg-yuzey px-6 py-4">
              <button
                type="button"
                onClick={() => {
                  const y = new Set(isaretli);
                  y.add(acikMetin.anahtar);
                  setIsaretli(y);
                  setAcikMetin(null);
                }}
                className="w-full rounded-full bg-sarap px-5 py-2.5 font-govde text-sm font-medium text-parsomen transition-colors hover:bg-sarapKoyu"
              >
                Okudum, kabul ediyorum
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(govde, document.body);
}
