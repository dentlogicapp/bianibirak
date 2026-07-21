"use client";

import { useEffect, useRef } from "react";

// SENKRON - "bir seyler degisti" sinyali. VERI TASIMAZ.
//
// ===================== TASARIM =====================
//
// Kanaldan icerik gecmez. /api/durum yalnizca DAMGA doner: her kapsam icin
// "kac tane + en son ne zaman" bilgisinden turetilmis kisa bir dize. Isim yok,
// dilek metni yok, e-posta yok. Cihaz bu damgalari elindekiyle karsilastirir;
// hangisi degistiyse O ALANI kendi mevcut ucundan yeniden ceker.
//
// Bunun onemi: dilek/bildirim/ayar uclarinin hepsinde tenant filtresi, uyelik
// dogrulamasi ve KaynakEs izolasyonu ZATEN var ve calisiyor. Senkron katmani
// yeni bir okuma yolu ACMAZ - mevcut yollarin NE ZAMAN tekrar kullanilacagini
// soyler. Izolasyonu delecek yeni bir kapi yok; kapi sayisi ayni kaldi.
//
// ===================== IZOLASYON =====================
//
// "kuyruk" damgasi KISIYE OZELDIR: yalniz senin onay bekleyen dileklerinin
// damgasi. Esinin kuyrugundaki uc dilek onun damgasini degistirir, seninkini
// DEGISTIRMEZ - cift-link izolasyonu sinyal katmaninda da tanimlidir.
// "defter" damgasi ORTAKTIR: ortak deftere onaylanan dilek ikinize de duser.
//
// ===================== YUK =====================
//
// - Sekme gorunmuyorken sorgu DURUR (visibilitychange). Telefon cebindeyken
//   sifir istek. Geri donuldugunde ANINDA bir kontrol yapilir.
// - setTimeout zinciri kullanilir, setInterval DEGIL: yavas bir yanit
//   geldiginde istekler ust uste binmez.
// - Ayni tarayicinin ikinci sekmesi BroadcastChannel ile ANINDA haberdar olur -
//   sunucuya sifir maliyet.
// - Acik iki cihaz ~ dakikada 24 istek; her biri birkac yuz bayt.
//
// ===================== SINIR =====================
//
// Bu modul KENDILIGINDEN hicbir formu tazelemez. Yalnizca olay yayinlar; hangi
// ekranin ne zaman tazelenecegine o ekran karar verir (useSenkronDinle).
// Kor tazeleme, kullanicinin yazmakta oldugu metni silmenin en kisa yoludur.
//
// TEK OTOMATIK EYLEM: aktif defter degisimi. O da zaten tam sayfa yenileme
// gerektirir (JWT yeniden uretilir), yani yazilmakta olan bir form korunamaz;
// karsiliginda kullanici yanlis defterin verisine bakmaktan kurtulur.

const YOL = "/api/durum";
const ARALIK_MS = 5000;
const KANAL_ADI = "bianibirak-senkron";

export type SenkronAlan = "defterler" | "bildirim" | "kuyruk" | "defter" | "ayar";

export type Damgalar = {
  aktif_etkinlik_id: string | null;
  goruntuleme_modu: boolean;
  defterler: string;
  bildirim: string;
  kuyruk: string;
  defter: string;
  ayar: string;
};

const ALANLAR: SenkronAlan[] = ["defterler", "bildirim", "kuyruk", "defter", "ayar"];

// Olay adi: "bianibirak-senkron:bildirim" gibi.
function olayAdi(alan: SenkronAlan): string {
  return `${KANAL_ADI}:${alan}`;
}

// ---------------------------------------------------------------------------
// DINLEYICI - ekranlar bunu cagirir.
//
// Kullanim (tek satir):
//   useSenkronDinle("bildirim", cek);
//
// Geri cagri her degisimde CALISIR; ekran kendi ucundan taze veriyi ceker.
export function useSenkronDinle(alan: SenkronAlan, geriCagri: () => void) {
  // Ref: geriCagri her render'da yeni bir fonksiyon olsa bile dinleyici
  // yeniden baglanmasin. Yoksa her render'da ekle/cikar dongusu olusur.
  const cagriRef = useRef(geriCagri);
  cagriRef.current = geriCagri;

  useEffect(() => {
    function dinle() {
      cagriRef.current();
    }
    window.addEventListener(olayAdi(alan), dinle);
    return () => window.removeEventListener(olayAdi(alan), dinle);
  }, [alan]);
}

// ---------------------------------------------------------------------------
// SAGLAYICI - AppShell'de BIR KEZ cagrilir.
export function useSenkron() {
  const sonDamga = useRef<Damgalar | null>(null);
  // Bu cihazin JWT'sindeki aktif defter (claim'in gorusu).
  const yerelAktif = useRef<string | null>(null);
  const yerelHazir = useRef(false);
  // Gecis kilidi: ayni hedefe iki kez atlamaya calisma. Sunucu 403 verirse
  // sonsuz doner, kullanici sayfayi hic goremezdi.
  const gecisHedefi = useRef<string | null>(null);
  const durduruldu = useRef(false);

  useEffect(() => {
    durduruldu.current = false;
    let zaman: number | undefined;
    let kanal: BroadcastChannel | null = null;

    // Bu cihazin CLAIM'deki aktif defterini ogren. Sunucunun DB'deki degeriyle
    // karsilastirilacak olan budur. 403 = aktif defter yok (yeni giris).
    async function yereliOgren() {
      try {
        const y = await fetch("/api/etkinlik/aktif", { credentials: "include" });
        if (y.ok) {
          const g = await y.json();
          yerelAktif.current = typeof g.id === "string" ? g.id : null;
        } else {
          yerelAktif.current = null;
        }
      } catch {
        yerelAktif.current = null;
      }
      yerelHazir.current = true;
    }

    async function kontrol() {
      if (durduruldu.current) return;
      if (document.visibilityState === "hidden") return;
      if (!yerelHazir.current) return;

      let d: Damgalar;
      try {
        const y = await fetch(YOL, { credentials: "include", cache: "no-store" });
        if (!y.ok) return; // oturum yok / gecici hata - sessizce gec, bir sonraki tur dener
        d = (await y.json()) as Damgalar;
      } catch {
        return; // ag hatasi: sessiz. Kullaniciya "baglanti yok" diye bagirmayiz.
      }

      const onceki = sonDamga.current;
      sonDamga.current = d;

      // ---- AKTIF DEFTER UZLASMASI ----
      //
      // GORUNTULEME MODU HARIC: super yonetici baska bir deftere SALT-OKUNUR
      // girdiginde JWT gecici (1 saat) ve DB'ye YAZILMAZ. Uzlasma calissaydi
      // yoneticiyi inceledigi defterden ANINDA disari atardi - teshis araci
      // kendi kendini kapatirdi.
      if (
        !d.goruntuleme_modu &&
        d.aktif_etkinlik_id &&
        d.aktif_etkinlik_id !== yerelAktif.current &&
        gecisHedefi.current !== d.aktif_etkinlik_id
      ) {
        gecisHedefi.current = d.aktif_etkinlik_id;
        durduruldu.current = true;
        try {
          const y = await fetch(`/api/etkinlik/${d.aktif_etkinlik_id}/aktif-yap`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
          });
          if (y.ok) {
            // TAM YENILEME zorunlu: JWT (aktif_etkinlik_id) degisti, sayfadaki
            // her sey eski tenant baglamini tasiyor.
            window.location.reload();
            return;
          }
        } catch {
          /* ag hatasi - asagida kilidi acip devam ederiz */
        }
        // Basarisiz: kilidi ac, ama AYNI hedefi tekrar denememek icin
        // gecisHedefi'ni birak. Baska bir hedef gelirse yeniden denenir.
        durduruldu.current = false;
      }

      // ---- ALAN DAMGALARI ----
      // Ilk turda onceki yoktur; olay YAYINLANMAZ. Yoksa acilista her ekran
      // bir kez bosuna tazelenirdi.
      if (!onceki) return;
      for (const alan of ALANLAR) {
        if (onceki[alan] !== d[alan]) {
          window.dispatchEvent(new CustomEvent(olayAdi(alan)));
        }
      }
    }

    function zamanla() {
      window.clearTimeout(zaman);
      // setTimeout ZINCIRI - setInterval degil. Yavas bir yanit geldiginde
      // istekler ust uste binmez; bir sonraki tur ancak oncekisi bitince kurulur.
      zaman = window.setTimeout(async () => {
        await kontrol();
        zamanla();
      }, ARALIK_MS);
    }

    function gorunurluk() {
      if (document.visibilityState === "visible") {
        // Uygulamaya donuldugu AN kontrol - "actigimda guncel olsun".
        void kontrol();
        zamanla();
      } else {
        window.clearTimeout(zaman);
      }
    }

    void (async () => {
      await yereliOgren();
      await kontrol();
      zamanla();
    })();

    document.addEventListener("visibilitychange", gorunurluk);
    window.addEventListener("focus", gorunurluk);

    // AYNI TARAYICI, IKINCI SEKME - sunucuya ugramadan anlik.
    // Bir sekme defter degistirdiginde digeri 5 saniye beklemez.
    try {
      kanal = new BroadcastChannel(KANAL_ADI);
      kanal.onmessage = () => {
        void kontrol();
      };
    } catch {
      /* BroadcastChannel yoksa (eski Safari) yalnizca polling calisir - kayip yok */
    }

    return () => {
      durduruldu.current = true;
      window.clearTimeout(zaman);
      document.removeEventListener("visibilitychange", gorunurluk);
      window.removeEventListener("focus", gorunurluk);
      kanal?.close();
    };
  }, []);
}

// Bu sekmede bir sey degistiginde diger SEKMELERI uyar (sunucuya ugramadan).
// Ornek: defter degistirildikten hemen sonra cagrilir.
export function senkronDuyur() {
  try {
    const k = new BroadcastChannel(KANAL_ADI);
    k.postMessage("degisti");
    k.close();
  } catch {
    /* desteklenmiyorsa sessiz gec */
  }
}
