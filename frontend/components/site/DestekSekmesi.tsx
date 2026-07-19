"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { api, type SuperDestekOzet, type SuperDestekKonusma } from "@/lib/api";

// DESTEK TALEPLERI - harekat merkezinin insan yuzu.
//
// TASARIM: iki bolme. Solda konusma listesi (bekleyenler ustte), sagda secili konusma.
// Mobilde tek bolme - liste, secince konusma. Bu, e-posta ve mesajlasma uygulamalarinin
// on yillik ogrenmis desenidir; yeniden icat etmeye gerek yok.
//
// ONCELIK GORUNURLUGU: "acik" (yanit bekliyor) talepler once ve isaretli gelir. Bir
// destek ekraninin TEK isi vardir: "hangisi beni bekliyor?" sorusunu bir bakista
// yanitlamak. Karisik filtreler bu isi zorlastirir, kolaylastirmaz.
export function DestekSekmesi({ odakTalep = null }: { odakTalep?: string | null }) {
  const [liste, setListe] = useState<SuperDestekOzet[]>([]);
  const [bekleyen, setBekleyen] = useState(0);
  const [secili, setSecili] = useState<string | null>(odakTalep);
  const [vurgu, setVurgu] = useState<string | null>(odakTalep);
  const [konusma, setKonusma] = useState<SuperDestekKonusma | null>(null);
  const [yanit, setYanit] = useState("");
  const [yukleniyor, setYukleniyor] = useState(true);
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const akisSon = useRef<HTMLDivElement | null>(null);

  const listeCek = useCallback(async () => {
    const c = await api.superDestekListe();
    if (c.ok) {
      setListe(c.veri.talepler);
      setBekleyen(c.veri.bekleyen);
    }
    setYukleniyor(false);
  }, []);

  useEffect(() => { void listeCek(); }, [listeCek]);

  // ODAK - bildirimden gelen konusmaya KAYDIR ve VURGULA (yeni dilek odagi gibi).
  // Vurgu 3 saniyede soner: dikkati ceker, sonra ekrani rahat birakir.
  useEffect(() => {
    if (!vurgu) return;
    const t = setTimeout(() => {
      document.getElementById(`talep-${vurgu}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 120);
    const s = setTimeout(() => setVurgu(null), 3000);
    return () => { clearTimeout(t); clearTimeout(s); };
  }, [vurgu, liste.length]);

  // Secili konusmayi cek
  useEffect(() => {
    if (!secili) { setKonusma(null); return; }
    let iptal = false;
    void api.superDestekKonusma(secili).then((c) => {
      if (iptal) return;
      if (c.ok) setKonusma(c.veri);
      void listeCek(); // okunmamis sayaci sifirlandi - liste tazelensin
    });
    return () => { iptal = true; };
  }, [secili, listeCek]);

  useEffect(() => {
    akisSon.current?.scrollIntoView({ behavior: "auto" });
  }, [konusma]);

  async function yanitla() {
    if (!secili) return;
    const t = yanit.trim();
    if (!t) return;
    setGonderiliyor(true);
    const c = await api.superDestekYanit(secili, t);
    setGonderiliyor(false);
    if (!c.ok) { toast.error(c.mesaj); return; }
    setYanit("");
    const k = await api.superDestekKonusma(secili);
    if (k.ok) setKonusma(k.veri);
    void listeCek();
    toast.success("Yanıt gönderildi - kullanıcıya bildirim gitti.");
  }

  // COZULDU / YENIDEN AC - geri alinabilir. Onay penceresi YOK: geri alinabilir bir
  // islem icin onay istemek gereksiz surtunmedir; yanlislik olursa tek tikla donulur.
  async function durumDegistir(kapat: boolean) {
    if (!secili) return;
    // BONUS 2 - YANITSIZ KAPATMA UYARISI.
    // Hic yanit yazmadan kapatmak, kullaniciyi cevapsiz birakip konusmayi
    // silmeye goturur. Bu neredeyse her zaman bir DIKKATSIZLIKTIR; sormak gerekir.
    if (kapat && konusma && !konusma.yonetici_yaniti_var) {
      const emin = window.confirm(
        "Bu talebe henüz yanıt yazmadınız. Çözüldü olarak işaretlerseniz kullanıcının "
        + "yazışması ekranından kalkacak ve 24 saat sonra kalıcı olarak silinecek.\n\n"
        + "Yine de devam edilsin mi?"
      );
      if (!emin) return;
    }
    const c = kapat ? await api.superDestekKapat(secili) : await api.superDestekYenidenAc(secili);
    if (!c.ok) { toast.error(c.mesaj); return; }
    const k = await api.superDestekKonusma(secili);
    if (k.ok) setKonusma(k.veri);
    void listeCek();
    toast.success(
      kapat
        ? "Çözüldü olarak işaretlendi. Kullanıcı yeni yazarsa ayrı bir konuşma açılır."
        : "Konuşma yeniden açıldı."
    );
  }

  return (
    <div>
      {/* Ozet seridi - "kac kisi beni bekliyor" */}
      <div className="mb-4 flex items-center gap-3 rounded-2xl border border-ayrac bg-yuzey px-5 py-3">
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
            bekleyen > 0 ? "bg-sarap/12 text-sarap" : "bg-yuzeyKoyu text-ikincil"
          }`}
        >
          <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" aria-hidden>
            <path d="M21 11.5a8.5 8.5 0 0 1-12.3 7.6L3 20.5l1.5-5.4A8.5 8.5 0 1 1 21 11.5Z" stroke="currentColor" strokeWidth={1.6} strokeLinejoin="round" fill="none" />
          </svg>
        </span>
        <div className="min-w-0">
          <p className="font-govde text-sm font-medium text-murekkep">
            {bekleyen > 0 ? `${bekleyen} talep yanıt bekliyor` : "Bekleyen talep yok"}
          </p>
          <p className="font-govde text-xs text-ikincil">
            Toplam {liste.length} yazışma
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        {/* LISTE */}
        <div className={`min-w-0 ${secili ? "hidden lg:block" : ""}`}>
          {yukleniyor ? (
            <p className="rounded-2xl border border-ayrac bg-yuzey px-5 py-8 text-center font-govde text-sm text-ikincil">
              Yükleniyor...
            </p>
          ) : liste.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-ayrac bg-parsomen px-5 py-10 text-center font-govde text-sm text-ikincil">
              Henüz destek talebi yok.
            </p>
          ) : (
            <div className="space-y-2">
              {liste.map((t) => (
                <button
                  key={t.id}
                  id={`talep-${t.id}`}
                  onClick={() => setSecili(t.id)}
                  className={`w-full min-w-0 rounded-2xl border px-4 py-3 text-left transition-all ${
                    vurgu === t.id
                      ? "border-yaldiz bg-yaldiz/10 ring-2 ring-yaldiz/40"
                      : secili === t.id
                      ? "border-sarap bg-sarap/5"
                      : "border-ayrac bg-yuzey hover:border-sarap/40"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="min-w-0 truncate font-govde text-sm font-medium text-murekkep">
                      {t.kullanici_ad}
                    </p>
                    <span className="flex shrink-0 items-center gap-1.5">
                      {t.durum === "kapali" && <SilmeSayaci kapanma={t.kapanma} />}
                      <DurumRozeti durum={t.durum} okunmamis={t.okunmamis} />
                    </span>
                  </div>
                  <p className="mt-0.5 truncate font-govde text-xs text-ikincil">
                    {t.kullanici_email}
                  </p>
                  <p className="mt-1.5 line-clamp-2 font-govde text-xs leading-snug text-murekkep/80">
                    {t.son_yonetici_mi ? "Siz: " : ""}{t.son_metin}
                  </p>
                  <p className="mt-1 font-govde text-[0.6rem] text-ikincil">
                    {new Date(t.son_mesaj).toLocaleString("tr-TR", {
                      day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                    })}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* KONUSMA */}
        <div className={`min-w-0 ${secili ? "" : "hidden lg:block"}`}>
          {!konusma ? (
            <div className="flex h-full min-h-[20rem] items-center justify-center rounded-2xl border border-dashed border-ayrac bg-parsomen">
              <p className="font-govde text-sm text-ikincil">Bir yazışma seçin.</p>
            </div>
          ) : (
            <div className="flex h-[calc(100dvh-20rem)] min-h-[24rem] flex-col overflow-hidden rounded-2xl border border-ayrac bg-yuzey">
              {/* Baslik */}
              <div className="flex items-start justify-between gap-3 border-b border-ayrac px-5 py-3">
                <div className="min-w-0">
                  <button
                    onClick={() => setSecili(null)}
                    className="mb-1 font-govde text-xs text-ikincil transition-colors hover:text-sarap lg:hidden"
                  >
                    ‹ Listeye dön
                  </button>
                  <p className="truncate font-govde text-sm font-medium text-murekkep">
                    {konusma.kullanici_ad}
                  </p>
                  <p className="truncate font-govde text-xs text-ikincil">{konusma.kullanici_email}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {konusma.durum === "kapali" && <SilmeSayaci kapanma={konusma.kapanma} />}
                  <DurumRozeti durum={konusma.durum} okunmamis={0} />
                  {/* DEFTER BAGLAMI - "hangi defterdi?" diye sormaya gerek yok.
                      Talep acilirken aktif defter kaydedildi; yonetici tek tikla
                      o defterin teshis ekranina gecer. */}
                  {konusma.etkinlik_id && (
                    <a
                      href={`/super-panel?defter=${konusma.etkinlik_id}`}
                      className="rounded-full border border-yaldiz/50 px-3 py-1.5 font-govde text-xs text-yaldiz transition-colors hover:bg-yaldiz/10"
                    >
                      Defteri incele
                    </a>
                  )}
                  {konusma.durum === "kapali" ? (
                    <button
                      onClick={() => durumDegistir(false)}
                      className="rounded-full border border-yaldiz/50 px-3 py-1.5 font-govde text-xs text-yaldiz transition-colors hover:bg-yaldiz/10"
                    >
                      Yeniden aç
                    </button>
                  ) : (
                    <button
                      onClick={() => durumDegistir(true)}
                      title="Konuşmayı arşivler. Kullanıcı yeni yazarsa ayrı bir konuşma açılır. İstediğin an geri alabilirsin."
                      className="rounded-full border border-ayrac px-3 py-1.5 font-govde text-xs text-ikincil transition-colors hover:border-sarap hover:text-sarap"
                    >
                      Çözüldü
                    </button>
                  )}
                </div>
              </div>

              {konusma.durum === "kapali" && (
                <div className="border-b border-ayrac bg-yuzeyKoyu px-5 py-2">
                  <p className="font-govde text-[0.68rem] leading-relaxed text-ikincil">
                    Bu konuşma çözüldü olarak işaretlendi. Kullanıcı yeni bir mesaj yazarsa
                    ayrı bir konuşma olarak açılır. Yanıt yazmak için önce yeniden açın.
                  </p>
                </div>
              )}

              {/* Akis */}
              <div className="flex-1 space-y-3 overflow-y-auto overscroll-contain px-5 py-4">
                {konusma.mesajlar.map((m) => (
                  <div key={m.id} className={`flex ${m.yonetici_mi ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                        m.yonetici_mi
                          ? "rounded-tr-sm bg-sarap text-parsomen"
                          : "rounded-tl-sm border border-ayrac bg-parsomen"
                      }`}
                    >
                      <p
                        className={`font-govde text-[0.62rem] uppercase tracking-etiket ${
                          m.yonetici_mi ? "text-parsomen/70" : "text-yaldiz"
                        }`}
                      >
                        {m.yonetici_mi ? `${m.gonderen_ad} (yönetici)` : m.gonderen_ad}
                      </p>
                      <p
                        className={`metin-yasli mt-1 whitespace-pre-wrap font-govde text-sm leading-relaxed ${
                          m.yonetici_mi ? "text-parsomen" : "text-murekkep"
                        }`}
                      >
                        {m.metin}
                      </p>
                      <p
                        className={`mt-1 font-govde text-[0.6rem] ${
                          m.yonetici_mi ? "text-parsomen/60" : "text-ikincil"
                        }`}
                      >
                        {new Date(m.created_at).toLocaleString("tr-TR", {
                          day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                        })}
                        {m.yonetici_mi && " · Yanıtlandı"}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={akisSon} />
              </div>

              {/* Yanit */}
              <div className="border-t border-ayrac px-5 py-3">
                <textarea
                  value={yanit}
                  onChange={(e) => setYanit(e.target.value)}
                  rows={2}
                  placeholder="Yanıtınızı yazın..."
                  className="w-full resize-none rounded-xl border border-ayrac bg-parsomen px-4 py-2.5 font-govde text-sm text-murekkep outline-none placeholder:text-ikincil/60 focus:border-sarap"
                />
                <button
                  onClick={yanitla}
                  disabled={gonderiliyor || yanit.trim().length === 0}
                  className="mt-2 w-full rounded-full bg-sarap px-5 py-2.5 font-govde text-sm font-medium text-parsomen transition-colors hover:bg-sarapKoyu disabled:opacity-40"
                >
                  {gonderiliyor ? "Gönderiliyor..." : "Yanıtla ve bildir"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DurumRozeti({ durum, okunmamis }: { durum: string; okunmamis: number }) {
  if (okunmamis > 0) {
    return (
      <span className="shrink-0 rounded-full bg-sarap px-2 py-0.5 font-govde text-[0.6rem] font-bold text-parsomen">
        {okunmamis} yeni
      </span>
    );
  }
  const harita: Record<string, { etiket: string; sinif: string }> = {
    acik: { etiket: "Yanıt bekliyor", sinif: "bg-amber-500/15 text-amber-600" },
    yanitlandi: { etiket: "Yanıtlandı", sinif: "bg-yaldiz/15 text-yaldiz" },
    kapali: { etiket: "Kapalı", sinif: "bg-yuzeyKoyu text-ikincil" },
  };
  const d = harita[durum] ?? harita.acik;
  return (
    <span className={`shrink-0 rounded-full px-2 py-0.5 font-govde text-[0.6rem] ${d.sinif}`}>
      {d.etiket}
    </span>
  );
}

// KALICI SILME SAYACI - kapanan konusma 24 saat sonra tamamen silinir.
// Sayac, geri alma penceresinin DARALDIGINI gorunur kilar: "kalici silinmeye 17 saat"
// yazan bir rozet, yoneticiye "yanlis kapattiysan simdi geri al" der.
function SilmeSayaci({ kapanma }: { kapanma: string | null }) {
  const [metin, setMetin] = useState<string>("");

  useEffect(() => {
    if (!kapanma) { setMetin(""); return; }
    const hesapla = () => {
      const silme = new Date(kapanma).getTime() + 24 * 3_600_000;
      const kalan = silme - Date.now();
      if (kalan <= 0) { setMetin("siliniyor"); return; }
      const saat = Math.floor(kalan / 3_600_000);
      if (saat >= 1) { setMetin(`${saat} saat`); return; }
      setMetin(`${Math.max(1, Math.floor(kalan / 60_000))} dk`);
    };
    hesapla();
    // Dakikada bir tazele - sayac "canli" hissettirir, sayfa yenilemeye gerek kalmaz.
    const z = setInterval(hesapla, 60_000);
    return () => clearInterval(z);
  }, [kapanma]);

  if (!metin) return null;
  return (
    <span
      title="Bu yazışma kalıcı olarak silinecek. Geri almak için yeniden açın."
      className="shrink-0 rounded-full bg-yuzeyKoyu px-2 py-0.5 font-govde text-[0.55rem] text-ikincil"
    >
      silinmeye {metin}
    </span>
  );
}
