"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { pushAboneOl } from "@/lib/push";

// BILDIRIM IZNI KARTI - "reddettim, artik acamiyorum" cikmazini cozer.
//
// TARAYICI GERCEGI: kullanici bildirim iznini bir kez REDDETTIYSE, o siteye
// "Notification.requestPermission()" ile bir daha SORULAMAZ. Cagri aninda "denied"
// doner, hicbir pencere acilmaz. Bu bir hata degil, tarayicinin guvenlik kuralidir:
// aksi halde siteler kullaniciyi izin penceresiyle bogardi.
//
// BIZIM YAPABILECEGIMIZ (ve yapmadigimiz icin kullanicinin sikistigi) sey sudur:
//   1. Durumu DOGRU teshis et (granted / default / denied ayri ayri).
//   2. Reddedilmisse, KULLANDIGI CIHAZA GORE adim adim yol goster - "sistem
//      ayarlarindan degistirin" demek yol gostermek degildir; hangi menuye
//      girecegini bilmeyen kullanici orada durur.
//   3. Kullanici ayarlardan izni acip geri donunce durumu KENDILIGINDEN fark et
//      (Permissions API onchange) - ona "sayfayi yenile" dedirtmeyelim.
//   4. Yine de bir "kontrol et" dugmesi birak: bazi tarayicilar onchange vermez.

type Durum = "bilinmiyor" | "granted" | "default" | "denied" | "desteklenmiyor";

export function BildirimIzinKarti() {
  const [durum, setDurum] = useState<Durum>("bilinmiyor");
  const [calisiyor, setCalisiyor] = useState(false);

  const oku = useCallback(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) { setDurum("desteklenmiyor"); return; }
    setDurum(Notification.permission as Durum);
  }, []);

  useEffect(() => {
    oku();

    // CANLI TAKIP: kullanici sistem ayarlarindan izni acip uygulamaya donunce
    // ekran kendiliginden guncellensin. "Sayfayi yenileyin" demek, sorunu
    // kullaniciya devretmektir.
    let temizle: (() => void) | undefined;
    if (typeof navigator !== "undefined" && navigator.permissions?.query) {
      navigator.permissions
        .query({ name: "notifications" as PermissionName })
        .then((p) => {
          const isle = () => setDurum(p.state === "prompt" ? "default" : (p.state as Durum));
          isle();
          p.addEventListener("change", isle);
          temizle = () => p.removeEventListener("change", isle);
        })
        .catch(() => { /* Permissions API yoksa sessiz gec - dugme yedegimiz var */ });
    }

    // Uygulamaya geri donuldugunde de kontrol et (iOS'ta onchange guvenilmez).
    const gorunurluk = () => { if (document.visibilityState === "visible") oku(); };
    document.addEventListener("visibilitychange", gorunurluk);

    return () => {
      temizle?.();
      document.removeEventListener("visibilitychange", gorunurluk);
    };
  }, [oku]);

  async function izinIste() {
    setCalisiyor(true);
    try {
      const sonuc = await Notification.requestPermission();
      setDurum(sonuc as Durum);
      if (sonuc === "granted") {
        await pushAboneOl();
        toast.success("Bildirimler açıldı.");
      } else if (sonuc === "denied") {
        toast.error("İzin verilmedi. Aşağıdaki adımlarla cihaz ayarlarından açabilirsin.");
      }
    } catch {
      toast.error("Bildirim izni istenirken bir sorun oluştu.");
    }
    setCalisiyor(false);
  }

  async function kontrolEt() {
    setCalisiyor(true);
    oku();
    if (typeof window !== "undefined" && Notification.permission === "granted") {
      await pushAboneOl();
      toast.success("Bildirimler açık - her şey hazır.");
    } else {
      toast("Henüz kapalı görünüyor. Ayarları kaydettiğinden emin ol.");
    }
    setCalisiyor(false);
  }

  if (durum === "bilinmiyor") return null;

  if (durum === "desteklenmiyor") {
    // GERCEK SEBEBI SOYLE - "desteklenmiyor" demek yol gostermez.
    //
    // iPhone'da bildirimler YALNIZCA uygulama ana ekrana eklendiginde (PWA olarak
    // kurulduğunda) calisir. Tarayici sekmesinde acikken Notification API hic yoktur.
    // Kullaniciya "cihazin desteklemiyor" demek YANLIS ve umutsuzluk vericidir;
    // dogrusu "uygulamayi ana ekrana ekle" demektir.
    const iosMu =
      typeof navigator !== "undefined" &&
      (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));

    return (
      <Kart ton="uyari" baslik={iosMu ? "Uygulamayı ana ekrana ekleyin" : "Bu tarayıcı bildirimleri desteklemiyor"}>
        {iosMu ? (
          <>
            <p className="metin-yasli font-govde text-sm leading-relaxed text-ikincil">
              iPhone ve iPad'de bildirimler yalnızca uygulama ana ekrana eklendiğinde
              çalışır. Tarayıcı sekmesinde açıkken bildirim izni verilemez - bu bir
              ayar sorunu değil, iOS'un kuralıdır.
            </p>
            <div className="mt-4 rounded-2xl border border-ayrac bg-parsomen px-5 py-4">
              <p className="font-govde text-[0.65rem] uppercase tracking-etiket text-yaldiz">
                Nasıl eklenir
              </p>
              <ol className="mt-2 space-y-2">
                {[
                  "Safari'de bu sayfayı açın (Chrome değil - iOS'ta yalnızca Safari ekleyebilir).",
                  "Alttaki paylaş simgesine (yukarı ok) dokunun.",
                  "Listeyi kaydırıp \"Ana Ekrana Ekle\" seçeneğine dokunun.",
                  "Ekle deyin ve uygulamayı ana ekrandaki simgeden açın.",
                  "Açılınca bildirim davetine dokunup izin verin.",
                ].map((a, i) => (
                  <li key={i} className="flex gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sarap/10 font-govde text-[0.62rem] font-bold text-sarap">
                      {i + 1}
                    </span>
                    <span className="metin-yasli font-govde text-xs leading-relaxed text-murekkep">{a}</span>
                  </li>
                ))}
              </ol>
            </div>
          </>
        ) : (
          <p className="metin-yasli font-govde text-sm leading-relaxed text-ikincil">
            Kullandığınız tarayıcı bildirim özelliğini sunmuyor. Güncel bir tarayıcıda
            açtığınızda bildirimleri açabilirsiniz.
          </p>
        )}
        <p className="mt-3 font-govde text-xs text-ikincil">
          Bu arada uygulama içi bildirimleriniz çalışmaya devam eder - avatar
          menüsündeki zil simgesinden hepsini görebilirsiniz.
        </p>
      </Kart>
    );
  }

  if (durum === "granted") {
    return (
      <Kart ton="olumlu" baslik="Bildirimler açık">
        <p className="metin-yasli font-govde text-sm leading-relaxed text-ikincil">
          Yeni dilek geldiğinde ve defterinin süresi yaklaştığında haber alacaksın.
          Sessiz saat ayarın varsa acil olmayan bildirimler o saatlerde ertelenir.
        </p>
      </Kart>
    );
  }

  if (durum === "default") {
    return (
      <Kart ton="cagri" baslik="Bildirimleri aç">
        <p className="metin-yasli font-govde text-sm leading-relaxed text-ikincil">
          Yeni bir dilek geldiğinde ve defterinin silinmesine az kaldığında haber vermemiz
          için izin gerekiyor. Bu izin olmadan kritik uyarıları kaçırabilirsin.
        </p>
        <button
          onClick={izinIste}
          disabled={calisiyor}
          className="mt-4 w-full rounded-full bg-sarap px-6 py-3 font-govde text-sm font-medium text-parsomen transition-colors hover:bg-sarapKoyu disabled:opacity-50 sm:w-auto"
        >
          {calisiyor ? "Bekleniyor..." : "Bildirimlere izin ver"}
        </button>
      </Kart>
    );
  }

  // durum === "denied"
  return (
    <Kart ton="uyari" baslik="Bildirimler kapalı">
      <p className="metin-yasli font-govde text-sm leading-relaxed text-ikincil">
        Daha önce bildirim izni verilmemiş. Tarayıcı güvenlik kuralı gereği bu izni
        uygulama içinden yeniden isteyemiyoruz - yalnızca cihaz ayarlarından açılabilir.
        Aşağıdaki adımlar senin cihazın için hazırlandı.
      </p>

      <Adimlar />

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <button
          onClick={kontrolEt}
          disabled={calisiyor}
          className="rounded-full bg-sarap px-6 py-3 font-govde text-sm font-medium text-parsomen transition-colors hover:bg-sarapKoyu disabled:opacity-50"
        >
          {calisiyor ? "Kontrol ediliyor..." : "İzin verdim, kontrol et"}
        </button>
      </div>

      <p className="mt-3 font-govde text-xs text-ikincil">
        İzni açtığında bu ekran kendiliğinden güncellenir. Bu arada uygulama içi
        bildirimlerin çalışmaya devam eder - avatar menüsündeki zil simgesinden görebilirsin.
      </p>
    </Kart>
  );
}

// CIHAZA GORE ADIMLAR - "sistem ayarlarindan acin" demek yol gostermek DEGILDIR.
// Kullanici hangi menuye gireceğini bilmiyorsa orada durur ve vazgecer.
function Adimlar() {
  const [tip, setTip] = useState<"ios" | "android" | "masaustu">("masaustu");

  useEffect(() => {
    const ua = navigator.userAgent || "";
    const iosMu = /iPad|iPhone|iPod/.test(ua) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    if (iosMu) setTip("ios");
    else if (/Android/i.test(ua)) setTip("android");
    else setTip("masaustu");
  }, []);

  const adimlar: Record<typeof tip, string[]> = {
    ios: [
      "iPhone'unda Ayarlar uygulamasını aç.",
      "Aşağı kaydırıp uygulama listesinden BiAnıBırak'ı bul ve dokun.",
      "Bildirimler satırına gir.",
      "\"Bildirimlere İzin Ver\" anahtarını aç.",
      "Bu ekrana geri dön - otomatik olarak güncellenecek.",
    ],
    android: [
      "Telefonunda Ayarlar → Uygulamalar'ı aç.",
      "Listeden BiAnıBırak'ı (veya tarayıcını) bul.",
      "Bildirimler bölümüne gir.",
      "Bildirimlere izin veren anahtarı aç.",
      "Bu ekrana geri dön - otomatik olarak güncellenecek.",
    ],
    masaustu: [
      "Tarayıcının adres çubuğunun solundaki kilit (veya ayar) simgesine tıkla.",
      "Açılan menüde \"Bildirimler\" satırını bul.",
      "Ayarı \"İzin ver\" olarak değiştir.",
      "Sayfayı yenile ya da aşağıdaki düğmeye bas.",
    ],
  };

  const baslik: Record<typeof tip, string> = {
    ios: "iPhone / iPad için",
    android: "Android için",
    masaustu: "Bilgisayar için",
  };

  return (
    <div className="mt-4 rounded-2xl border border-ayrac bg-parsomen px-5 py-4">
      <p className="font-govde text-[0.65rem] uppercase tracking-etiket text-yaldiz">
        {baslik[tip]}
      </p>
      <ol className="mt-2 space-y-2">
        {adimlar[tip].map((a, i) => (
          <li key={i} className="flex gap-2.5">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sarap/10 font-govde text-[0.62rem] font-bold text-sarap">
              {i + 1}
            </span>
            <span className="metin-yasli font-govde text-xs leading-relaxed text-murekkep">{a}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function Kart({
  ton, baslik, children,
}: {
  ton: "olumlu" | "uyari" | "cagri" | "notr";
  baslik: string;
  children: React.ReactNode;
}) {
  const stil = {
    olumlu: "border-yaldiz/40 bg-yaldiz/5",
    uyari: "border-amber-400/50 bg-amber-500/5",
    cagri: "border-sarap/40 bg-sarap/5",
    notr: "border-ayrac bg-yuzey",
  }[ton];

  return (
    <section className={`rounded-3xl border p-6 ${stil}`}>
      <p className="font-display text-lg text-murekkep">{baslik}</p>
      <div className="mt-2">{children}</div>
    </section>
  );
}
