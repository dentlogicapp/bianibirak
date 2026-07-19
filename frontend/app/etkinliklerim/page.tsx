"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api, type Kullanici, type Etkinlik } from "@/lib/api";
import { AppShell } from "@/components/site/AppShell";
import { defterDurumu, durumTonSinif } from "@/lib/durum";

// 0D panel: kullanici + etkinlikleri. Aktivasyon (datetime-local), duzenle/sil.
// Zero-friction: cift yalniz isim + tarih girer; gerisi varsayilan (backend Sabitler).
export default function PanelSayfasi() {
  return (
    <Suspense fallback={<AppShell><div className="flex min-h-[50vh] items-center justify-center font-govde text-sm text-ikincil">Yükleniyor...</div></AppShell>}>
      <PanelIcerik />
    </Suspense>
  );
}

function PanelIcerik() {
  const router = useRouter();
  const arama = useSearchParams();
  // Menuden "+ Yeni Etkinlik Defteri Ac" ile gelindiginde form ACIK baslar.
  // Kullanici bir sey aramak zorunda kalmaz: tikladigi sey neyse onu gorur.
  const yeniIstendi = arama.get("yeni") === "1";
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

  // YENI DEFTER -> ZORUNLU ES DAVET ADIMI.
  //
  // Defter iki kisiliktir: her esin AYRI davet baglantisi ve AYRI onay kuyrugu vardir.
  // Es katilmazsa kendi yakinlarindan gelen dilekleri kimse onaylayamaz - o dilekler
  // deftere HIC girmez. Bu yuzden kurulum, panele degil davet adimina cikar.
  //
  // Ayri bir sayfa acilmaz: /ayarlar/es-ekle ZATEN bu isi yapiyor (paralel yapi YASAK).
  // "kurulum=1" ayni sayfayi kurulum kipine sokar; sonradan ayni sayfa "baglantiyi
  // yeniden gonder" erisim alani olarak calismaya devam eder.
  async function etkinlikEklendi(e: Etkinlik) {
    setEtkinlikler((onceki) => [e, ...onceki]);
    // Yeni defteri AKTIF yap - davet adimi aktif defter uzerinden calisir.
    const c = await api.etkinlikAktifYap(e.id);
    if (c.ok) router.push("/ayarlar/es-ekle?kurulum=1");
  }

  function etkinlikSilindi(id: string) {
    setEtkinlikler((onceki) => onceki.filter((e) => e.id !== id));
  }

  if (durum !== "hazir" || !kullanici) {
    return (
      <AppShell>
        <div className="flex min-h-[50vh] items-center justify-center font-govde text-sm text-ikincil">
          Yükleniyor...
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="rounded-3xl border border-ayrac bg-yuzey p-8">
        <p className="font-govde text-xs uppercase tracking-etiket text-yaldiz">Panel</p>
        <h1 className="mt-3 font-display text-2xl text-murekkep">
          Merhaba {kullanici.ad}
        </h1>
        <p className="mt-2 font-govde text-sm text-ikincil">{kullanici.email}</p>
      </div>

      {etkinlikler.length === 0 ? (
        <AktivasyonFormu onEklendi={etkinlikEklendi} />
      ) : (
        <EtkinlikListesi
          etkinlikler={etkinlikler}
          onSilindi={etkinlikSilindi}
          onYeniIstendi={() => setEtkinlikler((o) => o)}
        />
      )}

      {etkinlikler.length > 0 && (
        <YeniEtkinlikBolumu onEklendi={etkinlikEklendi} baslangictaAcik={yeniIstendi} />
      )}
    </AppShell>
  );
}

// ---- Etkinlik listesi (ac + sil) ----
function EtkinlikListesi({
  etkinlikler,
  onSilindi,
}: {
  etkinlikler: Etkinlik[];
  onSilindi: (id: string) => void;
  onYeniIstendi: () => void;
}) {
  const router = useRouter();
  const [secilenId, setSecilenId] = useState<string | null>(null);
  const [silId, setSilId] = useState<string | null>(null);

  async function ac(e: Etkinlik) {
    setSecilenId(e.id);
    const cevap = await api.etkinlikAktifYap(e.id);
    setSecilenId(null);
    if (cevap.ok) router.push("/gelen-dilekler");
  }

  async function sil(e: Etkinlik) {
    if (silId) return;
    setSilId(e.id);
    const cevap = await api.etkinlikSil(e.id);
    setSilId(null);
    if (cevap.ok) onSilindi(e.id);
  }

  return (
    <section className="mt-8">
      <h2 className="font-display text-lg text-murekkep">Etkinliklerin</h2>
      <div className="mt-4 space-y-3">
        {etkinlikler.map((e) => (
          <div
            key={e.id}
            className="flex items-center justify-between gap-3 rounded-2xl border border-ayrac bg-yuzey px-6 py-5"
          >
            <button onClick={() => ac(e)} disabled={secilenId === e.id} className="min-w-0 flex-1 text-left">
              <p className="font-display text-base text-murekkep">
                {e.es1_ad} &amp; {e.es2_ad}
              </p>
              <p className="mt-1 font-govde text-xs uppercase tracking-etiket text-ikincil">
                {turEtiketi(e.tur)} · {tarihSaatMetni(e.etkinlik_tarihi)}
              </p>

              {/* CANLI EVRE - "hazirlik" kalintisinin yerine.
                  Rozet + tek cumle: kullanici defterin HANGI ASAMADA oldugunu ve
                  simdi ne yapmasi gerektigini bir bakista gorur. */}
              {(() => {
                const d = defterDurumu(e);
                return (
                  <div className="mt-2">
                    <span className={`inline-block rounded-full border px-2.5 py-0.5 font-govde text-[0.62rem] font-medium ${durumTonSinif(d.ton)}`}>
                      {d.etiket}
                    </span>
                    <p className="metin-yasli mt-1.5 font-govde text-xs leading-relaxed text-ikincil">
                      {d.aciklama}
                      {d.eylem && <span className="text-murekkep"> · {d.eylem}</span>}
                    </p>
                  </div>
                );
              })()}
            </button>
            <div className="flex shrink-0 items-center gap-2">
              <button
                onClick={() => ac(e)}
                disabled={secilenId === e.id}
                className="rounded-full bg-sarap px-4 py-2 font-govde text-xs font-medium text-parsomen transition-colors hover:bg-sarapKoyu disabled:opacity-60"
              >
                {secilenId === e.id ? "Açılıyor..." : "Aç"}
              </button>
              <SilButonu onay={() => sil(e)} bekliyor={silId === e.id} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// Iki adimli sil (yanlislikla silmeyi onler)
function SilButonu({ onay, bekliyor }: { onay: () => void; bekliyor: boolean }) {
  const [emin, setEmin] = useState(false);
  if (bekliyor) {
    return <span className="font-govde text-xs text-ikincil">Siliniyor...</span>;
  }
  if (!emin) {
    return (
      <button
        onClick={() => setEmin(true)}
        className="rounded-full border border-ayrac px-4 py-2 font-govde text-xs text-ikincil transition-colors hover:border-sarap hover:text-sarap"
      >
        Sil
      </button>
    );
  }
  return (
    <span className="flex items-center gap-1">
      <button
        onClick={onay}
        className="rounded-full bg-sarap px-3 py-2 font-govde text-xs font-medium text-parsomen"
      >
        Eminim
      </button>
      <button
        onClick={() => setEmin(false)}
        className="rounded-full border border-ayrac px-3 py-2 font-govde text-xs text-ikincil"
      >
        Vazgeç
      </button>
    </span>
  );
}

// ---- Aktivasyon formu (ilk etkinlik) ----
function AktivasyonFormu({ onEklendi }: { onEklendi: (e: Etkinlik) => void }) {
  return (
    <section className="mt-8 rounded-3xl border border-ayrac bg-yuzey p-8">
      <h2 className="font-display text-lg text-murekkep">İlk etkinliğini oluştur</h2>
      <p className="mt-2 font-govde text-sm leading-relaxed text-ikincil">
        Sadece iki isim ve bir tarih yeter. Karşılama metni ve tema varsayılan olarak
        hazır gelir; dilersen sonra düzenlersin.
      </p>
      <EtkinlikAlanlari onEklendi={onEklendi} />
    </section>
  );
}

// ---- Yeni etkinlik (mevcut liste varken) ----
function YeniEtkinlikBolumu({
  onEklendi,
  baslangictaAcik = false,
}: {
  onEklendi: (e: Etkinlik) => void;
  baslangictaAcik?: boolean;
}) {
  const [acik, setAcik] = useState(baslangictaAcik);
  if (!acik) {
    return (
      <button
        onClick={() => setAcik(true)}
        className="mt-6 rounded-full border border-ayrac px-6 py-3 font-govde text-sm text-ikincil transition-colors hover:border-sarap hover:text-sarap"
      >
        + Yeni Etkinlik Defteri Aç
      </button>
    );
  }
  return (
    <section className="mt-6 rounded-3xl border border-ayrac bg-yuzey p-8">
      <h2 className="font-display text-lg text-murekkep">Yeni Etkinlik Defteri</h2>
      <EtkinlikAlanlari onEklendi={(e) => { onEklendi(e); setAcik(false); }} />
    </section>
  );
}

// ---- Ortak form alanlari (olustur) ----
function EtkinlikAlanlari({ onEklendi }: { onEklendi: (e: Etkinlik) => void }) {
  const [tur, setTur] = useState("dugun");
  const [es1Ad, setEs1Ad] = useState("");
  const [es2Ad, setEs2Ad] = useState("");
  const [kurucuEs, setKurucuEs] = useState("es1");
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
      setHata("Etkinlik tarihi ve saati gereklidir.");
      return;
    }
    setYukleniyor(true);
    const cevap = await api.etkinlikOlustur({
      tur,
      es1Ad: es1Ad.trim(),
      es2Ad: es2Ad.trim(),
      etkinlikTarihi: new Date(etkinlikTarihi).toISOString(),
      kurucuEs,
    });
    setYukleniyor(false);
    if (cevap.ok) void onEklendi(cevap.veri);
    else setHata(cevap.mesaj);
  }

  return (
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

      {/* Kurucu hangi es? Katkilar ve bildirimler bu secime gore dogru ese duser. */}
      <div>
        <label className="mb-2 block font-govde text-xs uppercase tracking-etiket text-ikincil">
          Bu hesap hangi eşe ait?
        </label>
        <div className="grid grid-cols-2 gap-2">
          {[
            { deger: "es1", ad: es1Ad.trim() || "İlk eş" },
            { deger: "es2", ad: es2Ad.trim() || "İkinci eş" },
          ].map((o) => {
            const secili = kurucuEs === o.deger;
            return (
              <button
                key={o.deger}
                type="button"
                onClick={() => setKurucuEs(o.deger)}
                className={`rounded-xl border px-4 py-3 font-govde text-sm transition-colors ${
                  secili
                    ? "border-sarap bg-sarap/10 font-medium text-sarap"
                    : "border-ayrac bg-parsomen text-ikincil hover:border-sarap/50"
                }`}
              >
                {o.ad}
              </button>
            );
          })}
        </div>
        <p className="mt-2 font-govde text-xs text-ikincil">
          Seçtiğin eşin bağlantısından gelen dilekler senin onay bekleyen dileklerine düşer.
        </p>
      </div>

      <div>
        <label className="mb-2 block font-govde text-xs uppercase tracking-etiket text-ikincil">
          Etkinlik tarihi ve saati
        </label>
        <input
          type="datetime-local"
          value={etkinlikTarihi}
          onChange={(ev) => setEtkinlikTarihi(ev.target.value)}
          className="w-full rounded-xl border border-ayrac bg-parsomen px-4 py-3 font-govde text-sm text-murekkep outline-none focus:border-sarap sm:w-72"
        />
        <p className="mt-2 font-govde text-xs text-ikincil">
          Davetli girişleri özel gününden 15 gün sonra kapanır; defterin 20. günün
          sonunda kalıcı olarak silinir. Bu takvim her defterde aynıdır.
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
  );
}

function turEtiketi(tur: string): string {
  if (tur === "dugun") return "Düğün";
  if (tur === "nisan") return "Nişan";
  if (tur === "nikah") return "Nikah";
  return tur;
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
