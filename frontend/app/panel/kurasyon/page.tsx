"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api, defteriIndir, type Kurasyon, type KurasyonOgesi } from "@/lib/api";
import { AppShell } from "@/components/site/AppShell";
import { useOtoKaydet, otoKayitEtiket } from "@/lib/oto-kaydet";

// KURASYON STUDYOSU (Belge 03 - Akis 6): "Toplayici degil, kurasyon studyosu."
// Sol: kurgu (dilek secimi/sira, kapak, ithaf, tema, gruplama)
// Sag: CANLI ESER ONIZLEMESI (gercek sayfa gorunumu - kagit hissi)
type Sekme = "dilekler" | "kapak" | "duzen";

const SEKMELER: { kod: Sekme; etiket: string }[] = [
  { kod: "dilekler", etiket: "Dilekler" },
  { kod: "kapak", etiket: "Kapak & İthaf" },
  { kod: "duzen", etiket: "Düzen" },
];

const TEMALAR: { kod: string; ad: string; aciklama: string }[] = [
  { kod: "klasik", ad: "Klasik", aciklama: "Ortalı, süslü ayraçlar, zamansız" },
  { kod: "modern", ad: "Modern", aciklama: "Sola yaslı, geniş boşluk, sade" },
  { kod: "zarif", ad: "Zarif", aciklama: "İtalik başlıklar, ince yaldız vurgular" },
];

export default function KurasyonSayfasi() {
  const router = useRouter();
  const [veri, setVeri] = useState<Kurasyon | null>(null);
  const [durum, setDurum] = useState<"yukleniyor" | "hazir" | "yok">("yukleniyor");

  const cek = useCallback(async () => {
    const c = await api.kurasyonGetir();
    if (!c.ok) {
      if (c.durum === 401) router.replace("/giris");
      else setDurum("yok");
      return;
    }
    setVeri(c.veri);
    setDurum("hazir");
  }, [router]);

  useEffect(() => {
    void cek();
  }, [cek]);

  if (durum === "yukleniyor") {
    return (
      <AppShell>
        <div className="flex min-h-[50vh] items-center justify-center font-govde text-sm text-ikincil">
          Stüdyo hazırlanıyor...
        </div>
      </AppShell>
    );
  }

  if (durum === "yok" || !veri) {
    return (
      <AppShell>
        <div className="rounded-3xl border border-ayrac bg-yuzey p-10 text-center">
          <p className="font-govde text-sm text-ikincil">Aktif bir etkinlik seçili değil.</p>
        </div>
      </AppShell>
    );
  }

  return <Studyo ilk={veri} yenile={cek} />;
}

function Studyo({ ilk, yenile }: { ilk: Kurasyon; yenile: () => Promise<void> }) {
  const [sekme, setSekme] = useState<Sekme>("dilekler");

  // Kurgu alanlari
  const [tema, setTema] = useState(ilk.tema);
  const [gruplama, setGruplama] = useState(ilk.gruplama_tipi);
  const [kapakBaslik, setKapakBaslik] = useState(ilk.kapak_baslik ?? "");
  const [kapakAltBaslik, setKapakAltBaslik] = useState(ilk.kapak_alt_baslik ?? "");
  const [ithaf, setIthaf] = useState(ilk.ithaf_metni ?? "");
  const [kapanis, setKapanis] = useState(ilk.kapanis_metni ?? "");
  const [tarihGoster, setTarihGoster] = useState(ilk.tarih_goster);

  // Ogeler (yerel - anlik guncelleme)
  const [ogeler, setOgeler] = useState<KurasyonOgesi[]>(ilk.ogeler);
  const [tamamlaniyor, setTamamlaniyor] = useState(false);
  const [uretiliyor, setUretiliyor] = useState<"onizleme" | "baski" | null>(null);
  const [tamamlandi, setTamamlandi] = useState(ilk.durum === "tamamlandi");

  const degisti =
    tema !== ilk.tema ||
    gruplama !== ilk.gruplama_tipi ||
    kapakBaslik !== (ilk.kapak_baslik ?? "") ||
    kapakAltBaslik !== (ilk.kapak_alt_baslik ?? "") ||
    ithaf !== (ilk.ithaf_metni ?? "") ||
    kapanis !== (ilk.kapanis_metni ?? "") ||
    tarihGoster !== ilk.tarih_goster;

  async function kaydet(): Promise<boolean> {
    const c = await api.kurasyonGuncelle({
      tema,
      gruplamaTipi: gruplama,
      kapakBaslik,
      kapakAltBaslik,
      ithafMetni: ithaf,
      kapanisMetni: kapanis,
      tarihGoster,
    });
    if (!c.ok) {
      toast.error(c.mesaj);
      return false;
    }
    return true;
  }

  const kayitDurum = useOtoKaydet(
    JSON.stringify({ tema, gruplama, kapakBaslik, kapakAltBaslik, ithaf, kapanis, tarihGoster }),
    degisti,
    kaydet
  );
  const gosterge = otoKayitEtiket(kayitDurum);

  // ---- Oge islemleri (anlik) ----
  async function dahilTersle(o: KurasyonOgesi) {
    const yeni = !o.dahil;
    setOgeler((liste) =>
      liste.map((x) => (x.katki_id === o.katki_id ? { ...x, dahil: yeni } : x))
    );
    const c = await api.kurasyonOgeGuncelle(o.katki_id, { dahil: yeni });
    if (!c.ok) {
      toast.error(c.mesaj);
      setOgeler((liste) =>
        liste.map((x) => (x.katki_id === o.katki_id ? { ...x, dahil: !yeni } : x))
      );
    }
  }

  async function tasi(index: number, yon: -1 | 1) {
    const hedef = index + yon;
    if (hedef < 0 || hedef >= ogeler.length) return;
    const yeniListe = [...ogeler];
    [yeniListe[index], yeniListe[hedef]] = [yeniListe[hedef], yeniListe[index]];
    setOgeler(yeniListe);
    const c = await api.kurasyonSirala(yeniListe.map((o) => o.katki_id));
    if (!c.ok) {
      toast.error(c.mesaj);
      setOgeler(ogeler);
    }
  }

  async function defterUret(onizleme: boolean) {
    setUretiliyor(onizleme ? "onizleme" : "baski");
    const c = await defteriIndir(onizleme);
    setUretiliyor(null);
    if (!c.ok) {
      toast.error(c.mesaj);
      return;
    }
    toast.success(
      onizleme
        ? "Önizleme indirildi - filigranlı, baskıya uygun değil."
        : "Baskıya hazır defterin indirildi."
    );
  }

  async function mirasiTamamla() {
    setTamamlaniyor(true);
    const c = await api.kurasyonTamamla();
    setTamamlaniyor(false);
    if (!c.ok) {
      toast.error(c.mesaj);
      return;
    }
    setTamamlandi(true);
    toast.success(`Mirasın hazır - ${c.veri.dilek_sayisi} dilek esere alındı.`);
    void yenile();
  }

  const dahilOgeler = useMemo(() => ogeler.filter((o) => o.dahil), [ogeler]);

  return (
    <AppShell>
      {/* Baglam + ilerleme */}
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-yaldiz" aria-hidden />
          <p className="truncate font-govde text-xs uppercase tracking-etiket text-ikincil">
            {ilk.es1_ad} &amp; {ilk.es2_ad}
          </p>
        </div>
        <p className="font-govde text-xs text-ikincil">
          <span className="font-medium text-murekkep">{dahilOgeler.length}</span> dilek esere
          alındı
          {ogeler.length > dahilOgeler.length && (
            <span> · {ogeler.length - dahilOgeler.length} elendi</span>
          )}
        </p>
      </div>

      <p className="metin-yasli mt-3 font-govde text-sm leading-relaxed text-ikincil">
        Burası kürasyon stüdyosu: toplanan dilekleri seçer, sıralar ve baskıya hazır bir
        mirasa dönüştürürsün. Dileklerin metnine dokunulmaz - yalnız hangisi, hangi sırayla
        ve nasıl bir düzende yer alacağına karar verirsin.
      </p>

      {/* Sekmeler */}
      <div className="mt-5 flex min-w-0 gap-1 rounded-full border border-ayrac bg-yuzey p-1">
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
        {/* ---------- SOL: KURGU ---------- */}
        <div className="min-w-0 rounded-3xl border border-ayrac bg-yuzey p-6 sm:p-8">
          {sekme === "dilekler" && (
            <div>
              <p className="font-govde text-xs uppercase tracking-etiket text-ikincil">
                Esere girecek dilekler
              </p>
              <p className="metin-yasli mt-2 font-govde text-xs leading-relaxed text-ikincil">
                Kürasyon eleme demektir. Her dileği esere almak zorunda değilsin; çıkardıkların
                defterinde durmaya devam eder, yalnız baskıya girmez.
              </p>

              {ogeler.length === 0 ? (
                <p className="mt-6 rounded-2xl border border-dashed border-ayrac bg-parsomen px-6 py-10 text-center font-govde text-sm text-ikincil">
                  Henüz onaylanmış dilek yok. Onayladığın dilekler buraya düşer.
                </p>
              ) : (
                <div className="mt-5 space-y-2">
                  {ogeler.map((o, i) => (
                    <div
                      key={o.katki_id}
                      className={`min-w-0 rounded-2xl border p-4 transition-opacity ${
                        o.dahil
                          ? "border-ayrac bg-parsomen"
                          : "border-dashed border-ayrac bg-parsomen/50 opacity-60"
                      }`}
                    >
                      <div className="flex min-w-0 items-start gap-3">
                        {/* Dahil/haric */}
                        <button
                          onClick={() => dahilTersle(o)}
                          aria-label={o.dahil ? "Eserden çıkar" : "Esere al"}
                          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
                            o.dahil
                              ? "border-sarap bg-sarap text-parsomen"
                              : "border-ayrac bg-parsomen text-transparent"
                          }`}
                        >
                          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" aria-hidden>
                            <path
                              d="m6 12.5 3.5 3.5L18 7.5"
                              stroke="currentColor"
                              strokeWidth={2.4}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              fill="none"
                            />
                          </svg>
                        </button>

                        <div className="min-w-0 flex-1">
                          <div className="flex min-w-0 items-center justify-between gap-2">
                            <p className="truncate font-govde text-xs uppercase tracking-etiket text-yaldiz">
                              {o.davetli_ad}
                            </p>
                            <span className="shrink-0 font-govde text-[0.6rem] uppercase tracking-etiket text-ikincil">
                              {tarafEtiketi(o.kaynak_es, ilk.es1_ad, ilk.es2_ad)}
                            </span>
                          </div>
                          <p className="metin-yasli mt-1.5 font-govde text-sm leading-relaxed text-murekkep">
                            {o.mesaj}
                          </p>
                        </div>

                        {/* Sira */}
                        <div className="flex shrink-0 flex-col gap-1">
                          <button
                            onClick={() => tasi(i, -1)}
                            disabled={i === 0}
                            aria-label="Yukarı taşı"
                            className="rounded-md border border-ayrac p-1 text-ikincil transition-colors hover:border-sarap hover:text-sarap disabled:opacity-30"
                          >
                            <svg viewBox="0 0 24 24" className="h-3 w-3" aria-hidden>
                              <path d="m6 15 6-6 6 6" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
                            </svg>
                          </button>
                          <button
                            onClick={() => tasi(i, 1)}
                            disabled={i === ogeler.length - 1}
                            aria-label="Aşağı taşı"
                            className="rounded-md border border-ayrac p-1 text-ikincil transition-colors hover:border-sarap hover:text-sarap disabled:opacity-30"
                          >
                            <svg viewBox="0 0 24 24" className="h-3 w-3" aria-hidden>
                              <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {sekme === "kapak" && (
            <div className="space-y-5">
              <Alan etiket="Kapak başlığı">
                <input
                  value={kapakBaslik}
                  onChange={(e) => setKapakBaslik(e.target.value)}
                  className={girdi}
                />
              </Alan>
              <Alan etiket="Kapak alt başlığı">
                <input
                  value={kapakAltBaslik}
                  onChange={(e) => setKapakAltBaslik(e.target.value)}
                  className={girdi}
                />
              </Alan>
              <Alan etiket="İthaf sayfası">
                <textarea
                  value={ithaf}
                  onChange={(e) => setIthaf(e.target.value)}
                  rows={5}
                  className={girdi}
                />
                <p className="mt-2 font-govde text-xs text-ikincil">
                  Defterin ilk sayfası. Kendi sözlerinle yaz - mirasa ruhunu veren yer burası.
                </p>
              </Alan>
              <Alan etiket="Kapanış sayfası">
                <textarea
                  value={kapanis}
                  onChange={(e) => setKapanis(e.target.value)}
                  rows={3}
                  className={girdi}
                />
              </Alan>
            </div>
          )}

          {sekme === "duzen" && (
            <div className="space-y-6">
              {/* Tema */}
              <div>
                <p className="mb-2 font-govde text-xs uppercase tracking-etiket text-ikincil">
                  Editöryel şablon
                </p>
                <div className="space-y-2">
                  {TEMALAR.map((t) => (
                    <button
                      key={t.kod}
                      onClick={() => setTema(t.kod)}
                      className={`flex w-full min-w-0 items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
                        tema === t.kod
                          ? "border-sarap bg-sarap/5"
                          : "border-ayrac bg-parsomen hover:border-sarap/40"
                      }`}
                    >
                      <span className="min-w-0">
                        <span
                          className={`block font-display text-base ${
                            tema === t.kod ? "text-sarap" : "text-murekkep"
                          }`}
                        >
                          {t.ad}
                        </span>
                        <span className="block truncate font-govde text-xs text-ikincil">
                          {t.aciklama}
                        </span>
                      </span>
                      {tema === t.kod && (
                        <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-sarap" aria-hidden>
                          <path d="m6 12.5 3.5 3.5L18 7.5" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Gruplama */}
              <div>
                <p className="mb-2 font-govde text-xs uppercase tracking-etiket text-ikincil">
                  Dilekler nasıl gruplansın?
                </p>
                <div className="space-y-2">
                  <SecimSatiri
                    secili={gruplama === "taraf"}
                    onClick={() => setGruplama("taraf")}
                    baslik="Taraflara göre"
                    aciklama={`"${ilk.es1_ad} tarafından" ve "${ilk.es2_ad} tarafından" bölümleri`}
                  />
                  <SecimSatiri
                    secili={gruplama === "kronolojik"}
                    onClick={() => setGruplama("kronolojik")}
                    baslik="Kronolojik"
                    aciklama="Bırakılma sırasına göre, bölümsüz akış"
                  />
                </div>
              </div>

              {/* Tarih gosterimi */}
              <div className="flex items-center justify-between gap-3 rounded-xl border border-ayrac bg-parsomen px-4 py-3">
                <div className="min-w-0">
                  <p className="font-govde text-sm font-medium text-murekkep">
                    Tarihleri göster
                  </p>
                  <p className="mt-0.5 font-govde text-xs text-ikincil">
                    Her dileğin altında bırakıldığı tarih yazar - yıllar sonra anlam kazanır.
                  </p>
                </div>
                <button
                  role="switch"
                  aria-checked={tarihGoster}
                  onClick={() => setTarihGoster((v) => !v)}
                  className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                    tarihGoster ? "bg-sarap" : "bg-ayrac"
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-parsomen shadow-sm transition-transform ${
                      tarihGoster ? "translate-x-5" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ---------- SAG: CANLI ESER ONIZLEMESI ---------- */}
        <div className="min-w-0">
          <p className="mb-3 font-govde text-xs uppercase tracking-etiket text-ikincil">
            Eserin canlı önizlemesi
          </p>
          <EserOnizleme
            tema={tema}
            gruplama={gruplama}
            kapakBaslik={kapakBaslik}
            kapakAltBaslik={kapakAltBaslik}
            ithaf={ithaf}
            kapanis={kapanis}
            ogeler={dahilOgeler}
            gorseller={ilk.gorseller}
            tarihGoster={tarihGoster}
            es1Ad={ilk.es1_ad}
            es2Ad={ilk.es2_ad}
            sekme={sekme}
          />
        </div>
      </div>

      {/* CIKTI MERKEZI - eserin kagida dokuldugu yer */}
      <div className="mt-6 rounded-3xl border border-yaldiz/40 bg-yaldiz/5 p-6 sm:p-8">
        <div className="text-center">
          <p className="font-display text-xl text-murekkep">
            {tamamlandi ? "Mirasın hazır" : "Eserini kağıda dök"}
          </p>
          <p className="metin-yasli mx-auto mt-2 max-w-lg font-govde text-sm leading-relaxed text-ikincil">
            {dahilOgeler.length} dilek, seçtiğin düzenle baskıya hazır bir deftere dönüşür.
            Gerçek tipografi, kitap ölçüsü ve cilt payıyla - matbaaya doğrudan verebilirsin.
          </p>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {/* Onizleme (filigranli) */}
          <button
            onClick={() => defterUret(true)}
            disabled={uretiliyor !== null || dahilOgeler.length === 0}
            className="flex min-w-0 items-center gap-3 rounded-2xl border border-ayrac bg-yuzey p-5 text-left transition-colors hover:border-sarap disabled:opacity-50"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ikincil/10 text-ikincil">
              <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
                <path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6-10-6-10-6Z" stroke="currentColor" strokeWidth={1.6} fill="none" />
                <circle cx="12" cy="12" r="2.6" stroke="currentColor" strokeWidth={1.6} fill="none" />
              </svg>
            </span>
            <span className="min-w-0">
              <span className="block font-govde text-sm font-medium text-murekkep">
                {uretiliyor === "onizleme" ? "Hazırlanıyor..." : "Önizlemeyi indir"}
              </span>
              <span className="block font-govde text-xs text-ikincil">
                Filigranlı - kalitesini gör, sonra karar ver
              </span>
            </span>
          </button>

          {/* Baskiya hazir */}
          <button
            onClick={() => defterUret(false)}
            disabled={uretiliyor !== null || dahilOgeler.length === 0}
            className="flex min-w-0 items-center gap-3 rounded-2xl bg-sarap p-5 text-left transition-colors hover:bg-sarapKoyu disabled:opacity-50"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-parsomen/20 text-parsomen">
              <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
                <path d="M12 3v11m0 0 4-4m-4 4-4-4" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" fill="none" />
                <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" fill="none" />
              </svg>
            </span>
            <span className="min-w-0">
              <span className="block font-govde text-sm font-medium text-parsomen">
                {uretiliyor === "baski" ? "Eser hazırlanıyor..." : "Baskıya hazır defteri indir"}
              </span>
              <span className="block font-govde text-xs text-parsomen/75">
                A5, cilt paylı, gömülü tipografi - matbaaya hazır
              </span>
            </span>
          </button>
        </div>

        {/* Muhurleme */}
        {!tamamlandi && (
          <div className="mt-5 border-t border-yaldiz/30 pt-5 text-center">
            <p className="metin-yasli mx-auto max-w-md font-govde text-xs leading-relaxed text-ikincil">
              Kurgun bittiğinde mirasını mühürle. Bu bir kilit değil, bir imza - sonrasında
              da düzenlemeye devam edebilirsin.
            </p>
            <button
              onClick={mirasiTamamla}
              disabled={tamamlaniyor || dahilOgeler.length === 0}
              className="mt-3 rounded-full border border-sarap px-7 py-2.5 font-govde text-sm font-medium text-sarap transition-colors hover:bg-sarap/10 disabled:opacity-50"
            >
              {tamamlaniyor ? "Mühürleniyor..." : "Mirasımı tamamla"}
            </button>
          </div>
        )}
      </div>

      {/* Alt sabit durum bari */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-ayrac bg-parsomen/90 backdrop-blur">
        <div className="mx-auto flex max-w-icerik items-center justify-between px-5 py-2.5 sm:px-6">
          <span className={`font-govde text-xs ${gosterge?.sinif ?? "text-ikincil"}`}>
            {gosterge?.metin ?? "Tüm değişiklikler kayıtlı"}
          </span>
        </div>
      </div>
    </AppShell>
  );
}

// ================= CANLI ESER ONIZLEMESI =================
// Gercek sayfa hissi: kagit yuzeyi, editoryel tipografi, tema-bazli duzen.
function EserOnizleme({
  tema,
  gruplama,
  kapakBaslik,
  kapakAltBaslik,
  ithaf,
  kapanis,
  ogeler,
  es1Ad,
  es2Ad,
  sekme,
  gorseller,
  tarihGoster,
}: {
  tema: string;
  gruplama: string;
  kapakBaslik: string;
  kapakAltBaslik: string;
  ithaf: string;
  kapanis: string;
  ogeler: KurasyonOgesi[];
  es1Ad: string;
  es2Ad: string;
  sekme: Sekme;
  gorseller: { url: string; konum: string }[];
  tarihGoster: boolean;
}) {
  // Kapak sekmesinde kapak sayfasi, digerlerinde ic sayfa gosterilir
  const kapakGoster = sekme === "kapak";

  const gruplu = useMemo(() => {
    if (gruplama !== "taraf") return [{ baslik: null as string | null, ogeler }];
    const es1 = ogeler.filter((o) => o.kaynak_es === "es1");
    const es2 = ogeler.filter((o) => o.kaynak_es === "es2");
    const bloklar: { baslik: string | null; ogeler: KurasyonOgesi[] }[] = [];
    if (es1.length) bloklar.push({ baslik: `${es1Ad} tarafından`, ogeler: es1 });
    if (es2.length) bloklar.push({ baslik: `${es2Ad} tarafından`, ogeler: es2 });
    return bloklar.length ? bloklar : [{ baslik: null, ogeler }];
  }, [gruplama, ogeler, es1Ad, es2Ad]);

  return (
    <div className="min-w-0 rounded-3xl border border-ayrac bg-parsomen p-4 sm:p-5">
      {/* Sayfa - kagit yuzeyi */}
      <div className="mx-auto min-w-0 max-w-md rounded-lg bg-[#fdf9f0] p-7 shadow-[0_6px_24px_rgba(0,0,0,0.12)] sm:p-9">
        {kapakGoster ? (
          <KapakSayfasi
            tema={tema}
            baslik={kapakBaslik}
            altBaslik={kapakAltBaslik}
            ithaf={ithaf}
            kapakGorsel={gorseller.find((g) => g.konum === "kapak")?.url ?? null}
          />
        ) : (
          <IcSayfa
            tema={tema}
            gruplu={gruplu}
            kapanis={kapanis}
            tarihGoster={tarihGoster}
          />
        )}
      </div>

      <p className="mt-3 text-center font-govde text-[0.65rem] uppercase tracking-etiket text-ikincil">
        {kapakGoster ? "Kapak + ithaf" : `${ogeler.length} dilek · baskıya hazır düzen`}
      </p>
    </div>
  );
}

function KapakSayfasi({
  tema,
  baslik,
  altBaslik,
  ithaf,
  kapakGorsel,
}: {
  tema: string;
  baslik: string;
  altBaslik: string;
  ithaf: string;
  kapakGorsel: string | null;
}) {
  const ortali = tema !== "modern";
  const italik = tema === "zarif";

  return (
    <div className={`text-[#211a17] ${ortali ? "text-center" : "text-left"}`}>
      {/* KAPAK FOTOGRAFI - muze cercevesi (yaldiz hat + pasepartu) */}
      {kapakGorsel && (
        <div className={`mb-7 ${ortali ? "mx-auto" : ""} w-fit`}>
          <div className="border border-[#a8823c] bg-white p-1.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={kapakGorsel}
              alt=""
              className="max-h-44 w-auto max-w-full object-contain"
            />
          </div>
        </div>
      )}

      {/* Ust ayrac */}
      {tema === "klasik" && (
        <div className="mx-auto mb-8 flex items-center justify-center gap-2">
          <span className="h-px w-8 bg-[#a8823c]" />
          <span className="h-1 w-1 rotate-45 bg-[#a8823c]" />
          <span className="h-px w-8 bg-[#a8823c]" />
        </div>
      )}
      {tema === "zarif" && <div className="mb-8 h-px w-full bg-[#a8823c]/40" />}

      <p
        className={`font-display leading-tight text-[#6e2438] ${
          italik ? "italic" : ""
        } text-3xl`}
      >
        {baslik || "Kapak başlığı"}
      </p>

      <p className="mt-3 font-govde text-[0.7rem] uppercase tracking-[0.2em] text-[#6c5f50]">
        {altBaslik || "Tarih ve tür"}
      </p>

      {/* Ithaf */}
      {ithaf && (
        <>
          <div
            className={`my-8 h-px ${ortali ? "mx-auto w-16" : "w-16"} bg-[#a8823c]/50`}
          />
          <p
            className={`font-govde text-[0.8rem] leading-relaxed text-[#3a2f28] ${
              ortali ? "text-center" : "text-justify"
            } ${italik ? "italic" : ""}`}
          >
            {ithaf}
          </p>
        </>
      )}

      {/* Marka kilidi - miras ani */}
      <div className="mt-10 flex flex-col items-center gap-0.5">
        <p className="font-display text-sm text-[#6e2438]">Bi Anı Bırak</p>
        <p className="font-govde text-[0.55rem] uppercase tracking-[0.25em] text-[#a8823c]">
          Senden Bize Kalan
        </p>
      </div>
    </div>
  );
}

function IcSayfa({
  tema,
  gruplu,
  kapanis,
  tarihGoster,
}: {
  tema: string;
  gruplu: { baslik: string | null; ogeler: KurasyonOgesi[] }[];
  kapanis: string;
  tarihGoster: boolean;
}) {
  const italik = tema === "zarif";
  const ortali = tema !== "modern";

  if (gruplu.every((g) => g.ogeler.length === 0)) {
    return (
      <p className="py-16 text-center font-display text-lg italic text-[#6c5f50]">
        Esere henüz dilek alınmadı
      </p>
    );
  }

  return (
    <div className="text-[#211a17]">
      {gruplu.map((grup, gi) => (
        <div key={gi} className={gi > 0 ? "mt-9" : ""}>
          {grup.baslik && (
            <div className={ortali ? "text-center" : "text-left"}>
              <p
                className={`font-display text-base text-[#6e2438] ${italik ? "italic" : ""}`}
              >
                {grup.baslik}
              </p>
              <div
                className={`mt-2 h-px ${ortali ? "mx-auto w-12" : "w-12"} bg-[#a8823c]/50`}
              />
            </div>
          )}

          <div className="mt-5 space-y-6">
            {grup.ogeler.slice(0, 4).map((o) => (
              // DILEK KARTI - fotograf, metin ve imza AYNI cercevede.
              // Sahiplik bir bakista anlasilir (PDF ile birebir ayni kurgu).
              <div
                key={o.katki_id}
                className={`${
                  o.foto_url ? "border border-[#e8dcc4] bg-[#fffdf8] p-3.5" : ""
                } text-center`}
              >
                {o.foto_url && (
                  <div className="mx-auto mb-3 w-fit border border-[#a8823c] bg-white p-1">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={o.foto_url}
                      alt=""
                      className="max-h-36 w-auto max-w-full object-contain"
                    />
                  </div>
                )}

                <p
                  className={`font-govde text-[0.82rem] leading-relaxed text-[#2a221d] ${
                    italik ? "italic" : ""
                  }`}
                >
                  {o.mesaj}
                </p>

                {/* Imza ayraci - metinden NET ayrilir */}
                <div className="mx-auto my-2.5 h-px w-8 bg-[#a8823c]/60" />

                <p className="font-display text-[0.75rem] text-[#6e2438]">{o.davetli_ad}</p>
                {o.davetli_iliski && (
                  <p className="mt-0.5 font-govde text-[0.6rem] text-[#6c5f50]">
                    {o.davetli_iliski}
                  </p>
                )}
                {tarihGoster && (
                  <p className="mt-0.5 font-govde text-[0.55rem] text-[#c9a96a]">
                    {new Date(o.birakilma).toLocaleDateString("tr-TR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                )}
              </div>
            ))}
          </div>

          {grup.ogeler.length > 4 && (
            <p className="mt-5 text-center font-govde text-[0.65rem] italic text-[#6c5f50]">
              ve {grup.ogeler.length - 4} dilek daha...
            </p>
          )}
        </div>
      ))}

      {/* Kapanis */}
      {kapanis && (
        <div className="mt-10 border-t border-[#a8823c]/30 pt-6 text-center">
          <p
            className={`font-govde text-[0.78rem] leading-relaxed text-[#3a2f28] ${
              italik ? "italic" : ""
            }`}
          >
            {kapanis}
          </p>
        </div>
      )}

    </div>
  );
}

// ---- Kucuk bilesenler ----
const girdi =
  "w-full rounded-xl border border-ayrac bg-parsomen px-4 py-3 font-govde text-sm text-murekkep outline-none focus:border-sarap";

function Alan({ etiket, children }: { etiket: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-2 block font-govde text-xs uppercase tracking-etiket text-ikincil">
        {etiket}
      </label>
      {children}
    </div>
  );
}

function SecimSatiri({
  secili,
  onClick,
  baslik,
  aciklama,
}: {
  secili: boolean;
  onClick: () => void;
  baslik: string;
  aciklama: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full min-w-0 items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
        secili ? "border-sarap bg-sarap/5" : "border-ayrac bg-parsomen hover:border-sarap/40"
      }`}
    >
      <span className="min-w-0">
        <span
          className={`block font-govde text-sm font-medium ${
            secili ? "text-sarap" : "text-murekkep"
          }`}
        >
          {baslik}
        </span>
        <span className="block truncate font-govde text-xs text-ikincil">{aciklama}</span>
      </span>
      {secili && (
        <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-sarap" aria-hidden>
          <path d="m6 12.5 3.5 3.5L18 7.5" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
      )}
    </button>
  );
}

function tarafEtiketi(kaynakEs: string, es1Ad: string, es2Ad: string): string {
  return kaynakEs === "es1" ? `${es1Ad} tarafı` : `${es2Ad} tarafı`;
}
