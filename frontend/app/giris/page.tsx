"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { MarkaKilidi } from "@/components/marka/MarkaKilidi";
import { api } from "@/lib/api";

// KVKK deseni (Planlama/Stripe/Linear/Notion): girişte onay kutusu YOK - sürtünmesiz.
// KVKK yalnız kayıtta ince onam metni + her iki modda footer'da kanuni erişim linki.
export default function GirisSayfasi() {
  return (
    <Suspense fallback={null}>
      <GirisIcerik />
    </Suspense>
  );
}

function GirisIcerik() {
  const router = useRouter();
  const arama = useSearchParams();
  const davetToken = arama.get("davet"); // es daveti ile geldiyse geri don
  const [kayitMi, setKayitMi] = useState(false);
  const [ad, setAd] = useState("");
  const [email, setEmail] = useState("");
  const [sifre, setSifre] = useState("");
  const [sifre2, setSifre2] = useState("");
  const [hata, setHata] = useState("");
  const [yukleniyor, setYukleniyor] = useState(false);

  // ZORUNLU ONAY - varsayilan olarak ISARETSIZ.
  //
  // Onceki surumde "kayit olarak kabul etmis olursun" yaziyordu: bu ORTUK RIZA'dir
  // ve KVKK m.3/1-a uyarinca GECERSIZDIR (acik riza, ozgur iradeyle aciklanan olmali).
  // Varsayilan isaretli kutucuk da ayni sebeple gecersizdir - kullanici HAREKET
  // ETMELIDIR.
  // ZATEN GIRISLIYSE BURADA DURMA.
  //
  // KOK NEDEN (canlida en cok sikayet edilen hata): PWA'nin start_url'i "/giris" idi
  // ve bu sayfa oturumu HIC KONTROL ETMIYORDU. Uygulamayi her acan kullanici giris
  // ekraniyla karsilasiyor, "sistem beni atti" sanip yeniden giris yapiyordu. Oysa
  // cerez 7 GUN gecerliydi ve oturum hic dusmuyordu - sorun kimlikte degil, ACILIS
  // ADRESINDEYDI.
  //
  // Iki katmanli cozum: manifest start_url duzeltildi VE bu sayfa artik oturumu
  // dogruluyor. Ikincisi sart, cunku kurulu PWA'lar eski manifest'i bir sure tasir
  // ve kullanici /giris'e elle de gelebilir.
  const [oturumKontrol, setOturumKontrol] = useState(true);

  useEffect(() => {
    let iptal = false;
    void (async () => {
      const ben = await api.ben();
      if (iptal) return;
      if (ben.ok) {
        // Davet akisi varsa oraya, yoksa uygulamaya.
        const liste = await api.etkinliklerim();
        if (iptal) return;
        if (liste.ok && liste.veri.length > 0) {
          window.location.replace(liste.veri.length === 1 ? "/gelen-dilekler" : "/etkinliklerim");
          return;
        }
        window.location.replace("/etkinliklerim");
        return;
      }
      setOturumKontrol(false);
    })();
    return () => { iptal = true; };
  }, []);

  const [onayKvkk, setOnayKvkk] = useState(false);
  const [onayKosullar, setOnayKosullar] = useState(false);

  async function gonder(e: React.FormEvent) {
    e.preventDefault();
    setHata("");
    if (kayitMi && sifre !== sifre2) {
      setHata("Şifreler eşleşmiyor.");
      return;
    }
    if (kayitMi && (!onayKvkk || !onayKosullar)) {
      setHata("Devam etmek için her iki metni de onaylamanız gerekir.");
      return;
    }
    setYukleniyor(true);
    const cevap = kayitMi
      ? await api.kayit({
          ad,
          email,
          sifre,
          // Sunucu bunlari YENIDEN dogrular: istemci kutucugu atlatsa bile kayit olmaz.
          onaylar: ["kvkk_aydinlatma", "kullanim_kosullari"],
        })
      : await api.giris({ email, sifre });
    if (!cevap.ok) {
      setYukleniyor(false);
      setHata(cevap.mesaj);
      return;
    }

    // Es daveti ile geldiyse davet ekranina don (orada "Deftere katil" butonu cikar).
    if (davetToken) {
      setYukleniyor(false);
      router.push(`/davet/${davetToken}`);
      return;
    }

    // Akilli yonlendirme: etkinlik yoksa olusturma, TEK etkinlik varsa dogrudan defter,
    // birden fazla varsa secim ekrani (/etkinliklerim).
    const liste = await api.etkinliklerim();
    setYukleniyor(false);
    if (liste.ok && liste.veri.length === 1) {
      const tek = liste.veri[0];
      await api.etkinlikAktifYap(tek.id);
      router.push("/gelen-dilekler");
      return;
    }
    router.push("/etkinliklerim");
  }

  // Oturum dogrulanana kadar FORM GOSTERME: girisli kullaniciya bir an bile giris
  // ekrani gostermek, "yine atildim" hissini yeniden uretirdi.
  if (oturumKontrol) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6">
        <MarkaKilidi varyant="wordmark" boyut="orta" animasyonlu />
        <p className="mt-6 font-govde text-sm text-ikincil">Oturumunuz hazırlanıyor...</p>
      </main>
    );
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

        {/* ZORUNLU ONAY - kutucuklar isaretlenmeden kayit olmaz.
            Onceki surumde "kayit olarak kabul etmis olursun" yaziyordu: ortuk riza,
            KVKK'da gecersiz. Onay kaydi (metin hash'i + zaman + IP) kalici saklanir. */}
        {kayitMi && (
          <div className="mt-4 space-y-2.5 rounded-2xl border border-ayrac bg-parsomen p-4">
            <label className="flex cursor-pointer items-start gap-2.5">
              <input
                type="checkbox"
                checked={onayKvkk}
                onChange={(e) => setOnayKvkk(e.target.checked)}
                className="mt-0.5 shrink-0 accent-[color:var(--sarap)]"
              />
              <span className="font-govde text-[0.72rem] leading-relaxed text-ikincil">
                <Link
                  href="/kvkk"
                  target="_blank"
                  className="font-medium text-sarap hover:underline"
                >
                  KVKK Aydınlatma Metni
                </Link>
                &apos;ni okudum, kişisel verilerimin işlenmesini kabul ediyorum.
              </span>
            </label>

            <label className="flex cursor-pointer items-start gap-2.5">
              <input
                type="checkbox"
                checked={onayKosullar}
                onChange={(e) => setOnayKosullar(e.target.checked)}
                className="mt-0.5 shrink-0 accent-[color:var(--sarap)]"
              />
              <span className="font-govde text-[0.72rem] leading-relaxed text-ikincil">
                <Link
                  href="/kosullar"
                  target="_blank"
                  className="font-medium text-sarap hover:underline"
                >
                  Kullanım Koşulları
                </Link>
                &apos;nı okudum ve kabul ediyorum. Defterimin{" "}
                <span className="font-medium text-murekkep">
                  özel günümden 20 gün sonra kalıcı olarak silineceğini
                </span>{" "}
                ve eserimi bu süre içinde indirmenin benim sorumluluğumda olduğunu
                anlıyorum.
              </span>
            </label>
          </div>
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
