"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api, karekodlarim, onizlemeGetir, onizlemeKaydet, type Etkinlik, type Karekodlarim } from "@/lib/api";
import { AppShell } from "@/components/site/AppShell";
import { lockupSvg, type LockupTema } from "@/lib/lockup";
import { tumFormatlarZipBlob } from "@/lib/indir";

// DAVETIYE KAREKODUM
//
// Cift, davetiyesine ekleyecegi karekodlari (kendi + esi) matbaaya WhatsApp ile IKI ayri
// ZIP olarak gonderir. Onizleme PAYLASIMLI: iki es ayni davetiye taslagini duzenler,
// yakin-canli (polling ~3sn) birbirinin degisikligini gorur; son duzenleyenin hali kalir.
// Tema, zemin renginin parlakligindan OTOMATIK belirlenir (manuel secim yok).

const AYLAR = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
const GUNLER = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];

const LOCKUP_ORAN = 1.214;
const CERCEVE_X = 6;
const CERCEVE_Y = 4.5;
const VARSAYILAN = { zemin: "#525151", olcek: 35, pos: { x: 50, y: 100 } };

function koyuMu(hex: string): boolean {
  const h = hex.replace("#", "");
  if (h.length < 6) return true;
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.58;
}
function davetiyeYazi(koyu: boolean) {
  return koyu
    ? { ana: "#f2e8d6", ikincil: "rgba(242,232,214,0.74)", yaldiz: "#d4af6a", ayrac: "rgba(212,175,106,0.55)" }
    : { ana: "#3a2f26", ikincil: "rgba(58,47,38,0.64)", yaldiz: "#a8823c", ayrac: "rgba(168,130,60,0.5)" };
}
function asciiAd(s: string): string {
  const m: Record<string, string> = { "ş": "s", "Ş": "S", "ç": "c", "Ç": "C", "ğ": "g", "Ğ": "G", "ı": "i", "İ": "I", "ö": "o", "Ö": "O", "ü": "u", "Ü": "U" };
  return (s || "").replace(/[şŞçÇğĞıİöÖüÜ]/g, (c) => m[c] ?? c).trim().replace(/\s+/g, "_").replace(/[^A-Za-z0-9_]/g, "");
}

// premium isaretci (Lucide "pointer") - el emojisi yerine markaya uygun.
// renk/golge disaridan verilir ki hem acik hem koyu zeminde HER ZAMAN gorunur olsun.
function Isaretci({ anim, renk, golge }: { anim: string; renk: string; golge: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`h-8 w-8 ${anim}`} style={{ filter: `drop-shadow(0 1px 2.5px ${golge})` }} fill="none" stroke={renk} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M22 14a8 8 0 0 1-8 8" />
      <path d="M18 11v-1a2 2 0 0 0-2-2 2 2 0 0 0-2 2" />
      <path d="M14 10V9a2 2 0 0 0-2-2 2 2 0 0 0-2 2v1" />
      <path d="M10 9.5V4a2 2 0 0 0-2-2 2 2 0 0 0-2 2v10" />
      <path d="M18 11a2 2 0 1 1 4 0v3a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
    </svg>
  );
}
function IpucuBalon({ etiket }: { etiket: string }) {
  return <span className="mt-1 rounded-full bg-murekkep/85 px-2 py-0.5 font-govde text-[0.6rem] font-medium text-parsomen">{etiket}</span>;
}

export default function DavetiyeKarekodumSayfasi() {
  const router = useRouter();
  const [etkinlik, setEtkinlik] = useState<Etkinlik | null>(null);
  const [kodlar, setKodlar] = useState<Karekodlarim | null>(null);
  const [durum, setDurum] = useState<"yukleniyor" | "hazir" | "yok">("yukleniyor");

  const [zemin, setZemin] = useState(VARSAYILAN.zemin);
  const [olcek, setOlcek] = useState(VARSAYILAN.olcek);
  const [pos, setPos] = useState(VARSAYILAN.pos);
  const [suruklyor, setSuruklyor] = useState(false);
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [kaydetDurum, setKaydetDurum] = useState<"bos" | "kaydediliyor" | "kaydedildi">("bos");
  const [esDuzenliyor, setEsDuzenliyor] = useState(false);
  const [ipucu, setIpucu] = useState({ suruk: true, boyut: true, renk: true });

  const davetiyeRef = useRef<HTMLDivElement | null>(null);
  const yuklendi = useRef(false);
  const uzaktanRef = useRef(false);
  const benimSurumRef = useRef("");
  const rolRef = useRef("");
  const suruklyorRef = useRef(false);

  useEffect(() => { suruklyorRef.current = suruklyor; }, [suruklyor]);

  const anahtar = etkinlik ? `bab-karekodum-onizleme-${etkinlik.id}` : null;
  const ipucuAnahtar = etkinlik ? `bab-karekodum-ipucu-${etkinlik.id}` : null;

  // ---- ilk yukleme ----
  useEffect(() => {
    (async () => {
      const e = await api.etkinlikAktif();
      if (!e.ok) { if (e.durum === 401) router.replace("/giris"); else setDurum("yok"); return; }
      setEtkinlik(e.veri);
      const k = await karekodlarim();
      if (!k) { setDurum("yok"); return; }
      setKodlar(k);
      rolRef.current = k.es;

      const o = await onizlemeGetir();
      if (o && o.guncellenme) {
        uzaktanRef.current = true; // ilk uygulamada kaydetme
        if (o.zemin) setZemin(o.zemin);
        if (o.olcek) setOlcek(o.olcek);
        setPos({ x: o.posX, y: o.posY });
        benimSurumRef.current = o.guncellenme;
      } else {
        uzaktanRef.current = true; // varsayilanlari geri-kaydetme
      }
      // ipucu (kisisel - cihaz basina)
      try {
        const ip = localStorage.getItem(`bab-karekodum-ipucu-${e.veri.id}`);
        if (ip) setIpucu(JSON.parse(ip));
      } catch { /* gec */ }

      yuklendi.current = true;
      setDurum("hazir");
    })();
  }, [router]);

  // ---- otomatik kaydet (debounce) ----
  useEffect(() => {
    if (!yuklendi.current) return;
    if (uzaktanRef.current) { uzaktanRef.current = false; return; } // uzaktan/ilk uygulama - kaydetme
    setKaydetDurum("kaydediliyor");
    const t = setTimeout(async () => {
      const sonuc = await onizlemeKaydet({ zemin, olcek, posX: pos.x, posY: pos.y });
      if (sonuc?.guncellenme) benimSurumRef.current = sonuc.guncellenme;
      setKaydetDurum("kaydedildi");
    }, 700);
    return () => clearTimeout(t);
  }, [zemin, olcek, pos]);

  // ---- yakin-canli senkron (polling ~3sn) ----
  useEffect(() => {
    if (durum !== "hazir") return;
    const id = setInterval(async () => {
      if (suruklyorRef.current) return; // surukleme sirasinda uygulama yok
      const o = await onizlemeGetir();
      if (!o || !o.guncellenme) return;
      if (o.guncellenme > benimSurumRef.current) {
        // KIMDEN gelirse gelsin uygula (ayni hesap coklu cihaz da senkron olsun).
        uzaktanRef.current = true;
        if (o.zemin) setZemin(o.zemin);
        if (o.olcek) setOlcek(o.olcek);
        setPos({ x: o.posX, y: o.posY });
        benimSurumRef.current = o.guncellenme;
        // "esiniz duzenliyor" yalniz KARSI es duzenlediyse.
        if (o.sonDuzenleyen && o.sonDuzenleyen !== rolRef.current) {
          setEsDuzenliyor(true);
          setTimeout(() => setEsDuzenliyor(false), 3500);
        }
      }
    }, 3000);
    return () => clearInterval(id);
  }, [durum]);

  const link = useMemo(() => {
    if (!kodlar || typeof window === "undefined") return "";
    return `${window.location.origin}/d/${kodlar.benim.kisaKod}`;
  }, [kodlar]);

  const koyu = koyuMu(zemin);
  const tema: LockupTema = koyu ? "koyu" : "acik";
  const yazi = davetiyeYazi(koyu);
  const lockupHtml = useMemo(() => (link ? lockupSvg({ link, tema }) : ""), [link, tema]);

  const es1 = etkinlik?.es1_ad?.trim() || "Eş İsmi";
  const es2 = etkinlik?.es2_ad?.trim() || "Eş İsmi";
  const tarihStr = useMemo(() => {
    const t = etkinlik?.etkinlik_tarihi;
    if (!t) return "01 Eylül 2026 · Salı";
    const [y, m, d] = t.slice(0, 10).split("-").map(Number);
    if (!y || !m || !d) return "01 Eylül 2026 · Salı";
    const dt = new Date(y, m - 1, d);
    return `${String(d).padStart(2, "0")} ${AYLAR[m - 1]} ${y} · ${GUNLER[dt.getDay()]}`;
  }, [etkinlik]);

  // ---- clamp: ic cerceve icinde; boyutta merkez korunur ----
  const clampPos = useCallback((x: number, y: number, olcekVal: number) => {
    const kutu = davetiyeRef.current;
    const oran = kutu ? kutu.clientWidth / kutu.clientHeight : 5 / 7;
    const yariW = olcekVal / 2;
    const yariH = (olcekVal * oran / LOCKUP_ORAN) / 2;
    const minX = CERCEVE_X + yariW, maxX = 100 - CERCEVE_X - yariW;
    const minY = CERCEVE_Y + yariH, maxY = 100 - CERCEVE_Y - yariH;
    return { x: minX > maxX ? 50 : Math.max(minX, Math.min(maxX, x)), y: minY > maxY ? 50 : Math.max(minY, Math.min(maxY, y)) };
  }, []);
  useEffect(() => { setPos((p) => clampPos(p.x, p.y, olcek)); }, [olcek, clampPos]);

  function konumGuncelle(cx: number, cy: number) {
    const kutu = davetiyeRef.current;
    if (!kutu) return;
    const r = kutu.getBoundingClientRect();
    setPos(clampPos(((cx - r.left) / r.width) * 100, ((cy - r.top) / r.height) * 100, olcek));
  }
  function ipucuKapat(hangi: "suruk" | "boyut" | "renk") {
    setIpucu((p) => {
      if (!p[hangi]) return p;
      const y = { ...p, [hangi]: false };
      if (ipucuAnahtar) { try { localStorage.setItem(ipucuAnahtar, JSON.stringify(y)); } catch { /* gec */ } }
      return y;
    });
  }
  function surukleBasla(e: React.PointerEvent) {
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setSuruklyor(true);
    ipucuKapat("suruk");
    konumGuncelle(e.clientX, e.clientY);
  }
  function surukleHareket(e: React.PointerEvent) { if (suruklyor) konumGuncelle(e.clientX, e.clientY); }
  function surukleBitir(e: React.PointerEvent) {
    setSuruklyor(false);
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch { /* gec */ }
  }

  function sifirla() {
    uzaktanRef.current = false;
    setZemin(VARSAYILAN.zemin);
    setOlcek(VARSAYILAN.olcek);
    setPos(clampPos(VARSAYILAN.pos.x, VARSAYILAN.pos.y, VARSAYILAN.olcek));
    setIpucu({ suruk: true, boyut: true, renk: true });
    if (ipucuAnahtar) { try { localStorage.removeItem(ipucuAnahtar); } catch { /* gec */ } }
  }

  // ---- WhatsApp: HER IKI karekodu iki ayri ZIP olarak gonder ----
  async function gonder() {
    if (!kodlar || typeof window === "undefined" || gonderiliyor) return;
    setGonderiliyor(true);
    try {
      const kok = window.location.origin;
      const benimLink = `${kok}/d/${kodlar.benim.kisaKod}`;
      const esinLink = `${kok}/d/${kodlar.esin.kisaKod}`;
      const benimAdi = `${asciiAd(kodlar.benim.ad || "es")}_davetiye_karekodum_${tema}`;
      const esinAdi = `${asciiAd(kodlar.esin.ad || "es")}_davetiye_karekodum_${tema}`;

      const [b1, b2] = await Promise.all([
        tumFormatlarZipBlob({ link: benimLink, tema }, benimAdi),
        tumFormatlarZipBlob({ link: esinLink, tema }, esinAdi),
      ]);
      const f1 = new File([b1.blob], `${benimAdi}.zip`, { type: "application/zip" });
      const f2 = new File([b2.blob], `${esinAdi}.zip`, { type: "application/zip" });

      const nav = navigator as Navigator & { canShare?: (d?: unknown) => boolean; share?: (d: unknown) => Promise<void> };
      const mesaj = "Davetiyelerimize ekleyeceğiniz karekod dosyaları (iki taraf, tüm formatlar) ektedir.";
      if (nav.canShare && nav.canShare({ files: [f1, f2] }) && nav.share) {
        await nav.share({ files: [f1, f2], title: "Davetiye Karekodları", text: mesaj });
      } else {
        for (const f of [f1, f2]) {
          const url = URL.createObjectURL(f);
          const a = document.createElement("a");
          a.href = url; a.download = f.name;
          document.body.appendChild(a); a.click(); a.remove();
          URL.revokeObjectURL(url);
        }
        window.open("https://wa.me/?text=" + encodeURIComponent(mesaj + " (İnen iki ZIP dosyasını ekleyiniz.)"), "_blank");
      }
    } catch { /* iptal/desteklenmiyor - sessiz */ } finally { setGonderiliyor(false); }
  }

  if (durum === "yukleniyor") {
    return <AppShell><div className="flex min-h-[50vh] items-center justify-center font-govde text-sm text-ikincil">Yükleniyor…</div></AppShell>;
  }
  if (durum === "yok") {
    return (
      <AppShell>
        <div className="rounded-3xl border border-ayrac bg-yuzey p-10 text-center">
          <p className="font-govde text-sm text-ikincil">Aktif bir defter seçili değil.</p>
          <button onClick={() => router.push("/etkinliklerim")} className="mt-6 rounded-full bg-sarap px-7 py-3 font-govde text-sm font-medium text-parsomen transition-colors hover:bg-sarapKoyu">Defterlerime git</button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl">
        {/* ---- Yonerge (iki yana yasli) ---- */}
        <p className="max-w-3xl text-justify font-govde text-sm leading-relaxed text-ikincil">
          Bu menüyü kullanarak davetiyenize ekleyeceğiniz karekodlarınızı (eşinizin ve kendinizinkini) tek
          seferde doğrudan matbaacınız ile paylaşın. Aşağıdaki <span className="font-medium text-murekkep">“Karekodlarımızı Basım için Doğrudan Matbaacıya Gönder”</span> düğmesi;
          matbaacınızın kullandığı programa uygun olarak tercih edeceği biçimi seçebilmesi için karekodları
          SVG, PNG, PDF, JPG ve WEBP formatlarının tümünü içerecek şekilde iki ayrı ZIP olarak göndermenizi sağlar.
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
            Önizlemesi aşağıda bulunan karekod ile yalnızca size ait anı girişi sayfasına yönlendirme sağlanır;
            yalnızca kendi yakınlarınıza dağıtacağınız davetiyelere eklenilmelidir. Eşinizin yakınlarına
            dağıtılacak davetiyelerde eşinizin kendi karekodu kullanılmalıdır — iki davetiye ayrı ayrı bastırılır
            ve dağıtılır. Basım öncesi bu talebinizi matbaacınıza bildirin.
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
              <div className="pointer-events-none absolute inset-[14px] rounded-[8px]" style={{ border: `1.5px solid ${yazi.yaldiz}` }} />
              <div className="pointer-events-none absolute inset-[19px] rounded-[5px]" style={{ border: `0.75px solid ${yazi.ayrac}` }} />

              {/* icerik - cicek YOK, tarih yatay */}
              <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-col items-center px-[12%] pt-[13%] text-center">
                <span className="font-govde text-[0.58rem] uppercase tracking-[0.34em]" style={{ color: yazi.ikincil }}>Düğün Davetiyesi</span>

                <div className="mt-7 font-display leading-tight" style={{ color: yazi.ana }}>
                  <span className="text-[1.75rem]">{es1}</span>
                  <span className="mx-2.5 font-display text-[1.35rem] italic" style={{ color: yazi.yaldiz }}>&amp;</span>
                  <span className="text-[1.75rem]">{es2}</span>
                </div>

                <div className="mt-5 h-px w-16" style={{ background: `linear-gradient(90deg, transparent, ${yazi.yaldiz}, transparent)` }} />

                <p className="mt-5 font-display text-[0.86rem] italic leading-relaxed" style={{ color: yazi.ikincil }}>
                  Bu mutlu günümüzde sizleri de aramızda<br />görmekten mutluluk duyarız.
                </p>

                {/* tarih - yatay, yaldiz cizgiler arasinda */}
                <div className="mt-6 flex w-full items-center justify-center gap-3">
                  <div className="h-px flex-1" style={{ background: `linear-gradient(90deg, transparent, ${yazi.ayrac})` }} />
                  <span className="whitespace-nowrap font-govde text-[0.68rem] tracking-[0.12em]" style={{ color: yazi.ana }}>{tarihStr}</span>
                  <div className="h-px flex-1" style={{ background: `linear-gradient(90deg, ${yazi.ayrac}, transparent)` }} />
                </div>
              </div>

              {/* SURUKLENEBILIR + OLCEKLENEBILIR LOCKUP */}
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
                    className={`rounded-md transition-shadow [&_svg]:block [&_svg]:h-auto [&_svg]:w-full ${suruklyor || ipucu.suruk ? "ring-1 ring-white/60" : ""}`}
                    dangerouslySetInnerHTML={{ __html: lockupHtml }}
                  />
                </div>
              )}

              {/* ipucu: surukle (dokununca kaybolur) - zemine gore gorunur */}
              {ipucu.suruk && lockupHtml && (
                <div className="pointer-events-none absolute z-20 flex flex-col items-center" style={{ left: `${pos.x}%`, top: `${pos.y}%`, transform: "translate(-50%, -50%)" }}>
                  <Isaretci anim="ipucu-suruk" renk={koyu ? "#f4ebda" : "#2c2119"} golge={koyu ? "rgba(0,0,0,0.55)" : "rgba(255,255,255,0.8)"} />
                  <IpucuBalon etiket="sürükle" />
                </div>
              )}
            </div>

            {/* durum satiri: kaydedildi / esiniz duzenliyor */}
            <div className="mt-3 flex min-h-[1.1rem] items-center justify-center gap-2 font-govde text-xs text-ikincil">
              {esDuzenliyor ? (
                <span className="flex items-center gap-1.5 text-sarap">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-sarap" /> Eşiniz düzenliyor…
                </span>
              ) : kaydetDurum === "kaydediliyor" ? (
                <span>Kaydediliyor…</span>
              ) : kaydetDurum === "kaydedildi" ? (
                <span className="flex items-center gap-1 text-emerald-700">
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7" /></svg>
                  Kaydedildi · eşinizin ekranına da yansır
                </span>
              ) : (
                <span>Karekodu <span className="font-medium text-murekkep">sürükle</span>, aşağıdan <span className="font-medium text-murekkep">boyutlandır</span>.</span>
              )}
            </div>
          </div>

          {/* ================= KONTROLLER ================= */}
          <div className="flex flex-col gap-5">
            <p className="text-justify font-govde text-xs leading-relaxed text-ikincil">
              Davetiyenize en yakın zemin rengini seçin; karekodu sürükleyip boyutlandırın. Açık/koyu görünüm
              zemine göre kendiliğinden en okunaklı biçimde ayarlanır.
            </p>

            {/* Zemin - ozel renk secici + ipucu */}
            <div>
              <p className="mb-2.5 font-govde text-xs font-medium uppercase tracking-etiket text-ikincil">Davetiye zemini</p>
              <div className="relative">
                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-ayrac p-2.5 transition-colors hover:bg-yuzeyKoyu">
                  <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ring-1 ring-black/10" style={{ background: zemin }}>
                    <span className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full ring-2 ring-parsomen" style={{ background: "conic-gradient(from 0deg, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)" }} />
                    <input type="color" value={zemin} onChange={(e) => { setZemin(e.target.value); ipucuKapat("renk"); }} className="absolute inset-0 cursor-pointer opacity-0" aria-label="Zemin rengi seç" />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-govde text-sm font-medium text-murekkep">Renk seç</span>
                    <span className="block font-govde text-[0.68rem] uppercase tracking-wide text-ikincil">{zemin}</span>
                  </span>
                </label>
                {ipucu.renk && (
                  <div className="pointer-events-none absolute left-3 top-1/2 z-20 flex -translate-y-1/2 flex-col items-center">
                    <Isaretci anim="ipucu-dokun" renk="#6e2438" golge="rgba(255,255,255,0.85)" />
                    <IpucuBalon etiket="renk seç" />
                  </div>
                )}
              </div>
            </div>

            {/* Boyut + ipucu */}
            <div>
              <div className="mb-2 flex items-baseline justify-between">
                <p className="font-govde text-xs font-medium uppercase tracking-etiket text-ikincil">Boyut</p>
                <span className="font-govde text-[0.62rem] text-ikincil/70">%{olcek}</span>
              </div>
              <div className="relative">
                <input type="range" min={16} max={56} value={olcek} onChange={(e) => { setOlcek(Number(e.target.value)); ipucuKapat("boyut"); }} className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-ayrac accent-sarap" />
                {ipucu.boyut && (
                  <div className="pointer-events-none absolute left-1/2 top-full z-20 mt-1 flex -translate-x-1/2 flex-col items-center">
                    <Isaretci anim="ipucu-kaydir" renk="#6e2438" golge="rgba(255,255,255,0.85)" />
                    <IpucuBalon etiket="boyutlandır" />
                  </div>
                )}
              </div>
            </div>

            {/* Gonder (premium nefes alan) + Sifirla */}
            <div className="mt-1 flex flex-col gap-2">
              <button onClick={gonder} disabled={gonderiliyor} className="premium-vurgu flex items-center justify-center gap-2 rounded-2xl bg-sarap px-5 py-4 text-center font-govde text-[0.82rem] font-medium leading-tight text-parsomen transition-colors hover:bg-sarapKoyu disabled:opacity-60">
                <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" aria-hidden>
                  <path d="M4 12l16-8-6 16-3-6-7-2Z" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinejoin="round" strokeLinecap="round" />
                </svg>
                {gonderiliyor ? "Hazırlanıyor…" : "Karekodlarımızı Basım için Doğrudan Matbaacıya Gönder (tüm formatlar · 2 Ayrı ZIP Dosyası)"}
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
