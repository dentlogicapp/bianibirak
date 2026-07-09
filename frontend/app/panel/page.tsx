"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, type Kullanici, type Etkinlik } from "@/lib/api";
import { MarkaKilidi } from "@/components/marka/MarkaKilidi";

// 0C tenant paneli: kullanici + etkinlikleri.
// Etkinlik yoksa minimal aktivasyon formu (Belge 03 Akis 1); varsa ozet.
// Gercek koruma backend'de (RequireAuthorization + tenant guard); burada UI kapisi.
export default function PanelSayfasi() {
  const router = useRouter();
  const [kullanici, setKullanici] = useState<Kullanici | null>(null);
  const [etkinlikler, setEtkinlikler] = useState<Etkinlik[]>([]);
  const [durum, setDurum] = useState<"yukleniyor" | "hazir">("yukleniyor");

  useEffect(() => {
    (async () => {
      const ben = await api.ben();
      if (!ben.ok) {
        router.replace("/giris");
        return;
      }
      setKullanici(ben.veri);
      const liste = await api.etkinliklerim();
      if (liste.ok) setEtkinlikler(liste.veri);
      setDurum("hazir");
    })();
  }, [router]);

  async function cikis() {
    await api.cikis();
    router.push("/giris");
  }

  function etkinlikEklendi(e: Etkinlik) {
    setEtkinlikler((onceki) => [e, ...onceki]);
  }

  if (durum !== "hazir" || !kullanici) {
    return (
      <main className="flex min-h-screen items-center justify-center font-govde text-sm text-ikincil">
        Yükleniyor...
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-icerik px-6 py-16">
      <div className="flex items-center justify-between">
        <MarkaKilidi varyant="wordmark" boyut="kucuk" />
        <button
          onClick={cikis}
          className="rounded-full border border-ayrac px-5 py-2 font-govde text-sm text-ikincil transition-colors hover:text-sarap"
        >
          Çıkış yap
        </button>
      </div>

      <div className="mt-10 rounded-3xl border border-ayrac bg-yuzey p-8">
        <p className="font-govde text-xs uppercase tracking-etiket text-yaldiz">Panel</p>
        <h1 className="mt-3 font-display text-2xl text-murekkep">
          Merhaba {kullanici.ad}
        </h1>
        <p className="mt-2 font-govde text-sm text-ikincil">{kullanici.email}</p>
      </div>

      {etkinlikler.length === 0 ? (
        <AktivasyonFormu onEklendi={etkinlikEklendi} />
      ) : (
        <EtkinlikListesi etkinlikler={etkinlikler} />
      )}
    </main>
  );
}

// ---- Etkinlik listesi (mevcut etkinlikler) ----
function EtkinlikListesi({ etkinlikler }: { etkinlikler: Etkinlik[] }) {
  const router = useRouter();
  const [secilenId, setSecilenId] = useState<string | null>(null);

  async function ac(e: Etkinlik) {
    setSecilenId(e.id);
    const cevap = await api.etkinlikAktifYap(e.id);
    setSecilenId(null);
    if (cevap.ok) router.push("/panel/etkinlik");
  }

  return (
    <section className="mt-8">
      <h2 className="font-display text-lg text-murekkep">Etkinliklerin</h2>
      <div className="mt-4 space-y-3">
        {etkinlikler.map((e) => (
          <button
            key={e.id}
            onClick={() => ac(e)}
            disabled={secilenId === e.id}
            className="flex w-full items-center justify-between rounded-2xl border border-ayrac bg-yuzey px-6 py-5 text-left transition-colors hover:border-sarap disabled:opacity-60"
          >
            <div>
              <p className="font-display text-base text-murekkep">
                {e.es1_ad} &amp; {e.es2_ad}
              </p>
              <p className="mt-1 font-govde text-xs uppercase tracking-etiket text-ikincil">
                {turEtiketi(e.tur)} · {e.etkinlik_tarihi} · {durumEtiketi(e.durum)}
              </p>
            </div>
            <span className="font-govde text-sm text-yaldiz">
              {secilenId === e.id ? "Açılıyor..." : "Aç →"}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

// ---- Aktivasyon formu (ilk etkinlik) ----
function AktivasyonFormu({ onEklendi }: { onEklendi: (e: Etkinlik) => void }) {
  const [tur, setTur] = useState("dugun");
  const [es1Ad, setEs1Ad] = useState("");
  const [es2Ad, setEs2Ad] = useState("");
  const [etkinlikTarihi, setEtkinlikTarihi] = useState("");
  const [hata, setHata] = useState("");
  const [yukleniyor, setYukleniyor] = useState(false);

  async function gonder(e: React.FormEvent) {
    e.preventDefault();
    setHata("");
    if (es1Ad.trim().length < 2 || es2Ad.trim().length < 2) {
      setHata("İki eş adı da gereklidir.");
      return;
    }
    if (!etkinlikTarihi) {
      setHata("Etkinlik tarihi gereklidir.");
      return;
    }
    setYukleniyor(true);
    const cevap = await api.etkinlikOlustur({
      tur,
      es1Ad: es1Ad.trim(),
      es2Ad: es2Ad.trim(),
      etkinlikTarihi,
    });
    setYukleniyor(false);
    if (cevap.ok) onEklendi(cevap.veri);
    else setHata(cevap.mesaj);
  }

  return (
    <section className="mt-8 rounded-3xl border border-ayrac bg-yuzey p-8">
      <h2 className="font-display text-lg text-murekkep">İlk etkinliğini oluştur</h2>
      <p className="mt-2 font-govde text-sm leading-relaxed text-ikincil">
        Birkaç bilgi yeter; kapak, tema ve karşılama metnini sonra
        zenginleştirebilirsin.
      </p>

      <form onSubmit={gonder} className="mt-6 space-y-5">
        <div>
          <label className="mb-2 block font-govde text-xs uppercase tracking-etiket text-ikincil">
            Etkinlik türü
          </label>
          <div className="flex gap-2">
            {(["dugun", "nisan", "nikah"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTur(t)}
                className={`rounded-full px-5 py-2 font-govde text-sm transition-colors ${
                  tur === t
                    ? "bg-sarap text-parsomen"
                    : "border border-ayrac text-ikincil hover:text-sarap"
                }`}
              >
                {turEtiketi(t)}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 block font-govde text-xs uppercase tracking-etiket text-ikincil">
              Birinci eş adı
            </label>
            <input
              value={es1Ad}
              onChange={(ev) => setEs1Ad(ev.target.value)}
              className="w-full rounded-xl border border-ayrac bg-parsomen px-4 py-3 font-govde text-sm text-murekkep outline-none focus:border-sarap"
              placeholder="Örn. Ayşe"
            />
          </div>
          <div>
            <label className="mb-2 block font-govde text-xs uppercase tracking-etiket text-ikincil">
              İkinci eş adı
            </label>
            <input
              value={es2Ad}
              onChange={(ev) => setEs2Ad(ev.target.value)}
              className="w-full rounded-xl border border-ayrac bg-parsomen px-4 py-3 font-govde text-sm text-murekkep outline-none focus:border-sarap"
              placeholder="Örn. Mehmet"
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block font-govde text-xs uppercase tracking-etiket text-ikincil">
            Etkinlik tarihi
          </label>
          <input
            type="date"
            value={etkinlikTarihi}
            onChange={(ev) => setEtkinlikTarihi(ev.target.value)}
            className="w-full rounded-xl border border-ayrac bg-parsomen px-4 py-3 font-govde text-sm text-murekkep outline-none focus:border-sarap sm:w-64"
          />
          <p className="mt-2 font-govde text-xs text-ikincil">
            Erişim penceresi varsayılan olarak etkinlikten 30 gün sonra kapanır; sonra
            ayarlardan değiştirebilirsin.
          </p>
        </div>

        {hata && (
          <p className="font-govde text-sm text-sarap" role="alert">
            {hata}
          </p>
        )}

        <button
          type="submit"
          disabled={yukleniyor}
          className="rounded-full bg-sarap px-7 py-3 font-govde text-sm font-medium text-parsomen shadow-sm transition-colors hover:bg-sarapKoyu disabled:opacity-60"
        >
          {yukleniyor ? "Oluşturuluyor..." : "Etkinliği oluştur"}
        </button>
      </form>
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
