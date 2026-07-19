"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { pushAboneOl, pushCikar, pushDurumu, pushTanilama, type PushDurum, type PushTanilama } from "@/lib/push";
import { useOtoKaydet, otoKayitEtiket } from "@/lib/oto-kaydet";

// Bildirim ayari: push izin/abonelik + sessiz saat. Es, davetli katki bildirimlerini
// buradan acar. Sessiz saatte bildirim ertelenir (gece rahatsiz etmez).
export function BildirimAyari({ yalin = false }: { yalin?: boolean }) {
  // BASLANGIC "yukleniyor" - "desteklenmiyor" DEGIL.
  // Onceki hali oleumcul bir varsayimdi: durum okunamazsa (promise asili kalirsa)
  // ekran sonsuza dek "desteklenmiyor" gosteriyordu. Bilmemek ile desteklememek
  // AYNI SEY DEGILDIR; arayuz bunlari asla ayni gostermemelidir.
  const [durum, setDurum] = useState<PushDurum>("yukleniyor");
  const [tani, setTani] = useState<PushTanilama | null>(null);
  const [islem, setIslem] = useState(false);
  const [hata, setHata] = useState("");

  // Sessiz saat
  const [ssAktif, setSsAktif] = useState(false);
  const [ssBas, setSsBas] = useState("22:00");
  const [ssBit, setSsBit] = useState("08:00");
  const [ssIlk, setSsIlk] = useState<{ aktif: boolean; bas: string; bit: string } | null>(null);

  useEffect(() => {
    pushDurumu().then(setDurum);
    setTani(pushTanilama());
    api.sessizSaatGetir().then((c) => {
      if (c.ok) {
        setSsAktif(c.veri.aktif);
        const bas = c.veri.baslangic || "22:00";
        const bit = c.veri.bitis || "08:00";
        if (c.veri.baslangic) setSsBas(bas);
        if (c.veri.bitis) setSsBit(bit);
        setSsIlk({ aktif: c.veri.aktif, bas, bit });
      } else {
        setSsIlk({ aktif: false, bas: "22:00", bit: "08:00" });
      }
    });
  }, []);

  async function abonelikDegistir() {
    setHata("");
    setIslem(true);
    try {
      if (durum === "abone") {
        await pushCikar();
        setDurum("kapali");
      } else {
        await pushAboneOl();
        setDurum("abone");
      }
    } catch (e) {
      setHata(e instanceof Error ? e.message : "Bir hata oluştu.");
    } finally {
      setIslem(false);
    }
  }

  // Otomatik kaydetme (kaydet butonu YOK): toggle/saat degisiminde debounce'lu kayit.
  const ssDegisti =
    ssIlk !== null && (ssAktif !== ssIlk.aktif || ssBas !== ssIlk.bas || ssBit !== ssIlk.bit);

  async function sessizSaatKaydet(): Promise<boolean> {
    const cevap = await api.sessizSaatGuncelle({
      aktif: ssAktif,
      baslangic: ssBas,
      bitis: ssBit,
    });
    if (cevap.ok) setSsIlk({ aktif: ssAktif, bas: ssBas, bit: ssBit });
    return cevap.ok;
  }

  const ssDurum = useOtoKaydet(
    JSON.stringify({ ssAktif, ssBas, ssBit }),
    ssDegisti,
    sessizSaatKaydet
  );
  const ssGosterge = otoKayitEtiket(ssDurum);

  return (
    <section className={yalin ? "" : "mt-8 rounded-3xl border border-ayrac bg-yuzey p-8"}>
      <h2 className="font-display text-lg text-murekkep">Bildirimler</h2>
      <p className="mt-2 font-govde text-sm leading-relaxed text-ikincil">
        Sana bir dilek bırakıldığında ve ortak deftere yeni bir anı eklendiğinde bildirim
        al. Böylece onay bekleyen dileklerini kaçırmazsın.
      </p>

      {durum === "yukleniyor" ? (
        <p className="mt-5 rounded-2xl border border-ayrac bg-parsomen px-6 py-5 font-govde text-sm text-ikincil">
          Bildirim durumu kontrol ediliyor...
        </p>
      ) : durum === "hazir-degil" ? (
        // YETENEK VAR, WORKER DEVREDE DEGIL - gecici durum, cozumu tek dokunus.
        <div className="mt-5 rounded-2xl border border-amber-400/50 bg-amber-500/5 px-6 py-5">
          <p className="font-govde text-sm font-medium text-murekkep">
            Bildirim servisi hazırlanıyor
          </p>
          <p className="metin-yasli mt-1.5 font-govde text-sm leading-relaxed text-ikincil">
            Cihazınız bildirimleri destekliyor ancak arka plan servisi bu sayfada henüz
            devreye girmemiş. Sayfayı yenilemek genellikle yeterlidir.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 rounded-full bg-sarap px-6 py-2.5 font-govde text-sm font-medium text-parsomen transition-colors hover:bg-sarapKoyu"
          >
            Sayfayı yenile
          </button>
        </div>
      ) : durum === "desteklenmiyor" ? (
        <div className="mt-5 rounded-2xl border border-amber-400/50 bg-amber-500/5 px-6 py-5">
          {/* GERCEK SEBEBI SOYLE.
              "Bu cihaz desteklemiyor" teshis degildir ve umutsuzluk verir. iPhone'da
              bildirimler cogu zaman cihaz yuzunden degil, uygulama ANA EKRANA
              EKLENMEDIGI icin calismaz - ve bu tamamen cozulebilir bir durumdur. */}
          <p className="font-govde text-sm font-medium text-murekkep">
            {tani?.ios && !tani?.kurulu
              ? "Uygulamayı ana ekrana ekleyin"
              : "Bildirimler bu ortamda açılamıyor"}
          </p>
          <p className="metin-yasli mt-1.5 font-govde text-sm leading-relaxed text-ikincil">
            {tani?.sebep || "Tarayıcı bildirim altyapısını sunmuyor."}
          </p>

          {tani?.ios && !tani?.kurulu && (
            <ol className="mt-4 space-y-2">
              {[
                "Bu sayfayı Safari'de açın (iOS'ta yalnızca Safari ana ekrana ekleyebilir).",
                "Alttaki paylaş simgesine (yukarı ok) dokunun.",
                "Listeyi kaydırıp \"Ana Ekrana Ekle\" seçeneğine dokunun.",
                "Ekle deyin; uygulamayı ana ekrandaki simgeden açın.",
                "Açılınca bu ekrana dönüp \"Aç\" düğmesine dokunun.",
              ].map((a, i) => (
                <li key={i} className="flex gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sarap/10 font-govde text-[0.62rem] font-bold text-sarap">
                    {i + 1}
                  </span>
                  <span className="metin-yasli font-govde text-xs leading-relaxed text-murekkep">{a}</span>
                </li>
              ))}
            </ol>
          )}

          {/* TANILAMA - destek konusmasinda "hangi yetenek eksik?" sorusunu
              tahmine birakmaz. Kullaniciyi bogmadan, katlanmis halde durur. */}
          {tani && (
            <details className="mt-4">
              <summary className="cursor-pointer font-govde text-[0.65rem] uppercase tracking-etiket text-ikincil">
                Teknik ayrıntı
              </summary>
              <p className="mt-2 font-govde text-[0.68rem] leading-relaxed text-ikincil">
                Arka plan servisi: {tani.serviceWorker ? "var" : "yok"} · Bildirim altyapısı:{" "}
                {tani.pushManager ? "var" : "yok"} · İzin sistemi: {tani.notification ? "var" : "yok"} ·
                Ana ekrana ekli: {tani.kurulu ? "evet" : "hayır"}
                {tani.ios && ` · iOS ${tani.iosSurum ?? "?"}`}
              </p>
            </details>
          )}
        </div>
      ) : durum === "izin-reddedildi" ? (
        <p className="mt-5 rounded-2xl border border-dashed border-ayrac bg-parsomen px-6 py-5 font-govde text-sm text-ikincil">
          Bildirim izni tarayıcı ayarlarından reddedilmiş. Açmak için site ayarlarından
          bildirimlere izin ver.
        </p>
      ) : (
        <div className="mt-5 flex items-center justify-between gap-3 rounded-2xl border border-ayrac bg-parsomen px-6 py-4">
          <div className="min-w-0">
            <p className="font-govde text-sm font-medium text-murekkep">
              {durum === "abone" ? "Bildirimler açık" : "Bildirimleri aç"}
            </p>
            <p className="mt-0.5 font-govde text-xs text-ikincil">
              {durum === "abone"
                ? "Bu cihazda bildirim alıyorsun."
                : "Tek dokunuşla bu cihazda bildirimleri etkinleştir."}
            </p>
          </div>
          <button
            onClick={abonelikDegistir}
            disabled={islem}
            className={`shrink-0 rounded-full px-5 py-2 font-govde text-xs font-medium transition-colors disabled:opacity-60 ${
              durum === "abone"
                ? "border border-ayrac text-ikincil hover:border-sarap hover:text-sarap"
                : "bg-sarap text-parsomen hover:bg-sarapKoyu"
            }`}
          >
            {islem ? "..." : durum === "abone" ? "Kapat" : "Aç"}
          </button>
        </div>
      )}

      {hata && (
        <p className="mt-3 font-govde text-xs text-sarap" role="alert">
          {hata}
        </p>
      )}

      {/* SESSIZ SAATLER HER ZAMAN GORUNUR.
          Onceden push desteklenmiyorsa bu bolum de GIZLENIYORDU - ama sessiz saat
          SUNUCU TARAFI bir ayardir: bildirim gonderimini erteler ve uygulama ici
          bildirimleri de etkiler. Push'u olmayan kullanicinin bu ayara erisememesi
          icin hicbir sebep yok; gizlemek, var olan bir ozelligi yok saymaktir. */}
      {(
        <div className="mt-6 border-t border-ayrac pt-6">
          <label className="flex items-center justify-between gap-3">
            <span className="font-govde text-sm text-murekkep">Sessiz saatler</span>
            <span
              role="switch"
              aria-checked={ssAktif}
              onClick={() => setSsAktif((v) => !v)}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors ${
                ssAktif ? "bg-sarap" : "bg-ayrac"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-parsomen shadow-sm transition-transform ${
                  ssAktif ? "translate-x-4" : "translate-x-0.5"
                }`}
              />
            </span>
          </label>
          <p className="mt-1 font-govde text-xs text-ikincil">
            Bu saat aralığında bildirimler ertelenir; sabah toplu gelir.
          </p>

          {ssAktif && (
            <div className="mt-4 flex items-end gap-3">
              <label className="block">
                <span className="mb-1 block font-govde text-xs text-ikincil">Başlangıç</span>
                <input
                  type="time"
                  value={ssBas}
                  onChange={(e) => setSsBas(e.target.value)}
                  className="rounded-xl border border-ayrac bg-parsomen px-4 py-2.5 font-govde text-sm text-murekkep outline-none focus:border-sarap"
                />
              </label>
              <label className="block">
                <span className="mb-1 block font-govde text-xs text-ikincil">Bitiş</span>
                <input
                  type="time"
                  value={ssBit}
                  onChange={(e) => setSsBit(e.target.value)}
                  className="rounded-xl border border-ayrac bg-parsomen px-4 py-2.5 font-govde text-sm text-murekkep outline-none focus:border-sarap"
                />
              </label>
            </div>
          )}

          {ssGosterge && (
            <div className="mt-3 flex items-center gap-2">
              <span className={`font-govde text-xs ${ssGosterge.sinif}`}>{ssGosterge.metin}</span>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
