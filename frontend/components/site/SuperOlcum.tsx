"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api, type SuperOlcum } from "@/lib/api";

// OLCUM SEKMESI - "urun tutuyor mu?" sorusunun cevabi.
//
// NEDEN SIMDI, ODEMEDEN ONCE:
// Paywall eklendiginde donusum duserse sebebi bilinemez - odeme mi itti, urun mu
// zaten tutmuyordu? Bugunun hunisi, yarinki karsilastirmanin TEMEL CIZGISIDIR.
// Olcumu odemeden SONRA kurmak, kor ucus demektir.
export function OlcumSekmesi() {
  const [veri, setVeri] = useState<SuperOlcum | null>(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [imhaCalisiyor, setImhaCalisiyor] = useState(false);

  async function cek() {
    const c = await api.superOlcum();
    if (c.ok) setVeri(c.veri);
    setYukleniyor(false);
  }

  useEffect(() => {
    void cek();
  }, []);

  // Cron saatlik calisir. Bu buton, alarmi ANINDA temizlemek icindir: gecikmis
  // imha bir KVKK riskidir, bir sonraki saati beklemek onu uzatir.
  async function imhaCalistir() {
    setImhaCalisiyor(true);
    const c = await api.superImhaCalistir();
    setImhaCalisiyor(false);
    if (!c.ok) {
      toast.error(c.mesaj);
      return;
    }
    toast.success(
      c.veri.imha_edilen > 0
        ? `${c.veri.imha_edilen} defter imha edildi.`
        : "İmha edilecek defter yok."
    );
    void cek();
  }

  if (yukleniyor) {
    return <p className="py-16 text-center font-govde text-sm text-ikincil">Yükleniyor...</p>;
  }

  if (!veri) {
    return (
      <p className="py-16 text-center font-govde text-sm text-ikincil">Ölçüm alınamadı.</p>
    );
  }

  const h = veri.huni;
  const adimlar = [
    { ad: "Defter açıldı", deger: h.defter_acildi, aciklama: "Çift kaydoldu ve defterini kurdu" },
    { ad: "Link paylaşıldı", deger: h.link_paylasildi, aciklama: "Davetli bağlantısı aktif edildi" },
    { ad: "İlk dilek geldi", deger: h.ilk_dilek_geldi, aciklama: "Ürün değerini kanıtladığı an" },
    { ad: "Kürasyon yapıldı", deger: h.kurasyon_yapildi, aciklama: "Esere en az bir dilek alındı" },
    { ad: "Eser indirildi", deger: h.eser_indirildi, aciklama: "Filigransız PDF - ödeme eşiği" },
  ];

  return (
    <div className="space-y-5">
      {/* DONUSUM HUNISI */}
      <section className="rounded-3xl border border-ayrac bg-yuzey p-6 sm:p-8">
        <h2 className="font-display text-lg text-murekkep">Dönüşüm hunisi</h2>
        <p className="metin-yasli mt-1.5 font-govde text-sm leading-relaxed text-ikincil">
          Her adım bir öncekinin alt kümesi. En büyük düşüşün olduğu yer, ürünün en zayıf
          halkasıdır.
        </p>

        <div className="mt-5 space-y-2.5">
          {adimlar.map((a, i) => {
            const onceki = i === 0 ? a.deger : adimlar[i - 1].deger;
            const oran = h.defter_acildi > 0 ? (a.deger / h.defter_acildi) * 100 : 0;
            const dusus = onceki > 0 ? ((onceki - a.deger) / onceki) * 100 : 0;
            const kritik = i > 0 && dusus >= 50;

            return (
              <div key={a.ad}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0 font-govde text-sm text-murekkep">{a.ad}</span>
                  <span className="shrink-0 font-govde text-sm tabular-nums text-murekkep">
                    {a.deger}
                    <span className="ml-1.5 text-xs text-ikincil">
                      {oran.toFixed(0)}%
                    </span>
                  </span>
                </div>

                <div className="mt-1 h-2 overflow-hidden rounded-full bg-parsomen">
                  <div
                    className={`h-full rounded-full transition-all ${
                      kritik ? "bg-sarap" : "bg-yaldiz"
                    }`}
                    style={{ width: `${Math.max(oran, 1.5)}%` }}
                  />
                </div>

                <p className="mt-0.5 font-govde text-[0.68rem] text-ikincil">
                  {a.aciklama}
                  {i > 0 && dusus > 0 && (
                    <span className={kritik ? "ml-1.5 font-medium text-sarap" : "ml-1.5"}>
                      · bu adımda %{dusus.toFixed(0)} kayıp
                    </span>
                  )}
                </p>
              </div>
            );
          })}
        </div>

        {veri.ilk_dilek_gecikme_saat !== null && (
          <p className="mt-5 rounded-xl border border-ayrac bg-parsomen px-4 py-3 font-govde text-xs text-ikincil">
            Defter açılışından ilk dileğe ortalama{" "}
            <span className="font-medium text-murekkep">
              {veri.ilk_dilek_gecikme_saat} saat
            </span>{" "}
            geçiyor. Bu süre uzunsa davetli daveti anlamıyor demektir.
          </p>
        )}
      </section>

      {/* YASAM DONGUSU */}
      <section className="rounded-3xl border border-ayrac bg-yuzey p-6 sm:p-8">
        <h2 className="font-display text-lg text-murekkep">Yaşam döngüsü</h2>
        <p className="metin-yasli mt-1.5 font-govde text-sm leading-relaxed text-ikincil">
          Kapanıştan {veri.yasam_dongusu.saklama_gun} gün sonra defter tümüyle imha edilir.
          Bu takvim, KVKK taahhüdümüzün kanıtıdır.
        </p>

        <div className="mt-5 grid grid-cols-3 gap-3">
          <Kutu etiket="Açık" deger={veri.yasam_dongusu.acik} />
          <Kutu etiket="Kapanmış" deger={veri.yasam_dongusu.kapali} />
          <Kutu
            etiket="İmha gecikmiş"
            deger={veri.yasam_dongusu.imha_gecikmis}
            alarm={veri.yasam_dongusu.imha_gecikmis > 0}
          />
        </div>

        {veri.yasam_dongusu.imha_gecikmis > 0 && (
          <div className="mt-3 rounded-xl bg-sarap/10 px-4 py-3">
            <p className="font-govde text-xs text-sarap">
              <span className="font-medium">Dikkat:</span> saklama süresi dolmuş{" "}
              {veri.yasam_dongusu.imha_gecikmis} defter hâlâ duruyor. İmha görevi saatlik
              çalışır; beklemeden şimdi tetikleyebilirsin.
            </p>
            <button
              type="button"
              onClick={imhaCalistir}
              disabled={imhaCalisiyor}
              className="mt-2.5 rounded-full bg-sarap px-4 py-2 font-govde text-xs font-medium text-parsomen transition-colors hover:bg-sarapKoyu disabled:opacity-50"
            >
              {imhaCalisiyor ? "İmha ediliyor..." : "İmhayı şimdi çalıştır"}
            </button>
          </div>
        )}

        {veri.imha_yaklasan.length > 0 && (
          <div className="mt-5">
            <p className="font-govde text-[0.66rem] uppercase tracking-etiket text-ikincil">
              14 gün içinde imha edilecekler
            </p>
            <div className="mt-2 space-y-1.5">
              {veri.imha_yaklasan.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-ayrac bg-parsomen px-4 py-2.5"
                >
                  <span className="min-w-0 truncate font-govde text-sm text-murekkep">
                    {d.es1_ad} &amp; {d.es2_ad}
                  </span>
                  <span className="shrink-0 font-govde text-xs text-ikincil">
                    {d.kalan_gun} gün
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* RISK ALTINDAKI DEFTERLER */}
      <section className="rounded-3xl border border-ayrac bg-yuzey p-6 sm:p-8">
        <h2 className="font-display text-lg text-murekkep">Risk altındaki defterler</h2>
        <p className="metin-yasli mt-1.5 font-govde text-sm leading-relaxed text-ikincil">
          Bağlantısı aktif ama bir haftadır tek dilek gelmemiş. Bu çift ya linki hiç
          göndermedi ya da ürünü anlamadı - müdahale edilebilir bir kayıp.
        </p>

        {veri.riskli.length === 0 ? (
          <p className="mt-5 rounded-2xl border border-dashed border-ayrac bg-parsomen px-6 py-10 text-center font-govde text-sm text-ikincil">
            Risk altında defter yok.
          </p>
        ) : (
          <div className="mt-5 space-y-2">
            {veri.riskli.map((d) => (
              <div
                key={d.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-sarap/30 bg-sarap/5 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate font-govde text-sm font-medium text-murekkep">
                    {d.es1_ad} &amp; {d.es2_ad}
                  </p>
                  <p className="truncate font-govde text-xs text-ikincil">{d.sebep}</p>
                </div>
                <span className="shrink-0 font-govde text-xs text-sarap">{d.gun} gün</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* SON 30 GUN */}
      <section className="rounded-3xl border border-ayrac bg-yuzey p-6 sm:p-8">
        <h2 className="font-display text-lg text-murekkep">Son 30 gün</h2>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Kutu etiket="Yeni defter" deger={veri.son_30_gun.yeni_defter} />
          <Kutu etiket="Yeni dilek" deger={veri.son_30_gun.yeni_dilek} />
        </div>
      </section>
    </div>
  );
}

function Kutu({
  etiket,
  deger,
  alarm,
}: {
  etiket: string;
  deger: number;
  alarm?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border px-4 py-3.5 ${
        alarm ? "border-sarap/40 bg-sarap/8" : "border-ayrac bg-parsomen"
      }`}
    >
      <p
        className={`font-display text-2xl leading-none tabular-nums ${
          alarm ? "text-sarap" : "text-murekkep"
        }`}
      >
        {deger}
      </p>
      <p className="mt-1.5 font-govde text-[0.62rem] uppercase tracking-etiket text-ikincil">
        {etiket}
      </p>
    </div>
  );
}
