"use client";

import "./globals.css";

// App Router global hata siniri. Kendi <html>/<body>'sini render eder (bu App
// Router'in kucuk-harf JSX html/body'sidir; next/document <Html> DEGIL).
export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html lang="tr">
      <body className="bg-parsomen font-govde text-murekkep antialiased">
        <main className="mx-auto flex min-h-screen max-w-icerik flex-col items-center justify-center px-6 text-center">
          <h1 className="font-display text-3xl text-murekkep">
            Bir şeyler ters gitti
          </h1>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-ikincil">
            Beklenmedik bir hata oluştu. Tekrar deneyebilir ya da ana sayfaya
            dönebilirsin.
          </p>
          <div className="mt-8 flex items-center gap-4">
            <button
              onClick={() => reset()}
              className="rounded-full bg-sarap px-7 py-3 text-sm font-medium text-parsomen transition-colors hover:bg-sarapKoyu"
            >
              Tekrar dene
            </button>
            <a
              href="/"
              className="text-sm text-ikincil transition-colors hover:text-sarap"
            >
              Ana sayfa
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
