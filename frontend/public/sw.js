// BiAniBirak - PWA service worker (Planlama Defteri deseni uyarlamasi).
// Ilke: API (/api) ASLA onbellege alinmaz (her zaman canli); sayfa network-first
// (en guncel surum); degismez statik varliklar (hash'li JS/CSS/ikon) cache-first.
const CACHE = "bianibirak-pwa-v4"; // v4: bildirim hedefi kalici depoda - iOS dahil tek tik

self.addEventListener("install", (event) => {
  // Yeni surum beklemeden devreye girsin (guncellemeler aninda yansisin)
  event.waitUntil(
    caches.open(CACHE).then((c) => c.add("/")).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  // Eski surum onbelleklerini temizle, kontrolu hemen al
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
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

  // BILDIRIM TIKLAMASI - HER PLATFORMDA TEK TIK.
  //
  // GECMIS: once yalnizca postMessage gonderiliyordu (sayfa uykudaysa kaybolur),
  // sonra client.navigate() eklendi (Chrome/Android'de cozdu). Ama iOS'ta HALA
  // cift tik gerekiyordu.
  //
  // iOS GERCEGI: Safari/PWA'da ilk dokunus cogu zaman yalnizca uygulamayi ONE
  // GETIRIR; o an service worker'in navigate() cagrisi ya reddedilir ya da sayfa
  // henuz uyanmadigi icin postMessage'i kacirir. Ikinci dokunusta sayfa uyanik
  // oldugu icin calisir. Yani sorun ZAMANLAMA'dir - ve zamanlamaya guvenen her
  // cozum er ya da gec kaybeder.
  //
  // KALICI COZUM: hedefi UCUCU OLMAYAN bir yere yazariz (Cache Storage). Sayfa ne
  // zaman uyanirsa uyansin - hemen, bir saniye sonra ya da gorunur oldugunda -
  // bekleyen hedefi okur, tuketir ve gider. Mesaj kaybolsa da, navigate reddedilse
  // de hedef KAYBOLMAZ.
  event.waitUntil(
    (async () => {
      // 1) HEDEFI KALICI YAZ - her seyden once. Gerisi basarisiz olsa bile sayfa
      //    uyandiginda bunu bulacak.
      try {
        const c = await caches.open("bianibirak-nav");
        await c.put(
          new Request("/__bekleyen_yonlendirme"),
          new Response(JSON.stringify({ url: ham, zaman: Date.now() }), {
            headers: { "Content-Type": "application/json" },
          })
        );
      } catch (_) {
        /* cache yoksa diger yollar devrede */
      }

      const liste = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      const pencere = liste.find((c) => c.url.startsWith(self.location.origin));

      if (!pencere) {
        await self.clients.openWindow(hedef);
        return;
      }

      try { await pencere.focus(); } catch (_) { /* odak reddedilebilir */ }

      // Zaten hedefteyiz: yumusak odak yeter.
      if (pencere.url === hedef) {
        pencere.postMessage({ type: "bianibirak-odak", url: ham });
        return;
      }

      // Mesajla haber ver (uyanik sayfa aninda gider).
      pencere.postMessage({ type: "bianibirak-odak", url: ham });

      // SW'nin kendisi gezdirsin (Chrome/Android'de kesin cozum).
      if ("navigate" in pencere) {
        try { await pencere.navigate(hedef); } catch (_) { /* iOS reddedebilir */ }
      }
    })()
  );
});
    })()
  );
});
