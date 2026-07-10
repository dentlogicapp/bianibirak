"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, type Etkinlik, type Katki } from "@/lib/api";
import { AppShell } from "@/components/site/AppShell";
import { esTarafiKisa } from "@/lib/es";

// Defter ekrani: ozet + onay kuyrugu (izolasyon) + ortak defter.
// Paylasim -> /panel/paylasim; ayarlar -> avatar menusu (duzenle/ayarlar/denetim).
export default function DefterSayfasi() {
  const router = useRouter();
  const [etkinlik, setEtkinlik] = useState<Etkinlik | null>(null);
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

      <div className="mt-6">
        <OnayKuyrugu />
        <OrtakDefter es1Ad={etkinlik.es1_ad} es2Ad={etkinlik.es2_ad} />
      </div>
    </AppShell>
  );
}

// ---- Onay kuyrugu (esin bekleyen katkilari; izolasyon) ----
function OnayKuyrugu() {
  const [kuyruk, setKuyruk] = useState<Katki[]>([]);
  const [durum, setDurum] = useState<"yukleniyor" | "hazir">("yukleniyor");
  const [islenen, setIslenen] = useState<string | null>(null);

  useEffect(() => {
    api.katkiKuyruk().then((c) => {
      if (c.ok) setKuyruk(c.veri);
      setDurum("hazir");
    });
  }, []);

  async function islem(k: Katki, onay: boolean) {
    if (islenen) return;
    setIslenen(k.id);
    const cevap = onay ? await api.katkiOnayla(k.id) : await api.katkiReddet(k.id);
    setIslenen(null);
    if (cevap.ok) setKuyruk((o) => o.filter((x) => x.id !== k.id));
  }

  if (durum === "yukleniyor") return null;

  return (
    <section className="rounded-3xl border border-ayrac bg-yuzey p-6 sm:p-8">
      <h2 className="font-display text-lg text-murekkep">Onay kuyruğun</h2>
      <p className="mt-2 font-govde text-sm leading-relaxed text-ikincil">
        Yalnız senin bağlantından gelen dilekler burada. Onayladıkların ortak deftere
        eklenir; reddettiklerin gizli kalır.
      </p>

      {kuyruk.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-dashed border-ayrac bg-parsomen px-6 py-8 text-center font-govde text-sm text-ikincil">
          Şu an bekleyen dilek yok. Davet bağlantını paylaştıkça buraya düşecek.
        </p>
      ) : (
        <div className="mt-5 space-y-3">
          {kuyruk.map((k) => (
            <div key={k.id} className="rounded-2xl border border-ayrac bg-parsomen p-5">
              <p className="font-govde text-xs uppercase tracking-etiket text-yaldiz">
                {k.davetli_ad}
              </p>
              <p className="mt-2 font-govde text-sm leading-relaxed text-murekkep">
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
  );
}

// ---- Ortak defter (her iki esin onayli katkilarinin birlesimi) ----
function OrtakDefter({ es1Ad, es2Ad }: { es1Ad: string; es2Ad: string }) {
  const [defter, setDefter] = useState<Katki[]>([]);
  const [durum, setDurum] = useState<"yukleniyor" | "hazir">("yukleniyor");

  useEffect(() => {
    api.katkiDefter().then((c) => {
      if (c.ok) setDefter(c.veri);
      setDurum("hazir");
    });
  }, []);

  if (durum === "yukleniyor" || defter.length === 0) return null;

  return (
    <section className="mt-6 rounded-3xl border border-ayrac bg-yuzey p-6 sm:p-8">
      <h2 className="font-display text-lg text-murekkep">Ortak defter</h2>
      <p className="mt-2 font-govde text-sm leading-relaxed text-ikincil">
        Onaylanan dilekler burada birleşir. Kürasyon aşamasında bu dilekler baskıya hazır
        bir mirasa dönüşecek.
      </p>
      <div className="mt-5 space-y-3">
        {defter.map((k) => (
          <div key={k.id} className="rounded-2xl border border-ayrac bg-parsomen p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="font-govde text-xs uppercase tracking-etiket text-yaldiz">
                {k.davetli_ad}
              </p>
              <span className="font-govde text-[0.65rem] uppercase tracking-etiket text-ikincil">
                {esTarafiKisa(k.kaynak_es, es1Ad, es2Ad)}
              </span>
            </div>
            <p className="mt-2 font-govde text-sm leading-relaxed text-murekkep">
              {k.mesaj}
            </p>
          </div>
        ))}
      </div>
    </section>
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
