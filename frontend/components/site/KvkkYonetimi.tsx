"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  api,
  kanitIndir,
  onamCsvIndir,
  type MetinKatalog,
  type MetinSurum,
  type OnayKaydi,
  type KvkkTalep,
} from "@/lib/api";

// KVKK YONETIMI - Planlama Defteri deseni, bu urunun gercegine genisletilmis.
//
// PLANLAMA'DAKI YAPI (korunan):
//   Metin Yayinla / Surum Gecmisi / Onam Kayitlari - uc sekme.
//   Yeni surum yayinlamak, eski surumu pasiflestirir ve TUM kullanicilardan
//   YENIDEN ONAM ister.
//
// BU URUNDE GENISLETILEN:
//   1. COK METIN: Planlama'da tek KVKK metni vardi. Burada dort metin var
//      (KVKK, Kullanim Kosullari, Gizlilik, KVKK-Davetli) - her biri ayri
//      surumlenir, ayri onaylanir, ayri arsivlenir.
//   2. KAPSAM AYRIMI: metinler "es" ve "davetli" olarak ayrilir. Davetli bir
//      sozlesme tarafi degil, KONUKTUR - ondan Kullanim Kosullari istenmez.
//   3. TALEP TAKIBI: KVKK m.13 - ilgili kisi basvurulari 30 gun icinde yanitlanmali.
type Sekme = "metinler" | "gecmis" | "onamlar" | "talepler";

const SEKMELER: { kod: Sekme; etiket: string }[] = [
  { kod: "metinler", etiket: "Metin Yayınla" },
  { kod: "gecmis", etiket: "Sürüm Geçmişi" },
  { kod: "onamlar", etiket: "Onam Kayıtları" },
  { kod: "talepler", etiket: "İlgili Kişi Talepleri" },
];

export function KvkkYonetimi() {
  const [sekme, setSekme] = useState<Sekme>("metinler");
  const [metinler, setMetinler] = useState<MetinKatalog[]>([]);
  const [seciliAnahtar, setSeciliAnahtar] = useState<string | null>(null);

  const cek = useCallback(async () => {
    const c = await api.superMetinler();
    if (c.ok) {
      setMetinler(c.veri);
      if (!seciliAnahtar && c.veri.length > 0) setSeciliAnahtar(c.veri[0].anahtar);
    }
  }, [seciliAnahtar]);

  useEffect(() => {
    void cek();
  }, [cek]);

  const secili = metinler.find((m) => m.anahtar === seciliAnahtar) ?? null;

  return (
    <div className="space-y-5">
      {/* Baslik */}
      <div className="rounded-3xl border border-ayrac bg-yuzey p-6 sm:p-8">
        <h2 className="font-display text-lg text-murekkep">KVKK Yönetimi</h2>
        <p className="metin-yasli mt-1.5 font-govde text-sm leading-relaxed text-ikincil">
          Yasal metinler, sürüm geçmişleri ve onam kayıtları. Bir metni güncellemek, eski
          sürümü arşivler ve o metni onaylamış{" "}
          <span className="font-medium text-murekkep">tüm kullanıcılardan yeniden onam ister</span>.
          Metinler yürürlüğe girmeden önce avukat onayından geçmiş olmalıdır.
        </p>

        {/* Metin secici - kapsam rozetli */}
        <div className="mt-5 flex min-w-0 flex-wrap gap-2">
          {metinler.map((m) => (
            <button
              key={m.anahtar}
              onClick={() => setSeciliAnahtar(m.anahtar)}
              className={`min-w-0 rounded-2xl border px-4 py-2.5 text-left transition-colors ${
                seciliAnahtar === m.anahtar
                  ? "border-sarap bg-sarap/[0.06]"
                  : "border-ayrac bg-parsomen hover:border-ikincil"
              }`}
            >
              <span className="flex items-center gap-2">
                <span className="truncate font-govde text-sm font-medium text-murekkep">
                  {m.baslik}
                </span>
                <KapsamRozeti kapsam={m.kapsam} />
              </span>
              <span className="mt-0.5 block font-govde text-[0.66rem] text-ikincil">
                Sürüm {m.surum} · {m.onay_sayisi} onam · {m.surum_sayisi} arşiv
                {!m.zorunlu && " · bilgilendirici"}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Sekmeler */}
      <div className="flex min-w-0 gap-1 overflow-x-auto rounded-full border border-ayrac bg-yuzey p-1">
        {SEKMELER.map((s) => (
          <button
            key={s.kod}
            onClick={() => setSekme(s.kod)}
            className={`shrink-0 rounded-full px-4 py-2 font-govde text-sm transition-colors ${
              sekme === s.kod
                ? "bg-sarap text-parsomen"
                : "text-ikincil hover:text-murekkep"
            }`}
          >
            {s.etiket}
          </button>
        ))}
      </div>

      {sekme === "metinler" && secili && (
        <MetinYayinla metin={secili} onKaydedildi={cek} />
      )}
      {sekme === "gecmis" && secili && <SurumGecmisi anahtar={secili.anahtar} />}
      {sekme === "onamlar" && <OnamKayitlari />}
      {sekme === "talepler" && <TalepTakibi />}
    </div>
  );
}

// ---------------- METIN YAYINLA ----------------

function MetinYayinla({
  metin,
  onKaydedildi,
}: {
  metin: MetinKatalog;
  onKaydedildi: () => void;
}) {
  const [taslak, setTaslak] = useState(metin.icerik);
  const [kaydediliyor, setKaydediliyor] = useState(false);

  useEffect(() => {
    setTaslak(metin.icerik);
  }, [metin.anahtar, metin.icerik]);

  const degisti = taslak.trim() !== metin.icerik.trim();

  async function yayinla() {
    if (
      !confirm(
        `"${metin.baslik}" için YENİ SÜRÜM yayınlanacak.\n\n` +
          `• Eski sürüm arşivlenir (silinmez - hukuki kanıt).\n` +
          `• Bu metni onaylamış ${metin.onay_sayisi} kişiden YENİDEN ONAM istenir.\n` +
          `• Onay vermeyen kullanıcı panele giremez.\n\nDevam edilsin mi?`
      )
    )
      return;

    setKaydediliyor(true);
    const c = await api.superKvkkMetinGuncelle(metin.anahtar, { icerik: taslak });
    setKaydediliyor(false);

    if (!c.ok) {
      toast.error(c.mesaj);
      return;
    }
    toast.success("Yeni sürüm yayınlandı. Eski sürüm arşivlendi, yeniden onam istenecek.");
    onKaydedildi();
  }

  return (
    <div className="rounded-3xl border border-ayrac bg-yuzey p-6 sm:p-8">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div className="min-w-0">
          <p className="font-govde text-sm font-medium text-murekkep">{metin.baslik}</p>
          <p className="mt-0.5 font-govde text-xs text-ikincil">
            Yürürlük: {tarih(metin.yururluk_tarihi)} · Sürüm {metin.surum}
          </p>
        </div>
        <KapsamRozeti kapsam={metin.kapsam} />
      </div>

      {/* PARMAK IZI - kanit zincirinin gorunur hali */}
      <div className="mt-4 rounded-2xl border border-ayrac bg-parsomen p-3">
        <p className="font-govde text-[0.6rem] uppercase tracking-etiket text-ikincil">
          Yürürlükteki parmak izi (SHA-256)
        </p>
        <p className="mt-1 break-all font-mono text-[0.62rem] leading-relaxed text-ikincil">
          {metin.hash}
        </p>
      </div>

      <textarea
        value={taslak}
        onChange={(e) => setTaslak(e.target.value)}
        rows={20}
        className="mt-4 w-full rounded-2xl border border-ayrac bg-parsomen px-4 py-3 font-govde text-sm leading-relaxed text-murekkep outline-none focus:border-sarap"
        placeholder="Metin içeriği (avukat onaylı)..."
      />

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="font-govde text-xs text-ikincil">
          {degisti ? (
            <span className="font-medium text-sarap">
              Değişiklik var — yayınlarsan yeniden onam istenecek.
            </span>
          ) : (
            "Değişiklik yok."
          )}
        </p>
        <button
          onClick={yayinla}
          disabled={!degisti || kaydediliyor}
          className="rounded-full bg-sarap px-5 py-2.5 font-govde text-sm font-medium text-parsomen transition-colors hover:bg-sarapKoyu disabled:opacity-40"
        >
          {kaydediliyor ? "Yayınlanıyor..." : "Yeni sürüm yayınla"}
        </button>
      </div>
    </div>
  );
}

// ---------------- SURUM GECMISI ----------------

function SurumGecmisi({ anahtar }: { anahtar: string }) {
  const [surumler, setSurumler] = useState<MetinSurum[]>([]);
  const [acik, setAcik] = useState<string | null>(null);
  const [yukleniyor, setYukleniyor] = useState(true);

  useEffect(() => {
    void (async () => {
      setYukleniyor(true);
      const c = await api.superMetinSurumler(anahtar);
      if (c.ok) setSurumler(c.veri);
      setYukleniyor(false);
    })();
  }, [anahtar]);

  if (yukleniyor) {
    return <p className="py-10 text-center font-govde text-sm text-ikincil">Yükleniyor...</p>;
  }

  return (
    <div className="rounded-3xl border border-ayrac bg-yuzey p-6 sm:p-8">
      <p className="metin-yasli font-govde text-sm leading-relaxed text-ikincil">
        Her sürüm kalıcı olarak arşivlenir.{" "}
        <span className="font-medium text-murekkep">Bu arşiv olmadan hash anlamsızdır</span>:
        kullanıcının onayladığı parmak izinin hangi metne karşılık geldiğini
        gösteremezdik. Hash, ancak metin de saklanırsa kanıttır.
      </p>

      {surumler.length === 0 ? (
        <p className="mt-5 rounded-2xl border border-dashed border-ayrac bg-parsomen px-6 py-8 text-center font-govde text-sm text-ikincil">
          Arşivde sürüm yok.
        </p>
      ) : (
        <div className="mt-5 space-y-2">
          {surumler.map((s) => (
            <div key={s.id} className="rounded-2xl border border-ayrac bg-parsomen p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-govde text-sm font-medium text-murekkep">
                  Sürüm {s.surum}
                </p>
                <p className="font-govde text-xs text-ikincil">
                  Arşivlendi: {tarih(s.created_at)}
                </p>
              </div>
              <p className="mt-1 break-all font-mono text-[0.6rem] text-ikincil">{s.hash}</p>

              <button
                onClick={() => setAcik(acik === s.id ? null : s.id)}
                className="mt-2 font-govde text-xs font-medium text-sarap hover:underline"
              >
                {acik === s.id ? "Gizle" : "Metni oku"}
              </button>

              {acik === s.id && (
                <div className="metin-yasli mt-3 max-h-96 overflow-y-auto whitespace-pre-line rounded-xl border border-ayrac bg-yuzey p-4 font-govde text-xs leading-relaxed text-ikincil">
                  {s.icerik}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------- ONAM KAYITLARI ----------------

function OnamKayitlari() {
  const [kayitlar, setKayitlar] = useState<OnayKaydi[]>([]);
  const [toplam, setToplam] = useState(0);
  const [ara, setAra] = useState("");
  const [suzgec, setSuzgec] = useState<"tumu" | "es" | "davetli">("tumu");
  const [yukleniyor, setYukleniyor] = useState(true);

  const cek = useCallback(async () => {
    setYukleniyor(true);
    const c = await api.superOnaylar(ara || undefined);
    if (c.ok) {
      setKayitlar(c.veri.kayitlar);
      setToplam(c.veri.toplam);
    }
    setYukleniyor(false);
  }, [ara]);

  useEffect(() => {
    const z = setTimeout(cek, ara ? 350 : 0);
    return () => clearTimeout(z);
  }, [cek, ara]);

  const gorunen = kayitlar.filter((k) => {
    if (suzgec === "es") return k.kullanici_id !== null;
    if (suzgec === "davetli") return k.kullanici_id === null;
    return true;
  });

  async function kanit(id: string) {
    const c = await kanitIndir(id);
    if (c.ok) toast.success(c.mesaj);
    else toast.error(c.mesaj);
  }

  async function disaAktar() {
    const c = await onamCsvIndir(suzgec === "tumu" ? undefined : suzgec);
    if (c.ok) toast.success(c.mesaj);
    else toast.error(c.mesaj);
  }

  return (
    <div className="rounded-3xl border border-ayrac bg-yuzey p-6 sm:p-8">
      <p className="metin-yasli font-govde text-sm leading-relaxed text-ikincil">
        Kim, hangi metni, hangi sürümde, hangi parmak iziyle onayladı. Kayıtlar{" "}
        <span className="font-medium text-murekkep">append-only</span>: silinmez,
        güncellenmez. Kullanıcı hesabını silse bile durur (KVKK m.5/2-e — bir hakkın
        tesisi ve korunması). Toplam {toplam} kayıt.
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <input
          value={ara}
          onChange={(e) => setAra(e.target.value)}
          placeholder="Ad, e-posta veya parmak izi ile ara..."
          className="min-w-0 flex-1 rounded-xl border border-ayrac bg-parsomen px-4 py-2.5 font-govde text-sm text-murekkep outline-none focus:border-sarap"
        />
        <button
          onClick={disaAktar}
          className="shrink-0 rounded-full border border-ayrac px-4 py-2.5 font-govde text-xs text-ikincil transition-colors hover:border-sarap hover:text-sarap"
        >
          CSV indir
        </button>
      </div>

      {/* Kapsam suzgeci - es / davetli ayrimi */}
      <div className="mt-3 flex gap-1.5">
        {(["tumu", "es", "davetli"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setSuzgec(s)}
            className={`rounded-full px-3.5 py-1.5 font-govde text-xs transition-colors ${
              suzgec === s
                ? "bg-sarap text-parsomen"
                : "border border-ayrac text-ikincil hover:border-murekkep"
            }`}
          >
            {s === "tumu" ? "Tümü" : s === "es" ? "Hesap sahipleri" : "Davetliler"}
          </button>
        ))}
      </div>

      {yukleniyor ? (
        <p className="py-10 text-center font-govde text-sm text-ikincil">Yükleniyor...</p>
      ) : gorunen.length === 0 ? (
        <p className="mt-5 rounded-2xl border border-dashed border-ayrac bg-parsomen px-6 py-8 text-center font-govde text-sm text-ikincil">
          Kayıt yok.
        </p>
      ) : (
        <div className="mt-4 space-y-2">
          {gorunen.map((k) => {
            const davetli = k.kullanici_id === null;
            return (
              <div
                key={k.id}
                className="min-w-0 rounded-2xl border border-ayrac bg-parsomen p-4"
              >
                <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 font-govde text-sm font-medium text-murekkep">
                      <span className="truncate">
                        {davetli ? "Davetli (anonim)" : k.ad ?? "(hesap silinmiş)"}
                      </span>
                      <KapsamRozeti kapsam={davetli ? "davetli" : "es"} />
                      {k.silinmis && (
                        <span className="rounded-full bg-sarap/12 px-2 py-0.5 font-govde text-[0.58rem] uppercase tracking-etiket text-sarap">
                          Hesap silinmiş
                        </span>
                      )}
                    </p>
                    {!davetli && k.email && (
                      <p className="truncate font-govde text-xs text-ikincil">{k.email}</p>
                    )}
                    <p className="mt-1 font-govde text-xs text-ikincil">
                      {k.metin_anahtar} · sürüm {k.metin_surum} · {tarihSaat(k.created_at)}
                      {k.ip && ` · ${k.ip}`}
                    </p>
                    <p className="mt-1 break-all font-mono text-[0.58rem] text-ikincil">
                      {k.metin_hash}
                    </p>
                  </div>

                  <button
                    onClick={() => kanit(k.id)}
                    className="shrink-0 rounded-full border border-yaldiz/50 px-3.5 py-1.5 font-govde text-xs text-yaldiz transition-colors hover:bg-yaldiz/10"
                    title="Avukata/mahkemeye sunulabilir kanıt belgesi"
                  >
                    Kanıt belgesi
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------------- ILGILI KISI TALEPLERI ----------------

function TalepTakibi() {
  const [talepler, setTalepler] = useState<KvkkTalep[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);

  const cek = useCallback(async () => {
    setYukleniyor(true);
    const c = await api.superKvkkTalepler();
    if (c.ok) setTalepler(c.veri);
    setYukleniyor(false);
  }, []);

  useEffect(() => {
    void cek();
  }, [cek]);

  async function isle(t: KvkkTalep, durum: string) {
    const c = await api.superKvkkTalepIsle(t.id, durum);
    if (!c.ok) {
      toast.error(c.mesaj);
      return;
    }
    toast.success("Talep güncellendi.");
    void cek();
  }

  return (
    <div className="rounded-3xl border border-ayrac bg-yuzey p-6 sm:p-8">
      <p className="metin-yasli font-govde text-sm leading-relaxed text-ikincil">
        KVKK m.13: ilgili kişi başvuruları en geç{" "}
        <span className="font-medium text-murekkep">30 gün</span> içinde
        sonuçlandırılmalıdır. Süre aşımı idari para cezası doğurur.
      </p>

      {yukleniyor ? (
        <p className="py-10 text-center font-govde text-sm text-ikincil">Yükleniyor...</p>
      ) : talepler.length === 0 ? (
        <p className="mt-5 rounded-2xl border border-dashed border-ayrac bg-parsomen px-6 py-8 text-center font-govde text-sm text-ikincil">
          Bekleyen talep yok.
        </p>
      ) : (
        <div className="mt-5 space-y-2">
          {talepler.map((t) => (
            <div key={t.id} className="min-w-0 rounded-2xl border border-ayrac bg-parsomen p-4">
              <div className="flex min-w-0 items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-govde text-sm font-medium text-murekkep">
                    {t.tip} · {t.email}
                  </p>
                  <p className="metin-yasli mt-1 font-govde text-sm text-ikincil">
                    {t.aciklama}
                  </p>
                  <p className="mt-1 font-govde text-xs text-ikincil">
                    Son yanıt tarihi: {tarih(t.son_yanit_tarihi)}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 font-govde text-[0.6rem] uppercase tracking-etiket ${
                    t.durum === "yeni"
                      ? "bg-sarap/12 text-sarap"
                      : "bg-ikincil/12 text-ikincil"
                  }`}
                >
                  {t.durum}
                </span>
              </div>

              {(t.durum === "yeni" || t.durum === "islemde") && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={() => isle(t, "islemde")}
                    className="rounded-full border border-ayrac px-4 py-1.5 font-govde text-xs text-ikincil transition-colors hover:border-sarap hover:text-sarap"
                  >
                    İşleme al
                  </button>
                  <button
                    onClick={() => isle(t, "tamamlandi")}
                    className="rounded-full bg-sarap px-4 py-1.5 font-govde text-xs font-medium text-parsomen transition-colors hover:bg-sarapKoyu"
                  >
                    Tamamlandı
                  </button>
                  <button
                    onClick={() => isle(t, "reddedildi")}
                    className="rounded-full border border-ayrac px-4 py-1.5 font-govde text-xs text-ikincil transition-colors hover:border-sarap hover:text-sarap"
                  >
                    Reddet
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------- kucuk parcalar ----------------

function KapsamRozeti({ kapsam }: { kapsam: string }) {
  const davetli = kapsam === "davetli";
  return (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 font-govde text-[0.58rem] uppercase tracking-etiket ${
        davetli ? "bg-yaldiz/15 text-yaldiz" : "bg-sarap/12 text-sarap"
      }`}
      title={
        davetli
          ? "Davetli onaylar - konuk, sözleşme tarafı değil"
          : "Hesap sahibi onaylar - kayıt anında zorunlu"
      }
    >
      {davetli ? "Davetli" : "Eş"}
    </span>
  );
}

function tarih(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("tr-TR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

function tarihSaat(iso: string): string {
  try {
    return new Date(iso).toLocaleString("tr-TR", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}
