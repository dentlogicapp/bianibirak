"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { api, type DestekTalep, type SssKategori } from "@/lib/api";
import { Portal } from "@/components/site/Portal";

// DESTEK MODALI - "Sorun Bildir & Destek Al".
//
// SURTUNME SIFIR: kullanicidan HICBIR bilgi istenmez. Ad, e-posta, kategori, oncelik,
// ekran goruntusu - hicbiri sorulmaz. Kimlik zaten oturumdan bellidir; kategoriyi
// bizim secmemiz gerekir, kullanicinin degil. Insan derdini anlatmaya geldiginde
// onune form koymak, onu geri gonderir.
//
// KONUSMA OLARAK GOSTERILIR: gecmis yazismalar ayni pencerede akar. "Bilet no"
// yoktur; kullanici "yazdim mi, gordu mu, ne dedi" sorularini tek bakista yanitlar.
export function DestekModal({ acik, onKapat }: { acik: boolean; onKapat: () => void }) {
  // IKI SEKME: once CEVAP ARA (SSS), sonra YAZ. Sirasi bilincli - insanlarin cogu
  // sorusunu sormadan once yanitini bulmayi TERCIH EDER; onlerine once bilgi tabani
  // koymak hem onlari hizlandirir hem destek yukunu dusurur.
  const [sekme, setSekme] = useState<"sss" | "yazisma">("sss");
  const [agac, setAgac] = useState<SssKategori[]>([]);
  const [acikKategori, setAcikKategori] = useState<string | null>(null);
  const [acikAlt, setAcikAlt] = useState<string | null>(null);
  const [acikSoru, setAcikSoru] = useState<string | null>(null);
  const [arama, setArama] = useState("");
  const [talepler, setTalepler] = useState<DestekTalep[]>([]);
  const [metin, setMetin] = useState("");
  const [yukleniyor, setYukleniyor] = useState(true);
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const akisSon = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!acik) return;
    let iptal = false;
    setYukleniyor(true);
    void Promise.all([api.destekKonusmam(), api.sssAgac()]).then(([k, a]) => {
      if (iptal) return;
      if (k.ok) {
        setTalepler(k.veri.talepler);
        // Yazismasi VARSA dogrudan yazisma sekmesi acilsin - bekledigi yanit oradadir.
        if (k.veri.talepler.some((t) => t.mesajlar.length > 0)) setSekme("yazisma");
      }
      if (a.ok) setAgac(a.veri.agac);
      setYukleniyor(false);
    });
    return () => { iptal = true; };
  }, [acik]);

  // Yeni mesaj gelince en alta kaydir - konusma hissi.
  useEffect(() => {
    if (acik && !yukleniyor) akisSon.current?.scrollIntoView({ behavior: "auto" });
  }, [acik, yukleniyor, talepler]);

  useEffect(() => {
    if (!acik) return;
    const dinle = (e: KeyboardEvent) => { if (e.key === "Escape") onKapat(); };
    window.addEventListener("keydown", dinle);
    return () => window.removeEventListener("keydown", dinle);
  }, [acik, onKapat]);

  if (!acik) return null;

  async function gonder() {
    const t = metin.trim();
    if (t.length < 10) {
      toast.error("Lütfen durumu biraz daha açıklayın.");
      return;
    }
    setGonderiliyor(true);
    const c = await api.destekGonder(t);
    setGonderiliyor(false);
    if (!c.ok) { toast.error(c.mesaj); return; }
    setMetin("");
    const y = await api.destekKonusmam();
    if (y.ok) setTalepler(y.veri.talepler);
    toast.success("İletiniz sistem yöneticilerimize ulaştı.");
  }

  // ARAMA - duz metin eslesmesi; kategori/alt bilgisi sonucta gosterilir ki
  // kullanici sonucun agacin neresinden geldigini anlasin.
  const aramaSonuc = (() => {
    const q = arama.trim().toLocaleLowerCase("tr-TR");
    if (q.length < 2) return [];
    const cikti: { id: string; soru: string; cevap: string; kategori: string; alt: string }[] = [];
    for (const k of agac) {
      for (const a of k.alt_kategoriler) {
        for (const m of a.maddeler) {
          const havuz = `${m.soru} ${m.cevap}`.toLocaleLowerCase("tr-TR");
          if (havuz.includes(q)) {
            cikti.push({ id: m.id, soru: m.soru, cevap: m.cevap, kategori: k.kategori, alt: a.alt_kategori });
          }
        }
      }
    }
    return cikti.slice(0, 20);
  })();

  function ac(id: string) {
    const yeni = acikSoru === id ? null : id;
    setAcikSoru(yeni);
    if (yeni) void api.sssGoruntulendi(id); // olcum - ates-et-unut
  }

  // Tum mesajlar tek akista - talep sinirlari kullaniciyi ilgilendirmez.
  const akis = talepler
    .flatMap((t) => t.mesajlar.map((m) => ({ ...m, talepDurum: t.durum, okundu: t.yonetici_okudu })))
    .sort((a, b) => a.created_at.localeCompare(b.created_at));

  return (
    <Portal>
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-murekkep/70 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onKapat}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="flex h-[88dvh] w-full flex-col overflow-hidden rounded-t-3xl border border-ayrac bg-yuzey shadow-2xl sm:h-[80dvh] sm:max-w-lg sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* MOBIL TUTAMAK - "bu bir sayfa degil, kapanabilir bir pencere" isareti.
            Kullanici kapatmanin mumkun oldugunu, yazi okumadan ANLAR. */}
        <div className="flex justify-center pt-2 sm:hidden">
          <span className="h-1 w-10 rounded-full bg-ayrac" aria-hidden />
        </div>

        {/* BASLIK - ikon + baslik + acikla + BELIRGIN kapat.
            Onceki surumde baslik alani zayifti; kullanici "buradan nasil cikarim"
            sorusunu soruyordu. Kapat dugmesi artik dolgulu ve temas alani genis. */}
        <div className="flex items-start gap-3 border-b border-ayrac px-5 py-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sarap/10 text-sarap">
            <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
              <path d="M21 11.5a8.5 8.5 0 0 1-12.3 7.6L3 20.5l1.5-5.4A8.5 8.5 0 1 1 21 11.5Z" stroke="currentColor" strokeWidth={1.6} strokeLinejoin="round" fill="none" />
              <path d="M9.6 9.2a2.4 2.4 0 1 1 3.2 2.3c-.5.2-.8.7-.8 1.2v.3" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" fill="none" />
              <circle cx="12" cy="16" r="0.6" fill="currentColor" />
            </svg>
          </span>

          <div className="min-w-0 flex-1">
            <p className="font-display text-lg leading-tight text-murekkep">
              Sorun Bildir &amp; Destek Al
            </p>
            <p className="mt-0.5 font-govde text-xs leading-relaxed text-ikincil">
              Sistem yöneticilerimizle doğrudan yazışın. Bilgilerinizi girmenize gerek yok.
            </p>
          </div>

          <button
            onClick={onKapat}
            aria-label="Kapat"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-yuzeyKoyu text-ikincil transition-colors hover:bg-sarap hover:text-parsomen"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* SEKME SERIDI - "once cevap ara, bulamazsan yaz" */}
        <div className="flex gap-1 border-b border-ayrac px-4 py-2">
          {([
            { kod: "sss" as const, etiket: "Sık Sorulanlar" },
            { kod: "yazisma" as const, etiket: "Yazışmam" },
          ]).map((x) => (
            <button
              key={x.kod}
              onClick={() => setSekme(x.kod)}
              className={`flex-1 rounded-full px-4 py-2 font-govde text-xs font-medium transition-colors ${
                sekme === x.kod ? "bg-sarap text-parsomen" : "text-ikincil hover:bg-yuzeyKoyu"
              }`}
            >
              {x.etiket}
              {x.kod === "yazisma" && akis.length > 0 && (
                <span className="ml-1.5 opacity-70">({akis.length})</span>
              )}
            </button>
          ))}
        </div>

        {/* SSS AGACI */}
        {sekme === "sss" && (
          <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4">
            <input
              value={arama}
              onChange={(e) => setArama(e.target.value)}
              placeholder="Sorunuzu arayın..."
              className="mb-3 w-full rounded-xl border border-ayrac bg-parsomen px-4 py-2.5 font-govde text-sm text-murekkep outline-none placeholder:text-ikincil/60 focus:border-sarap"
            />

            {aramaSonuc.length > 0 ? (
              <div className="space-y-2">
                <p className="font-govde text-[0.62rem] uppercase tracking-etiket text-ikincil">
                  {aramaSonuc.length} sonuç
                </p>
                {aramaSonuc.map((m) => (
                  <SoruKarti
                    key={m.id}
                    id={m.id}
                    soru={m.soru}
                    cevap={m.cevap}
                    yol={`${m.kategori} · ${m.alt}`}
                    acik={acikSoru === m.id}
                    onAc={() => ac(m.id)}
                  />
                ))}
              </div>
            ) : arama.trim().length > 1 ? (
              <div className="rounded-2xl border border-dashed border-ayrac bg-parsomen px-5 py-8 text-center">
                <p className="font-govde text-sm text-murekkep">Aramanıza uygun bir başlık bulunamadı.</p>
                <button
                  onClick={() => setSekme("yazisma")}
                  className="mt-3 rounded-full bg-sarap px-5 py-2.5 font-govde text-xs font-medium text-parsomen transition-colors hover:bg-sarapKoyu"
                >
                  Bize yazın
                </button>
              </div>
            ) : (
              /* AGAC: kategori > alt kategori > soru. Kademeli acilir; kullanici
                 once konuyu daraltir, sonra sorusunu bulur. */
              <div className="space-y-2">
                {agac.map((k) => (
                  <div key={k.kategori} className="overflow-hidden rounded-2xl border border-ayrac">
                    <button
                      onClick={() => {
                        setAcikKategori(acikKategori === k.kategori ? null : k.kategori);
                        setAcikAlt(null);
                      }}
                      className={`flex w-full items-center justify-between gap-2 px-4 py-3 text-left transition-colors ${
                        acikKategori === k.kategori ? "bg-sarap/5" : "bg-yuzey hover:bg-yuzeyKoyu"
                      }`}
                    >
                      <span className="min-w-0 font-govde text-sm font-medium text-murekkep">
                        {k.kategori}
                      </span>
                      <svg
                        viewBox="0 0 24 24"
                        className={`h-4 w-4 shrink-0 text-ikincil transition-transform ${acikKategori === k.kategori ? "rotate-180" : ""}`}
                        aria-hidden
                      >
                        <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
                      </svg>
                    </button>

                    {acikKategori === k.kategori && (
                      <div className="border-t border-ayrac bg-parsomen px-2 py-2">
                        {k.alt_kategoriler.map((a) => (
                          <div key={a.alt_kategori} className="mb-1 last:mb-0">
                            <button
                              onClick={() => setAcikAlt(acikAlt === a.alt_kategori ? null : a.alt_kategori)}
                              className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left transition-colors hover:bg-yuzey"
                            >
                              <span className="flex min-w-0 items-center gap-2">
                                <span className="h-1 w-1 shrink-0 rounded-full bg-yaldiz" aria-hidden />
                                <span className="min-w-0 font-govde text-xs font-medium text-murekkep">
                                  {a.alt_kategori}
                                </span>
                                <span className="shrink-0 font-govde text-[0.6rem] text-ikincil">
                                  ({a.maddeler.length})
                                </span>
                              </span>
                              <svg
                                viewBox="0 0 24 24"
                                className={`h-3.5 w-3.5 shrink-0 text-ikincil transition-transform ${acikAlt === a.alt_kategori ? "rotate-90" : ""}`}
                                aria-hidden
                              >
                                <path d="m9 6 6 6-6 6" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
                              </svg>
                            </button>

                            {acikAlt === a.alt_kategori && (
                              <div className="mt-1 space-y-1.5 pl-4">
                                {a.maddeler.map((m) => (
                                  <SoruKarti
                                    key={m.id}
                                    id={m.id}
                                    soru={m.soru}
                                    cevap={m.cevap}
                                    acik={acikSoru === m.id}
                                    onAc={() => ac(m.id)}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {/* Cevabini bulamayanlar icin kapi - agacin sonunda, tam yerinde. */}
                <div className="rounded-2xl border border-dashed border-ayrac bg-parsomen px-5 py-5 text-center">
                  <p className="font-govde text-sm text-murekkep">Aradığınızı bulamadınız mı?</p>
                  <p className="mt-1 font-govde text-xs text-ikincil">
                    Durumunuzu bize yazın, sistem yöneticilerimiz size dönsün.
                  </p>
                  <button
                    onClick={() => setSekme("yazisma")}
                    className="mt-3 rounded-full bg-sarap px-6 py-2.5 font-govde text-xs font-medium text-parsomen transition-colors hover:bg-sarapKoyu"
                  >
                    Destek talebi oluştur
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Konusma akisi */}
        {sekme === "yazisma" && (
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4">
          {yukleniyor ? (
            <p className="text-center font-govde text-sm text-ikincil">Yükleniyor...</p>
          ) : akis.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-ayrac bg-parsomen px-5 py-8">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-yaldiz/15 text-yaldiz">
                <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden>
                  <path d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9l-4 3v-3H6a2 2 0 0 1-2-2V6Z" stroke="currentColor" strokeWidth={1.5} strokeLinejoin="round" fill="none" />
                  <path d="M8 9h8M8 12h5" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
                </svg>
              </div>
              <p className="mt-3 text-center font-display text-base text-murekkep">
                Nasıl yardımcı olabiliriz?
              </p>
              <p className="metin-yasli mx-auto mt-2 max-w-sm text-center font-govde text-xs leading-relaxed text-ikincil">
                Yaşadığınız sorunu, aklınıza takılan soruyu ya da isteğinizi aşağıya yazmanız
                yeterli. Ekran görüntüsü, hesap bilgisi veya teknik ayrıntı gerekmez.
              </p>

              {/* ORNEKLER - bos sayfa korkusunu kirar. Kullanici "ne yazacagimi
                  bilmiyorum" diye vazgecmesin; bunlar dolduran degil, YOL GOSTEREN. */}
              <div className="mx-auto mt-4 max-w-sm space-y-1.5">
                {[
                  "Davetlim dilek bırakamıyor",
                  "Defterimi indiremiyorum",
                  "Eşim davet bağlantısını kaybetti",
                  "Baskıyla ilgili bir sorum var",
                ].map((o) => (
                  <p key={o} className="flex items-center gap-2 font-govde text-xs text-ikincil">
                    <span className="h-1 w-1 shrink-0 rounded-full bg-yaldiz" aria-hidden />
                    {o}
                  </p>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {akis.map((m) => (
                <div key={m.id} className={`flex ${m.yonetici_mi ? "justify-start" : "justify-end"}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                      m.yonetici_mi
                        ? "rounded-tl-sm border border-ayrac bg-parsomen"
                        : "rounded-tr-sm bg-sarap text-parsomen"
                    }`}
                  >
                    <p
                      className={`font-govde text-[0.62rem] uppercase tracking-etiket ${
                        m.yonetici_mi ? "text-yaldiz" : "text-parsomen/70"
                      }`}
                    >
                      {m.yonetici_mi ? "Sistem yöneticisi" : "Siz"}
                    </p>
                    <p
                      className={`metin-yasli mt-1 whitespace-pre-wrap font-govde text-sm leading-relaxed ${
                        m.yonetici_mi ? "text-murekkep" : "text-parsomen"
                      }`}
                    >
                      {m.metin}
                    </p>
                    <p
                      className={`mt-1 font-govde text-[0.6rem] ${
                        m.yonetici_mi ? "text-ikincil" : "text-parsomen/60"
                      }`}
                    >
                      {new Date(m.created_at).toLocaleString("tr-TR", {
                        day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                      })}
                      {/* OKUNDU ISARETI - "gordunuz mu?" belirsizligini bitirir.
                          Yonetici konusmayi actiginda damgalanan an, bu mesajdan
                          SONRAYSA mesaj okunmus demektir. */}
                      {!m.yonetici_mi &&
                        (m.okundu && m.okundu > m.created_at
                          ? " · Okundu ✓✓"
                          : " · Gönderildi ✓")}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={akisSon} />
            </div>
          )}
        </div>
        )}

        {/* Yazma alani */}
        {sekme === "yazisma" && (
        <div className="border-t border-ayrac px-5 py-4">
          <textarea
            value={metin}
            onChange={(e) => setMetin(e.target.value)}
            rows={3}
            placeholder="Yaşadığınız durumu kendi cümlelerinizle anlatın; teknik bilgi vermeniz gerekmiyor."
            className="w-full resize-none rounded-2xl border border-ayrac bg-parsomen px-4 py-3 font-govde text-sm text-murekkep outline-none transition-colors placeholder:text-ikincil/60 focus:border-sarap"
          />

          {/* SUREC BEKLENTISI - acik birakilmaz.
              "Gonderdim, peki simdi ne olacak?" sorusu yanitlanmazsa kullanici tekrar
              tekrar yazar ya da vazgecer. */}
          <p className="metin-yasli mt-2 font-govde text-[0.7rem] leading-relaxed text-ikincil">
            İletiniz sistem yöneticilerimize anında ulaşır. İncelenip tarafınıza bu
            ekrandan yanıt verilir; yanıt geldiğinde ayrıca bildirim alırsınız. Yazışma
            burada saklanır, dilediğiniz zaman geri dönüp okuyabilirsiniz.
          </p>

          <button
            onClick={gonder}
            disabled={gonderiliyor || metin.trim().length < 10}
            className="mt-3 w-full rounded-full bg-sarap px-6 py-3 font-govde text-sm font-medium text-parsomen transition-colors hover:bg-sarapKoyu disabled:cursor-not-allowed disabled:opacity-40"
          >
            {gonderiliyor ? "Gönderiliyor..." : "Gönder"}
          </button>
        </div>
        )}
      </div>
    </div>
    </Portal>
  );
}

// SORU KARTI - tiklayinca cevabi acilir. Goruntulenme sayaci ilk aciliste artar:
// hangi konunun gercekten sorun oldugunu VERI ile ogreniriz.
function SoruKarti({
  id, soru, cevap, yol, acik, onAc,
}: {
  id: string; soru: string; cevap: string; yol?: string; acik: boolean; onAc: () => void;
}) {
  return (
    <div className={`overflow-hidden rounded-xl border transition-colors ${acik ? "border-sarap/40 bg-sarap/5" : "border-ayrac bg-yuzey"}`}>
      <button onClick={onAc} className="flex w-full items-start justify-between gap-2 px-4 py-2.5 text-left">
        <span className="min-w-0">
          {yol && (
            <span className="block font-govde text-[0.58rem] uppercase tracking-etiket text-ikincil">
              {yol}
            </span>
          )}
          <span className="block font-govde text-xs font-medium leading-snug text-murekkep">{soru}</span>
        </span>
        <svg
          viewBox="0 0 24 24"
          className={`mt-0.5 h-3.5 w-3.5 shrink-0 text-ikincil transition-transform ${acik ? "rotate-180" : ""}`}
          aria-hidden
        >
          <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
      </button>
      {acik && (
        <p className="metin-yasli border-t border-ayrac px-4 py-3 font-govde text-xs leading-relaxed text-murekkep/85">
          {cevap}
        </p>
      )}
    </div>
  );
}
