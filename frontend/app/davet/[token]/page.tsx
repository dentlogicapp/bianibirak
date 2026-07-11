"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { MarkaKilidi } from "@/components/marka/MarkaKilidi";

type DavetBilgi = {
  durum: string;
  hedef_rol: string;
  es1_ad: string;
  es2_ad: string;
  tur: string;
  etkinlik_tarihi: string;
};

// Davet kabul ekrani: es linke tiklayinca gelir.
// Oturum varsa dogrudan "Katil" - yoksa giris/kayit sonrasi buraya doner.
export default function DavetSayfasi() {
  const params = useParams();
  const router = useRouter();
  const token = String(params.token ?? "");

  const [bilgi, setBilgi] = useState<DavetBilgi | null>(null);
  const [oturum, setOturum] = useState<"bilinmiyor" | "var" | "yok">("bilinmiyor");
  const [durum, setDurum] = useState<"yukleniyor" | "hazir" | "hata">("yukleniyor");
  const [hataMetni, setHataMetni] = useState("");
  const [katiliyor, setKatiliyor] = useState(false);

  useEffect(() => {
    (async () => {
      const [d, b] = await Promise.all([api.davetBilgi(token), api.ben()]);
      setOturum(b.ok ? "var" : "yok");
      if (!d.ok) {
        setHataMetni(d.mesaj);
        setDurum("hata");
        return;
      }
      setBilgi(d.veri);
      setDurum("hazir");
    })();
  }, [token]);

  async function katil() {
    setKatiliyor(true);
    const c = await api.davetKabul(token);
    setKatiliyor(false);
    if (!c.ok) {
      toast.error(c.mesaj);
      return;
    }
    toast.success("Defterinize katıldın.");
    // JWT yenilendi (aktif etkinlik ayarlandi) - dogrudan deftere
    window.location.href = "/panel/etkinlik";
  }

  if (durum === "yukleniyor") {
    return (
      <Kabuk>
        <p className="font-govde text-sm text-ikincil">Yükleniyor...</p>
      </Kabuk>
    );
  }

  if (durum === "hata" || !bilgi) {
    return (
      <Kabuk>
        <p className="metin-yasli font-govde text-sm leading-relaxed text-ikincil">
          {hataMetni || "Bu davet bağlantısı geçersiz."}
        </p>
      </Kabuk>
    );
  }

  if (bilgi.durum !== "beklemede") {
    return (
      <Kabuk>
        <p className="metin-yasli font-govde text-sm leading-relaxed text-ikincil">
          Bu davet daha önce kullanılmış. Hesabınla giriş yaparak defterine ulaşabilirsin.
        </p>
        <Link
          href="/giris"
          className="mt-6 inline-block rounded-full bg-sarap px-7 py-3 font-govde text-sm font-medium text-parsomen transition-colors hover:bg-sarapKoyu"
        >
          Giriş yap
        </Link>
      </Kabuk>
    );
  }

  const benimAdim = bilgi.hedef_rol === "es1" ? bilgi.es1_ad : bilgi.es2_ad;

  return (
    <Kabuk>
      <p className="font-govde text-xs uppercase tracking-etiket text-yaldiz">
        {turEtiketi(bilgi.tur)} · Davet
      </p>
      <h1 className="mt-3 font-display text-2xl text-murekkep sm:text-3xl">
        {bilgi.es1_ad} &amp; {bilgi.es2_ad}
      </h1>
      <p className="mt-2 font-govde text-sm text-ikincil">{tarihMetni(bilgi.etkinlik_tarihi)}</p>

      <p className="metin-yasli mt-6 font-govde text-sm leading-relaxed text-murekkep">
        Ortak anı defterinize <span className="font-medium text-sarap">{benimAdim}</span> olarak
        davet edildin. Katıldığında kendi bağlantından gelen dilekleri yalnız sen görür, sen
        onaylarsın; onayladıkların ortak defterde birleşir.
      </p>

      {oturum === "var" ? (
        <button
          onClick={katil}
          disabled={katiliyor}
          className="mt-8 w-full rounded-full bg-sarap px-7 py-3.5 font-govde text-sm font-medium text-parsomen transition-colors hover:bg-sarapKoyu disabled:opacity-60"
        >
          {katiliyor ? "Katılıyor..." : "Deftere katıl"}
        </button>
      ) : (
        <>
          <Link
            href={`/giris?davet=${token}`}
            className="mt-8 block w-full rounded-full bg-sarap px-7 py-3.5 text-center font-govde text-sm font-medium text-parsomen transition-colors hover:bg-sarapKoyu"
          >
            Hesap oluştur ve katıl
          </Link>
          <p className="mt-3 font-govde text-xs text-ikincil">
            Hesabın varsa giriş yaptıktan sonra bu bağlantıya tekrar dön.
          </p>
        </>
      )}
    </Kabuk>
  );
}

function Kabuk({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 py-16">
      <Link href="/" aria-label="Ana sayfa">
        <MarkaKilidi varyant="tam" boyut="orta" animasyonlu />
      </Link>
      <div className="mt-10 w-full rounded-3xl border border-ayrac bg-yuzey p-7 text-center sm:p-8">
        {children}
      </div>
    </main>
  );
}

function turEtiketi(tur: string): string {
  if (tur === "dugun") return "Düğün";
  if (tur === "nisan") return "Nişan";
  if (tur === "nikah") return "Nikah";
  return tur;
}

function tarihMetni(iso: string): string {
  const t = new Date(iso);
  if (isNaN(t.getTime())) return "";
  return t.toLocaleString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
