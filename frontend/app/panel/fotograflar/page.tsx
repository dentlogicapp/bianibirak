"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api, gorselYukle, type EtkinlikGorseli } from "@/lib/api";
import { gorselHazirla } from "@/lib/gorsel";
import { AppShell } from "@/components/site/AppShell";

// FOTOGRAFLAR (en fazla 8 - Musa karari).
// Ayni havuz uc yerde: davetli karsilama ekrani, panel, defter (PDF).
// Cift her an degistirir, siralar, defterdeki KONUMUNU secer.
const KONUMLAR: { kod: string; ad: string; aciklama: string; tekil: boolean }[] = [
  { kod: "kapak", ad: "Kapak", aciklama: "Defterin kapağında, yaldız çerçeveli", tekil: true },
  { kod: "ithaf", ad: "İthaf sayfası", aciklama: "İthaf metninin üstünde", tekil: true },
  { kod: "kapanis", ad: "Kapanış", aciklama: "Defterin son sayfasında", tekil: true },
  { kod: "bolum", ad: "Bölüm ayracı", aciklama: "Bölüm başlıklarının yanında", tekil: false },
  { kod: "galeri", ad: "Yalnız ekranda", aciklama: "Deftere girmez; davetli ekranında görünür", tekil: false },
];

export default function FotograflarSayfasi() {
  const router = useRouter();
  const [gorseller, setGorseller] = useState<EtkinlikGorseli[]>([]);
  const [tavan, setTavan] = useState(8);
  const [durum, setDurum] = useState<"yukleniyor" | "hazir" | "yok">("yukleniyor");
  const [yukleniyor, setYukleniyor] = useState(false);
  const dosyaRef = useRef<HTMLInputElement>(null);

  const cek = useCallback(async () => {
    const c = await api.gorselListe();
    if (!c.ok) {
      if (c.durum === 401) router.replace("/giris");
      else setDurum("yok");
      return;
    }
    setGorseller(c.veri.gorseller);
    setTavan(c.veri.tavan);
    setDurum("hazir");
  }, [router]);

  useEffect(() => {
    void cek();
  }, [cek]);

  async function dosyaSecildi(e: React.ChangeEvent<HTMLInputElement>) {
    const dosyalar = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (dosyalar.length === 0) return;

    const bosluk = tavan - gorseller.length;
    if (bosluk <= 0) {
      toast.error(`En fazla ${tavan} fotoğraf ekleyebilirsin. Önce birini kaldır.`);
      return;
    }

    setYukleniyor(true);
    let eklenen = 0;

    for (const ham of dosyalar.slice(0, bosluk)) {
      try {
        // Tarayicida kucult + EXIF temizle (GPS konumu dahil) - sonra gonder
        const hazir = await gorselHazirla(ham);
        const c = await gorselYukle({ dosya: hazir.dosya }, "galeri");
        URL.revokeObjectURL(hazir.onizlemeUrl);
        if (!c.ok) {
          toast.error(c.mesaj);
          break;
        }
        eklenen++;
      } catch (hata) {
        toast.error(hata instanceof Error ? hata.message : "Fotoğraf işlenemedi.");
        break;
      }
    }

    setYukleniyor(false);
    if (eklenen > 0) {
      toast.success(`${eklenen} fotoğraf eklendi.`);
      void cek();
    }
    if (dosyalar.length > bosluk) {
      toast.error(`Yalnız ${bosluk} fotoğraf eklenebildi - tavan ${tavan}.`);
    }
  }

  async function konumDegistir(g: EtkinlikGorseli, konum: string) {
    const c = await api.gorselGuncelle(g.id, { konum });
    if (!c.ok) {
      toast.error(c.mesaj);
      return;
    }
    void cek();
  }


  async function tasi(index: number, yon: -1 | 1) {
    const hedef = index + yon;
    if (hedef < 0 || hedef >= gorseller.length) return;
    const yeni = [...gorseller];
    [yeni[index], yeni[hedef]] = [yeni[hedef], yeni[index]];
    setGorseller(yeni);
    const c = await api.gorselSirala(yeni.map((g) => g.id));
    if (!c.ok) {
      toast.error(c.mesaj);
      void cek();
    }
  }

  async function sil(g: EtkinlikGorseli) {
    const c = await api.gorselSil(g.id);
    if (!c.ok) {
      toast.error(c.mesaj);
      return;
    }
    toast.success("Fotoğraf kaldırıldı.");
    void cek();
  }

  if (durum === "yukleniyor") {
    return (
      <AppShell>
        <div className="flex min-h-[50vh] items-center justify-center font-govde text-sm text-ikincil">
          Yükleniyor...
        </div>
      </AppShell>
    );
  }

  if (durum === "yok") {
    return (
      <AppShell>
        <div className="rounded-3xl border border-ayrac bg-yuzey p-10 text-center">
          <p className="font-govde text-sm text-ikincil">Aktif bir etkinlik seçili değil.</p>
        </div>
      </AppShell>
    );
  }

  const dolu = gorseller.length;

  return (
    <AppShell>
      <p className="metin-yasli font-govde text-sm leading-relaxed text-ikincil">
        En fazla <span className="font-medium text-murekkep">{tavan} fotoğraf</span> ekleyebilirsin.
        Bu fotoğraflar davetlilerin gördüğü ekranda, panelinde ve defterinde kullanılır.
        Her birinin defterdeki yerini sen seçersin - istediğin an değiştirebilirsin.
      </p>

      <p className="mt-2 font-govde text-xs text-ikincil">
        Fotoğrafın kalitesi korunur; konum bilgisi (GPS) güvenlik için otomatik silinir.
        Hiç fotoğraf eklemesen de defterin tipografik kapağıyla eser kalitesinde olur.
      </p>

      {/* Yukleme */}
      <div className="mt-5 flex items-center justify-between gap-3">
        <p className="font-govde text-xs uppercase tracking-etiket text-ikincil">
          {dolu} / {tavan}
        </p>
        <button
          onClick={() => dosyaRef.current?.click()}
          disabled={yukleniyor || dolu >= tavan}
          className="rounded-full bg-sarap px-6 py-2.5 font-govde text-sm font-medium text-parsomen transition-colors hover:bg-sarapKoyu disabled:opacity-50"
        >
          {yukleniyor ? "Hazırlanıyor..." : "Fotoğraf ekle"}
        </button>
        <input
          ref={dosyaRef}
          type="file"
          accept="image/*"
          multiple
          onChange={dosyaSecildi}
          className="hidden"
        />
      </div>

      {gorseller.length === 0 ? (
        <div className="mt-5 rounded-3xl border border-dashed border-ayrac bg-parsomen px-6 py-12 text-center">
          <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-sarap/10 text-sarap">
            <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
              <path d="M4 7a2 2 0 0 1 2-2h2l1.5-2h5L16 5h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7Z" stroke="currentColor" strokeWidth={1.6} strokeLinejoin="round" fill="none" />
              <circle cx="12" cy="12" r="3.2" stroke="currentColor" strokeWidth={1.6} fill="none" />
            </svg>
          </span>
          <p className="mt-4 font-display text-lg text-murekkep">Henüz fotoğraf yok</p>
          <p className="metin-yasli mx-auto mt-2 max-w-sm font-govde text-sm leading-relaxed text-ikincil">
            Bir kapak fotoğrafı, davetlilerin sizi görmesini sağlar - ve daha içten dilekler
            yazmalarına yardım eder.
          </p>
        </div>
      ) : (
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {gorseller.map((g, i) => (
            <div key={g.id} className="min-w-0 overflow-hidden rounded-2xl border border-ayrac bg-yuzey">
              {/* Gorsel */}
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-parsomen">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={g.url}
                  alt="Fotoğraf"
                  className="h-full w-full object-cover"
                />
                {g.konum !== "galeri" && (
                  <span className="absolute left-3 top-3 rounded-full bg-sarap px-2.5 py-1 font-govde text-[0.6rem] uppercase tracking-etiket text-parsomen">
                    {KONUMLAR.find((k) => k.kod === g.konum)?.ad}
                  </span>
                )}
              </div>

              <div className="p-4">
                {/* Konum secimi */}
                <label className="mb-1.5 block font-govde text-[0.65rem] uppercase tracking-etiket text-ikincil">
                  Defterdeki yeri
                </label>
                <select
                  value={g.konum}
                  onChange={(e) => konumDegistir(g, e.target.value)}
                  className="w-full rounded-lg border border-ayrac bg-parsomen px-3 py-2 font-govde text-sm text-murekkep outline-none focus:border-sarap"
                >
                  {KONUMLAR.map((k) => (
                    <option key={k.kod} value={k.kod}>
                      {k.ad}
                    </option>
                  ))}
                </select>
                <p className="mt-1 font-govde text-[0.7rem] text-ikincil">
                  {KONUMLAR.find((k) => k.kod === g.konum)?.aciklama}
                </p>

                {/* Islemler */}
                <div className="mt-3 flex items-center justify-between gap-2">
                  <div className="flex gap-1">
                    <button
                      onClick={() => tasi(i, -1)}
                      disabled={i === 0}
                      aria-label="Öne al"
                      className="rounded-md border border-ayrac p-1.5 text-ikincil transition-colors hover:border-sarap hover:text-sarap disabled:opacity-30"
                    >
                      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" aria-hidden>
                        <path d="m15 5-7 7 7 7" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
                      </svg>
                    </button>
                    <button
                      onClick={() => tasi(i, 1)}
                      disabled={i === gorseller.length - 1}
                      aria-label="Sona al"
                      className="rounded-md border border-ayrac p-1.5 text-ikincil transition-colors hover:border-sarap hover:text-sarap disabled:opacity-30"
                    >
                      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" aria-hidden>
                        <path d="m9 5 7 7-7 7" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
                      </svg>
                    </button>
                  </div>

                  <button
                    onClick={() => sil(g)}
                    className="rounded-full border border-ayrac px-3 py-1.5 font-govde text-xs text-ikincil transition-colors hover:border-sarap hover:text-sarap"
                  >
                    Kaldır
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
