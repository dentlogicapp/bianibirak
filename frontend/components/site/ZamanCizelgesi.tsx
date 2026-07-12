"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Etkinlik } from "@/lib/api";

// SUREC ZAMAN CIZELGESI - "kimse magdur olmasin" ekrani.
//
// ONCEKI SURUMUN HATASI:
// Frontend tarihleri KENDI hesapliyordu ("kapanis + 7 + 10 gun"), backend baska
// soyluyordu ("kapanis + 37"). Cizelge kullaniciya YALAN tarih gosteriyordu. Bir
// SURE urununde bu, ozurle gecistirilecek bir hata degil - urunun temel vaadinin
// cokusudur. Kullanici gordugu tarihe gore plan yapar; yanlissa mirasini kaybeder.
//
// Simdi TEK KANON: tarihler backend'den GELIR (etkinlik.imha_tarihi). Bu bilesen
// hicbir sey hesaplamaz, yalniz GOSTERIR.
//
// TASARIM DURUSU:
// Silme adimlari yumusatilmaz. "Veri indirilir; 10 gun sonra kalici silinir" gibi
// pasif, sakin bir cumle - kullanicinin gozunden kayar. Oysa bu, urunun EN KRITIK
// bilgisidir. Hareketli uyari (nabiz atan nokta) ve renk (sarap) bilincli olarak
// DIKKAT CEKER. Rahatsiz edici olmasi, mirasin kaybindan iyidir.
export function ZamanCizelgesi({ etkinlik }: { etkinlik: Etkinlik }) {
  const bolumRef = useRef<HTMLElement>(null);
  const [vurgu, setVurgu] = useState(false);

  // Hosgeldin bildiriminden "?odak=cizelge" ile gelinir: scroll + highlight.
  // Dilek bildiriminde kanitlanmis desen - kullanici tam olarak NEREYE bakmasi
  // gerektigini gorur.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const p = new URLSearchParams(window.location.search);
    if (p.get("odak") !== "cizelge") return;

    const z = setTimeout(() => {
      bolumRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      setVurgu(true);
      setTimeout(() => setVurgu(false), 2600);
    }, 350);
    return () => clearTimeout(z);
  }, []);

  const adimlar = useMemo(() => kur(etkinlik), [etkinlik]);
  const simdi = Date.now();

  return (
    <section
      ref={bolumRef}
      id="cizelge"
      className={`mt-6 rounded-3xl border bg-yuzey p-6 transition-all duration-700 sm:p-8 ${
        vurgu
          ? "border-yaldiz shadow-[0_0_0_4px_rgba(168,130,60,0.18)]"
          : "border-ayrac"
      }`}
    >
      <h2 className="font-display text-lg text-murekkep">Süreç zaman çizelgesi</h2>
      <p className="metin-yasli mt-2 font-govde text-sm leading-relaxed text-ikincil">
        Bu takvim <span className="font-medium text-murekkep">her defterde aynıdır</span> ve
        değiştirilemez: özel gününüzden {etkinlik.toplama_gun} gün sonra toplama kapanır,{" "}
        {etkinlik.toplam_gun}. günün sonunda her şey silinir. Defterinizi{" "}
        <span className="font-medium text-murekkep">baştan sona düzenleyebilirsiniz</span> —
        kapanan tek şey davetli girişidir.
      </p>

      <ol className="mt-6">
        {adimlar.map((a, i) => {
          const gecti = simdi > a.zaman.getTime();
          const sonAdim = i === adimlar.length - 1;
          const kritik = a.tip === "uyari" || a.tip === "imha";
          const aktif = !gecti && (i === 0 || simdi > adimlar[i - 1].zaman.getTime());

          return (
            <li key={a.baslik} className="flex gap-4">
              {/* Zaman ekseni */}
              <div className="flex flex-col items-center">
                <span className="relative flex h-3.5 w-3.5 items-center justify-center">
                  {/* HAREKETLI UYARI: kritik adimlar nabiz atar. Sakin bir nokta,
                      kullanicinin gozunden kayar - bu bilgi kaymamali. */}
                  {kritik && !gecti && (
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sarap opacity-60" />
                  )}
                  <span
                    className={`relative inline-flex h-3 w-3 rounded-full ${
                      a.tip === "imha"
                        ? "bg-sarap ring-2 ring-sarap/30"
                        : a.tip === "uyari"
                          ? "bg-sarap"
                          : gecti
                            ? "bg-yaldiz"
                            : "bg-ikincil/40"
                    }`}
                  />
                </span>
                {!sonAdim && (
                  <span
                    className={`mt-1 h-full w-px flex-1 ${
                      gecti ? "bg-yaldiz/40" : "bg-ayrac"
                    }`}
                  />
                )}
              </div>

              {/* Icerik */}
              <div className={`pb-5 ${sonAdim ? "pb-0" : ""}`}>
                <p
                  className={`flex flex-wrap items-center gap-2 font-govde text-sm font-medium ${
                    kritik ? "text-sarap" : "text-murekkep"
                  }`}
                >
                  <span aria-hidden className={kritik && !gecti ? "animate-pulse" : ""}>
                    {a.simge}
                  </span>
                  {a.baslik}
                  {aktif && (
                    <span className="rounded-full bg-yaldiz/15 px-2 py-0.5 font-govde text-[0.58rem] uppercase tracking-etiket text-yaldiz">
                      Şu an
                    </span>
                  )}
                  {gecti && (
                    <span className="font-govde text-[0.58rem] uppercase tracking-etiket text-ikincil">
                      Tamamlandı
                    </span>
                  )}
                </p>

                <p
                  className={`mt-0.5 font-govde text-xs ${
                    kritik ? "font-medium text-sarap" : "text-yaldiz"
                  }`}
                >
                  {tarihMetni(a.zaman)}
                  {a.gunEtiketi && (
                    <span className="ml-1.5 text-ikincil">· {a.gunEtiketi}</span>
                  )}
                </p>

                <p
                  className={`mt-1 font-govde text-xs leading-relaxed ${
                    kritik ? "text-murekkep" : "text-ikincil"
                  }`}
                >
                  {a.aciklama}
                </p>
              </div>
            </li>
          );
        })}
      </ol>

      {/* SON UYARI - cizelgenin altinda, kacirilmayacak bir yerde. */}
      <div className="mt-2 rounded-2xl border border-sarap/35 bg-sarap/[0.06] p-4">
        <p className="flex items-center gap-2 font-govde text-sm font-medium text-sarap">
          <span aria-hidden className="animate-pulse">
            🔴
          </span>
          Eserinizi indirin ve yedekleyin
        </p>
        <p className="metin-yasli mt-1.5 font-govde text-xs leading-relaxed text-murekkep">
          {tarihMetni(new Date(etkinlik.imha_tarihi))} tarihinde defteriniz, tüm dilekler ve
          tüm fotoğraflar <span className="font-medium">kalıcı olarak silinir</span>. Bu işlem
          geri alınamaz; silinen veri hiçbir şekilde geri getirilemez.
        </p>
        <p className="metin-yasli mt-1.5 font-govde text-xs leading-relaxed text-ikincil">
          İndirdiğiniz dosyayı güvenli bir yere kaydedin ve <span className="font-medium">yedekleyin</span>.
          Dosyayı kaybetmeniz, silinen veriyi geri getirme hakkı doğurmaz. Sizi süreç boyunca
          düzenli olarak hatırlatacağız — ancak indirme sorumluluğu size aittir.
        </p>
      </div>

      {/* Odeme bilgisi - FIYAT YOK, yalniz surec. */}
      <div className="mt-3 rounded-2xl border border-ayrac bg-parsomen p-4">
        <p className="font-govde text-[0.66rem] uppercase tracking-etiket text-ikincil">
          Ücretlendirme nasıl işler
        </p>
        <p className="metin-yasli mt-1.5 font-govde text-xs leading-relaxed text-ikincil">
          Dilek toplamak, defterinizi kurmak, düzenlemek ve{" "}
          <span className="font-medium text-murekkep">defterinizi sayfa sayfa görmek</span>{" "}
          ücretsizdir. Ücret yalnızca baskıya hazır nüshayı indirirken alınır — bir kereye
          mahsus.
        </p>
        <p className="metin-yasli mt-1.5 font-govde text-xs leading-relaxed text-ikincil">
          <span className="font-medium text-murekkep">İndirmek için beklemeniz gerekmez.</span>{" "}
          Ödemenizi yaptığınız andan itibaren — ister kurulum günü, ister düğünden bir gün
          sonra — defterinizi <span className="font-medium text-murekkep">dilediğiniz zaman
          ve dilediğiniz kadar</span> indirebilirsiniz. Defter doldukça yeniden indirin;
          her indirme o anki hâlini verir.
        </p>
        <p className="metin-yasli mt-1.5 font-govde text-xs leading-relaxed text-ikincil">
          Ödeme yapmış olmanız imha süresini <span className="font-medium">uzatmaz</span>.
          Son indirme fırsatınız {etkinlik.toplam_gun}. günün sonudur.
        </p>
      </div>
    </section>
  );
}

// ---- Adim kurulumu ----
// Tarihler BACKEND'DEN gelir. Bu fonksiyon hicbir sey hesaplamaz - yalniz duzenler.

type Adim = {
  zaman: Date;
  simge: string;
  baslik: string;
  aciklama: string;
  gunEtiketi?: string;
  tip: "normal" | "uyari" | "imha";
};

function kur(e: Etkinlik): Adim[] {
  const acilis = new Date(e.acilis_tarihi);
  const ozelGun = new Date(e.etkinlik_tarihi);
  const kapanis = new Date(e.kapanis_tarihi);
  const imha = new Date(e.imha_tarihi);

  return [
    {
      zaman: acilis,
      simge: "📖",
      baslik: "Defteriniz açıldı",
      aciklama:
        "Davetlileriniz bağlantıdan dilek bırakabilir. Baskı Stüdyosu'ndan defterinizi " +
        "şimdiden düzenleyebilirsiniz — düzenleme son güne kadar açık kalır.",
      tip: "normal",
    },
    {
      zaman: ozelGun,
      simge: "💍",
      baslik: "Özel gün",
      aciklama: "Etkinliğiniz gerçekleşir. Dilekler gelmeye devam eder.",
      tip: "normal",
    },
    {
      zaman: kapanis,
      simge: "🔒",
      baslik: "Davetli girişleri kapanır",
      gunEtiketi: `özel günden ${e.toplama_gun} gün sonra`,
      aciklama:
        "Yeni dilek eklenemez. Defteriniz tamamlanmıştır — düzenlemeye ve indirmeye " +
        "devam edebilirsiniz.",
      tip: "normal",
    },
    {
      zaman: new Date(imha.getTime() - 3 * 24 * 3600 * 1000),
      simge: "⚠️",
      baslik: "Son 3 gün uyarısı",
      aciklama:
        "Eserinizi hâlâ indirmediyseniz, size her gün hatırlatma göndeririz. " +
        "Bu son fırsat penceresidir.",
      tip: "uyari",
    },
    {
      zaman: imha,
      simge: "🔴",
      baslik: "KALICI İMHA",
      gunEtiketi: `özel günden ${e.toplam_gun} gün sonra`,
      aciklama:
        "Defteriniz, tüm dilekler ve tüm fotoğraflar kalıcı olarak silinir. " +
        "GERİ ALINAMAZ. İndirmediyseniz miras kaybolur.",
      tip: "imha",
    },
  ];
}

function tarihMetni(d: Date): string {
  try {
    return d.toLocaleString("tr-TR", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}
