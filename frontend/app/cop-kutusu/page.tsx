"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api, type CopDilek, type CopDefter } from "@/lib/api";
import { AppShell } from "@/components/site/AppShell";
import { TehlikeliEylem } from "@/components/site/TehlikeliEylem";

// COP KUTUSU (cift tarafi)
//
// Reddedilen dilekler burada 30 gun bekler, sonra otomatik kalici silinir. Geri al ->
// onay kuyruguna doner. Kalici sil -> geri alinamaz. Planlama Defteri (Notlar) cop-kutusu
// deseni, bu uygulamanin gorunumu.
export default function CopKutusuSayfasi() {
  const router = useRouter();
  const [dilekler, setDilekler] = useState<CopDilek[]>([]);
  const [defterler, setDefterler] = useState<CopDefter[]>([]);
  const [defterSilHedef, setDefterSilHedef] = useState<CopDefter | null>(null);
  const [durum, setDurum] = useState<"yukleniyor" | "hazir" | "yok">("yukleniyor");
  const [islenen, setIslenen] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [c, d] = await Promise.all([api.copListe(), api.copDefterler()]);
      if (d.ok) setDefterler(d.veri.defterler);
      if (!c.ok) {
        if (c.durum === 401) router.replace("/giris");
        else setDurum("yok");
        return;
      }
      setDilekler(c.veri.dilekler);
      setDurum("hazir");
    })();
  }, [router]);

  async function geriAl(id: string) {
    if (islenen) return;
    setIslenen(id);
    const c = await api.copGeriAl(id);
    setIslenen(null);
    if (!c.ok) { toast.error(c.mesaj); return; }
    setDilekler((o) => o.filter((x) => x.id !== id));
    toast.success("Dilek geri alındı ve onay kuyruğuna eklendi.");
  }

  async function kaliciSil(id: string) {
    if (islenen) return;
    setIslenen(id);
    const c = await api.copKaliciSil(id);
    setIslenen(null);
    if (!c.ok) { toast.error(c.mesaj); return; }
    setDilekler((o) => o.filter((x) => x.id !== id));
    toast("Dilek kalıcı olarak silindi.");
  }

  if (durum === "yukleniyor") {
    return (
      <AppShell>
        <div className="flex min-h-[50vh] items-center justify-center font-govde text-sm text-ikincil">Yükleniyor…</div>
      </AppShell>
    );
  }
  if (durum === "yok") {
    return (
      <AppShell>
        <div className="rounded-3xl border border-ayrac bg-yuzey p-10 text-center">
          <p className="font-govde text-sm text-ikincil">Aktif bir defter seçili değil.</p>
          <button onClick={() => router.push("/etkinliklerim")} className="mt-6 rounded-full bg-sarap px-7 py-3 font-govde text-sm font-medium text-parsomen transition-colors hover:bg-sarapKoyu">Defterlerime git</button>
        </div>
      </AppShell>
    );
  }

  async function defterGeriAl(id: string) {
    const c = await api.copDefterGeriAl(id);
    if (!c.ok) { toast.error(c.mesaj); return; }
    setDefterler((o) => o.filter((x) => x.id !== id));
    toast.success("Defter geri alındı.");
  }

  async function defterKaliciSil() {
    if (!defterSilHedef) return;
    const c = await api.copDefterKaliciSil(defterSilHedef.id);
    if (!c.ok) { toast.error(c.mesaj); return; }
    setDefterler((o) => o.filter((x) => x.id !== defterSilHedef.id));
    setDefterSilHedef(null);
    toast.success("Defter kalıcı olarak silindi.");
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl">
        <p className="metin-yasli font-govde text-sm leading-relaxed text-ikincil">
          Silinen defterler ve reddettiğin dilekler burada bekler. İstersen{" "}
          <span className="font-medium text-murekkep">geri alabilirsin</span>. Buradan kalıcı
          silinen hiçbir şey <span className="font-medium text-murekkep">geri getirilemez</span>.
          Defterler <span className="font-medium text-murekkep">5 gün</span>, dilekler{" "}
          <span className="font-medium text-murekkep">30 gün</span> sonra otomatik olarak kalıcı silinir.
        </p>

        {/* SILINEN DEFTERLER - dileklerden AYRI bolme.
            Ayri durmalari sart: sureleri farkli (5 gun / 30 gun) ve kaybin agirligi
            farkli. Tek listede karistirmak, kullanicinin hangi sayacin neye ait
            oldugunu anlamasini zorlastirirdi. */}
        {defterler.length > 0 && (
          <section className="mt-8">
            <p className="mb-3 font-govde text-[0.65rem] uppercase tracking-etiket text-ikincil">
              Silinen defterler
            </p>
            <div className="space-y-2">
              {defterler.map((d) => {
                const kalan = d.silinme_zamani
                  ? Math.max(0, 5 - Math.floor((Date.now() - new Date(d.silinme_zamani).getTime()) / 86400000))
                  : 5;
                return (
                  <div key={d.id} className="rounded-2xl border border-ayrac bg-yuzey px-5 py-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-display text-base text-murekkep">
                          {d.es1_ad} &amp; {d.es2_ad}
                        </p>
                        <p className="mt-0.5 font-govde text-xs text-ikincil">
                          {d.dilek_sayisi} dilek · kalıcı silinmeye {kalan} gün
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <button
                          onClick={() => defterGeriAl(d.id)}
                          className="rounded-full border border-ayrac px-4 py-2 font-govde text-xs text-ikincil transition-colors hover:border-sarap hover:text-sarap"
                        >
                          Geri al
                        </button>
                        <button
                          onClick={() => setDefterSilHedef(d)}
                          className="rounded-full border border-sarap/40 px-4 py-2 font-govde text-xs text-sarap transition-colors hover:bg-sarap/10"
                        >
                          Kalıcı sil
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {defterler.length > 0 && dilekler.length > 0 && (
          <p className="mt-8 mb-3 font-govde text-[0.65rem] uppercase tracking-etiket text-ikincil">
            Reddedilen dilekler
          </p>
        )}

        {dilekler.length === 0 ? (
          <div className="mt-10 rounded-3xl border border-ayrac bg-yuzey py-16 text-center">
            <svg viewBox="0 0 24 24" className="mx-auto h-10 w-10 text-ikincil/50" aria-hidden>
              <path d="M5 7h14M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7M6.5 7l.7 12a2 2 0 0 0 2 1.9h5.6a2 2 0 0 0 2-1.9l.7-12" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </svg>
            <p className="mt-4 font-display text-xl italic text-ikincil/70">çöp kutusu boş</p>
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            {dilekler.map((d) => (
              <CopKart
                key={d.id}
                d={d}
                mesgul={islenen === d.id}
                onGeri={() => geriAl(d.id)}
                onSil={() => kaliciSil(d.id)}
              />
            ))}
          </div>
        )}
      </div>

      <TehlikeliEylem
        acik={defterSilHedef !== null}
        siddet="kritik"
        baslik={`Kalıcı sil: ${defterSilHedef?.es1_ad} & ${defterSilHedef?.es2_ad}`}
        etkilenen="Defterin tamamı"
        etkiler={[
          "Defter, tüm dilekler ve fotoğraflar veritabanından silinir.",
          "Yüklenen medya dosyaları diskten silinir.",
          "Davetlilerin bıraktığı hiçbir şey geri getirilemez.",
        ]}
        geriDonus={null}
        teyitMetni={defterSilHedef ? `${defterSilHedef.es1_ad} & ${defterSilHedef.es2_ad}` : undefined}
        onayEtiket="Kalıcı olarak sil"
        onOnay={() => { void defterKaliciSil(); }}
        onKapat={() => setDefterSilHedef(null)}
      />
    </AppShell>
  );
}

function CopKart({ d, mesgul, onGeri, onSil }: {
  d: CopDilek; mesgul: boolean; onGeri: () => void; onSil: () => void;
}) {
  const [silOnay, setSilOnay] = useState(false);

  return (
    <div className="rounded-2xl border border-ayrac bg-yuzey p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="min-w-0 truncate font-govde text-xs uppercase tracking-etiket text-ikincil">
              {d.davetliAd}
            </p>
            {d.fotoVar && (
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0 text-ikincil" aria-hidden>
                <path d="M4 7a2 2 0 0 1 2-2h2l1.5-2h5L16 5h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7Z" stroke="currentColor" strokeWidth={1.6} strokeLinejoin="round" fill="none" />
                <circle cx="12" cy="12" r="3.2" stroke="currentColor" strokeWidth={1.6} fill="none" />
              </svg>
            )}
          </div>
          <p className="metin-yasli mt-1.5 line-clamp-3 font-govde text-sm leading-relaxed text-murekkep/80 line-through decoration-ikincil/40">
            {d.mesaj}
          </p>
          <p className="mt-2 font-govde text-[0.7rem] text-ikincil">
            {d.silinmeZamani && <>Çöpe atıldı: {tarihMetni(d.silinmeZamani)} · </>}
            <span className="text-amber-600">Otomatik silmeye {d.kalanGun} gün</span>
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-end gap-2 border-t border-ayrac pt-3">
        {!silOnay ? (
          <>
            <button
              onClick={onGeri}
              disabled={mesgul}
              className="flex items-center gap-1.5 rounded-full border border-ayrac px-4 py-2 font-govde text-xs font-medium text-murekkep transition-colors hover:border-sarap hover:text-sarap disabled:opacity-50"
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" aria-hidden>
                <path d="M4 8h9a5 5 0 0 1 0 10h-3M4 8l4-4M4 8l4 4" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" fill="none" />
              </svg>
              Geri Al
            </button>
            <button
              onClick={() => setSilOnay(true)}
              disabled={mesgul}
              className="flex items-center gap-1.5 rounded-full px-4 py-2 font-govde text-xs text-sarap transition-colors hover:bg-sarap/10 disabled:opacity-50"
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" aria-hidden>
                <path d="M5 7h14M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7M6.5 7l.7 12a2 2 0 0 0 2 1.9h5.6a2 2 0 0 0 2-1.9l.7-12" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" fill="none" />
              </svg>
              Kalıcı Sil
            </button>
          </>
        ) : (
          <div className="flex items-center gap-2">
            <span className="font-govde text-xs text-sarap">Kalıcı sil? Geri alınamaz.</span>
            <button
              onClick={onSil}
              disabled={mesgul}
              className="rounded-full bg-sarap px-4 py-2 font-govde text-xs font-medium text-parsomen transition-colors hover:bg-sarapKoyu disabled:opacity-50"
            >
              {mesgul ? "..." : "Evet, sil"}
            </button>
            <button
              onClick={() => setSilOnay(false)}
              disabled={mesgul}
              className="rounded-full border border-ayrac px-4 py-2 font-govde text-xs text-ikincil transition-colors hover:bg-yuzeyKoyu disabled:opacity-50"
            >
              Vazgeç
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function tarihMetni(iso: string): string {
  const t = new Date(iso);
  if (isNaN(t.getTime())) return "";
  return t.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
}
