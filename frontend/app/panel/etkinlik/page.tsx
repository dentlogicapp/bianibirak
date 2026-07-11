"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api, type Etkinlik, type Katki } from "@/lib/api";
import { AppShell } from "@/components/site/AppShell";
import { esTarafiKisa } from "@/lib/es";
import { useOdakKatki } from "@/lib/odak";

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
  const [uyari, setUyari] = useState("");

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

  // Bildirimden gelen dilek onaylanmis/reddedilmis ise kullaniciyi bilgilendir.
  useEffect(() => {
    if (!odakId || durum !== "hazir") return;
    (async () => {
      const c = await api.katkiDurum(odakId);
      if (!c.ok) {
        setUyari("Ulaşmaya çalıştığın dileğe erişilemiyor - kaldırılmış olabilir.");
        return;
      }
      if (c.veri.durum === "onaylandi") {
        setUyari(
          "Ulaşmaya çalıştığın dilek onaylanmış ve ortak deftere eklenmiş. Aşağıda gösteriliyor."
        );
      } else if (c.veri.durum === "reddedildi") {
        setUyari(
          "Ulaşmaya çalıştığın dilek reddedilmiş. Ortak deftere eklenmedi ve görüntülenemiyor."
        );
      }
    })();
  }, [odakId, durum]);

  // Odak: dilek yuklendikten sonra scroll + vurgu
  useOdakKatki(durum === "hazir");

  async function islem(k: Katki, onay: boolean) {
    if (islenen) return;
    setIslenen(k.id);
    const cevap = onay ? await api.katkiOnayla(k.id) : await api.katkiReddet(k.id);
    setIslenen(null);
    if (!cevap.ok) return;

    // ANLIK: kuyruktan cikar; onaylandiysa ORTAK DEFTERE ekle (yenileme gerekmez).
    setKuyruk((o) => o.filter((x) => x.id !== k.id));
    if (onay) {
      setDefter((o) => [{ ...k, durum: "onaylandi" }, ...o]);
    }
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

      {/* Bildirimden gelen uyari (onaylanmis/reddedilmis dilek) */}
      {uyari && (
        <div className="mt-4 flex items-start gap-3 rounded-2xl border border-yaldiz/40 bg-yaldiz/10 px-5 py-4">
          <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0 text-yaldiz" aria-hidden>
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth={1.6} fill="none" />
            <path d="M12 8h.01M11 12h1v4h1" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" />
          </svg>
          <p className="metin-yasli flex-1 font-govde text-sm leading-relaxed text-murekkep">
            {uyari}
          </p>
          <button
            onClick={() => setUyari("")}
            aria-label="Kapat"
            className="shrink-0 text-ikincil transition-colors hover:text-murekkep"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" />
            </svg>
          </button>
        </div>
      )}

      {/* Onay kuyrugu */}
      <section className="mt-6 rounded-3xl border border-ayrac bg-yuzey p-6 sm:p-8">
        <h2 className="font-display text-lg text-murekkep">Onay kuyruğun</h2>
        <p className="metin-yasli mt-2 font-govde text-sm leading-relaxed text-ikincil">
          Yalnız senin bağlantından gelen dilekler burada. Onayladıkların ortak deftere eklenir;
          reddettiklerin gizli kalır.
        </p>

        {kuyruk.length === 0 ? (
          <p className="mt-6 rounded-2xl border border-dashed border-ayrac bg-parsomen px-6 py-8 text-center font-govde text-sm text-ikincil">
            Şu an bekleyen dilek yok. Davet bağlantını paylaştıkça buraya düşecek.
          </p>
        ) : (
          <div className="mt-5 space-y-3">
            {kuyruk.map((k) => (
              <div
                key={k.id}
                data-katki-id={k.id}
                className="rounded-2xl border border-ayrac bg-parsomen p-5"
              >
                <p className="font-govde text-xs uppercase tracking-etiket text-yaldiz">
                  {k.davetli_ad}
                </p>
                <p className="metin-yasli mt-2 font-govde text-sm leading-relaxed text-murekkep">
                  {k.mesaj}
                </p>
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => islem(k, true)}
                    disabled={islenen === k.id}
                    className="rounded-full bg-sarap px-5 py-2 font-govde text-xs font-medium text-parsomen transition-colors hover:bg-sarapKoyu disabled:opacity-60"
                  >
                    {islenen === k.id ? "..." : "Onayla"}
                  </button>
                  <button
                    onClick={() => islem(k, false)}
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
              <div
                key={k.id}
                data-katki-id={k.id}
                className="rounded-2xl border border-ayrac bg-parsomen p-5"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-govde text-xs uppercase tracking-etiket text-yaldiz">
                    {k.davetli_ad}
                  </p>
                  <span className="font-govde text-[0.65rem] uppercase tracking-etiket text-ikincil">
                    {esTarafiKisa(k.kaynak_es, etkinlik.es1_ad, etkinlik.es2_ad)}
                  </span>
                </div>
                <p className="metin-yasli mt-2 font-govde text-sm leading-relaxed text-murekkep">
                  {k.mesaj}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
    </AppShell>
  );
}

function turEtiketi(tur: string): string {
  if (tur === "dugun") return "Düğün";
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
