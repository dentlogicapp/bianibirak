"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, type Etkinlik, type EtkinlikAyar } from "@/lib/api";
import { VARSAYILAN } from "@/lib/varsayilan";
import { AppShell } from "@/components/site/AppShell";
import { useOtoKaydet, otoKayitEtiket } from "@/lib/oto-kaydet";

// Etkinlik Ayarlari (duzenle): hardcoded olmayan alanlar + CANLI ONIZLEME.
// Karsilama metni, prompt, kapanis penceresi -> davetli ekraninin canli onizlemesi.
export default function DuzenleSayfasi() {
  const router = useRouter();
  const [etkinlik, setEtkinlik] = useState<Etkinlik | null>(null);
  const [ayar, setAyar] = useState<EtkinlikAyar | null>(null);
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
      const a = await api.etkinlikAyarlar();
      if (a.ok) setAyar(a.veri);
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

  if (durum === "yok" || !etkinlik || !ayar) {
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

  return <DuzenleForm etkinlik={etkinlik} ilkAyar={ayar} />;
}

function DuzenleForm({ etkinlik, ilkAyar }: { etkinlik: Etkinlik; ilkAyar: EtkinlikAyar }) {
  const [karsilama, setKarsilama] = useState(ilkAyar.karsilama_metni ?? VARSAYILAN.karsilamaMetni);
  const [prompt, setPrompt] = useState(ilkAyar.prompt_metni ?? VARSAYILAN.promptMetni);
  const [gun, setGun] = useState(String(ilkAyar.kapanis_pencere_gun));
  const [hata, setHata] = useState("");

  const karsilamaVarsayilan = karsilama.trim() === VARSAYILAN.karsilamaMetni;
  const promptVarsayilan = prompt.trim() === VARSAYILAN.promptMetni;

  // Otomatik kaydetme: her alan degisiminde debounce'lu kayit (kaydet butonu YOK).
  const degistiMi =
    karsilama !== (ilkAyar.karsilama_metni ?? VARSAYILAN.karsilamaMetni) ||
    prompt !== (ilkAyar.prompt_metni ?? VARSAYILAN.promptMetni) ||
    gun !== String(ilkAyar.kapanis_pencere_gun);

  async function kaydet(): Promise<boolean> {
    setHata("");
    const g = parseInt(gun, 10);
    if (isNaN(g) || g < VARSAYILAN.minKapanisPencereGun || g > VARSAYILAN.maxKapanisPencereGun) {
      setHata(`Kapanış penceresi en az ${VARSAYILAN.minKapanisPencereGun} gün olmalıdır.`);
      return false;
    }
    const cevap = await api.etkinlikAyarGuncelle({
      karsilamaMetni: karsilama,
      promptMetni: prompt,
      kapanisPencereGun: g,
    });
    if (!cevap.ok) {
      setHata(cevap.mesaj);
      return false;
    }
    return true;
  }

  const kayitDurum = useOtoKaydet(
    JSON.stringify({ karsilama, prompt, gun }),
    degistiMi,
    kaydet
  );
  const gosterge = otoKayitEtiket(kayitDurum);

  return (
    <AppShell>
      <div className="rounded-3xl border border-ayrac bg-yuzey p-6 sm:p-8">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-govde text-xs uppercase tracking-etiket text-yaldiz">Etkinlik</p>
            <h1 className="mt-2 font-display text-2xl text-murekkep sm:text-3xl">Etkinlik Ayarları</h1>
          </div>
          {gosterge && (
            <span
              className={`shrink-0 rounded-full border border-ayrac bg-parsomen px-3 py-1.5 font-govde text-xs ${gosterge.sinif}`}
            >
              {gosterge.metin}
            </span>
          )}
        </div>
        <p className="mt-2 font-govde text-sm leading-relaxed text-ikincil">
          Davetlilerin göreceği metinleri düzenle. Değişiklikler otomatik kaydedilir ve
          sağdaki canlı önizlemede anında görünür.
        </p>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Duzenleme */}
        <div className="rounded-3xl border border-ayrac bg-yuzey p-6 sm:p-8">
          <div className="space-y-5">
            <AlanBaslik
              etiket="Karşılama metni"
              varsayilanMi={karsilamaVarsayilan}
              onVarsayilan={() => setKarsilama(VARSAYILAN.karsilamaMetni)}
            />
            <textarea
              value={karsilama}
              onChange={(e) => setKarsilama(e.target.value)}
              rows={3}
              className="-mt-3 w-full rounded-xl border border-ayrac bg-parsomen px-4 py-3 font-govde text-sm text-murekkep outline-none focus:border-sarap"
            />

            <AlanBaslik
              etiket="Yönlendirici metin (prompt)"
              varsayilanMi={promptVarsayilan}
              onVarsayilan={() => setPrompt(VARSAYILAN.promptMetni)}
            />
            <input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="-mt-3 w-full rounded-xl border border-ayrac bg-parsomen px-4 py-3 font-govde text-sm text-murekkep outline-none focus:border-sarap"
            />

            <div>
              <label className="mb-2 block font-govde text-xs uppercase tracking-etiket text-ikincil">
                Kapanış penceresi (gün)
              </label>
              <input
                type="number"
                min={VARSAYILAN.minKapanisPencereGun}
                max={VARSAYILAN.maxKapanisPencereGun}
                value={gun}
                onChange={(e) => setGun(e.target.value)}
                className="w-40 rounded-xl border border-ayrac bg-parsomen px-4 py-3 font-govde text-sm text-murekkep outline-none focus:border-sarap"
              />
              <p className="mt-2 font-govde text-xs text-ikincil">
                Etkinlik tarihinden sonra bu kadar gün dilek toplanır. Minimum{" "}
                {VARSAYILAN.minKapanisPencereGun} gün.
              </p>
            </div>

            {hata && (
              <p className="font-govde text-sm text-sarap" role="alert">
                {hata}
              </p>
            )}
          </div>
        </div>

        {/* Canli onizleme - davetli ekrani */}
        <div>
          <p className="mb-3 font-govde text-xs uppercase tracking-etiket text-ikincil">
            Canlı önizleme - davetlinin göreceği ekran
          </p>
          <div className="rounded-3xl border border-ayrac bg-parsomen p-6">
            <div className="rounded-2xl border border-ayrac bg-yuzey p-6 text-center">
              <p className="font-govde text-xs uppercase tracking-etiket text-yaldiz">
                {etkinlik.es1_ad} &amp; {etkinlik.es2_ad}
              </p>
              <p className="mt-4 font-display text-lg leading-snug text-murekkep">
                {karsilama || "Karşılama metni buraya gelecek"}
              </p>
              {prompt && (
                <p className="mt-3 font-govde text-sm text-ikincil">{prompt}</p>
              )}
              <div className="mt-5 space-y-2 text-left">
                <div className="h-9 rounded-lg border border-ayrac bg-parsomen" />
                <div className="h-9 rounded-lg border border-ayrac bg-parsomen" />
                <div className="h-20 rounded-lg border border-ayrac bg-parsomen" />
              </div>
              <div className="mt-4 h-10 rounded-full bg-sarap" />
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function AlanBaslik({
  etiket,
  varsayilanMi,
  onVarsayilan,
}: {
  etiket: string;
  varsayilanMi: boolean;
  onVarsayilan: () => void;
}) {
  return (
    <div className="mb-2 flex items-center justify-between gap-2">
      <label className="block font-govde text-xs uppercase tracking-etiket text-ikincil">
        {etiket}
      </label>
      {!varsayilanMi && (
        <button
          type="button"
          onClick={onVarsayilan}
          className="font-govde text-xs text-sarap transition-colors hover:underline"
        >
          Varsayılana dön
        </button>
      )}
    </div>
  );
}
