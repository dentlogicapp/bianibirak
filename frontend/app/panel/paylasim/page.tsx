"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { api, type Etkinlik, type EtkinlikAyar } from "@/lib/api";
import { AppShell } from "@/components/site/AppShell";

type Link2 = { es: string; token: string; aktif: boolean };

// Paylasim ekrani: sureç zaman cizelgesi + cift-link/QR (her es icin ayri).
export default function PaylasimSayfasi() {
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
      <div className="rounded-3xl border border-ayrac bg-yuzey p-6 sm:p-8">
        <p className="font-govde text-xs uppercase tracking-etiket text-yaldiz">Paylaşım</p>
        <h1 className="mt-2 font-display text-2xl text-murekkep sm:text-3xl">
          Davet bağlantıları
        </h1>
        <p className="mt-2 font-govde text-sm leading-relaxed text-ikincil">
          Her eşin ayrı bağlantısı ve QR kodu var. Davetliler bu bağlantıdan dilek bırakır;
          hangi bağlantıdan geldiği o eşin onay kuyruğuna düşer.
        </p>
      </div>

      <ZamanCizelgesi etkinlik={etkinlik} pencereGun={ayar?.kapanis_pencere_gun ?? 30} />

      <div className="mt-6 grid min-w-0 gap-5 sm:grid-cols-2">
        {linkler.map((l) => (
          <LinkKarti
            key={l.es}
            esAdi={l.es === "es1" ? etkinlik.es1_ad : etkinlik.es2_ad}
            token={l.token}
          />
        ))}
      </div>
    </AppShell>
  );
}

// ---- Zaman cizelgesi ----
function ZamanCizelgesi({ etkinlik, pencereGun }: { etkinlik: Etkinlik; pencereGun: number }) {
  const acilis = new Date(etkinlik.acilis_tarihi);
  const ozelGun = new Date(etkinlik.etkinlik_tarihi);
  const kapanis = new Date(etkinlik.kapanis_tarihi);
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
    <section className="mt-6 rounded-3xl border border-ayrac bg-yuzey p-6 sm:p-8">
      <h2 className="font-display text-lg text-murekkep">Süreç zaman çizelgesi</h2>
      <p className="mt-2 font-govde text-sm leading-relaxed text-ikincil">
        Seçtiğiniz tarihe göre canlı önizleme.
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

// ---- Link karti (public URL + QR + kopyala + paylas) ----
function LinkKarti({ esAdi, token }: { esAdi: string; token: string }) {
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

  async function paylas() {
    const metin = `${esAdi} olarak anı defterimize bir dilek bırakır mısın?`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Anı Defteri", text: metin, url });
      } catch {
        /* kullanici iptal etti */
      }
    } else {
      kopyala();
    }
  }

  return (
    <div className="min-w-0 overflow-hidden rounded-2xl border border-ayrac bg-yuzey p-5 sm:p-6">
      <p className="font-govde text-xs uppercase tracking-etiket text-yaldiz">
        {esAdi} tarafının yakını
      </p>
      {qr && (
        <img
          src={qr}
          alt={`${esAdi} QR kodu`}
          className="mx-auto mt-4 h-40 w-40 rounded-xl border border-ayrac"
        />
      )}
      <div className="mt-4 min-w-0 rounded-lg border border-ayrac bg-parsomen px-3 py-2">
        <p className="truncate font-govde text-xs text-ikincil" title={url}>
          {url}
        </p>
      </div>
      <div className="mt-3 flex min-w-0 gap-2">
        <button
          onClick={paylas}
          className="min-w-0 flex-1 rounded-full bg-sarap px-4 py-2.5 font-govde text-sm font-medium text-parsomen transition-colors hover:bg-sarapKoyu"
        >
          Paylaş
        </button>
        <button
          onClick={kopyala}
          className="shrink-0 rounded-full border border-ayrac px-4 py-2.5 font-govde text-sm text-ikincil transition-colors hover:border-sarap hover:text-sarap"
        >
          {kopyalandi ? "Kopyalandı" : "Kopyala"}
        </button>
      </div>
    </div>
  );
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
