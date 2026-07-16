// INDIRME - Davetiye Karekodum'u istenen formatta dosyaya cevirir.
//
// Formatlar (genis yelpaze - ciftin istegi):
//   SVG  : vektor master (matbaa; sonsuz cozunurluk, seffaf)
//   PNG  : seffaf raster (dijital paylasim, davetiye tasarimina birakma)
//   JPG  : beyaz zeminli raster (JPEG alfa tasimaz - beyaz doldurulur)
//   WEBP : seffaf, kucuk boyut
//   PDF  : yuksek cozunurluklu tek sayfa (jsPDF)
//
// SVG dogrudan string'ten; digerleri lockupCanvas'tan (Inter kusursuz).

import { jsPDF } from "jspdf";
import { lockupSvg, lockupCanvas, type LockupSecenek } from "@/lib/lockup";

export type Format = "svg" | "png" | "jpg" | "webp" | "pdf";

export const FORMATLAR: { kod: Format; ad: string; aciklama: string }[] = [
  { kod: "png", ad: "PNG", aciklama: "Şeffaf · dijital paylaşım" },
  { kod: "svg", ad: "SVG", aciklama: "Vektör · matbaa, sonsuz çözünürlük" },
  { kod: "pdf", ad: "PDF", aciklama: "Baskı · tek sayfa" },
  { kod: "jpg", ad: "JPG", aciklama: "Beyaz zemin · her yerde açılır" },
  { kod: "webp", ad: "WEBP", aciklama: "Şeffaf · küçük boyut" },
];

// Yuksek olcek: kucuk lockup'i buyuk raster'a cikar (matbaa/net baski).
const RASTER_OLCEK = 6;

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

  const cv = await lockupCanvas(secenek, RASTER_OLCEK);

  if (format === "pdf") {
    const png = cv.toDataURL("image/png");
    // Sayfa lockup oranina birebir - kenar bosluksuz, tam is.
    const enBoy = cv.width / cv.height;
    const genislikMm = 90; // makul fiziksel taban; oranla yukseklik
    const yukseklikMm = genislikMm / enBoy;
    const pdf = new jsPDF({
      orientation: genislikMm >= yukseklikMm ? "landscape" : "portrait",
      unit: "mm",
      format: [genislikMm, yukseklikMm],
    });
    pdf.addImage(png, "PNG", 0, 0, genislikMm, yukseklikMm, undefined, "FAST");
    pdf.save(`${dosyaAdi}.pdf`);
    return;
  }

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
