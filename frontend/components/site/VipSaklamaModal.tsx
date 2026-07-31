"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { TamEkranKatman } from "@/components/site/TamEkranKatman";

// VIP KALICI SAKLAMA MODALI - TEK KAYNAK.
//
// Ayni modal HEM defter kartindan (hizli duzenleme) HEM detaydan cagirilir; giris
// mantigi (dogrulama, "10 yil" onayari, "kaldir", canli onizleme) TEK yerde yasar -
// iki yerde ayrisan bir kutu olusamaz (paralel yapi yasak).
//
// SEMANTIK: OzelSaklamaGun = ozel gunden itibaren defterin TOPLAM yasam suresi (gun).
//   null  -> varsayilana don (normal 20 gun)
//   sayi  -> VIP (ornek 3650 = 10 yil)
// Backend imha anini bu alandan turetir (Sabitler.ImhaAni); kaydettikten sonra ebeveyn
// listeyi/detayi yeniler ve gercek imha tarihi backend'den okunur.
//
// GERI ALINABILIR: "Varsayilana don" tek tikla null'a ceker. Bu yuzden agir teyit
// (ad yazdirma) YOK - ama etkiyi (yeni imha tarihi) ACIKCA gosteririz.

const ON_AYAR_GUN = 3650; // 10 yil - varsayilan VIP uzatma (YOL_HARITASI Bolum 4-I)
const MIN_GUN = 16;       // davetli penceresinden (15) once imha olamaz
const MAX_GUN = 36500;    // 100 yil - "sonsuz" degil (KVKK belirli sure ister)

type Props = {
  acik: boolean;
  defterId: string;
  es1Ad: string;
  es2Ad: string;
  /** Ozel gun (ISO) - onizleme icin yeni imha tarihi bundan hesaplanir. */
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
  // Metin girisi: bos string = "varsayilan (kaldir)".
  const [metin, setMetin] = useState<string>("");
  const [hata, setHata] = useState<string>("");
  const [kaydediliyor, setKaydediliyor] = useState(false);

  // Modal her acildiginda mevcut degerden baslar (onceki oturum sizmaz).
  useEffect(() => {
    if (acik) {
      setMetin(mevcutDeger != null ? String(mevcutDeger) : "");
      setHata("");
    }
  }, [acik, mevcutDeger]);

  // Girilen degeri yorumla: bos -> null; sayi -> gun. Gecersizse null-degil hata.
  const yorum = useMemo(() => {
    const t = metin.trim();
    if (t === "") return { deger: null as number | null, gecerli: true };
    if (!/^\d+$/.test(t)) return { deger: null, gecerli: false };
    const n = parseInt(t, 10);
    if (n < MIN_GUN || n > MAX_GUN) return { deger: n, gecerli: false };
    return { deger: n, gecerli: true };
  }, [metin]);

  // Canli onizleme: yeni imha tarihi = ozel gun + (girilen deger). Bos ise varsayilan.
  const onizleme = useMemo(() => {
    const ozel = new Date(etkinlikTarihi);
    if (Number.isNaN(ozel.getTime())) return null;
    if (yorum.deger == null) return null; // bos -> varsayilan (metinle anlatilir)
    if (!yorum.gecerli) return null;
    const imha = new Date(ozel);
    imha.setDate(imha.getDate() + yorum.deger);
    return tarihMetni(imha);
  }, [etkinlikTarihi, yorum]);

  if (!acik) return null;

  const degisti = (yorum.deger ?? null) !== (mevcutDeger ?? null);

  async function kaydet() {
    if (!yorum.gecerli) {
      setHata(`Süre ${MIN_GUN}-${MAX_GUN} gün aralığında olmalı ya da boş bırakılmalı.`);
      return;
    }
    setKaydediliyor(true);
    setHata("");
    const c = await api.superSaklamaGuncelle(defterId, yorum.deger);
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
            <span className="font-medium text-murekkep">boş bırakırsanız</span> varsayılan
            saklama süresi geçerli olur. Bu ayar yalnızca sistem yöneticisi tarafından
            değiştirilir ve geri alınabilir.
          </p>

          <div>
            <label className="font-govde text-[0.66rem] uppercase tracking-etiket text-ikincil">
              Saklama süresi (gün)
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={metin}
              onChange={(e) => setMetin(e.target.value)}
              placeholder="Varsayılan (boş bırak)"
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
              Varsayılana dön (kaldır)
            </button>
          </div>

          {/* Canli onizleme - etkiyi ACIKCA gosterir */}
          <div className="rounded-xl border border-ayrac bg-parsomen px-4 py-3">
            {yorum.deger == null ? (
              <p className="font-govde text-xs text-ikincil">
                Varsayılan saklama süresine dönülecek.
              </p>
            ) : onizleme ? (
              <p className="font-govde text-xs text-ikincil">
                Yeni imha tarihi:{" "}
                <span className="font-medium text-murekkep">{onizleme}</span>
              </p>
            ) : (
              <p className="font-govde text-xs text-uyari">
                Geçersiz süre — {MIN_GUN}-{MAX_GUN} gün arasında olmalı.
              </p>
            )}
          </div>

          {hata && (
            <p className="font-govde text-xs text-sarap">{hata}</p>
          )}
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
            disabled={kaydediliyor || !degisti || !yorum.gecerli}
            className="rounded-full bg-sarap px-5 py-2 font-govde text-xs text-parsomen transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {kaydediliyor ? "Kaydediliyor..." : "Kaydet"}
          </button>
        </div>
      </div>
    </TamEkranKatman>
  );
}
