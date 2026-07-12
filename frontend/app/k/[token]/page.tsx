"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api, davetliFotoYukle, type KatkiKarsilama } from "@/lib/api";
import { gorselHazirla } from "@/lib/gorsel";
import { MarkaKilidi } from "@/components/marka/MarkaKilidi";
import { FilmSeridi } from "@/components/site/FilmSeridi";
import { iyelikEki } from "@/lib/es";

// ILISKI TIPLERI (Musa karari).
// Deftere iyelik ekiyle basilir: "Musa'nin Okul Arkadasi".
// Detay alani opsiyoneldir; doldurulursa deftere O yazilir ve dilek zenginlesir:
// "Musa'nin Okul Arkadasi - Universiteden sinif arkadasi" yerine dogrudan
// "Universiteden sinif arkadasi" gibi kendi cumlesi.
const ILISKI_TIPLERI = [
  {
    kod: "calisma",
    etiket: "Çalışma Arkadaşı",
    detaySorusu: "çalışma arkadaşlığını",
    ornek: "Örn: Aynı ekipte üç yıl birlikte çalıştık",
  },
  {
    kod: "okul",
    etiket: "Okul Arkadaşı",
    detaySorusu: "okul arkadaşlığını",
    ornek: "Örn: Üniversiteden sınıf arkadaşı",
  },
  {
    kod: "cocukluk",
    etiket: "Çocukluk Arkadaşı",
    detaySorusu: "çocukluk arkadaşlığını",
    ornek: "Örn: Aynı sokakta büyüdük",
  },
] as const;

// Public davetli katki sayfasi (login YOK; surtunme sifir - Belge 01).
// Karsilama -> form (ad/email/telefon/mesaj + KVKK riza) -> teyit.
// Kapali/acilmamis etkinlik icin nazik ekranlar.
export default function KatkiSayfasi() {
  const params = useParams();
  const token = String(params.token || "");
  const [veri, setVeri] = useState<KatkiKarsilama | null>(null);
  const [durum, setDurum] = useState<"yukleniyor" | "hazir" | "gecersiz">("yukleniyor");
  const [gonderildi, setGonderildi] = useState(false);

  useEffect(() => {
    if (!token) return;
    api.katkiKarsilama(token).then((c) => {
      if (c.ok) {
        setVeri(c.veri);
        setDurum("hazir");
      } else {
        setDurum("gecersiz");
      }
    });
  }, [token]);

  if (durum === "yukleniyor") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-parsomen font-govde text-sm text-ikincil">
        Yükleniyor...
      </main>
    );
  }

  if (durum === "gecersiz" || !veri) {
    return (
      <EkranKabuk>
        <p className="font-display text-xl text-murekkep">Bağlantı bulunamadı</p>
        <p className="mt-3 font-govde text-sm text-ikincil">
          Bu bağlantı geçersiz veya kaldırılmış olabilir.
        </p>
      </EkranKabuk>
    );
  }

  const ciftAdi = `${veri.es1_ad} & ${veri.es2_ad}`;

  // Kapali etkinlik - nazik ekran
  if (veri.kapandi) {
    return (
      <EkranKabuk>
        <p className="font-govde text-xs uppercase tracking-etiket text-yaldiz">
          {ciftAdi}
        </p>
        <p className="mt-4 font-display text-xl text-murekkep">Defter kapandı</p>
        <p className="mt-3 font-govde text-sm text-ikincil">
          Bu anı defteri artık yeni dilek almıyor. İlginiz için teşekkürler.
        </p>
      </EkranKabuk>
    );
  }

  // Henuz acilmamis
  if (!veri.acildi) {
    return (
      <EkranKabuk>
        <p className="font-govde text-xs uppercase tracking-etiket text-yaldiz">
          {ciftAdi}
        </p>
        <p className="mt-4 font-display text-xl text-murekkep">Çok yakında</p>
        <p className="mt-3 font-govde text-sm text-ikincil">
          Bu defter henüz açılmadı. Birazdan tekrar uğrayın.
        </p>
      </EkranKabuk>
    );
  }

  // Teyit ekrani
  if (gonderildi) {
    return (
      <EkranKabuk>
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-sarap/10">
          <span className="font-display text-2xl text-sarap">✓</span>
        </div>
        <p className="mt-5 font-display text-xl text-murekkep">Dileğin iletildi</p>
        <p className="mt-3 font-govde text-sm text-ikincil">
          {ciftAdi} çiftine bıraktığın anı için teşekkürler. Dileğin onlara ulaştı.
        </p>
      </EkranKabuk>
    );
  }

  // Katki formu
  return (
    <KatkiFormu token={token} veri={veri} onGonderildi={() => setGonderildi(true)} />
  );
}

// ---- Ekran kabugu (davetli icin sade, marka anI) ----
function EkranKabuk({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-parsomen px-6 py-16">
      <div className="w-full max-w-md text-center">
        <div className="mb-8 flex justify-center">
          <MarkaKilidi varyant="tam" boyut="kucuk" />
        </div>
        <div className="rounded-3xl border border-ayrac bg-yuzey p-8">{children}</div>
      </div>
    </main>
  );
}

// ---- Katki formu ----
function KatkiFormu({
  token,
  veri,
  onGonderildi,
}: {
  token: string;
  veri: KatkiKarsilama;
  onGonderildi: () => void;
}) {
  const [ad, setAd] = useState("");
  const [email, setEmail] = useState("");
  const [telefon, setTelefon] = useState("");
  const [mesaj, setMesaj] = useState("");
  const [iliski, setIliski] = useState("");
  const [iliskiSerbest, setIliskiSerbest] = useState("");
  const [foto, setFoto] = useState<{
    dosya: File;
    onizleme: string;
    genislik: number;
    yukseklik: number;
  } | null>(null);
  const [riza, setRiza] = useState(false);
  const [hata, setHata] = useState("");
  const [yukleniyor, setYukleniyor] = useState(false);

  const ciftAdi = `${veri.es1_ad} & ${veri.es2_ad}`;
  const karsilama =
    veri.karsilama_metni ||
    "Bu özel günümüzde bize bir anı bırakır mısın?";
  // Davetli hangi esin linkinden geldi? Iliski metni buna gore kurulur.
  const buEs = veri.kaynak_es === "es1" ? veri.es1_ad : veri.es2_ad;

  // ILISKI: acilir menu. Deftere "Musa'nin Okul Arkadasi" olarak basilir.
  // Ilk uc secim detay alani acar - "Universiteden sinif arkadasi" gibi.
  const esIyelik = iyelikEki(buEs); // "Musa'nın" / "Ayşegül'ün"
  const secilenTip = ILISKI_TIPLERI.find((t) => t.kod === iliski) ?? null;

  async function gonder(e: React.FormEvent) {
    e.preventDefault();
    setHata("");
    if (!riza) {
      setHata("Devam etmek için aydınlatma metnini onaylaman gerekir.");
      return;
    }
    if (ad.trim().length < 2) return setHata("Adını yazar mısın?");
    if (!email.includes("@")) return setHata("Geçerli bir e-posta gerekli.");
    if (telefon.trim().length < 7) return setHata("Geçerli bir telefon gerekli.");
    // Deftere basilacak metin:
    //  - Detay yazildiysa O kullanilir (davetlinin kendi cumlesi daha degerli)
    //  - Yazilmadiysa iyelikli tip: "Musa'nin Okul Arkadasi"
    //  - Diger secildiyse serbest metin
    const detay = iliskiSerbest.trim();
    let secilenIliski = "";
    if (iliski === "diger") {
      secilenIliski = detay;
    } else if (secilenTip) {
      secilenIliski = detay.length >= 2 ? detay : `${esIyelik} ${secilenTip.etiket}`;
    }

    if (secilenIliski.length < 2)
      return setHata(`${buEs} ile yakınlığını seçer misin? Bu, seni yıllar sonra hatırlamalarını sağlar.`);
    if (mesaj.trim().length < 2) return setHata("Bir mesaj yazmalısın.");

    setYukleniyor(true);
    const cevap = await api.katkiBirak(token, {
      davetliAd: ad.trim(),
      davetliEmail: email.trim(),
      davetliTelefon: telefon.trim(),
      davetliIliski: secilenIliski,
      mesaj: mesaj.trim(),
    });

    if (!cevap.ok) {
      setYukleniyor(false);
      setHata(cevap.mesaj);
      return;
    }

    // Fotograf 2. adimda gider: dilek ZATEN kaydedildi, foto basarisiz olsa bile kaybolmaz.
    if (foto) {
      const f = await davetliFotoYukle(
        token,
        cevap.veri.katki_id,
        foto.dosya,
        foto.genislik,
        foto.yukseklik
      );
      if (!f.ok) {
        // Dilek gitti; yalniz foto gitmedi - davetliyi bosuna kaygilandirma
        setYukleniyor(false);
        onGonderildi();
        return;
      }
    }

    setYukleniyor(false);
    onGonderildi();
  }

  async function fotoSecildi(e: React.ChangeEvent<HTMLInputElement>) {
    const ham = e.target.files?.[0];
    e.target.value = "";
    if (!ham) return;
    setHata("");
    try {
      // Tarayicida kucult + EXIF/GPS temizle - sunucuya 8 MB degil ~700 KB gider
      const hazir = await gorselHazirla(ham);
      if (foto) URL.revokeObjectURL(foto.onizleme);
      setFoto({
        dosya: hazir.dosya,
        onizleme: hazir.onizlemeUrl,
        genislik: hazir.genislik,
        yukseklik: hazir.yukseklik,
      });
    } catch (h) {
      setHata(h instanceof Error ? h.message : "Fotoğraf işlenemedi.");
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center bg-parsomen px-6 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <MarkaKilidi varyant="tam" boyut="kucuk" />
        </div>

        {/* Karsilama */}
        <div className="overflow-hidden rounded-3xl border border-ayrac bg-yuzey">
          {/* CIFT GORSELLERI: davetli cift'i gorur -> duygusal bag -> daha icten dilek.
              TUM fotograflar dongude; sabit sergi degil, nefes alan bir vitrin. */}
          <FilmSeridi fotograflar={veri.gorseller} baslik={ciftAdi} />

          <div className="p-8 text-center">
          <p className="font-govde text-xs uppercase tracking-etiket text-yaldiz">
            {ciftAdi}
          </p>
          <p className="mt-4 font-display text-xl leading-snug text-murekkep">
            {karsilama}
          </p>
          {veri.prompt_metni && (
            <p className="metin-yasli mt-3 font-govde text-sm text-ikincil">{veri.prompt_metni}</p>
          )}

          {/* Geri sayim (etkinlik ayarindan; kapaliysa gosterilmez) */}
          {veri.sayac_aktif && (
            <DavetliSayac
              hedef={veri.etkinlik_tarihi}
              aktifCumle={veri.sayac_aktif_cumle}
              bittiCumle={veri.sayac_bitti_cumle}
            />
          )}
          </div>

          {/* TEK BLOK: karsilama ile form arasinda kopukluk yok - ayni kagit uzerinde
              devam eden bir davet gibi okunur. */}
          <div className="mx-8 h-px bg-ayrac" />

          <form onSubmit={gonder} className="p-8 pt-7">
          <label className="mb-4 block">
            <span className="mb-1 block font-govde text-xs text-ikincil">Adın</span>
            <input
              value={ad}
              onChange={(e) => setAd(e.target.value)}
              className="w-full rounded-xl border border-ayrac bg-parsomen px-4 py-3 font-govde text-sm text-murekkep outline-none focus:border-sarap"
              placeholder="Adın Soyadın"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block font-govde text-xs text-ikincil">E-posta</span>
              <input
                type="email"
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-ayrac bg-parsomen px-4 py-3 font-govde text-sm text-murekkep outline-none focus:border-sarap"
                placeholder="ornek@eposta.com"
              />
            </label>
            <label className="block">
              <span className="mb-1 block font-govde text-xs text-ikincil">Telefon</span>
              <input
                type="tel"
                inputMode="tel"
                value={telefon}
                onChange={(e) => setTelefon(e.target.value)}
                className="w-full rounded-xl border border-ayrac bg-parsomen px-4 py-3 font-govde text-sm text-murekkep outline-none focus:border-sarap"
                placeholder="05xx xxx xx xx"
              />
            </label>
          </div>

          {/* ILISKI - acilir menu (Musa karari).
              Deftere "Musa'nin Okul Arkadasi" olarak basilir; ilk uc secim
              detay alani acar ("Universiteden sinif arkadasi"). */}
          <div className="mt-4">
            <label className="mb-1 block font-govde text-xs text-ikincil">
              {buEs} ile yakınlığın
            </label>
            <div className="relative">
              <select
                value={iliski}
                onChange={(e) => {
                  setIliski(e.target.value);
                  setIliskiSerbest("");
                }}
                className="w-full appearance-none rounded-xl border border-ayrac bg-parsomen px-4 py-3 pr-10 font-govde text-sm text-murekkep outline-none focus:border-sarap"
              >
                <option value="">Seç...</option>
                {ILISKI_TIPLERI.map((t) => (
                  <option key={t.kod} value={t.kod}>
                    {t.etiket}
                  </option>
                ))}
                <option value="diger">
                  Diğer (yakınlığını kendin tanımla)
                </option>
              </select>
              <svg
                viewBox="0 0 24 24"
                className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ikincil"
                aria-hidden
              >
                <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" fill="none" />
              </svg>
            </div>

            {/* Secim yapildi -> deftere ne yazilacagini GOSTER (surpriz olmasin) */}
            {secilenTip && (
              <p className="mt-2 rounded-lg bg-sarap/5 px-3 py-2 font-govde text-xs text-sarap">
                Defterde yazacak:{" "}
                <span className="font-medium">
                  {esIyelik} {secilenTip.etiket}
                </span>
              </p>
            )}

            {/* Ilk uc secim -> detaylandirma alani (opsiyonel, zenginlestirir) */}
            {secilenTip && (
              <div className="mt-2.5">
                <label className="mb-1 block font-govde text-[0.7rem] text-ikincil">
                  {buEs} ile {secilenTip.detaySorusu} detaylandırabilir misin?{" "}
                  <span className="text-ikincil/70">(isteğe bağlı)</span>
                </label>
                <input
                  value={iliskiSerbest}
                  onChange={(e) => setIliskiSerbest(e.target.value)}
                  maxLength={60}
                  className="w-full rounded-xl border border-ayrac bg-parsomen px-4 py-2.5 font-govde text-sm text-murekkep outline-none placeholder:text-ikincil/45 focus:border-sarap"
                  placeholder={secilenTip.ornek}
                />
              </div>
            )}

            {/* Diger -> tamamen serbest */}
            {iliski === "diger" && (
              <input
                value={iliskiSerbest}
                onChange={(e) => setIliskiSerbest(e.target.value)}
                maxLength={60}
                autoFocus
                className="mt-2.5 w-full rounded-xl border border-ayrac bg-parsomen px-4 py-3 font-govde text-sm text-murekkep outline-none placeholder:text-ikincil/45 focus:border-sarap"
                placeholder={`Örn: ${buEs} ile aynı mahallede büyüdük`}
              />
            )}

            <p className="mt-1.5 font-govde text-[0.7rem] text-ikincil">
              Defterde adının altında yazacak - seni yıllar sonra da hatırlasınlar.
            </p>
          </div>

          <label className="mt-4 block">
            <span className="mb-1 block font-govde text-xs text-ikincil">Mesajın</span>
            <textarea
              value={mesaj}
              onChange={(e) => setMesaj(e.target.value)}
              rows={5}
              className="w-full rounded-xl border border-ayrac bg-parsomen px-4 py-3 font-govde text-sm text-murekkep outline-none focus:border-sarap"
              placeholder="Dileğini, anını ya da tavsiyeni buraya yaz..."
            />
          </label>

          {/* FOTOGRAF - davetli basina 1 adet */}
          <div className="mt-4">
            <span className="mb-1.5 block font-govde text-xs text-ikincil">
              Bir fotoğraf (isteğe bağlı)
            </span>

            {foto ? (
              <div className="flex items-center gap-3 rounded-xl border border-ayrac bg-parsomen p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={foto.onizleme}
                  alt="Seçtiğin fotoğraf"
                  className="h-16 w-16 shrink-0 rounded-lg object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-govde text-xs text-murekkep">Fotoğrafın hazır</p>
                  <p className="font-govde text-[0.7rem] text-ikincil">
                    Dileğinin yanına, deftere basılacak.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    URL.revokeObjectURL(foto.onizleme);
                    setFoto(null);
                  }}
                  className="shrink-0 rounded-full border border-ayrac px-3 py-1.5 font-govde text-xs text-ikincil transition-colors hover:border-sarap hover:text-sarap"
                >
                  Kaldır
                </button>
              </div>
            ) : (
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-ayrac bg-parsomen px-4 py-4 font-govde text-xs text-ikincil transition-colors hover:border-sarap hover:text-sarap">
                <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
                  <path d="M4 7a2 2 0 0 1 2-2h2l1.5-2h5L16 5h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7Z" stroke="currentColor" strokeWidth={1.6} strokeLinejoin="round" fill="none" />
                  <circle cx="12" cy="12" r="3.2" stroke="currentColor" strokeWidth={1.6} fill="none" />
                </svg>
                Fotoğraf ekle
                <input type="file" accept="image/*" onChange={fotoSecildi} className="hidden" />
              </label>
            )}
          </div>

          {/* KVKK aydinlatma + riza (Belge 08) */}
          <label className="mt-4 flex items-start gap-2 font-govde text-xs text-ikincil">
            <input
              type="checkbox"
              checked={riza}
              onChange={(e) => setRiza(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              Bıraktığım bilgilerin, dileğin çiftin anı defterinde kullanılması amacıyla
              işlenmesini kabul ediyorum.{" "}
              <a
                href="/kvkk"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-sarap hover:underline"
              >
                Aydınlatma Metni
              </a>
            </span>
          </label>

          {hata && (
            <p className="mt-4 font-govde text-xs text-sarap" role="alert">
              {hata}
            </p>
          )}

          <button
            type="submit"
            disabled={yukleniyor}
            className="mt-6 w-full rounded-full bg-sarap px-6 py-3 font-govde text-sm font-medium text-parsomen transition-colors hover:bg-sarapKoyu disabled:opacity-60"
          >
            {yukleniyor ? "Gönderiliyor..." : "Dileğimi bırak"}
          </button>
          </form>
        </div>

        <p className="mt-6 text-center font-govde text-[0.7rem] text-ikincil">
          Bir Anı Bırak, Senden Bize Kalan
        </p>
      </div>
    </main>
  );
}

// ---- Davetli ekrani geri sayimi (etkinlik ayarindan) ----
function DavetliSayac({
  hedef,
  aktifCumle,
  bittiCumle,
}: {
  hedef: string;
  aktifCumle: string | null;
  bittiCumle: string | null;
}) {
  const [sk, setSk] = useState(() => hesapla(hedef));

  useEffect(() => {
    setSk(hesapla(hedef));
    const i = setInterval(() => setSk(hesapla(hedef)), 1000);
    return () => clearInterval(i);
  }, [hedef]);

  const cumle = sk.gecti
    ? bittiCumle || "Hedef tarihe ulaşıldı"
    : aktifCumle || "Etkinliğe kalan süre";

  return (
    <div className="mt-5 rounded-2xl border border-ayrac bg-parsomen px-5 py-4 text-center">
      <p className="font-govde text-xs uppercase tracking-etiket text-ikincil">{cumle}</p>
      <div className="mt-3 flex items-end justify-center gap-3">
        <SayacRakam d={sk.gun} e="gün" vurgu />
        <SayacRakam d={sk.sa} e="saat" />
        <SayacRakam d={sk.dk} e="dk" />
        <SayacRakam d={sk.sn} e="sn" />
      </div>
    </div>
  );
}

function SayacRakam({ d, e, vurgu }: { d: number; e: string; vurgu?: boolean }) {
  return (
    <span className="inline-flex flex-col items-center">
      <span
        className={
          vurgu
            ? "font-display text-2xl leading-none text-sarap"
            : "font-display text-lg leading-none text-murekkep"
        }
      >
        {d.toString().padStart(2, "0")}
      </span>
      <span className="mt-1 font-govde text-[0.55rem] uppercase tracking-etiket text-ikincil">
        {e}
      </span>
    </span>
  );
}

function hesapla(hedefIso: string) {
  const hedef = new Date(hedefIso).getTime();
  if (isNaN(hedef)) return { gecti: false, gun: 0, sa: 0, dk: 0, sn: 0 };
  const fark = hedef - Date.now();
  const mutlak = Math.abs(fark);
  return {
    gecti: fark < 0,
    gun: Math.floor(mutlak / 86400000),
    sa: Math.floor((mutlak % 86400000) / 3600000),
    dk: Math.floor((mutlak % 3600000) / 60000),
    sn: Math.floor((mutlak % 60000) / 1000),
  };
}
