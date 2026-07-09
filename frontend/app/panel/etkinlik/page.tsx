"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import QRCode from "qrcode";
import { api, type Etkinlik, type EtkinlikAyar, type Katki } from "@/lib/api";
import { VARSAYILAN } from "@/lib/varsayilan";
import { MarkaKilidi } from "@/components/marka/MarkaKilidi";
import { UserMenu } from "@/components/site/UserMenu";
import { BildirimAyari } from "@/components/site/BildirimAyari";

type Link2 = { es: string; token: string; aktif: boolean };

// 0D aktif etkinlik ekrani: ozet + zaman cizelgesi + cift-link/QR + ayarlar.
export default function AktifEtkinlikSayfasi() {
  const router = useRouter();
  const [etkinlik, setEtkinlik] = useState<Etkinlik | null>(null);
  const [linkler, setLinkler] = useState<Link2[]>([]);
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
        <Link href="/" aria-label="Ana sayfa">
          <MarkaKilidi varyant="wordmark" boyut="kucuk" />
        </Link>
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/panel")}
            className="rounded-full border border-ayrac px-5 py-2 font-govde text-sm text-ikincil transition-colors hover:text-sarap"
          >
            Panel
          </button>
          <UserMenu />
        </div>
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
          {tarihSaatMetni(etkinlik.etkinlik_tarihi)}
        </p>
      </div>

      {/* Zaman cizelgesi projeksiyonu (#8 UX; fiyat Asama 7) */}
      <ZamanCizelgesi etkinlik={etkinlik} pencereGun={ayar?.kapanis_pencere_gun ?? 30} />

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

      {/* Bildirimler (push izin + sessiz saat) */}
      <BildirimAyari />

      {/* Onay kuyrugu + ortak defter (Asama 4 moderasyon) */}
      <OnayKuyrugu />
      <OrtakDefter />

      {/* Ayarlar */}
      {ayar && <AyarBolumu ilk={ayar} onGuncellendi={setAyar} />}
    </main>
  );
}

// ---- Zaman cizelgesi (sureli yasam dongusu projeksiyonu) ----
function ZamanCizelgesi({ etkinlik, pencereGun }: { etkinlik: Etkinlik; pencereGun: number }) {
  const acilis = new Date(etkinlik.acilis_tarihi);
  const ozelGun = new Date(etkinlik.etkinlik_tarihi);
  const kapanis = new Date(etkinlik.kapanis_tarihi);
  // Kisisellestirme penceresi: kapanistan sonra 7 gun (kurasyon); ardindan 10 gun indirme.
  const kisisel = new Date(kapanis.getTime() + 7 * 24 * 3600 * 1000);
  const silme = new Date(kisisel.getTime() + 10 * 24 * 3600 * 1000);

  const adimlar = [
    { t: acilis, e: "Davetli girişleri başlar", v: "Bağlantı/QR ile dilekler toplanmaya başlar." },
    { t: ozelGun, e: "Özel gün", v: "Etkinliğiniz gerçekleşir." },
    { t: kapanis, e: "Anı girişi sonlanır", v: `Toplama penceresi (${pencereGun} gün) kapanır.` },
    { t: kisisel, e: "Kişiselleştirme", v: "Anı defteri üzerinde düzenleme yapabilirsiniz." },
    { t: silme, e: "İndirme ve silme", v: "Veri indirilir; 10 gün sonra kalıcı silinir." },
  ];

  return (
    <section className="mt-8 rounded-3xl border border-ayrac bg-yuzey p-8">
      <h2 className="font-display text-lg text-murekkep">Süreç zaman çizelgesi</h2>
      <p className="mt-2 font-govde text-sm leading-relaxed text-ikincil">
        Seçtiğiniz tarihe göre canlı önizleme. Anı defterinizi erken tamamlarsanız bu
        süreci öne çekebilirsiniz.
      </p>
      <ol className="mt-6 space-y-4">
        {adimlar.map((a, i) => (
          <li key={i} className="flex gap-4">
            <div className="flex flex-col items-center">
              <span className="h-3 w-3 rounded-full bg-sarap" />
              {i < adimlar.length - 1 && <span className="mt-1 h-full w-px flex-1 bg-ayrac" />}
            </div>
            <div className="pb-2">
              <p className="font-govde text-sm font-medium text-murekkep">{a.e}</p>
              <p className="font-govde text-xs text-yaldiz">{tarihSaatMetni(a.t.toISOString())}</p>
              <p className="mt-0.5 font-govde text-xs text-ikincil">{a.v}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
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

// ---- Ayar bolumu (karsilama + kapanis penceresi + varsayilana don) ----
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

  const varsayilandaMi = karsilama.trim() === VARSAYILAN.karsilamaMetni;

  async function kaydet() {
    setMesaj("");
    setHata("");
    const g = parseInt(gun, 10);
    if (isNaN(g) || g < VARSAYILAN.minKapanisPencereGun || g > VARSAYILAN.maxKapanisPencereGun) {
      setHata(`Kapanış penceresi en az ${VARSAYILAN.minKapanisPencereGun} gün olmalıdır (en fazla ${VARSAYILAN.maxKapanisPencereGun}).`);
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
          <div className="mb-2 flex items-center justify-between gap-2">
            <label className="block font-govde text-xs uppercase tracking-etiket text-ikincil">
              Karşılama metni
            </label>
            {!varsayilandaMi && (
              <button
                type="button"
                onClick={() => setKarsilama(VARSAYILAN.karsilamaMetni)}
                className="font-govde text-xs text-sarap transition-colors hover:underline"
              >
                Varsayılana dön
              </button>
            )}
          </div>
          <textarea
            value={karsilama}
            onChange={(e) => setKarsilama(e.target.value)}
            rows={3}
            className="w-full rounded-xl border border-ayrac bg-parsomen px-4 py-3 font-govde text-sm text-murekkep outline-none focus:border-sarap"
          />
          <p className="mt-1 font-govde text-xs text-ikincil">
            {varsayilandaMi
              ? "Şu an varsayılan metin kullanılıyor."
              : "Özel metin. İstersen varsayılana dönebilirsin."}
          </p>
        </div>

        <div>
          <label className="mb-2 block font-govde text-xs uppercase tracking-etiket text-ikincil">
            Kapanış penceresi (gün)
          </label>
          <input
            type="number"
            min={VARSAYILAN.minKapanisPencereGun}
            max={VARSAYILAN.maxKapanisPencereGun}
            value={gun}
            onChange={(e) => setGun(e.target.value)}
            className="w-full rounded-xl border border-ayrac bg-parsomen px-4 py-3 font-govde text-sm text-murekkep outline-none focus:border-sarap sm:w-40"
          />
          <p className="mt-2 font-govde text-xs text-ikincil">
            Etkinlik tarihinden sonra bu kadar gün boyunca dilek toplanır. Minimum 30 gün;
            üzeri için ücret ödeme ekranında netleşir.
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
    <section className="mt-8 rounded-3xl border border-ayrac bg-yuzey p-8">
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
function OrtakDefter() {
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
    <section className="mt-8 rounded-3xl border border-ayrac bg-yuzey p-8">
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
                {k.kaynak_es === "es1" ? "1. eş tarafı" : "2. eş tarafı"}
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
