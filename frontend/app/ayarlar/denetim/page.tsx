"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, type DenetimKaydi } from "@/lib/api";
import { AppShell } from "@/components/site/AppShell";
import { useSenkronDinle } from "@/lib/senkron";
import { eylemEtiketi, ayrintiMetni } from "@/lib/denetim";

// Denetim gunlugu: aktif etkinligin islemleri (seffaflik; append-only audit).
//
// SAYFALAMA (E4): onceden sabit son 100 kayit geliyordu ve 101. kayit ARAYUZDE
// HIC YOKTU - ustelik kullaniciya bunun soylendigi bir yer de yoktu. Bir denetim
// ekraninda sessiz kesme, "kaydin tamami burada" iddiasini curutur.
//
// Simdi: 50'lik sayfalar + IMLEC (keyset). Devam varsa "Daha fazla yukle" gorunur;
// yoksa "Tum kayitlar gosteriliyor" YAZAR - kullanici listenin bittigini BILIR,
// tahmin etmez. Offset kullanilmaz: append-only bir gunlukte araya giren yeni kayit
// satir tekrarina/atlamasina yol acar (imlec bunu yapisal olarak onler).
const SAYFA = 50;

export default function DenetimSayfasi() {
  const router = useRouter();
  const [kayitlar, setKayitlar] = useState<DenetimKaydi[]>([]);
  const [durum, setDurum] = useState<"yukleniyor" | "hazir" | "yok">("yukleniyor");
  // Devam var mi: son sayfa TAM dolu geldiyse muhtemelen daha var.
  const [devamVar, setDevamVar] = useState(false);
  const [dahaYukleniyor, setDahaYukleniyor] = useState(false);

  // ILK SAYFA - senkron olayinda da bu calisir (bastan tazelenir).
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

  // CANLI SENKRON (Bolum 0.1): yeni bir islem olunca gunluk kendiliginden tazelensin.
  // Sayfalama sifirlanir - dogru olan budur: en yeni kayit en ustte gorunmeli.
  useSenkronDinle("defter", ilkSayfa);
  useSenkronDinle("kuyruk", ilkSayfa);

  // SONRAKI SAYFA - imlec: elimizdeki EN ESKI kaydin zamani.
  async function dahaYukle() {
    if (dahaYukleniyor || kayitlar.length === 0) return;
    setDahaYukleniyor(true);
    const enEski = kayitlar[kayitlar.length - 1].created_at;
    const c = await api.denetimGunlugu({ limit: SAYFA, oncesi: enEski });
    setDahaYukleniyor(false);
    if (!c.ok) return;
    // Ayni kaydin iki kez eklenmesine karsi kalkan (ag tekrari / hizli cift tiklama).
    setKayitlar((o) => {
      const varOlan = new Set(o.map((x) => x.id));
      return [...o, ...c.veri.filter((x) => !varOlan.has(x.id))];
    });
    setDevamVar(c.veri.length === SAYFA);
  }

  return (
    <AppShell>
      <div className="rounded-3xl border border-ayrac bg-yuzey p-6 sm:p-8">
        <p className="font-govde text-xs uppercase tracking-etiket text-yaldiz">Etkinlik</p>
        <h1 className="mt-2 font-display text-2xl text-murekkep sm:text-3xl">Denetim Günlüğü</h1>
        <p className="mt-2 font-govde text-sm leading-relaxed text-ikincil">
          Etkinliğinizde gerçekleşen işlemlerin şeffaf kaydı. En yeni üstte.
        </p>
      </div>

      <div className="mt-6">
        {durum === "yukleniyor" ? (
          <p className="font-govde text-sm text-ikincil">Yükleniyor...</p>
        ) : durum === "yok" ? (
          <p className="rounded-3xl border border-ayrac bg-yuzey p-8 text-center font-govde text-sm text-ikincil">
            Aktif bir etkinlik seçili değil.
          </p>
        ) : kayitlar.length === 0 ? (
          <p className="rounded-3xl border border-dashed border-ayrac bg-yuzey p-8 text-center font-govde text-sm text-ikincil">
            Henüz kayıt yok.
          </p>
        ) : (
          <>
            <div className="overflow-hidden rounded-3xl border border-ayrac bg-yuzey">
              <ul className="divide-y divide-ayrac">
                {kayitlar.map((k) => (
                  <li key={k.id} className="flex items-start gap-3 px-5 py-4">
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-sarap" />
                    <div className="min-w-0 flex-1">
                      <p className="font-govde text-sm font-medium text-murekkep">
                        {eylemEtiketi(k.eylem)}
                      </p>
                      {/* AYRINTI (E1): kayitli DegisenAlanlar artik OKUNUYOR.
                          Yillardir yaziliyor ama hicbir ekranda gorunmuyordu. */}
                      {ayrintiMetni(k.eylem, k.degisen_alanlar) && (
                        <p className="mt-0.5 break-words font-govde text-xs text-murekkep/70">
                          {ayrintiMetni(k.eylem, k.degisen_alanlar)}
                        </p>
                      )}
                      <p className="mt-0.5 font-govde text-xs text-ikincil">
                        {tarihSaatMetni(k.created_at)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* SAYFALAMA - listenin SONU her zaman soylenir. */}
            <div className="mt-4 text-center">
              <p className="font-govde text-xs text-ikincil">
                {kayitlar.length} kayıt gösteriliyor
              </p>
              {devamVar ? (
                <button
                  onClick={() => void dahaYukle()}
                  disabled={dahaYukleniyor}
                  className="mt-2 rounded-full border border-ayrac px-6 py-2.5 font-govde text-sm text-ikincil transition-colors hover:border-sarap hover:text-sarap disabled:opacity-50"
                >
                  {dahaYukleniyor ? "Yükleniyor..." : "Daha fazla yükle"}
                </button>
              ) : (
                <p className="mt-1 font-govde text-xs text-ikincil">
                  Tüm kayıtlar gösteriliyor.
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}

// eylemEtiketi lib/denetim.ts'e tasindi - TEK KAYNAK.
// Onceden bu harita burada ve super panelde AYRI AYRI duruyordu (iki kopya
// kacinilmaz olarak ayrisir). Yeni bir eylem eklendiginde artik tek yer guncellenir.

function tarihSaatMetni(iso: string): string {
  const t = new Date(iso);
  if (isNaN(t.getTime())) return iso;
  return t.toLocaleString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
