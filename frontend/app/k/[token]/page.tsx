"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { api, davetliFotoYukle, type KatkiKarsilama } from "@/lib/api";
import { gorselHazirla } from "@/lib/gorsel";
import { MarkaKilidi } from "@/components/marka/MarkaKilidi";
import { FilmSeridi } from "@/components/site/FilmSeridi";
import { iyelikEki, iliskiMetniKur } from "@/lib/es";
import { DefterKarti } from "@/components/site/DefterKarti";
import {
  yazimDenetle,
  bulguyuUygula,
  tumunuUygula,
  duzeltilebilir,
  sozlukYukle,
  daveti,
  type Bulgu,
  type Sozluk,
} from "@/lib/yazim";
import { DenetimliAlan } from "@/components/site/DenetimliAlan";
import {
  adDogrula,
  adBicimle,
  telefonDogrula,
  telefonBicimle,
  telefonNormalize,
  epostaDogrula,
} from "@/lib/dogrulama";

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

  // TESEKKUR + SATIS MOTORU
  if (gonderildi) {
    return <TesekkurEkrani ciftAdi={ciftAdi} tur={veri.tur} />;
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
  const [denetimUyarisi, setDenetimUyarisi] = useState(false);
  const [sozluk, setSozluk] = useState<Sozluk | null>(null);
  const [onizleme, setOnizleme] = useState(false);

  // Sozluk LAZY yuklenir: davetli mesaj alanina dokundugunda arka planda gelir.
  // Sayfa acilisi etkilenmez; sonrasi tamamen yerel, sifir gecikme.
  useEffect(() => {
    let iptal = false;
    void sozlukYukle().then((s) => {
      if (!iptal) setSozluk(s);
    });
    return () => {
      iptal = true;
    };
  }, []);

  // YAZIM DENETIMI - anlik, tarayicida. Sunucuya gitmez; davetli gecikme hissetmez.
  // Bu metin BASILACAK; kagida gecen hata sonsuza kadar orada kalir.
  const bulgular = useMemo<Bulgu[]>(
    () => yazimDenetle(mesaj, sozluk),
    [mesaj, sozluk]
  );
  const duzeltmeler = duzeltilebilir(bulgular);

  // KURASYON ASISTANI - dilegin DERINLIGINE bakar (yazim degil, DEGER).
  // Bir defterin kalitesi dizgiden degil, icerikten gelir.
  const asistan = useMemo(() => daveti(mesaj), [mesaj]);
  const bilinmeyenler = bulgular.filter((b) => b.tur === "bilinmeyen");
  const uygunsuzBulgular = bulgular.filter((b) => b.tur === "uygunsuz");

  function duzeltmeUygula(b: Bulgu, secilen?: string) {
    setMesaj((m) => bulguyuUygula(m, b, secilen));
    setDenetimUyarisi(false);
  }

  function tumDuzeltmeleriUygula() {
    setMesaj((m) => tumunuUygula(m, bulgular));
    setDenetimUyarisi(false);
  }
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

  // Deftere basilacak iliski metni:
  //  - Detay yazildiysa O kullanilir (davetlinin kendi cumlesi daha degerli)
  //  - Yazilmadiysa iyelikli tip: "Musa'nin Okul Arkadasi"
  // Defterde "kimin yakini" HER ZAMAN belli olmali. Davetli kendi cumlesini
  // yazdiysa ve icinde esin adi gecmiyorsa, basa iyelikli ad eklenir.
  const iliskiMetni = (() => {
    const detay = iliskiSerbest.trim();
    if (iliski === "diger") return iliskiMetniKur(buEs, detay);
    if (secilenTip) {
      return detay.length >= 2
        ? iliskiMetniKur(buEs, detay)
        : `${esIyelik} ${secilenTip.etiket}`;
    }
    return "";
  })();

  // Form -> ONIZLEME kapisi. Gercek gonderim onizlemede onaylaninca olur.
  function onizlemeyeGec(e: React.FormEvent) {
    e.preventDefault();
    setHata("");

    if (!riza) {
      setHata("Devam etmek için aydınlatma metnini onaylaman gerekir.");
      return;
    }

    const adHatasi = adDogrula(ad);
    if (adHatasi) return setHata(adHatasi);

    const telHatasi = telefonDogrula(telefon);
    if (telHatasi) return setHata(telHatasi);

    const epostaHatasi = epostaDogrula(email);
    if (epostaHatasi) return setHata(epostaHatasi);

    if (!iliski) return setHata(`${buEs} ile yakınlığını seçer misin?`);
    if (iliski === "diger" && iliskiSerbest.trim().length < 2)
      return setHata("Yakınlığını kendi cümlenle yazar mısın?");

    if (mesaj.trim().length < 2) return setHata("Bir mesaj yazmalısın.");

    // DENETIM KAPISI: bulgu varsa BIR KEZ uyar. Davetli yine de devam edebilir.
    if (bulgular.length > 0 && !denetimUyarisi) {
      setDenetimUyarisi(true);
      return;
    }

    setOnizleme(true);
  }

  // Onizlemede "Onayla" -> GERCEK gonderim
  async function gonder() {
    setHata("");
    setYukleniyor(true);

    const cevap = await api.katkiBirak(token, {
      davetliAd: adBicimle(ad),
      davetliEmail: email.trim(),
      davetliTelefon: telefonNormalize(telefon),
      davetliIliski: iliskiMetni,
      mesaj: mesaj.trim(),
    });

    if (!cevap.ok) {
      setYukleniyor(false);
      setOnizleme(false);
      setHata(cevap.mesaj);
      return;
    }

    // Fotograf 2. adimda: dilek ZATEN kaydedildi, foto basarisiz olsa da kaybolmaz.
    if (foto) {
      await davetliFotoYukle(token, cevap.veri.katki_id, foto.dosya);
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

  // ONIZLEME EKRANI - davetli dilegini KAGITTA nasil gorunecegiyle gorur.
  // Bir sey gonderdikten sonra "keske soyle yazsaydim" dememeli; simdi gorsun.
  if (onizleme) {
    return (
      <DilekOnizleme
        ad={adBicimle(ad)}
        iliski={iliskiMetni}
        mesaj={mesaj.trim()}
        fotoUrl={foto?.onizleme ?? null}
        fotoGenislik={foto?.genislik ?? 0}
        fotoYukseklik={foto?.yukseklik ?? 0}
        ciftAdi={ciftAdi}
        yukleniyor={yukleniyor}
        hata={hata}
        onOnayla={gonder}
        onDuzenle={() => setOnizleme(false)}
      />
    );
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

          <div className="px-8 pb-8 pt-9 text-center">
            {/* CIFT ADI - ekranin ODAK NOKTASI. Davetli buraya bakip "dogru yerdeyim"
                der. Onceki surumde kucuk ve silikti; sayfaya karisiyordu. */}
            <h1 className="font-display text-[2rem] leading-[1.15] text-sarap sm:text-[2.4rem]">
              {ciftAdi}
            </h1>

            {/* Yaldiz ayrac - baslik ile metni ayirir, toren hissi verir */}
            <div className="mx-auto mt-4 flex w-fit items-center gap-2" aria-hidden>
              <span className="h-px w-9 bg-yaldiz/70" />
              <span className="h-1 w-1 rotate-45 bg-yaldiz" />
              <span className="h-px w-9 bg-yaldiz/70" />
            </div>

            <p className="metin-yasli mx-auto mt-5 max-w-sm font-govde text-[0.95rem] leading-relaxed text-murekkep">
              {karsilama}
            </p>

            {/* Geri sayim */}
            {veri.sayac_aktif && (
              <DavetliSayac
                hedef={veri.etkinlik_tarihi}
                aktifCumle={veri.sayac_aktif_cumle}
                bittiCumle={veri.sayac_bitti_cumle}
              />
            )}

            {/* PROMPT - sayacin ALTINDA, ortali (Musa karari).
                Davetliye ne yapacagini soyleyen son cumle; forma koprudur. */}
            {veri.prompt_metni && (
              <p className="mx-auto mt-7 max-w-sm text-center font-display text-base italic leading-snug text-sarap">
                {veri.prompt_metni}
              </p>
            )}
          </div>

          {/* TEK BLOK: karsilama ile form arasinda kopukluk yok - ayni kagit uzerinde
              devam eden bir davet gibi okunur. */}
          <div className="mx-8 h-px bg-ayrac" />

          <form onSubmit={onizlemeyeGec} className="p-8 pt-7">
          <label className="mb-4 block">
            <span className="mb-1 block font-govde text-xs text-ikincil">Adın</span>
            <input
              value={ad}
              onChange={(e) => setAd(e.target.value)}
              onBlur={(e) => setAd(adBicimle(e.target.value))}
              className="w-full rounded-xl border border-ayrac bg-parsomen px-4 py-3 font-govde text-sm text-murekkep outline-none focus:border-sarap"
              placeholder="Adın Soyadın"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block font-govde text-xs text-ikincil">
                E-posta <span className="text-ikincil/60">(isteğe bağlı)</span>
              </span>
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
                inputMode="numeric"
                value={telefon}
                onChange={(e) => setTelefon(telefonBicimle(e.target.value))}
                maxLength={14}
                className="w-full rounded-xl border border-ayrac bg-parsomen px-4 py-3 font-govde text-sm text-murekkep outline-none focus:border-sarap"
                placeholder="0532 123 45 67"
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

          <div className="mt-4">
            <span className="mb-1 block font-govde text-xs text-ikincil">Mesajın</span>

            {/* WORD TARZI DENETIMLI ALAN: hatali kelimeler METNIN ICINDE dalgali
                cizgiyle isaretlenir; ustune tiklayinca oneriler acilir. */}
            <DenetimliAlan
              deger={mesaj}
              onDegisim={(y) => {
                setMesaj(y);
                setDenetimUyarisi(false);
              }}
              bulgular={bulgular}
              onDuzelt={(b, secilen) => duzeltmeUygula(b, secilen)}
              yerTutucu="Dilek, hatıra ya da içinden geleni buraya yaz..."
              satir={5}
            />
          </div>

          {/* KURASYON ASISTANI - yazim degil, DEGER katmani.
              Davetliyi zorlamaz; bir kapi daha oldugunu hatirlatir. */}
          {asistan && (
            <div
              className={`mt-2.5 rounded-xl border px-3.5 py-3 ${
                asistan.seviye === "harika"
                  ? "border-yaldiz/45 bg-yaldiz/8"
                  : "border-ayrac bg-yuzey"
              }`}
            >
              <div className="flex items-start gap-2.5">
                <span
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                    asistan.seviye === "harika"
                      ? "bg-yaldiz/25 text-yaldiz"
                      : "bg-sarap/10 text-sarap"
                  }`}
                >
                  {asistan.seviye === "harika" ? (
                    <svg viewBox="0 0 24 24" className="h-3 w-3" aria-hidden>
                      <path d="m5 12.5 4.2 4.2L19 7" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" className="h-3 w-3" aria-hidden>
                      <path d="M12 4.5c-3.6 0-6.5 2.7-6.5 6 0 2 1 3.6 2.6 4.7v1.6c0 .6.5 1.2 1.2 1.2h5.4c.7 0 1.2-.6 1.2-1.2v-1.6c1.6-1.1 2.6-2.7 2.6-4.7 0-3.3-2.9-6-6.5-6Z" stroke="currentColor" strokeWidth={1.7} strokeLinejoin="round" fill="none" />
                      <path d="M10 20.5h4" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" />
                    </svg>
                  )}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="font-govde text-[0.78rem] font-medium text-murekkep">
                    {asistan.baslik}
                  </p>
                  <p className="metin-yasli mt-1 font-govde text-[0.72rem] leading-relaxed text-ikincil">
                    {asistan.metin}
                  </p>

                  {asistan.ipuclari.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {asistan.ipuclari.map((ip) => (
                        <li
                          key={ip}
                          className="flex items-center gap-1.5 font-govde text-[0.7rem] text-ikincil"
                        >
                          <span className="h-1 w-1 shrink-0 rounded-full bg-yaldiz" aria-hidden />
                          {ip}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* YAZIM DENETIMI - anlik. Dayatmaz, ONERIR. */}
          {bulgular.length > 0 && (
            <div className="mt-3 overflow-hidden rounded-xl border border-yaldiz/35 bg-parsomen">
              <div className="flex items-center justify-between gap-2 border-b border-yaldiz/20 bg-yaldiz/8 px-3.5 py-2">
                <span className="flex min-w-0 items-center gap-2 font-govde text-[0.7rem] font-medium uppercase tracking-etiket text-yaldiz">
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0" aria-hidden>
                    <path d="M4 6.5h16M4 12h11M4 17.5h7" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" />
                    <path d="m17.5 15.5 1.6 1.6 3-3.2" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" fill="none" />
                  </svg>
                  <span className="truncate">Yazım denetimi</span>
                </span>

                {duzeltmeler.length > 1 && (
                  <button
                    type="button"
                    onClick={tumDuzeltmeleriUygula}
                    className="shrink-0 rounded-full bg-sarap px-3 py-1 font-govde text-[0.68rem] font-medium text-parsomen transition-colors hover:bg-sarapKoyu"
                  >
                    Tümünü düzelt ({duzeltmeler.length})
                  </button>
                )}
              </div>

              <ul className="divide-y divide-ayrac/60">
                {/* Kesin duzeltmeler */}
                {duzeltmeler.slice(0, 4).map((b, i) => (
                  <li key={`d${i}`} className="flex items-center justify-between gap-3 px-3.5 py-2">
                    <span className="min-w-0 flex-1 truncate font-govde text-xs">
                      <span className="text-ikincil line-through decoration-sarap/40">
                        {b.hatali.trim()}
                      </span>
                      <span className="mx-1.5 text-ikincil/50">→</span>
                      <span className="font-medium text-murekkep">{b.dogru.trim()}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => duzeltmeUygula(b)}
                      className="shrink-0 rounded-full border border-sarap/60 px-2.5 py-0.5 font-govde text-[0.65rem] text-sarap transition-colors hover:bg-sarap hover:text-parsomen"
                    >
                      Düzelt
                    </button>
                  </li>
                ))}

                {/* Bilinmeyen kelimeler - oneri sunulur, karar davetlinin */}
                {bilinmeyenler.slice(0, 3).map((b, i) => (
                  <li key={`b${i}`} className="px-3.5 py-2">
                    <div className="flex items-center gap-2">
                      <span className="min-w-0 truncate font-govde text-xs font-medium text-murekkep underline decoration-sarap decoration-wavy underline-offset-2">
                        {b.hatali}
                      </span>
                      <span className="shrink-0 font-govde text-[0.65rem] text-ikincil">
                        tanımadığım bir kelime
                      </span>
                    </div>

                    {b.oneriler && b.oneriler.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {b.oneriler.map((o) => (
                          <button
                            key={o}
                            type="button"
                            onClick={() => duzeltmeUygula(b, o)}
                            className="rounded-full border border-ayrac bg-yuzey px-2.5 py-0.5 font-govde text-[0.68rem] text-murekkep transition-colors hover:border-sarap hover:text-sarap"
                          >
                            {o}
                          </button>
                        ))}
                      </div>
                    )}
                  </li>
                ))}
              </ul>

              {(duzeltmeler.length > 4 || bilinmeyenler.length > 3) && (
                <p className="border-t border-ayrac/60 px-3.5 py-1.5 font-govde text-[0.65rem] text-ikincil">
                  ve {duzeltmeler.length - Math.min(4, duzeltmeler.length) + bilinmeyenler.length - Math.min(3, bilinmeyenler.length)} öneri daha
                </p>
              )}

              {uygunsuzBulgular.length > 0 && (
                <p className="border-t border-sarap/25 bg-sarap/5 px-3.5 py-2 font-govde text-[0.7rem] text-sarap">
                  Bu mesaj deftere basılacak ve yıllarca okunacak - ifadeni bir kez daha
                  gözden geçirmek ister misin?
                </p>
              )}
            </div>
          )}

          {/* FOTOGRAF - davetli basina 1 adet */}
          <div className="mt-4">
            <span className="mb-1.5 block font-govde text-xs text-ikincil">
              Bir fotoğraf (isteğe bağlı)
            </span>

            {foto ? (
              <div className="flex items-center gap-3 rounded-xl border border-ayrac bg-parsomen p-3">
                {/* KUCUK ONIZLEME - object-contain: fotografin TAMAMI gorunur.
                    Kirparsak davetli yanlis fotograf sectigini fark edemez. */}
                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-ayrac bg-white">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={foto.onizleme}
                    alt="Seçtiğin fotoğraf"
                    className="h-full w-full object-contain"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-govde text-xs text-murekkep">Fotoğrafın hazır</p>
                  <p className="font-govde text-[0.7rem] text-ikincil">
                    {foto.genislik > 0
                      ? `${foto.genislik}×${foto.yukseklik} - deftere basılacak`
                      : "Dileğinin yanına, deftere basılacak."}
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

          {/* DENETIM UYARISI - kararli, olcülu, markanin dilinde.
              Kirmizi "hata" degil; SORUMLULUK hatirlatmasi. Basili bir esere
              gidiyoruz - ton buna yakisir. */}
          {denetimUyarisi && (
            <div className="mt-4 overflow-hidden rounded-2xl border border-sarap/45 bg-yuzey shadow-[0_8px_28px_rgba(110,36,56,0.10)]">
              {/* Basli seridi */}
              <div className="flex items-center gap-2.5 border-b border-sarap/25 bg-sarap px-4 py-2.5">
                <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-parsomen" aria-hidden>
                  <path d="M12 8.5v4.2" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" />
                  <circle cx="12" cy="16.4" r="0.95" fill="currentColor" />
                  <path d="M10.3 3.9 2.6 17.4A1.9 1.9 0 0 0 4.3 20.3h15.4a1.9 1.9 0 0 0 1.7-2.9L13.7 3.9a1.95 1.95 0 0 0-3.4 0Z" stroke="currentColor" strokeWidth={1.5} strokeLinejoin="round" fill="none" />
                </svg>
                <p className="font-govde text-xs font-medium uppercase tracking-etiket text-parsomen">
                  Bu metin kağıda basılacak
                </p>
              </div>

              <div className="px-5 py-4">
                <p className="metin-yasli font-govde text-[0.82rem] leading-relaxed text-murekkep">
                  Mesajında{" "}
                  <span className="font-medium text-sarap">
                    {duzeltmeler.length + bilinmeyenler.length} nokta
                  </span>{" "}
                  dikkatimizi çekti. Bu satırlar bir defterde ciltlenecek ve yıllar sonra
                  yeniden okunacak - şimdi düzeltmek, sonra pişman olmaktan iyidir.
                </p>

                {/* Bulgu ozeti */}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {duzeltmeler.slice(0, 3).map((b, i) => (
                    <span
                      key={`u${i}`}
                      className="rounded-full bg-parsomen px-2.5 py-1 font-govde text-[0.68rem] text-ikincil"
                    >
                      <span className="line-through decoration-sarap/50">{b.hatali.trim()}</span>
                      <span className="mx-1 text-ikincil/50">→</span>
                      <span className="font-medium text-murekkep">{b.dogru.trim()}</span>
                    </span>
                  ))}
                  {bilinmeyenler.slice(0, 2).map((b, i) => (
                    <span
                      key={`v${i}`}
                      className="rounded-full bg-parsomen px-2.5 py-1 font-govde text-[0.68rem] text-murekkep underline decoration-sarap decoration-wavy underline-offset-2"
                    >
                      {b.hatali}
                    </span>
                  ))}
                  {duzeltmeler.length + bilinmeyenler.length > 5 && (
                    <span className="rounded-full bg-parsomen px-2.5 py-1 font-govde text-[0.68rem] text-ikincil">
                      +{duzeltmeler.length + bilinmeyenler.length - 5}
                    </span>
                  )}
                </div>

                {/* Eylemler - hiyerarsi net: ONERILEN once, cikis yolu ikincil */}
                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  {duzeltmeler.length > 0 && (
                    <button
                      type="button"
                      onClick={tumDuzeltmeleriUygula}
                      className="flex-1 rounded-full bg-sarap px-5 py-2.5 font-govde text-[0.82rem] font-medium text-parsomen transition-colors hover:bg-sarapKoyu"
                    >
                      Düzeltmeleri uygula
                    </button>
                  )}
                  <button
                    type="submit"
                    className="flex-1 rounded-full border border-ikincil/45 bg-transparent px-5 py-2.5 font-govde text-[0.82rem] text-ikincil transition-colors hover:border-murekkep hover:text-murekkep"
                  >
                    Yine de devam et
                  </button>
                </div>

                <p className="mt-2.5 text-center font-govde text-[0.68rem] text-ikincil">
                  Devam edersen dileğini önizleyip son kez göreceksin.
                </p>
              </div>
            </div>
          )}
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

// ---------------- DILEK ONIZLEME ----------------
// Davetli, dileginin DEFTERDE nasil gorunecegini AYNEN gorur.
// Bu ekran PDF'teki dilek kartinin birebir esidir: kagit dokusu, muze cercevesi,
// yaldiz ayrac, Fraunces imza. "Ne gorursen o basilir" - surpriz yok.
function DilekOnizleme({
  ad,
  iliski,
  mesaj,
  fotoUrl,
  fotoGenislik,
  fotoYukseklik,
  ciftAdi,
  yukleniyor,
  hata,
  onOnayla,
  onDuzenle,
}: {
  ad: string;
  iliski: string;
  mesaj: string;
  fotoUrl: string | null;
  fotoGenislik: number;
  fotoYukseklik: number;
  ciftAdi: string;
  yukleniyor: boolean;
  hata: string;
  onOnayla: () => void;
  onDuzenle: () => void;
}) {
  const bugun = new Date().toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <main className="flex min-h-screen flex-col items-center bg-parsomen px-6 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <MarkaKilidi varyant="tam" boyut="kucuk" />
        </div>

        <div className="rounded-3xl border border-ayrac bg-yuzey p-7 sm:p-8">
          <p className="text-center font-govde text-[0.7rem] uppercase tracking-etiket text-yaldiz">
            Defterde böyle görünecek
          </p>
          <h2 className="mt-2 text-center font-display text-xl text-murekkep">
            Dileğini son bir kez gör
          </h2>
          <p className="metin-yasli mx-auto mt-2 max-w-xs text-center font-govde text-xs leading-relaxed text-ikincil">
            {ciftAdi} bu sayfayı yıllar sonra açacak. Beğendiysen gönder; değilse
            düzenlemeye dön.
          </p>

          {/* KAGIT - icindeki kart, PDF dizgisiyle BIREBIR ayni olculerde */}
          <div className="mt-6 overflow-hidden rounded-lg bg-[#fdf9f0] px-4 py-6 shadow-[0_6px_24px_rgba(0,0,0,0.13)]">
            <DefterKarti
              ad={ad}
              iliski={iliski}
              mesaj={mesaj}
              fotoUrl={fotoUrl}
              fotoGenislik={fotoGenislik}
              fotoYukseklik={fotoYukseklik}
              tarih={bugun}
            />
          </div>

          {hata && (
            <p className="mt-4 rounded-lg bg-sarap/10 px-3 py-2 text-center font-govde text-xs text-sarap">
              {hata}
            </p>
          )}

          <div className="mt-6 flex flex-col gap-2.5">
            <button
              onClick={onOnayla}
              disabled={yukleniyor}
              className="w-full rounded-full bg-sarap px-6 py-3 font-govde text-sm font-medium text-parsomen transition-colors hover:bg-sarapKoyu disabled:opacity-60"
            >
              {yukleniyor ? "Gönderiliyor..." : "Onayla, dileğimi gönder"}
            </button>
            <button
              onClick={onDuzenle}
              disabled={yukleniyor}
              className="w-full rounded-full border border-ayrac px-6 py-3 font-govde text-sm text-ikincil transition-colors hover:border-sarap hover:text-sarap disabled:opacity-60"
            >
              Dileğimi düzenle
            </button>
          </div>
        </div>

        <p className="mt-6 text-center font-govde text-[0.7rem] text-ikincil">
          Bir Anı Bırak, Senden Bize Kalan
        </p>
      </div>
    </main>
  );
}

// ---------------- TESEKKUR + SATIS MOTORU ----------------
//
// STRATEJI: bu ekran, urunun EN DEGERLI reklam alanidir.
//
// Davetli su an: (1) bir dilek yazdi, (2) duygusal olarak acik, (3) urunun ne
// yaptigini BIZZAT yasadi. Dunyanin hicbir reklami bu kadar nitelikli bir ani
// yakalayamaz. Bir dugune giden herkes, baska dugunlere de gider - ve bir kismi
// kendi dugununu planliyor.
//
// Bu yuzden burada uc kapi acilir:
//  1. KENDI DEFTERINI OLUSTUR - "ucretsiz basla, begenirsen bastir"
//  2. HEDIYE ET - sevdiginin ozel gunu icin defter hediyesi (viral carpan)
//  3. NASIL CALISIR / ORNEK ESERLER - guveni kurar, merakı besler
//
// Ton: satis degil DAVET. Davetli az once bir hatira birakti; simdi ayni seyi
// kendi icin isteyebilecegini FARK ETMELI.
function TesekkurEkrani({ ciftAdi, tur }: { ciftAdi: string; tur: string }) {
  const turAdi =
    tur === "nisan" ? "nişanında" : tur === "nikah" ? "nikâhında" : "düğününde";

  return (
    <main className="min-h-screen bg-parsomen px-6 py-12">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <MarkaKilidi varyant="tam" boyut="kucuk" />
        </div>

        {/* 1) TESEKKUR - once duygu tamamlanir */}
        <div className="rounded-3xl border border-ayrac bg-yuzey p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-yaldiz/50 bg-yaldiz/10">
            <svg viewBox="0 0 24 24" className="h-6 w-6 text-yaldiz" aria-hidden>
              <path d="m5 12.5 4.2 4.2L19 7" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </svg>
          </div>

          <h1 className="mt-5 font-display text-2xl leading-snug text-murekkep">
            Anın deftere düştü
          </h1>
          <p className="metin-yasli mx-auto mt-3 max-w-xs font-govde text-sm leading-relaxed text-ikincil">
            {ciftAdi} onayladıktan sonra dileğin defterlerine eklenecek. Yıllar sonra
            bu sayfayı açtıklarında seni de hatırlayacaklar.
          </p>
        </div>

        {/* 2) DONUSUM - "sen de yapabilirsin" */}
        <div className="mt-4 overflow-hidden rounded-3xl border border-yaldiz/40 bg-gradient-to-b from-yaldiz/8 to-transparent">
          <div className="p-7 text-center">
            <p className="font-govde text-[0.68rem] uppercase tracking-etiket text-yaldiz">
              Peki ya senin özel günün?
            </p>
            <h2 className="mt-3 font-display text-xl leading-snug text-murekkep">
              Sen de sevdiklerinden
              <br />
              bir miras topla
            </h2>
            <p className="metin-yasli mx-auto mt-3 max-w-xs font-govde text-sm leading-relaxed text-ikincil">
              Az önce yaptığın şey, bir çiftin en değerli hatırasına dönüşüyor.
              Aynısını kendi {turAdi} yapabilirsin.
            </p>

            <div className="mt-5 rounded-2xl border border-ayrac bg-yuzey px-4 py-3">
              <p className="font-display text-base text-sarap">
                Toplamak ücretsiz.
              </p>
              <p className="mt-0.5 font-govde text-xs text-ikincil">
                Miras, bir kereye mahsus.
              </p>
            </div>

            <a
              href="/?kaynak=davetli"
              className="mt-5 block w-full rounded-full bg-sarap px-6 py-3.5 font-govde text-sm font-medium text-parsomen transition-colors hover:bg-sarapKoyu"
            >
              Ücretsiz defterimi oluştur
            </a>
            <p className="mt-2 font-govde text-[0.68rem] text-ikincil">
              Kayıt 2 dakika · Kredi kartı istemez
            </p>
          </div>
        </div>

        {/* 3) HEDIYE - viral carpan */}
        <a
          href="/hediye?kaynak=davetli"
          className="mt-4 flex items-center gap-4 rounded-3xl border border-ayrac bg-yuzey p-5 transition-colors hover:border-sarap"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-sarap/10 text-sarap">
            <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
              <path d="M4 11h16v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8Z" stroke="currentColor" strokeWidth={1.6} strokeLinejoin="round" fill="none" />
              <path d="M3 7.5h18V11H3V7.5Z" stroke="currentColor" strokeWidth={1.6} strokeLinejoin="round" fill="none" />
              <path d="M12 7.5V21" stroke="currentColor" strokeWidth={1.6} />
              <path d="M12 7.5S10.8 3 8.5 3a2.2 2.2 0 0 0 0 4.5H12Zm0 0S13.2 3 15.5 3a2.2 2.2 0 0 1 0 4.5H12Z" stroke="currentColor" strokeWidth={1.6} strokeLinejoin="round" fill="none" />
            </svg>
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-display text-base text-murekkep">
              Bir yakınına hediye et
            </span>
            <span className="metin-yasli block font-govde text-xs leading-relaxed text-ikincil">
              Evlenen bir dostuna, yeni doğan bebeğe, mezun olan kardeşine - hatıra
              defteri hediyesi.
            </span>
          </span>
          <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-ikincil" aria-hidden>
            <path d="m9 5 7 7-7 7" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </svg>
        </a>

        {/* 4) GUVEN + MERAK - nasil calisir, ornek eserler */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <a
            href="/nasil-calisir?kaynak=davetli"
            className="rounded-2xl border border-ayrac bg-yuzey p-4 text-center transition-colors hover:border-sarap"
          >
            <span className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-yaldiz/10 text-yaldiz">
              <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth={1.6} fill="none" />
                <path d="M9.6 9.4a2.5 2.5 0 1 1 3.4 2.3c-.6.3-1 .8-1 1.5v.4" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" fill="none" />
                <circle cx="12" cy="16.6" r="0.9" fill="currentColor" />
              </svg>
            </span>
            <span className="mt-2 block font-govde text-xs font-medium text-murekkep">
              Nasıl çalışır?
            </span>
          </a>

          <a
            href="/ornekler?kaynak=davetli"
            className="rounded-2xl border border-ayrac bg-yuzey p-4 text-center transition-colors hover:border-sarap"
          >
            <span className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-yaldiz/10 text-yaldiz">
              <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
                <path d="M5 4h9a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4Z" stroke="currentColor" strokeWidth={1.6} strokeLinejoin="round" fill="none" />
                <path d="M8 8.5h6M8 12h6M8 15.5h3.5" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" />
              </svg>
            </span>
            <span className="mt-2 block font-govde text-xs font-medium text-murekkep">
              Örnek defterler
            </span>
          </a>
        </div>

        {/* 5) UYGULAMA - kalici temas noktasi */}
        <div className="mt-4 rounded-2xl border border-ayrac bg-yuzey p-5">
          <p className="text-center font-govde text-xs text-ikincil">
            Defterini cebinden yönet
          </p>
          <div className="mt-3 flex justify-center gap-2.5">
            <a
              href="/?kur=pwa"
              className="flex items-center gap-1.5 rounded-full border border-ayrac px-4 py-2 font-govde text-xs text-murekkep transition-colors hover:border-sarap"
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" aria-hidden>
                <rect x="7" y="2.5" width="10" height="19" rx="2.2" stroke="currentColor" strokeWidth={1.5} fill="none" />
                <path d="M11 18.5h2" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
              </svg>
              Uygulamayı yükle
            </a>
            <a
              href="/"
              className="flex items-center gap-1.5 rounded-full border border-ayrac px-4 py-2 font-govde text-xs text-murekkep transition-colors hover:border-sarap"
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" aria-hidden>
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth={1.5} fill="none" />
                <path d="M3 12h18M12 3c2.5 2.6 2.5 15.4 0 18M12 3c-2.5 2.6-2.5 15.4 0 18" stroke="currentColor" strokeWidth={1.3} fill="none" />
              </svg>
              Web sitesi
            </a>
          </div>
        </div>

        <p className="mt-7 text-center font-display text-sm italic text-ikincil">
          Bir Anı Bırak, Senden Bize Kalan
        </p>
      </div>
    </main>
  );
}
