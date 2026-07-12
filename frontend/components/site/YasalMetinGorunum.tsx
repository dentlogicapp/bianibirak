"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MarkaKilidi } from "@/components/marka/MarkaKilidi";

// YASAL METIN GORUNTULEYICI - onay kaydindaki hash'in kaynagi ile AYNI metni gosterir.
//
// NEDEN DB'DEN OKUNUYOR:
// Onceki surumde bu sayfalar HARDCODED placeholder metin gosteriyordu; oysa kayit
// aninda kullanicinin onayina DB'deki metnin hash'i yaziliyordu. Yani kullanicinin
// OKUDUGU metin ile ONAYLADIGI metin farkliydi.
//
// Bu, mahkemede aleyhimize donen bir celiskidir: "Siz bu metni kabul ettiniz"
// dediginizde, kullanicinin gosterecegi ekran goruntusu BASKA bir metin olur. Kanit
// zinciri, en zayif halkasi kadar saglamdir.
//
// Simdi tek kaynak: DB. Hash de gosterilir - kullanici isterse kendi onay kaydiyla
// karsilastirabilir. Seffaflik, guvenin ta kendisidir.

type Metin = {
  anahtar: string;
  baslik: string;
  icerik: string;
  surum: string;
  hash: string;
  yururluk_tarihi: string;
};

export function YasalMetinGorunum({ anahtar }: { anahtar: string }) {
  const [metin, setMetin] = useState<Metin | null>(null);
  const [hata, setHata] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const y = await fetch(`/api/metin/${anahtar}`);
        if (!y.ok) {
          setHata(true);
          return;
        }
        setMetin(await y.json());
      } catch {
        setHata(true);
      }
    })();
  }, [anahtar]);

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <Link href="/giris" aria-label="Geri">
        <MarkaKilidi varyant="wordmark" boyut="kucuk" />
      </Link>

      {hata && (
        <p className="mt-10 font-govde text-sm text-sarap">
          Metin yüklenemedi. Lütfen daha sonra tekrar deneyin.
        </p>
      )}

      {!metin && !hata && (
        <p className="mt-10 font-govde text-sm text-ikincil">Yükleniyor...</p>
      )}

      {metin && (
        <>
          <h1 className="mt-10 font-display text-3xl text-murekkep">{metin.baslik}</h1>

          <p className="mt-2 font-govde text-xs text-ikincil">
            Yürürlük: {tarih(metin.yururluk_tarihi)} · Sürüm {metin.surum}
          </p>

          {/* Metin, DB'deki haliyle - kelimesi kelimesine. whitespace-pre-line ile
              paragraf yapisi korunur. */}
          <div className="metin-yasli mt-8 whitespace-pre-line font-govde text-sm leading-relaxed text-ikincil">
            {metin.icerik}
          </div>

          {/* HASH - seffaflik. Kullanici, onayladigi metnin bu metin oldugunu
              dogrulayabilsin. Gizlemek icin bir sebep yok; aksine, gostermek
              guven verir. */}
          <div className="mt-10 rounded-2xl border border-ayrac bg-parsomen p-4">
            <p className="font-govde text-[0.62rem] uppercase tracking-etiket text-ikincil">
              Metin parmak izi (SHA-256)
            </p>
            <p className="mt-1 break-all font-mono text-[0.65rem] leading-relaxed text-ikincil">
              {metin.hash}
            </p>
            <p className="metin-yasli mt-2 font-govde text-[0.7rem] leading-relaxed text-ikincil">
              Bu metni onayladığınızda, yukarıdaki parmak izi onay kaydınıza yazılır. Metin
              sonradan değiştirilirse parmak izi de değişir — yani size gösterdiğimiz metnin
              o gün ne olduğu her zaman ispatlanabilir.
            </p>
          </div>
        </>
      )}
    </main>
  );
}

function tarih(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("tr-TR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}
