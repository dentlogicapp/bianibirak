// TURKCE YAZIM DENETIMI
//
// TASARIM: sunucuya gitmez, tarayicida calisir - anlik, ucretsiz, gizli.
// Davetli yazarken hicbir gecikme hissetmez.
//
// NEDEN GEREKLI: bu metin BASILACAK. Kagida gecen bir yazim hatasi sonsuza kadar
// orada kalir. Ama davetliyi de bogmayiz: denetim ONERIR, dayatmaz.
//
// KAPSAM:
//  1. TDK yazim hatalari (yalnis -> yanlis, herkez -> herkes, ...)
//  2. Bitisik/ayri yazim (hic bir -> hicbir, bir cok -> bircok, ...)
//  3. Noktalama (cift bosluk, noktalama oncesi bosluk, ...)
//  4. Buyuk harf (cumle basi, ozel ad)
//  5. Uygunsuz icerik (cifte utanc yasatacak ifadeler)

export type Bulgu = {
  tur: "yazim" | "noktalama" | "buyukharf" | "uygunsuz";
  baslangic: number;
  bitis: number;
  hatali: string;
  dogru: string;
  aciklama: string;
};

// ---- 1. TDK YAZIM HATALARI ----
// En sik yapilan hatalar. Sol taraf hatali, sag taraf dogru.
const YAZIM_SOZLUGU: Record<string, string> = {
  // Ses/harf hatalari
  yalnis: "yanlış",
  yanliz: "yalnız",
  yanlız: "yalnız",
  herkez: "herkes",
  herkeze: "herkese",
  hersey: "her şey",
  herşey: "her şey",
  herşeyi: "her şeyi",
  herşeye: "her şeye",
  herzaman: "her zaman",
  birsey: "bir şey",
  birşey: "bir şey",
  birşeyi: "bir şeyi",
  birşeyler: "bir şeyler",
  herşeyin: "her şeyin",

  // Bitisik/ayri yazim (TDK)
  "hiç bir": "hiçbir",
  "hiç birşey": "hiçbir şey",
  "hiçbirşey": "hiçbir şey",
  "her hangi": "herhangi",
  "bir kaç": "birkaç",
  "bir çok": "birçok",
  "bir birine": "birbirine",
  "bir birimize": "birbirimize",
  "bir birinize": "birbirinize",

  // Ayri yazilmasi gerekenler
  yada: "ya da",
  vede: "ve de",
  yanısıra: "yanı sıra",
  hertürlü: "her türlü",

  // Yumusama / sapka
  deil: "değil",
  degil: "değil",
  dugun: "düğün",
  dügün: "düğün",
  tesekkur: "teşekkür",
  tesekkurler: "teşekkürler",
  tesekkurlerimle: "teşekkürlerimle",
  saglık: "sağlık",
  saglıklı: "sağlıklı",
  mutluluk: "mutluluk",
  ugurlu: "uğurlu",
  hayirli: "hayırlı",
  omur: "ömür",
  omurboyu: "ömür boyu",
  insaallah: "inşallah",
  inşaallah: "inşallah",
  maşallah: "maşallah",
  masallah: "maşallah",
  suphesiz: "şüphesiz",
  yillar: "yıllar",
  yillara: "yıllara",
  mutlulugunuz: "mutluluğunuz",
  mutlulugunuza: "mutluluğunuza",
  agabey: "ağabey",
  guzel: "güzel",
  omrunuz: "ömrünüz",
};

// ---- 2. UYGUNSUZ ICERIK ----
// Cifte utanc yasatacak, defterde kalici olmamasi gereken ifadeler.
// Liste kasten SADE tutuldu: asiri filtre samimi dili de bogar.
const UYGUNSUZ = [
  "aptal", "salak", "gerizekalı", "geri zekalı", "mal", "aq", "amk", "oç",
  "orospu", "piç", "yavşak", "şerefsiz", "pezevenk", "sik", "amına", "siktir",
  "gavat", "ibne", "puşt",
];

// ---- DENETIM ----
export function yazimDenetle(metin: string): Bulgu[] {
  const bulgular: Bulgu[] = [];
  if (!metin || metin.trim().length < 2) return bulgular;

  // 1) Sozluk taramasi (kelime siniri ile - "de" icinde "de" yakalanmasin)
  for (const [hatali, dogru] of Object.entries(YAZIM_SOZLUGU)) {
    if (hatali === dogru) continue;

    const desen = new RegExp(
      `(^|[^\\p{L}])(${kacir(hatali)})(?=$|[^\\p{L}])`,
      "giu"
    );
    let e: RegExpExecArray | null;
    while ((e = desen.exec(metin)) !== null) {
      const bas = e.index + e[1].length;
      bulgular.push({
        tur: "yazim",
        baslangic: bas,
        bitis: bas + e[2].length,
        hatali: e[2],
        dogru: buyukKoru(e[2], dogru),
        aciklama: "Yazım hatası",
      });
      if (desen.lastIndex === e.index) desen.lastIndex++;
    }
  }

  // 2) Cift (ve fazla) bosluk
  const ciftBosluk = /  +/g;
  let cb: RegExpExecArray | null;
  while ((cb = ciftBosluk.exec(metin)) !== null) {
    bulgular.push({
      tur: "noktalama",
      baslangic: cb.index,
      bitis: cb.index + cb[0].length,
      hatali: cb[0],
      dogru: " ",
      aciklama: "Fazla boşluk",
    });
  }

  // 3) Noktalama oncesi bosluk ("merhaba ." -> "merhaba.")
  const noktaOncesi = /\s+([,.;:!?])/g;
  let no: RegExpExecArray | null;
  while ((no = noktaOncesi.exec(metin)) !== null) {
    bulgular.push({
      tur: "noktalama",
      baslangic: no.index,
      bitis: no.index + no[0].length,
      hatali: no[0],
      dogru: no[1],
      aciklama: "Noktalama işaretinden önce boşluk olmaz",
    });
  }

  // 4) Noktalama sonrasi bosluk yoklugu ("merhaba,nasilsin" -> "merhaba, nasilsin")
  const noktaSonrasi = /([,;:])(\p{L})/gu;
  let ns: RegExpExecArray | null;
  while ((ns = noktaSonrasi.exec(metin)) !== null) {
    bulgular.push({
      tur: "noktalama",
      baslangic: ns.index,
      bitis: ns.index + ns[0].length,
      hatali: ns[0],
      dogru: `${ns[1]} ${ns[2]}`,
      aciklama: "Noktalama işaretinden sonra boşluk gerekir",
    });
  }

  // 5) Cumle basi buyuk harf
  const cumleBasi = /(^|[.!?]\s+)(\p{Ll})/gu;
  let cbh: RegExpExecArray | null;
  while ((cbh = cumleBasi.exec(metin)) !== null) {
    const konum = cbh.index + cbh[1].length;
    bulgular.push({
      tur: "buyukharf",
      baslangic: konum,
      bitis: konum + 1,
      hatali: cbh[2],
      dogru: cbh[2].toLocaleUpperCase("tr-TR"),
      aciklama: "Cümle büyük harfle başlar",
    });
  }

  // 6) Uygunsuz icerik
  for (const kelime of UYGUNSUZ) {
    const desen = new RegExp(`(^|[^\\p{L}])(${kacir(kelime)})(?=$|[^\\p{L}])`, "giu");
    let u: RegExpExecArray | null;
    while ((u = desen.exec(metin)) !== null) {
      const bas = u.index + u[1].length;
      bulgular.push({
        tur: "uygunsuz",
        baslangic: bas,
        bitis: bas + u[2].length,
        hatali: u[2],
        dogru: "",
        aciklama: "Bu ifade deftere basılacak - emin misin?",
      });
      if (desen.lastIndex === u.index) desen.lastIndex++;
    }
  }

  // Konuma gore sirala; ayni konumda UZUN olan once (kelime > tek harf)
  bulgular.sort((a, b) =>
    a.baslangic !== b.baslangic
      ? a.baslangic - b.baslangic
      : b.bitis - b.baslangic - (a.bitis - a.baslangic)
  );

  // CAKISMA COZUMU: bir kelime hem yazim hatasi hem cumle basi olabilir
  // ("hayirli olsun" -> "Hayırlı olsun"). Iki ayri bulgu gostermek yerine
  // yazim duzeltmesini buyuk harfle baslatir, cumle-basi bulgusunu duseriz.
  const temiz: Bulgu[] = [];
  let sonBitis = -1;

  for (const b of bulgular) {
    if (b.baslangic >= sonBitis) {
      temiz.push(b);
      sonBitis = b.bitis;
      continue;
    }

    // Bu bulgu bir oncekinin icinde kaliyor
    const onceki = temiz[temiz.length - 1];
    if (
      b.tur === "buyukharf" &&
      onceki &&
      onceki.tur === "yazim" &&
      b.baslangic === onceki.baslangic
    ) {
      onceki.dogru =
        onceki.dogru.charAt(0).toLocaleUpperCase("tr-TR") + onceki.dogru.slice(1);
    }
  }
  return temiz;
}

// Tek bulguyu uygula (konum kaymasi olmadan)
export function bulguyuUygula(metin: string, bulgu: Bulgu): string {
  return metin.slice(0, bulgu.baslangic) + bulgu.dogru + metin.slice(bulgu.bitis);
}

// Tumunu uygula - SONDAN basa (onceki duzeltme sonraki konumlari kaydirmasin)
export function tumunuUygula(metin: string, bulgular: Bulgu[]): string {
  const uygulanabilir = bulgular
    .filter((b) => b.tur !== "uygunsuz") // uygunsuz icerik OTOMATIK silinmez - davetli karar verir
    .sort((a, b) => b.baslangic - a.baslangic);

  let sonuc = metin;
  for (const b of uygulanabilir) {
    sonuc = sonuc.slice(0, b.baslangic) + b.dogru + sonuc.slice(b.bitis);
  }
  return sonuc;
}

function kacir(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// "Yanlis" -> "Yanlış" (ilk harf buyukse duzeltmede de buyuk kalsin)
function buyukKoru(kaynak: string, dogru: string): string {
  if (kaynak.length === 0) return dogru;
  const ilk = kaynak[0];
  if (ilk === ilk.toLocaleUpperCase("tr-TR") && ilk !== ilk.toLocaleLowerCase("tr-TR")) {
    return dogru.charAt(0).toLocaleUpperCase("tr-TR") + dogru.slice(1);
  }
  return dogru;
}
