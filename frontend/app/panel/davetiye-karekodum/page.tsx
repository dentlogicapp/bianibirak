"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api, davetiyeKarekodum } from "@/lib/api";
import { AppShell } from "@/components/site/AppShell";
import { lockupSvg, type LockupTema } from "@/lib/lockup";
import { tumFormatlarZip, FORMATLAR, type Format } from "@/lib/indir";

// DAVETIYE KAREKODUM
//
// Amac: cift, davetiyesine ekleyecegi karekodu -matbaaya verecegi- tum formatlarda
// tek ZIP olarak indirir; indirmeden ONCE ornek bir davetiye uzerinde nasil duracagini
// (zemin rengi + acik/koyu tema + konum) surukleyerek degerlendirir.
//
// Her es YALNIZ kendi karekodunu gorur (izolasyon - backend'de zorlanir).

// Davetiye zeminini simule eden palet. koyu=true ise lockup koyu temada, davetiye
// yazisi acik renkte gosterilir (otomatik okunurluk).
type PaletRenk = { ad: string; hex: string; koyu: boolean };
const PALET: PaletRenk[] = [
  { ad: "Fildişi", hex: "#f5ecda", koyu: false },
  { ad: "Şampanya", hex: "#ece0c8", koyu: false },
  { ad: "Pudra", hex: "#f1e2e0", koyu: false },
  { ad: "Adaçayı", hex: "#dde5db", koyu: false },
  { ad: "Sis", hex: "#d7dde1", koyu: false },
  { ad: "Terrakota", hex: "#c98f72", koyu: true },
  { ad: "Bordo", hex: "#5e2130", koyu: true },
  { ad: "Orman", hex: "#26382e", koyu: true },
  { ad: "Gece", hex: "#1c2740", koyu: true },
  { ad: "Antrasit", hex: "#1f1a17", koyu: true },
];

// Davetiye metin renkleri (zemine gore okunur).
function davetiyeYazi(koyu: boolean) {
  return koyu
    ? { ana: "#f2e8d6", ikincil: "rgba(242,232,214,0.72)", yaldiz: "#d4af6a", ayrac: "rgba(212,175,106,0.5)" }
    : { ana: "#2c2119", ikincil: "rgba(44,33,25,0.62)", yaldiz: "#a8823c", ayrac: "rgba(168,130,60,0.45)" };
}

export default function DavetiyeKarekodumSayfasi() {
  const router = useRouter();
  const [kisaKod, setKisaKod] = useState<string | null>(null);
  const [durum, setDurum] = useState<"yukleniyor" | "hazir" | "yok">("yukleniyor");

  const [renkIdx, setRenkIdx] = useState(0);
  const [temaSecim, setTemaSecim] = useState<LockupTema | null>(null); // null = otomatik
  const [vurguFormat, setVurguFormat] = useState<Format>("svg");
  const [indiriliyor, setIndiriliyor] = useState(false);

  // Surukleme: lockup'in davetiye uzerindeki merkez konumu (yuzde).
  const [pos, setPos] = useState({ x: 50, y: 76 });
  const [suruklyor, setSuruklyor] = useState(false);
  const davetiyeRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    (async () => {
      const e = await api.etkinlikAktif();
      if (!e.ok) {
        if (e.durum === 401) router.replace("/giris");
        else setDurum("yok");
        return;
      }
      const k = await davetiyeKarekodum();
      if (!k) {
        setDurum("yok");
        return;
      }
      setKisaKod(k.kisaKod);
      setDurum("hazir");
    })();
  }, [router]);

  const link = useMemo(() => {
    if (!kisaKod || typeof window === "undefined") return "";
    return `${window.location.origin}/d/${kisaKod}`;
  }, [kisaKod]);

  const renk = PALET[renkIdx];
  const tema: LockupTema = temaSecim ?? (renk.koyu ? "koyu" : "acik");
  const yazi = davetiyeYazi(renk.koyu);

  const lockupHtml = useMemo(() => {
    if (!link) return "";
    return lockupSvg({ link, tema });
  }, [link, tema]);

  // ---- surukleme ----
  function konumGuncelle(clientX: number, clientY: number) {
    const kutu = davetiyeRef.current;
    if (!kutu) return;
    const r = kutu.getBoundingClientRect();
    let x = ((clientX - r.left) / r.width) * 100;
    let y = ((clientY - r.top) / r.height) * 100;
    // lockup davetiye disina tasmasin - kenar payi
    x = Math.max(19, Math.min(81, x));
    y = Math.max(13, Math.min(87, y));
    setPos({ x, y });
  }

  function surukleBasla(e: React.PointerEvent) {
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setSuruklyor(true);
    konumGuncelle(e.clientX, e.clientY);
  }
  function surukleHareket(e: React.PointerEvent) {
    if (!suruklyor) return;
    konumGuncelle(e.clientX, e.clientY);
  }
  function surukleBitir(e: React.PointerEvent) {
    setSuruklyor(false);
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* yoksa gec */
    }
  }

  async function indir() {
    if (!link || indiriliyor) return;
    setIndiriliyor(true);
    try {
      await tumFormatlarZip({ link, tema }, `davetiye-karekodum-${tema}`);
    } finally {
      setIndiriliyor(false);
    }
  }

  if (durum === "yukleniyor") {
    return (
      <AppShell>
        <div className="flex min-h-[50vh] items-center justify-center font-govde text-sm text-ikincil">
          Yükleniyor…
        </div>
      </AppShell>
    );
  }

  if (durum === "yok") {
    return (
      <AppShell>
        <div className="rounded-3xl border border-ayrac bg-yuzey p-10 text-center">
          <p className="font-govde text-sm text-ikincil">Aktif bir defter seçili değil.</p>
          <button
            onClick={() => router.push("/panel")}
            className="mt-6 rounded-full bg-sarap px-7 py-3 font-govde text-sm font-medium text-parsomen transition-colors hover:bg-sarapKoyu"
          >
            Defterlerime git
          </button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl">
        {/* ---- Yonerge ---- */}
        <p className="max-w-3xl font-govde text-sm leading-relaxed text-ikincil">
          Davetiyelerinizin basımını yaptırmadan önce matbaanıza ileteceğiniz karekod
          dosyanızı buradan indirebilirsiniz. Davetiyeniz üzerine yerleştirilen bu karekod,
          okutan davetlileri doğrudan sizin anı defterinize yönlendirir; herkes birkaç
          dokunuşla dileğini ve anısını bırakır. Aşağıdaki <span className="font-medium text-murekkep">İndir</span> düğmesi,
          matbaanızın kullandığı düzenleme programına uygun biçimi seçebilmeniz için
          karekodunuzu SVG, PNG, PDF, JPG ve WEBP formatlarının tümünü içeren tek bir ZIP
          dosyası olarak indirir.
        </p>

        {/* ---- Yanip sonen onemli uyari ---- */}
        <div className="mt-5 flex gap-3 rounded-2xl border border-amber-500/50 bg-amber-500/10 px-4 py-3.5">
          <span className="mt-0.5 flex h-5 w-5 shrink-0 animate-pulse items-center justify-center">
            <svg viewBox="0 0 24 24" className="h-5 w-5 text-amber-500" aria-hidden>
              <path d="M12 3.2 1.8 20.5h20.4L12 3.2Z" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinejoin="round" />
              <path d="M12 9.5v4.2" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" />
              <circle cx="12" cy="17" r="0.4" fill="currentColor" stroke="currentColor" strokeWidth={0.9} />
            </svg>
          </span>
          <p className="font-govde text-[0.82rem] leading-relaxed text-murekkep">
            <span className="animate-pulse font-semibold text-amber-600">Önemli uyarı:</span>{" "}
            Bu karekod yalnızca <span className="font-medium">size ait</span> yorum sayfasına
            yönlendirir ve yalnızca kendi yakınlarınıza dağıtacağınız davetiyelere eklenmelidir.
            Eşinizin tarafına dağıtılacak davetiyeler için eşinizin kendi uygulamasında üretilen
            karekod kullanılmalı; iki tarafın davetiyeleri <span className="font-medium">ayrı ayrı</span>{" "}
            bastırılıp dağıtılmalıdır. Böylece her iki taraftan gelen dilekler doğru şekilde toplanır.
          </p>
        </div>

        <div className="mt-7 grid gap-7 md:grid-cols-[1fr_300px]">
          {/* ================= ONIZLEME (surukle) ================= */}
          <div>
            <div
              ref={davetiyeRef}
              onPointerMove={surukleHareket}
              className="relative mx-auto aspect-[5/7] w-full max-w-[380px] select-none overflow-hidden rounded-2xl shadow-[0_20px_60px_-24px_rgba(33,26,23,0.5)] ring-1 ring-black/5"
              style={{ background: renk.hex, touchAction: "none" }}
            >
              {/* ince cerceve */}
              <div
                className="pointer-events-none absolute inset-[14px] rounded-xl"
                style={{ border: `1px solid ${yazi.ayrac}` }}
              />

              {/* ornek davetiye icerigi */}
              <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-col items-center px-8 pt-[12%] text-center">
                <span
                  className="font-govde text-[0.6rem] uppercase tracking-[0.32em]"
                  style={{ color: yazi.ikincil }}
                >
                  Düğün Davetiyesi
                </span>
                <div className="mt-6 font-display leading-none" style={{ color: yazi.ana }}>
                  <div className="text-[1.7rem]">Elif</div>
                  <div className="my-1 text-[1.4rem]" style={{ color: yazi.yaldiz }}>&amp;</div>
                  <div className="text-[1.7rem]">Deniz</div>
                </div>
                <div
                  className="mt-6 h-px w-16"
                  style={{ background: `linear-gradient(90deg, transparent, ${yazi.yaldiz}, transparent)` }}
                />
                <p className="mt-5 font-govde text-[0.68rem] leading-relaxed" style={{ color: yazi.ikincil }}>
                  Mutluluğumuza ortak olmanızı<br />dileriz
                </p>
                <p className="mt-4 font-govde text-[0.62rem] tracking-wide" style={{ color: yazi.ikincil }}>
                  12 Eylül 2026 · İstanbul
                </p>
              </div>

              {/* SURUKLENEBILIR LOCKUP */}
              {lockupHtml && (
                <div
                  onPointerDown={surukleBasla}
                  onPointerUp={surukleBitir}
                  onPointerCancel={surukleBitir}
                  className={`absolute w-[38%] touch-none ${suruklyor ? "cursor-grabbing" : "cursor-grab"}`}
                  style={{
                    left: `${pos.x}%`,
                    top: `${pos.y}%`,
                    transform: "translate(-50%, -50%)",
                  }}
                >
                  <div
                    className={`rounded-lg transition-shadow ${suruklyor ? "ring-2 ring-white/60" : ""}`}
                    dangerouslySetInnerHTML={{ __html: lockupHtml }}
                  />
                </div>
              )}
            </div>

            <p className="mt-3 text-center font-govde text-xs text-ikincil">
              Karekodu <span className="font-medium text-murekkep">sürükleyerek</span> davetiye
              üzerinde dilediğin yere taşı · önizleme
              <span className="text-murekkep"> {vurguFormat.toUpperCase()}</span>, indirme tüm formatları içerir
            </p>
          </div>

          {/* ================= KONTROLLER ================= */}
          <div className="flex flex-col gap-6">
            {/* Aciklama */}
            <p className="font-govde text-xs leading-relaxed text-ikincil">
              Karekodunuzun davetiyeniz üzerinde nasıl duracağını buradan değerlendirebilirsiniz.
              Davetiyenize en yakın zemin rengini seçin; önizleme anında güncellenir. Açık ve koyu
              tema arasında geçiş yaparak en okunaklı ve şık duran seçeneği belirleyin.
            </p>

            {/* Renk paleti */}
            <div>
              <p className="mb-2.5 font-govde text-xs font-medium uppercase tracking-etiket text-ikincil">
                Davetiye zemini
              </p>
              <div className="grid grid-cols-5 gap-2">
                {PALET.map((p, i) => (
                  <button
                    key={p.hex}
                    onClick={() => {
                      setRenkIdx(i);
                      setTemaSecim(null); // renk degisince otomatik temaya don
                    }}
                    title={p.ad}
                    aria-label={p.ad}
                    className={`relative h-9 rounded-lg ring-1 ring-black/10 transition-transform hover:scale-105 ${
                      renkIdx === i ? "ring-2 ring-sarap ring-offset-2 ring-offset-parsomen" : ""
                    }`}
                    style={{ background: p.hex }}
                  />
                ))}
              </div>
            </div>

            {/* Tema (otomatik + override) */}
            <div>
              <div className="mb-2 flex items-baseline justify-between">
                <p className="font-govde text-xs font-medium uppercase tracking-etiket text-ikincil">
                  Tema
                </p>
                {temaSecim === null && (
                  <span className="font-govde text-[0.62rem] text-ikincil/70">otomatik</span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setTemaSecim("acik")}
                  className={`rounded-xl border px-3 py-2 font-govde text-sm font-medium transition-colors ${
                    tema === "acik"
                      ? "border-sarap bg-sarap/8 text-murekkep"
                      : "border-ayrac text-ikincil hover:bg-yuzeyKoyu"
                  }`}
                >
                  Açık
                </button>
                <button
                  onClick={() => setTemaSecim("koyu")}
                  className={`rounded-xl border px-3 py-2 font-govde text-sm font-medium transition-colors ${
                    tema === "koyu"
                      ? "border-sarap bg-sarap/8 text-murekkep"
                      : "border-ayrac text-ikincil hover:bg-yuzeyKoyu"
                  }`}
                >
                  Koyu
                </button>
              </div>
            </div>

            {/* Formatlar (bilgi - hepsi ZIP'te) */}
            <div>
              <p className="mb-2 font-govde text-xs font-medium uppercase tracking-etiket text-ikincil">
                ZIP içinde
              </p>
              <div className="flex flex-col gap-1.5">
                {FORMATLAR.map((f) => (
                  <button
                    key={f.kod}
                    onClick={() => setVurguFormat(f.kod)}
                    className={`flex items-baseline justify-between gap-2 rounded-xl border px-3 py-2 text-left transition-colors ${
                      vurguFormat === f.kod
                        ? "border-sarap bg-sarap/8"
                        : "border-ayrac hover:bg-yuzeyKoyu"
                    }`}
                  >
                    <span className="font-govde text-sm font-medium text-murekkep">{f.ad}</span>
                    <span className="font-govde text-[0.68rem] text-ikincil">{f.aciklama}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Indir - tek ZIP */}
            <button
              onClick={indir}
              disabled={indiriliyor}
              className="flex items-center justify-center gap-2 rounded-full bg-sarap px-6 py-3.5 font-govde text-sm font-medium text-parsomen transition-colors hover:bg-sarapKoyu disabled:opacity-60"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
                <path d="M12 4v10m0 0 4-4m-4 4-4-4M5 19h14" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" fill="none" />
              </svg>
              {indiriliyor ? "ZIP hazırlanıyor…" : "İndir (tüm formatlar · ZIP)"}
            </button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
