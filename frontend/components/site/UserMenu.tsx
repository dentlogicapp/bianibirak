"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { api, type Kullanici, type Bildirim, type Etkinlik } from "@/lib/api";
import { useTema } from "@/lib/tema";
import { ProfilimModal } from "@/components/site/ProfilimModal";
import { DestekModal } from "@/components/site/DestekModal";
import { KaydirSil } from "@/components/site/KaydirSil";
import { TehlikeliEylem } from "@/components/site/TehlikeliEylem";

// Avatar menusu: bolumlu dropdown (Planlama Defteri tenant deseninin defter karsiligi).
// A) Baslik: isim + mail + ACIK DEFTER (baglam her zaman gorunur)
// B) DIGER DEFTERLERIN (2+ defter varsa; acik olan haric) - tiklayinca ANINDA gecis
// C) Hesap & araclar: Profilim, Fotograflar, Ayarlar, Cop Kutusu, Super Panel
// D) Defter yollari: Gelen Dilekler, Dilek Baglantisi, Davetiye QR, Baskiya Hazir Defter
// E) Tema, Bildirimler, Cikis.
// BILDIRIM KIRPMA - kelime sinirinda, hayalet bosluk birakmadan.
const KIRPMA_SINIR = 110;

function kisalt(metin: string): string {
  const t = (metin ?? "").trim();
  if (t.length <= KIRPMA_SINIR) return t;
  const parca = t.slice(0, KIRPMA_SINIR);
  const bosluk = parca.lastIndexOf(" ");
  return (bosluk > 60 ? parca.slice(0, bosluk) : parca).trimEnd() + "...";
}

export function UserMenu() {
  const router = useRouter();
  const [kullanici, setKullanici] = useState<Kullanici | null>(null);
  const [oturum, setOturum] = useState<"bilinmiyor" | "var" | "yok">("bilinmiyor");
  const [acik, setAcik] = useState(false);
  const [profilAcik, setProfilAcik] = useState(false);
  const [bildirimler, setBildirimler] = useState<Bildirim[]>([]);
  const [okunmamis, setOkunmamis] = useState(0);
  const [etkinlikler, setEtkinlikler] = useState<Etkinlik[]>([]);
  const [aktifId, setAktifId] = useState<string | null>(null);
  // BILDIRIM GENISLETME - hangi bildirimin tam metni acik.
  // Tek seferde TEK bildirim acilir: liste "akordeon" gibi calisir, menu sismez.
  const [acikBildirim, setAcikBildirim] = useState<string | null>(null);
  const [destekAcik, setDestekAcik] = useState(false);
  // Bildirimden mi gelindi - modal "sonlanmis yazisma" ekranini buna gore gosterir.
  const [destekBildirimden, setDestekBildirimden] = useState(false);

  // DEFTER SILME - kaydirmali panel + web (x), ikisi de AYNI onaya cikar.
  //
  // Hangi satirin eylem paneli acik: TEK satir. Durum burada tutulur, satirin
  // icinde degil - yoksa uc defteri arka arkaya kaydiran kullanicinin ekraninda
  // uc panel birden acik kalirdi.
  const [kaydirAcik, setKaydirAcik] = useState<string | null>(null);
  const [silHedef, setSilHedef] = useState<Etkinlik | null>(null);
  const [siliniyor, setSiliniyor] = useState(false);

  // BILDIRIMDEN DESTEK MODALINI AC.
  // Destek bir sayfa degil modaldir; bu yuzden bildirim "?destek=1" ile gelir.
  // Modal acildiktan sonra parametre URL'den TEMIZLENIR - kullanici sayfayi
  // yenilerse ya da geri gelirse modal tekrar acilmasin.
  // REAKTIF PARAMETRE OKUMA - "bazen calisiyor" hatasinin kok cozumu.
  //
  // ONCEKI HALI: window.location.search bir kez, useEffect(..., []) icinde okunuyordu.
  // Bildirime tiklandiginda hedef ZATEN acik olan sayfaysa React bileseni yeniden
  // kurmaz; efekt bir daha CALISMAZ ve hicbir sey olmaz. Farkli sayfadaysan calisir.
  // Kullanicinin gordugu: "bazen goturuyor, bazen olu taklidi yapiyor".
  //
  // COZUM: useSearchParams REAKTIFTIR - adres degistiginde efekt yeniden calisir.
  // Ayrica parametre router.replace ile TEMIZLENIR (window.history ile degil):
  // boylece Next'in kendi durumu da guncellenir ve AYNI bildirime ikinci kez
  // tiklandiginda parametre yeniden eklendigi icin degisim algilanir.
  // DESTEK MODALI ACMA - OLAY TABANLI, ADRESE BAGIMLI DEGIL.
  //
  // ONCEKI IKI DENEME DE KAYBETTI:
  //   1) window.location.search'i bir kez okumak: hedef sayfa ZATEN acikken bilesen
  //      yeniden kurulmadigi icin efekt calismiyordu -> "bazen olu taklidi".
  //   2) useSearchParams: reaktifti ama statik on-uretimi bozdu (/_not-found).
  //
  // COZUM: adres bir YAN URUN olsun, tetikleyici DEGIL. Bildirime tiklandiginda
  // dogrudan bir olay yayinlanir; menu onu dinler. Olay her seferinde yeniden
  // yayinlandigi icin AYNI bildirime ikinci tik da calisir - adresin degisip
  // degismedigi hic onemli degildir.
  useEffect(() => {
    function ac() {
      setDestekAcik(true);
      setDestekBildirimden(true);
    }
    window.addEventListener("bianibirak-destek-ac", ac);

    // Soguk baslangic: push bildirimi uygulamayi ADRESLE actiysa (uygulama kapaliydi),
    // dinleyici henuz yokken olay kacirilmis olur. Bu yuzden ilk yuklemede adres
    // bir kez kontrol edilir.
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search);
      if (p.get("destek") === "1") {
        ac();
        p.delete("destek");
        window.history.replaceState(null, "", window.location.pathname + (p.toString() ? `?${p}` : ""));
      }
    }

    return () => window.removeEventListener("bianibirak-destek-ac", ac);
  }, []);

  // Turetilmis: acik defter ve digerleri. Tek kaynak - iki ayri filtre tutulmaz.
  const aktifEtkinlik = etkinlikler.find((e) => e.id === aktifId) ?? null;
  const digerEtkinlikler = etkinlikler.filter((e) => e.id !== aktifId);
  const [gecis, setGecis] = useState(false);
  const [tema, temaTersle] = useTema();
  const kutuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.ben().then((c) => {
      if (c.ok) {
        setKullanici(c.veri);
        setOturum("var");
      } else {
        setOturum("yok");
      }
    });
  }, []);

  useEffect(() => {
    function disari(e: MouseEvent) {
      if (kutuRef.current && !kutuRef.current.contains(e.target as Node)) setAcik(false);
    }
    if (acik) document.addEventListener("mousedown", disari);
    return () => document.removeEventListener("mousedown", disari);
  }, [acik]);

  // Menu kapaninca acik kalan eylem paneli de kapanir. Yoksa menu tekrar
  // acildiginda kullanici, birakti unuttugu bir "Sil" butonuyla karsilasirdi.
  useEffect(() => {
    if (!acik) setKaydirAcik(null);
  }, [acik]);

  // Bildirim cekme (planlama deseni): 15sn polling + pencere odaginda tazele.
  useEffect(() => {
    if (oturum !== "var") return;

    let iptal = false;
    async function cek() {
      const c = await api.bildirimler();
      if (!iptal && c.ok) {
        setBildirimler(c.veri.bildirimler);
        setOkunmamis(c.veri.okunmamis_sayisi);
      }
    }
    void cek();
    const zaman = setInterval(cek, 15000);
    function odak() {
      void cek();
    }
    window.addEventListener("focus", odak);
    return () => {
      iptal = true;
      clearInterval(zaman);
      window.removeEventListener("focus", odak);
    };
  }, [oturum]);

  // Etkinlikler + aktif etkinlik (switcher icin - planlama workspace deseni).
  useEffect(() => {
    if (oturum !== "var") return;
    api.etkinliklerim().then((c) => {
      if (c.ok) setEtkinlikler(c.veri);
    });
    api.etkinlikAktif().then((c) => {
      if (c.ok) setAktifId(c.veri.id);
    });
  }, [oturum]);

  // Etkinlik degistir -> JWT yenilenir -> hard refresh (planlama deseni)
  function etkinlikDegistir(id: string) {
    if (gecis) return;
    setGecis(true);
    api.etkinlikAktifYap(id).then((c) => {
      if (c.ok) {
        window.location.href = "/gelen-dilekler";
      } else {
        setGecis(false);
      }
    });
  }

  // SILME NIYETI - menuyu KAPATIR, onayi acar.
  //
  // Profilim ve Destek ile ayni desen. Menu acik kalsaydi, onay penceresine
  // tiklamak "menu disina tiklama" sayilip menuyu kapatir, kapanan menu ile
  // birlikte pencere de yok olurdu - kullanici hicbir sey olmadigini gorurdu.
  function silNiyeti(e: Etkinlik) {
    setKaydirAcik(null);
    setAcik(false);
    setTimeout(() => setSilHedef(e), 50);
  }

  // COPE TASI - kalici silme DEGIL. Onay penceresi bunu acikca soyler.
  // Yalniz PASIF defterler bu yoldan silinir (acik defter listede yer almaz),
  // bu yuzden defter degistirme gerekmez: kullanicinin bulundugu baglam bozulmaz.
  async function defterSil() {
    const e = silHedef;
    if (!e || siliniyor) return;
    setSiliniyor(true);
    const c = await api.etkinlikSil(e.id);
    setSiliniyor(false);
    if (!c.ok) {
      toast.error(c.mesaj);
      return;
    }
    setEtkinlikler((o) => o.filter((x) => x.id !== e.id));
    setSilHedef(null);
    toast.success("Defter çöp kutusuna taşındı.");
  }

  function bildirimeTikla(b: Bildirim) {
    // SESSIZ TIKLAMA YOK.
    // URL'siz bir bildirime tiklayip hicbir sey olmamasi, kullanicida "uygulama
    // bozuk" izlenimi birakir. Gidilecek yer yoksa bile NE OLDUGUNU soyleriz -
    // bildirimin tam metnini acariz. Sessizlik amatorluktur; her tiklamanin bir
    // karsiligi olmalidir.
    if (!b.url) {
      setAcikBildirim(acikBildirim === b.id ? null : b.id);
      if (!b.okundu_mu) {
        setBildirimler((o) => o.map((x) => (x.id === b.id ? { ...x, okundu_mu: true } : x)));
        setOkunmamis((s) => Math.max(0, s - 1));
        void api.bildirimOkundu(b.id);
      }
      return;
    }

    // TEK TIK, SIFIR SURTUNME: navigasyon SENKRON ve ONCE.
    // Ag istegi (durum kontrolu) tiklama anina KOYULMAZ - hedef rota zaten sabit
    // (/gelen-dilekler). Dilegin durumu (onayli/red/yok) defter sayfasinda islenir.
    const eslesme = b.url.match(/focus=([0-9a-fA-F-]{36})/);
    const hedef = eslesme ? `/gelen-dilekler?focus=${eslesme[1]}` : b.url;

    // Okundu isareti her iki yolda da (ates-et-unut).
    setAcik(false);
    if (!b.okundu_mu) {
      setBildirimler((o) => o.map((x) => (x.id === b.id ? { ...x, okundu_mu: true } : x)));
      setOkunmamis((s) => Math.max(0, s - 1));
      void api.bildirimOkundu(b.id);
    }

    // BILDIRIM BASKA DEFTERE AITSE ONCE O DEFTERE GEC.
    // Yoksa hedef sayfa AKTIF defterin kuyruguna bakar, dilek orada olmadigi icin
    // "erisilemiyor" der - bildirim yalan soylemis olur. Cok defterli kullanicida
    // bu kacinilmazdi. Gecis sonrasi TAM YENILEME: yeni JWT (aktif_etkinlik_id)
    // ile acilsin, aksi halde sayfa eski tenant baglamini tasir.
    if (b.etkinlik_id && aktifId && b.etkinlik_id !== aktifId) {
      if (gecis) return;
      setGecis(true);
      void api.etkinlikAktifYap(b.etkinlik_id).then(() => {
        window.location.href = hedef;
      });
      return;
    }

    // Hedef destek ise olayi YAY - ayni sayfadaysak bile modal acilir.
    if (hedef.includes("destek=1")) {
      window.dispatchEvent(new CustomEvent("bianibirak-destek-ac"));
    }
    router.push(hedef);
  }

  async function bildirimSil(id: string) {
    const hedef = bildirimler.find((x) => x.id === id);
    setBildirimler((o) => o.filter((x) => x.id !== id));
    if (hedef && !hedef.okundu_mu) setOkunmamis((s) => Math.max(0, s - 1));
    void api.bildirimSil(id);
  }

  async function bildirimTumunuTemizle() {
    setBildirimler([]);
    setOkunmamis(0);
    void api.bildirimTumunuSil();
  }

  async function cikis() {
    await api.cikis();
    setAcik(false);
    router.push("/giris");
  }

  if (oturum === "yok") {
    return (
      <Link
        href="/giris"
        className="rounded-full bg-sarap px-5 py-2 font-govde text-xs font-medium text-parsomen transition-colors hover:bg-sarapKoyu sm:text-sm"
      >
        Giriş
      </Link>
    );
  }

  if (oturum === "bilinmiyor" || !kullanici) {
    return <span className="h-9 w-9 rounded-full border border-ayrac bg-yuzey" aria-hidden />;
  }

  const basHarf = (kullanici.ad || "?").trim().charAt(0).toLocaleUpperCase("tr-TR");

  return (
    <div ref={kutuRef} className="relative">
      {/* Avatar - koyu tonda belirgin (dolu sarap zemin + parsomen harf) + bildirim rozeti */}
      <button
        onClick={() => setAcik((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={acik}
        className="relative flex h-9 w-9 items-center justify-center rounded-full bg-sarap font-display text-sm font-medium text-parsomen shadow-sm ring-1 ring-sarap/30 transition-transform hover:scale-105"
      >
        {basHarf}
        {okunmamis > 0 && (
          <span className="rozet-nabiz absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-yaldiz px-1 font-govde text-[0.6rem] font-bold text-murekkep ring-2 ring-parsomen">
            {okunmamis > 9 ? "9+" : okunmamis}
          </span>
        )}
      </button>

      {acik && (
        <div className="absolute right-0 z-50 mt-2 max-h-[calc(100dvh-5rem)] w-[min(22rem,calc(100vw-1.5rem))] overflow-y-auto overscroll-contain rounded-2xl border border-ayrac bg-yuzey shadow-xl">
          {/* Kullanici basligi (isim + mail + ICINDE BULUNULAN DEFTER) */}
          <div className="border-b border-ayrac px-4 py-3.5">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sarap font-display text-base font-medium text-parsomen">
                {basHarf}
              </span>
              <div className="min-w-0">
                <p className="truncate font-govde text-sm font-medium text-murekkep">{kullanici.ad}</p>
                <p className="truncate font-govde text-xs text-ikincil">{kullanici.email}</p>
              </div>
            </div>

            {/* ICINDE BULUNULAN DEFTER - "neredeyim?" sorusu menuyu acar acmaz yanitlanir.
                Cok defterli kullanicida yanlis deftere islem yapmanin tek panzehiri
                baglami HER ZAMAN gorunur kilmaktir.

                ACIK DEFTER SILINEMEZ - bilincli.
                Silme eylemi yalniz PASIF defterlerde durur. Icinde bulundugun defteri
                menuden silmek, ayagin bastigi dali kesmektir: silme aninda tum ekran
                baglamsiz kalir, JWT'deki aktif_etkinlik_id olu bir kimlige isaret eder.
                Acik defteri silmenin dogru yeri Etkinliklerim ekranidir - orada silme
                sonrasi hangi deftere gecilecegi de yonetilir. */}
            {aktifEtkinlik && (
              <div className="mt-3 flex min-w-0 items-center gap-2 rounded-xl bg-yuzeyKoyu px-3 py-2">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-yaldiz" aria-hidden />
                <div className="min-w-0">
                  <p className="font-govde text-[0.6rem] uppercase tracking-etiket text-ikincil">
                    Açık defter
                  </p>
                  <p className="truncate font-govde text-xs font-medium text-murekkep">
                    {aktifEtkinlik.es1_ad} &amp; {aktifEtkinlik.es2_ad} - {turKisa(aktifEtkinlik.tur)}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* DIGER DEFTERLER - yalniz 2+ defter varsa; icinde bulunulan HARIC.
              Konum bilincli: baglamin (acik defter) HEMEN ALTINDA. Tiklayinca gecis
              kendiliginden yapilir, ara sayfa yok.

              SILME: mobilde sola kaydir, masaustunde adin solundaki (x). Ikisi de
              AYNI onaya cikar - iki ayri akis kurmak, iki ayri davranis demektir. */}
          {digerEtkinlikler.length > 0 && (
            <div className="border-b border-ayrac p-1.5">
              {/* YENI DEFTER - liste basinda. Cok defterli kullanicida "yeni ac"
                  eylemi, mevcut defterler arasinda KAYBOLMAMALI: en ust sirada durur. */}
              <Link
                href="/etkinliklerim?yeni=1"
                onClick={() => setAcik(false)}
                className="flex items-center gap-2.5 rounded-lg px-3 py-2 font-govde text-sm font-medium text-sarap transition-colors hover:bg-sarap/10"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" aria-hidden>
                  <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
                </svg>
                Yeni Etkinlik Defteri Aç
              </Link>

              <p className="px-3 pb-1 pt-2 font-govde text-[0.6rem] uppercase tracking-etiket text-ikincil">
                Diğer defterlerin
              </p>
              {digerEtkinlikler.map((e) => (
                <KaydirSil
                  key={e.id}
                  acikMi={kaydirAcik === e.id}
                  onAc={() => setKaydirAcik(e.id)}
                  onKapat={() => setKaydirAcik(null)}
                  onSil={() => silNiyeti(e)}
                >
                  <div className="group flex w-full min-w-0 items-center gap-1 rounded-lg transition-colors hover:bg-yuzeyKoyu">
                    {/* KAPAT (x) - MASAUSTU YOLU.
                        Adin SOLUNDA durur ve yalniz satirin uzerine gelinince
                        belirir; bildirim (x)'i ile ayni gorsel dil. Tek farki:
                        bildirim tek tikla gider, defter GITMEZ - once onay.
                        Bildirim bir kayittir, defter bir mirastir. */}
                    <button
                      type="button"
                      onClick={(ev) => { ev.stopPropagation(); silNiyeti(e); }}
                      aria-label={`${e.es1_ad} & ${e.es2_ad} defterini sil`}
                      className="ml-1.5 hidden shrink-0 rounded-full p-1 text-ikincil opacity-0 transition-opacity hover:text-sarap focus-visible:opacity-100 group-hover:opacity-100 sm:block"
                    >
                      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" aria-hidden>
                        <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
                      </svg>
                    </button>

                    <button
                      type="button"
                      disabled={gecis}
                      onClick={() => etkinlikDegistir(e.id)}
                      className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-3 py-2 text-left font-govde text-sm text-murekkep disabled:opacity-50"
                    >
                      <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-ikincil" aria-hidden>
                        <path d="M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7Z" stroke="currentColor" strokeWidth={1.6} fill="none" />
                        <path d="M4 9h16M8 3v4M16 3v4" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" />
                      </svg>
                      <span className="min-w-0 flex-1 truncate">
                        {e.es1_ad} &amp; {e.es2_ad} - {turKisa(e.tur)}
                      </span>
                      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0 text-ikincil" aria-hidden>
                        <path d="m9 6 6 6-6 6" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" fill="none" />
                      </svg>
                    </button>
                  </div>
                </KaydirSil>
              ))}
            </div>
          )}

          {/* Bolum A - Hesap & araclar: Profilim, Fotograflar, Ayarlar, Cop Kutusu, Super Panel */}
          <div className="border-b border-ayrac p-1.5">
            <MenuDugme
              onClick={() => { setAcik(false); setTimeout(() => setProfilAcik(true), 50); }}
              ikon={
                <>
                  <circle cx="12" cy="8.5" r="3.4" stroke="currentColor" strokeWidth={1.6} fill="none" />
                  <path d="M5 19.5a7 7 0 0 1 14 0" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" fill="none" />
                </>
              }
            >
              Profilim
            </MenuDugme>

            <MenuLink href="/fotograflar" onClick={() => setAcik(false)} ikon={
              <>
                <path d="M4 7a2 2 0 0 1 2-2h2l1.5-2h5L16 5h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7Z" stroke="currentColor" strokeWidth={1.6} strokeLinejoin="round" fill="none" />
                <circle cx="12" cy="12" r="3.2" stroke="currentColor" strokeWidth={1.6} fill="none" />
              </>
            }>
              Fotoğraflar
            </MenuLink>

            <MenuLink href="/ayarlar" onClick={() => setAcik(false)} ikon={
              <path d="M12 3.5 5 6.2v5c0 4.2 2.9 8.1 7 9.3 4.1-1.2 7-5.1 7-9.3v-5L12 3.5Z" stroke="currentColor" strokeWidth={1.6} strokeLinejoin="round" fill="none" />
            }>
              Ayarlar
            </MenuLink>

            <MenuLink href="/cop-kutusu" onClick={() => setAcik(false)} ikon={
              <path d="M5 7h14M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7M6.5 7l.7 12a2 2 0 0 0 2 1.9h5.6a2 2 0 0 0 2-1.9l.7-12" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" fill="none" />
            }>
              Çöp Kutusu
            </MenuLink>

            {kullanici.super_admin && (
              <Link
                href="/super-panel"
                onClick={() => setAcik(false)}
                className="flex items-center gap-2.5 rounded-lg px-3 py-2 font-govde text-sm font-medium text-yaldiz transition-colors hover:bg-yuzeyKoyu"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" aria-hidden>
                  <path d="M4 8.5 7.5 12 12 5l4.5 7L20 8.5V18a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V8.5Z" stroke="currentColor" strokeWidth={1.6} strokeLinejoin="round" fill="none" />
                </svg>
                Süper Panel
              </Link>
            )}
          </div>

          {/* Bolum B - Defter yollari */}
          <div className="border-b border-ayrac p-1.5">
            <MenuLink href="/gelen-dilekler" onClick={() => setAcik(false)} ikon={
              <>
                <path d="M5 4h9a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4Z" stroke="currentColor" strokeWidth={1.6} strokeLinejoin="round" fill="none" />
                <path d="M8 8h6M8 11h6" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" />
              </>
            }>
              Gelen Dilekler
            </MenuLink>

            <MenuLink href="/dilek-baglantisi" onClick={() => setAcik(false)} ikon={
              <>
                <circle cx="18" cy="5" r="2.3" stroke="currentColor" strokeWidth={1.6} fill="none" />
                <circle cx="6" cy="12" r="2.3" stroke="currentColor" strokeWidth={1.6} fill="none" />
                <circle cx="18" cy="19" r="2.3" stroke="currentColor" strokeWidth={1.6} fill="none" />
                <path d="m8.2 10.8 7.6-4.6M8.2 13.2l7.6 4.6" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" />
              </>
            }>
              Dilek Bağlantısını Paylaş
            </MenuLink>

            <MenuLink href="/davetiye-karekodu" onClick={() => setAcik(false)} ikon={
              <>
                <rect x="4" y="4" width="6" height="6" rx="1" stroke="currentColor" strokeWidth={1.6} fill="none" />
                <rect x="14" y="4" width="6" height="6" rx="1" stroke="currentColor" strokeWidth={1.6} fill="none" />
                <rect x="4" y="14" width="6" height="6" rx="1" stroke="currentColor" strokeWidth={1.6} fill="none" />
                <path d="M14 14h3v3M20 14v.01M14 20h.01M20 17v3h-3" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
              </>
            }>
              Davetiyene QR Kodu Ekle
            </MenuLink>

            <MenuLink href="/baskiya-hazir-defter" onClick={() => setAcik(false)} ikon={
              <>
                <path d="M5 4h9a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4Z" stroke="currentColor" strokeWidth={1.6} strokeLinejoin="round" fill="none" />
                <path d="m11 9 1 2.2 2.2 1-2.2 1L11 15.4 10 13.2 7.8 12.2 10 11.2 11 9Z" stroke="currentColor" strokeWidth={1.2} strokeLinejoin="round" fill="none" />
              </>
            }>
              Baskıya Hazır Defter
            </MenuLink>
          </div>

          {/* YENI DEFTER - TEK DEFTERLIYSE.
              Cok defterliyse yukarida (liste basinda) zaten var; burada tekrar
              gostermek ayni eylemi iki yere koymak olurdu. Tek defterlide switcher
              bolumu hic olusmadigi icin eylem KAYBOLUYORDU - "Etkinliklerim" araci
              Ayarlar'dan kaldirilinca yeni defter acmanin yolu kalmamisti. */}
          {digerEtkinlikler.length === 0 && (
            <div className="border-b border-ayrac p-1.5">
              <Link
                href="/etkinliklerim?yeni=1"
                onClick={() => setAcik(false)}
                className="flex items-center gap-2.5 rounded-lg px-3 py-2 font-govde text-sm font-medium text-sarap transition-colors hover:bg-sarap/10"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" aria-hidden>
                  <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
                </svg>
                Yeni Etkinlik Defteri Aç
              </Link>
            </div>
          )}

          {/* Tema */}
          <div className="border-b border-ayrac p-1.5">
            <button
              onClick={temaTersle}
              className="flex w-full items-center justify-between gap-2.5 rounded-lg px-3 py-2 font-govde text-sm text-murekkep transition-colors hover:bg-yuzeyKoyu"
            >
              <span className="flex items-center gap-2.5">
                <svg viewBox="0 0 24 24" className="h-4 w-4 text-ikincil" aria-hidden>
                  {tema === "acik" ? (
                    <path d="M20 14A8 8 0 0 1 10 4a8 8 0 1 0 10 10Z" stroke="currentColor" strokeWidth={1.6} strokeLinejoin="round" fill="none" />
                  ) : (
                    <>
                      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth={1.6} fill="none" />
                      <path d="M12 3v2M12 19v2M3 12h2M19 12h2M6 6l1.5 1.5M16.5 16.5 18 18M6 18l1.5-1.5M16.5 7.5 18 6" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" />
                    </>
                  )}
                </svg>
                {tema === "acik" ? "Koyu tema" : "Açık tema"}
              </span>
              <span
                role="switch"
                aria-checked={tema === "koyu"}
                className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${tema === "koyu" ? "bg-sarap" : "bg-ayrac"}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-parsomen shadow-sm transition-transform ${tema === "koyu" ? "translate-x-4" : "translate-x-0.5"}`} />
              </span>
            </button>
          </div>

          {/* Bildirimler */}
          <div className="border-b border-ayrac p-1.5">
            <div className="flex items-center justify-between px-3 pb-1 pt-1">
              <p className="font-govde text-[0.65rem] uppercase tracking-etiket text-ikincil">Bildirimler</p>
              {bildirimler.length > 0 && (
                <button onClick={bildirimTumunuTemizle} className="font-govde text-[0.65rem] text-ikincil transition-colors hover:text-sarap">
                  Tümünü temizle
                </button>
              )}
            </div>

            {bildirimler.length === 0 ? (
              <p className="px-3 py-2 font-govde text-xs text-ikincil">Yeni bildirim yok.</p>
            ) : (
              // IC SCROLL YOK: menunun KENDISI kaydirilir. Ic ice kaydirma alanlari,
              // parmak nereye denk gelirse orayi kaydirdigi icin kullanici
              // "Cikis yap"a ULASAMIYORDU - klasik ic-ice scroll tuzagi.
              //
              // SINIR YOK: onceden yalniz ilk 8 gosteriliyordu, gerisi SESSIZCE
              // kayboluyordu. Backend zaten makul bir ust sinirla getiriyor.
              <div>
                {bildirimler.map((b) => (
                  <div key={b.id} className="group flex items-start gap-2.5 rounded-lg px-3 py-2.5 transition-colors hover:bg-yuzeyKoyu">
                    <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${b.okundu_mu ? "bg-yuzeyKoyu text-ikincil" : "bg-sarap/12 text-sarap"}`}>
                      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" aria-hidden>
                        <path d="M5 4h9a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4Z" stroke="currentColor" strokeWidth={1.6} strokeLinejoin="round" fill="none" />
                        <path d="M8 9h6M8 12h4" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" />
                      </svg>
                    </span>
                    <div className="min-w-0 flex-1">
                      {/* BASLIK + METIN: tiklayinca ilgili yere GIDER (asil eylem). */}
                      <button onClick={() => bildirimeTikla(b)} className="w-full min-w-0 text-left">
                        <p className={`font-govde text-xs font-medium ${b.okundu_mu ? "text-ikincil" : "text-sarap"}`}>
                          {b.baslik}
                        </p>
                        {/* KIRPMA JS ILE YAPILIR - CSS line-clamp DEGIL.
                            line-clamp gizli metni kutunun icinde tutar; bazi
                            tarayicilarda kutu yuksekligi TAM metne gore hesaplanir ve
                            altta hayalet bosluk kalir - "Devamini oku" metinden kopuk,
                            havada durur gibi gorunurdu. JS ile kesilen metin, tam
                            gorundugu kadar yer kaplar; buton HEMEN altina oturur. */}
                        <p
                          className={`mt-0.5 whitespace-pre-wrap font-govde text-[0.7rem] leading-snug ${
                            b.okundu_mu ? "text-ikincil/70" : "text-murekkep"
                          }`}
                        >
                          {acikBildirim === b.id ? b.mesaj : kisalt(b.mesaj)}
                        </p>
                      </button>

                      {/* DEVAMINI OKU - SURTUNMESIZ.
                          Uzun bildirim (ozellikle silme uyarilari) iki satirda kesiliyor
                          ve ciddiyetini yitiriyordu. Ayri bir sayfaya/modala gondermek
                          ise okumak icin menuyu KAPATTIRIRDI - kullanici baglami kaybeder.
                          Cozum: YERINDE acilir. Menuden cikmadan tam metin okunur;
                          eylem butonu (basliga tiklama) hala calisir. */}
                      {b.mesaj.length > KIRPMA_SINIR && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setAcikBildirim(acikBildirim === b.id ? null : b.id);
                          }}
                          className="mt-1 inline-flex items-center gap-1 font-govde text-[0.62rem] font-medium text-sarap transition-colors hover:text-sarapKoyu"
                        >
                          {acikBildirim === b.id ? "Daralt" : "Devamını oku"}
                          <svg
                            viewBox="0 0 24 24"
                            className={`h-3 w-3 transition-transform ${acikBildirim === b.id ? "rotate-180" : ""}`}
                            aria-hidden
                          >
                            <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
                          </svg>
                        </button>
                      )}

                      <p className="mt-0.5 font-govde text-[0.6rem] text-ikincil">{gecenSure(b.created_at)}</p>
                    </div>
                    {!b.okundu_mu && <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-sarap" aria-hidden />}
                    <button
                      onClick={(e) => { e.stopPropagation(); bildirimSil(b.id); }}
                      aria-label="Bildirimi sil"
                      className="shrink-0 self-center p-1 text-ikincil opacity-0 transition-opacity hover:text-sarap group-hover:opacity-100"
                    >
                      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" aria-hidden>
                        <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SORUN BILDIR & DESTEK AL - cikisin hemen ustunde, kendi alaninda.
              Konum bilincli: kullanici "buradan cikayim" derken once "sorabilirim"i
              gorur. Uygulamayi terk etmeden once son bir kapi. */}
          <div className="border-b border-ayrac p-1.5">
            <button
              onClick={() => { setAcik(false); setTimeout(() => setDestekAcik(true), 50); }}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 font-govde text-sm text-murekkep transition-colors hover:bg-yuzeyKoyu"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-ikincil" aria-hidden>
                <path d="M21 11.5a8.5 8.5 0 0 1-12.3 7.6L3 20.5l1.5-5.4A8.5 8.5 0 1 1 21 11.5Z" stroke="currentColor" strokeWidth={1.6} strokeLinejoin="round" fill="none" />
                <path d="M9.6 9.2a2.4 2.4 0 1 1 3.2 2.3c-.5.2-.8.7-.8 1.2v.3" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" fill="none" />
                <circle cx="12" cy="16" r="0.6" fill="currentColor" />
              </svg>
              Sorun Bildir &amp; Destek Al
            </button>
          </div>

          {/* Cikis */}
          <div className="p-1.5">
            <button
              onClick={cikis}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 font-govde text-sm text-sarap transition-colors hover:bg-yuzeyKoyu"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
                <path d="M14 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-2M9 12h11M17 9l3 3-3 3" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" fill="none" />
              </svg>
              Çıkış yap
            </button>
          </div>
        </div>
      )}

      {/* DEFTER SILME ONAYI - COPE TASI, kalici silme DEGIL.
          Siddet "uyari": islem geri alinabilir ve pencere bunu acikca soyler.
          Kritik seviye (ad yazarak teyit) yalnizca KALICI silmeye ayrildi; her
          seyi kritik yapmak, kritigi anlamsizlastirir. */}
      <TehlikeliEylem
        acik={silHedef !== null}
        siddet="uyari"
        baslik={`Çöp kutusuna taşı: ${silHedef?.es1_ad} & ${silHedef?.es2_ad}`}
        etkilenen="Bu defter ve davetlileri"
        etkiler={[
          "Defter listenden kaybolur; menüde artık görünmez.",
          "Davetli bağlantıları çalışmaz - yeni dilek gelmez.",
          "Dilekler ve fotoğraflar SİLİNMEZ, çöp kutusunda bekler.",
          "Baskıya hazır nüsha indirilemez.",
        ]}
        geriDonus="Çöp Kutusu'ndan geri alınabilir. 5 gün sonra kalıcı olarak silinir."
        onayEtiket="Çöp kutusuna taşı"
        yukleniyor={siliniyor}
        onOnay={() => { void defterSil(); }}
        onKapat={() => setSilHedef(null)}
      />

      <DestekModal
        acik={destekAcik}
        bildirimden={destekBildirimden}
        onKapat={() => { setDestekAcik(false); setDestekBildirimden(false); }}
      />

      {profilAcik && (
        <ProfilimModal
          kullanici={kullanici}
          onKapat={() => setProfilAcik(false)}
          onGuncellendi={(k) => setKullanici(k)}
        />
      )}
    </div>
  );
}

// Menu ici link (ikon + metin)
function MenuLink({
  href,
  onClick,
  ikon,
  children,
}: {
  href: string;
  onClick: () => void;
  ikon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-2.5 rounded-lg px-3 py-2 font-govde text-sm text-murekkep transition-colors hover:bg-yuzeyKoyu"
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4 text-ikincil" aria-hidden>
        {ikon}
      </svg>
      {children}
    </Link>
  );
}

// Menu ogesi - buton (Profilim gibi modal acanlar icin)
function MenuDugme({
  onClick,
  ikon,
  children,
}: {
  onClick: () => void;
  ikon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left font-govde text-sm text-murekkep transition-colors hover:bg-yuzeyKoyu"
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-ikincil" aria-hidden>
        {ikon}
      </svg>
      {children}
    </button>
  );
}

// Gecen sure metni ("3 dk once", "2 sa once", "dun", ...)
function gecenSure(iso: string): string {
  const t = new Date(iso).getTime();
  if (isNaN(t)) return "";
  const fark = Math.floor((Date.now() - t) / 1000);
  if (fark < 60) return "az önce";
  if (fark < 3600) return `${Math.floor(fark / 60)} dk önce`;
  if (fark < 86400) return `${Math.floor(fark / 3600)} sa önce`;
  const gun = Math.floor(fark / 86400);
  if (gun === 1) return "dün";
  if (gun < 7) return `${gun} gün önce`;
  return new Date(iso).toLocaleDateString("tr-TR", { day: "numeric", month: "long" });
}

// Etkinlik turu kisa etiketi (switcher rozeti)
function turKisa(tur: string): string {
  if (tur === "dugun") return "Düğün";
  if (tur === "nisan") return "Nişan";
  if (tur === "nikah") return "Nikah";
  return tur;
}
