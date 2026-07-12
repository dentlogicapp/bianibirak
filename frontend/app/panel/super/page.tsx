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
import { KvkkYonetimi } from "@/components/site/KvkkYonetimi";

// SUPER PANEL - sistem yoneticisi gorusu (planlama super-admin deseni).
// Sekmeler: Defterler / Kullanicilar / Cop Kutusu / KVKK / Canli Akis
type Sekme = "defterler" | "olcum" | "kullanicilar" | "cop" | "kvkk" | "akis";

const SEKMELER: { kod: Sekme; etiket: string }[] = [
  { kod: "defterler", etiket: "Defterler" },
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
  const [silHedef, setSilHedef] = useState<SuperDefter | null>(null);
  const [teyit, setTeyit] = useState("");

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
    window.location.href = "/panel/etkinlik";
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

  async function kaliciSil() {
    if (!silHedef) return;
    const c = await api.superDefterKaliciSil(silHedef.id, teyit);
    if (!c.ok) {
      toast.error(c.mesaj);
      return;
    }
    toast.success("Defter kalıcı olarak silindi.");
    setSilHedef(null);
    setTeyit("");
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
                  <Rozet metin={durumEtiketi(d.durum)} />
                  {d.donduruldu && <Rozet metin="Dondurulmuş" tip="uyari" />}
                  {d.yetim && <Rozet metin="Yetim" tip="uyari" />}
                  {d.hareketsiz && <Rozet metin="Hareketsiz" tip="soluk" />}
                </div>
              </div>

              {/* Uyeler - kim, hangi rolde */}
              <div className="mt-3 space-y-1">
                {d.uyeler.length === 0 ? (
                  <p className="font-govde text-xs text-yaldiz">
                    Bu defterin hiç üyesi yok - müdahale gerekebilir.
                  </p>
                ) : (
                  d.uyeler.map((u) => (
                    <p key={u.email} className="min-w-0 truncate font-govde text-xs text-ikincil">
                      <span className="text-murekkep">{u.ad}</span> · {u.rol === "es1" ? "Birinci eş" : "İkinci eş"} · {tarihKisa(u.katildi)}
                    </p>
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
                  onClick={() => dondur(d)}
                  disabled={islenen === d.id}
                  className="rounded-full border border-ayrac px-4 py-2 font-govde text-xs text-ikincil transition-colors hover:border-sarap hover:text-sarap disabled:opacity-50"
                >
                  {d.donduruldu ? "Çöz" : "Dondur"}
                </button>
                <button
                  onClick={() => copeAt(d)}
                  disabled={islenen === d.id}
                  className="rounded-full border border-ayrac px-4 py-2 font-govde text-xs text-ikincil transition-colors hover:border-sarap hover:text-sarap disabled:opacity-50"
                >
                  Çöpe at
                </button>
                <button
                  onClick={() => {
                    setSilHedef(d);
                    setTeyit("");
                  }}
                  disabled={islenen === d.id || !d.silindi_mi}
                  title={d.silindi_mi ? "" : "Önce çöpe atılmalı"}
                  className="rounded-full border border-sarap/40 px-4 py-2 font-govde text-xs text-sarap transition-colors hover:bg-sarap/10 disabled:opacity-40"
                >
                  Kalıcı sil
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

      {/* Kalici silme onayi - cift adi teyidi */}
      {silHedef && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setSilHedef(null)}
        >
          <div
            className="w-full max-w-md rounded-3xl border border-sarap/40 bg-yuzey p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="font-display text-lg text-sarap">Kalıcı sil - geri alınamaz</p>
            <p className="metin-yasli mt-3 font-govde text-sm leading-relaxed text-ikincil">
              Bu defter ve ona ait tüm dilekler, bağlantılar, üyelikler veritabanından kalıcı
              olarak silinecek. Denetim kayıtları adli iz olarak korunur.
            </p>
            <p className="mt-4 font-govde text-xs text-ikincil">
              Onaylamak için tam olarak şunu yaz:
            </p>
            <p className="mt-1 rounded-lg border border-ayrac bg-parsomen px-3 py-2 font-govde text-sm text-murekkep">
              {silHedef.es1_ad} &amp; {silHedef.es2_ad}
            </p>
            <input
              value={teyit}
              onChange={(e) => setTeyit(e.target.value)}
              placeholder="Buraya yaz..."
              className="mt-3 w-full rounded-xl border border-ayrac bg-parsomen px-4 py-3 font-govde text-sm text-murekkep outline-none focus:border-sarap"
            />
            <div className="mt-5 flex gap-2">
              <button
                onClick={kaliciSil}
                disabled={teyit !== `${silHedef.es1_ad} & ${silHedef.es2_ad}`}
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

      {cop!.dilekler.length > 0 && (
        <section>
          <p className="mb-3 font-govde text-[0.65rem] uppercase tracking-etiket text-ikincil">
            Moderasyonla kaldırılan dilekler
          </p>
          <div className="space-y-2">
            {cop!.dilekler.map((k) => (
              <div key={k.id} className="min-w-0 rounded-2xl border border-ayrac bg-yuzey p-4">
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-govde text-xs uppercase tracking-etiket text-ikincil">
                      {k.davetli_ad}
                    </p>
                    <p className="metin-yasli mt-1 font-govde text-sm text-ikincil line-through">
                      {k.mesaj}
                    </p>
                    <p className="mt-1 font-govde text-xs text-ikincil">
                      Kaldırıldı: {tarihKisa(k.silinme_zamani)}
                    </p>
                  </div>
                  <button
                    onClick={() => dilekGeriAl(k.id)}
                    className="shrink-0 rounded-full border border-ayrac px-4 py-2 font-govde text-xs text-ikincil transition-colors hover:border-sarap hover:text-sarap"
                  >
                    Geri yükle
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
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

function durumEtiketi(durum: string): string {
  if (durum === "hazirlik") return "Hazırlık";
  if (durum === "aktif") return "Aktif";
  if (durum === "kapali") return "Kapalı";
  if (durum === "arsiv") return "Arşiv";
  return durum;
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
