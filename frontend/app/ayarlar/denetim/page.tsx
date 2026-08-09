"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, type DenetimKaydi } from "@/lib/api";
import { AppShell } from "@/components/site/AppShell";
import { useSenkronDinle } from "@/lib/senkron";
import { ayrintiMetni, denetimCumlesi, gunBasligi, saatMetni } from "@/lib/denetim";

// DENETIM GUNLUGU - defterde ne olup bittiginin seffaf kaydi.
//
// OZNE DILI: her satir "kim yapti" ile baslar. Sen ikinci tekil ("bir dilegi
// deftere aldin"), esin adiyla ("Aysegul baskiya hazir defteri indirdi"), sistem
// olaylari oznesiz. Ham kod (kaynak_es gibi) EKRANA CIKMAZ.
//
// ESLER ARASI IZOLASYON: esinin ONAY BEKLEYEN kuyrugundaki islemleri (birakilan,
// reddedilen, geri alinan, cope tasinan dilekler) BACKEND hic gondermez. Onaylanan
// dilek ortak deftere gectigi icin gorunur - sizinti degil, ortak defterin yasami.
//
// SAYFALAMA: 50'lik sayfalar + imlec (keyset). Listenin SONU her zaman soylenir.
const SAYFA = 50;

export default function DenetimSayfasi() {
  const router = useRouter();
  const [kayitlar, setKayitlar] = useState<DenetimKaydi[]>([]);
  const [durum, setDurum] = useState<"yukleniyor" | "hazir" | "yok">("yukleniyor");
  const [devamVar, setDevamVar] = useState(false);
  const [dahaYukleniyor, setDahaYukleniyor] = useState(false);

  const ilkSayfa = useCallback(async () => {
    const c = await api.denetimGunlugu({ limit: SAYFA });
    if (c.ok) {
      setKayitlar(c.veri);
      setDevamVar(c.veri.length === SAYFA);
      setDurum("hazir");
    } else if (c.durum === 401) {
      router.replace("/giris");
    } else {
      setDurum("yok");
    }
  }, [router]);

  useEffect(() => {
    void ilkSayfa();
  }, [ilkSayfa]);

  // CANLI SENKRON: yeni islem olunca gunluk kendiliginden tazelenir.
  useSenkronDinle("defter", ilkSayfa);
  useSenkronDinle("kuyruk", ilkSayfa);

  async function dahaYukle() {
    if (dahaYukleniyor || kayitlar.length === 0) return;
    setDahaYukleniyor(true);
    const enEski = kayitlar[kayitlar.length - 1].created_at;
    const c = await api.denetimGunlugu({ limit: SAYFA, oncesi: enEski });
    setDahaYukleniyor(false);
    if (!c.ok) return;
    setKayitlar((o) => {
      const varOlan = new Set(o.map((x) => x.id));
      return [...o, ...c.veri.filter((x) => !varOlan.has(x.id))];
    });
    setDevamVar(c.veri.length === SAYFA);
  }

  // GUN GRUPLARI: tarih her satirda tekrarlanmaz; baslikta bir kez yazilir.
  const gruplar: { baslik: string; kayitlar: DenetimKaydi[] }[] = [];
  for (const k of kayitlar) {
    const b = gunBasligi(k.created_at);
    const son = gruplar[gruplar.length - 1];
    if (son && son.baslik === b) son.kayitlar.push(k);
    else gruplar.push({ baslik: b, kayitlar: [k] });
  }

  return (
    <AppShell>
      <div className="rounded-3xl border border-ayrac bg-yuzey p-6 sm:p-8">
        <p className="font-govde text-xs uppercase tracking-etiket text-yaldiz">Etkinlik</p>
        <h1 className="mt-2 font-display text-2xl text-murekkep sm:text-3xl">Denetim Günlüğü</h1>
        <p className="mt-2 font-govde text-sm leading-relaxed text-ikincil">
          Defterinizde gerçekleşen işlemlerin şeffaf kaydı. En yeni üstte.
        </p>
      </div>

      <div className="mt-6">
        {durum === "yukleniyor" ? (
          <p className="font-govde text-sm text-ikincil">Yükleniyor...</p>
        ) : durum === "yok" ? (
          <p className="rounded-3xl border border-ayrac bg-yuzey p-8 text-center font-govde text-sm text-ikincil">
            Aktif bir defter seçili değil.
          </p>
        ) : kayitlar.length === 0 ? (
          <p className="rounded-3xl border border-dashed border-ayrac bg-yuzey p-8 text-center font-govde text-sm text-ikincil">
            Henüz kayıt yok.
          </p>
        ) : (
          <>
            <div className="space-y-5">
              {gruplar.map((g) => (
                <section key={g.baslik}>
                  <p className="mb-2 px-1 font-govde text-[0.65rem] uppercase tracking-etiket text-ikincil">
                    {g.baslik}
                  </p>
                  <div className="overflow-hidden rounded-3xl border border-ayrac bg-yuzey">
                    <ul className="divide-y divide-ayrac">
                      {g.kayitlar.map((k) => (
                        <Satir key={k.id} kayit={k} />
                      ))}
                    </ul>
                  </div>
                </section>
              ))}
            </div>

            <div className="mt-5 text-center">
              <p className="font-govde text-xs text-ikincil">{kayitlar.length} kayıt gösteriliyor</p>
              {devamVar ? (
                <button
                  onClick={() => void dahaYukle()}
                  disabled={dahaYukleniyor}
                  className="mt-2 rounded-full border border-ayrac px-6 py-2.5 font-govde text-sm text-ikincil transition-colors hover:border-sarap hover:text-sarap disabled:opacity-50"
                >
                  {dahaYukleniyor ? "Yükleniyor..." : "Daha fazla yükle"}
                </button>
              ) : (
                <p className="mt-1 font-govde text-xs text-ikincil">Tüm kayıtlar gösteriliyor.</p>
              )}
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}

// Tek satir: rozet + ozne cumlesi + ayrinti + saat.
function Satir({ kayit }: { kayit: DenetimKaydi }) {
  const c = denetimCumlesi(kayit.eylem, kayit.degisen_alanlar, kayit.aktor, kayit.ben_mi);
  const ayrinti = ayrintiMetni(kayit.eylem, kayit.degisen_alanlar);

  // ROZET (B3): gozun satiri okumadan "kim?" sorusuna yanit vermesi icin.
  // Sen -> sarap, diger kisi -> yaldiz, sistem -> notr nokta.
  const rozet =
    c.tur === "sistem" ? null : (c.ozne ?? "?").trim().charAt(0).toLocaleUpperCase("tr-TR");

  return (
    <li className="flex items-start gap-3 px-5 py-3.5">
      {rozet ? (
        <span
          className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-display text-[0.7rem] ${
            c.tur === "sen" ? "bg-sarap text-parsomen" : "bg-yaldiz/20 text-yaldiz"
          }`}
          aria-hidden
        >
          {rozet}
        </span>
      ) : (
        <span className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-ikincil/50" aria-hidden />
      )}

      <div className="min-w-0 flex-1">
        <p className="font-govde text-sm text-murekkep">
          {c.ozne && <span className="font-medium">{c.ozne}</span>}
          {c.ozne ? " " : ""}
          <span className={c.ozne ? "text-ikincil" : ""}>{c.fiil}</span>
        </p>
        {ayrinti && (
          <p className="mt-0.5 break-words font-govde text-xs text-murekkep/70">{ayrinti}</p>
        )}
      </div>

      <span className="mt-0.5 shrink-0 font-govde text-xs tabular-nums text-ikincil">
        {saatMetni(kayit.created_at)}
      </span>
    </li>
  );
}
