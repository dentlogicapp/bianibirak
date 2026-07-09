"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { api, type Etkinlik, type EtkinlikAyar } from "@/lib/api";
import { MarkaKilidi } from "@/components/marka/MarkaKilidi";

type Link = { es: string; token: string; aktif: boolean };

// 0C+2 aktif etkinlik ekrani: ozet + cift-link/QR + ayarlar.
// Tenant guard'li uclardan beslenir. Sureli sayac ve zengin cila sonraki asamada.
export default function AktifEtkinlikSayfasi() {
  const router = useRouter();
  const [etkinlik, setEtkinlik] = useState<Etkinlik | null>(null);
  const [linkler, setLinkler] = useState<Link[]>([]);
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
      const [l, a] = await Promise.all([api.etkinlikLinkler(), api.etkinlikAyarlar()]);
      if (l.ok) setLinkler(l.veri);
      if (a.ok) setAyar(a.veri);
      setDurum("hazir");
    })();
  }, [router]);

  if (durum === "yukleniyor") {
    return (
      <main className="flex min-h-screen items-center justify-center font-govde text-sm text-ikincil">
        Yükleniyor...
      </main>
    );
  }

  if (durum === "yok" || !etkinlik) {
    return (
      <main className="mx-auto max-w-icerik px-6 py-16 text-center">
        <p className="font-govde text-sm text-ikincil">Aktif bir etkinlik seçili değil.</p>
        <button
          onClick={() => router.push("/panel")}
          className="mt-6 rounded-full bg-sarap px-7 py-3 font-govde text-sm font-medium text-parsomen transition-colors hover:bg-sarapKoyu"
        >
          Panele dön
        </button>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-icerik px-6 py-16">
      <div className="flex items-center justify-between">
        <MarkaKilidi varyant="wordmark" boyut="kucuk" />
        <button
          onClick={() => router.push("/panel")}
          className="rounded-full border border-ayrac px-5 py-2 font-govde text-sm text-ikincil transition-colors hover:text-sarap"
        >
          Panel
        </button>
      </div>

      {/* Ozet */}
      <div className="mt-10 rounded-3xl border border-ayrac bg-yuzey p-8">
        <p className="font-govde text-xs uppercase tracking-etiket text-yaldiz">
          {turEtiketi(etkinlik.tur)} · {durumEtiketi(etkinlik.durum)}
        </p>
        <h1 className="mt-3 font-display text-3xl text-murekkep">
          {etkinlik.es1_ad} &amp; {etkinlik.es2_ad}
        </h1>
        <p className="mt-2 font-govde text-sm text-ikincil">
          Etkinlik tarihi: {etkinlik.etkinlik_tarihi}
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-ayrac bg-parsomen p-5">
            <p className="font-govde text-xs uppercase tracking-etiket text-ikincil">
              Erişim açılışı
            </p>
            <p className="mt-1 font-govde text-sm text-murekkep">
              {tarihMetni(etkinlik.acilis_tarihi)}
            </p>
          </div>
          <div className="rounded-2xl border border-ayrac bg-parsomen p-5">
            <p className="font-govde text-xs uppercase tracking-etiket text-ikincil">
              Erişim kapanışı
            </p>
            <p className="mt-1 font-govde text-sm text-murekkep">
              {tarihMetni(etkinlik.kapanis_tarihi)}
            </p>
          </div>
        </div>
      </div>

      {/* Cift-link + QR */}
      <section className="mt-8">
        <h2 className="font-display text-lg text-murekkep">Davet bağlantıları</h2>
        <p className="mt-2 font-govde text-sm leading-relaxed text-ikincil">
          Her eşin ayrı bağlantısı ve QR kodu var. Davetliler bu bağlantıdan dilek
          bırakır; hangi bağlantıdan geldiği o eşin onay kuyruğuna düşer.
        </p>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          {linkler.map((l) => (
            <LinkKarti
              key={l.es}
              es={l.es}
              token={l.token}
              esAdi={l.es === "es1" ? etkinlik.es1_ad : etkinlik.es2_ad}
            />
          ))}
        </div>
      </section>

      {/* Ayarlar */}
      {ayar && <AyarBolumu ilk={ayar} onGuncellendi={setAyar} />}
    </main>
  );
}

// ---- Link karti (public URL + QR + kopyala) ----
function LinkKarti({ es, token, esAdi }: { es: string; token: string; esAdi: string }) {
  const [qr, setQr] = useState<string>("");
  const [kopyalandi, setKopyalandi] = useState(false);
  const url = typeof window !== "undefined" ? `${window.location.origin}/k/${token}` : "";

  useEffect(() => {
    if (!url) return;
    QRCode.toDataURL(url, { margin: 1, width: 320, color: { dark: "#211A17", light: "#F4EBDA" } })
      .then(setQr)
      .catch(() => setQr(""));
  }, [url]);

  async function kopyala() {
    try {
      await navigator.clipboard.writeText(url);
      setKopyalandi(true);
      setTimeout(() => setKopyalandi(false), 1600);
    } catch {
      /* pano erisimi yoksa sessiz gec */
    }
  }

  return (
    <div className="rounded-2xl border border-ayrac bg-yuzey p-6">
      <p className="font-govde text-xs uppercase tracking-etiket text-yaldiz">
        {es === "es1" ? "Birinci eş" : "İkinci eş"} · {esAdi}
      </p>
      {qr && (
        <img
          src={qr}
          alt={`${esAdi} QR kodu`}
          className="mx-auto mt-4 h-40 w-40 rounded-xl border border-ayrac"
        />
      )}
      <div className="mt-4 rounded-lg border border-ayrac bg-parsomen px-3 py-2">
        <p className="truncate font-govde text-xs text-ikincil" title={url}>
          {url}
        </p>
      </div>
      <button
        onClick={kopyala}
        className="mt-3 w-full rounded-full bg-sarap px-5 py-2 font-govde text-sm font-medium text-parsomen transition-colors hover:bg-sarapKoyu"
      >
        {kopyalandi ? "Kopyalandı ✓" : "Bağlantıyı kopyala"}
      </button>
    </div>
  );
}

// ---- Ayar bolumu (karsilama + kapanis penceresi) ----
function AyarBolumu({
  ilk,
  onGuncellendi,
}: {
  ilk: EtkinlikAyar;
  onGuncellendi: (a: EtkinlikAyar) => void;
}) {
  const [karsilama, setKarsilama] = useState(ilk.karsilama_metni ?? "");
  const [gun, setGun] = useState(String(ilk.kapanis_pencere_gun));
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const [mesaj, setMesaj] = useState("");
  const [hata, setHata] = useState("");

  async function kaydet() {
    setMesaj("");
    setHata("");
    const g = parseInt(gun, 10);
    if (isNaN(g) || g < 1 || g > 365) {
      setHata("Kapanış penceresi 1-365 gün aralığında olmalıdır.");
      return;
    }
    setKaydediliyor(true);
    const cevap = await api.etkinlikAyarGuncelle({
      karsilamaMetni: karsilama,
      kapanisPencereGun: g,
    });
    setKaydediliyor(false);
    if (cevap.ok) {
      onGuncellendi(cevap.veri);
      setMesaj("Ayarlar kaydedildi.");
    } else {
      setHata(cevap.mesaj);
    }
  }

  return (
    <section className="mt-8 rounded-3xl border border-ayrac bg-yuzey p-8">
      <h2 className="font-display text-lg text-murekkep">Etkinlik ayarları</h2>
      <p className="mt-2 font-govde text-sm leading-relaxed text-ikincil">
        Davetlilere gösterilecek karşılama metni ve erişim penceresi. Kapak ve tema
        sonraki aşamalarda eklenecek.
      </p>

      <div className="mt-6 space-y-5">
        <div>
          <label className="mb-2 block font-govde text-xs uppercase tracking-etiket text-ikincil">
            Karşılama metni
          </label>
          <textarea
            value={karsilama}
            onChange={(e) => setKarsilama(e.target.value)}
            rows={3}
            placeholder="Örn. Bu güzel günümüzde bize bir anı bırakır mısın?"
            className="w-full rounded-xl border border-ayrac bg-parsomen px-4 py-3 font-govde text-sm text-murekkep outline-none focus:border-sarap"
          />
        </div>

        <div>
          <label className="mb-2 block font-govde text-xs uppercase tracking-etiket text-ikincil">
            Kapanış penceresi (gün)
          </label>
          <input
            type="number"
            min={1}
            max={365}
            value={gun}
            onChange={(e) => setGun(e.target.value)}
            className="w-full rounded-xl border border-ayrac bg-parsomen px-4 py-3 font-govde text-sm text-murekkep outline-none focus:border-sarap sm:w-40"
          />
          <p className="mt-2 font-govde text-xs text-ikincil">
            Etkinlik tarihinden sonra bu kadar gün boyunca dilek toplanır; sonra miras
            mühürlenir ve dışa aktarım açılır.
          </p>
        </div>

        {mesaj && <p className="font-govde text-sm text-yaldiz">{mesaj}</p>}
        {hata && (
          <p className="font-govde text-sm text-sarap" role="alert">
            {hata}
          </p>
        )}

        <button
          onClick={kaydet}
          disabled={kaydediliyor}
          className="rounded-full bg-sarap px-7 py-3 font-govde text-sm font-medium text-parsomen transition-colors hover:bg-sarapKoyu disabled:opacity-60"
        >
          {kaydediliyor ? "Kaydediliyor..." : "Ayarları kaydet"}
        </button>
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

function tarihMetni(iso: string): string {
  const t = new Date(iso);
  if (isNaN(t.getTime())) return iso;
  return t.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
}
