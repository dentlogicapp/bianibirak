"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { api, rontgenIndir, type SuperDefterDetay } from "@/lib/api";

// SAGLIK ROZETI - defterin dort ceyregi tek bakista.
//
// 100 = saglikli. 50 alti = mudahale gerektirir. Yonetici, LISTEDEN batan defteri
// gorur; her birini acmasi gerekmez. Planlama Defteri'nin saglik deseni, bu urunun
// gercek esiklerine uyarlandi (link paylasimi ve ilk dilek, bizim kritik esiklerimiz).
export function SaglikRozeti({ skor }: { skor: number }) {
  const renk =
    skor >= 75
      ? "bg-yaldiz/15 text-yaldiz"
      : skor >= 50
        ? "bg-ikincil/12 text-ikincil"
        : "bg-sarap/12 text-sarap";

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 font-govde text-[0.6rem] font-medium ${renk}`}
      title="Defter sağlığı: kurulum, link, ilk dilek, son 30 gün aktiflik"
    >
      <span className="tabular-nums">{skor}</span>
      <span className="opacity-70">/100</span>
    </span>
  );
}

// DEFTER DETAYI - salt-okunur derin gorunum.
//
// Liste "sorun var" der; detay "sorun BU" der. Ikisi olmadan destek KORU calisir:
// yonetici, cift'in ne yasadigini tahmin etmek zorunda kalir.
//
// Impersonation'a alternatiftir: daha az yetki, ayni teshis. Yonetici deftere
// GIRMEDEN sorunu gorur.
export function DefterDetayModal({
  defterId,
  onKapat,
}: {
  defterId: string;
  onKapat: () => void;
}) {
  const [veri, setVeri] = useState<SuperDefterDetay | null>(null);
  const [hata, setHata] = useState("");
  const [rontgenBekliyor, setRontgenBekliyor] = useState(false);

  useEffect(() => {
    void (async () => {
      const c = await api.superDefterDetay(defterId);
      if (c.ok) setVeri(c.veri);
      else setHata(c.mesaj);
    })();
  }, [defterId]);

  useEffect(() => {
    function tus(e: KeyboardEvent) {
      if (e.key === "Escape") onKapat();
    }
    document.addEventListener("keydown", tus);
    const eski = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", tus);
      document.body.style.overflow = eski;
    };
  }, [onKapat]);

  async function rontgen() {
    setRontgenBekliyor(true);
    const c = await rontgenIndir(defterId);
    setRontgenBekliyor(false);
    if (c.ok) toast.success("Röntgen indirildi (filigranlı).");
    else toast.error(c.mesaj);
  }

  const govde = (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-murekkep/70 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div className="flex h-full w-full flex-col overflow-hidden bg-parsomen shadow-[0_0_80px_rgba(33,26,23,0.5)] sm:m-auto sm:h-[94vh] sm:max-w-4xl sm:rounded-3xl">
        <div className="h-1 shrink-0 bg-gradient-to-r from-yaldiz/30 via-yaldiz to-yaldiz/30" aria-hidden />

        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-ayrac px-5 py-4 sm:px-8">
          <div className="min-w-0">
            <p className="font-govde text-[0.66rem] uppercase tracking-etiket text-yaldiz">
              Defter röntgeni
            </p>
            <h2 className="mt-0.5 truncate font-display text-xl text-murekkep">
              {veri ? `${veri.es1_ad} & ${veri.es2_ad}` : "Yükleniyor..."}
            </h2>
          </div>
          <button
            type="button"
            onClick={onKapat}
            className="shrink-0 rounded-full border border-ayrac p-2 text-ikincil transition-colors hover:border-sarap hover:text-sarap"
            aria-label="Kapat"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
              <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-8">
          {hata && (
            <p className="rounded-xl bg-sarap/10 px-4 py-3 font-govde text-sm text-sarap">{hata}</p>
          )}

          {!veri && !hata && (
            <p className="py-16 text-center font-govde text-sm text-ikincil">Yükleniyor...</p>
          )}

          {veri && (
            <div className="space-y-5">
              {/* SAGLIK - dort ceyrek, hangisi eksik? */}
              <Bolum baslik={`Sağlık · ${veri.saglik}/100`}>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <Ceyrek ad="Kurulum" tamam={veri.saglik_detay.kurulum} />
                  <Ceyrek ad="Link paylaşıldı" tamam={veri.saglik_detay.link} />
                  <Ceyrek ad="İlk dilek geldi" tamam={veri.saglik_detay.katki} />
                  <Ceyrek ad="Son 30 gün aktif" tamam={veri.saglik_detay.aktif_30_gun} />
                </div>
              </Bolum>

              {/* YASAM DONGUSU - defterin takvimi ve IMHA tarihi */}
              <Bolum baslik="Yaşam döngüsü">
                <div className="space-y-1.5">
                  <Satir etiket="Durum" deger={veri.kapandi ? "Kapandı" : "Açık"} />
                  <Satir etiket="Etkinlik" deger={tarih(veri.etkinlik_tarihi)} />
                  <Satir etiket="Kapanış" deger={tarih(veri.kapanis_tarihi)} />
                  <Satir
                    etiket="İmha"
                    deger={`${tarih(veri.imha_tarihi)} · ${
                      veri.imhaya_kalan_gun > 0
                        ? `${veri.imhaya_kalan_gun} gün kaldı`
                        : "SÜRESİ DOLDU"
                    }`}
                    vurgu={veri.imhaya_kalan_gun <= 0}
                  />
                  <Satir etiket="Son hareket" deger={tarih(veri.son_hareket)} />
                </div>
              </Bolum>

              {/* DILEKLER */}
              <Bolum baslik={`Dilekler · ${veri.katki.toplam}`}>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <Sayi etiket="Onaylı" deger={veri.katki.onayli} />
                  <Sayi etiket="Bekleyen" deger={veri.katki.beklemede} />
                  <Sayi etiket="Reddedilen" deger={veri.katki.red} />
                  <Sayi etiket="Fotoğraflı" deger={veri.katki.fotografli} />
                </div>
                <div className="mt-2 space-y-1.5">
                  <Satir
                    etiket="Taraf dağılımı"
                    deger={`${veri.es1_ad}: ${veri.katki.es1} · ${veri.es2_ad}: ${veri.katki.es2}`}
                  />
                  {veri.katki.son_katki && (
                    <Satir etiket="Son dilek" deger={tarih(veri.katki.son_katki)} />
                  )}
                </div>
              </Bolum>

              {/* KURASYON + CIKTILAR */}
              <Bolum baslik="Baskı Stüdyosu">
                {veri.kurasyon ? (
                  <div className="space-y-1.5">
                    <Satir etiket="Durum" deger={veri.kurasyon.durum} />
                    <Satir etiket="Tema" deger={veri.kurasyon.tema} />
                    <Satir etiket="Esere dahil" deger={`${veri.kurasyon.esere_dahil} dilek`} />
                    {veri.ciktilar.length > 0 && (
                      <Satir
                        etiket="Son çıktı"
                        deger={`${tarih(veri.ciktilar[0].created_at)} · ${
                          veri.ciktilar[0].filigranli ? "önizleme" : "indirme"
                        }`}
                      />
                    )}
                  </div>
                ) : (
                  <p className="font-govde text-sm text-ikincil">Kürasyon henüz açılmamış.</p>
                )}
              </Bolum>

              {/* UYELER */}
              <Bolum baslik={`Eşler · ${veri.uyeler.length}`}>
                <div className="space-y-2">
                  {veri.uyeler.map((u) => (
                    <div key={u.id} className="flex items-center gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sarap font-display text-xs text-parsomen">
                        {u.ad.charAt(0).toLocaleUpperCase("tr-TR")}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-govde text-sm text-murekkep">
                          {u.ad}
                          {u.askida && (
                            <span className="ml-2 font-govde text-[0.6rem] uppercase tracking-etiket text-sarap">
                              Askıda
                            </span>
                          )}
                        </p>
                        <p className="truncate font-govde text-xs text-ikincil">{u.email}</p>
                      </div>
                      <span className="shrink-0 font-govde text-[0.62rem] uppercase tracking-etiket text-ikincil">
                        {u.rol}
                      </span>
                    </div>
                  ))}
                </div>
              </Bolum>

              {/* LINKLER + MEDYA */}
              <Bolum baslik="Bağlantılar ve medya">
                <div className="space-y-1.5">
                  {veri.linkler.map((l) => (
                    <Satir
                      key={l.es}
                      etiket={l.es === "es1" ? veri.es1_ad : veri.es2_ad}
                      deger={l.aktif ? "Aktif" : "Kapalı"}
                    />
                  ))}
                  <Satir
                    etiket="Görsel"
                    deger={`${veri.medya.adet} adet · ${(veri.medya.bayt / 1048576).toFixed(1)} MB`}
                  />
                </div>
              </Bolum>
            </div>
          )}
        </div>

        {/* RONTGEN - ciftin gordugu PDF'i uret. Impersonation gerekmez. */}
        <div className="flex shrink-0 gap-2.5 border-t border-ayrac bg-yuzey px-5 py-4 sm:px-8">
          <button
            type="button"
            onClick={onKapat}
            className="rounded-full border border-ayrac px-5 py-2.5 font-govde text-sm text-ikincil transition-colors hover:border-murekkep hover:text-murekkep"
          >
            Kapat
          </button>
          <button
            type="button"
            onClick={rontgen}
            disabled={rontgenBekliyor || !veri?.kurasyon}
            title={
              veri && !veri.kurasyon
                ? "Kürasyon açılmamış - PDF üretilemez"
                : "Çiftin gördüğü PDF'i üret (filigranlı)"
            }
            className="flex-1 rounded-full bg-sarap px-5 py-2.5 font-govde text-sm font-medium text-parsomen transition-colors hover:bg-sarapKoyu disabled:opacity-40"
          >
            {rontgenBekliyor ? "Üretiliyor..." : "Defterin PDF'ini üret (röntgen)"}
          </button>
        </div>
      </div>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(govde, document.body);
}

// ---- kucuk parcalar ----

function Bolum({ baslik, children }: { baslik: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-ayrac bg-yuzey p-4 sm:p-5">
      <p className="mb-3 font-govde text-[0.66rem] uppercase tracking-etiket text-ikincil">
        {baslik}
      </p>
      {children}
    </section>
  );
}

function Ceyrek({ ad, tamam }: { ad: string; tamam: boolean }) {
  return (
    <div
      className={`rounded-xl border px-3 py-2.5 ${
        tamam ? "border-yaldiz/40 bg-yaldiz/8" : "border-ayrac bg-parsomen"
      }`}
    >
      <span
        className={`flex h-4 w-4 items-center justify-center rounded-full ${
          tamam ? "bg-yaldiz/25 text-yaldiz" : "bg-ikincil/15 text-ikincil"
        }`}
      >
        {tamam ? (
          <svg viewBox="0 0 24 24" className="h-2.5 w-2.5" aria-hidden>
            <path d="m5 12.5 4.2 4.2L19 7" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="h-2.5 w-2.5" aria-hidden>
            <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" />
          </svg>
        )}
      </span>
      <p className="mt-1.5 font-govde text-[0.7rem] leading-tight text-murekkep">{ad}</p>
    </div>
  );
}

function Sayi({ etiket, deger }: { etiket: string; deger: number }) {
  return (
    <div className="rounded-xl border border-ayrac bg-parsomen px-3 py-2.5">
      <p className="font-display text-xl leading-none text-murekkep tabular-nums">{deger}</p>
      <p className="mt-1 font-govde text-[0.62rem] uppercase tracking-etiket text-ikincil">
        {etiket}
      </p>
    </div>
  );
}

function Satir({
  etiket,
  deger,
  vurgu,
}: {
  etiket: string;
  deger: string;
  vurgu?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="shrink-0 font-govde text-xs text-ikincil">{etiket}</span>
      <span
        className={`min-w-0 truncate font-govde text-sm ${
          vurgu ? "font-medium text-sarap" : "text-murekkep"
        }`}
      >
        {deger}
      </span>
    </div>
  );
}

function tarih(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("tr-TR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}
