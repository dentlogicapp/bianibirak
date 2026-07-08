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
};

export default nextConfig;
