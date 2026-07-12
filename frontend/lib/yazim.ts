// TURKCE YAZIM DENETIMI - sozluk + morfoloji tabanli.
//
// NEDEN BU KADAR CIDDIYE ALINIYOR: bu metin BASILACAK. Kagida gecen bir hata
// sonsuza kadar orada kalir. Ama davetliyi de bogmayiz: denetim ONERIR, dayatmaz.
//
// MIMARI:
//  1. SOZLUK (86.689 kelime) - tarayiciya LAZY yuklenir (~100 KB gzip), sonra
//     tamamen yerelde calisir: sifir gecikme, sifir sunucu maliyeti, offline.
//     Turetimler: mastar soyma (bilmek -> bil), unsuz yumusamasi (kalp -> kalb),
//     unlu dusmesi (omur -> omr; yalniz BILINEN kelimeler - genel kural olarak
//     uygulanirsa "mutluluk -> mutlulk" gibi sahte kokler uretir).
//
//  2. EK COZUMLEYICI - Turkce sondan eklemelidir; "cocuklariniza" sozlukte YOKTUR.
//     Kelime = kok + ek zinciri olarak cozulur. Ardisik ayni ek YASAK (yoksa
//     "alalalala" gecerli sayilir), zincir en fazla 4 ek.
//
//  3. ONERI - Damerau-Levenshtein: harf degistirme/ekleme/silme + YER DEGISTIRME.
//     Yer degistirme sart: klavyede en sik hata budur ("zmaan" -> "zaman").
//
// Bu uclu "zman", "blmym", "mutlulk" gibi kelimeleri yakalar; "cocuklariniza",
// "yasayacaksiniz" gibi tamamen gecerli cekimleri yanlis alarma DUSURMEZ.

export type Bulgu = {
  tur: "yazim" | "bilinmeyen" | "noktalama" | "buyukharf" | "uygunsuz";
  baslangic: number;
  bitis: number;
  hatali: string;
  dogru: string;
  oneriler?: string[];
  aciklama: string;
};

// ---------------- SOZLUK (lazy) ----------------
let _sozluk: Set<string> | null = null;
let _yukleniyor: Promise<Set<string>> | null = null;

export function sozlukHazirMi(): boolean {
  return _sozluk !== null;
}

export async function sozlukYukle(): Promise<Set<string>> {
  if (_sozluk) return _sozluk;
  if (_yukleniyor) return _yukleniyor;

  _yukleniyor = (async () => {
    const yanit = await fetch("/sozluk/tr.txt");
    const metin = await yanit.text();

    // Onek sikistirmasi cozulur: her satirin ilk karakteri, onceki kelimeyle
    // ortak onek uzunlugudur (dosya boylece yariya iner).
    const kume = new Set<string>();
    let onceki = "";
    for (const satir of metin.split("\n")) {
      if (!satir) continue;
      const ortak = satir.charCodeAt(0) - 48;
      const kelime = onceki.slice(0, ortak) + satir.slice(1);
      kume.add(kelime);
      onceki = kelime;
    }
    _sozluk = kume;
    return kume;
  })();

  return _yukleniyor;
}

// ---------------- EK COZUMLEYICI ----------------
const EKLER = [
  "siniz", "sınız", "sunuz", "sünüz", "yecek", "yacak", "miyor", "mıyor", "muyor",
  "müyor", "imiz", "ımız", "umuz", "ümüz", "iniz", "ınız", "unuz", "ünüz", "leri",
  "ları", "ecek", "acak", "iyor", "ıyor", "uyor", "üyor", "meli", "malı", "ince",
  "ınca", "unca", "ünce", "erek", "arak", "miz", "mız", "muz", "müz", "niz", "nız",
  "nuz", "nüz", "sin", "sın", "sun", "sün", "nin", "nın", "nun", "nün", "den", "dan",
  "ten", "tan", "lik", "lık", "luk", "lük", "siz", "sız", "suz", "süz", "miş", "mış",
  "muş", "müş", "mek", "mak", "tir", "tır", "tur", "tür", "dir", "dır", "dur", "dür",
  "dik", "dık", "duk", "dük", "tik", "tık", "tuk", "tük", "ler", "lar", "ken", "yle",
  "yla", "ile", "yiz", "yız", "yuz", "yüz", "de", "da", "te", "ta", "le", "la", "in",
  "ın", "un", "ün", "im", "ım", "um", "üm", "iz", "ız", "uz", "üz", "li", "lı", "lu",
  "lü", "ci", "cı", "cu", "cü", "çi", "çı", "çu", "çü", "ce", "ca", "çe", "ça", "ki",
  "di", "dı", "du", "dü", "ti", "tı", "tu", "tü", "se", "sa", "me", "ma", "ye", "ya",
  "yi", "yı", "yu", "yü", "ip", "ıp", "up", "üp", "ne", "na", "ni", "nı", "nu", "nü",
  "e", "a", "i", "ı", "u", "ü", "n", "s", "y",
];

const AZAMI_EK = 4;

function ekZinciri(kalan: string, derinlik = 0, sonEk: string | null = null): boolean {
  if (!kalan) return true;
  if (derinlik >= AZAMI_EK) return false;

  for (const ek of EKLER) {
    if (!kalan.startsWith(ek)) continue;
    if (ek === sonEk) continue; // ardisik ayni ek YASAK: "la"+"la"+"la"
    if (ekZinciri(kalan.slice(ek.length), derinlik + 1, ek)) return true;
  }
  return false;
}

function kelimeGecerli(kelime: string, sozluk: Set<string>): boolean {
  const k = kelime.toLocaleLowerCase("tr-TR");
  if (k.length <= 1) return true;
  if (sozluk.has(k)) return true;

  for (let kesim = k.length - 1; kesim >= 2; kesim--) {
    if (sozluk.has(k.slice(0, kesim)) && ekZinciri(k.slice(kesim))) return true;
  }
  return false;
}

// ---------------- ONERI (Damerau-Levenshtein) ----------------
function mesafe(a: string, b: string, tavan: number): number {
  const m = a.length;
  const n = b.length;
  if (Math.abs(m - n) > tavan) return tavan + 1;

  let onceki2: number[] = [];
  let onceki: number[] = Array.from({ length: n + 1 }, (_, j) => j);
  let simdi: number[] = new Array(n + 1);

  for (let i = 1; i <= m; i++) {
    simdi[0] = i;
    let satirEnAz = i;

    for (let j = 1; j <= n; j++) {
      const bedel = a[i - 1] === b[j - 1] ? 0 : 1;
      let d = Math.min(simdi[j - 1] + 1, onceki[j] + 1, onceki[j - 1] + bedel);

      // Yer degistirme: "zmaan" -> "zaman"
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d = Math.min(d, (onceki2[j - 2] ?? tavan + 1) + 1);
      }
      simdi[j] = d;
      if (d < satirEnAz) satirEnAz = d;
    }

    if (satirEnAz > tavan) return tavan + 1;

    onceki2 = onceki;
    onceki = simdi;
    simdi = new Array(n + 1);
  }
  return onceki[n];
}

function oneriBul(kelime: string, sozluk: Set<string>, azami = 3): string[] {
  const k = kelime.toLocaleLowerCase("tr-TR");
  const tavan = k.length <= 4 ? 1 : 2;

  const adaylar: { kelime: string; d: number }[] = [];

  for (const aday of sozluk) {
    // Hizli eleme (86k kelimeyi tek tek olcmek pahali olurdu)
    if (Math.abs(aday.length - k.length) > tavan) continue;
    if (aday[0] !== k[0] && aday[1] !== k[0] && aday[0] !== k[1]) continue;

    const d = mesafe(k, aday, tavan);
    if (d <= tavan) adaylar.push({ kelime: aday, d });
  }

  return adaylar
    .sort((a, b) => a.d - b.d || a.kelime.length - b.kelime.length)
    .slice(0, azami)
    .map((a) => a.kelime);
}

// ---------------- SIK YAPILAN HATALAR ----------------
// Bunlar sozlukte GECERLI gorunebilir ama TDK'ya gore yanlistir.
const SIK_HATALAR: Record<string, string> = {
  yalnis: "yanlış",
  yanliz: "yalnız",
  yanlız: "yalnız",
  herkez: "herkes",
  herkeze: "herkese",
  herşey: "her şey",
  herşeyi: "her şeyi",
  herşeye: "her şeye",
  herşeyin: "her şeyin",
  hersey: "her şey",
  birşey: "bir şey",
  birşeyi: "bir şeyi",
  birsey: "bir şey",
  herzaman: "her zaman",
  hiçbirşey: "hiçbir şey",
  yada: "ya da",
  vede: "ve de",
  "hiç bir": "hiçbir",
  "her hangi": "herhangi",
  "bir kaç": "birkaç",
  "bir çok": "birçok",
  "bir birine": "birbirine",
  "bir birimize": "birbirimize",
  "bir birinize": "birbirinize",
  inşaallah: "inşallah",
};

const UYGUNSUZ = [
  "aptal", "salak", "gerizekalı", "geri zekalı", "aq", "amk", "oç", "orospu",
  "piç", "yavşak", "şerefsiz", "pezevenk", "amına", "siktir", "gavat", "ibne",
  "puşt",
];

// ---------------- ANA DENETIM ----------------
export function yazimDenetle(metin: string, sozluk: Set<string> | null): Bulgu[] {
  const bulgular: Bulgu[] = [];
  if (!metin || metin.trim().length < 2) return bulgular;

  // 1) Sik yapilan hatalar (cok kelimeli kaliplar dahil)
  for (const [hatali, dogru] of Object.entries(SIK_HATALAR)) {
    const desen = new RegExp(`(^|[^\\p{L}])(${kacir(hatali)})(?=$|[^\\p{L}])`, "giu");
    let e: RegExpExecArray | null;
    while ((e = desen.exec(metin)) !== null) {
      const bas = e.index + e[1].length;
      bulgular.push({
        tur: "yazim",
        baslangic: bas,
        bitis: bas + e[2].length,
        hatali: e[2],
        dogru: buyukKoru(e[2], dogru),
        aciklama: "Yazım kuralı",
      });
      if (desen.lastIndex === e.index) desen.lastIndex++;
    }
  }

  // 2) SOZLUK DENETIMI - eksik/uydurma kelimeler ("zman", "blmym", "mutlulk")
  if (sozluk) {
    const kelimeDeseni = /\p{L}[\p{L}'’]*/gu;
    let k: RegExpExecArray | null;

    while ((k = kelimeDeseni.exec(metin)) !== null) {
      const ham = k[0];
      const bas = k.index;
      const bit = bas + ham.length;

      if (bulgular.some((b) => bas < b.bitis && bit > b.baslangic)) continue;

      const govde = ham.split(/['’]/)[0];
      if (govde.length <= 1) continue;

      // Buyuk harfle basliyorsa ozel ad olabilir (isim/yer) - sozlukte olmasa
      // bile SUSARIZ. Yanlis alarm davetliyi bogar, guveni kirar.
      const ilk = govde[0];
      if (
        ilk === ilk.toLocaleUpperCase("tr-TR") &&
        ilk !== ilk.toLocaleLowerCase("tr-TR")
      ) {
        continue;
      }

      if (kelimeGecerli(govde, sozluk)) continue;

      bulgular.push({
        tur: "bilinmeyen",
        baslangic: bas,
        bitis: bit,
        hatali: ham,
        dogru: "",
        oneriler: oneriBul(govde, sozluk),
        aciklama: "Bu kelimeyi tanımıyorum",
      });
    }
  }

  // 3) Noktalama
  let m: RegExpExecArray | null;

  const ciftBosluk = /  +/g;
  while ((m = ciftBosluk.exec(metin)) !== null) {
    bulgular.push({
      tur: "noktalama",
      baslangic: m.index,
      bitis: m.index + m[0].length,
      hatali: "çift boşluk",
      dogru: " ",
      aciklama: "Fazla boşluk",
    });
  }

  const noktaOncesi = /\s+([,.;:!?])/g;
  while ((m = noktaOncesi.exec(metin)) !== null) {
    bulgular.push({
      tur: "noktalama",
      baslangic: m.index,
      bitis: m.index + m[0].length,
      hatali: `boşluk ${m[1]}`,
      dogru: m[1],
      aciklama: "Noktalamadan önce boşluk olmaz",
    });
  }

  const noktaSonrasi = /([,;:])(\p{L})/gu;
  while ((m = noktaSonrasi.exec(metin)) !== null) {
    bulgular.push({
      tur: "noktalama",
      baslangic: m.index,
      bitis: m.index + m[0].length,
      hatali: m[0],
      dogru: `${m[1]} ${m[2]}`,
      aciklama: "Noktalamadan sonra boşluk gerekir",
    });
  }

  // 4) Cumle basi buyuk harf
  const cumleBasi = /(^|[.!?]\s+)(\p{Ll})/gu;
  while ((m = cumleBasi.exec(metin)) !== null) {
    const konum = m.index + m[1].length;
    bulgular.push({
      tur: "buyukharf",
      baslangic: konum,
      bitis: konum + 1,
      hatali: m[2],
      dogru: m[2].toLocaleUpperCase("tr-TR"),
      aciklama: "Cümle büyük harfle başlar",
    });
  }

  // 5) Uygunsuz icerik
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
        aciklama: "Bu ifade deftere basılacak",
      });
      if (desen.lastIndex === u.index) desen.lastIndex++;
    }
  }

  return cakismalariCoz(bulgular);
}

// Ayni kelime hem yazim hatasi hem cumle basi olabilir ("hayirli olsun").
// Iki ayri oneri gostermek yerine duzeltmeyi buyuk harfle baslatiriz.
function cakismalariCoz(ham: Bulgu[]): Bulgu[] {
  ham.sort((a, b) =>
    a.baslangic !== b.baslangic
      ? a.baslangic - b.baslangic
      : b.bitis - b.baslangic - (a.bitis - a.baslangic)
  );

  const temiz: Bulgu[] = [];
  let sonBitis = -1;

  for (const b of ham) {
    if (b.baslangic >= sonBitis) {
      temiz.push(b);
      sonBitis = b.bitis;
      continue;
    }

    const onceki = temiz[temiz.length - 1];
    if (b.tur === "buyukharf" && onceki?.baslangic === b.baslangic && onceki.dogru) {
      onceki.dogru =
        onceki.dogru.charAt(0).toLocaleUpperCase("tr-TR") + onceki.dogru.slice(1);
    }
  }
  return temiz;
}

// ---------------- UYGULAMA ----------------
export function bulguyuUygula(metin: string, bulgu: Bulgu, secilen?: string): string {
  const yerine = secilen ?? bulgu.dogru;
  if (!yerine) return metin;
  return metin.slice(0, bulgu.baslangic) + yerine + metin.slice(bulgu.bitis);
}

// SONDAN basa uygula (onceki duzeltme sonraki konumlari kaydirmasin).
// Bilinmeyen kelime ve uygunsuz ifade OTOMATIK degistirilmez: karar davetlinindir
// (ozel ad olabilir, kasitli olabilir).
export function tumunuUygula(metin: string, bulgular: Bulgu[]): string {
  const uygulanabilir = bulgular
    .filter((b) => b.dogru && b.tur !== "uygunsuz" && b.tur !== "bilinmeyen")
    .sort((a, b) => b.baslangic - a.baslangic);

  let sonuc = metin;
  for (const b of uygulanabilir) {
    sonuc = sonuc.slice(0, b.baslangic) + b.dogru + sonuc.slice(b.bitis);
  }
  return sonuc;
}

// Duzeltilebilir bulgular (otomatik uygulanabilenler)
export function duzeltilebilir(bulgular: Bulgu[]): Bulgu[] {
  return bulgular.filter(
    (b) => b.dogru && b.tur !== "uygunsuz" && b.tur !== "bilinmeyen"
  );
}

function kacir(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buyukKoru(kaynak: string, dogru: string): string {
  if (!kaynak) return dogru;
  const ilk = kaynak[0];
  if (
    ilk === ilk.toLocaleUpperCase("tr-TR") &&
    ilk !== ilk.toLocaleLowerCase("tr-TR")
  ) {
    return dogru.charAt(0).toLocaleUpperCase("tr-TR") + dogru.slice(1);
  }
  return dogru;
}
