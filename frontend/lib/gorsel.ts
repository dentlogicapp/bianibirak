// GORSEL HAZIRLAMA (tarayicida - sunucuya buyuk dosya GITMEZ).
//
// NEDEN: iPhone fotografi 4032 piksel / 8 MB. Ama A5 sayfada bir foto en fazla 12 cm
// kaplar; 300 DPI baskida bu 1417 piksel eder. Fazlasi KAGIDA GECMEZ - sadece disk ve
// bant genisligi yakar. 1600 pikselde kesiyoruz (%13 pay): baski kalitesi BIREBIR ayni,
// dosya ~10 kat kucuk, yukleme ~10 kat hizli.
//
// EXIF: canvas'a cizip yeniden kodlayinca TUM metadata dusar - GPS koordinati dahil.
// iPhone fotografi cekildigi yerin konumunu tasir; temizlenmezse cift'in EV ADRESI
// PDF'e gomulur. Bu bir KVKK ihlali ve gercek bir tehlike.

export const AZAMI_KENAR = 1600; // baski icin fazlasiyla yeterli
export const KALITE = 0.88; // JPEG kalitesi - gorsel olarak kayipsiz sayilir
export const TAVAN_BAYT = 2 * 1024 * 1024; // backend ile ayni

export type HazirGorsel = {
  dosya: File;
  genislik: number;
  yukseklik: number;
  onizlemeUrl: string;
};

export async function gorselHazirla(ham: File): Promise<HazirGorsel> {
  if (!ham.type.startsWith("image/")) {
    throw new Error("Yalnızca fotoğraf yükleyebilirsin.");
  }

  const bitmap = await gorselOku(ham);

  // Olcegi hesapla - buyutme YOK (kucuk foto oldugu gibi kalir, yapay buyutme kaliteyi bozar)
  const olcek = Math.min(1, AZAMI_KENAR / Math.max(bitmap.width, bitmap.height));
  const g = Math.round(bitmap.width * olcek);
  const y = Math.round(bitmap.height * olcek);

  const tuval = document.createElement("canvas");
  tuval.width = g;
  tuval.height = y;

  const ctx = tuval.getContext("2d");
  if (!ctx) throw new Error("Fotoğraf işlenemedi.");

  // Yumusak kucultme (keskinlik korunur)
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, g, y);

  if ("close" in bitmap) (bitmap as ImageBitmap).close();

  const blob = await new Promise<Blob | null>((coz) =>
    tuval.toBlob(coz, "image/jpeg", KALITE)
  );
  if (!blob) throw new Error("Fotoğraf işlenemedi.");

  if (blob.size > TAVAN_BAYT) {
    // Cok nadir (dev, gurultulu foto): daha dusuk kaliteyle bir kez daha dene
    const ikinci = await new Promise<Blob | null>((coz) =>
      tuval.toBlob(coz, "image/jpeg", 0.75)
    );
    if (!ikinci || ikinci.size > TAVAN_BAYT) {
      throw new Error("Fotoğraf çok büyük. Daha küçük bir fotoğraf dene.");
    }
    return paketle(ikinci, g, y);
  }

  return paketle(blob, g, y);
}

async function paketle(
  blob: Blob,
  genislik: number,
  yukseklik: number
): Promise<HazirGorsel> {
  const dosya = new File([blob], `gorsel-${Date.now()}.jpg`, { type: "image/jpeg" });

  // ONIZLEME URL'I: data: URL (base64), blob: URL DEGIL.
  //
  // NEDEN: blob: URL kirilgan bir sozlesmedir -
  //   - service worker'in fetch handler'i onu yakalayabilir (origin'i sayfa
  //     origin'i ile ESLESIR, "baska origin" filtresinden gecer),
  //   - URL.revokeObjectURL bir kez cagrildiginda URL OLUR ve <img> sessizce
  //     bosalir - hicbir hata firlatmaz,
  //   - bellek yasam dongusu bilesen render dongusune baglidir.
  //
  // data: URL'in boyle bir sozlesmesi YOKTUR. Icerigi kendi icindedir; ag
  // katmanina, service worker'a, revoke zamanlamasina bagimli DEGILDIR. Tek bir
  // fotograf icin bellekte ~1 MB fazladan yer tutar - onizlemenin CALISMASI icin
  // fazlasiyla ucuz bir bedel.
  const onizlemeUrl = await veriUrl(blob);

  return { dosya, genislik, yukseklik, onizlemeUrl };
}

function veriUrl(blob: Blob): Promise<string> {
  return new Promise((coz, at) => {
    const okuyucu = new FileReader();
    okuyucu.onload = () => coz(String(okuyucu.result));
    okuyucu.onerror = () => at(new Error("Fotoğraf okunamadı."));
    okuyucu.readAsDataURL(blob);
  });
}

// createImageBitmap EXIF yonlendirmesini (rotation) dogru uygular; fallback <img>.
async function gorselOku(dosya: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(dosya, { imageOrientation: "from-image" });
    } catch {
      /* fallback asagida */
    }
  }

  return new Promise((coz, hata) => {
    const url = URL.createObjectURL(dosya);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      coz(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      hata(new Error("Fotoğraf okunamadı."));
    };
    img.src = url;
  });
}

// Insan okur boyut ("1,2 MB")
export function baytMetni(bayt: number): string {
  if (bayt < 1024) return `${bayt} B`;
  if (bayt < 1024 * 1024) return `${(bayt / 1024).toFixed(0)} KB`;
  return `${(bayt / (1024 * 1024)).toFixed(1)} MB`.replace(".", ",");
}
