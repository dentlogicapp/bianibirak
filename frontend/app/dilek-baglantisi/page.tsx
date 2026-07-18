"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { api, type Etkinlik, type EtkinlikAyar } from "@/lib/api";
import { AppShell } from "@/components/site/AppShell";
import { ZamanCizelgesi } from "@/components/site/ZamanCizelgesi";

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
            onClick={() => router.push("/etkinliklerim")}
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
      {/* Ust barda "Paylasim" yaziyor - baslik tekrarlanmaz. IZOLASYON: yalniz KENDI baglantin. */}
      <p className="metin-yasli font-govde text-sm leading-relaxed text-ikincil">
        Bu bağlantı yalnız <span className="font-medium text-murekkep">sana</span> ait.
        Buradan gelen dilekler yalnız senin onay bekleyen dileklerine düşer; eşinin bağlantısı ayrıdır
        ve onun onay bekleyen dileklerine düşer. Karışıklık olmaması için yalnız kendi bağlantını görürsün.
      </p>

      <ZamanCizelgesi etkinlik={etkinlik} />

      <div className="mt-6 grid min-w-0 gap-5">
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
    // Metin ES ADI ile baslamaz: baglanti zaten o esin baglantisidir ve mesaji
    // gonderen de odur. "X olarak..." ifadesi ucuncu bir kisi konusuyormus gibi
    // duruyor ve davetliyi sasirtiyordu.
    const metin = "Anı defterimize bir dilek bırakır mısın?";
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
        {esAdi} · senin bağlantın
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
