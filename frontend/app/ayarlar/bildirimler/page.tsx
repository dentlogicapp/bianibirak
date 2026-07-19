"use client";

import { AppShell } from "@/components/site/AppShell";
import { BildirimAyari } from "@/components/site/BildirimAyari";
import { BildirimIzinKarti } from "@/components/site/BildirimIzinKarti";

// Hesap ayarlari: bildirimler + sessiz saatler (avatar menusunden).
export default function AyarlarSayfasi() {
  return (
    <AppShell>
      <div className="rounded-3xl border border-ayrac bg-yuzey p-6 sm:p-8">
        <p className="font-govde text-xs uppercase tracking-etiket text-yaldiz">Hesap</p>
        <h1 className="mt-2 font-display text-2xl text-murekkep sm:text-3xl">
          Bildirimler & Sessiz Saatler
        </h1>
        <p className="mt-2 font-govde text-sm leading-relaxed text-ikincil">
          Sana bir dilek bırakıldığında ve ortak deftere yeni bir anı eklendiğinde bildirim
          al. Sessiz saatlerde bildirimler ertelenir.
        </p>
      </div>

      {/* IZIN KARTI EN USTTE: izin yoksa asagidaki ince ayarlarin hicbir anlami
          yoktur. Once kapiyi ac, sonra odayi duzenle. */}
      <div className="mt-6">
        <BildirimIzinKarti />
      </div>

      <div className="mt-6">
        <BildirimAyari />
      </div>
    </AppShell>
  );
}
