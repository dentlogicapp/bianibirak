"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { api, type SssMadde } from "@/lib/api";

// SSS YONETIMI - bilgi tabanini yoneticiler buradan buyutur.
//
// NEDEN PANELDE: destek yukunu kaliсi olarak dusuren tek sey, ayni sorunun bir daha
// sorulmamasidir. Her yeni destek dalgasindan sonra buraya bir madde eklenir; bilgi
// tabani BUYUR ve sonraki kullanicilar cevabi kendileri bulur. Icerik koda gomulu
// olsaydi her guncelleme bir deploy gerektirirdi - ve pratikte hicbir zaman yapilmazdi.
//
// GORUNTULENME SAYACI: hangi maddenin gercekten aciliyor oldugunu gosterir. Cok acilan
// bir madde, cozulmesi gereken bir URUN SORUNUNU isaret eder - SSS bir olcum araci
// olarak da calisir.
export function SssYonetimi() {
  const [maddeler, setMaddeler] = useState<SssMadde[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [duzenlenen, setDuzenlenen] = useState<SssMadde | null>(null);
  const [yeni, setYeni] = useState(false);
  const [ara, setAra] = useState("");

  const cek = useCallback(async () => {
    const c = await api.superSssListe();
    if (c.ok) setMaddeler(c.veri.maddeler);
    setYukleniyor(false);
  }, []);

  useEffect(() => { void cek(); }, [cek]);

  const suzulmus = useMemo(() => {
    const q = ara.trim().toLocaleLowerCase("tr-TR");
    if (!q) return maddeler;
    return maddeler.filter((m) =>
      `${m.kategori} ${m.alt_kategori} ${m.soru} ${m.cevap}`.toLocaleLowerCase("tr-TR").includes(q)
    );
  }, [maddeler, ara]);

  // Agac gorunumu - yonetici de kullanicinin gordugu yapiyi gorsun.
  const agac = useMemo(() => {
    const harita = new Map<string, Map<string, SssMadde[]>>();
    for (const m of suzulmus) {
      if (!harita.has(m.kategori)) harita.set(m.kategori, new Map());
      const alt = harita.get(m.kategori)!;
      if (!alt.has(m.alt_kategori)) alt.set(m.alt_kategori, []);
      alt.get(m.alt_kategori)!.push(m);
    }
    return harita;
  }, [suzulmus]);

  async function sil(m: SssMadde) {
    const c = await api.superSssSil(m.id);
    if (!c.ok) { toast.error(c.mesaj); return; }
    toast.success("Madde silindi.");
    void cek();
  }

  return (
    <div>
      {/* Ust serit */}
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-ayrac bg-yuzey px-5 py-3">
        <div className="min-w-0 flex-1">
          <p className="font-govde text-sm font-medium text-murekkep">
            {maddeler.length} madde · {agac.size} kategori
          </p>
          <p className="font-govde text-xs text-ikincil">
            Kullanıcılar bu içeriği destek ekranında görür
          </p>
        </div>
        <button
          onClick={() => { setYeni(true); setDuzenlenen(null); }}
          className="rounded-full bg-sarap px-5 py-2.5 font-govde text-xs font-medium text-parsomen transition-colors hover:bg-sarapKoyu"
        >
          + Yeni madde
        </button>
      </div>

      <input
        value={ara}
        onChange={(e) => setAra(e.target.value)}
        placeholder="Madde ara..."
        className="mb-4 w-full rounded-xl border border-ayrac bg-yuzey px-4 py-2.5 font-govde text-sm text-murekkep outline-none focus:border-sarap"
      />

      {yukleniyor ? (
        <p className="rounded-2xl border border-ayrac bg-yuzey px-5 py-8 text-center font-govde text-sm text-ikincil">
          Yükleniyor...
        </p>
      ) : (
        <div className="space-y-3">
          {[...agac.entries()].map(([kategori, altlar]) => (
            <div key={kategori} className="overflow-hidden rounded-2xl border border-ayrac bg-yuzey">
              <div className="border-b border-ayrac bg-yuzeyKoyu px-4 py-2">
                <p className="font-govde text-xs font-medium uppercase tracking-etiket text-murekkep">
                  {kategori}
                </p>
              </div>
              <div className="divide-y divide-ayrac">
                {[...altlar.entries()].map(([alt, liste]) => (
                  <div key={alt} className="px-4 py-3">
                    <p className="mb-2 font-govde text-[0.65rem] uppercase tracking-etiket text-yaldiz">
                      {alt}
                    </p>
                    <div className="space-y-1.5">
                      {liste.map((m) => (
                        <div
                          key={m.id}
                          className={`flex items-start justify-between gap-3 rounded-xl px-3 py-2 ${
                            m.aktif ? "bg-parsomen" : "bg-parsomen opacity-50"
                          }`}
                        >
                          <div className="min-w-0">
                            <p className="font-govde text-xs font-medium text-murekkep">{m.soru}</p>
                            <p className="mt-0.5 line-clamp-2 font-govde text-[0.68rem] leading-snug text-ikincil">
                              {m.cevap}
                            </p>
                            <p className="mt-1 font-govde text-[0.6rem] text-ikincil">
                              {m.goruntulenme} görüntülenme{!m.aktif && " · pasif"}
                            </p>
                          </div>
                          <div className="flex shrink-0 gap-1">
                            <button
                              onClick={() => { setDuzenlenen(m); setYeni(false); }}
                              className="rounded-full border border-ayrac px-3 py-1.5 font-govde text-[0.65rem] text-ikincil transition-colors hover:border-sarap hover:text-sarap"
                            >
                              Düzenle
                            </button>
                            <button
                              onClick={() => sil(m)}
                              aria-label="Sil"
                              className="rounded-full px-2 py-1.5 text-ikincil transition-colors hover:text-sarap"
                            >
                              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" aria-hidden>
                                <path d="M5 7h14M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7M6.5 7l.7 12a2 2 0 0 0 2 1.9h5.6a2 2 0 0 0 2-1.9l.7-12" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" fill="none" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {(duzenlenen || yeni) && (
        <MaddeDuzenle
          madde={duzenlenen}
          kategoriler={[...new Set(maddeler.map((m) => m.kategori))]}
          altKategoriler={[...new Set(maddeler.map((m) => m.alt_kategori))]}
          onKapat={() => { setDuzenlenen(null); setYeni(false); }}
          onKaydedildi={() => { setDuzenlenen(null); setYeni(false); void cek(); }}
        />
      )}
    </div>
  );
}

function MaddeDuzenle({
  madde, kategoriler, altKategoriler, onKapat, onKaydedildi,
}: {
  madde: SssMadde | null;
  kategoriler: string[];
  altKategoriler: string[];
  onKapat: () => void;
  onKaydedildi: () => void;
}) {
  const [kategori, setKategori] = useState(madde?.kategori ?? "");
  const [alt, setAlt] = useState(madde?.alt_kategori ?? "");
  const [soru, setSoru] = useState(madde?.soru ?? "");
  const [cevap, setCevap] = useState(madde?.cevap ?? "");
  const [aktif, setAktif] = useState(madde?.aktif ?? true);
  const [kaydediliyor, setKaydediliyor] = useState(false);

  async function kaydet() {
    setKaydediliyor(true);
    const c = await api.superSssKaydet({
      id: madde?.id,
      kategori: kategori.trim(),
      altKategori: alt.trim(),
      soru: soru.trim(),
      cevap: cevap.trim(),
      aktif,
    });
    setKaydediliyor(false);
    if (!c.ok) { toast.error(c.mesaj); return; }
    toast.success(madde ? "Madde güncellendi." : "Madde eklendi.");
    onKaydedildi();
  }

  const girdiSinif =
    "w-full rounded-xl border border-ayrac bg-parsomen px-4 py-2.5 font-govde text-sm text-murekkep outline-none focus:border-sarap";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-murekkep/70 p-4 backdrop-blur-sm" onClick={onKapat}>
      <div
        className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-3xl border border-ayrac bg-yuzey p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="font-display text-lg text-murekkep">
          {madde ? "Maddeyi düzenle" : "Yeni madde"}
        </p>

        <div className="mt-4 space-y-3">
          <div>
            <label className="font-govde text-xs text-ikincil">Kategori (en geniş başlık)</label>
            <input
              list="sss-kategoriler"
              value={kategori}
              onChange={(e) => setKategori(e.target.value)}
              placeholder="Örn: Dilek Toplama"
              className={girdiSinif + " mt-1"}
            />
            <datalist id="sss-kategoriler">
              {kategoriler.map((k) => <option key={k} value={k} />)}
            </datalist>
          </div>

          <div>
            <label className="font-govde text-xs text-ikincil">Alt kategori (daha dar konu)</label>
            <input
              list="sss-altlar"
              value={alt}
              onChange={(e) => setAlt(e.target.value)}
              placeholder="Örn: Davetli Sorunları"
              className={girdiSinif + " mt-1"}
            />
            <datalist id="sss-altlar">
              {altKategoriler.map((a) => <option key={a} value={a} />)}
            </datalist>
          </div>

          <div>
            <label className="font-govde text-xs text-ikincil">Soru</label>
            <input value={soru} onChange={(e) => setSoru(e.target.value)} className={girdiSinif + " mt-1"} />
          </div>

          <div>
            <label className="font-govde text-xs text-ikincil">Cevap</label>
            <textarea
              value={cevap}
              onChange={(e) => setCevap(e.target.value)}
              rows={6}
              className={girdiSinif + " mt-1 resize-none"}
            />
          </div>

          <label className="flex cursor-pointer items-center gap-2">
            <input type="checkbox" checked={aktif} onChange={(e) => setAktif(e.target.checked)} className="h-4 w-4 accent-[#6e2438]" />
            <span className="font-govde text-xs text-murekkep">
              Yayında (kapatırsan kullanıcılar göremez, kayıt silinmez)
            </span>
          </label>
        </div>

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button onClick={onKapat} className="rounded-full border border-ayrac px-5 py-2.5 font-govde text-sm text-ikincil transition-colors hover:bg-yuzeyKoyu">
            Vazgeç
          </button>
          <button
            onClick={kaydet}
            disabled={kaydediliyor || !kategori.trim() || !alt.trim() || !soru.trim() || !cevap.trim()}
            className="rounded-full bg-sarap px-6 py-2.5 font-govde text-sm font-medium text-parsomen transition-colors hover:bg-sarapKoyu disabled:opacity-40"
          >
            {kaydediliyor ? "Kaydediliyor..." : "Kaydet"}
          </button>
        </div>
      </div>
    </div>
  );
}
