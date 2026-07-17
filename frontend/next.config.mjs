import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Docker icin standalone cikti (kucuk runtime imaji)
  output: "standalone",
  // Kok tespitini frontend'e SABITLE: ust dizindeki artik lockfile'lar
  // "inferred workspace root" uyarisi/karisikligi yaratmasin (monorepo:
  // Next app frontend/ altinda, backend .NET - npm koku frontend'dir).
  outputFileTracingRoot: __dirname,
  reactStrictMode: true,
  poweredByHeader: false,
  // TASIMA (B2): eski /panel/* rotalari yeni aciklayici slug'lara 301 doner.
  // Bookmark, PWA ve daha once gonderilmis push bildirim URL'leri kirilmaz.
  // Public rotalar (/k, /d, /davet) DEGISMEDI. Query (?focus=) otomatik korunur.
  async redirects() {
    return [
      { source: "/panel", destination: "/etkinliklerim", permanent: true },
      { source: "/panel/etkinlik", destination: "/gelen-dilekler", permanent: true },
      { source: "/panel/paylasim", destination: "/dilek-baglantisi", permanent: true },
      { source: "/panel/davetiye-karekodum", destination: "/davetiye-karekodu", permanent: true },
      { source: "/panel/kurasyon", destination: "/baskiya-hazir-defter", permanent: true },
      { source: "/panel/fotograflar", destination: "/fotograflar", permanent: true },
      { source: "/panel/cop", destination: "/cop-kutusu", permanent: true },
      { source: "/panel/super", destination: "/super-panel", permanent: true },
      { source: "/panel/yonetim", destination: "/ayarlar", permanent: true },
      { source: "/panel/duzenle", destination: "/ayarlar/etkinlik", permanent: true },
      { source: "/panel/denetim", destination: "/ayarlar/denetim", permanent: true },
      { source: "/panel/es-ekle", destination: "/ayarlar/es-ekle", permanent: true },
      { source: "/panel/ayarlar", destination: "/ayarlar/bildirimler", permanent: true },
    ];
  },
};

export default nextConfig;
