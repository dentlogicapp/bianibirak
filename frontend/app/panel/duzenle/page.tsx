"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api, type Etkinlik, type EtkinlikAyar } from "@/lib/api";
import { VARSAYILAN } from "@/lib/varsayilan";
import { AppShell } from "@/components/site/AppShell";
import { DurumBandi, DurumBandiBoslugu } from "@/components/site/DurumBandi";
import {
  DavetliKarsilama,
  type KarsilamaGorseli,
} from "@/components/site/DavetliKarsilama";
import { useOtoKaydet, otoKayitEtiket } from "@/lib/oto-kaydet";

// Etkinlik & Gorunum: 3 sekme (Etkinlik / Davetli Ekrani / Sayac).
// Her sekmede sol duzenleme + sag CANLI ONIZLEME (planlama admin/marka deseni).
// Otomatik kayit - kaydet butonu YOK; alt sabit barda durum gostergesi.
type SekmeKod = "etkinlik" | "davetli" | "sayac";

const SEKMELER: { kod: SekmeKod; etiket: string }[] = [
  { kod: "etkinlik", etiket: "Etkinlik" },
  { kod: "davetli", etiket: "Davetli Ekranı" },
  { kod: "sayac", etiket: "Sayaç" },
];

export default function EtkinlikGorunumSayfasi() {
  const router = useRouter();
  const [etkinlik, setEtkinlik] = useState<Etkinlik | null>(null);
  const [ayar, setAyar] = useState<EtkinlikAyar | null>(null);
  const [durum, setDurum] = useState<"yukleniyor" | "hazir" | "yok">("yukleniyor");

  useEffect(() => {
    (async () => {
      const e = await api.etkinlikAktif();
      if (!e.ok) {
        if (e.durum === 401) router.replace("/giris");
        else setDurum("yok");
        return;
      }
      setEtkinlik(e.veri);
      const a = await api.etkinlikAyarlar();
      if (a.ok) setAyar(a.veri);
      setDurum("hazir");
    })();
  }, [router]);

  if (durum === "yukleniyor") {
    return (
      <AppShell>
        <div className="flex min-h-[50vh] items-center justify-center font-govde text-sm text-ikincil">
          Yükleniyor...
        </div>
      </AppShell>
    );
  }

  if (durum === "yok" || !etkinlik || !ayar) {
    return (
      <AppShell>
        <div className="rounded-3xl border border-ayrac bg-yuzey p-10 text-center">
          <p className="font-govde text-sm text-ikincil">Aktif bir etkinlik seçili değil.</p>
          <button
            onClick={() => router.push("/panel")}
            className="mt-6 rounded-full bg-sarap px-7 py-3 font-govde text-sm font-medium text-parsomen transition-colors hover:bg-sarapKoyu"
          >
            Etkinliklerime git
          </button>
        </div>
      </AppShell>
    );
  }

  return <Icerik ilkEtkinlik={etkinlik} ilkAyar={ayar} />;
}

function Icerik({ ilkEtkinlik, ilkAyar }: { ilkEtkinlik: Etkinlik; ilkAyar: EtkinlikAyar }) {
  const [sekme, setSekme] = useState<SekmeKod>("etkinlik");

  // Onizleme, davetlinin GERCEKTEN gorecegi fotograflari gosterir - temsili degil.
  const [gorseller, setGorseller] = useState<KarsilamaGorseli[]>([]);

  useEffect(() => {
    let iptal = false;
    void api.gorselListe().then((c) => {
      if (iptal || !c.ok) return;
      setGorseller(
        c.veri.gorseller.map((g) => ({
          url: g.url,
          kapak: g.konum === "kapak",
          genislik: g.genislik,
          yukseklik: g.yukseklik,
        }))
      );
    });
    return () => {
      iptal = true;
    };
  }, []);

  // --- Etkinlik alanlari ---
  const [es1Ad, setEs1Ad] = useState(ilkEtkinlik.es1_ad);
  const [es2Ad, setEs2Ad] = useState(ilkEtkinlik.es2_ad);
  const [tarih, setTarih] = useState(yereleCevir(ilkEtkinlik.etkinlik_tarihi));

  // --- Davetli ekrani alanlari ---
  const [karsilama, setKarsilama] = useState(ilkAyar.karsilama_metni ?? "");
  const [prompt, setPrompt] = useState(ilkAyar.prompt_metni ?? "");
  const [gun, setGun] = useState(String(ilkAyar.kapanis_pencere_gun));

  // --- Sayac alanlari ---
  const [sayacAktif, setSayacAktif] = useState(ilkAyar.sayac_aktif);
  const [sayacAktifCumle, setSayacAktifCumle] = useState(ilkAyar.sayac_aktif_cumle ?? "");
  const [sayacBittiCumle, setSayacBittiCumle] = useState(ilkAyar.sayac_bitti_cumle ?? "");

  // Otomatik kaydetme - etkinlik alanlari
  const etkinlikDegisti =
    es1Ad !== ilkEtkinlik.es1_ad ||
    es2Ad !== ilkEtkinlik.es2_ad ||
    tarih !== yereleCevir(ilkEtkinlik.etkinlik_tarihi);

  async function etkinlikKaydet(): Promise<boolean> {
    if (es1Ad.trim().length < 2 || es2Ad.trim().length < 2) {
      toast.error("İki eş adı da en az 2 karakter olmalı.");
      return false;
    }
    const c = await api.etkinlikGuncelle(ilkEtkinlik.id, {
      es1Ad: es1Ad.trim(),
      es2Ad: es2Ad.trim(),
      etkinlikTarihi: new Date(tarih).toISOString(),
    });
    if (!c.ok) {
      toast.error(c.mesaj);
      return false;
    }
    return true;
  }

  // Otomatik kaydetme - ayar alanlari (davetli + sayac)
  const ayarDegisti =
    karsilama !== (ilkAyar.karsilama_metni ?? "") ||
    prompt !== (ilkAyar.prompt_metni ?? "") ||
    gun !== String(ilkAyar.kapanis_pencere_gun) ||
    sayacAktif !== ilkAyar.sayac_aktif ||
    sayacAktifCumle !== (ilkAyar.sayac_aktif_cumle ?? "") ||
    sayacBittiCumle !== (ilkAyar.sayac_bitti_cumle ?? "");

  async function ayarKaydet(): Promise<boolean> {
    const g = parseInt(gun, 10);
    if (isNaN(g) || g < VARSAYILAN.minKapanisPencereGun || g > VARSAYILAN.maxKapanisPencereGun) {
      toast.error(`Kapanış penceresi en az ${VARSAYILAN.minKapanisPencereGun} gün olmalı.`);
      return false;
    }
    const c = await api.etkinlikAyarGuncelle({
      karsilamaMetni: karsilama,
      promptMetni: prompt,
      kapanisPencereGun: g,
      sayacAktif,
      sayacAktifCumle,
      sayacBittiCumle,
    });
    if (!c.ok) {
      toast.error(c.mesaj);
      return false;
    }
    return true;
  }

  const etkDurum = useOtoKaydet(
    JSON.stringify({ es1Ad, es2Ad, tarih }),
    etkinlikDegisti,
    etkinlikKaydet
  );
  const ayarDurum = useOtoKaydet(
    JSON.stringify({ karsilama, prompt, gun, sayacAktif, sayacAktifCumle, sayacBittiCumle }),
    ayarDegisti,
    ayarKaydet
  );
  // Aktif sekmeye gore gosterge
  const gosterge = otoKayitEtiket(sekme === "etkinlik" ? etkDurum : ayarDurum);

  return (
    <AppShell>
      {/* Ust barda baslik var - burada yalniz kisa yonlendirme */}
      <p className="metin-yasli font-govde text-sm leading-relaxed text-ikincil">
        Değişiklikler otomatik kaydedilir ve sağdaki önizlemede anında görünür.
      </p>

      {/* Sekmeler */}
      <div className="mt-5 flex gap-1 rounded-full border border-ayrac bg-yuzey p-1">
        {SEKMELER.map((s) => (
          <button
            key={s.kod}
            onClick={() => setSekme(s.kod)}
            className={`flex-1 rounded-full px-3 py-2.5 font-govde text-sm transition-colors ${
              sekme === s.kod ? "bg-sarap text-parsomen" : "text-ikincil hover:text-murekkep"
            }`}
          >
            {s.etiket}
          </button>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* SOL - duzenleme */}
        <div className="rounded-3xl border border-ayrac bg-yuzey p-6 sm:p-8">
          {sekme === "etkinlik" && (
            <div className="space-y-5">
              <Alan etiket="Birinci eş adı">
                <input
                  value={es1Ad}
                  onChange={(e) => setEs1Ad(e.target.value)}
                  className={girdiSinif}
                />
              </Alan>
              <Alan etiket="İkinci eş adı">
                <input
                  value={es2Ad}
                  onChange={(e) => setEs2Ad(e.target.value)}
                  className={girdiSinif}
                />
              </Alan>
              <Alan etiket="Etkinlik tarihi ve saati">
                <input
                  type="datetime-local"
                  value={tarih}
                  onChange={(e) => setTarih(e.target.value)}
                  className={girdiSinif}
                />
              </Alan>
              <p className="font-govde text-xs text-ikincil">
                Etkinlik türü ({turEtiketi(ilkEtkinlik.tur)}) oluşturulduktan sonra
                değiştirilemez.
              </p>
            </div>
          )}

          {sekme === "davetli" && (
            <div className="space-y-5">
              <Alan
                etiket="Karşılama metni"
                sifirla={() => setKarsilama(ilkAyar.karsilama_metni ?? "")}
              >
                <textarea
                  value={karsilama}
                  onChange={(e) => setKarsilama(e.target.value)}
                  rows={4}
                  className={girdiSinif}
                />
              </Alan>
              <Alan etiket="Yönlendirici metin">
                <input
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className={girdiSinif}
                />
              </Alan>
              <Alan etiket="Kapanış penceresi (gün)">
                <input
                  type="number"
                  min={VARSAYILAN.minKapanisPencereGun}
                  max={VARSAYILAN.maxKapanisPencereGun}
                  value={gun}
                  onChange={(e) => setGun(e.target.value)}
                  className={girdiSinif + " w-40"}
                />
                <p className="mt-2 font-govde text-xs text-ikincil">
                  Etkinlik tarihinden sonra bu kadar gün dilek toplanır. Minimum{" "}
                  {VARSAYILAN.minKapanisPencereGun} gün.
                </p>
              </Alan>
            </div>
          )}

          {sekme === "sayac" && (
            <div className="space-y-5">
              {/* Acik/Kapali toggle (true/false yazimi YOK) */}
              <div className="flex items-center justify-between gap-3 rounded-xl border border-ayrac bg-parsomen px-4 py-3">
                <div>
                  <p className="font-govde text-sm font-medium text-murekkep">
                    Geri sayım {sayacAktif ? "açık" : "kapalı"}
                  </p>
                  <p className="mt-0.5 font-govde text-xs text-ikincil">
                    Davetli ekranında etkinliğe kalan süre gösterilir.
                  </p>
                </div>
                <button
                  role="switch"
                  aria-checked={sayacAktif}
                  onClick={() => setSayacAktif((v) => !v)}
                  className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                    sayacAktif ? "bg-sarap" : "bg-ayrac"
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-parsomen shadow-sm transition-transform ${
                      sayacAktif ? "translate-x-5" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>

              {sayacAktif && (
                <>
                  <Alan etiket="Sayaç cümlesi (tarih gelmeden)">
                    <input
                      value={sayacAktifCumle}
                      onChange={(e) => setSayacAktifCumle(e.target.value)}
                      placeholder="Düğünümüze kalan süre"
                      className={girdiSinif}
                    />
                  </Alan>
                  <Alan etiket="Sayaç cümlesi (tarih geçtikten sonra)">
                    <input
                      value={sayacBittiCumle}
                      onChange={(e) => setSayacBittiCumle(e.target.value)}
                      placeholder="Bugün en güzel günümüz"
                      className={girdiSinif}
                    />
                  </Alan>
                </>
              )}
            </div>
          )}
        </div>

        {/* SAG - CANLI ONIZLEME (her sekmede) */}
        <div>
          <p className="mb-3 font-govde text-xs uppercase tracking-etiket text-ikincil">
            Canlı önizleme
          </p>
          <div className="rounded-3xl border border-ayrac bg-parsomen p-5">
            <Onizleme
              es1Ad={es1Ad}
              es2Ad={es2Ad}
              tarih={tarih}
              karsilama={karsilama}
              prompt={prompt}
              sayacAktif={sayacAktif}
              sayacAktifCumle={sayacAktifCumle}
              sayacBittiCumle={sayacBittiCumle}
              gorseller={gorseller}
            />
          </div>
        </div>
      </div>

      <DurumBandiBoslugu />

      <DurumBandi
        metin={gosterge?.metin ?? "Tüm değişiklikler kayıtlı"}
        sinif={gosterge?.sinif}
      />
    </AppShell>
  );
}

const girdiSinif =
  "w-full rounded-xl border border-ayrac bg-parsomen px-4 py-3 font-govde text-sm text-murekkep outline-none focus:border-sarap";

function Alan({
  etiket,
  sifirla,
  children,
}: {
  etiket: string;
  sifirla?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <label className="font-govde text-xs uppercase tracking-etiket text-ikincil">
          {etiket}
        </label>
        {sifirla && (
          <button
            type="button"
            onClick={sifirla}
            className="font-govde text-xs text-sarap transition-colors hover:underline"
          >
            Geri al
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

// ---- CANLI ONIZLEME ----
// DAVETLI EKRANI ONIZLEMESI
//
// GERCEK ekranin AYNISI: DavetliKarsilama bileseni, davetlinin gordugu sayfayla
// BIREBIR ayni koddan gelir - film seridi, animasyon, tipografi, sayac, prompt.
//
// Onceki surumde burada gercegi "taklit eden" ayri bir dizgi vardi: film seridi
// yoktu, cift adi kucuktu. Cift, gonderdigi linkin nasil gorunecegini YANLIS
// biliyordu. Iki dizgi kacinilmaz olarak ayrisir; tek bilesen ayrisamaz.
function Onizleme({
  es1Ad,
  es2Ad,
  tarih,
  karsilama,
  prompt,
  sayacAktif,
  sayacAktifCumle,
  sayacBittiCumle,
  gorseller,
}: {
  es1Ad: string;
  es2Ad: string;
  tarih: string;
  karsilama: string;
  prompt: string;
  sayacAktif: boolean;
  sayacAktifCumle: string;
  sayacBittiCumle: string;
  gorseller: KarsilamaGorseli[];
}) {
  const ciftAdi = `${es1Ad} & ${es2Ad}`.trim();

  return (
    <div className="overflow-hidden rounded-3xl border border-ayrac bg-yuzey">
      <DavetliKarsilama
        ciftAdi={ciftAdi}
        karsilama={karsilama}
        promptMetni={prompt || null}
        gorseller={gorseller}
        sayacAktif={sayacAktif}
        etkinlikTarihi={tarih}
        sayacAktifCumle={sayacAktifCumle || null}
        sayacBittiCumle={sayacBittiCumle || null}
      />

      {/* Formun basi - davetli burada dilegini yazar (onizlemede kisaltilmis) */}
      <div className="border-t border-ayrac px-8 py-6">
        <p className="font-govde text-xs text-ikincil">Adın Soyadın</p>
        <div className="mt-1 h-10 rounded-xl border border-ayrac bg-parsomen" />
        <p className="mt-3 font-govde text-xs text-ikincil">Mesajın</p>
        <div className="mt-1 h-16 rounded-xl border border-ayrac bg-parsomen" />
        <div className="mt-4 h-10 rounded-full bg-sarap/90" />
      </div>
    </div>
  );
}


function yereleCevir(iso: string): string {
  const t = new Date(iso);
  if (isNaN(t.getTime())) return "";
  const p = (n: number) => n.toString().padStart(2, "0");
  return `${t.getFullYear()}-${p(t.getMonth() + 1)}-${p(t.getDate())}T${p(t.getHours())}:${p(t.getMinutes())}`;
}

function tarihMetni(deger: string): string {
  const t = new Date(deger);
  if (isNaN(t.getTime())) return "Tarih seçilmedi";
  return t.toLocaleString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function turEtiketi(tur: string): string {
  if (tur === "dugun") return "Düğün";
  if (tur === "nisan") return "Nişan";
  if (tur === "nikah") return "Nikah";
  return tur;
}
