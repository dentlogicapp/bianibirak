// INDIRME - Davetiye Karekodum'u istenen formatta dosyaya cevirir.
//
// Formatlar (genis yelpaze - ciftin istegi):
//   SVG  : vektor master (matbaa; sonsuz cozunurluk, seffaf)
//   PNG  : seffaf raster (dijital paylasim, davetiye tasarimina birakma)
//   JPG  : beyaz zeminli raster (JPEG alfa tasimaz - beyaz doldurulur)
//   WEBP : seffaf, kucuk boyut
//   PDF  : GERCEK VEKTOR tek sayfa (svg2pdf.js) - matbaa standardi
//
// SVG dogrudan string'ten; PDF ayni SVG'den VEKTOR olarak; rasterlar canvas'tan.
//
// MATBAA NOTU (pahali ogrenildi): PDF onceden canvas->PNG gomulerek uretiliyordu.
// Sonuc RASTER'di: CorelDRAW'da olceklenince kenarlar bozuluyor, ayrica sayfa
// zemini seffaf kalmiyordu. Artik PDF, SVG'nin BIREBIR vektor karsiligidir -
// egrilerle cizilir, hangi olcude buyutulurse buyutulsun KESKIN kalir ve zemin
// SEFFAFTIR (davetiye tasariminin uzerine dogrudan yerlesir).

import { jsPDF } from "jspdf";
import { svg2pdf } from "svg2pdf.js";
import JSZip from "jszip";
import { lockupSvg, lockupEps, lockupCanvas, type LockupSecenek } from "@/lib/lockup";

export type Format = "svg" | "eps" | "png" | "jpg" | "webp" | "pdf";

export const FORMATLAR: { kod: Format; ad: string; aciklama: string; matbaa: boolean }[] = [
  // MATBAA (vektor - sonsuz olcek, sifir bozunma)
  { kod: "pdf", ad: "PDF", aciklama: "Vektör · matbaa standardı", matbaa: true },
  { kod: "eps", ad: "EPS", aciklama: "Vektör · CorelDRAW/Illustrator", matbaa: true },
  { kod: "svg", ad: "SVG", aciklama: "Vektör · web ve tasarım", matbaa: true },
  // DIJITAL (raster - piksel tabanli, buyutulunce bozulur)
  { kod: "png", ad: "PNG", aciklama: "Şeffaf · dijital paylaşım", matbaa: false },
  { kod: "webp", ad: "WEBP", aciklama: "Şeffaf · küçük boyut", matbaa: false },
  { kod: "jpg", ad: "JPG", aciklama: "Beyaz zemin · her yerde açılır", matbaa: false },
];

// Yuksek olcek: kucuk lockup'i buyuk raster'a cikar (matbaa/net baski).
const RASTER_OLCEK = 8;

// Tek formatin blob'unu uretir (ZIP + tekil indirme paylasir).
async function formatBlob(
  secenek: LockupSecenek,
  format: Format,
): Promise<Blob> {
  if (format === "svg") {
    return new Blob([lockupSvg(secenek)], { type: "image/svg+xml;charset=utf-8" });
  }

  if (format === "eps") {
    return new Blob([lockupEps(secenek)], { type: "application/postscript" });
  }

  if (format === "pdf") {
    return vektorPdfBlob(secenek);
  }

  const cv = await lockupCanvas(secenek, RASTER_OLCEK);

  if (format === "jpg") {
    const beyaz = document.createElement("canvas");
    beyaz.width = cv.width;
    beyaz.height = cv.height;
    const bctx = beyaz.getContext("2d")!;
    bctx.fillStyle = "#ffffff";
    bctx.fillRect(0, 0, beyaz.width, beyaz.height);
    bctx.drawImage(cv, 0, 0);
    return canvasBlob(beyaz, "image/jpeg", 0.95);
  }

  const mime = format === "webp" ? "image/webp" : "image/png";
  return canvasBlob(cv, mime, 0.95);
}


// ---- VEKTOR PDF (matbaa) ----
//
// Ayni lockupSvg ciktisi, PDF'e VEKTOR olarak aktarilir: her modul, her harf
// egrisi PDF icinde yol (path) olarak durur. Sonuc:
//   - Olceklemede SIFIR bozunma (CorelDRAW/Illustrator/InDesign'da buyut, keskin kalir)
//   - Zemin SEFFAF (beyaz kutu yok; davetiye tasariminin uzerine oturur)
//   - Dosya kucuk (raster yok)
//
// Fiziksel olcu: SVG kullanici birimi = 1 px @96 DPI kabul edilir; mm'ye cevrilir.
// Boylece matbaa dosyayi actiginda GERCEK olcusunde gelir, tahmin etmek zorunda kalmaz.
const PX_MM = 25.4 / 96;

async function vektorPdfBlob(secenek: LockupSecenek): Promise<Blob> {
  const svgMetin = lockupSvg(secenek);

  // svg2pdf gercek bir SVG dugumu ister; bazi olcumler icin dugumun BELGEDE
  // olmasi gerekir. Ekran disinda gecici bir kapsayiciya alinir, is bitince silinir.
  const kap = document.createElement("div");
  kap.setAttribute("aria-hidden", "true");
  kap.style.position = "fixed";
  kap.style.left = "-10000px";
  kap.style.top = "0";
  kap.innerHTML = svgMetin;
  document.body.appendChild(kap);

  try {
    const svgEl = kap.querySelector("svg") as SVGSVGElement | null;
    if (!svgEl) throw new Error("SVG olusturulamadi");

    const vb = (svgEl.getAttribute("viewBox") ?? "").split(/[\s,]+/).map(Number);
    const g = vb.length === 4 && vb[2] > 0 ? vb[2] : 300;
    const y = vb.length === 4 && vb[3] > 0 ? vb[3] : 300;

    const genislikMm = g * PX_MM;
    const yukseklikMm = y * PX_MM;

    const pdf = new jsPDF({
      orientation: genislikMm >= yukseklikMm ? "landscape" : "portrait",
      unit: "mm",
      format: [genislikMm, yukseklikMm],
      compress: true,
    });

    await svg2pdf(svgEl, pdf, { x: 0, y: 0, width: genislikMm, height: yukseklikMm });
    return pdf.output("blob");
  } finally {
    kap.remove();
  }
}


// Pakete konan kisa kilavuz: matbaaci da cift de ne yapacagini DUSUNMEDEN gorur.
const OKUBENI = `BiAnıBırak - Davetiye Karekodu Paketi
=======================================

MATBAA/  -> Baskı için BUNLARI verin
  .pdf   Vektör. Matbaa standardı; CorelDRAW, Illustrator, InDesign açar.
  .eps   Vektör. CorelDRAW/Illustrator'ın klasik teslim formatı.
  .svg   Vektör. Web ve tasarım programları için.

  Bu üç dosya SONSUZ ölçeklenebilir: %10 da bassanız %1000 de bassanız
  kenarlar keskin kalır, hiçbir bozunma olmaz. Arka planları ŞEFFAFTIR -
  davetiye tasarımınızın üzerine doğrudan yerleşir.

DIJITAL/ -> Ekran ve paylaşım için
  .png   Şeffaf. WhatsApp, sosyal medya, dijital davetiye.
  .webp  Şeffaf, küçük boyut.
  .jpg   Beyaz zeminli (JPG şeffaflık taşımaz).

  DİKKAT: Bu üç dosya piksel tabanlıdır. Büyütüldüğünde bozulur.
  BASKI İÇİN KULLANMAYIN - matbaaya MATBAA klasöründeki dosyaları verin.

KAREKODUN ALTINDAKİ BEYAZ ALAN
  Karekodun arkasındaki beyaz yuvarlak pul SÜS DEĞİL, ZORUNLULUKTUR.
  Karekod okuyucular koyu modüllerin çevresinde açık bir "sessiz alan" arar.
  Kaldırılırsa renkli zemin üzerinde karekod okunmayabilir. Lütfen silmeyin.

BASKI ÖNCESİ SON KONTROL
  Karekodu bir telefonla tarayın; doğru sayfaya gittiğini görün.
  Önerilen en küçük basım boyu: 2 cm x 2 cm (karekod alanı).

Senden Bize Kalan.
`;

// TUM FORMATLAR -> ZIP BLOB (indirmeden dondur; WhatsApp paylasimi icin).
export async function tumFormatlarZipBlob(
  secenek: LockupSecenek,
  dosyaAdi: string,
): Promise<{ blob: Blob; ad: string }> {
  const zip = new JSZip();

  // KLASORLEME - matbaaci ile ciftin ihtiyaci AYNI SEY DEGIL. Once "hangi dosyayi
  // kime verecegim" sorusunu ortadan kaldiririz: vektorler MATBAA, rasterlar DIJITAL.
  // Onceki surumde hepsi tek klasordeydi ve matbaaya PNG gidebiliyordu - o dosya
  // buyutuldugunde kacinilmaz olarak bozunur.
  for (const f of FORMATLAR) {
    const blob = await formatBlob(secenek, f.kod);
    const klasor = f.matbaa ? "MATBAA" : "DIJITAL";
    zip.file(`${klasor}/${dosyaAdi}.${f.kod}`, blob);
  }

  zip.file("OKUBENI.txt", OKUBENI);
  const paket = await zip.generateAsync({ type: "blob" });
  return { blob: paket, ad: dosyaAdi };
}

// TUM FORMATLAR -> TEK ZIP (dogrudan indir).
export async function tumFormatlarZip(
  secenek: LockupSecenek,
  dosyaAdi: string,
): Promise<void> {
  const { blob, ad } = await tumFormatlarZipBlob(secenek, dosyaAdi);
  indirBlob(blob, `${ad}.zip`);
}

export async function karekodIndir(
  secenek: LockupSecenek,
  format: Format,
  dosyaAdi: string,
): Promise<void> {
  if (format === "svg") {
    const svg = lockupSvg(secenek);
    indirBlob(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }), `${dosyaAdi}.svg`);
    return;
  }

  if (format === "eps") {
    indirBlob(new Blob([lockupEps(secenek)], { type: "application/postscript" }), `${dosyaAdi}.eps`);
    return;
  }

  // PDF: TEK KAYNAK - ZIP ile ayni vektor uretici. Iki ayri PDF yolu birakilirsa
  // kacinilmaz olarak ayrisir ve matbaaya farkli kalitede dosya gider.
  if (format === "pdf") {
    indirBlob(await vektorPdfBlob(secenek), `${dosyaAdi}.pdf`);
    return;
  }

  const cv = await lockupCanvas(secenek, RASTER_OLCEK);

  // JPG: alfa yok -> beyaz zemin doldur.
  if (format === "jpg") {
    const beyaz = document.createElement("canvas");
    beyaz.width = cv.width;
    beyaz.height = cv.height;
    const bctx = beyaz.getContext("2d")!;
    bctx.fillStyle = "#ffffff";
    bctx.fillRect(0, 0, beyaz.width, beyaz.height);
    bctx.drawImage(cv, 0, 0);
    const blob = await canvasBlob(beyaz, "image/jpeg", 0.95);
    indirBlob(blob, `${dosyaAdi}.jpg`);
    return;
  }

  const mime = format === "webp" ? "image/webp" : "image/png";
  const blob = await canvasBlob(cv, mime, 0.95);
  indirBlob(blob, `${dosyaAdi}.${format}`);
}

function canvasBlob(cv: HTMLCanvasElement, mime: string, kalite?: number): Promise<Blob> {
  return new Promise((coz, hata) => {
    cv.toBlob(
      (b) => (b ? coz(b) : hata(new Error("blob üretilemedi"))),
      mime,
      kalite,
    );
  });
}

function indirBlob(blob: Blob, ad: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = ad;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
