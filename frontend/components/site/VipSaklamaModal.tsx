"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { TamEkranKatman } from "@/components/site/TamEkranKatman";

// VIP KALICI SAKLAMA MODALI - TEK KAYNAK.
//
// Ayni modal HEM defter kartindan (hizli duzenleme) HEM detaydan cagirilir; giris
// mantigi (dogrulama, "10 yil" onayari, canli onizleme) TEK yerde yasar.
//
// SEMANTIK: OzelSaklamaGun = ozel gunden itibaren defterin TOPLAM yasam suresi (gun).
//   null  -> varsayilana don (VARSAYILAN_GUN)
//   sayi  -> VIP (ornek 3650 = 10 yil)
//
// ============ VERI-KAYBI KILIDI (CANLIDA OGRENILDI) ============
// VIP yalnizca UZATIR, ASLA kisaltmaz veya imha etmez. Iki kural birlikte:
//   1. Deger en az VARSAYILAN_GUN (20). Daha kucuk = kisaltma = YASAK.
//   2. Olusan imha ani GELECEKTE olmali. Ozel gun GECMISTE olan bir defterde,
//      kucuk bir deger (hatta "varsayilana don") imha anini bugune/gecmise ceker;
//      bir sonraki imha gorevi defteri ANINDA ve sessizce yok eder. Bir kez tam
//      boyle oldu (12 Tem + 16 = 28 Tem, gecmis). Artik onizleme bunu KIRMIZI
//      gosterir ve Kaydet KILITLENIR - tehlikeli deger hic gonderilemez.
// Bir defteri gercekten yok etmek "Cope at -> kalici sil" akisidir (teyitli).

const VARSAYILAN_GUN = 20;   // Sabitler.ToplamGun - VIP bunun ALTINA inemez
const ON_AYAR_GUN = 3650;    // 10 yil - varsayilan VIP uzatma
const MAX_GUN = 36500;       // 100 yil - "sonsuz" degil (KVKK belirli sure ister)

type Props = {
  acik: boolean;
  defterId: string;
  es1Ad: string;
  es2Ad: string;
  /** Ozel gun (ISO) - imha onizlemesi bundan hesaplanir. */
  etkinlikTarihi: string;
  /** Mevcut OzelSaklamaGun (null = varsayilan). */
  mevcutDeger: number | null;
  onKapat: () => void;
  /** Basarili kayittan sonra yeni deger ile cagirilir (ebeveyn yeniler). */
  onKaydedildi: (yeniDeger: number | null) => void;
};

function tarihMetni(d: Date): string {
  return d.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
}

export function VipSaklamaModal({
  acik,
  defterId,
  es1Ad,
  es2Ad,
  etkinlikTarihi,
  mevcutDeger,
  onKapat,
  onKaydedildi,
}: Props) {
  const [metin, setMetin] = useState<string>("");
  const [hata, setHata] = useState<string>("");
  const [kaydediliyor, setKaydediliyor] = useState(false);

  useEffect(() => {
    if (acik) {
      setMetin(mevcutDeger != null ? String(mevcutDeger) : "");
      setHata("");
    }
  }, [acik, mevcutDeger]);

  // TEK DEGERLENDIRME: bicim + veri-kaybi kilidi birlikte.
  const durum = useMemo(() => {
    const t = metin.trim();

    // deger: bos -> null; sayi -> parse. Bicim ve aralik (>= VARSAYILAN_GUN).
    let deger: number | null = null;
    let bicimGecerli = true;
    if (t !== "") {
      if (!/^\d+$/.test(t)) {
        bicimGecerli = false;
      } else {
        deger = parseInt(t, 10);
        if (deger < VARSAYILAN_GUN || deger > MAX_GUN) bicimGecerli = false;
      }
    }

    // Etkin gun (deger ?? varsayilan) ve olusan imha ani. null (kaldir) da varsayilan
    // uzerinden imha uretir - gecmis tarihli defterde bu da tehlikeli olabilir.
    const etkinGun = deger ?? VARSAYILAN_GUN;
    const ozel = new Date(etkinlikTarihi);
    const ozelGecerli = !Number.isNaN(ozel.getTime());

    let imha: Date | null = null;
    let imhaGelecekte = true;
    if (ozelGecerli) {
      imha = new Date(ozel);
      imha.setDate(imha.getDate() + etkinGun);
      imhaGelecekte = imha.getTime() > Date.now();
    }

    const gecerli = bicimGecerli && imhaGelecekte;
    return { deger, bicimGecerli, imha, imhaGelecekte, gecerli };
  }, [metin, etkinlikTarihi]);

  if (!acik) return null;

  const degisti = (durum.deger ?? null) !== (mevcutDeger ?? null);

  async function kaydet() {
    if (!durum.gecerli) return;
    setKaydediliyor(true);
    setHata("");
    const c = await api.superSaklamaGuncelle(defterId, durum.deger);
    setKaydediliyor(false);
    if (!c.ok) {
      setHata(c.mesaj);
      return;
    }
    onKaydedildi(c.veri.ozel_saklama_gun);
    onKapat();
  }

  return (
    <TamEkranKatman acik={acik} onKapat={onKapat} etiket="Kalıcı saklama süresi">
      <div
        className="mx-auto w-full max-w-md overflow-hidden rounded-3xl border border-ayrac bg-yuzey shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="border-b border-yaldiz/40 bg-yaldiz/10 px-6 py-4">
          <p className="font-govde text-[0.62rem] uppercase tracking-etiket text-yaldiz">
            VIP · Kalıcı saklama
          </p>
          <h2 className="mt-0.5 font-display text-xl text-murekkep">
            {es1Ad} &amp; {es2Ad}
          </h2>
        </div>

        <div className="space-y-4 px-6 py-5">
          <p className="font-govde text-xs leading-relaxed text-ikincil">
            Bu defter, özel gününden itibaren aşağıdaki gün sayısı kadar saklanır; süre
            sonunda içeriği kalıcı olarak imha edilir. Alanı{" "}
            <span className="font-medium text-murekkep">boş bırakırsanız</span> varsayılan{" "}
            {VARSAYILAN_GUN} gün geçerli olur. VIP yalnızca <span className="font-medium text-murekkep">uzatır</span>;
            defteri asla erkene çekmez veya imha etmez.
          </p>

          <div>
            <label className="font-govde text-[0.66rem] uppercase tracking-etiket text-ikincil">
              Saklama süresi (gün) · en az {VARSAYILAN_GUN}
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={metin}
              onChange={(e) => setMetin(e.target.value)}
              placeholder={`Varsayılan (${VARSAYILAN_GUN} gün) için boş bırak`}
              className="mt-1.5 w-full rounded-xl border border-ayrac bg-parsomen px-4 py-3 font-govde text-sm tabular-nums text-murekkep outline-none focus:border-sarap"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setMetin(String(ON_AYAR_GUN))}
              className="rounded-full border border-ayrac px-3 py-1.5 font-govde text-xs text-ikincil transition-colors hover:border-sarap hover:text-sarap"
            >
              10 yıl ({ON_AYAR_GUN.toLocaleString("tr-TR")} gün)
            </button>
            <button
              type="button"
              onClick={() => setMetin("")}
              className="rounded-full border border-ayrac px-3 py-1.5 font-govde text-xs text-ikincil transition-colors hover:border-sarap hover:text-sarap"
            >
              Varsayılana dön ({VARSAYILAN_GUN} gün)
            </button>
          </div>

          {/* Canli onizleme - etkiyi ACIKCA gosterir; tehlike KIRMIZI */}
          <div
            className={`rounded-xl border px-4 py-3 ${
              !durum.gecerli
                ? "border-sarap/50 bg-sarap/10"
                : "border-ayrac bg-parsomen"
            }`}
          >
            {!durum.bicimGecerli ? (
              <p className="font-govde text-xs text-sarap">
                Geçersiz süre — en az {VARSAYILAN_GUN}, en fazla {MAX_GUN.toLocaleString("tr-TR")} gün olmalı.
                VIP kısaltamaz.
              </p>
            ) : !durum.imhaGelecekte ? (
              <p className="font-govde text-xs text-sarap">
                Bu süre defteri <span className="font-semibold">hemen imhaya sokar</span> (imha tarihi
                geçmişte/bugün kalıyor). Bu defterin özel günü geçtiği için, korumak istiyorsanız imha
                tarihini geleceğe taşıyan daha uzun bir süre girin.
              </p>
            ) : durum.imha ? (
              <p className="font-govde text-xs text-ikincil">
                Yeni imha tarihi:{" "}
                <span className="font-medium text-murekkep">{tarihMetni(durum.imha)}</span>
                {durum.deger == null && (
                  <span className="text-ikincil"> · varsayılan {VARSAYILAN_GUN} gün</span>
                )}
              </p>
            ) : (
              <p className="font-govde text-xs text-ikincil">Özel gün tarihi okunamadı.</p>
            )}
          </div>

          {hata && <p className="font-govde text-xs text-sarap">{hata}</p>}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-ayrac px-6 py-4">
          <button
            type="button"
            onClick={onKapat}
            disabled={kaydediliyor}
            className="rounded-full border border-ayrac px-4 py-2 font-govde text-xs text-ikincil transition-colors hover:border-murekkep hover:text-murekkep disabled:opacity-40"
          >
            Vazgeç
          </button>
          <button
            type="button"
            onClick={kaydet}
            disabled={kaydediliyor || !degisti || !durum.gecerli}
            className="rounded-full bg-sarap px-5 py-2 font-govde text-xs text-parsomen transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {kaydediliyor ? "Kaydediliyor..." : "Kaydet"}
          </button>
        </div>
      </div>
    </TamEkranKatman>
  );
}
