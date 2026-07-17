"use client";

import Link from "next/link";
import { MarkaKilidi } from "@/components/marka/MarkaKilidi";

// Sifre degistir - backend sifirlama akisi (mail token) sonraki turda eklenir.
export default function SifreSifirlaSayfasi() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 py-16 text-center">
      <Link href="/etkinliklerim" aria-label="Panele dön">
        <MarkaKilidi varyant="wordmark" boyut="orta" />
      </Link>
      <div className="mt-10 w-full rounded-3xl border border-ayrac bg-yuzey p-8">
        <h1 className="font-display text-xl text-murekkep">Şifre Değiştir</h1>
        <p className="mt-3 font-govde text-sm leading-relaxed text-ikincil">
          Şifre değiştirme akışı yakında eklenecek. O zamana kadar giriş sorunları için
          bizimle iletişime geçebilirsin.
        </p>
        <Link
          href="/etkinliklerim"
          className="mt-6 inline-block rounded-full bg-sarap px-7 py-3 font-govde text-sm font-medium text-parsomen transition-colors hover:bg-sarapKoyu"
        >
          Panele dön
        </Link>
      </div>
    </main>
  );
}
