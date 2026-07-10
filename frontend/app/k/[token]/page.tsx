"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api, type KatkiKarsilama } from "@/lib/api";
import { MarkaKilidi } from "@/components/marka/MarkaKilidi";

// Public davetli katki sayfasi (login YOK; surtunme sifir - Belge 01).
// Karsilama -> form (ad/email/telefon/mesaj + KVKK riza) -> teyit.
// Kapali/acilmamis etkinlik icin nazik ekranlar.
export default function KatkiSayfasi() {
  const params = useParams();
  const token = String(params.token || "");
  const [veri, setVeri] = useState<KatkiKarsilama | null>(null);
  const [durum, setDurum] = useState<"yukleniyor" | "hazir" | "gecersiz">("yukleniyor");
  const [gonderildi, setGonderildi] = useState(false);

  useEffect(() => {
    if (!token) return;
    api.katkiKarsilama(token).then((c) => {
      if (c.ok) {
        setVeri(c.veri);
        setDurum("hazir");
      } else {
        setDurum("gecersiz");
      }
    });
  }, [token]);

  if (durum === "yukleniyor") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-parsomen font-govde text-sm text-ikincil">
        Yükleniyor...
      </main>
    );
  }

  if (durum === "gecersiz" || !veri) {
    return (
      <EkranKabuk>
        <p className="font-display text-xl text-murekkep">Bağlantı bulunamadı</p>
        <p className="mt-3 font-govde text-sm text-ikincil">
          Bu bağlantı geçersiz veya kaldırılmış olabilir.
        </p>
      </EkranKabuk>
    );
  }

  const ciftAdi = `${veri.es1_ad} & ${veri.es2_ad}`;

  // Kapali etkinlik - nazik ekran
  if (veri.kapandi) {
    return (
      <EkranKabuk>
        <p className="font-govde text-xs uppercase tracking-etiket text-yaldiz">
          {ciftAdi}
        </p>
        <p className="mt-4 font-display text-xl text-murekkep">Defter kapandı</p>
        <p className="mt-3 font-govde text-sm text-ikincil">
          Bu anı defteri artık yeni dilek almıyor. İlginiz için teşekkürler.
        </p>
      </EkranKabuk>
    );
  }

  // Henuz acilmamis
  if (!veri.acildi) {
    return (
      <EkranKabuk>
        <p className="font-govde text-xs uppercase tracking-etiket text-yaldiz">
          {ciftAdi}
        </p>
        <p className="mt-4 font-display text-xl text-murekkep">Çok yakında</p>
        <p className="mt-3 font-govde text-sm text-ikincil">
          Bu defter henüz açılmadı. Birazdan tekrar uğrayın.
        </p>
      </EkranKabuk>
    );
  }

  // Teyit ekrani
  if (gonderildi) {
    return (
      <EkranKabuk>
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-sarap/10">
          <span className="font-display text-2xl text-sarap">✓</span>
        </div>
        <p className="mt-5 font-display text-xl text-murekkep">Dileğin iletildi</p>
        <p className="mt-3 font-govde text-sm text-ikincil">
          {ciftAdi} çiftine bıraktığın anı için teşekkürler. Dileğin onlara ulaştı.
        </p>
      </EkranKabuk>
    );
  }

  // Katki formu
  return (
    <KatkiFormu token={token} veri={veri} onGonderildi={() => setGonderildi(true)} />
  );
}

// ---- Ekran kabugu (davetli icin sade, marka anI) ----
function EkranKabuk({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-parsomen px-6 py-16">
      <div className="w-full max-w-md text-center">
        <div className="mb-8 flex justify-center">
          <MarkaKilidi varyant="tam" boyut="kucuk" />
        </div>
        <div className="rounded-3xl border border-ayrac bg-yuzey p-8">{children}</div>
      </div>
    </main>
  );
}

// ---- Katki formu ----
function KatkiFormu({
  token,
  veri,
  onGonderildi,
}: {
  token: string;
  veri: KatkiKarsilama;
  onGonderildi: () => void;
}) {
  const [ad, setAd] = useState("");
  const [email, setEmail] = useState("");
  const [telefon, setTelefon] = useState("");
  const [mesaj, setMesaj] = useState("");
  const [riza, setRiza] = useState(false);
  const [hata, setHata] = useState("");
  const [yukleniyor, setYukleniyor] = useState(false);

  const ciftAdi = `${veri.es1_ad} & ${veri.es2_ad}`;
  const karsilama =
    veri.karsilama_metni ||
    "Bu özel günümüzde bize bir anı bırakır mısın?";
  // Davetli hangi esin linkinde? Yonlendirme icin (yanlis link uyarisi).
  const buEs = veri.kaynak_es === "es1" ? veri.es1_ad : veri.es2_ad;
  const digerEs = veri.kaynak_es === "es1" ? veri.es2_ad : veri.es1_ad;

  async function gonder(e: React.FormEvent) {
    e.preventDefault();
    setHata("");
    if (!riza) {
      setHata("Devam etmek için aydınlatma metnini onaylaman gerekir.");
      return;
    }
    if (ad.trim().length < 2) return setHata("Adını yazar mısın?");
    if (!email.includes("@")) return setHata("Geçerli bir e-posta gerekli.");
    if (telefon.trim().length < 7) return setHata("Geçerli bir telefon gerekli.");
    if (mesaj.trim().length < 2) return setHata("Bir mesaj yazmalısın.");

    setYukleniyor(true);
    const cevap = await api.katkiBirak(token, {
      davetliAd: ad.trim(),
      davetliEmail: email.trim(),
      davetliTelefon: telefon.trim(),
      mesaj: mesaj.trim(),
    });
    setYukleniyor(false);
    if (cevap.ok) onGonderildi();
    else setHata(cevap.mesaj);
  }

  return (
    <main className="flex min-h-screen flex-col items-center bg-parsomen px-6 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <MarkaKilidi varyant="tam" boyut="kucuk" />
        </div>

        {/* Karsilama */}
        <div className="rounded-3xl border border-ayrac bg-yuzey p-8 text-center">
          <p className="font-govde text-xs uppercase tracking-etiket text-yaldiz">
            {ciftAdi}
          </p>
          <p className="mt-4 font-display text-xl leading-snug text-murekkep">
            {karsilama}
          </p>
          {veri.prompt_metni && (
            <p className="mt-3 font-govde text-sm text-ikincil">{veri.prompt_metni}</p>
          )}
        </div>

        {/* Yonlendirme - hangi esin yakini + yanlis link uyarisi */}
        <div className="mt-4 rounded-2xl border border-yaldiz/40 bg-yaldiz/5 px-5 py-4">
          <p className="font-govde text-sm leading-relaxed text-murekkep">
            Bu ekrandan <span className="font-medium text-sarap">{buEs} tarafının yakını</span> olarak
            anı girişi yapabilirsin. Eğer <span className="font-medium">{digerEs} tarafının yakını</span>{" "}
            isen, kendi bağlantını/QR kodunu kontrol edip doğru bağlantıya geçerek anını oluşturabilirsin.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={gonder} className="mt-5 rounded-3xl border border-ayrac bg-yuzey p-8">
          <label className="mb-4 block">
            <span className="mb-1 block font-govde text-xs text-ikincil">Adın</span>
            <input
              value={ad}
              onChange={(e) => setAd(e.target.value)}
              className="w-full rounded-xl border border-ayrac bg-parsomen px-4 py-3 font-govde text-sm text-murekkep outline-none focus:border-sarap"
              placeholder="Adın Soyadın"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block font-govde text-xs text-ikincil">E-posta</span>
              <input
                type="email"
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-ayrac bg-parsomen px-4 py-3 font-govde text-sm text-murekkep outline-none focus:border-sarap"
                placeholder="ornek@eposta.com"
              />
            </label>
            <label className="block">
              <span className="mb-1 block font-govde text-xs text-ikincil">Telefon</span>
              <input
                type="tel"
                inputMode="tel"
                value={telefon}
                onChange={(e) => setTelefon(e.target.value)}
                className="w-full rounded-xl border border-ayrac bg-parsomen px-4 py-3 font-govde text-sm text-murekkep outline-none focus:border-sarap"
                placeholder="05xx xxx xx xx"
              />
            </label>
          </div>

          <label className="mt-4 block">
            <span className="mb-1 block font-govde text-xs text-ikincil">Mesajın</span>
            <textarea
              value={mesaj}
              onChange={(e) => setMesaj(e.target.value)}
              rows={5}
              className="w-full rounded-xl border border-ayrac bg-parsomen px-4 py-3 font-govde text-sm text-murekkep outline-none focus:border-sarap"
              placeholder="Dileğini, anını ya da tavsiyeni buraya yaz..."
            />
          </label>

          {/* KVKK aydinlatma + riza (Belge 08) */}
          <label className="mt-4 flex items-start gap-2 font-govde text-xs text-ikincil">
            <input
              type="checkbox"
              checked={riza}
              onChange={(e) => setRiza(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              Bıraktığım bilgilerin, dileğin çiftin anı defterinde kullanılması amacıyla
              işlenmesini kabul ediyorum.{" "}
              <a
                href="/kvkk"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-sarap hover:underline"
              >
                Aydınlatma Metni
              </a>
            </span>
          </label>

          {hata && (
            <p className="mt-4 font-govde text-xs text-sarap" role="alert">
              {hata}
            </p>
          )}

          <button
            type="submit"
            disabled={yukleniyor}
            className="mt-6 w-full rounded-full bg-sarap px-6 py-3 font-govde text-sm font-medium text-parsomen transition-colors hover:bg-sarapKoyu disabled:opacity-60"
          >
            {yukleniyor ? "Gönderiliyor..." : "Dileğimi bırak"}
          </button>
        </form>

        <p className="mt-6 text-center font-govde text-[0.7rem] text-ikincil">
          Bir Anı Bırak, Senden Bize Kalan
        </p>
      </div>
    </main>
  );
}
