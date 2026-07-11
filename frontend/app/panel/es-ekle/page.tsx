"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import QRCode from "qrcode";
import { api, type Etkinlik } from "@/lib/api";
import { AppShell } from "@/components/site/AppShell";

// "+ Esini Ekle": paylasilabilir davet linki (mail servisi gerekmez).
// Kurucu es link uretir, esine gonderir; es tiklayip kayit/giris yapar ve katilir.
export default function EsEkleSayfasi() {
  const router = useRouter();
  const [etkinlik, setEtkinlik] = useState<Etkinlik | null>(null);
  const [esKatildi, setEsKatildi] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [hedefRol, setHedefRol] = useState<string>("");
  const [durum, setDurum] = useState<"yukleniyor" | "hazir" | "yok">("yukleniyor");
  const [uretiliyor, setUretiliyor] = useState(false);
  const [qr, setQr] = useState("");

  useEffect(() => {
    (async () => {
      const e = await api.etkinlikAktif();
      if (!e.ok) {
        if (e.durum === 401) router.replace("/giris");
        else setDurum("yok");
        return;
      }
      setEtkinlik(e.veri);
      const d = await api.davetDurum();
      if (d.ok) {
        setEsKatildi(d.veri.es_katildi);
        setToken(d.veri.token);
        setHedefRol(d.veri.hedef_rol);
      }
      setDurum("hazir");
    })();
  }, [router]);

  const url = token && typeof window !== "undefined"
    ? `${window.location.origin}/davet/${token}`
    : "";

  useEffect(() => {
    if (!url) {
      setQr("");
      return;
    }
    QRCode.toDataURL(url, { margin: 1, width: 320, color: { dark: "#211A17", light: "#F4EBDA" } })
      .then(setQr)
      .catch(() => setQr(""));
  }, [url]);

  async function davetUret() {
    setUretiliyor(true);
    const c = await api.davetOlustur();
    setUretiliyor(false);
    if (!c.ok) {
      toast.error(c.mesaj);
      return;
    }
    setToken(c.veri.token);
    setHedefRol(c.veri.hedef_rol);
    toast.success("Davet bağlantın hazır - eşine gönderebilirsin.");
  }

  async function paylas() {
    if (!url || !etkinlik) return;
    const metin = `${etkinlik.es1_ad} & ${etkinlik.es2_ad} anı defterimize katıl - dilekleri birlikte yönetelim.`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Anı Defterimiz", text: metin, url });
      } catch {
        /* kullanici iptal etti */
      }
    } else {
      await kopyala();
    }
  }

  async function kopyala() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Bağlantı kopyalandı.");
    } catch {
      toast.error("Kopyalanamadı - bağlantıyı elle seçip kopyala.");
    }
  }

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
        </div>
      </AppShell>
    );
  }

  const esAdi = hedefRol === "es1" ? etkinlik.es1_ad : etkinlik.es2_ad;

  return (
    <AppShell>
      <div className="rounded-3xl border border-ayrac bg-yuzey p-6 sm:p-8">
        <p className="font-govde text-xs uppercase tracking-etiket text-yaldiz">Yönetim</p>
        <h1 className="mt-2 font-display text-2xl text-murekkep sm:text-3xl">Eşini Ekle</h1>
        <p className="metin-yasli mt-2 font-govde text-sm leading-relaxed text-ikincil">
          Eşin de defterinize katılsın: kendi bağlantısından gelen dilekleri kendi onaylasın,
          bildirimlerini alsın. Aşağıdaki davet bağlantısını ona gönder.
        </p>
      </div>

      {esKatildi ? (
        <div className="mt-6 flex items-start gap-3 rounded-3xl border border-yaldiz/40 bg-yaldiz/10 p-6">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-yaldiz/20 text-yaldiz">
            <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth={1.8} fill="none" />
              <path d="m8.5 12.5 2.5 2.5 4.5-5" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </svg>
          </span>
          <div>
            <p className="font-govde text-sm font-medium text-murekkep">Eşin defterinize katıldı</p>
            <p className="metin-yasli mt-1 font-govde text-sm text-ikincil">
              Artık kendi onay kuyruğunu yönetiyor ve bildirimlerini alıyor.
            </p>
          </div>
        </div>
      ) : !token ? (
        <div className="mt-6 rounded-3xl border border-ayrac bg-yuzey p-8 text-center">
          <p className="font-govde text-sm text-ikincil">
            {esAdi} için henüz bir davet bağlantısı oluşturulmadı.
          </p>
          <button
            onClick={davetUret}
            disabled={uretiliyor}
            className="mt-6 rounded-full bg-sarap px-7 py-3 font-govde text-sm font-medium text-parsomen transition-colors hover:bg-sarapKoyu disabled:opacity-60"
          >
            {uretiliyor ? "Oluşturuluyor..." : "Davet bağlantısı oluştur"}
          </button>
        </div>
      ) : (
        <div className="mt-6 rounded-3xl border border-ayrac bg-yuzey p-6 sm:p-8">
          <p className="font-govde text-xs uppercase tracking-etiket text-yaldiz">
            {esAdi} için davet
          </p>

          {qr && (
            <img
              src={qr}
              alt="Davet QR kodu"
              className="mx-auto mt-5 h-44 w-44 rounded-xl border border-ayrac"
            />
          )}

          <div className="mt-5 rounded-lg border border-ayrac bg-parsomen px-3 py-2">
            <p className="truncate font-govde text-xs text-ikincil" title={url}>
              {url}
            </p>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              onClick={paylas}
              className="flex-1 rounded-full bg-sarap px-5 py-3 font-govde text-sm font-medium text-parsomen transition-colors hover:bg-sarapKoyu"
            >
              Eşine gönder
            </button>
            <button
              onClick={kopyala}
              className="rounded-full border border-ayrac px-5 py-3 font-govde text-sm text-ikincil transition-colors hover:border-sarap hover:text-sarap"
            >
              Kopyala
            </button>
          </div>

          <p className="metin-yasli mt-4 font-govde text-xs leading-relaxed text-ikincil">
            Bu bağlantı tek kullanımlıktır. Eşin bağlantıya tıklayıp hesabını oluşturduğunda
            (ya da mevcut hesabıyla girdiğinde) defterinize {esAdi} olarak katılır.
          </p>
        </div>
      )}
    </AppShell>
  );
}
