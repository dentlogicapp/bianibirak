"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  superOdemeler,
  superOdemeOnayla,
  superOdemeReddet,
  superOdemeAyarGetir,
  superOdemeAyarKaydet,
  type SuperOdeme,
  type SuperOdemeListesi,
  type OdemeAyar,
} from "@/lib/api";

/* ODEMELER SEKMESI - havalenin insan tarafi.
 *
 * Bu ekranin isi tek bir seyi mumkun kilmak: bankada "BAB-K7M9X" aciklamali havaleyi
 * gordun, buraya gel, [Onayla]'ya bas. Ciftin mirasinin kilidi acilir.
 *
 * Otomasyon YOK - ve bilincli olarak yok. Eksik tutar, esin adindan gelen havale,
 * aciklamasi bos gonderi... hepsi insan yargisi ister. Havalenin gercek maliyeti bu:
 * her satis senin gozunu gerektirir. Dogrulama asamasi icin kabul edilebilir;
 * buyumede degil (o zaman iyzico/IAP devreye girer - ayni Odeme kaydini webhook
 * onaylar, bu ekran yalnizca izleme ekrani olur).
 */

export default function OdemelerSekmesi() {
  const [veri, setVeri] = useState<SuperOdemeListesi | null>(null);
  const [ayar, setAyar] = useState<OdemeAyar | null>(null);
  const [ayarAcik, setAyarAcik] = useState(false);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [islemdeki, setIslemdeki] = useState<string | null>(null);
  const [filtre, setFiltre] = useState<"bekliyor" | "onaylandi" | "diger">("bekliyor");

  const cek = useCallback(async () => {
    const [l, a] = await Promise.all([superOdemeler(), superOdemeAyarGetir()]);
    setVeri(l);
    setAyar(a);
    setYukleniyor(false);
  }, []);

  useEffect(() => {
    void cek();
  }, [cek]);

  async function onayla(o: SuperOdeme) {
    // Onay GERI ALINAMAZ (onayli odeme reddedilemez - backend 409 doner).
    // Bu yuzden tek bir onay adimi koyuyoruz: yanlis tikla birinin defteri
    // bedavaya acilmasin.
    if (
      !confirm(
        `${o.defterAd}\n${o.referansKodu} - ${o.tutar} ${o.paraBirimi}\n\nBu ödemeyi onaylıyor musun? Geri alınamaz.`
      )
    )
      return;

    setIslemdeki(o.id);
    const c = await superOdemeOnayla(o.id);
    setIslemdeki(null);

    if (!c.ok) {
      toast.error(c.mesaj ?? "Onaylanamadı.");
      return;
    }
    toast.success("Ödeme onaylandı, çifte bildirim gitti.");
    void cek();
  }

  async function reddet(o: SuperOdeme) {
    const not = prompt(
      `${o.defterAd} - ${o.referansKodu}\n\nRed nedeni (isteğe bağlı, çift görmez):`
    );
    if (not === null) return; // iptal

    setIslemdeki(o.id);
    const c = await superOdemeReddet(o.id, not || undefined);
    setIslemdeki(null);

    if (!c.ok) {
      toast.error(c.mesaj ?? "Reddedilemedi.");
      return;
    }
    toast.success("Ödeme reddedildi.");
    void cek();
  }

  if (yukleniyor) {
    return (
      <p className="py-10 text-center font-govde text-sm text-ikincil">Yükleniyor...</p>
    );
  }

  if (!veri) {
    return (
      <p className="py-10 text-center font-govde text-sm text-ikincil">
        Ödeme verisi alınamadı.
      </p>
    );
  }

  const gosterilen = veri.odemeler.filter((o) => {
    if (filtre === "bekliyor") return o.durum === "bekliyor" && !o.suresiGecti;
    if (filtre === "onaylandi") return o.durum === "onaylandi";
    return o.durum === "reddedildi" || o.durum === "suresi_doldu" || o.suresiGecti;
  });

  return (
    <div className="space-y-5">
      {/* SISTEM DURUMU - en ustte, cunku her seyi belirler.
          Kapaliysa: paywall YOK, herkes bedavaya indiriyor. Bunu bilmeden
          "neden odeme gelmiyor?" diye saatlerce arayabilirsin. */}
      <div
        className={`rounded-2xl border p-4 ${
          veri.sistemAktif
            ? "border-yaldiz/40 bg-parsomen/60"
            : "border-sarap/40 bg-sarap/5"
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-govde text-sm font-medium text-murekkep">
              {veri.sistemAktif ? "Ödeme sistemi AÇIK" : "Ödeme sistemi KAPALI"}
            </p>
            <p className="metin-yasli font-govde text-xs text-ikincil">
              {veri.sistemAktif
                ? `Baskıya hazır indirme ücretli - ${ayar?.tutar ?? 0} ${ayar?.paraBirimi === "TRY" ? "TL" : ""}`
                : "Paywall devre dışı - herkes ücretsiz indiriyor"}
            </p>
          </div>
          <button
            onClick={() => setAyarAcik(!ayarAcik)}
            className="shrink-0 rounded-full border border-ayrac px-4 py-2 font-govde text-xs text-murekkep transition-colors hover:bg-parsomen"
          >
            {ayarAcik ? "Kapat" : "Ayarlar"}
          </button>
        </div>

        {ayarAcik && ayar && (
          <AyarFormu
            ayar={ayar}
            kaydedildi={() => {
              setAyarAcik(false);
              void cek();
            }}
          />
        )}
      </div>

      {/* OZET */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kutu etiket="Bekleyen" deger={veri.ozet.bekleyen} vurgu={veri.ozet.bekleyen > 0} />
        <Kutu etiket="Onaylanan" deger={veri.ozet.onaylanan} />
        <Kutu etiket="Reddedilen" deger={veri.ozet.reddedilen} />
        <Kutu
          etiket="Toplam tahsilat"
          deger={`${veri.ozet.toplamTahsilat.toLocaleString("tr-TR")} TL`}
        />
      </div>

      {/* FILTRE */}
      <div className="flex min-w-0 gap-1 overflow-x-auto rounded-full border border-ayrac bg-yuzey p-1">
        {(
          [
            ["bekliyor", "Bekleyen"],
            ["onaylandi", "Onaylanan"],
            ["diger", "Reddedilen / Süresi dolan"],
          ] as const
        ).map(([kod, etiket]) => (
          <button
            key={kod}
            onClick={() => setFiltre(kod)}
            className={`shrink-0 rounded-full px-4 py-2 font-govde text-sm transition-colors ${
              filtre === kod
                ? "bg-sarap text-parsomen"
                : "text-ikincil hover:text-murekkep"
            }`}
          >
            {etiket}
          </button>
        ))}
      </div>

      {/* LISTE */}
      {gosterilen.length === 0 ? (
        <p className="py-10 text-center font-govde text-sm text-ikincil">
          {filtre === "bekliyor"
            ? "Bekleyen ödeme yok."
            : "Bu listede kayıt yok."}
        </p>
      ) : (
        <div className="space-y-3">
          {gosterilen.map((o) => (
            <OdemeKarti
              key={o.id}
              odeme={o}
              islemde={islemdeki === o.id}
              onayla={() => void onayla(o)}
              reddet={() => void reddet(o)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function Kutu({
  etiket,
  deger,
  vurgu,
}: {
  etiket: string;
  deger: number | string;
  vurgu?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-3 ${
        vurgu ? "border-sarap/50 bg-sarap/5" : "border-ayrac bg-yuzey"
      }`}
    >
      <p className="font-govde text-xs text-ikincil">{etiket}</p>
      <p
        className={`font-serif text-xl ${vurgu ? "text-sarap" : "text-murekkep"}`}
      >
        {deger}
      </p>
    </div>
  );
}

function OdemeKarti({
  odeme,
  islemde,
  onayla,
  reddet,
}: {
  odeme: SuperOdeme;
  islemde: boolean;
  onayla: () => void;
  reddet: () => void;
}) {
  const bekliyor = odeme.durum === "bekliyor" && !odeme.suresiGecti;

  const rozet =
    odeme.durum === "onaylandi"
      ? { metin: "Onaylandı", sinif: "bg-yaldiz/20 text-murekkep" }
      : odeme.durum === "reddedildi"
        ? { metin: "Reddedildi", sinif: "bg-sarap/15 text-sarap" }
        : odeme.suresiGecti || odeme.durum === "suresi_doldu"
          ? { metin: "Süresi doldu", sinif: "bg-ikincil/15 text-ikincil" }
          : { metin: "Bekliyor", sinif: "bg-sarap/15 text-sarap" };

  const tarih = new Date(odeme.createdAt).toLocaleString("tr-TR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="rounded-2xl border border-ayrac bg-yuzey p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-govde text-sm font-medium text-murekkep">
              {odeme.defterAd}
            </p>
            <span
              className={`rounded-full px-2 py-0.5 font-govde text-[0.65rem] ${rozet.sinif}`}
            >
              {rozet.metin}
            </span>
          </div>

          <p className="metin-yasli mt-1 font-govde text-xs text-ikincil">
            {odeme.odeyenAd ?? "—"}
            {odeme.odeyenEmail ? ` · ${odeme.odeyenEmail}` : ""}
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-3">
            {/* REFERANS KODU - banka ekstresinde arayacagin sey. En gorunur oge. */}
            <code className="rounded-lg border border-ayrac bg-parsomen px-2.5 py-1 font-mono text-sm tracking-wide text-murekkep">
              {odeme.referansKodu}
            </code>
            <span className="font-serif text-lg text-sarap">
              {odeme.tutar.toLocaleString("tr-TR")}{" "}
              {odeme.paraBirimi === "TRY" ? "TL" : odeme.paraBirimi}
            </span>
            <span className="font-govde text-xs text-ikincil">{tarih}</span>
          </div>

          {odeme.not && (
            <p className="metin-yasli mt-2 rounded-lg bg-parsomen/60 px-2.5 py-1.5 font-govde text-xs text-ikincil">
              Not: {odeme.not}
            </p>
          )}
        </div>

        {bekliyor && (
          <div className="flex shrink-0 gap-2">
            <button
              onClick={onayla}
              disabled={islemde}
              className="rounded-full bg-sarap px-4 py-2 font-govde text-xs text-parsomen transition-colors hover:bg-sarapKoyu disabled:opacity-50"
            >
              {islemde ? "..." : "Onayla"}
            </button>
            <button
              onClick={reddet}
              disabled={islemde}
              className="rounded-full border border-ayrac px-4 py-2 font-govde text-xs text-ikincil transition-colors hover:text-murekkep disabled:opacity-50"
            >
              Reddet
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* AYAR FORMU - IBAN, alici, banka, fiyat, gecerlilik, acik/kapali.
 *
 * HARDCODED DEGER YASAK: bunlarin hicbiri kodda yazmaz. Banka degistirirsen deploy
 * gerekmez; fiyat degistirirsen deploy gerekmez.
 */
function AyarFormu({
  ayar,
  kaydedildi,
}: {
  ayar: OdemeAyar;
  kaydedildi: () => void;
}) {
  const [iban, setIban] = useState(ayar.iban);
  const [aliciAd, setAliciAd] = useState(ayar.aliciAd);
  const [bankaAd, setBankaAd] = useState(ayar.bankaAd);
  const [tutar, setTutar] = useState(String(ayar.tutar));
  const [gecerlilikGun, setGecerlilikGun] = useState(String(ayar.gecerlilikGun));
  const [aktif, setAktif] = useState(ayar.aktif);
  const [kaydediliyor, setKaydediliyor] = useState(false);

  async function kaydet() {
    setKaydediliyor(true);
    const c = await superOdemeAyarKaydet({
      iban: iban.trim(),
      aliciAd: aliciAd.trim(),
      bankaAd: bankaAd.trim(),
      tutar: Number(tutar) || 0,
      gecerlilikGun: Number(gecerlilikGun) || 7,
      aktif,
    });
    setKaydediliyor(false);

    if (!c.ok) {
      toast.error(c.mesaj ?? "Kaydedilemedi.");
      return;
    }
    toast.success("Ödeme ayarları kaydedildi.");
    kaydedildi();
  }

  return (
    <div className="mt-4 space-y-3 border-t border-ayrac pt-4">
      <Alan etiket="IBAN" deger={iban} yaz={setIban} yerTutucu="TR00 0000 0000 0000 0000 0000 00" />
      <Alan etiket="Alıcı adı" deger={aliciAd} yaz={setAliciAd} />
      <Alan etiket="Banka" deger={bankaAd} yaz={setBankaAd} yerTutucu="Ziraat Bankası" />

      <div className="grid grid-cols-2 gap-3">
        <Alan etiket="Fiyat (TL)" deger={tutar} yaz={setTutar} tip="number" />
        <Alan
          etiket="Geçerlilik (gün)"
          deger={gecerlilikGun}
          yaz={setGecerlilikGun}
          tip="number"
        />
      </div>

      {/* ACIK/KAPALI - acil durum kolu.
          Kapatirsan paywall aninda kalkar ve tum ciftler ucretsiz indirir.
          Odeme altyapisinda bir sorun cikarsa (yanlis IBAN, banka arizasi) defterin
          37 gunluk omru tamir icin bekleyemez - miras imha olur. */}
      <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-ayrac bg-parsomen/40 p-3">
        <input
          type="checkbox"
          checked={aktif}
          onChange={(e) => setAktif(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-sarap"
        />
        <span className="min-w-0">
          <span className="block font-govde text-sm text-murekkep">
            Ödeme sistemi açık
          </span>
          <span className="metin-yasli block font-govde text-xs text-ikincil">
            Kapatırsan paywall kalkar - herkes baskıya hazır defterini ücretsiz
            indirir. Acil durum kolu.
          </span>
        </span>
      </label>

      <button
        onClick={() => void kaydet()}
        disabled={kaydediliyor}
        className="w-full rounded-xl bg-sarap px-4 py-2.5 font-govde text-sm text-parsomen transition-colors hover:bg-sarapKoyu disabled:opacity-50"
      >
        {kaydediliyor ? "Kaydediliyor..." : "Kaydet"}
      </button>
    </div>
  );
}

function Alan({
  etiket,
  deger,
  yaz,
  yerTutucu,
  tip = "text",
}: {
  etiket: string;
  deger: string;
  yaz: (v: string) => void;
  yerTutucu?: string;
  tip?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block font-govde text-xs text-ikincil">{etiket}</span>
      <input
        type={tip}
        value={deger}
        onChange={(e) => yaz(e.target.value)}
        placeholder={yerTutucu}
        className="w-full rounded-xl border border-ayrac bg-yuzey px-3 py-2 font-govde text-sm text-murekkep outline-none focus:border-sarap"
      />
    </label>
  );
}
