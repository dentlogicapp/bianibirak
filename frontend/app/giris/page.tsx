"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MarkaKilidi } from "@/components/marka/MarkaKilidi";
import { api } from "@/lib/api";

// 0B minimal fonksiyonel giris/kayit. Zengin prototip cilasi (KVKK modali, koyu mod,
// sayac) sonraki cila asamasinda birebir tasinir.
export default function GirisSayfasi() {
  const router = useRouter();
  const [kayitMi, setKayitMi] = useState(false);
  const [ad, setAd] = useState("");
  const [email, setEmail] = useState("");
  const [sifre, setSifre] = useState("");
  const [sifre2, setSifre2] = useState("");
  const [kvkk, setKvkk] = useState(false);
  const [hata, setHata] = useState("");
  const [yukleniyor, setYukleniyor] = useState(false);

  async function gonder(e: React.FormEvent) {
    e.preventDefault();
    setHata("");
    if (!kvkk) {
      setHata("Devam etmek için KVKK Aydınlatma Metni onayı gerekir.");
      return;
    }
    if (kayitMi && sifre !== sifre2) {
      setHata("Şifreler eşleşmiyor.");
      return;
    }
    setYukleniyor(true);
    const cevap = kayitMi
      ? await api.kayit({ ad, email, sifre })
      : await api.giris({ email, sifre });
    setYukleniyor(false);
    if (cevap.ok) router.push("/panel");
    else setHata(cevap.mesaj);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 py-16">
      <MarkaKilidi varyant="wordmark" boyut="orta" animasyonlu />
      <p className="mt-4 font-govde text-xs uppercase tracking-etiket text-ikincil">
        Senden Bize Kalan
      </p>

      <form
        onSubmit={gonder}
        className="mt-10 w-full rounded-3xl border border-ayrac bg-yuzey p-8"
      >
        {kayitMi && (
          <label className="mb-4 block">
            <span className="mb-1 block font-govde text-xs text-ikincil">Ad Soyad</span>
            <input
              value={ad}
              onChange={(e) => setAd(e.target.value)}
              className="w-full rounded-xl border border-ayrac bg-parsomen px-4 py-3 font-govde text-sm outline-none focus:border-sarap"
              placeholder="Adınız Soyadınız"
            />
          </label>
        )}
        <label className="mb-4 block">
          <span className="mb-1 block font-govde text-xs text-ikincil">E-posta</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-ayrac bg-parsomen px-4 py-3 font-govde text-sm outline-none focus:border-sarap"
            placeholder="ornek@eposta.com"
          />
        </label>
        <label className="mb-4 block">
          <span className="mb-1 block font-govde text-xs text-ikincil">Şifre</span>
          <input
            type="password"
            value={sifre}
            onChange={(e) => setSifre(e.target.value)}
            className="w-full rounded-xl border border-ayrac bg-parsomen px-4 py-3 font-govde text-sm outline-none focus:border-sarap"
            placeholder="En az 8 karakter"
          />
        </label>
        {kayitMi && (
          <label className="mb-4 block">
            <span className="mb-1 block font-govde text-xs text-ikincil">Şifre (tekrar)</span>
            <input
              type="password"
              value={sifre2}
              onChange={(e) => setSifre2(e.target.value)}
              className="w-full rounded-xl border border-ayrac bg-parsomen px-4 py-3 font-govde text-sm outline-none focus:border-sarap"
            />
          </label>
        )}

        <label className="mt-2 flex items-start gap-2 font-govde text-xs text-ikincil">
          <input
            type="checkbox"
            checked={kvkk}
            onChange={(e) => setKvkk(e.target.checked)}
            className="mt-0.5"
          />
          <span>
            <span className="font-medium text-sarap">KVKK Aydınlatma Metni</span>&apos;ni okudum,
            kişisel verilerimin belirtilen amaçlarla işlenmesini kabul ediyorum.
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
          {yukleniyor ? "Lütfen bekleyin..." : kayitMi ? "Kayıt ol" : "Giriş yap"}
        </button>

        <p className="mt-5 text-center font-govde text-xs text-ikincil">
          {kayitMi ? "Zaten üye misin? " : "Hesabın yok mu? "}
          <button
            type="button"
            onClick={() => {
              setKayitMi(!kayitMi);
              setHata("");
            }}
            className="font-medium text-sarap"
          >
            {kayitMi ? "Giriş yap" : "Kayıt ol"}
          </button>
        </p>
      </form>
    </main>
  );
}
