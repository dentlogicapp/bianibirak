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

// SLOGAN OUTLINE - "Senden Bize Kalan" Inter SemiBold ile ONCEDEN path'e cevrildi.
// Neden: SVG matbaanin programina girdiginde Inter yoksa canli metin baska fonta
// duserdi. Outline path font-BAGIMSIZDIR - her yerde birebir ayni gorunur. Raster
// formatlar (PNG/JPG/WEBP) zaten canvas fillText ile font-gomulu uretiliyor.
const SLOGAN_UPEM = 2048;
const SLOGAN_TOPLAM = 28804.2;  // font birimi toplam genislik (tracking dahil)
const SLOGAN_PATH = "M673.0 -23Q500.0 -23 372.5 31.0Q245.0 85 173.0 188.0Q101.0 291 95.0 438H358.0Q365.0 360 407.0 308.0Q449.0 256 518.0 230.5Q587.0 205 671.0 205Q759.0 205 826.5 232.0Q894.0 259 932.0 307.5Q970.0 356 970.0 420Q970.0 478 936.5 516.0Q903.0 554 842.5 580.5Q782.0 607 701.0 627L532.0 671Q345.0 719 240.5 816.0Q136.0 913 136.0 1071Q136.0 1203 207.0 1302.0Q278.0 1401 401.0 1455.5Q524.0 1510 680.0 1510Q839.0 1510 959.0 1455.0Q1079.0 1400 1146.5 1303.0Q1214.0 1206 1217.0 1082H958.0Q948.0 1178 872.5 1230.5Q797.0 1283 676.0 1283Q592.0 1283 531.5 1257.5Q471.0 1232 438.5 1188.0Q406.0 1144 406.0 1087Q406.0 1025 444.5 985.0Q483.0 945 541.5 921.0Q600.0 897 660.0 882L799.0 846Q882.0 826 960.0 793.0Q1038.0 760 1100.5 709.5Q1163.0 659 1200.0 587.0Q1237.0 515 1237.0 418Q1237.0 287 1170.0 187.5Q1103.0 88 977.0 32.5Q851.0 -23 673.0 -23ZM1966.0727272727272 0V1490H2934.072727272727V1265H2233.072727272727V863H2882.072727272727V641H2233.072727272727V225H2938.072727272727V0ZM3690.1454545454544 0V1490H3992.1454545454544L4507.145454545454 669Q4539.145454545454 618 4575.145454545454 553.5Q4611.145454545454 489 4650.145454545454 409.5Q4689.145454545454 330 4727.145454545454 233H4697.145454545454Q4690.145454545454 317 4684.645454545454 405.5Q4679.145454545454 494 4676.645454545454 573.5Q4674.145454545454 653 4674.145454545454 708V1490H4945.145454545454V0H4642.145454545454L4177.145454545454 739Q4133.145454545454 810 4094.1454545454544 879.0Q4055.1454545454544 948 4010.1454545454544 1035.0Q3965.1454545454544 1122 3901.1454545454544 1245H3939.1454545454544Q3945.1454545454544 1136 3950.1454545454544 1038.5Q3955.1454545454544 941 3958.6454545454544 864.0Q3962.1454545454544 787 3962.1454545454544 740V0ZM6233.218181818182 0H5856.218181818182V231H6220.218181818182Q6376.218181818182 231 6480.718181818182 288.5Q6585.218181818182 346 6638.218181818182 460.5Q6691.218181818182 575 6691.218181818182 747Q6691.218181818182 917 6638.218181818182 1031.0Q6585.218181818182 1145 6482.718181818182 1202.0Q6380.218181818182 1259 6227.218181818182 1259H5848.218181818182V1490H6243.218181818182Q6465.218181818182 1490 6624.218181818182 1401.0Q6783.218181818182 1312 6868.718181818182 1145.0Q6954.218181818182 978 6954.218181818182 747Q6954.218181818182 514 6868.718181818182 346.5Q6783.218181818182 179 6621.718181818182 89.5Q6460.218181818182 0 6233.218181818182 0ZM5996.218181818182 1490V0H5729.218181818182V1490ZM7692.290909090909 0V1490H8660.290909090909V1265H7959.290909090909V863H8608.290909090909V641H7959.290909090909V225H8664.290909090909V0ZM9416.363636363636 0V1490H9718.363636363636L10233.363636363636 669Q10265.363636363636 618 10301.363636363636 553.5Q10337.363636363636 489 10376.363636363636 409.5Q10415.363636363636 330 10453.363636363636 233H10423.363636363636Q10416.363636363636 317 10410.863636363636 405.5Q10405.363636363636 494 10402.863636363636 573.5Q10400.363636363636 653 10400.363636363636 708V1490H10671.363636363636V0H10368.363636363636L9903.363636363636 739Q9859.363636363636 810 9820.363636363636 879.0Q9781.363636363636 948 9736.363636363636 1035.0Q9691.363636363636 1122 9627.363636363636 1245H9665.363636363636Q9671.363636363636 1136 9676.363636363636 1038.5Q9681.363636363636 941 9684.863636363636 864.0Q9688.363636363636 787 9688.363636363636 740V0ZM12455.50909090909 0V1490H13025.50909090909Q13186.50909090909 1490 13293.50909090909 1439.0Q13400.50909090909 1388 13453.50909090909 1301.0Q13506.50909090909 1214 13506.50909090909 1103Q13506.50909090909 1012 13471.50909090909 947.5Q13436.50909090909 883 13378.00909090909 843.0Q13319.50909090909 803 13246.50909090909 786V771Q13325.50909090909 767 13398.50909090909 723.0Q13471.50909090909 679 13518.00909090909 599.0Q13564.50909090909 519 13564.50909090909 406Q13564.50909090909 290 13508.50909090909 198.0Q13452.50909090909 106 13340.00909090909 53.0Q13227.50909090909 0 13056.50909090909 0ZM12722.50909090909 223H13014.50909090909Q13162.50909090909 223 13228.00909090909 280.0Q13293.50909090909 337 13293.50909090909 426Q13293.50909090909 493 13260.50909090909 546.5Q13227.50909090909 600 13167.00909090909 631.0Q13106.50909090909 662 13023.50909090909 662H12722.50909090909ZM12722.50909090909 855H12991.50909090909Q13062.50909090909 855 13118.50909090909 881.0Q13174.50909090909 907 13207.00909090909 955.0Q13239.50909090909 1003 13239.50909090909 1069Q13239.50909090909 1156 13178.50909090909 1212.0Q13117.50909090909 1268 12997.50909090909 1268H12722.50909090909ZM14556.581818181818 1490V0H14289.581818181818V1490ZM14423.581818181818 1648Q14361.581818181818 1648 14317.081818181818 1690.0Q14272.581818181818 1732 14272.581818181818 1790Q14272.581818181818 1850 14317.081818181818 1891.5Q14361.581818181818 1933 14423.581818181818 1933Q14486.581818181818 1933 14531.081818181818 1891.5Q14575.581818181818 1850 14575.581818181818 1791Q14575.581818181818 1732 14531.081818181818 1690.0Q14486.581818181818 1648 14423.581818181818 1648ZM15310.654545454545 0V166L15935.654545454545 1066Q15987.654545454545 1140 16049.154545454545 1215.0Q16110.654545454545 1290 16173.654545454545 1363L16195.654545454545 1277Q16098.654545454545 1268 16000.654545454545 1266.5Q15902.654545454545 1265 15804.654545454545 1265H15306.654545454545V1490H16406.654545454545V1322L15792.654545454545 438Q15737.654545454545 360 15673.154545454545 282.0Q15608.654545454545 204 15543.654545454545 127L15521.654545454545 213Q15622.654545454545 222 15722.654545454545 223.5Q15822.654545454545 225 15922.654545454545 225H16411.654545454545V0ZM17160.727272727272 0V1490H18128.727272727272V1265H17427.727272727272V863H18076.727272727272V641H17427.727272727272V225H18132.727272727272V0ZM20077.872727272726 367V620Q20125.872727272726 698 20172.372727272726 766.5Q20218.872727272726 835 20271.372727272726 902.0Q20323.872727272726 969 20388.872727272726 1044L20779.872727272726 1490H21111.872727272726L20479.872727272726 777L20459.872727272726 784ZM19884.872727272726 0V1490H20151.872727272726V1048L20146.872727272726 689L20151.872727272726 558V0ZM20806.872727272726 0 20332.872727272726 701 20500.872727272726 902 21121.872727272726 0ZM21708.945454545454 0 22228.945454545454 1490H22567.945454545454L23099.945454545454 0H22806.945454545454L22541.945454545454 774Q22502.945454545454 894 22460.945454545454 1045.5Q22418.945454545454 1197 22367.945454545454 1390H22423.945454545454Q22373.945454545454 1195 22333.445454545454 1042.5Q22292.945454545454 890 22256.945454545454 774L22000.945454545454 0ZM22011.945454545454 369V584H22796.945454545454V369ZM23783.01818181818 0V1490H24050.01818181818V225H24708.01818181818V0ZM25325.090909090908 0 25845.090909090908 1490H26184.090909090908L26716.090909090908 0H26423.090909090908L26158.090909090908 774Q26119.090909090908 894 26077.090909090908 1045.5Q26035.090909090908 1197 25984.090909090908 1390H26040.090909090908Q25990.090909090908 1195 25949.590909090908 1042.5Q25909.090909090908 890 25873.090909090908 774L25617.090909090908 0ZM25628.090909090908 369V584H26413.090909090908V369ZM27399.163636363635 0V1490H27701.163636363635L28216.163636363635 669Q28248.163636363635 618 28284.163636363635 553.5Q28320.163636363635 489 28359.163636363635 409.5Q28398.163636363635 330 28436.163636363635 233H28406.163636363635Q28399.163636363635 317 28393.663636363635 405.5Q28388.163636363635 494 28385.663636363635 573.5Q28383.163636363635 653 28383.163636363635 708V1490H28654.163636363635V0H28351.163636363635L27886.163636363635 739Q27842.163636363635 810 27803.163636363635 879.0Q27764.163636363635 948 27719.163636363635 1035.0Q27674.163636363635 1122 27610.163636363635 1245H27648.163636363635Q27654.163636363635 1136 27659.163636363635 1038.5Q27664.163636363635 941 27667.663636363635 864.0Q27671.163636363635 787 27671.163636363635 740V0Z";

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

// Slogan outline'i (path) hedef konuma yerlestir - font-bagimsiz.
function sloganSvg(m: ReturnType<typeof metrik>, renk: string): string {
  const s = D.tagSize / SLOGAN_UPEM;
  const sw = SLOGAN_TOPLAM * s;         // gercek piksel genislik (ortalamak icin)
  const x0 = m.cx - sw / 2;
  const yb = m.tagTop + D.tagSize;      // taban cizgisi (eski text y ile ayni)
  return `<g transform="translate(${r2(x0)} ${r2(yb)}) scale(${r4(s)} ${r4(-s)})"><path d="${SLOGAN_PATH}" fill="${renk}"/></g>`;
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

  // MATBAA: moduller YATAY BIRLESTIRILIR (run-length). Her modulu ayri dikdortgen
  // yazmak yuzlerce nesne uretir; CorelDRAW/Illustrator bunu agir isler ve kenarlarda
  // dikis izi gosterebilir. Ardisik koyu moduller TEK dikdortgene indirilir - kaplanan
  // alan BIREBIR aynidir (karekod okunurlugu degismez), nesne sayisi ~5 kat duser.
  let modulRects = "";
  for (let rr = 0; rr < qr.boyut; rr++) {
    let cc = 0;
    while (cc < qr.boyut) {
      if (!qr.dolu(rr, cc)) { cc++; continue; }
      let uzunluk = 1;
      while (cc + uzunluk < qr.boyut && qr.dolu(rr, cc + uzunluk)) uzunluk++;
      const x = qrX0 + cc * modul;
      const y = qrY0 + rr * modul;
      // +0.5 taban ortusme (hairline bosluk onleme)
      modulRects += `<rect x="${r2(x)}" y="${r2(y)}" width="${r2(uzunluk * modul + 0.5)}" height="${r2(modul + 0.5)}" fill="${QR_KOYU}"/>`;
      cc += uzunluk;
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
  ${sloganSvg(m, renk.tag)}
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

// ============================ EPS (MATBAA) ============================
//
// NEDEN EPS: matbaanin kullandigi CorelDRAW/Illustrator icin EPS, PDF ile birlikte
// endustri teslim formatidir. CDR (CorelDRAW'in kendi formati) KAPALI ve belgesiz
// bir formattir - tarayicida uretilemez; ama CorelDRAW, EPS ve PDF'i kendi belgesi
// gibi acar ve duzenler. Yani "matbaa dilinde" cikti = EPS + vektor PDF.
//
// Bu uretici SVG'yi PARSE ETMEZ; ayni metrik/qr/renk kaynagindan cizer. Boylece
// SVG - PDF - EPS uclusu geometrik olarak BIREBIR aynidir; birinde duzeltilen bir
// olcu digerlerinde otomatik dogru olur.
//
// SIFIR BOZUNMA: her sey egri ve dikdortgen (yol) olarak yazilir - piksel YOK.
// Sonsuz buyutmede keskin kalir.
//
// ZEMIN: sayfa zemini BOYANMAZ (seffaf). Tek beyaz yuzey, karekodun altindaki
// puldur - o SUS DEGIL, ZORUNLULUKTUR: karekod okuyucular koyu modulun etrafinda
// acik "sessiz alan" arar. Kaldirirsak renkli davetiye uzerinde karekod okunmaz.

const EPS_PT = 0.75; // 1 SVG kullanici birimi (96 DPI px) = 0.75 punto

function epsRenk(hex: string): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  return `${r3(r)} ${r3(g)} ${r3(b)} setrgbcolor`;
}

// SVG yol verisi -> PostScript yolu. Kaynak veriler MUTLAK M/L/H/V/Q/Z kullanir
// (Fraunces glif outline'lari + slogan outline'i). Q (karesel) egri, PostScript'in
// anladigi kubik egriye cevrilir - sekil BIREBIR korunur.
function epsYol(d: string): string {
  const parcalar = d.match(/[A-Za-z]|-?\d*\.?\d+(?:e[-+]?\d+)?/g) ?? [];
  const cikti: string[] = [];
  let komut = "";
  let cx = 0, cy = 0, bx = 0, by = 0;
  let i = 0;
  const sayi = () => parseFloat(parcalar[i++]);

  while (i < parcalar.length) {
    const p = parcalar[i];
    if (/^[A-Za-z]$/.test(p)) {
      komut = p.toUpperCase();
      i++;
      if (komut === "Z") { cikti.push("closepath"); cx = bx; cy = by; }
      continue;
    }
    if (komut === "M") {
      const x = sayi(), y = sayi();
      cikti.push(`${r3(x)} ${r3(y)} moveto`);
      cx = x; cy = y; bx = x; by = y;
      komut = "L"; // SVG kurali: M'den sonraki cift'ler lineto'dur
    } else if (komut === "L") {
      const x = sayi(), y = sayi();
      cikti.push(`${r3(x)} ${r3(y)} lineto`); cx = x; cy = y;
    } else if (komut === "H") {
      const x = sayi();
      cikti.push(`${r3(x)} ${r3(cy)} lineto`); cx = x;
    } else if (komut === "V") {
      const y = sayi();
      cikti.push(`${r3(cx)} ${r3(y)} lineto`); cy = y;
    } else if (komut === "Q") {
      const qx = sayi(), qy = sayi(), x = sayi(), y = sayi();
      const c1x = cx + (2 / 3) * (qx - cx), c1y = cy + (2 / 3) * (qy - cy);
      const c2x = x + (2 / 3) * (qx - x), c2y = y + (2 / 3) * (qy - y);
      cikti.push(`${r3(c1x)} ${r3(c1y)} ${r3(c2x)} ${r3(c2y)} ${r3(x)} ${r3(y)} curveto`);
      cx = x; cy = y;
    } else {
      i++; // taninmayan veri: guvenli atla (sonsuz dongu olmaz)
    }
  }
  return cikti.join("\n");
}

// Yuvarlak kose dikdortgen (karekod pulu) - bezier ile.
function epsYuvarlakDik(x: number, y: number, w: number, h: number, r: number): string {
  const k = r * 0.5523;
  return [
    `${r3(x + r)} ${r3(y)} moveto`,
    `${r3(x + w - r)} ${r3(y)} lineto`,
    `${r3(x + w - r + k)} ${r3(y)} ${r3(x + w)} ${r3(y + r - k)} ${r3(x + w)} ${r3(y + r)} curveto`,
    `${r3(x + w)} ${r3(y + h - r)} lineto`,
    `${r3(x + w)} ${r3(y + h - r + k)} ${r3(x + w - r + k)} ${r3(y + h)} ${r3(x + w - r)} ${r3(y + h)} curveto`,
    `${r3(x + r)} ${r3(y + h)} lineto`,
    `${r3(x + r - k)} ${r3(y + h)} ${r3(x)} ${r3(y + h - r + k)} ${r3(x)} ${r3(y + h - r)} curveto`,
    `${r3(x)} ${r3(y + r)} lineto`,
    `${r3(x)} ${r3(y + r - k)} ${r3(x + r - k)} ${r3(y)} ${r3(x + r)} ${r3(y)} curveto`,
    "closepath fill",
  ].join("\n");
}

export function lockupEps(secenek: LockupSecenek): string {
  const renk = TEMA[secenek.tema];
  const m = metrik(secenek);
  const qr = qrMatris(secenek.link);

  const wPt = m.w * EPS_PT;
  const hPt = m.h * EPS_PT;

  const wmOlcek = D.wmW / WM_TOPLAM_G;
  const wmX0 = m.cx - D.wmW / 2;
  const wmYd = m.wmTop + WM_Y_ORIGIN * wmOlcek;

  const sOlcek = D.tagSize / SLOGAN_UPEM;
  const sGenislik = SLOGAN_TOPLAM * sOlcek;
  const sX0 = m.cx - sGenislik / 2;
  const sYb = m.tagTop + D.tagSize;

  const tile = m.tile;
  const tileX = m.cx - tile / 2;
  const modul = D.qrSize / qr.boyut;
  const qrX0 = tileX + D.tilePad;
  const qrY0 = m.tileTop + D.tilePad;

  const s: string[] = [];
  s.push("%!PS-Adobe-3.0 EPSF-3.0");
  s.push(`%%BoundingBox: 0 0 ${Math.ceil(wPt)} ${Math.ceil(hPt)}`);
  s.push(`%%HiResBoundingBox: 0 0 ${r2(wPt)} ${r2(hPt)}`);
  s.push(`%%Creator: ${MARKA.yasalAd}`);
  s.push(`%%Title: ${MARKA.yasalAd} - ${MARKA.tagline}`);
  s.push("%%LanguageLevel: 2");
  s.push("%%Pages: 1");
  s.push("%%EndComments");
  s.push("%%Page: 1 1");
  s.push("gsave");
  // SVG (ust-sol, y asagi) -> PostScript (alt-sol, y yukari) + px->punto
  s.push(`[${EPS_PT} 0 0 ${-EPS_PT} 0 ${r2(hPt)}] concat`);

  // 1) WORDMARK - uc glif, birlesik uzayda
  s.push("gsave");
  s.push(`[${r4(wmOlcek)} 0 0 ${r4(wmOlcek)} ${r2(wmX0)} ${r2(wmYd)}] concat`);
  s.push(epsRenk(renk.bi));
  s.push("newpath"); s.push(epsYol(WORDMARK.bi.d)); s.push("fill");
  s.push("gsave"); s.push(`[1 0 0 1 ${WM_ANI_X} 0] concat`);
  s.push(epsRenk(renk.ani));
  s.push("newpath"); s.push(epsYol(WORDMARK.ani.d)); s.push("fill");
  s.push("grestore");
  s.push("gsave"); s.push(`[1 0 0 1 ${WM_BIRAK_X} 0] concat`);
  s.push(epsRenk(renk.bi));
  s.push("newpath"); s.push(epsYol(WORDMARK.birak.d)); s.push("fill");
  s.push("grestore");
  s.push("grestore");

  // 2) SLOGAN - outline (font bagimsiz)
  s.push("gsave");
  s.push(`[${r4(sOlcek)} 0 0 ${r4(-sOlcek)} ${r2(sX0)} ${r2(sYb)}] concat`);
  s.push(epsRenk(renk.tag));
  s.push("newpath"); s.push(epsYol(SLOGAN_PATH)); s.push("fill");
  s.push("grestore");

  // 3) YALDIZ CIZGI
  // PostScript'te ALFA YOKTUR: SVG'deki uclari sonen gradyan burada DUZ renk olur.
  // Bilincli tercih - matbaada saydamlik tasiyan gradyan zaten guvenilmezdir
  // (RIP'te bant/leke uretir). Ince bir yaldiz cizgide fark gozle secilmez.
  s.push(epsRenk(renk.cizgi));
  s.push(`${r2(m.cx - D.cizgiW / 2)} ${r2(m.cizgiTop)} ${r2(D.cizgiW)} ${r2(D.cizgiH)} rectfill`);

  // 4) KAREKOD PULU (beyaz, yuvarlak kose) - OKUNURLUK ICIN ZORUNLU
  s.push(epsRenk(QR_BEYAZ));
  s.push("newpath");
  s.push(epsYuvarlakDik(tileX, m.tileTop, tile, tile, D.tileYuvarlak));

  // 5) KAREKOD MODULLERI - yatay birlestirilmis (az nesne, dikissiz)
  s.push(epsRenk(QR_KOYU));
  for (let rr = 0; rr < qr.boyut; rr++) {
    let cc = 0;
    while (cc < qr.boyut) {
      if (!qr.dolu(rr, cc)) { cc++; continue; }
      let uzunluk = 1;
      while (cc + uzunluk < qr.boyut && qr.dolu(rr, cc + uzunluk)) uzunluk++;
      const x = qrX0 + cc * modul;
      const y = qrY0 + rr * modul;
      s.push(`${r2(x)} ${r2(y)} ${r2(uzunluk * modul + 0.5)} ${r2(modul + 0.5)} rectfill`);
      cc += uzunluk;
    }
  }

  s.push("grestore");
  s.push("showpage");
  s.push("%%EOF");
  return s.join("\n");
}

function r3(n: number) { return Math.round(n * 1000) / 1000; }
