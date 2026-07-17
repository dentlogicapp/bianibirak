"use client";

import { useEffect, useState } from "react";
import {
  odemeDurumu,
  odemeMetinleri,
  odemeBaslat,
  odemeBildir,
  type OdemeDurum,
  type OdemeMetni,
  type OdemeTalimati,
} from "@/lib/api";

/* ===================== ODEME AKISI =====================
 *
 * KURAL A - ODEME ONCE, DURUSTLUK SONRA (Musa'nin kesin talimati):
 *
 *   "Indirme butonu ONCELIKLE satin alma islemi icin calisan, satin alma SONRASI
 *    ise boyut secimi vb. uyari ekranlarini gosterdikten sonra indirme
 *    gerceklestiren bir buton olarak kurgulansin. Boylelikle durustlugumuz satin
 *    alma islemlerini cekimserlige ve satis yapamamaya cevirmesin!"
 *
 * Bu dosyada HICBIR teknik uyari YOKTUR:
 *   - DPI tablosu YOK
 *   - "fotograflariniz seyrelir" YOK
 *   - "A3 onerilmez" YOK
 *
 * Cunku durustluk, satin alma SONRASI dogru kullanim rehberligidir. Oncesi supe
 * tohumudur. Odeme ekranindan once kusur anlatmak, henuz kararsiz olan cifti
 * caydirir. Ayni cumle odeme sonrasi, ona dogru secimi yaptiran bir rehberdir.
 *
 * Odeme ONCESI anlatilan tek sey: NE ALDIGI ve NE KADAR ODEDIGI.
 *
 * ADIMLAR:
 *   1. sozlesme  - On Bilgilendirme + Mesafeli Satis Sozlesmesi (hukuki zorunluluk)
 *   2. talimat   - IBAN, tutar, referans kodu (kopyala butonlariyla)
 *   3. bekleme   - "onay bekleniyor" (kapatilabilir, durum kalici)
 */

type Adim = "sozlesme" | "talimat" | "bekleme";

export default function OdemeAkisi({
  acik,
  kapat,
  odendi,
}: {
  acik: boolean;
  kapat: () => void;
  odendi: () => void; // odeme onaylandiginda ust bileseni haberdar et
}) {
  const [adim, setAdim] = useState<Adim>("sozlesme");
  const [durum, setDurum] = useState<OdemeDurum | null>(null);
  const [metinler, setMetinler] = useState<OdemeMetni[]>([]);
  const [talimat, setTalimat] = useState<OdemeTalimati | null>(null);
  const [riza, setRiza] = useState(false);
  const [acikMetin, setAcikMetin] = useState<string | null>(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [kopyalanan, setKopyalanan] = useState<string | null>(null);

  // Acilista durumu cek: bekleyen odeme varsa DOGRUDAN talimat/bekleme ekranina git.
  // Sozlesmeyi tekrar onaylatmak gereksiz surtunmedir - zaten onaylamis.
  useEffect(() => {
    if (!acik) return;
    let iptal = false;

    (async () => {
      setYukleniyor(true);
      const [d, m] = await Promise.all([odemeDurumu(), odemeMetinleri()]);
      if (iptal) return;

      setDurum(d);
      setMetinler(m);

      if (d?.odendi) {
        odendi();
        kapat();
        return;
      }

      if (d?.bekleyen) {
        setTalimat({
          referansKodu: d.bekleyen.referansKodu,
          tutar: d.bekleyen.tutar,
          paraBirimi: d.paraBirimi,
          sonGecerlilik: d.bekleyen.sonGecerlilik,
          iban: "",
          aliciAd: "",
          bankaAd: "",
        });
        // Bekleyen odeme var ama IBAN bilgisi durum ucunda gelmiyor.
        // Talimati yeniden almak icin baslat cagrilir (idempotent - ayni kodu doner).
        const y = await odemeBaslat(true);
        if (!iptal && y.ok) setTalimat(y.talimat);
        setAdim("talimat");
      } else {
        setAdim("sozlesme");
      }

      setYukleniyor(false);
    })();

    return () => {
      iptal = true;
    };
  }, [acik, kapat, odendi]);

  // Bekleme ekranindayken durumu yokla - onaylandiginda kendiliginden acilsin.
  useEffect(() => {
    if (!acik || adim !== "bekleme") return;

    const zaman = setInterval(async () => {
      const d = await odemeDurumu();
      if (d?.odendi) {
        clearInterval(zaman);
        odendi();
        kapat();
      }
    }, 15000);

    return () => clearInterval(zaman);
  }, [acik, adim, odendi, kapat]);

  if (!acik) return null;

  async function ilerle() {
    if (!riza) return;
    setGonderiliyor(true);
    setHata(null);

    const y = await odemeBaslat(true);
    setGonderiliyor(false);

    if (!y.ok) {
      setHata(y.mesaj);
      return;
    }

    setTalimat(y.talimat);
    setAdim("talimat");
  }

  async function havaleyiBildir() {
    setGonderiliyor(true);
    const y = await odemeBildir();
    setGonderiliyor(false);
    if (!y.ok) {
      setHata(y.mesaj ?? "Bildirim gönderilemedi.");
      return;
    }
    setAdim("bekleme");
  }

  async function kopyala(deger: string, etiket: string) {
    try {
      await navigator.clipboard.writeText(deger);
      setKopyalanan(etiket);
      setTimeout(() => setKopyalanan(null), 1800);
    } catch {
      /* pano yoksa sessizce gec - deger zaten ekranda gorunuyor */
    }
  }

  const paraFmt = (n: number, birim: string) =>
    `${n.toLocaleString("tr-TR", { minimumFractionDigits: 0 })} ${birim === "TRY" ? "TL" : birim}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.55)" }}
      onClick={kapat}
    >
      <div
        className="w-full max-w-lg rounded-2xl border shadow-2xl"
        style={{
          background: "var(--yuzey)",
          borderColor: "var(--hat)",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ---- BASLIK ---- */}
        <div
          className="flex items-center justify-between border-b px-5 py-4"
          style={{ borderColor: "var(--hat)" }}
        >
          <h2 className="font-serif text-lg" style={{ color: "var(--murekkep)" }}>
            {adim === "sozlesme" && "Mirasını indir"}
            {adim === "talimat" && "Havale bilgileri"}
            {adim === "bekleme" && "Ödemen kontrol ediliyor"}
          </h2>
          <button
            onClick={kapat}
            className="rounded-lg px-2 py-1 text-sm opacity-60 hover:opacity-100"
            style={{ color: "var(--ikincil)" }}
            aria-label="Kapat"
          >
            ✕
          </button>
        </div>

        {yukleniyor ? (
          <div className="px-5 py-12 text-center text-sm" style={{ color: "var(--ikincil)" }}>
            Yükleniyor...
          </div>
        ) : (
          <div className="px-5 py-5">
            {/* ============ ADIM 1: SOZLESME ============ */}
            {adim === "sozlesme" && (
              <>
                {/* NE ALIYOR - arzu, kusur degil. Teknik uyari YOK (KURAL A). */}
                <div
                  className="mb-5 rounded-xl border p-4"
                  style={{ borderColor: "var(--hat)", background: "var(--parsomen)" }}
                >
                  <p
                    className="mb-3 font-serif text-base"
                    style={{ color: "var(--murekkep)" }}
                  >
                    Baskıya hazır anı defteri
                  </p>
                  <ul
                    className="space-y-1.5 text-sm"
                    style={{ color: "var(--ikincil)" }}
                  >
                    <li>· Yüksek çözünürlüklü, matbaaya hazır PDF</li>
                    <li>· İstediğin boyutta — A5, A4 veya A3</li>
                    <li>· Cilt paylı, gömülü tipografi</li>
                    <li>· Sınırsız indirme, defterin dolduğu sürece</li>
                  </ul>

                  <div
                    className="mt-4 flex items-baseline justify-between border-t pt-3"
                    style={{ borderColor: "var(--hat)" }}
                  >
                    <span className="text-sm" style={{ color: "var(--ikincil)" }}>
                      Bir kereye mahsus
                    </span>
                    <span
                      className="font-serif text-2xl"
                      style={{ color: "var(--sarap)" }}
                    >
                      {durum ? paraFmt(durum.tutar, durum.paraBirimi) : "—"}
                    </span>
                  </div>
                </div>

                {/* HUKUKI ONAY - 6502 + Mesafeli Sozlesmeler Yonetmeligi */}
                <div className="mb-4 space-y-2">
                  {metinler.map((m) => (
                    <button
                      key={m.anahtar}
                      onClick={() =>
                        setAcikMetin(acikMetin === m.anahtar ? null : m.anahtar)
                      }
                      className="flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition"
                      style={{
                        borderColor: "var(--hat)",
                        color: "var(--murekkep)",
                        background:
                          acikMetin === m.anahtar ? "var(--parsomen)" : "transparent",
                      }}
                    >
                      <span>{m.baslik}</span>
                      <span style={{ color: "var(--ikincil)" }}>
                        {acikMetin === m.anahtar ? "−" : "+"}
                      </span>
                    </button>
                  ))}

                  {acikMetin && (
                    <div
                      className="max-h-56 overflow-y-auto rounded-lg border p-3 text-xs leading-relaxed whitespace-pre-wrap"
                      style={{
                        borderColor: "var(--hat)",
                        background: "var(--parsomen)",
                        color: "var(--ikincil)",
                      }}
                    >
                      {metinler.find((m) => m.anahtar === acikMetin)?.icerik}
                    </div>
                  )}
                </div>

                <label
                  className="mb-4 flex cursor-pointer items-start gap-2.5 text-sm"
                  style={{ color: "var(--murekkep)" }}
                >
                  <input
                    type="checkbox"
                    checked={riza}
                    onChange={(e) => setRiza(e.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer"
                    style={{ accentColor: "var(--sarap)" }}
                  />
                  <span>
                    Ön Bilgilendirme Formu&apos;nu ve Mesafeli Satış
                    Sözleşmesi&apos;ni okudum, onaylıyorum.
                  </span>
                </label>

                {hata && (
                  <p className="mb-3 text-sm" style={{ color: "var(--sarap)" }}>
                    {hata}
                  </p>
                )}

                <button
                  onClick={ilerle}
                  disabled={!riza || gonderiliyor}
                  className="w-full rounded-xl px-4 py-3 font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-40"
                  style={{ background: "var(--sarap)" }}
                >
                  {gonderiliyor ? "Hazırlanıyor..." : "Ödemeye geç"}
                </button>
              </>
            )}

            {/* ============ ADIM 2: HAVALE TALIMATI ============ */}
            {adim === "talimat" && talimat && (
              <>
                <p className="mb-4 text-sm" style={{ color: "var(--ikincil)" }}>
                  Aşağıdaki bilgilerle havale/EFT yap. Ödemen onaylandığında bildirim
                  göndereceğiz.
                </p>

                <div className="space-y-2.5">
                  <Satir
                    etiket="Alıcı"
                    deger={talimat.aliciAd}
                    kopyala={kopyala}
                    kopyalanan={kopyalanan}
                  />
                  <Satir
                    etiket="IBAN"
                    deger={talimat.iban}
                    mono
                    kopyala={kopyala}
                    kopyalanan={kopyalanan}
                  />
                  {talimat.bankaAd && (
                    <Satir
                      etiket="Banka"
                      deger={talimat.bankaAd}
                      kopyala={kopyala}
                      kopyalanan={kopyalanan}
                    />
                  )}
                  <Satir
                    etiket="Tutar"
                    deger={paraFmt(talimat.tutar, talimat.paraBirimi)}
                    kopyala={kopyala}
                    kopyalanan={kopyalanan}
                  />
                </div>

                {/*
                  REFERANS KODU - bu kutunun vurgusu ABARTILI DEGIL, ZORUNLU.

                  Kod yazilmayan havale eslesmez. Eslesmezse cift bekler, panige kapilir,
                  bize yazar - ve biz banka ekstresinde 12 tane "500 TL" gorup hangisinin
                  kim oldugunu bilemeyiz.

                  Bu yuzden: en buyuk punto, en yuksek kontrast, ayri kutu.
                */}
                <div
                  className="mt-4 rounded-xl border-2 p-4"
                  style={{
                    borderColor: "var(--sarap)",
                    background: "var(--parsomen)",
                  }}
                >
                  <p
                    className="mb-2 text-xs font-semibold uppercase tracking-wide"
                    style={{ color: "var(--sarap)" }}
                  >
                    Açıklama kısmına mutlaka yaz
                  </p>

                  <div className="flex items-center gap-2">
                    <code
                      className="flex-1 rounded-lg border px-3 py-2.5 text-center font-mono text-xl tracking-widest"
                      style={{
                        borderColor: "var(--hat)",
                        background: "var(--yuzey)",
                        color: "var(--murekkep)",
                      }}
                    >
                      {talimat.referansKodu}
                    </code>
                    <button
                      onClick={() => kopyala(talimat.referansKodu, "kod")}
                      className="shrink-0 rounded-lg border px-3 py-2.5 text-sm transition"
                      style={{
                        borderColor: "var(--hat)",
                        color: "var(--murekkep)",
                        background: "var(--yuzey)",
                      }}
                    >
                      {kopyalanan === "kod" ? "✓" : "Kopyala"}
                    </button>
                  </div>

                  <p className="mt-2 text-xs" style={{ color: "var(--ikincil)" }}>
                    Bu kod olmadan ödemeni eşleştiremeyiz.
                  </p>
                </div>

                {hata && (
                  <p className="mt-3 text-sm" style={{ color: "var(--sarap)" }}>
                    {hata}
                  </p>
                )}

                <button
                  onClick={havaleyiBildir}
                  disabled={gonderiliyor}
                  className="mt-5 w-full rounded-xl px-4 py-3 font-medium text-white transition disabled:opacity-50"
                  style={{ background: "var(--sarap)" }}
                >
                  {gonderiliyor ? "Gönderiliyor..." : "Havalemi yaptım"}
                </button>

                <p
                  className="mt-3 text-center text-xs"
                  style={{ color: "var(--ikincil)" }}
                >
                  Bu ekranı kapatabilirsin — bilgilerin kayıtlı.
                </p>
              </>
            )}

            {/* ============ ADIM 3: BEKLEME ============ */}
            {adim === "bekleme" && (
              <div className="py-6 text-center">
                <div
                  className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full"
                  style={{ background: "var(--parsomen)" }}
                >
                  <span className="text-2xl">⏳</span>
                </div>

                <p
                  className="mb-2 font-serif text-lg"
                  style={{ color: "var(--murekkep)" }}
                >
                  Ödemen kontrol ediliyor
                </p>

                <p
                  className="mx-auto mb-5 max-w-sm text-sm leading-relaxed"
                  style={{ color: "var(--ikincil)" }}
                >
                  Havaleni aldığımızda ödemen onaylanacak ve defterin indirmeye
                  hazır olacak. Sana bildirim göndereceğiz — bu ekranı açık tutmana
                  gerek yok.
                </p>

                {talimat && (
                  <p
                    className="mb-5 font-mono text-sm"
                    style={{ color: "var(--ikincil)" }}
                  >
                    {talimat.referansKodu}
                  </p>
                )}

                <button
                  onClick={kapat}
                  className="rounded-xl border px-5 py-2.5 text-sm transition"
                  style={{ borderColor: "var(--hat)", color: "var(--murekkep)" }}
                >
                  Tamam
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* Kopyalanabilir bilgi satiri - havale ekraninda her deger tek tikla panoya gider.
   Elle yazim = hata = eslesmeyen odeme. */
function Satir({
  etiket,
  deger,
  mono,
  kopyala,
  kopyalanan,
}: {
  etiket: string;
  deger: string;
  mono?: boolean;
  kopyala: (d: string, e: string) => void;
  kopyalanan: string | null;
}) {
  return (
    <div
      className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5"
      style={{ borderColor: "var(--hat)", background: "var(--parsomen)" }}
    >
      <div className="min-w-0 flex-1">
        <p className="text-xs" style={{ color: "var(--ikincil)" }}>
          {etiket}
        </p>
        <p
          className={`truncate text-sm ${mono ? "font-mono" : ""}`}
          style={{ color: "var(--murekkep)" }}
        >
          {deger || "—"}
        </p>
      </div>
      <button
        onClick={() => kopyala(deger, etiket)}
        className="shrink-0 rounded-md px-2 py-1 text-xs transition"
        style={{ color: "var(--ikincil)" }}
        aria-label={`${etiket} kopyala`}
      >
        {kopyalanan === etiket ? "✓" : "Kopyala"}
      </button>
    </div>
  );
}
