"use client";

import { useEffect, useState } from "react";

// TEHLIKELI EYLEM ONAYI - harekat merkezinin emniyet mandali.
//
// SORUN: sistemi yoneten ekranda "goruntule", "dondur" ve "kalici sil" AYNI kolaylikta
// duruyordu. Geri alinabilir bir eylemle geri ALINAMAZ bir eylem ayni tikla yapiliyorsa,
// yonetici er ya da gec yanlisini yapar - ve bu bir kullanici hatasi degil, ARAYUZ
// hatasidir.
//
// TASARIM ILKESI (dunya capinda yonetim panellerinin ortak dersi):
//   1. Onay penceresi "emin misin?" diye SORMAZ - NE OLACAGINI ANLATIR.
//      "Emin misiniz?" bilgi tasimaz; kullanici zaten emin sanir. Etkiyi yazarsan
//      kullanici KENDI karar verir.
//   2. Siddet seviyeye gore ARTAR: geri alinabilir eylem korkutmaz, geri alinamaz
//      eylem yazarak teyit ister. Her seyi kirmiziya boyamak, kirmiziyi anlamsizlastirir.
//   3. Kimin etkilenecegi soylenir (cift mi, davetli mi, ikisi de).
//   4. Geri donus yolu acikca yazilir: "cop kutusundan geri alinabilir" gibi.
//
// Uc seviye:
//   bilgi    - geri alinabilir, dusuk etki (ornek: dondurmayi coz)
//   uyari    - anlamli etki ama geri alinabilir (ornek: dondur, cope at)
//   kritik   - GERI ALINAMAZ; ad yazarak teyit zorunlu (ornek: kalici sil)

export type EylemSiddet = "bilgi" | "uyari" | "kritik";

export type TehlikeliEylemProps = {
  acik: boolean;
  siddet: EylemSiddet;
  baslik: string;
  /** Ne olacak - madde madde. Kullanici karari BUNA bakarak verir. */
  etkiler: string[];
  /** Geri donus yolu (varsa). Yoksa null -> "geri alinamaz" vurgusu cikar. */
  geriDonus?: string | null;
  /** Kim etkileniyor: "Çift ve davetliler" gibi. */
  etkilenen?: string;
  /** Kritik seviyede: kullanicinin BIREBIR yazmasi gereken metin. */
  teyitMetni?: string;
  onayEtiket: string;
  yukleniyor?: boolean;
  onOnay: () => void;
  onKapat: () => void;
};

const TON: Record<EylemSiddet, { cerceve: string; zemin: string; vurgu: string; buton: string }> = {
  bilgi: {
    cerceve: "border-yaldiz/40",
    zemin: "bg-yaldiz/10",
    vurgu: "text-yaldiz",
    buton: "bg-yaldiz text-murekkep hover:bg-yaldiz/85",
  },
  uyari: {
    cerceve: "border-amber-400/50",
    zemin: "bg-amber-500/10",
    vurgu: "text-amber-600",
    buton: "bg-amber-500 text-murekkep hover:bg-amber-500/85",
  },
  kritik: {
    cerceve: "border-sarap/50",
    zemin: "bg-sarap/10",
    vurgu: "text-sarap",
    buton: "bg-sarap text-parsomen hover:bg-sarapKoyu",
  },
};

export function TehlikeliEylem({
  acik,
  siddet,
  baslik,
  etkiler,
  geriDonus = null,
  etkilenen,
  teyitMetni,
  onayEtiket,
  yukleniyor = false,
  onOnay,
  onKapat,
}: TehlikeliEylemProps) {
  const [yazilan, setYazilan] = useState("");
  const ton = TON[siddet];
  const teyitGerekli = siddet === "kritik" && Boolean(teyitMetni);
  const onayAcik = !yukleniyor && (!teyitGerekli || yazilan === teyitMetni);

  // Pencere her acildiginda temiz baslar - onceki yazim SIZMAZ.
  // (Ayni oturumda iki farkli defteri silmeye calisan yonetici icin kritik.)
  useEffect(() => {
    if (acik) setYazilan("");
  }, [acik]);

  // ESC ile kapanir; ENTER ile ONAYLANMAZ (kaza riski).
  useEffect(() => {
    if (!acik) return;
    const dinle = (e: KeyboardEvent) => {
      if (e.key === "Escape") onKapat();
    };
    window.addEventListener("keydown", dinle);
    return () => window.removeEventListener("keydown", dinle);
  }, [acik, onKapat]);

  if (!acik) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-murekkep/70 p-4 backdrop-blur-sm"
      onClick={onKapat}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-3xl border border-ayrac bg-yuzey shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`border-b ${ton.cerceve} ${ton.zemin} px-6 py-4`}>
          <p className={`font-govde text-[0.62rem] uppercase tracking-etiket ${ton.vurgu}`}>
            {siddet === "kritik" ? "Geri alınamaz işlem" : "Onay gerekiyor"}
          </p>
          <p className="mt-1 font-display text-lg text-murekkep">{baslik}</p>
          {etkilenen && (
            <p className="mt-0.5 font-govde text-xs text-ikincil">Etkilenen: {etkilenen}</p>
          )}
        </div>

        <div className="px-6 py-5">
          <p className="font-govde text-[0.65rem] uppercase tracking-etiket text-ikincil">
            Bu işlem şunları yapar
          </p>
          <ul className="mt-2 space-y-1.5">
            {etkiler.map((e, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className={`mt-1.5 h-1 w-1 shrink-0 rounded-full ${ton.vurgu.replace("text-", "bg-")}`} aria-hidden />
                <span className="metin-yasli font-govde text-sm leading-relaxed text-murekkep">{e}</span>
              </li>
            ))}
          </ul>

          <div className={`mt-4 rounded-xl border ${ton.cerceve} ${ton.zemin} px-4 py-3`}>
            <p className="font-govde text-xs leading-relaxed text-murekkep">
              {geriDonus ? (
                <>
                  <span className="font-medium">Geri dönüş:</span> {geriDonus}
                </>
              ) : (
                <>
                  <span className="font-medium">Geri dönüş yok.</span> Bu işlem tamamlandıktan
                  sonra veriler hiçbir şekilde geri getirilemez.
                </>
              )}
            </p>
          </div>

          {teyitGerekli && (
            <div className="mt-4">
              <label className="font-govde text-xs text-ikincil">
                Onaylamak için birebir yazın:{" "}
                <span className="font-medium text-murekkep">{teyitMetni}</span>
              </label>
              <input
                autoFocus
                value={yazilan}
                onChange={(e) => setYazilan(e.target.value)}
                placeholder={teyitMetni}
                className="mt-1.5 w-full rounded-xl border border-ayrac bg-parsomen px-4 py-2.5 font-govde text-sm text-murekkep outline-none focus:border-sarap"
              />
            </div>
          )}
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-ayrac px-6 py-4 sm:flex-row sm:justify-end">
          <button
            onClick={onKapat}
            disabled={yukleniyor}
            className="rounded-full border border-ayrac px-5 py-2.5 font-govde text-sm text-ikincil transition-colors hover:bg-yuzeyKoyu disabled:opacity-50"
          >
            Vazgeç
          </button>
          <button
            onClick={onOnay}
            disabled={!onayAcik}
            className={`rounded-full px-5 py-2.5 font-govde text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${ton.buton}`}
          >
            {yukleniyor ? "İşleniyor..." : onayEtiket}
          </button>
        </div>
      </div>
    </div>
  );
}
