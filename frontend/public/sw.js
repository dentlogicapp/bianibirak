// BiAniBirak - PWA service worker (Planlama Defteri deseni uyarlamasi).
// Ilke: API (/api) ASLA onbellege alinmaz (her zaman canli); sayfa network-first
// (en guncel surum); degismez statik varliklar (hash'li JS/CSS/ikon) cache-first.
const CACHE = "bianibirak-pwa-v6"; // v6: kurulum onbellek hatasindan BAGIMSIZ - worker her kosulda aktiflesir

self.addEventListener("install", (event) => {
  // KURULUM ASLA ONBELLEK YUZUNDEN COKMEZ.
  //
  // PAHALI OGRENILEN HATA (uc platformda bildirimleri oldurdu):
  //   caches.open(CACHE).then(c => c.add("/")).then(() => skipWaiting())
  // Burada c.add("/") bir AG ISTEGIDIR. Istek basarisiz olursa ya da 2xx disi bir
  // yanit donerse promise REDDEDILIR; waitUntil reddedilince KURULUM COKER; worker
  // hic aktiflesmez. Bunun sonucu yalnizca "onbellek yok" degildir:
  //   navigator.serviceWorker.ready SONSUZA KADAR COZULMEZ
  //   -> push abonelik durumu hic okunamaz
  //   -> bildirimler tamamen olur.
  // Yani tamamen ISTEGE BAGLI bir iyilestirme, kritik bir altyapiyi dusuruyordu.
  //
  // KURAL: kritik olmayan hicbir islem, kritik bir kurulumu engelleyemez.
  // Onbellek denenir; olmazsa SESSIZCE gecilir ve worker yine de devreye girer.
  event.waitUntil(
    (async () => {
      try {
        const c = await caches.open(CACHE);
        await c.add("/");
      } catch (_) {
        /* onbellek opsiyonel - kurulum devam eder */
      }
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  // Eski surum onbelleklerini temizle, kontrolu hemen al.
  // Temizlik de kritik degildir - basarisiz olsa bile claim() CALISMALIDIR.
  event.waitUntil(
    (async () => {
      try {
        const keys = await caches.keys();
        await Promise.all(
          keys.filter((k) => k !== CACHE && k !== "bianibirak-nav").map((k) => caches.delete(k))
        );
      } catch (_) {
        /* temizlik opsiyonel */
      }
      try {
        await self.clients.claim();
      } catch (_) {
        /* claim reddedilse bile worker aktiftir */
      }
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return; // sadece okuma istekleri

  const url = new URL(request.url);

  // 0) YALNIZ http/https - blob: ve data: URL'lere ASLA dokunma.
  //
  //    KRITIK: new URL("blob:https://site/uuid").origin, sayfanin origin'i ile
  //    ESLESIR. Yani asagidaki origin kontrolunden gecer, service worker blob'u
  //    agdan cekmeye calisir ve PATLAR. Sonuc: tarayicida uretilen fotograf
  //    onizlemeleri (URL.createObjectURL) hic gorunmez.
  //
  //    Bu URL'ler zaten bellekte; ag katmaninin isi degil.
  if (url.protocol !== "http:" && url.protocol !== "https:") return;

  // 1) API cagrilari -> HIC dokunma, her zaman canli (kritik: veri onbelleklenmez)
  if (url.pathname.startsWith("/api")) return;

  // 2) Baska origin -> dokunma
  if (url.origin !== self.location.origin) return;

  // 3) Sayfa gezinmesi -> network-first: en guncel surum; cevrimdisiyse kabuk
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const kopya = res.clone();
          caches.open(CACHE).then((c) => c.put(request, kopya));
          return res;
        })
        .catch(() => caches.match(request).then((r) => r || caches.match("/")))
    );
    return;
  }

  // 4) Degismez statik varliklar (hash'li) -> cache-first (hizli + cevrimdisi)
  const statikMi =
    url.pathname.startsWith("/_next/static") ||
    url.pathname.startsWith("/fonts") ||
    /\.(?:png|svg|ico|woff2?|css|js)$/.test(url.pathname);
  if (statikMi) {
    event.respondWith(
      caches.match(request).then((cached) =>
        cached ||
        fetch(request).then((res) => {
          const kopya = res.clone();
          caches.open(CACHE).then((c) => c.put(request, kopya));
          return res;
        })
      )
    );
    return;
  }

  // 5) Digerleri -> network, cevrimdisiyse varsa onbellek
  event.respondWith(fetch(request).catch(() => caches.match(request)));
});

// Push bildirimi geldiginde goster (Asama 10'da VAPID ile tam devreye girer)
self.addEventListener("push", (event) => {
  let veri = { title: "BiAniBirak", body: "" };
  try {
    if (event.data) veri = Object.assign(veri, event.data.json());
  } catch (e) {
    if (event.data) veri.body = event.data.text();
  }
  event.waitUntil(
    self.registration.showNotification(veri.title, {
      body: veri.body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: veri.data || {},
    })
  );
});

// Bildirime tiklaninca ilgili sayfayi ac/odakla.
// Acik bir sekme varsa: odakla + postMessage ile client-side yonlendir (reload yok;
// ?focus={id} korunur -> dilege scroll + vurgu). Yoksa yeni pencere ac.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const ham = event.notification.data?.url || "/";
  const hedef = new URL(ham, self.location.origin).href;

  // BILDIRIM TIKLAMASI - TEK YOL, ONGORULEBILIR DAVRANIS.
  //
  // PAHALI OGRENILEN HATA: bir donem burada UC mekanizma birden calisiyordu -
  // postMessage, client.navigate() ve kalici "bekleyen hedef" kaydi. Her biri tek
  // basina makuldu; UCU BIRDEN calisinca birbirleriyle YARISTILAR: kimi zaman sayfa
  // iki kez gitti, kimi zaman navigate yeniden yukleyip mesaji sildi, kimi zaman
  // eski bir bekleyen kayit kullaniciyi alakasiz bir yere goturdu. Sonuc: "bazen
  // calisan" bir bildirim sistemi - ki bu, hic calismayandan daha kotudur, cunku
  // guven kaybettirir ve teshis edilemez.
  //
  // KURAL: bir is icin TEK yol. Onceligi net:
  //   1) Zaten hedef adreste bir pencere varsa -> yalnizca ODAKLA.
  //   2) Baska bir pencere acikca -> ODAKLA ve MESAJLA (sayfa kendi gezinir).
  //   3) Hic pencere yoksa -> openWindow (adres zaten hedef).
  //
  // navigate() KULLANILMAZ: tam sayfa yeniden yukleme yapar, uygulama durumunu
  // atar ve mesaj yolunu bozar. Odak + mesaj, her platformda ayni sonucu verir.
  event.waitUntil(
    (async () => {
      const liste = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      const ayniAdres = liste.find((c) => c.url === hedef);
      if (ayniAdres) {
        try { await ayniAdres.focus(); } catch (_) {}
        // Ayni sayfadayiz ama odak tazelensin (ornek: ayni listede baska bir kayda).
        ayniAdres.postMessage({ type: "bianibirak-odak", url: ham });
        return;
      }

      const pencere = liste.find((c) => c.url.startsWith(self.location.origin));
      if (pencere) {
        try { await pencere.focus(); } catch (_) {}
        pencere.postMessage({ type: "bianibirak-odak", url: ham });
        return;
      }

      await self.clients.openWindow(hedef);
    })()
  );
});
    })()
  );
});
