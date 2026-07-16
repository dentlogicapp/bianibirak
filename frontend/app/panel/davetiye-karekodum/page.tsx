"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api, davetiyeKarekodum } from "@/lib/api";
import { AppShell } from "@/components/site/AppShell";
import { lockupSvg, type LockupTema } from "@/lib/lockup";
import { karekodIndir, FORMATLAR, type Format } from "@/lib/indir";
import { MARKA } from "@/lib/marka";

// DAVETIYE KAREKODUM
//
// Her es YALNIZ kendi karekodunu gorur/indirir (izolasyon - backend'de zorlanir).
// Fonsuz lockup: wordmark + "Senden Bize Kalan" + yaldiz cizgi + karekod. Cagri metni
// YOK. Cift, davetiyesine gore acik/koyu tema secer. Kisa link tasinir - kucuk basilan
// karekod okunur.
export default function DavetiyeKarekodumSayfasi() {
  const router = useRouter();
  const [kisaKod, setKisaKod] = useState<string | null>(null);
  const [durum, setDurum] = useState<"yukleniyor" | "hazir" | "yok">("yukleniyor");
  const [tema, setTema] = useState<LockupTema>("acik");
  const [format, setFormat] = useState<Format>("png");
  const [indiriliyor, setIndiriliyor] = useState(false);
  const [kopyalandi, setKopyalandi] = useState(false);

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

  // Link frontend'de kurulur - domain gelince (cift o domaindeyken) kendiliginden doner.
  const link = useMemo(() => {
    if (!kisaKod || typeof window === "undefined") return "";
    return `${window.location.origin}/d/${kisaKod}`;
  }, [kisaKod]);

  const onizlemeSvg = useMemo(() => {
    if (!link) return "";
    return lockupSvg({ link, tema });
  }, [link, tema]);

  async function indir() {
    if (!link || indiriliyor) return;
    setIndiriliyor(true);
    try {
      const ad = `davetiye-karekodum-${tema}`;
      await karekodIndir({ link, tema }, format, ad);
    } finally {
      setIndiriliyor(false);
    }
  }

  async function kopyala() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setKopyalandi(true);
      setTimeout(() => setKopyalandi(false), 1600);
    } catch {
      /* pano erisimi yoksa sessiz gec */
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
      <div className="mx-auto max-w-3xl">
        {/* Baslik */}
        <div className="mb-8">
          <h1 className="font-serif text-2xl text-murekkep sm:text-3xl">Davetiye Karekodum</h1>
          <p className="mt-2 max-w-xl font-govde text-sm leading-relaxed text-ikincil">
            Bu karekodu davetiyene ekle. Okutan davetliler, senin tarafından gelen
            dilekleri defterine bırakır. Karekod küçük basılsa bile rahatça okunur.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-[1fr_260px]">
          {/* ---- Onizleme ---- */}
          <div
            className={`flex items-center justify-center rounded-3xl border border-ayrac p-8 sm:p-12 ${
              tema === "koyu" ? "bg-[#14100c]" : "bg-parsomen"
            }`}
          >
            {onizlemeSvg ? (
              <div
                className="w-full max-w-[300px]"
                // Inline SVG - DOM'da Inter cizilir (onizleme birebir).
                dangerouslySetInnerHTML={{ __html: onizlemeSvg }}
              />
            ) : null}
          </div>

          {/* ---- Kontroller ---- */}
          <div className="flex flex-col gap-5">
            {/* Tema */}
            <div>
              <p className="mb-2 font-govde text-xs font-medium uppercase tracking-etiket text-ikincil">
                Tema
              </p>
              <p className="mb-3 font-govde text-xs leading-snug text-ikincil/80">
                Davetiyenin rengine göre seç. Açık zeminli davetiyeye açık, koyu/renkli
                davetiyeye koyu tema oturur.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <TemaDugme secili={tema === "acik"} onClick={() => setTema("acik")} etiket="Açık" />
                <TemaDugme secili={tema === "koyu"} onClick={() => setTema("koyu")} etiket="Koyu" />
              </div>
            </div>

            {/* Format */}
            <div>
              <p className="mb-2 font-govde text-xs font-medium uppercase tracking-etiket text-ikincil">
                Format
              </p>
              <div className="flex flex-col gap-1.5">
                {FORMATLAR.map((f) => (
                  <button
                    key={f.kod}
                    onClick={() => setFormat(f.kod)}
                    className={`flex items-baseline justify-between gap-2 rounded-xl border px-3 py-2 text-left transition-colors ${
                      format === f.kod
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

            {/* Indir */}
            <button
              onClick={indir}
              disabled={indiriliyor}
              className="mt-1 flex items-center justify-center gap-2 rounded-full bg-sarap px-6 py-3 font-govde text-sm font-medium text-parsomen transition-colors hover:bg-sarapKoyu disabled:opacity-60"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
                <path d="M12 4v10m0 0 4-4m-4 4-4-4M5 19h14" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" fill="none" />
              </svg>
              {indiriliyor ? "Hazırlanıyor…" : "Karekodu indir"}
            </button>

            {/* Link kopyala (bonus) */}
            <button
              onClick={kopyala}
              className="flex items-center justify-center gap-2 rounded-full border border-ayrac px-6 py-2.5 font-govde text-xs font-medium text-murekkep transition-colors hover:bg-yuzeyKoyu"
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-ikincil" aria-hidden>
                <rect x="9" y="9" width="11" height="11" rx="2.2" stroke="currentColor" strokeWidth={1.6} fill="none" />
                <path d="M6 15H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1" stroke="currentColor" strokeWidth={1.6} fill="none" />
              </svg>
              {kopyalandi ? "Bağlantı kopyalandı" : "Bağlantıyı kopyala"}
            </button>
          </div>
        </div>

        {/* Alt not - izolasyon guvencesi */}
        <p className="mt-6 font-govde text-xs leading-relaxed text-ikincil/80">
          Bu karekod yalnızca senindir. Eşinin kendi karekodu ayrıdır; iki taraftan gelen
          dilekler ayrı toplanır, {MARKA.tagline.toLocaleLowerCase("tr-TR")} bir defterde
          birleşir.
        </p>
      </div>
    </AppShell>
  );
}

function TemaDugme({
  secili,
  onClick,
  etiket,
}: {
  secili: boolean;
  onClick: () => void;
  etiket: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl border px-3 py-2 font-govde text-sm font-medium transition-colors ${
        secili ? "border-sarap bg-sarap/8 text-murekkep" : "border-ayrac text-ikincil hover:bg-yuzeyKoyu"
      }`}
    >
      {etiket}
    </button>
  );
}
