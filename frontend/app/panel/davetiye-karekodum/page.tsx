"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api, davetiyeKarekodum, type Etkinlik } from "@/lib/api";
import { AppShell } from "@/components/site/AppShell";
import { lockupSvg, type LockupTema } from "@/lib/lockup";
import { tumFormatlarZipBlob, FORMATLAR, type Format } from "@/lib/indir";

// DAVETIYE KAREKODUM
//
// Cift, davetiyesine ekleyecegi karekodu -matbaaya WhatsApp ile gonderecegi- tum
// formatlarda tek ZIP olarak paylasir; ONCE ornek davetiye uzerinde zemin rengi, tema,
// KONUM ve BOYUT olarak surukleyip olcekleyerek degerlendirir. Son duzenleme korunur
// (localStorage). Her es YALNIZ kendi karekodunu paylasir (izolasyon backend'de).

const AYLAR = ["OCAK", "ŞUBAT", "MART", "NİSAN", "MAYIS", "HAZİRAN", "TEMMUZ", "AĞUSTOS", "EYLÜL", "EKİM", "KASIM", "ARALIK"];
const GUNLER = ["PAZAR", "PAZARTESİ", "SALI", "ÇARŞAMBA", "PERŞEMBE", "CUMA", "CUMARTESİ"];

// lockup en/boy orani (lockup.ts yerlesim sabitleriyle uyumlu) - clamp icin.
const LOCKUP_ORAN = 1.214;
// davetiye ic cerceve payi (yuzde) - karekod bu cizgilerin disina tasmaz.
const CERCEVE_X = 6;
const CERCEVE_Y = 4.5;

const VARSAYILAN = { zemin: "#f5f1e8", tema: null as LockupTema | null, olcek: 30, pos: { x: 50, y: 70 }, vurgu: "svg" as Format };

function koyuMu(hex: string): boolean {
  const h = hex.replace("#", "");
  if (h.length < 6) return false;
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.58;
}

function davetiyeYazi(koyu: boolean) {
  return koyu
    ? { ana: "#f2e8d6", ikincil: "rgba(242,232,214,0.72)", yaldiz: "#d4af6a", ayrac: "rgba(212,175,106,0.55)" }
    : { ana: "#3a2f26", ikincil: "rgba(58,47,38,0.62)", yaldiz: "#a8823c", ayrac: "rgba(168,130,60,0.5)" };
}

function asciiAd(s: string): string {
  const m: Record<string, string> = { "ş": "s", "Ş": "S", "ç": "c", "Ç": "C", "ğ": "g", "Ğ": "G", "ı": "i", "İ": "I", "ö": "o", "Ö": "O", "ü": "u", "Ü": "U" };
  return (s || "").replace(/[şŞçÇğĞıİöÖüÜ]/g, (c) => m[c] ?? c).trim().replace(/\s+/g, "_").replace(/[^A-Za-z0-9_]/g, "");
}

export default function DavetiyeKarekodumSayfasi() {
  const router = useRouter();
  const [etkinlik, setEtkinlik] = useState<Etkinlik | null>(null);
  const [kisaKod, setKisaKod] = useState<string | null>(null);
  const [durum, setDurum] = useState<"yukleniyor" | "hazir" | "yok">("yukleniyor");

  const [zemin, setZemin] = useState(VARSAYILAN.zemin);
  const [temaSecim, setTemaSecim] = useState<LockupTema | null>(VARSAYILAN.tema);
  const [vurguFormat, setVurguFormat] = useState<Format>(VARSAYILAN.vurgu);
  const [olcek, setOlcek] = useState(VARSAYILAN.olcek);
  const [pos, setPos] = useState(VARSAYILAN.pos);
  const [suruklyor, setSuruklyor] = useState(false);
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const davetiyeRef = useRef<HTMLDivElement | null>(null);
  const yuklendi = useRef(false);

  const anahtar = etkinlik ? `bab-karekodum-onizleme-${etkinlik.id}` : null;

  useEffect(() => {
    (async () => {
      const e = await api.etkinlikAktif();
      if (!e.ok) { if (e.durum === 401) router.replace("/giris"); else setDurum("yok"); return; }
      setEtkinlik(e.veri);
      const k = await davetiyeKarekodum();
      if (!k) { setDurum("yok"); return; }
      setKisaKod(k.kisaKod);
      // son duzenlemeyi geri yukle
      try {
        const kayit = localStorage.getItem(`bab-karekodum-onizleme-${e.veri.id}`);
        if (kayit) {
          const s = JSON.parse(kayit);
          if (s.zemin) setZemin(s.zemin);
          if (s.tema !== undefined) setTemaSecim(s.tema);
          if (typeof s.olcek === "number") setOlcek(s.olcek);
          if (s.pos) setPos(s.pos);
          if (s.vurgu) setVurguFormat(s.vurgu);
        }
      } catch { /* gec */ }
      yuklendi.current = true;
      setDurum("hazir");
    })();
  }, [router]);

  // son duzenlemeyi kaydet
  useEffect(() => {
    if (!yuklendi.current || !anahtar) return;
    try {
      localStorage.setItem(anahtar, JSON.stringify({ zemin, tema: temaSecim, olcek, pos, vurgu: vurguFormat }));
    } catch { /* gec */ }
  }, [anahtar, zemin, temaSecim, olcek, pos, vurguFormat]);

  const link = useMemo(() => (kisaKod && typeof window !== "undefined" ? `${window.location.origin}/d/${kisaKod}` : ""), [kisaKod]);
  const koyu = koyuMu(zemin);
  const tema: LockupTema = temaSecim ?? (koyu ? "koyu" : "acik");
  const yazi = davetiyeYazi(koyu);
  const lockupHtml = useMemo(() => (link ? lockupSvg({ link, tema }) : ""), [link, tema]);

  const es1 = etkinlik?.es1_ad?.trim() || "Eş İsmi";
  const es2 = etkinlik?.es2_ad?.trim() || "Eş İsmi";
  const tarihBlok = useMemo(() => {
    const t = etkinlik?.etkinlik_tarihi;
    if (!t) return { ay: "AY", gun: "00", yil: "----", haftaGun: "GÜN" };
    const [y, m, d] = t.slice(0, 10).split("-").map(Number); // ISO'da saat kismini at
    if (!y || !m || !d) return { ay: "AY", gun: "00", yil: "----", haftaGun: "GÜN" };
    const dt = new Date(y, m - 1, d);
    return { ay: AYLAR[m - 1] ?? "AY", gun: String(d).padStart(2, "0"), yil: String(y), haftaGun: GUNLER[dt.getDay()] ?? "" };
  }, [etkinlik]);

  const benimAd = (etkinlik?.rol === "es2" ? es2 : es1) || "es";

  // ---- clamp: karekod ic cerceve icinde kalir; boyutta merkez korunur ----
  const clampPos = useCallback((x: number, y: number, olcekVal: number) => {
    const kutu = davetiyeRef.current;
    const oran = kutu ? kutu.clientWidth / kutu.clientHeight : 5 / 7;
    const yariW = olcekVal / 2;
    const yariH = (olcekVal * oran / LOCKUP_ORAN) / 2;
    const minX = CERCEVE_X + yariW, maxX = 100 - CERCEVE_X - yariW;
    const minY = CERCEVE_Y + yariH, maxY = 100 - CERCEVE_Y - yariH;
    return {
      x: minX > maxX ? 50 : Math.max(minX, Math.min(maxX, x)),
      y: minY > maxY ? 50 : Math.max(minY, Math.min(maxY, y)),
    };
  }, []);

  // boyut degisince merkezi koruyarak yeniden sinirla
  useEffect(() => {
    setPos((p) => clampPos(p.x, p.y, olcek));
  }, [olcek, clampPos]);

  function konumGuncelle(clientX: number, clientY: number) {
    const kutu = davetiyeRef.current;
    if (!kutu) return;
    const r = kutu.getBoundingClientRect();
    setPos(clampPos(((clientX - r.left) / r.width) * 100, ((clientY - r.top) / r.height) * 100, olcek));
  }
  function surukleBasla(e: React.PointerEvent) {
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setSuruklyor(true);
    konumGuncelle(e.clientX, e.clientY);
  }
  function surukleHareket(e: React.PointerEvent) { if (suruklyor) konumGuncelle(e.clientX, e.clientY); }
  function surukleBitir(e: React.PointerEvent) {
    setSuruklyor(false);
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch { /* gec */ }
  }

  function sifirla() {
    setZemin(VARSAYILAN.zemin);
    setTemaSecim(VARSAYILAN.tema);
    setOlcek(VARSAYILAN.olcek);
    setPos(VARSAYILAN.pos);
    setVurguFormat(VARSAYILAN.vurgu);
    if (anahtar) { try { localStorage.removeItem(anahtar); } catch { /* gec */ } }
  }

  // WhatsApp ile matbaaya gonder (yoksa indir + WhatsApp ac)
  async function gonder() {
    if (!link || gonderiliyor) return;
    setGonderiliyor(true);
    try {
      const ad = `${asciiAd(benimAd)}_davetiye_karekodum_${tema}`;
      const { blob } = await tumFormatlarZipBlob({ link, tema }, ad);
      const dosya = new File([blob], `${ad}.zip`, { type: "application/zip" });
      const nav = navigator as Navigator & { canShare?: (d?: unknown) => boolean; share?: (d: unknown) => Promise<void> };
      const mesaj = "Davetiyeme ekleyeceğiniz karekod dosyası (tüm formatlar) ektedir.";
      if (nav.canShare && nav.canShare({ files: [dosya] }) && nav.share) {
        await nav.share({ files: [dosya], title: "Davetiye Karekodum", text: mesaj });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = `${ad}.zip`;
        document.body.appendChild(a); a.click(); a.remove();
        URL.revokeObjectURL(url);
        window.open("https://wa.me/?text=" + encodeURIComponent(mesaj + " (İndirilen ZIP dosyasını ekleyiniz.)"), "_blank");
      }
    } catch { /* iptal / desteklenmiyor - sessiz gec */ } finally { setGonderiliyor(false); }
  }

  if (durum === "yukleniyor") {
    return <AppShell><div className="flex min-h-[50vh] items-center justify-center font-govde text-sm text-ikincil">Yükleniyor…</div></AppShell>;
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
        {/* ---- Yonerge (iki yana yasli) ---- */}
        <p className="max-w-3xl text-justify font-govde text-sm leading-relaxed text-ikincil">
          Bu menüyü kullanarak davetiyenize ekleyeceğiniz karekodu doğrudan matbaacınız ile paylaşın.
          Aşağıdaki <span className="font-medium text-murekkep">“Karekodumu Doğrudan Matbaacıya Gönder”</span> düğmesi;
          matbaacınızın kullandığı programa uygun olarak tercih edeceği biçimi seçebilmesi için karekodu SVG, PNG,
          PDF, JPG ve WEBP formatlarının tümünü içerecek şekilde tek bir ZIP olarak göndermenizi sağlar.
        </p>

        {/* ---- Yanip sonen uyari (iki yana yasli) ---- */}
        <div className="mt-4 flex items-start gap-2.5 rounded-2xl border border-amber-500/50 bg-amber-500/10 px-4 py-3">
          <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0 animate-pulse text-amber-500" aria-hidden>
            <path d="M12 3.2 1.8 20.5h20.4L12 3.2Z" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinejoin="round" />
            <path d="M12 9.5v4.2" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" />
            <circle cx="12" cy="17" r="0.35" fill="currentColor" stroke="currentColor" strokeWidth={0.9} />
          </svg>
          <p className="text-justify font-govde text-[0.8rem] leading-relaxed text-murekkep">
            <span className="animate-pulse font-semibold text-amber-600">Önemli:</span>{" "}
            Bu karekod ile yalnızca size ait anı girişi sayfasına yönlendirme sağlanır; yalnızca kendi
            yakınlarınıza dağıtacağınız davetiyelere eklenilmelidir. Eşinizin yakınlarına dağıtılacak
            davetiyelerde eşinizin kendi karekodu kullanılmalıdır — iki davetiye ayrı ayrı bastırılır ve
            dağıtılır. Basım öncesi bu talebinizi matbaacınıza bildirin.
          </p>
        </div>

        <div className="mt-6 grid gap-7 md:grid-cols-[1fr_290px]">
          {/* ================= ONIZLEME ================= */}
          <div>
            <div
              ref={davetiyeRef}
              className="relative mx-auto aspect-[5/7] w-full max-w-[440px] overflow-hidden rounded-[14px] shadow-[0_24px_70px_-28px_rgba(33,26,23,0.55)] ring-1 ring-black/5"
              style={{ background: zemin }}
            >
              {/* cift altin cerceve */}
              <div className="pointer-events-none absolute inset-[14px] rounded-[8px]" style={{ border: `1.5px solid ${yazi.yaldiz}` }} />
              <div className="pointer-events-none absolute inset-[19px] rounded-[5px]" style={{ border: `0.75px solid ${yazi.ayrac}` }} />

              {/* davetiye icerigi */}
              <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-col items-center px-[13%] pt-[11%] text-center">
                <span className="font-govde text-[0.56rem] uppercase tracking-[0.34em]" style={{ color: yazi.ikincil }}>Düğün Davetiyesi</span>

                {/* botanik - zarif, simetrik */}
                <svg viewBox="0 0 72 104" className="mt-3 h-[4.4rem] w-auto" fill="none" stroke={yazi.yaldiz} strokeWidth={1.1} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M36 104 C 36 84 36 62 36 42" />
                  <path d="M36 86 C 27 82 21 84 17 91 C 25 93 31 90 36 86 Z" />
                  <path d="M36 86 C 45 82 51 84 55 91 C 47 93 41 90 36 86 Z" />
                  <path d="M36 70 C 28 67 23 68 20 74 C 27 76 33 73 36 70 Z" />
                  <path d="M36 70 C 44 67 49 68 52 74 C 45 76 39 73 36 70 Z" />
                  <path d="M36 42 C 29 42 24 35 27 27 C 33 30 36 35 36 42 Z" />
                  <path d="M36 42 C 43 42 48 35 45 27 C 39 30 36 35 36 42 Z" />
                  <path d="M36 42 C 36 34 36 28 36 23" />
                  <circle cx="36" cy="20.5" r="2.5" />
                </svg>

                {/* eş isimleri */}
                <div className="mt-5 font-display leading-tight" style={{ color: yazi.ana }}>
                  <span className="text-[1.5rem]">{es1}</span>
                  <span className="mx-2.5 font-display text-[1.2rem] italic" style={{ color: yazi.yaldiz }}>&amp;</span>
                  <span className="text-[1.5rem]">{es2}</span>
                </div>

                <div className="mt-4 h-px w-14" style={{ background: `linear-gradient(90deg, transparent, ${yazi.yaldiz}, transparent)` }} />

                {/* mesaj */}
                <p className="mt-4 font-display text-[0.74rem] italic leading-relaxed" style={{ color: yazi.ikincil }}>
                  Bu özel günümüzde sizleri de aramızda<br />görmekten mutluluk duyarız.
                </p>

                {/* tarih bloku */}
                <div className="mt-5 flex items-center justify-center gap-3.5" style={{ color: yazi.ana }}>
                  <div className="h-px w-9" style={{ background: yazi.ayrac }} />
                  <span className="font-govde text-[0.58rem] tracking-[0.22em]" style={{ color: yazi.ikincil }}>{tarihBlok.haftaGun}</span>
                  <div className="text-center leading-none">
                    <div className="font-govde text-[0.54rem] tracking-[0.24em]" style={{ color: yazi.ikincil }}>{tarihBlok.ay}</div>
                    <div className="my-1 font-display text-[1.7rem] leading-none">{tarihBlok.gun}</div>
                    <div className="font-govde text-[0.54rem] tracking-[0.18em]" style={{ color: yazi.ikincil }}>{tarihBlok.yil}</div>
                  </div>
                  <div className="h-px w-9" style={{ background: yazi.ayrac }} />
                </div>
              </div>

              {/* SURUKLENEBILIR + OLCEKLENEBILIR LOCKUP (yalniz bu oge touch-none) */}
              {lockupHtml && (
                <div
                  onPointerDown={surukleBasla}
                  onPointerMove={surukleHareket}
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
              <span className="font-medium text-murekkep"> boyutlandır</span> · önizleme {vurguFormat.toUpperCase()}, gönderilen dosya tüm formatları içerir.
            </p>
          </div>

          {/* ================= KONTROLLER ================= */}
          <div className="flex flex-col gap-5">
            <p className="text-justify font-govde text-xs leading-relaxed text-ikincil">
              Davetiyenize en yakın zemin rengini seçin; karekodu sürükleyip boyutlandırın, açık/koyu tema ile
              en okunaklı duruşu belirleyin.
            </p>

            {/* Zemin - yalniz ozel renk secici */}
            <div>
              <p className="mb-2.5 font-govde text-xs font-medium uppercase tracking-etiket text-ikincil">Davetiye zemini</p>
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-ayrac p-2.5 transition-colors hover:bg-yuzeyKoyu">
                <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ring-1 ring-black/10" style={{ background: zemin }}>
                  <span
                    className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full ring-2 ring-parsomen"
                    style={{ background: "conic-gradient(from 0deg, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)" }}
                  />
                  <input type="color" value={zemin} onChange={(e) => { setZemin(e.target.value); setTemaSecim(null); }} className="absolute inset-0 cursor-pointer opacity-0" aria-label="Zemin rengi seç" />
                </span>
                <span className="min-w-0">
                  <span className="block font-govde text-sm font-medium text-murekkep">Renk seç</span>
                  <span className="block font-govde text-[0.68rem] uppercase tracking-wide text-ikincil">{zemin}</span>
                </span>
              </label>
            </div>

            {/* Boyut */}
            <div>
              <div className="mb-2 flex items-baseline justify-between">
                <p className="font-govde text-xs font-medium uppercase tracking-etiket text-ikincil">Boyut</p>
                <span className="font-govde text-[0.62rem] text-ikincil/70">%{olcek}</span>
              </div>
              <input type="range" min={16} max={56} value={olcek} onChange={(e) => setOlcek(Number(e.target.value))} className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-ayrac accent-sarap" />
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

            {/* Gonder + Sifirla */}
            <div className="flex flex-col gap-2">
              <button onClick={gonder} disabled={gonderiliyor} className="flex items-center justify-center gap-2 rounded-full bg-sarap px-5 py-3.5 text-center font-govde text-[0.82rem] font-medium leading-tight text-parsomen transition-colors hover:bg-sarapKoyu disabled:opacity-60">
                <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" aria-hidden>
                  <path d="M4 12l16-8-6 16-3-6-7-2Z" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinejoin="round" strokeLinecap="round" />
                </svg>
                {gonderiliyor ? "Hazırlanıyor…" : "Karekodumu Doğrudan Matbaacıya Gönder (tüm formatlar · ZIP)"}
              </button>
              <button onClick={sifirla} className="rounded-full border border-ayrac px-5 py-2 font-govde text-xs font-medium text-ikincil transition-colors hover:bg-yuzeyKoyu">
                Önizlemeyi sıfırla
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
