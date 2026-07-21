"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  api,
  type SuperOzet,
  type SuperDefter,
  type SuperKullanici,
  type AkisKaydi,
  type KvkkTalep,
  type CopKutusu,
} from "@/lib/api";
import { AppShell } from "@/components/site/AppShell";
import { OlcumSekmesi } from "@/components/site/SuperOlcum";
import { SaglikRozeti, DefterDetayModal } from "@/components/site/SuperDefterDetay";
import { TehlikeliEylem } from "@/components/site/TehlikeliEylem";
import { defterDurumu, durumTonSinif } from "@/lib/durum";
import { DestekSekmesi } from "@/components/site/DestekSekmesi";
import { SssYonetimi } from "@/components/site/SssYonetimi";
import { KvkkYonetimi } from "@/components/site/KvkkYonetimi";
import OdemelerSekmesi from "@/components/site/OdemelerSekmesi";

// SUPER PANEL - sistem yoneticisi gorusu (planlama super-admin deseni).
// Sekmeler: Defterler / Kullanicilar / Cop Kutusu / KVKK / Canli Akis
type Sekme = "defterler" | "destek" | "sss" | "odemeler" | "olcum" | "kullanicilar" | "cop" | "kvkk" | "akis";

const SEKMELER: { kod: Sekme; etiket: string }[] = [
  { kod: "defterler", etiket: "Defterler" },
  { kod: "destek", etiket: "Destek Talepleri" },
  { kod: "sss", etiket: "Sık Sorulanlar" },
  { kod: "odemeler", etiket: "Ödemeler" },
  { kod: "olcum", etiket: "Ölçüm" },
  { kod: "kullanicilar", etiket: "Kullanıcılar" },
  { kod: "cop", etiket: "Çöp Kutusu" },
  { kod: "kvkk", etiket: "KVKK" },
  { kod: "akis", etiket: "Canlı Akış" },
];

export default function SuperPanelSayfasi() {
  const router = useRouter();
  const [ozet, setOzet] = useState<SuperOzet | null>(null);
  const [durum, setDurum] = useState<"yukleniyor" | "hazir" | "yetkisiz">("yukleniyor");
  const [sekme, setSekme] = useState<Sekme>("defterler");
  // DERIN BAGLANTI: bildirimden gelen "?sekme=destek&talep=..." dogru sekmeyi acar.
  // Yonetici listede aramaz - bildirimin isaret ettigi konusmaya DOGRUDAN duser.
  const [odakTalep, setOdakTalep] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const p = new URLSearchParams(window.location.search);
    const s = p.get("sekme");
    const t = p.get("talep");
    if (s === "destek") setSekme("destek");
    if (t) setOdakTalep(t);
    if (s || t) {
      p.delete("sekme"); p.delete("talep");
      window.history.replaceState(null, "", window.location.pathname + (p.toString() ? `?${p}` : ""));
    }
  }, []);

  useEffect(() => {
    (async () => {
      const b = await api.ben();
      if (!b.ok) {
        router.replace("/giris");
        return;
      }
      if (!b.veri.super_admin) {
        setDurum("yetkisiz");
        return;
      }
      const o = await api.superOzet();
      if (o.ok) setOzet(o.veri);
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

  if (durum === "yetkisiz") {
    return (
      <AppShell>
        <div className="rounded-3xl border border-ayrac bg-yuzey p-10 text-center">
          <p className="font-govde text-sm text-ikincil">
            Bu alana yalnız sistem yöneticisi erişebilir.
          </p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      {/* SISTEM NABZI - panele girer girmez "her sey yolunda mi?" cevabi.
          Yalniz MUDAHALE GEREKTIREN sayilar burada; suslu istatistik asagida. */}
      {ozet && <SistemNabzi ozet={ozet} onGit={setSekme} />}

      {/* Sistem sagligi ozeti */}
      {ozet && <OzetIzgara ozet={ozet} />}

      {/* Sekmeler */}
      <div className="mt-6 flex min-w-0 gap-1 overflow-x-auto rounded-full border border-ayrac bg-yuzey p-1">
        {SEKMELER.map((s) => (
          <button
            key={s.kod}
            onClick={() => setSekme(s.kod)}
            className={`shrink-0 rounded-full px-4 py-2 font-govde text-sm transition-colors ${
              sekme === s.kod ? "bg-sarap text-parsomen" : "text-ikincil hover:text-murekkep"
            }`}
          >
            {s.etiket}
            {s.kod === "kvkk" && ozet && ozet.kvkk.bekleyen_talep > 0 && (
              <span className="ml-1.5 rounded-full bg-yaldiz px-1.5 py-0.5 text-[0.6rem] font-bold text-murekkep">
                {ozet.kvkk.bekleyen_talep}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {sekme === "defterler" && <DefterlerSekmesi />}
        {sekme === "destek" && <DestekSekmesi odakTalep={odakTalep} />}
        {sekme === "sss" && <SssYonetimi />}
        {sekme === "odemeler" && <OdemelerSekmesi />}
        {sekme === "olcum" && <OlcumSekmesi />}
        {sekme === "kullanicilar" && <KullanicilarSekmesi />}
        {sekme === "cop" && <CopSekmesi />}
        {sekme === "kvkk" && <KvkkYonetimi />}
        {sekme === "akis" && <AkisSekmesi />}
      </div>
    </AppShell>
  );
}

// ---------------- OZET ----------------
function OzetIzgara({ ozet }: { ozet: SuperOzet }) {
  const kartlar = [
    {
      etiket: "Defterler",
      deger: ozet.defter.toplam,
      alt: `${ozet.defter.aktif} aktif · ${ozet.defter.yeni_7gun} yeni (7g)`,
    },
    {
      etiket: "Dilekler",
      deger: ozet.dilek.toplam,
      alt: `${ozet.dilek.beklemede} bekleyen · ${ozet.dilek.onayli} onaylı`,
    },
    {
      etiket: "Kullanıcılar",
      deger: ozet.kullanici.toplam,
      alt: `${ozet.kullanici.super_admin} sistem yöneticisi`,
    },
    {
      etiket: "Dikkat",
      deger: ozet.defter.donduruldu + ozet.kvkk.bekleyen_talep,
      alt: `${ozet.defter.donduruldu} dondurulmuş · ${ozet.kvkk.bekleyen_talep} KVKK talebi`,
      vurgu: ozet.defter.donduruldu + ozet.kvkk.bekleyen_talep > 0,
    },
  ];

  return (
    <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {kartlar.map((k) => (
        <div
          key={k.etiket}
          className={`min-w-0 rounded-2xl border bg-yuzey p-5 ${
            k.vurgu ? "border-yaldiz/50" : "border-ayrac"
          }`}
        >
          <p className="font-govde text-[0.65rem] uppercase tracking-etiket text-ikincil">
            {k.etiket}
          </p>
          <p
            className={`mt-1 font-display text-3xl ${
              k.vurgu ? "text-yaldiz" : "text-murekkep"
            }`}
          >
            {k.deger}
          </p>
          <p className="mt-1 truncate font-govde text-xs text-ikincil">{k.alt}</p>
        </div>
      ))}
    </div>
  );
}

// ---------------- DEFTERLER ----------------
function DefterlerSekmesi() {
  const [defterler, setDefterler] = useState<SuperDefter[]>([]);
  const [detayId, setDetayId] = useState<string | null>(null);
  const [ara, setAra] = useState("");
  const [yukleniyor, setYukleniyor] = useState(true);
  const [islenen, setIslenen] = useState<string | null>(null);
  // ONAY HEDEFLERI - geri alinabilir eylemler de artik ETKISINI anlatarak sorar.
  const [dondurHedef, setDondurHedef] = useState<SuperDefter | null>(null);
  const [copHedef, setCopHedef] = useState<SuperDefter | null>(null);
  const [denemeTur, setDenemeTur] = useState("dugun");
  // Cift tiklama korumasi: onceden hata mesaji yuzunden kullanici tekrar tekrar
  // basip 5-6 defter uretmisti.
  const [uretiliyor, setUretiliyor] = useState(false);
  const [mesajHedef, setMesajHedef] = useState<
    { kullaniciId: string; ad: string; email: string; etkinlikId: string } | null
  >(null);

  const cek = useCallback(async () => {
    setYukleniyor(true);
    const c = await api.superDefterler(ara || undefined);
    if (c.ok) setDefterler(c.veri);
    setYukleniyor(false);
  }, [ara]);

  useEffect(() => {
    const z = setTimeout(cek, ara ? 350 : 0);
    return () => clearTimeout(z);
  }, [cek, ara]);

  async function goruntule(d: SuperDefter) {
    setIslenen(d.id);
    const c = await api.superGoruntule(d.id);
    setIslenen(null);
    if (!c.ok) {
      toast.error(c.mesaj);
      return;
    }
    // JWT yenilendi - tam yenileme ile deftere gec
    window.location.href = "/gelen-dilekler";
  }

  async function dondur(d: SuperDefter) {
    setIslenen(d.id);
    const c = await api.superDondur(d.id);
    setIslenen(null);
    if (!c.ok) {
      toast.error(c.mesaj);
      return;
    }
    toast.success(c.veri.donduruldu ? "Defter donduruldu." : "Defter yeniden açıldı.");
    void cek();
  }

  async function copeAt(d: SuperDefter) {
    setIslenen(d.id);
    const c = await api.superDefterCopeAt(d.id);
    setIslenen(null);
    if (!c.ok) {
      toast.error(c.mesaj);
      return;
    }
    toast.success("Defter çöp kutusuna taşındı - geri alınabilir.");
    void cek();
  }


  return (
    <div>
      <input
        value={ara}
        onChange={(e) => setAra(e.target.value)}
        placeholder="Çift adıyla ara..."
        className="w-full rounded-xl border border-ayrac bg-yuzey px-4 py-3 font-govde text-sm text-murekkep outline-none focus:border-sarap"
      />

      {/* DENEME DEFTERI - gelistirme ve dogrulama araci.
          Uretilen defter NORMAL bir defterdir; secilen tur ve evrede dogar. Boylece
          "nisan defterinin indirme penceresi" gibi bir durum gunlerce beklemeden
          gorulebilir - canlida yakalanan hatalarin cogu bu yuzden kacmisti.
          Ad benzersizdir ("Deneme 03 · Nişan · İndirme"): birden fazla deneme
          defteri uretildiginde hangisinin ne oldugu LISTEDEN okunur. */}
      <div className="mt-3 rounded-2xl border border-dashed border-ayrac bg-parsomen px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-govde text-xs text-ikincil">Deneme defteri türü:</span>
          {[
            { kod: "dugun", ad: "Düğün" },
            { kod: "nisan", ad: "Nişan" },
            { kod: "nikah", ad: "Nikâh" },
          ].map((t) => (
            <button
              key={t.kod}
              onClick={() => setDenemeTur(t.kod)}
              className={`rounded-full px-3 py-1.5 font-govde text-[0.65rem] transition-colors ${
                denemeTur === t.kod
                  ? "bg-sarap text-parsomen"
                  : "border border-ayrac text-ikincil hover:border-sarap hover:text-sarap"
              }`}
            >
              {t.ad}
            </button>
          ))}
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="font-govde text-xs text-ikincil">Evre seç ve üret:</span>
          {[
            { kod: "toplaniyor", ad: "Toplanıyor" },
            { kod: "son-gunler", ad: "Özel gün geçti" },
            { kod: "indirme", ad: "İndirme penceresi" },
            { kod: "sonlaniyor", ad: "Son saatler" },
          ].map((e) => (
            <button
              key={e.kod}
              disabled={uretiliyor}
              onClick={async () => {
                setUretiliyor(true);
                const c = await api.superDenemeDefteri(e.kod, denemeTur);
                setUretiliyor(false);
                if (!c.ok) { toast.error(c.mesaj); return; }
                toast.success(`Üretildi: ${c.veri.ad}`);
                void cek();
              }}
              className="rounded-full border border-ayrac px-3 py-1.5 font-govde text-[0.65rem] text-ikincil transition-colors hover:border-sarap hover:text-sarap disabled:opacity-50"
            >
              {e.ad}
            </button>
          ))}
          {uretiliyor && (
            <span className="font-govde text-[0.65rem] text-ikincil">Üretiliyor...</span>
          )}
        </div>
      </div>

      {yukleniyor ? (
        <p className="mt-6 text-center font-govde text-sm text-ikincil">Yükleniyor...</p>
      ) : defterler.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-dashed border-ayrac bg-parsomen px-6 py-10 text-center font-govde text-sm text-ikincil">
          Defter bulunamadı.
        </p>
      ) : (
        <div className="mt-4 grid min-w-0 gap-3 lg:grid-cols-2">
          {defterler.map((d) => (
            <div
              key={d.id}
              className={`min-w-0 rounded-2xl border bg-yuzey p-5 ${
                d.donduruldu ? "border-sarap/50" : "border-ayrac"
              }`}
            >
              <div className="flex min-w-0 items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-display text-lg text-murekkep">
                    {d.es1_ad} &amp; {d.es2_ad}
                  </p>
                  <p className="mt-0.5 font-govde text-xs text-ikincil">
                    {turEtiketi(d.tur)} · {tarihKisa(d.etkinlik_tarihi)} · {d.uye_sayisi} üye
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  {/* SAGLIK: yonetici, batan defteri LISTEDEN gorur - acmasi gerekmez */}
                  <SaglikRozeti skor={d.saglik} />
                  {/* Eski "durum" rozeti (Hazirlik/Aktif) KALDIRILDI: o alan defter
                      kuruldugunda yazilip bir daha degismiyordu - bilgi tasimiyordu.
                      Yerini asagidaki CANLI EVRE rozeti aldi (lib/durum.ts). */}
                  {d.donduruldu && <Rozet metin="Dondurulmuş" tip="uyari" />}
                  {d.yetim && <Rozet metin="Yetim" tip="uyari" />}
                  {d.hareketsiz && <Rozet metin="Hareketsiz" tip="soluk" />}
                </div>
              </div>

              {/* EVRE - kullanicinin gordugu ile AYNI kaynak (lib/durum.ts).
                  Yonetici, ciftin ekraninda ne yazdigini BILEREK konusur; iki taraf
                  ayni cumleyi gorur. Ayri bir "yonetici dili" uydurmak, destekte
                  yanlis anlasilmanin en yaygin sebebidir. */}
              {!d.silindi_mi && (
                <div className="mt-2">
                  <span className={`inline-block rounded-full border px-2.5 py-0.5 font-govde text-[0.6rem] font-medium ${durumTonSinif(defterDurumu(d).ton)}`}>
                    {defterDurumu(d).etiket}
                  </span>
                </div>
              )}

              {/* Uyeler - kim, hangi rolde */}
              <div className="mt-3 space-y-1">
                {d.uyeler.length === 0 ? (
                  <p className="font-govde text-xs text-yaldiz">
                    Bu defterin hiç üyesi yok - müdahale gerekebilir.
                  </p>
                ) : (
                  d.uyeler.map((u) => (
                    <div key={u.email} className="flex min-w-0 items-center justify-between gap-2">
                      <p className="min-w-0 truncate font-govde text-xs text-ikincil">
                        <span className="text-murekkep">{u.ad}</span> · {u.email}
                      </p>
                      {/* PROAKTIF MESAJ - sikayeti beklemeden ulasmak.
                          Odemesi takilan, defteri imhaya yaklasan ya da bir sorunu
                          FARK ETTIGIMIZ kullaniciya once BIZ yazariz. */}
                      <button
                        onClick={() => setMesajHedef({ kullaniciId: u.id, ad: u.ad, email: u.email, etkinlikId: d.id })}
                        title={`${u.ad} kişisine doğrudan mesaj gönder`}
                        className="shrink-0 rounded-full border border-ayrac px-2.5 py-1 font-govde text-[0.62rem] text-ikincil transition-colors hover:border-sarap hover:text-sarap"
                      >
                        Mesaj
                      </button>
                    </div>
                  ))
                )}
              </div>

              <div className="mt-3 flex flex-wrap gap-3 font-govde text-xs text-ikincil">
                <span>{d.dilek_sayisi} dilek</span>
                {d.bekleyen_dilek > 0 && (
                  <span className="text-yaldiz">{d.bekleyen_dilek} bekleyen</span>
                )}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {/* TESHIS: deftere GIRMEDEN sorunu gor. Impersonation'a alternatif -
                    daha az yetki, ayni fayda. */}
                <button
                  onClick={() => setDetayId(d.id)}
                  className="rounded-full border border-yaldiz/50 px-4 py-2 font-govde text-xs text-yaldiz transition-colors hover:bg-yaldiz/10"
                >
                  İncele
                </button>
                <button
                  onClick={() => goruntule(d)}
                  disabled={islenen === d.id}
                  className="rounded-full bg-sarap px-4 py-2 font-govde text-xs font-medium text-parsomen transition-colors hover:bg-sarapKoyu disabled:opacity-50"
                >
                  Görüntüle
                </button>
                <button
                  onClick={() => setDondurHedef(d)}
                  disabled={islenen === d.id}
                  className="rounded-full border border-ayrac px-4 py-2 font-govde text-xs text-ikincil transition-colors hover:border-sarap hover:text-sarap disabled:opacity-50"
                >
                  {d.donduruldu ? "Çöz" : "Dondur"}
                </button>
                <button
                  onClick={() => setCopHedef(d)}
                  disabled={islenen === d.id}
                  className="rounded-full border border-ayrac px-4 py-2 font-govde text-xs text-ikincil transition-colors hover:border-sarap hover:text-sarap disabled:opacity-50"
                >
                  Çöpe at
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TESHIS MODALI - saglik, yasam dongusu, dilek dagilimi, medya + RONTGEN */}
      {detayId && (
        <DefterDetayModal defterId={detayId} onKapat={() => setDetayId(null)} />
      )}

      {/* DONDUR / COZ - geri alinabilir ama ETKISI buyuk: cift yazamaz, indiremez. */}
      <TehlikeliEylem
        acik={dondurHedef !== null}
        siddet={dondurHedef?.donduruldu ? "bilgi" : "uyari"}
        baslik={
          dondurHedef?.donduruldu
            ? `Dondurmayı çöz: ${dondurHedef?.es1_ad} & ${dondurHedef?.es2_ad}`
            : `Defteri dondur: ${dondurHedef?.es1_ad} & ${dondurHedef?.es2_ad}`
        }
        etkilenen="Çift ve tüm davetliler"
        etkiler={
          dondurHedef?.donduruldu
            ? [
                "Defter yeniden yazılabilir hale gelir.",
                "Davetliler tekrar dilek bırakabilir.",
                "Çift baskıya hazır nüshayı indirebilir.",
                "Her iki eşe bildirim gönderilir.",
              ]
            : [
                "Defter SALT OKUNUR olur - çift görüntüler ama hiçbir değişiklik yapamaz.",
                "Davetliler dilek bırakamaz; bağlantıya girenler kapalı uyarısı görür.",
                "Baskıya hazır nüsha İNDİRİLEMEZ.",
                "Çiftin ekranında donduruldu bandı görünür ve her iki eşe bildirim gider.",
                "Geri sayım hatırlatmaları durur; imha takvimi DEĞİŞMEZ.",
              ]
        }
        geriDonus="Aynı düğmeden çözülebilir; hiçbir veri kaybolmaz."
        onayEtiket={dondurHedef?.donduruldu ? "Dondurmayı çöz" : "Defteri dondur"}
        yukleniyor={islenen === dondurHedef?.id}
        onOnay={() => { const d = dondurHedef; if (d) { void dondur(d); } setDondurHedef(null); }}
        onKapat={() => setDondurHedef(null)}
      />

      {/* COPE AT - geri alinabilir (cop kutusu), ama cift icin defter KAYBOLUR. */}
      <TehlikeliEylem
        acik={copHedef !== null}
        siddet="uyari"
        baslik={`Çöp kutusuna taşı: ${copHedef?.es1_ad} & ${copHedef?.es2_ad}`}
        etkilenen="Çift ve tüm davetliler"
        etkiler={[
          "Defter çiftin hesabından kaybolur - panelde artık görünmez.",
          "Davetli bağlantıları çalışmaz.",
          "Veriler SİLİNMEZ; çöp kutusunda bekler.",
        ]}
        geriDonus="Çöp Kutusu sekmesinden geri alınabilir. Veri kaybı olmaz."
        onayEtiket="Çöp kutusuna taşı"
        yukleniyor={islenen === copHedef?.id}
        onOnay={() => { const d = copHedef; if (d) { void copeAt(d); } setCopHedef(null); }}
        onKapat={() => setCopHedef(null)}
      />

      {mesajHedef && (
        <ProaktifMesajModal
          hedef={mesajHedef}
          onKapat={() => setMesajHedef(null)}
        />
      )}


    </div>
  );
}

// ---------------- KULLANICILAR ----------------
function KullanicilarSekmesi() {
  const [kullanicilar, setKullanicilar] = useState<SuperKullanici[]>([]);
  const [ara, setAra] = useState("");
  const [yukleniyor, setYukleniyor] = useState(true);
  const [silHedef, setSilHedef] = useState<SuperKullanici | null>(null);
  const [teyit, setTeyit] = useState("");

  const cek = useCallback(async () => {
    setYukleniyor(true);
    const c = await api.superKullanicilar(ara || undefined);
    if (c.ok) setKullanicilar(c.veri);
    setYukleniyor(false);
  }, [ara]);

  useEffect(() => {
    const z = setTimeout(cek, ara ? 350 : 0);
    return () => clearTimeout(z);
  }, [cek, ara]);

  async function yetkiDegistir(k: SuperKullanici) {
    const c = await api.superAdminAta(k.id, !k.super_admin);
    if (!c.ok) {
      toast.error(c.mesaj);
      return;
    }
    toast.success(
      c.veri.super_admin ? "Sistem yöneticisi yetkisi verildi." : "Yetki kaldırıldı."
    );
    void cek();
  }

  async function askiya(k: SuperKullanici) {
    const c = await api.superKullaniciAskiyaAl(k.id);
    if (!c.ok) {
      toast.error(c.mesaj);
      return;
    }
    toast.success(c.veri.askida ? "Hesap askıya alındı." : "Hesap yeniden açıldı.");
    void cek();
  }

  async function kullaniciSil() {
    if (!silHedef) return;
    const c = await api.superKullaniciSil(silHedef.id, teyit);
    if (!c.ok) {
      toast.error(c.mesaj);
      return;
    }
    toast.success("Hesap kalıcı olarak silindi.");
    setSilHedef(null);
    setTeyit("");
    void cek();
  }

  return (
    <div>
      <input
        value={ara}
        onChange={(e) => setAra(e.target.value)}
        placeholder="Ad veya e-posta ile ara..."
        className="w-full rounded-xl border border-ayrac bg-yuzey px-4 py-3 font-govde text-sm text-murekkep outline-none focus:border-sarap"
      />

      {yukleniyor ? (
        <p className="mt-6 text-center font-govde text-sm text-ikincil">Yükleniyor...</p>
      ) : (
        <div className="mt-4 overflow-hidden rounded-2xl border border-ayrac bg-yuzey">
          <div className="divide-y divide-ayrac">
            {kullanicilar.map((k) => (
              <div key={k.id} className="flex min-w-0 items-center gap-3 px-5 py-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sarap font-display text-sm text-parsomen">
                  {k.ad.charAt(0).toLocaleUpperCase("tr-TR")}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-govde text-sm font-medium text-murekkep">
                    {k.ad}
                    {k.super_admin && (
                      <span className="ml-2 font-govde text-[0.6rem] uppercase tracking-etiket text-yaldiz">
                        Yönetici
                      </span>
                    )}
                    {k.askida && (
                      <span className="ml-2 font-govde text-[0.6rem] uppercase tracking-etiket text-sarap">
                        Askıda
                      </span>
                    )}
                  </p>
                  <p className="truncate font-govde text-xs text-ikincil">{k.email}</p>
                  {k.defterler.length > 0 && (
                    <p className="mt-0.5 truncate font-govde text-[0.7rem] text-ikincil">
                      {k.defterler.map((d) => d.defter).join(" · ")}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
                  <button
                    onClick={() => yetkiDegistir(k)}
                    className="rounded-full border border-ayrac px-3 py-1.5 font-govde text-xs text-ikincil transition-colors hover:border-sarap hover:text-sarap"
                  >
                    {k.super_admin ? "Yetkiyi al" : "Yönetici yap"}
                  </button>
                  <button
                    onClick={() => askiya(k)}
                    className="rounded-full border border-ayrac px-3 py-1.5 font-govde text-xs text-ikincil transition-colors hover:border-sarap hover:text-sarap"
                  >
                    {k.askida ? "Geri aç" : "Askıya al"}
                  </button>
                  <button
                    onClick={() => {
                      setSilHedef(k);
                      setTeyit("");
                    }}
                    className="rounded-full border border-sarap/40 px-3 py-1.5 font-govde text-xs text-sarap transition-colors hover:bg-sarap/10"
                  >
                    Sil
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Kalici silme onayi - e-posta teyidi */}
      {silHedef && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setSilHedef(null)}
        >
          <div
            className="w-full max-w-md rounded-3xl border border-sarap/40 bg-yuzey p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="font-display text-lg text-sarap">Hesabı kalıcı sil</p>
            <p className="metin-yasli mt-3 font-govde text-sm leading-relaxed text-ikincil">
              Bu hesap, üyelikleri, bildirimleri ve cihaz kayıtları silinecek. Denetim kayıtları
              adli iz olarak korunur. Geri alınamaz - askıya almayı tercih edebilirsin.
            </p>
            <p className="mt-4 font-govde text-xs text-ikincil">
              Onaylamak için e-postayı tam yaz:
            </p>
            <p className="mt-1 truncate rounded-lg border border-ayrac bg-parsomen px-3 py-2 font-govde text-sm text-murekkep">
              {silHedef.email}
            </p>
            <input
              value={teyit}
              onChange={(e) => setTeyit(e.target.value)}
              placeholder="Buraya yaz..."
              className="mt-3 w-full rounded-xl border border-ayrac bg-parsomen px-4 py-3 font-govde text-sm text-murekkep outline-none focus:border-sarap"
            />
            <div className="mt-5 flex gap-2">
              <button
                onClick={kullaniciSil}
                disabled={teyit.trim().toLowerCase() !== silHedef.email.toLowerCase()}
                className="flex-1 rounded-full bg-sarap px-5 py-3 font-govde text-sm font-medium text-parsomen transition-colors hover:bg-sarapKoyu disabled:opacity-40"
              >
                Kalıcı sil
              </button>
              <button
                onClick={() => setSilHedef(null)}
                className="rounded-full border border-ayrac px-5 py-3 font-govde text-sm text-ikincil transition-colors hover:border-murekkep"
              >
                Vazgeç
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------- COP KUTUSU ----------------
function CopSekmesi() {
  // Kalici silme hedefi - onay ayni TehlikeliEylem bileseniyle (panelde TEK dil).
  const [kaliciHedef, setKaliciHedef] = useState<{ id: string; es1_ad: string; es2_ad: string } | null>(null);
  const [cop, setCop] = useState<CopKutusu | null>(null);
  const [yukleniyor, setYukleniyor] = useState(true);

  const cek = useCallback(async () => {
    setYukleniyor(true);
    const c = await api.superCop();
    if (c.ok) setCop(c.veri);
    setYukleniyor(false);
  }, []);

  useEffect(() => {
    void cek();
  }, [cek]);

  async function defterGeriAl(id: string) {
    const c = await api.superDefterGeriAl(id);
    if (!c.ok) {
      toast.error(c.mesaj);
      return;
    }
    toast.success("Defter geri yüklendi.");
    void cek();
  }

  async function dilekGeriAl(id: string) {
    const c = await api.superKatkiGeriAl(id);
    if (!c.ok) {
      toast.error(c.mesaj);
      return;
    }
    toast.success("Dilek geri yüklendi.");
    void cek();
  }

  if (yukleniyor) {
    return <p className="text-center font-govde text-sm text-ikincil">Yükleniyor...</p>;
  }

  const bos = !cop || (cop.defterler.length === 0 && cop.dilekler.length === 0);
  if (bos) {
    return (
      <p className="rounded-2xl border border-dashed border-ayrac bg-parsomen px-6 py-12 text-center font-display text-lg italic text-ikincil">
        çöp kutusu boş
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {cop!.defterler.length > 0 && (
        <section>
          <p className="mb-3 font-govde text-[0.65rem] uppercase tracking-etiket text-ikincil">
            Silinen defterler
          </p>
          <div className="space-y-2">
            {cop!.defterler.map((d) => (
              <div
                key={d.id}
                className="flex min-w-0 items-center gap-3 rounded-2xl border border-ayrac bg-yuzey p-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-govde text-sm text-murekkep line-through">
                    {d.es1_ad} &amp; {d.es2_ad}
                  </p>
                  <p className="font-govde text-xs text-ikincil">
                    {turEtiketi(d.tur)} · silindi: {tarihKisa(d.silinme_zamani)}
                  </p>
                </div>
                {/* KALICI SIL - DOGRU YER BURASI.
                    Onceden Defterler sekmesindeydi ve "once cope atilmali" diye
                    PASIF duruyordu: gorunuyor ama calismiyor - kullanici icin bu
                    "bozuk buton"dur. Bir eylem, ancak YAPILABILIR oldugu yerde
                    gosterilmelidir. Cop kutusundaki defter zaten silinmeye hazirdir. */}
                {/* KALICI SILINMEYE KALAN SURE - cop kutusundaki defter 5 gun sonra
                    otomatik silinir. Sayac, geri alma penceresinin daraldigini
                    gorunur kilar. */}
                <span className="shrink-0 self-center rounded-full bg-yuzeyKoyu px-2.5 py-1 font-govde text-[0.6rem] text-ikincil">
                  {d.silinme_zamani
                    ? `silinmeye ${Math.max(0, 5 - Math.floor((Date.now() - new Date(d.silinme_zamani).getTime()) / 86400000))} gün`
                    : "silinmeye 5 gün"}
                </span>
                <button
                  onClick={() => setKaliciHedef(d)}
                  className="shrink-0 rounded-full border border-sarap/40 px-4 py-2 font-govde text-xs text-sarap transition-colors hover:bg-sarap/10"
                >
                  Kalıcı sil
                </button>
                <button
                  onClick={() => defterGeriAl(d.id)}
                  className="shrink-0 rounded-full border border-ayrac px-4 py-2 font-govde text-xs text-ikincil transition-colors hover:border-sarap hover:text-sarap"
                >
                  Geri yükle
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* CIFTIN REDDETTIGI DILEKLER BURADA GOSTERILMEZ.
          //
          // Bu, ciftin KENDI karari ve KENDI verisidir. Sistemimizde bir es, digerinin
          // onaylamadigi kuyrugu bile goremez - bu kadar siki bir izolasyon kurulmusken
          // super yoneticiye o dilekleri OKUMA, SILME ve GERI ALMA yetkisi vermek
          // dogrudan celiskidir. Ustelik icerigi okumak, silmekten daha agir bir
          // ihlaldir.
          //
          // Yoneticinin destekte ihtiyaci olan tek sey SAYI duzeyinde bilgidir
          // ("bu defterde copte kac dilek var") - o da defter teshis ekraninda,
          // iceriksiz ve eylemsiz olarak durur. */}

      <TehlikeliEylem
        acik={kaliciHedef !== null}
        siddet="kritik"
        baslik={`Kalıcı sil: ${kaliciHedef?.es1_ad} & ${kaliciHedef?.es2_ad}`}
        etkilenen="Çift, davetliler ve tüm defter içeriği"
        etkiler={[
          "Defter, dilekler, fotoğraflar, bağlantılar ve üyelikler veritabanından silinir.",
          "Yüklenen tüm medya dosyaları diskten silinir.",
          "Çift bir daha bu deftere erişemez; kurtarma yolu yoktur.",
          "Denetim kayıtları adli iz olarak korunur (kişisel veri içermez).",
        ]}
        geriDonus={null}
        teyitMetni={kaliciHedef ? `${kaliciHedef.es1_ad} & ${kaliciHedef.es2_ad}` : undefined}
        onayEtiket="Kalıcı olarak sil"
        onOnay={async () => {
          if (!kaliciHedef) return;
          const c = await api.superDefterKaliciSil(
            kaliciHedef.id, `${kaliciHedef.es1_ad} & ${kaliciHedef.es2_ad}`);
          if (!c.ok) { toast.error(c.mesaj); return; }
          toast.success("Defter kalıcı olarak silindi.");
          setKaliciHedef(null);
          void cek();
        }}
        onKapat={() => setKaliciHedef(null)}
      />
    </div>
  );
}

// ---------------- CANLI AKIS ----------------
function AkisSekmesi() {
  const [akis, setAkis] = useState<AkisKaydi[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);

  useEffect(() => {
    let iptal = false;
    async function cek() {
      const c = await api.superAkis(60);
      if (!iptal && c.ok) {
        setAkis(c.veri);
        setYukleniyor(false);
      }
    }
    void cek();
    const z = setInterval(cek, 10000); // canli: 10sn
    return () => {
      iptal = true;
      clearInterval(z);
    };
  }, []);

  if (yukleniyor) {
    return <p className="text-center font-govde text-sm text-ikincil">Yükleniyor...</p>;
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-ayrac bg-yuzey">
      <div className="flex items-center gap-2 border-b border-ayrac px-5 py-3">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-sarap" aria-hidden />
        <p className="font-govde text-[0.65rem] uppercase tracking-etiket text-ikincil">
          Canlı akış · tüm sistem
        </p>
      </div>
      <div className="max-h-[32rem] divide-y divide-ayrac overflow-y-auto">
        {akis.map((k) => (
          <div key={k.id} className="flex min-w-0 items-start gap-3 px-5 py-3">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-yaldiz" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="min-w-0 font-govde text-sm text-murekkep">
                <span className="font-medium">{k.aktor}</span>{" "}
                <span className="text-ikincil">{eylemMetni(k.eylem)}</span>
                {k.defter && <span className="text-ikincil"> · {k.defter}</span>}
              </p>
              <p className="font-govde text-xs text-ikincil">{gecenSure(k.created_at)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------- YARDIMCILAR ----------------
function Rozet({ metin, tip }: { metin: string; tip?: "uyari" | "soluk" }) {
  const sinif =
    tip === "uyari"
      ? "bg-yaldiz/20 text-yaldiz"
      : tip === "soluk"
        ? "bg-ayrac/40 text-ikincil"
        : "bg-sarap/10 text-sarap";
  return (
    <span
      className={`shrink-0 rounded-full px-2.5 py-1 font-govde text-[0.6rem] uppercase tracking-etiket ${sinif}`}
    >
      {metin}
    </span>
  );
}

function turEtiketi(tur: string): string {
  if (tur === "dugun") return "Düğün";
  if (tur === "nisan") return "Nişan";
  if (tur === "nikah") return "Nikah";
  return tur;
}


function talepTipi(tip: string): string {
  if (tip === "erisim") return "Erişim talebi";
  if (tip === "duzeltme") return "Düzeltme talebi";
  if (tip === "silme") return "Silme talebi";
  if (tip === "itiraz") return "İşlemeye itiraz";
  return tip;
}

function talepDurumu(durum: string): string {
  if (durum === "yeni") return "Yeni";
  if (durum === "islemde") return "İşlemde";
  if (durum === "tamamlandi") return "Tamamlandı";
  if (durum === "reddedildi") return "Reddedildi";
  return durum;
}

function eylemMetni(eylem: string): string {
  const sozluk: Record<string, string> = {
    KATKI_BIRAKILDI: "bir dilek bıraktı",
    KATKI_ONAYLANDI: "bir dileği onayladı",
    ODEME_BASLATILDI: "ödeme başlattı",
    ODEME_BILDIRILDI: "havale bildirimi yaptı",
    ODEME_ONAYLANDI: "ödemesi onaylandı",
    ODEME_REDDEDILDI: "ödemesi reddedildi",
    ODEME_AYARI_GUNCELLENDI: "ödeme ayarlarını güncelledi",
    KATKI_REDDEDILDI: "bir dileği reddetti",
    ETKINLIK_OLUSTURULDU: "yeni defter oluşturdu",
    ETKINLIK_GUNCELLENDI: "defteri güncelledi",
    AYAR_GUNCELLENDI: "ayarları değiştirdi",
    ES_DAVETI_OLUSTURULDU: "eşini davet etti",
    ES_KATILDI: "deftere katıldı",
    PROFIL_GUNCELLENDI: "profilini güncelledi",
    DEFTER_GORUNTULEME_BASLADI: "bir defteri görüntülemeye başladı",
    DEFTER_GORUNTULEME_BITTI: "görüntülemeyi bitirdi",
    DEFTER_DONDURULDU: "defteri dondurdu",
    DEFTER_COZULDU: "defteri yeniden açtı",
    DEFTER_COPE_ATILDI: "defteri çöpe attı",
    DEFTER_GERI_ALINDI: "defteri geri yükledi",
    DEFTER_KALICI_SILINDI: "bir defteri kalıcı sildi",
    DILEK_MODERASYONLA_KALDIRILDI: "bir dileği kaldırdı",
    DILEK_GERI_ALINDI: "bir dileği geri yükledi",
    SUPER_ADMIN_ATANDI: "yönetici yetkisi verdi",
    SUPER_ADMIN_KALDIRILDI: "yönetici yetkisi kaldırdı",
    KVKK_METNI_GUNCELLENDI: "yasal metni güncelledi",
    KVKK_TALEBI_ISLENDI: "bir KVKK talebini işledi",
    GORUNTULEME_YAZMA_ENGELLENDI: "görüntüleme modunda yazma denedi (engellendi)",
  };
  return sozluk[eylem] ?? eylem.toLowerCase().replace(/_/g, " ");
}

function tarihKisa(iso: string | null): string {
  if (!iso) return "-";
  const t = new Date(iso);
  if (isNaN(t.getTime())) return "-";
  return t.toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" });
}

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

// ---- SISTEM NABZI ----
//
// TASARIM: her oge bir SORUYA yanit verir ve gerekiyorsa TIKLANIR - yonetici
// sayiyi gorup "peki nerede?" diye aramaz, dogrudan oraya gider.
//
// RENK DILI: sakinken notr, esik asilinca uyari, kritikte sarap. Her seyi kirmiziya
// boyamak kirmiziyi anlamsizlastirir; renk ancak SEYREK kullanildiginda uyarir.
function SistemNabzi({
  ozet, onGit,
}: {
  ozet: SuperOzet;
  onGit: (s: Sekme) => void;
}) {
  const n = ozet.nabiz;

  const diskTon =
    n.disk_yuzde >= 92 ? "kritik" : n.disk_yuzde >= 75 ? "uyari" : "sakin";

  const ogeler: {
    etiket: string;
    deger: string;
    alt: string;
    ton: "sakin" | "uyari" | "kritik";
    sekme?: Sekme;
  }[] = [
    {
      etiket: "Disk",
      deger: `%${n.disk_yuzde}`,
      alt: `${n.disk_bos} boş`,
      ton: diskTon as "sakin" | "uyari" | "kritik",
    },
    {
      etiket: "Destek",
      deger: String(n.destek_bekleyen),
      alt: n.destek_bekleyen > 0 ? "yanıt bekliyor" : "bekleyen yok",
      ton: n.destek_bekleyen > 0 ? "uyari" : "sakin",
      sekme: "destek",
    },
    {
      etiket: "Gecikmiş imha",
      deger: String(n.imha_gecikmis),
      alt: n.imha_gecikmis > 0 ? "süresi doldu, hâlâ duruyor" : "temiz",
      ton: n.imha_gecikmis > 0 ? "kritik" : "sakin",
      sekme: "olcum",
    },
    {
      etiket: "İmhası yakın",
      deger: String(n.imha_yakin),
      alt: "indirme penceresinde",
      ton: "sakin",
      sekme: "olcum",
    },
    {
      etiket: "Ödeme",
      deger: String(n.odeme_bekleyen),
      alt: n.odeme_bekleyen > 0 ? "onay bekliyor" : "bekleyen yok",
      ton: n.odeme_bekleyen > 0 ? "uyari" : "sakin",
      sekme: "odemeler",
    },
    {
      etiket: "KVKK",
      deger: String(n.kvkk_bekleyen),
      alt: n.kvkk_bekleyen > 0 ? "talep bekliyor" : "bekleyen yok",
      ton: n.kvkk_bekleyen > 0 ? "uyari" : "sakin",
      sekme: "kvkk",
    },
  ];

  const stil = {
    sakin: "border-ayrac bg-yuzey",
    uyari: "border-amber-400/50 bg-amber-500/5",
    kritik: "border-sarap/50 bg-sarap/5",
  };
  const renk = {
    sakin: "text-murekkep",
    uyari: "text-amber-600",
    kritik: "text-sarap",
  };

  const sorunVar = ogeler.some((o) => o.ton !== "sakin");

  return (
    <section className="mb-5">
      <div className="mb-2 flex items-center gap-2">
        <span
          className={`h-2 w-2 rounded-full ${sorunVar ? "bg-amber-500" : "bg-yaldiz"}`}
          aria-hidden
        />
        <p className="font-govde text-[0.65rem] uppercase tracking-etiket text-ikincil">
          {sorunVar ? "Dikkat gerektiren durumlar var" : "Sistem sakin"}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {ogeler.map((o) => {
          const Icerik = (
            <>
              <p className="font-govde text-[0.6rem] uppercase tracking-etiket text-ikincil">
                {o.etiket}
              </p>
              <p className={`mt-0.5 font-display text-xl tabular-nums ${renk[o.ton]}`}>
                {o.deger}
              </p>
              <p className="mt-0.5 font-govde text-[0.6rem] leading-tight text-ikincil">{o.alt}</p>
            </>
          );
          return o.sekme ? (
            <button
              key={o.etiket}
              onClick={() => onGit(o.sekme!)}
              className={`min-w-0 rounded-2xl border px-3 py-2.5 text-left transition-colors hover:border-sarap/50 ${stil[o.ton]}`}
            >
              {Icerik}
            </button>
          ) : (
            <div key={o.etiket} className={`min-w-0 rounded-2xl border px-3 py-2.5 ${stil[o.ton]}`}>
              {Icerik}
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ---- PROAKTIF MESAJ ----
//
// Yonetici, destek talebi BEKLEMEDEN kullaniciya yazar. Kullanici icin bu normal bir
// destek yazismasidir - farki yalnizca ilk mesaji bizim yazmamizdir.
//
// BILDIRIM BASLIGI SERBEST: "talebiniz yanitlandi" demek yalan olurdu (kullanici bir
// talep acmadi). Baslik, mesajin baglamini tasir: "Defterinizin suresi yaklasiyor" gibi.
function ProaktifMesajModal({
  hedef, onKapat,
}: {
  hedef: { kullaniciId: string; ad: string; email: string; etkinlikId: string };
  onKapat: () => void;
}) {
  const [baslik, setBaslik] = useState("");
  const [metin, setMetin] = useState("");
  const [gonderiliyor, setGonderiliyor] = useState(false);

  const hazirBasliklar = [
    "Defterinizin süresi yaklaşıyor",
    "Ödemenizle ilgili bilgi",
    "Defterinizle ilgili bir konu",
  ];

  async function gonder() {
    setGonderiliyor(true);
    const c = await api.superDestekBaslat({
      kullaniciId: hedef.kullaniciId,
      etkinlikId: hedef.etkinlikId,
      baslik: baslik.trim() || undefined,
      metin: metin.trim(),
    });
    setGonderiliyor(false);
    if (!c.ok) { toast.error(c.mesaj); return; }
    toast.success(`${hedef.ad} kişisine mesaj gönderildi ve bildirim düştü.`);
    onKapat();
  }

  const girdiSinif =
    "w-full rounded-xl border border-ayrac bg-parsomen px-4 py-2.5 font-govde text-sm text-murekkep outline-none focus:border-sarap";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-murekkep/70 p-4 backdrop-blur-sm" onClick={onKapat}>
      <div className="w-full max-w-md rounded-3xl border border-ayrac bg-yuzey p-6" onClick={(e) => e.stopPropagation()}>
        <p className="font-display text-lg text-murekkep">Doğrudan mesaj gönder</p>
        <p className="mt-1 font-govde text-xs text-ikincil">
          {hedef.ad} · {hedef.email}
        </p>
        <p className="metin-yasli mt-2 font-govde text-xs leading-relaxed text-ikincil">
          Bu mesaj kullanıcının destek ekranında normal bir yazışma olarak görünür ve
          kendisine bildirim gider. Yanıtı Destek Talepleri sekmesine düşer.
        </p>

        <div className="mt-4 space-y-3">
          <div>
            <label className="font-govde text-xs text-ikincil">Bildirim başlığı</label>
            <input
              value={baslik}
              onChange={(e) => setBaslik(e.target.value)}
              placeholder="BiAnıBırak'tan size bir mesaj var"
              className={girdiSinif + " mt-1"}
            />
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {hazirBasliklar.map((h) => (
                <button
                  key={h}
                  onClick={() => setBaslik(h)}
                  className="rounded-full border border-ayrac px-2.5 py-1 font-govde text-[0.6rem] text-ikincil transition-colors hover:border-sarap hover:text-sarap"
                >
                  {h}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="font-govde text-xs text-ikincil">Mesaj</label>
            <textarea
              value={metin}
              onChange={(e) => setMetin(e.target.value)}
              rows={5}
              className={girdiSinif + " mt-1 resize-none"}
            />
          </div>
        </div>

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button onClick={onKapat} className="rounded-full border border-ayrac px-5 py-2.5 font-govde text-sm text-ikincil transition-colors hover:bg-yuzeyKoyu">
            Vazgeç
          </button>
          <button
            onClick={gonder}
            disabled={gonderiliyor || metin.trim().length < 5}
            className="rounded-full bg-sarap px-6 py-2.5 font-govde text-sm font-medium text-parsomen transition-colors hover:bg-sarapKoyu disabled:opacity-40"
          >
            {gonderiliyor ? "Gönderiliyor..." : "Gönder ve bildir"}
          </button>
        </div>
      </div>
    </div>
  );
}
