"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MarkaKilidi } from "@/components/marka/MarkaKilidi";
import { api } from "@/lib/api";

// KVKK deseni (Planlama/Stripe/Linear/Notion): girişte onay kutusu YOK - sürtünmesiz.
// KVKK yalnız kayıtta ince onam metni + her iki modda footer'da kanuni erişim linki.
export default function GirisSayfasi() {
  const router = useRouter();
  const [kayitMi, setKayitMi] = useState(false);
  const [ad, setAd] = useState("");
  const [email, setEmail] = useState("");
  const [sifre, setSifre] = useState("");
  const [sifre2, setSifre2] = useState("");
  const [hata, setHata] = useState("");
  const [yukleniyor, setYukleniyor] = useState(false);

  async function gonder(e: React.FormEvent) {
    e.preventDefault();
    setHata("");
    if (kayitMi && sifre !== sifre2) {
      setHata("Şifreler eşleşmiyor.");
      return;
    }
    setYukleniyor(true);
    const cevap = kayitMi
      ? await api.kayit({ ad, email, sifre })
      : await api.giris({ email, sifre });
    if (!cevap.ok) {
      setYukleniyor(false);
      setHata(cevap.mesaj);
      return;
    }

    // Akilli yonlendirme: etkinlik yoksa olusturma, TEK etkinlik varsa dogrudan defter,
    // birden fazla varsa secim ekrani (/panel).
    const liste = await api.etkinliklerim();
    setYukleniyor(false);
    if (liste.ok && liste.veri.length === 1) {
      const tek = liste.veri[0];
      await api.etkinlikAktifYap(tek.id);
      router.push("/panel/etkinlik");
      return;
    }
    router.push("/panel");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 py-16">
      <Link href="/" aria-label="Ana sayfa">
        <MarkaKilidi varyant="wordmark" boyut="orta" animasyonlu />
      </Link>
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

        {hata && (
          <p className="mt-2 font-govde text-xs text-sarap" role="alert">
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

        {/* Kayıtta ince onam metni (checkbox DEĞİL - kanuni bilgilendirme) */}
        {kayitMi && (
          <p className="mt-4 text-center font-govde text-[0.7rem] leading-relaxed text-ikincil">
            Kayıt olarak{" "}
            <Link href="/kvkk" className="font-medium text-sarap hover:underline">
              KVKK Aydınlatma Metni
            </Link>
            &apos;ni kabul etmiş olursun.
          </p>
        )}

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

      {/* Footer - kanuni erişim (kimliksiz, sade link; Stripe/Linear deseni) */}
      <div className="mt-6 flex items-center gap-4 font-govde text-[0.7rem] text-ikincil">
        <Link href="/kvkk" className="transition-colors hover:text-sarap">
          KVKK Aydınlatma Metni
        </Link>
        <span className="text-ayrac">·</span>
        <Link href="/gizlilik" className="transition-colors hover:text-sarap">
          Gizlilik
        </Link>
      </div>
    </main>
  );
}
