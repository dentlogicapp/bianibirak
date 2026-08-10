"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, type DenetimKaydi } from "@/lib/api";
import { AppShell } from "@/components/site/AppShell";
import { useSenkronDinle } from "@/lib/senkron";
import {
  ayrintiMetni,
  denetimCumlesi,
  gunBasligi,
  saatMetni,
  gruplaArdisik,
  topluFiil,
  type DenetimGrubu,
} from "@/lib/denetim";

// DENETIM GUNLUGU - defterde ne olup bittiginin seffaf kaydi.
//
// OZNE DILI: her satir "kim yapti" ile baslar (Sen / esinin adi / davetli adi).
// ESLER ARASI IZOLASYON: esinin onay bekleyen kuyrugundaki islemler BACKEND'den
// hic gelmez. TOPLULASTIRMA (E2): ayni kisinin ust uste ayni islemi tek satirda
// toplanir; kritik olaylar (silme/imha/odeme) ASLA toplanmaz.
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

  // GUN GRUPLARI -> her gunun ICINDE ardisik toplulastirma.
  const gunler: { baslik: string; gruplar: DenetimGrubu<DenetimKaydi>[] }[] = [];
  for (const k of kayitlar) {
    const b = gunBasligi(k.created_at);
    const son = gunler[gunler.length - 1];
    if (son && son.baslik === b) son.gruplar.push({ anahtar: k.id, kayitlar: [k], toplu: false });
    else gunler.push({ baslik: b, gruplar: [{ anahtar: k.id, kayitlar: [k], toplu: false }] });
  }
  // Gun icindeki duz listeyi toplulastir (gun siniri gruplari ASMAZ - bir grup
  // gece yarisini gecerse iki ayri gun basligina bolunmesi dogrudur).
  const gorunum = gunler.map((g) => ({
    baslik: g.baslik,
    gruplar: gruplaArdisik(g.gruplar.map((x) => x.kayitlar[0])),
  }));

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
              {gorunum.map((g) => (
                <section key={g.baslik}>
                  <p className="mb-2 px-1 font-govde text-[0.65rem] uppercase tracking-etiket text-ikincil">
                    {g.baslik}
                  </p>
                  <div className="overflow-hidden rounded-3xl border border-ayrac bg-yuzey">
                    <ul className="divide-y divide-ayrac">
                      {g.gruplar.map((grup) => (
                        <GrupSatiri key={grup.anahtar} grup={grup} />
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

// Bir grup: tek kayit ise duz satir, birden fazlaysa toplu satir (tiklayinca acilir).
function GrupSatiri({ grup }: { grup: DenetimGrubu<DenetimKaydi> }) {
  const [acik, setAcik] = useState(false);
  const ilk = grup.kayitlar[0];
  const adet = grup.kayitlar.length;
  const c = denetimCumlesi(ilk.eylem, ilk.degisen_alanlar, ilk.aktor, ilk.ben_mi);

  if (!grup.toplu) return <Satir kayit={ilk} />;

  // Toplu satirda zaman ARALIK olarak yazilir: "14:32–14:35". Tek bir an degil,
  // bir sure boyunca yapilmis bir is oldugu gorunur.
  const enEski = grup.kayitlar[adet - 1];
  const aralik = `${saatMetni(enEski.created_at)}–${saatMetni(ilk.created_at)}`;

  return (
    <li>
      <button
        onClick={() => setAcik((o) => !o)}
        className="flex w-full items-start gap-3 px-5 py-3.5 text-left transition-colors hover:bg-yuzeyKoyu"
      >
        <span
          className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-display text-[0.7rem] ${
            c.tur === "sen" ? "bg-sarap text-parsomen" : "bg-yaldiz/20 text-yaldiz"
          }`}
          aria-hidden
        >
          {adet}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-govde text-sm text-murekkep">
            {c.ozne && <span className="font-medium">{c.ozne}</span>}
            {c.ozne ? " " : ""}
            <span className={c.ozne ? "text-ikincil" : ""}>{topluFiil(c.fiil, adet)}</span>
          </p>
          <p className="mt-0.5 font-govde text-xs text-ikincil">
            {acik ? "Ayrıntıları gizle" : "Ayrıntıları göster"}
          </p>
        </div>
        <span className="mt-0.5 shrink-0 font-govde text-xs tabular-nums text-ikincil">{aralik}</span>
      </button>

      {acik && (
        <ul className="divide-y divide-ayrac border-t border-ayrac bg-yuzeyKoyu/40">
          {grup.kayitlar.map((k) => (
            <Satir key={k.id} kayit={k} icerde />
          ))}
        </ul>
      )}
    </li>
  );
}

// Tek satir: rozet + ozne cumlesi + ayrinti + saat.
function Satir({ kayit, icerde = false }: { kayit: DenetimKaydi; icerde?: boolean }) {
  const c = denetimCumlesi(kayit.eylem, kayit.degisen_alanlar, kayit.aktor, kayit.ben_mi);
  const ayrinti = ayrintiMetni(kayit.eylem, kayit.degisen_alanlar);
  const rozet =
    c.tur === "sistem" ? null : (c.ozne ?? "?").trim().charAt(0).toLocaleUpperCase("tr-TR");

  return (
    <li className={`flex items-start gap-3 px-5 py-3.5 ${icerde ? "pl-14" : ""}`}>
      {icerde ? (
        <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-ikincil/40" aria-hidden />
      ) : rozet ? (
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
