// LOCKUP - "wordmark + Senden Bize Kalan + yaldiz cizgi + karekod" fonsuz bloku.
//
// ===================== TEK KAYNAK =====================
//
// Bu modul, Davetiye Karekodum'un GORSEL kimligini tek yerde uretir:
//   - lockupSvg()    : SVG string (canli onizleme + SVG indirme)
//   - lockupCanvas() : yuksek cozunurluklu canvas (PNG/JPG/WEBP/PDF export)
//
// Ikisi de AYNI yerlesim sabitlerini kullanir; birbirinden sapamaz.
//
// ===================== KURALLAR (Musa'nin brief'i) =====================
//
//   - FONSUZ: hicbir palet arka plani yok. Ogeler seffaf zeminde durur; dogrudan
//     davetiyeye/deftere birakilir. TEK istisna: karekodun altindaki beyaz pul -
//     dekorasyon degil, okunurluk gereksinimi (koyu davetiyede seffaf QR okunmaz).
//   - "Ani" saraba EN UZAK tonda: acik temada yaldiz-acik (#c4a25e - animasyonun en
//     parlak ucu), koyu temada yaldiz (#d4af6a). Kagitta animasyon yok; sabit durur.
//   - CAGRI METNI YOK: sadece wordmark + slogan + cizgi + karekod.
//   - Kunye (altUrl dolu): karekodun altina "Senden Bize Kalan" yapisiyla domain.

import QRCode from "qrcode";
import { WORDMARK } from "@/lib/marka-yollar";
import { MARKA } from "@/lib/marka";

export type LockupTema = "acik" | "koyu";

export type LockupSecenek = {
  link: string;           // karekodun icerigi (kisa link)
  tema: LockupTema;
  altUrl?: string;        // kunye icin: karekod altina yazilacak domain
};

// ---- TEMA RENKLERI (globals.css + animasyon uclariyla birebir) ----
const TEMA = {
  acik: { bi: "#6e2438", ani: "#c4a25e", tag: "#6c5f50", cizgi: "#a8823c" },
  koyu: { bi: "#c17a4a", ani: "#d4af6a", tag: "#b3a284", cizgi: "#d4af6a" },
} as const;

// Karekod HER ZAMAN beyaz pul uzerinde koyu modul - okunurluk (tema fark etmez).
const QR_KOYU = "#211a17";
const QR_BEYAZ = "#ffffff";

// ---- WORDMARK BIRLESIK UZAY ----
// Uc glif ayni yukseklik (174) ve ayni y-origin (-161) paylasir; yan yana dizilir.
//   bi:    x[0..226]
//   ani:   x[226..591]   (offset +226)
//   birak: x[591..1176]  (offset +591)
const WM_ANI_X = 226;
const WM_BIRAK_X = 591;
const WM_TOPLAM_G = 1176;
const WM_Y_ORIGIN = 161; // -(-161)
const WM_ORAN = WM_TOPLAM_G / 174; // ~6.759

// ---- YERLESIM SABITLERI (tasarim px; olcekle carpilir) ----
const D = {
  wmW: 300,                      // wordmark hedef genislik
  gap1: 16,                      // wordmark -> slogan
  tagSize: 11,
  tagLs: 2.6,                    // slogan harf araligi (px)
  gap2: 15,                      // slogan -> cizgi
  cizgiW: 52,
  cizgiH: 2,
  gap3: 16,                      // cizgi -> karekod
  qrSize: 118,                   // karekod cizim boyutu
  tilePad: 11,                   // beyaz pul ic bosluk
  tileYuvarlak: 12,
  gap4: 13,                      // karekod -> altUrl (kunye)
  urlSize: 10,
  urlLs: 1.8,
};

// Layout metrikleri - SVG ve canvas paylasir.
function metrik(secenek: LockupSecenek) {
  const wmH = D.wmW / WM_ORAN;
  const tile = D.qrSize + D.tilePad * 2;
  const w = Math.max(D.wmW, tile);
  const cx = w / 2;

  let y = 0;
  const wmTop = y; y += wmH;
  y += D.gap1;
  const tagTop = y; y += D.tagSize * 1.25;
  y += D.gap2;
  const cizgiTop = y; y += D.cizgiH;
  y += D.gap3;
  const tileTop = y; y += tile;

  let urlTop = 0;
  if (secenek.altUrl) {
    y += D.gap4;
    urlTop = y; y += D.urlSize * 1.4;
  }

  return { w, h: y, cx, wmH, tile, wmTop, tagTop, cizgiTop, tileTop, urlTop };
}

// QR modul matrisi (qrcode lib). ECC "M": denge; kisa link zaten az modul uretir.
function qrMatris(icerik: string): { boyut: number; dolu: (r: number, c: number) => boolean } {
  const qr = QRCode.create(icerik, { errorCorrectionLevel: "M" });
  const boyut = qr.modules.size;
  const veri = qr.modules.data; // Uint8Array, satir-major
  return {
    boyut,
    dolu: (r, c) => veri[r * boyut + c] === 1,
  };
}

// Slogan metni (Turkce buyuk harf): "Senden Bize Kalan" -> "SENDEN BİZE KALAN"
function sloganMetni(): string {
  return MARKA.tagline.toLocaleUpperCase("tr-TR");
}

// ============================ SVG ============================
export function lockupSvg(secenek: LockupSecenek): string {
  const renk = TEMA[secenek.tema];
  const m = metrik(secenek);
  const qr = qrMatris(secenek.link);

  // wordmark: birlesik uzayi hedef genislige olcekle, ortala
  const wmOlcek = D.wmW / WM_TOPLAM_G;
  const wmX0 = m.cx - D.wmW / 2;
  const wmYd = m.wmTop + WM_Y_ORIGIN * wmOlcek; // -161 ucu wmTop'a otursun
  const wmTrans = `translate(${r2(wmX0)} ${r2(wmYd)}) scale(${r4(wmOlcek)})`;

  // karekod: pul + moduller
  const tile = m.tile;
  const tileX = m.cx - tile / 2;
  const modul = D.qrSize / qr.boyut;
  const qrX0 = tileX + D.tilePad;
  const qrY0 = m.tileTop + D.tilePad;

  let modulRects = "";
  for (let rr = 0; rr < qr.boyut; rr++) {
    for (let cc = 0; cc < qr.boyut; cc++) {
      if (!qr.dolu(rr, cc)) continue;
      const x = qrX0 + cc * modul;
      const y = qrY0 + rr * modul;
      // +0.5 taban ortusme (hairline bosluk onleme)
      modulRects += `<rect x="${r2(x)}" y="${r2(y)}" width="${r2(modul + 0.5)}" height="${r2(modul + 0.5)}" fill="${QR_KOYU}"/>`;
    }
  }

  const altUrl = secenek.altUrl
    ? `<text x="${r2(m.cx)}" y="${r2(m.urlTop + D.urlSize)}" text-anchor="middle" font-family="Inter, sans-serif" font-weight="600" font-size="${D.urlSize}" letter-spacing="${D.urlLs}" fill="${renk.tag}">${escapeXml(secenek.altUrl)}</text>`
    : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${r2(m.w)} ${r2(m.h)}" width="${r2(m.w)}" height="${r2(m.h)}" role="img" aria-label="${escapeXml(MARKA.yasalAd)} - ${escapeXml(MARKA.tagline)}">
  <defs>
    <linearGradient id="cizgiGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${renk.cizgi}" stop-opacity="0"/>
      <stop offset="0.5" stop-color="${renk.cizgi}" stop-opacity="1"/>
      <stop offset="1" stop-color="${renk.cizgi}" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <g transform="${wmTrans}">
    <path d="${WORDMARK.bi.d}" fill="${renk.bi}"/>
    <g transform="translate(${WM_ANI_X} 0)"><path d="${WORDMARK.ani.d}" fill="${renk.ani}"/></g>
    <g transform="translate(${WM_BIRAK_X} 0)"><path d="${WORDMARK.birak.d}" fill="${renk.bi}"/></g>
  </g>
  <text x="${r2(m.cx)}" y="${r2(m.tagTop + D.tagSize)}" text-anchor="middle" font-family="Inter, sans-serif" font-weight="600" font-size="${D.tagSize}" letter-spacing="${D.tagLs}" fill="${renk.tag}">${escapeXml(sloganMetni())}</text>
  <rect x="${r2(m.cx - D.cizgiW / 2)}" y="${r2(m.cizgiTop)}" width="${D.cizgiW}" height="${D.cizgiH}" rx="1" fill="url(#cizgiGrad)"/>
  <rect x="${r2(tileX)}" y="${r2(m.tileTop)}" width="${r2(tile)}" height="${r2(tile)}" rx="${D.tileYuvarlak}" fill="${QR_BEYAZ}"/>
  ${modulRects}
  ${altUrl}
</svg>`;
}

// ========================== CANVAS ==========================
// PNG/JPG/WEBP/PDF export icin. Inter, canvas fillText ile dogrudan cizilir -
// belge fontuna erisir (SVG'yi <img> ile rasterize etmenin font-sandbox sorunu YOK).
export async function lockupCanvas(
  secenek: LockupSecenek,
  olcek = 4,
): Promise<HTMLCanvasElement> {
  // Fontlar hazir olsun (Inter yuklenmeden cizersek yanlis font'a duser).
  if (typeof document !== "undefined" && document.fonts) {
    try {
      await document.fonts.ready;
      await document.fonts.load(`600 ${D.tagSize}px Inter`);
    } catch {
      /* font API yoksa devam - fallback sans-serif */
    }
  }

  const renk = TEMA[secenek.tema];
  const m = metrik(secenek);
  const qr = qrMatris(secenek.link);

  const cv = document.createElement("canvas");
  cv.width = Math.ceil(m.w * olcek);
  cv.height = Math.ceil(m.h * olcek);
  const ctx = cv.getContext("2d")!;
  ctx.scale(olcek, olcek);
  ctx.clearRect(0, 0, m.w, m.h); // seffaf

  // ---- wordmark (Path2D + transform) ----
  const wmOlcek = D.wmW / WM_TOPLAM_G;
  const wmX0 = m.cx - D.wmW / 2;
  const wmYd = m.wmTop + WM_Y_ORIGIN * wmOlcek;

  ctx.save();
  ctx.translate(wmX0, wmYd);
  ctx.scale(wmOlcek, wmOlcek);
  ctx.fillStyle = renk.bi;
  ctx.fill(new Path2D(WORDMARK.bi.d));
  ctx.save();
  ctx.translate(WM_ANI_X, 0);
  ctx.fillStyle = renk.ani;
  ctx.fill(new Path2D(WORDMARK.ani.d));
  ctx.restore();
  ctx.save();
  ctx.translate(WM_BIRAK_X, 0);
  ctx.fillStyle = renk.bi;
  ctx.fill(new Path2D(WORDMARK.birak.d));
  ctx.restore();
  ctx.restore();

  // ---- slogan ----
  ctx.fillStyle = renk.tag;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.font = `600 ${D.tagSize}px Inter, sans-serif`;
  setLetterSpacing(ctx, D.tagLs);
  ctx.fillText(sloganMetni(), m.cx, m.tagTop + D.tagSize);
  setLetterSpacing(ctx, 0);

  // ---- yaldiz cizgi (gradient) ----
  const grad = ctx.createLinearGradient(m.cx - D.cizgiW / 2, 0, m.cx + D.cizgiW / 2, 0);
  grad.addColorStop(0, hexA(renk.cizgi, 0));
  grad.addColorStop(0.5, hexA(renk.cizgi, 1));
  grad.addColorStop(1, hexA(renk.cizgi, 0));
  ctx.fillStyle = grad;
  ctx.fillRect(m.cx - D.cizgiW / 2, m.cizgiTop, D.cizgiW, D.cizgiH);

  // ---- karekod: beyaz pul + moduller ----
  const tile = m.tile;
  const tileX = m.cx - tile / 2;
  ctx.fillStyle = QR_BEYAZ;
  yuvarlakDikdortgen(ctx, tileX, m.tileTop, tile, tile, D.tileYuvarlak);
  ctx.fill();

  const modul = D.qrSize / qr.boyut;
  const qrX0 = tileX + D.tilePad;
  const qrY0 = m.tileTop + D.tilePad;
  ctx.fillStyle = QR_KOYU;
  for (let rr = 0; rr < qr.boyut; rr++) {
    for (let cc = 0; cc < qr.boyut; cc++) {
      if (!qr.dolu(rr, cc)) continue;
      ctx.fillRect(qrX0 + cc * modul, qrY0 + rr * modul, modul + 0.4, modul + 0.4);
    }
  }

  // ---- kunye altUrl ----
  if (secenek.altUrl) {
    ctx.fillStyle = renk.tag;
    ctx.font = `600 ${D.urlSize}px Inter, sans-serif`;
    setLetterSpacing(ctx, D.urlLs);
    ctx.fillText(secenek.altUrl, m.cx, m.urlTop + D.urlSize);
    setLetterSpacing(ctx, 0);
  }

  return cv;
}

// -------- yardimcilar --------
function r2(n: number) { return Math.round(n * 100) / 100; }
function r4(n: number) { return Math.round(n * 10000) / 10000; }

function escapeXml(s: string) {
  return s.replace(/[<>&'"]/g, (c) =>
    ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c] as string));
}

// canvas letterSpacing (modern tarayici). Desteklenmezse sessiz gec.
function setLetterSpacing(ctx: CanvasRenderingContext2D, px: number) {
  try {
    (ctx as unknown as { letterSpacing: string }).letterSpacing = `${px}px`;
  } catch {
    /* eski tarayici - araliksiz cizer */
  }
}

function yuvarlakDikdortgen(
  ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number,
) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

// "#rrggbb" + alpha -> "rgba(...)"
function hexA(hex: string, alfa: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alfa})`;
}
