"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { api, type Etkinlik, type Katki } from "@/lib/api";
import { AppShell } from "@/components/site/AppShell";
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
    if (onay) {
      setDefter((o) => [{ ...k, durum: "onayli" }, ...o]);
      toast.success("Dilek onaylandı ve ortak deftere eklendi.");
    } else {
      toast("Dilek reddedildi. Ortak deftere eklenmedi.");
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

      {/* Onay kuyrugu */}
      <section className="mt-6 rounded-3xl border border-ayrac bg-yuzey p-6 sm:p-8">
        <h2 className="font-display text-lg text-murekkep">Onay kuyruğun</h2>
        <p className="metin-yasli mt-2 font-govde text-sm leading-relaxed text-ikincil">
          Yalnız senin bağlantından gelen dilekler burada. Onayladıkların ortak deftere eklenir;
          reddettiklerin gizli kalır.
        </p>

        {kuyruk.length === 0 ? (
          <BosKuyruk defterBos={defter.length === 0} />
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
