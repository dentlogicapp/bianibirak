"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { api, type Etkinlik, type Katki } from "@/lib/api";
import { AppShell } from "@/components/site/AppShell";
import { DilekInceleme } from "@/components/site/DilekInceleme";
import { esTarafiKisa } from "@/lib/es";
import { useOdakKatki } from "@/lib/odak";
import { toast } from "sonner";

// Defter ekrani: ozet + onay kuyrugu (izolasyon) + ortak defter.
// ANLIK: onaylanan dilek o anda kuyruktan cikip ortak deftere tasinir (yenileme YOK).
// Bildirimden gelen ?focus={id} -> ilgili dilege scroll + cerceve vurgusu + sonme.
export default function DefterSayfasi() {
  return (
    <Suspense fallback={<AppShell><Yukleniyor /></AppShell>}>
      <DefterIcerik />
    </Suspense>
  );
}

function Yukleniyor() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center font-govde text-sm text-ikincil">
      Yükleniyor...
    </div>
  );
}

function DefterIcerik() {
  const router = useRouter();
  const arama = useSearchParams();
  const [etkinlik, setEtkinlik] = useState<Etkinlik | null>(null);
  const [kuyruk, setKuyruk] = useState<Katki[]>([]);
  const [defter, setDefter] = useState<Katki[]>([]);
  const [durum, setDurum] = useState<"yukleniyor" | "hazir" | "yok">("yukleniyor");
  const [islenen, setIslenen] = useState<string | null>(null);
  const [inceleme, setInceleme] = useState<Katki | null>(null);
  const [redHedef, setRedHedef] = useState<Katki | null>(null);
  const [onayHedef, setOnayHedef] = useState<Katki | null>(null);
  const [copeTasiHedef, setCopeTasiHedef] = useState<Katki | null>(null);

  const odakId = arama.get("focus");

  useEffect(() => {
    (async () => {
      const e = await api.etkinlikAktif();
      if (!e.ok) {
        if (e.durum === 401) router.replace("/giris");
        else setDurum("yok");
        return;
      }
      setEtkinlik(e.veri);
      const [k, d] = await Promise.all([api.katkiKuyruk(), api.katkiDefter()]);
      if (k.ok) setKuyruk(k.veri);
      if (d.ok) setDefter(d.veri);
      setDurum("hazir");
    })();
  }, [router]);

  // Odak: dilek yuklendikten sonra scroll + vurgu
  useOdakKatki(durum === "hazir");

  // Bildirimden gelen dilek yerel listelerde var mi? Yoksa durumunu cek + toast.
  const odakIslendi = useRef<string | null>(null);
  useEffect(() => {
    if (!odakId || durum !== "hazir") return;
    if (odakIslendi.current === odakId) return; // ayni odak icin tek kez

    const kuyruktaVar = kuyruk.some((k) => k.id === odakId);
    const defterdeVar = defter.some((k) => k.id === odakId);

    if (kuyruktaVar) {
      odakIslendi.current = odakId;
      return; // bekleyen dilek - odak hook scroll+vurgu yapar
    }
    if (defterdeVar) {
      odakIslendi.current = odakId;
      toast.success("Bu dilek onaylanmış ve ortak deftere eklenmiş - aşağıda vurgulanıyor.");
      return;
    }

    // Listelerde yok: reddedilmis / silinmis / baska esin kuyrugunda.
    odakIslendi.current = odakId;
    api.katkiDurum(odakId).then((c) => {
      if (!c.ok) {
        toast.error("Ulaşmaya çalıştığın dileğe erişilemiyor - kaldırılmış olabilir.");
        return;
      }
      if (c.veri.durum === "red") {
        toast.error(
          "Ulaşmaya çalıştığın dilek reddedilmiş. Ortak deftere eklenmedi ve görüntülenemiyor."
        );
      } else {
        toast.error("Ulaşmaya çalıştığın dilek bu defterde görüntülenemiyor.");
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [odakId, durum, kuyruk.length, defter.length]);

  async function islem(k: Katki, onay: boolean) {
    if (islenen) return;
    setIslenen(k.id);
    const cevap = onay ? await api.katkiOnayla(k.id) : await api.katkiReddet(k.id);
    setIslenen(null);
    if (!cevap.ok) {
      toast.error(cevap.mesaj);
      return;
    }

    // ANLIK: kuyruktan cikar; onaylandiysa ORTAK DEFTERE ekle (yenileme gerekmez).
    setKuyruk((o) => o.filter((x) => x.id !== k.id));
    setInceleme(null);
    if (onay) {
      setDefter((o) => [{ ...k, durum: "onayli" }, ...o]);
      toast.success("Dilek onaylandı ve ortak deftere eklendi.");
    } else {
      toast("Dilek çöp kutusuna taşındı. 30 gün içinde geri alabilirsin.");
    }
  }

  async function copeAt(k: Katki) {
    if (islenen) return;
    setIslenen(k.id);
    const cevap = await api.copeat(k.id);
    setIslenen(null);
    if (!cevap.ok) { toast.error(cevap.mesaj); return; }
    setDefter((o) => o.filter((x) => x.id !== k.id));
    setInceleme(null);
    setCopeTasiHedef(null);
    toast("Dilek çöp kutusuna taşındı. 30 gün içinde geri alabilirsin.");
  }

  if (durum === "yukleniyor") {
    return (
      <AppShell>
        <Yukleniyor />
      </AppShell>
    );
  }

  if (durum === "yok" || !etkinlik) {
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

  return (
    <AppShell>
      {/* Ozet basligi */}
      <div className="rounded-3xl border border-ayrac bg-yuzey p-6 sm:p-8">
        <p className="font-govde text-xs uppercase tracking-etiket text-yaldiz">
          {turEtiketi(etkinlik.tur)} · {durumEtiketi(etkinlik.durum)}
        </p>
        <h1 className="mt-3 font-display text-2xl text-murekkep sm:text-3xl">
          {etkinlik.es1_ad} &amp; {etkinlik.es2_ad}
        </h1>
        <p className="mt-2 font-govde text-sm text-ikincil">
          {tarihSaatMetni(etkinlik.etkinlik_tarihi)}
        </p>
      </div>

      {/* Onay kuyrugu */}
      <section className="mt-6 rounded-3xl border border-ayrac bg-yuzey p-6 sm:p-8">
        <h2 className="font-display text-lg text-murekkep">Onay Bekleyen Dilekler</h2>
        <p className="metin-yasli mt-2 font-govde text-sm leading-relaxed text-ikincil">
          Yalnız senin bağlantından gelen dilekler burada. Onayladıkların ortak deftere eklenir;
          reddettiklerin çöp kutusuna taşınır (30 gün içinde geri alınabilir).
        </p>

        {kuyruk.length === 0 ? (
          <BosKuyruk defterBos={defter.length === 0} />
        ) : (
          <div className="mt-5 space-y-3">
            {kuyruk.map((k) => (
              <div
                key={k.id}
                data-katki-id={k.id}
                className="overflow-hidden rounded-2xl border border-ayrac bg-parsomen"
              >
                {/* KART GOVDESI TIKLANABILIR: es, onay vermeden ONCE dilegi
                    deftere girecegi HALIYLE gorur. Kor onay olmaz. */}
                <button
                  type="button"
                  onClick={() => setInceleme(k)}
                  className="group block w-full p-5 text-left transition-colors hover:bg-yuzey"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="min-w-0 font-govde text-xs uppercase tracking-etiket text-yaldiz">
                      {k.davetli_ad}
                    </p>

                    {/* Fotograf rozeti - iceride ne oldugunu listede de belli et */}
                    {k.foto_url && (
                      <span className="flex shrink-0 items-center gap-1 rounded-full bg-yaldiz/12 px-2 py-0.5 font-govde text-[0.6rem] text-yaldiz">
                        <svg viewBox="0 0 24 24" className="h-3 w-3" aria-hidden>
                          <path d="M4 7a2 2 0 0 1 2-2h2l1.5-2h5L16 5h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7Z" stroke="currentColor" strokeWidth={1.7} strokeLinejoin="round" fill="none" />
                          <circle cx="12" cy="12" r="3.2" stroke="currentColor" strokeWidth={1.7} fill="none" />
                        </svg>
                        Fotoğraf
                      </span>
                    )}
                  </div>

                  {k.davetli_iliski && (
                    <p className="mt-1 font-govde text-[0.7rem] text-ikincil">
                      {k.davetli_iliski}
                    </p>
                  )}

                  <p className="metin-yasli mt-2.5 line-clamp-3 font-govde text-sm leading-relaxed text-murekkep">
                    {k.mesaj}
                  </p>

                  {/* CAGRI - "hemen tikla" */}
                  <span className="mt-3 inline-flex items-center gap-1.5 font-govde text-[0.72rem] font-medium text-sarap transition-colors group-hover:text-sarapKoyu">
                    {k.davetli_ad} tarafından bırakılan dileği incelemek için tıkla
                    <svg viewBox="0 0 24 24" className="h-3 w-3 transition-transform group-hover:translate-x-0.5" aria-hidden>
                      <path d="m9 5 7 7-7 7" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
                    </svg>
                  </span>
                </button>

                {/* Hizli eylemler - incelemeden de onaylanabilir, ama karar kolay
                    olsun diye burada da durur. */}
                <div className="flex gap-2 border-t border-ayrac px-5 py-3">
                  <button
                    onClick={() => setOnayHedef(k)}
                    disabled={islenen === k.id}
                    className="rounded-full bg-sarap px-5 py-2 font-govde text-xs font-medium text-parsomen transition-colors hover:bg-sarapKoyu disabled:opacity-60"
                  >
                    {islenen === k.id ? "..." : "Onayla"}
                  </button>
                  <button
                    onClick={() => setRedHedef(k)}
                    disabled={islenen === k.id}
                    className="rounded-full border border-ayrac px-5 py-2 font-govde text-xs text-ikincil transition-colors hover:border-sarap hover:text-sarap disabled:opacity-60"
                  >
                    Reddet
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Ortak defter - onaylanan dilek ANINDA buraya duser */}
      {defter.length > 0 && (
        <section className="mt-6 rounded-3xl border border-ayrac bg-yuzey p-6 sm:p-8">
          <h2 className="font-display text-lg text-murekkep">Ortak defter</h2>
          <p className="metin-yasli mt-2 font-govde text-sm leading-relaxed text-ikincil">
            Onaylanan dilekler burada birleşir. Kürasyon aşamasında bu dilekler baskıya hazır bir
            mirasa dönüşecek.
          </p>
          <div className="mt-5 space-y-3">
            {defter.map((k) => (
              // Onaylanmis dilekler de incelenebilir - cift, deftere ne girdigini
              // her an tam haliyle gorebilmeli.
              <button
                type="button"
                key={k.id}
                data-katki-id={k.id}
                onClick={() => setInceleme(k)}
                className="group block w-full rounded-2xl border border-ayrac bg-parsomen p-5 text-left transition-colors hover:border-yaldiz/50 hover:bg-yuzey"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="min-w-0 truncate font-govde text-xs uppercase tracking-etiket text-yaldiz">
                    {k.davetli_ad}
                  </p>
                  <div className="flex shrink-0 items-center gap-2">
                    {k.foto_url && (
                      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-yaldiz" aria-hidden>
                        <path d="M4 7a2 2 0 0 1 2-2h2l1.5-2h5L16 5h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7Z" stroke="currentColor" strokeWidth={1.7} strokeLinejoin="round" fill="none" />
                        <circle cx="12" cy="12" r="3.2" stroke="currentColor" strokeWidth={1.7} fill="none" />
                      </svg>
                    )}
                    <span className="font-govde text-[0.65rem] uppercase tracking-etiket text-ikincil">
                      {esTarafiKisa(k.kaynak_es, etkinlik.es1_ad, etkinlik.es2_ad)}
                    </span>
                  </div>
                </div>

                {k.davetli_iliski && (
                  <p className="mt-1 font-govde text-[0.7rem] text-ikincil">
                    {k.davetli_iliski}
                  </p>
                )}

                <p className="metin-yasli mt-2 line-clamp-3 font-govde text-sm leading-relaxed text-murekkep">
                  {k.mesaj}
                </p>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* INCELEME - onay vermeden once dilegin KAGITTAKI halini gor */}
      {inceleme && (
        <DilekInceleme
          katki={inceleme}
          yukleniyor={islenen === inceleme.id}
          onOnayla={() => { const k = inceleme; setInceleme(null); setOnayHedef(k); }}
          onReddet={() => { const k = inceleme; setInceleme(null); setRedHedef(k); }}
          onCopeTasi={() => { const k = inceleme; setInceleme(null); setCopeTasiHedef(k); }}
          onKapat={() => setInceleme(null)}
        />
      )}

      {/* ONAY - yeni dilegi deftere ekleme kesin onayi */}
      {onayHedef && (
        <OnayModal
          katki={onayHedef}
          yukleniyor={islenen === onayHedef.id}
          onOnayla={() => { const k = onayHedef; islem(k, true); setOnayHedef(null); }}
          onKapat={() => setOnayHedef(null)}
        />
      )}

      {/* RED UYARI - yanlis reddi onle (Notlar SilDialog deseni): icerik onizleme + uyari */}
      {redHedef && (
        <RedUyariModal
          katki={redHedef}
          yukleniyor={islenen === redHedef.id}
          onOnayla={() => { const k = redHedef; islem(k, false); setRedHedef(null); }}
          onKapat={() => setRedHedef(null)}
        />
      )}

      {/* COPE TASI - onaylanmis dilegi sonradan cope tasima kesin onayi */}
      {copeTasiHedef && (
        <CopeTasiModal
          katki={copeTasiHedef}
          yukleniyor={islenen === copeTasiHedef.id}
          onOnayla={() => copeAt(copeTasiHedef)}
          onKapat={() => setCopeTasiHedef(null)}
        />
      )}
    </AppShell>
  );
}

// Red uyari modali - yanlis reddi onler. Icerik onizleme + "cop kutusuna tasinacak" uyarisi.
function RedUyariModal({ katki, yukleniyor, onOnayla, onKapat }: {
  katki: Katki; yukleniyor: boolean; onOnayla: () => void; onKapat: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onKapat}>
      <div className="w-full max-w-md rounded-3xl border border-ayrac bg-yuzey p-6" onClick={(e) => e.stopPropagation()}>
        <p className="font-display text-lg text-murekkep">Bu dileği reddet</p>

        {/* Uyari blogu */}
        <div className="mt-3 rounded-r-xl border-l-4 border-amber-400 bg-amber-500/10 px-4 py-3">
          <p className="font-govde text-sm leading-relaxed text-murekkep">
            Bu dilek <span className="font-semibold">çöp kutusuna</span> taşınacak ve ortak deftere eklenmeyecek.
            İstersen <span className="font-semibold">Çöp Kutusu</span> sayfasından geri alabilirsin;
            30 gün sonra otomatik olarak kalıcı silinir.
          </p>
        </div>

        {/* Icerik onizleme - yanlis dilegi reddetme */}
        <div className="mt-3 rounded-xl border border-ayrac bg-parsomen px-4 py-3">
          <p className="font-govde text-[0.65rem] uppercase tracking-etiket text-ikincil">
            {katki.davetli_ad}{katki.davetli_iliski ? ` · ${katki.davetli_iliski}` : ""}
          </p>
          <p className="metin-yasli mt-1.5 line-clamp-3 whitespace-pre-wrap font-govde text-sm leading-relaxed text-murekkep">
            {katki.mesaj}
          </p>
        </div>

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            onClick={onKapat}
            disabled={yukleniyor}
            className="rounded-full border border-ayrac px-5 py-2.5 font-govde text-sm text-ikincil transition-colors hover:bg-yuzeyKoyu disabled:opacity-50"
          >
            İptal
          </button>
          <button
            onClick={onOnayla}
            disabled={yukleniyor}
            className="flex items-center justify-center gap-1.5 rounded-full bg-sarap px-5 py-2.5 font-govde text-sm font-medium text-parsomen transition-colors hover:bg-sarapKoyu disabled:opacity-60"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
              <path d="M5 7h14M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7M6.5 7l.7 12a2 2 0 0 0 2 1.9h5.6a2 2 0 0 0 2-1.9l.7-12" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </svg>
            {yukleniyor ? "..." : "Reddet ve Çöpe Taşı"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Onay modali - yeni dilegi deftere ekleme kesin onayi. Icerik onizleme + olumlu ton.
function OnayModal({ katki, yukleniyor, onOnayla, onKapat }: {
  katki: Katki; yukleniyor: boolean; onOnayla: () => void; onKapat: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onKapat}>
      <div className="w-full max-w-md rounded-3xl border border-ayrac bg-yuzey p-6" onClick={(e) => e.stopPropagation()}>
        <p className="font-display text-lg text-murekkep">Bu dileği onayla</p>
        <p className="metin-yasli mt-2 font-govde text-sm leading-relaxed text-ikincil">
          Bu dilek <span className="font-medium text-murekkep">ortak defterine</span> eklenecek ve baskıya hazır
          defterinde yer alacak. İstersen sonradan çöp kutusuna taşıyabilirsin.
        </p>

        <div className="mt-3 rounded-xl border border-ayrac bg-parsomen px-4 py-3">
          <p className="font-govde text-[0.65rem] uppercase tracking-etiket text-yaldiz">
            {katki.davetli_ad}{katki.davetli_iliski ? ` · ${katki.davetli_iliski}` : ""}
          </p>
          <p className="metin-yasli mt-1.5 line-clamp-3 whitespace-pre-wrap font-govde text-sm leading-relaxed text-murekkep">
            {katki.mesaj}
          </p>
        </div>

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button onClick={onKapat} disabled={yukleniyor} className="rounded-full border border-ayrac px-5 py-2.5 font-govde text-sm text-ikincil transition-colors hover:bg-yuzeyKoyu disabled:opacity-50">
            İptal
          </button>
          <button onClick={onOnayla} disabled={yukleniyor} className="flex items-center justify-center gap-1.5 rounded-full bg-sarap px-5 py-2.5 font-govde text-sm font-medium text-parsomen transition-colors hover:bg-sarapKoyu disabled:opacity-60">
            <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
              <path d="M5 12l5 5L20 7" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </svg>
            {yukleniyor ? "..." : "Onayla ve Deftere Ekle"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Cope tasi modali - onaylanmis dilegi sonradan cope tasima kesin onayi.
function CopeTasiModal({ katki, yukleniyor, onOnayla, onKapat }: {
  katki: Katki; yukleniyor: boolean; onOnayla: () => void; onKapat: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onKapat}>
      <div className="w-full max-w-md rounded-3xl border border-ayrac bg-yuzey p-6" onClick={(e) => e.stopPropagation()}>
        <p className="font-display text-lg text-murekkep">Onaylı dileği çöpe taşı</p>

        <div className="mt-3 rounded-r-xl border-l-4 border-amber-400 bg-amber-500/10 px-4 py-3">
          <p className="font-govde text-sm leading-relaxed text-murekkep">
            Bu dilek <span className="font-semibold">ortak defterden çıkacak</span> ve çöp kutusuna taşınacak.
            İstersen <span className="font-semibold">Çöp Kutusu</span> sayfasından geri alabilirsin;
            30 gün sonra otomatik olarak kalıcı silinir.
          </p>
        </div>

        <div className="mt-3 rounded-xl border border-ayrac bg-parsomen px-4 py-3">
          <p className="font-govde text-[0.65rem] uppercase tracking-etiket text-ikincil">
            {katki.davetli_ad}{katki.davetli_iliski ? ` · ${katki.davetli_iliski}` : ""}
          </p>
          <p className="metin-yasli mt-1.5 line-clamp-3 whitespace-pre-wrap font-govde text-sm leading-relaxed text-murekkep">
            {katki.mesaj}
          </p>
        </div>

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button onClick={onKapat} disabled={yukleniyor} className="rounded-full border border-ayrac px-5 py-2.5 font-govde text-sm text-ikincil transition-colors hover:bg-yuzeyKoyu disabled:opacity-50">
            İptal
          </button>
          <button onClick={onOnayla} disabled={yukleniyor} className="flex items-center justify-center gap-1.5 rounded-full bg-sarap px-5 py-2.5 font-govde text-sm font-medium text-parsomen transition-colors hover:bg-sarapKoyu disabled:opacity-60">
            <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
              <path d="M5 7h14M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7M6.5 7l.7 12a2 2 0 0 0 2 1.9h5.6a2 2 0 0 0 2-1.9l.7-12" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </svg>
            {yukleniyor ? "..." : "Çöpe Taşı"}
          </button>
        </div>
      </div>
    </div>
  );
}

function turEtiketi(tur: string): string {  if (tur === "dugun") return "Düğün";
  if (tur === "nisan") return "Nişan";
  if (tur === "nikah") return "Nikah";
  return tur;
}

function durumEtiketi(durum: string): string {
  if (durum === "hazirlik") return "Hazırlık";
  if (durum === "aktif") return "Aktif";
  if (durum === "kapali") return "Kapalı";
  if (durum === "arsiv") return "Arşiv";
  return durum;
}

function tarihSaatMetni(iso: string): string {
  const t = new Date(iso);
  if (isNaN(t.getTime())) return iso;
  return t.toLocaleString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Bos kuyruk = satis motoru: davet baglantisini PAYLAS (sayfaya gitmeden, Web Share).
// Yalniz KENDI baglantisi getirilir (backend zaten rol filtresi uyguluyor).
function BosKuyruk({ defterBos }: { defterBos: boolean }) {
  const [url, setUrl] = useState("");

  useEffect(() => {
    api.etkinlikLinkler().then((c) => {
      if (c.ok && c.veri.length > 0 && typeof window !== "undefined") {
        setUrl(`${window.location.origin}/k/${c.veri[0].token}`);
      }
    });
  }, []);

  async function paylas() {
    if (!url) return;
    const metin = "Anı defterimize bir dilek bırakır mısın?";
    if (navigator.share) {
      try {
        await navigator.share({ title: "Anı Defterimiz", text: metin, url });
        return;
      } catch {
        /* kullanici iptal etti */
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Bağlantın kopyalandı - dilediğin yere yapıştırabilirsin.");
    } catch {
      toast.error("Kopyalanamadı - Paylaşım ekranından deneyebilirsin.");
    }
  }

  return (
    <div className="mt-6 rounded-2xl border border-dashed border-ayrac bg-parsomen px-6 py-8 text-center">
      <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-sarap/10 text-sarap">
        <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
          <circle cx="18" cy="5" r="2.3" stroke="currentColor" strokeWidth={1.6} fill="none" />
          <circle cx="6" cy="12" r="2.3" stroke="currentColor" strokeWidth={1.6} fill="none" />
          <circle cx="18" cy="19" r="2.3" stroke="currentColor" strokeWidth={1.6} fill="none" />
          <path d="m8.2 10.8 7.6-4.6M8.2 13.2l7.6 4.6" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" />
        </svg>
      </span>

      <p className="mt-4 font-display text-lg text-murekkep">
        {defterBos ? "Defterin ilk sayfasını açalım" : "Şu an bekleyen dilek yok"}
      </p>
      <p className="metin-yasli mx-auto mt-2 max-w-sm font-govde text-sm leading-relaxed text-ikincil">
        Davet bağlantını paylaş; senin tarafından gelen dilekler burada, yalnız senin
        onayına düşsün.
      </p>

      <button
        onClick={paylas}
        disabled={!url}
        className="mt-5 rounded-full bg-sarap px-7 py-3 font-govde text-sm font-medium text-parsomen transition-colors hover:bg-sarapKoyu disabled:opacity-50"
      >
        Bağlantını paylaş
      </button>

      <Link
        href="/panel/paylasim"
        className="mt-3 block font-govde text-xs text-ikincil transition-colors hover:text-sarap"
      >
        QR kodu ve tüm paylaşım seçenekleri
      </Link>
    </div>
  );
}
