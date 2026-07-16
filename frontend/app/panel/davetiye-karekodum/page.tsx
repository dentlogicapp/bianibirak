"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api, davetiyeKarekodum, type Etkinlik } from "@/lib/api";
import { AppShell } from "@/components/site/AppShell";
import { lockupSvg, type LockupTema } from "@/lib/lockup";
import { tumFormatlarZip, FORMATLAR, type Format } from "@/lib/indir";

// DAVETIYE KAREKODUM
//
// Cift, davetiyesine ekleyecegi karekodu -matbaaya verecegi- tum formatlarda tek ZIP
// olarak indirir; indirmeden ONCE ornek davetiye uzerinde zemin rengi, tema, KONUM ve
// BOYUT olarak surukleyip olcekleyerek degerlendirir. Her es YALNIZ kendi karekodunu
// gorur/indirir (izolasyon backend'de zorlanir). ZIP adinda es ismi -> karisma olmaz.

// Hizli zemin renkleri (kisayol). Sinirsiz secim icin ayrica renk secici (petek) var.
const HIZLI_RENKLER = ["#f5f1e8", "#ece0c8", "#f1e2e0", "#dde5db", "#5e2130", "#26382e", "#1c2740", "#1f1a17"];

const AYLAR = ["OCAK", "ŞUBAT", "MART", "NİSAN", "MAYIS", "HAZİRAN", "TEMMUZ", "AĞUSTOS", "EYLÜL", "EKİM", "KASIM", "ARALIK"];
const GUNLER = ["PAZAR", "PAZARTESİ", "SALI", "ÇARŞAMBA", "PERŞEMBE", "CUMA", "CUMARTESİ"];

// Zemin parlakligi -> koyu mu? (otomatik tema + okunur yazi rengi)
function koyuMu(hex: string): boolean {
  const h = hex.replace("#", "");
  if (h.length < 6) return false;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.58;
}

function davetiyeYazi(koyu: boolean) {
  return koyu
    ? { ana: "#f2e8d6", ikincil: "rgba(242,232,214,0.72)", yaldiz: "#d4af6a", ayrac: "rgba(212,175,106,0.55)" }
    : { ana: "#3a2f26", ikincil: "rgba(58,47,38,0.6)", yaldiz: "#a8823c", ayrac: "rgba(168,130,60,0.5)" };
}

// Turkce ad -> ASCII dosya adi (matbaada capraz-platform sorunsuz).
function asciiAd(s: string): string {
  const m: Record<string, string> = { "ş": "s", "Ş": "S", "ç": "c", "Ç": "C", "ğ": "g", "Ğ": "G", "ı": "i", "İ": "I", "ö": "o", "Ö": "O", "ü": "u", "Ü": "U" };
  return (s || "")
    .replace(/[şŞçÇğĞıİöÖüÜ]/g, (c) => m[c] ?? c)
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^A-Za-z0-9_]/g, "");
}

export default function DavetiyeKarekodumSayfasi() {
  const router = useRouter();
  const [etkinlik, setEtkinlik] = useState<Etkinlik | null>(null);
  const [kisaKod, setKisaKod] = useState<string | null>(null);
  const [durum, setDurum] = useState<"yukleniyor" | "hazir" | "yok">("yukleniyor");

  const [zemin, setZemin] = useState("#f5f1e8");
  const [temaSecim, setTemaSecim] = useState<LockupTema | null>(null); // null = otomatik
  const [vurguFormat, setVurguFormat] = useState<Format>("svg");
  const [olcek, setOlcek] = useState(30); // lockup genisligi, davetiyenin yuzdesi
  const [pos, setPos] = useState({ x: 50, y: 70 });
  const [suruklyor, setSuruklyor] = useState(false);
  const [indiriliyor, setIndiriliyor] = useState(false);
  const davetiyeRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    (async () => {
      const e = await api.etkinlikAktif();
      if (!e.ok) {
        if (e.durum === 401) router.replace("/giris");
        else setDurum("yok");
        return;
      }
      setEtkinlik(e.veri);
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

  const koyu = koyuMu(zemin);
  const tema: LockupTema = temaSecim ?? (koyu ? "koyu" : "acik");
  const yazi = davetiyeYazi(koyu);

  const lockupHtml = useMemo(() => (link ? lockupSvg({ link, tema }) : ""), [link, tema]);

  // Eş isimleri + tarih (placeholder'li)
  const es1 = etkinlik?.es1_ad?.trim() || "Eş İsmi";
  const es2 = etkinlik?.es2_ad?.trim() || "Eş İsmi";
  const tarihBlok = useMemo(() => {
    const t = etkinlik?.etkinlik_tarihi;
    if (!t) return { ay: "AY", gun: "00", yil: "----", haftaGun: "GÜN" };
    const [y, m, d] = t.split("-").map(Number);
    const dt = new Date(y, (m || 1) - 1, d || 1);
    return { ay: AYLAR[(m || 1) - 1] ?? "AY", gun: String(d ?? "").padStart(2, "0"), yil: String(y ?? ""), haftaGun: GUNLER[dt.getDay()] ?? "" };
  }, [etkinlik]);

  // Kendi adi (ZIP dosya adi icin)
  const benimAd = (etkinlik?.rol === "es2" ? es2 : es1) || "es";

  // ---- surukleme ----
  function konumGuncelle(clientX: number, clientY: number) {
    const kutu = davetiyeRef.current;
    if (!kutu) return;
    const r = kutu.getBoundingClientRect();
    const yariW = olcek / 2 + 2;
    const yariH = ((olcek * (r.width / r.height)) * 0.62) / 2 + 2; // lockup ~0.62 en/boy
    let x = ((clientX - r.left) / r.width) * 100;
    let y = ((clientY - r.top) / r.height) * 100;
    x = Math.max(yariW, Math.min(100 - yariW, x));
    y = Math.max(yariH, Math.min(100 - yariH, y));
    setPos({ x, y });
  }
  function surukleBasla(e: React.PointerEvent) {
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setSuruklyor(true);
    konumGuncelle(e.clientX, e.clientY);
  }
  function surukleHareket(e: React.PointerEvent) {
    if (suruklyor) konumGuncelle(e.clientX, e.clientY);
  }
  function surukleBitir(e: React.PointerEvent) {
    setSuruklyor(false);
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch { /* gec */ }
  }

  async function indir() {
    if (!link || indiriliyor) return;
    setIndiriliyor(true);
    try {
      await tumFormatlarZip({ link, tema }, `${asciiAd(benimAd)}_davetiye_karekodum_${tema}`);
    } finally {
      setIndiriliyor(false);
    }
  }

  if (durum === "yukleniyor") {
    return (
      <AppShell>
        <div className="flex min-h-[50vh] items-center justify-center font-govde text-sm text-ikincil">Yükleniyor…</div>
      </AppShell>
    );
  }
  if (durum === "yok") {
    return (
      <AppShell>
        <div className="rounded-3xl border border-ayrac bg-yuzey p-10 text-center">
          <p className="font-govde text-sm text-ikincil">Aktif bir defter seçili değil.</p>
          <button onClick={() => router.push("/panel")} className="mt-6 rounded-full bg-sarap px-7 py-3 font-govde text-sm font-medium text-parsomen transition-colors hover:bg-sarapKoyu">Defterlerime git</button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl">
        {/* ---- Yonerge (kisa) ---- */}
        <p className="max-w-3xl text-left font-govde text-sm leading-relaxed text-ikincil">
          Davetiyenize ekleyeceğiniz karekodu buradan indirin. <span className="font-medium text-murekkep">İndir</span> düğmesi,
          matbaanızın kullandığı programa uygun biçimi seçebilmesi için karekodu SVG, PNG, PDF, JPG ve WEBP
          formatlarının tümünü içeren tek bir ZIP olarak verir.
        </p>

        {/* ---- Yanip sonen uyari (kisa) ---- */}
        <div className="mt-4 flex items-start gap-2.5 rounded-2xl border border-amber-500/50 bg-amber-500/10 px-4 py-3">
          <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0 animate-pulse text-amber-500" aria-hidden>
            <path d="M12 3.2 1.8 20.5h20.4L12 3.2Z" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinejoin="round" />
            <path d="M12 9.5v4.2" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" />
            <circle cx="12" cy="17" r="0.35" fill="currentColor" stroke="currentColor" strokeWidth={0.9} />
          </svg>
          <p className="text-left font-govde text-[0.8rem] leading-relaxed text-murekkep">
            <span className="animate-pulse font-semibold text-amber-600">Önemli:</span>{" "}
            Bu karekod ile yalnızca size ait anı girişi sayfasına yönlendirme sağlanır; yalnızca kendi
            yakınlarınıza dağıtacağınız davetiyelere ekleyin. Eşinizin tarafı için eşinizin kendi karekodu
            kullanılmalı — iki davetiye <span className="font-medium">ayrı</span> bastırılır.
          </p>
        </div>

        <div className="mt-6 grid gap-7 md:grid-cols-[1fr_290px]">
          {/* ================= ONIZLEME ================= */}
          <div>
            <div
              ref={davetiyeRef}
              onPointerMove={surukleHareket}
              className="relative mx-auto aspect-[5/7] w-full max-w-[440px] select-none overflow-hidden rounded-[14px] shadow-[0_24px_70px_-28px_rgba(33,26,23,0.55)] ring-1 ring-black/5"
              style={{ background: zemin, touchAction: "none" }}
            >
              {/* cift altin cerceve + kose */}
              <div className="pointer-events-none absolute inset-[13px] rounded-[8px]" style={{ border: `1.5px solid ${yazi.yaldiz}` }} />
              <div className="pointer-events-none absolute inset-[18px] rounded-[5px]" style={{ border: `0.75px solid ${yazi.ayrac}` }} />

              {/* davetiye icerigi */}
              <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-col items-center px-9 pt-[9%] text-center">
                {/* botanik */}
                <svg viewBox="0 0 64 100" className="h-16 w-auto" fill="none" stroke={yazi.yaldiz} strokeWidth={1.25} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M33 100 C 33 74, 31 58, 35 42" />
                  <path d="M34 66 C 21 62, 14 68, 12 77 C 23 77, 31 74, 34 66 Z" />
                  <path d="M34 78 C 47 74, 54 80, 56 89 C 45 89, 37 86, 34 78 Z" />
                  <path d="M35 42 C 27 37, 28 22, 39 16 C 47 23, 46 37, 35 42 Z" />
                  <path d="M35 42 C 42 39, 51 41, 53 31" />
                </svg>

                {/* eş isimleri */}
                <div className="mt-4 font-display leading-tight" style={{ color: yazi.ana }}>
                  <span className="text-[1.35rem]">{es1}</span>
                  <span className="mx-2 text-[1.15rem]" style={{ color: yazi.yaldiz }}>&amp;</span>
                  <span className="text-[1.35rem]">{es2}</span>
                </div>

                {/* mesaj (italik serif) */}
                <p className="mt-4 font-display text-[0.72rem] italic leading-relaxed" style={{ color: yazi.ikincil }}>
                  Bu özel günümüzde sizleri de<br />aramızda görmekten mutluluk duyarız.
                </p>

                {/* tarih bloku */}
                <div className="mt-5 flex items-center justify-center gap-3" style={{ color: yazi.ana }}>
                  <div className="h-px w-8" style={{ background: yazi.ayrac }} />
                  <span className="font-govde text-[0.6rem] tracking-[0.2em]" style={{ color: yazi.ikincil }}>{tarihBlok.haftaGun}</span>
                  <div className="text-center leading-none">
                    <div className="font-govde text-[0.55rem] tracking-[0.2em]" style={{ color: yazi.ikincil }}>{tarihBlok.ay}</div>
                    <div className="my-0.5 font-display text-[1.6rem]">{tarihBlok.gun}</div>
                    <div className="font-govde text-[0.55rem] tracking-[0.15em]" style={{ color: yazi.ikincil }}>{tarihBlok.yil}</div>
                  </div>
                  <div className="h-px w-8" style={{ background: yazi.ayrac }} />
                </div>
              </div>

              {/* SURUKLENEBILIR + OLCEKLENEBILIR LOCKUP */}
              {lockupHtml && (
                <div
                  onPointerDown={surukleBasla}
                  onPointerUp={surukleBitir}
                  onPointerCancel={surukleBitir}
                  className={`absolute touch-none ${suruklyor ? "cursor-grabbing" : "cursor-grab"}`}
                  style={{ left: `${pos.x}%`, top: `${pos.y}%`, width: `${olcek}%`, transform: "translate(-50%, -50%)" }}
                >
                  <div
                    className={`rounded-lg transition-shadow [&_svg]:block [&_svg]:h-auto [&_svg]:w-full ${suruklyor ? "ring-2 ring-white/70" : ""}`}
                    style={vurguFormat === "jpg" ? { background: "#fff", padding: "6%" } : undefined}
                    dangerouslySetInnerHTML={{ __html: lockupHtml }}
                  />
                </div>
              )}
            </div>

            <p className="mt-3 text-center font-govde text-xs text-ikincil">
              Karekodu <span className="font-medium text-murekkep">sürükle</span> ve aşağıdan
              <span className="font-medium text-murekkep"> boyutlandır</span> · önizleme {vurguFormat.toUpperCase()}, indirme tüm formatları içerir
            </p>
          </div>

          {/* ================= KONTROLLER ================= */}
          <div className="flex flex-col gap-5">
            <p className="text-left font-govde text-xs leading-relaxed text-ikincil">
              Davetiyenize en yakın zemin rengini seçin; karekodu sürükleyip boyutlandırın, açık/koyu tema ile
              en okunaklı duruşu belirleyin.
            </p>

            {/* Zemin: hizli renkler + sinirsiz secici */}
            <div>
              <p className="mb-2.5 font-govde text-xs font-medium uppercase tracking-etiket text-ikincil">Davetiye zemini</p>
              <div className="flex flex-wrap items-center gap-2">
                {HIZLI_RENKLER.map((c) => (
                  <button
                    key={c}
                    onClick={() => { setZemin(c); setTemaSecim(null); }}
                    title={c}
                    className={`h-8 w-8 rounded-lg ring-1 ring-black/10 transition-transform hover:scale-105 ${zemin.toLowerCase() === c.toLowerCase() ? "ring-2 ring-sarap ring-offset-2 ring-offset-parsomen" : ""}`}
                    style={{ background: c }}
                  />
                ))}
                {/* SINIRSIZ renk secici (petek/spektrum - native) */}
                <label
                  className="relative flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg ring-1 ring-black/10 transition-transform hover:scale-105"
                  style={{ background: "conic-gradient(from 0deg, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)" }}
                  title="Özel renk seç"
                >
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white/85 text-[0.7rem] leading-none text-murekkep">+</span>
                  <input
                    type="color"
                    value={zemin}
                    onChange={(e) => { setZemin(e.target.value); setTemaSecim(null); }}
                    className="absolute inset-0 cursor-pointer opacity-0"
                    aria-label="Özel zemin rengi"
                  />
                </label>
              </div>
            </div>

            {/* Boyut */}
            <div>
              <div className="mb-2 flex items-baseline justify-between">
                <p className="font-govde text-xs font-medium uppercase tracking-etiket text-ikincil">Boyut</p>
                <span className="font-govde text-[0.62rem] text-ikincil/70">%{olcek}</span>
              </div>
              <input
                type="range" min={16} max={56} value={olcek}
                onChange={(e) => setOlcek(Number(e.target.value))}
                className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-ayrac accent-sarap"
              />
            </div>

            {/* Tema */}
            <div>
              <div className="mb-2 flex items-baseline justify-between">
                <p className="font-govde text-xs font-medium uppercase tracking-etiket text-ikincil">Tema</p>
                {temaSecim === null && <span className="font-govde text-[0.62rem] text-ikincil/70">otomatik</span>}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setTemaSecim("acik")} className={`rounded-xl border px-3 py-2 font-govde text-sm font-medium transition-colors ${tema === "acik" ? "border-sarap bg-sarap/8 text-murekkep" : "border-ayrac text-ikincil hover:bg-yuzeyKoyu"}`}>Açık</button>
                <button onClick={() => setTemaSecim("koyu")} className={`rounded-xl border px-3 py-2 font-govde text-sm font-medium transition-colors ${tema === "koyu" ? "border-sarap bg-sarap/8 text-murekkep" : "border-ayrac text-ikincil hover:bg-yuzeyKoyu"}`}>Koyu</button>
              </div>
            </div>

            {/* Formatlar (bilgi) */}
            <div>
              <p className="mb-2 font-govde text-xs font-medium uppercase tracking-etiket text-ikincil">ZIP içinde</p>
              <div className="flex flex-col gap-1.5">
                {FORMATLAR.map((f) => (
                  <button key={f.kod} onClick={() => setVurguFormat(f.kod)} className={`flex items-baseline justify-between gap-2 rounded-xl border px-3 py-2 text-left transition-colors ${vurguFormat === f.kod ? "border-sarap bg-sarap/8" : "border-ayrac hover:bg-yuzeyKoyu"}`}>
                    <span className="font-govde text-sm font-medium text-murekkep">{f.ad}</span>
                    <span className="font-govde text-[0.68rem] text-ikincil">{f.aciklama}</span>
                  </button>
                ))}
              </div>
            </div>

            <button onClick={indir} disabled={indiriliyor} className="flex items-center justify-center gap-2 rounded-full bg-sarap px-6 py-3.5 font-govde text-sm font-medium text-parsomen transition-colors hover:bg-sarapKoyu disabled:opacity-60">
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
