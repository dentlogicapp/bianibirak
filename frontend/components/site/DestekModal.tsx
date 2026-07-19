"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { api, type DestekTalep } from "@/lib/api";

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
  const [talepler, setTalepler] = useState<DestekTalep[]>([]);
  const [metin, setMetin] = useState("");
  const [yukleniyor, setYukleniyor] = useState(true);
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const akisSon = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!acik) return;
    let iptal = false;
    setYukleniyor(true);
    void api.destekKonusmam().then((c) => {
      if (iptal) return;
      if (c.ok) setTalepler(c.veri.talepler);
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

  // Tum mesajlar tek akista - talep sinirlari kullaniciyi ilgilendirmez.
  const akis = talepler
    .flatMap((t) => t.mesajlar.map((m) => ({ ...m, talepDurum: t.durum })))
    .sort((a, b) => a.created_at.localeCompare(b.created_at));

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-murekkep/70 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onKapat}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="flex h-[92dvh] w-full flex-col overflow-hidden border-ayrac bg-yuzey sm:h-[80dvh] sm:max-w-lg sm:rounded-3xl sm:border"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Baslik */}
        <div className="flex items-start justify-between gap-3 border-b border-ayrac px-5 py-4">
          <div className="min-w-0">
            <p className="font-display text-lg text-murekkep">Sorun Bildir &amp; Destek Al</p>
            <p className="mt-0.5 font-govde text-xs text-ikincil">
              Sistem yöneticilerimizle doğrudan yazışın
            </p>
          </div>
          <button
            onClick={onKapat}
            aria-label="Kapat"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-ayrac text-ikincil transition-colors hover:border-sarap hover:text-sarap"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Konusma akisi */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4">
          {yukleniyor ? (
            <p className="text-center font-govde text-sm text-ikincil">Yükleniyor...</p>
          ) : akis.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-ayrac bg-parsomen px-5 py-8 text-center">
              <p className="font-govde text-sm text-murekkep">Henüz bir yazışmanız yok.</p>
              <p className="metin-yasli mt-1.5 font-govde text-xs leading-relaxed text-ikincil">
                Yaşadığınız sorunu, aklınıza takılan soruyu ya da isteğinizi aşağıya yazın.
                Ekran görüntüsü veya teknik bilgi gerekmez - kendi cümlelerinizle anlatmanız yeterli.
              </p>
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
                      {!m.yonetici_mi && " · Gönderildi"}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={akisSon} />
            </div>
          )}
        </div>

        {/* Yazma alani */}
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
      </div>
    </div>
  );
}
