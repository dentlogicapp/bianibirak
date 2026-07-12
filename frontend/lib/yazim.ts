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
//
// Uc yapi tutulur:
//   tum      : gercek kelimeler + turetimler. KELIME GECERLI MI sorusunu yanitlar.
//   gercek   : yalniz sozluk kelimeleri. ONERI havuzu budur - turetilmis kokler
//              ("mutlulug" gibi) davetliye ONERILMEZ, onlar yalniz ic esleme icin.
//   asciiHaritasi : "dugun" -> ["düğün"]. Turkce'de EN YAYGIN hata sapkasiz
//              yazimdir; harf harf mesafe hesabiyla "dugun"dan "düğün"e ulasmak
//              3 duzenleme gerektirir ve tavani asar. ASCII katlamayla mesafe SIFIR
//              olur - hata aninda ve KESIN olarak bulunur. Word'un fonetik
//              eslemesinin yaptigi is budur.
export type Sozluk = {
  tum: Set<string>;
  gercek: Set<string>;
  // TAM eslesme icin: yalniz gercek kelimeler ("dugun" -> "düğün")
  asciiGercek: Map<string, string[]>;
  // KOK eslesme icin: turetimler dahil. Unsuz yumusamasi ve unlu dusmesi
  // olmus kokler burada ("mutlulug" -> "mutluluğ", "omr" -> "ömr"); bunlar
  // tek baslarina kelime DEGILDIR ama cekimli kelimenin kokudur:
  //   "mutlulugunuz" -> kok "mutluluğ" + "unuz" -> "mutluluğunuz"
  asciiTum: Map<string, string[]>;
};

let _sozluk: Sozluk | null = null;
let _yukleniyor: Promise<Sozluk> | null = null;

export function sozlukHazirMi(): boolean {
  return _sozluk !== null;
}

// Turkce harfleri ASCII karsiligina katlar: "düğün" -> "dugun"
export function asciiKatla(k: string): string {
  return k
    .replace(/ı/g, "i")
    .replace(/İ/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c");
}

function onekCoz(bolum: string, hedef: Set<string>) {
  let onceki = "";
  for (const satir of bolum.split("\n")) {
    if (!satir) continue;
    const ortak = satir.charCodeAt(0) - 48;
    const kelime = onceki.slice(0, ortak) + satir.slice(1);
    hedef.add(kelime);
    onceki = kelime;
  }
}

export async function sozlukYukle(): Promise<Sozluk> {
  if (_sozluk) return _sozluk;
  if (_yukleniyor) return _yukleniyor;

  _yukleniyor = (async () => {
    const yanit = await fetch("/sozluk/tr.txt");
    const metin = await yanit.text();

    const [gercekBolum, turetimBolum] = metin.split("\n@@@\n");

    const gercek = new Set<string>();
    onekCoz(gercekBolum, gercek);

    const tum = new Set(gercek);
    if (turetimBolum) onekCoz(turetimBolum, tum);

    const haritaKur = (kaynak: Set<string>) => {
      const harita = new Map<string, string[]>();
      for (const k of kaynak) {
        const a = asciiKatla(k);
        if (a === k) continue; // Turkce harf yok - haritaya gerek yok
        const liste = harita.get(a);
        if (liste) liste.push(k);
        else harita.set(a, [k]);
      }
      return harita;
    };

    _sozluk = {
      tum,
      gercek,
      asciiGercek: haritaKur(gercek),
      asciiTum: haritaKur(tum),
    };
    return _sozluk;
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

function kelimeGecerli(kelime: string, sz: Sozluk): boolean {
  const k = kelime.toLocaleLowerCase("tr-TR");
  if (k.length <= 1) return true;
  if (sz.tum.has(k)) return true;

  for (let kesim = k.length - 1; kesim >= 2; kesim--) {
    if (sz.tum.has(k.slice(0, kesim)) && ekZinciri(k.slice(kesim))) return true;
  }
  return false;
}

// SAPKASIZ YAZIM COZUCU - "dugun" -> "düğün", "cocuklariniza" -> "çocuklarınıza"
//
// Turkce klavye kullanmayan ya da acele eden herkesin yaptigi hata. Harf-harf
// mesafeyle bulunmasi zordur ("dugun" -> "düğün" UC duzenleme), ASCII katlamayla
// KESIN bulunur.
//
// Ama kok yetmez: "cocuklariniza" cozulunce ekler de ASCII kalir ("çocuklariniza").
// Ekleri UNLU UYUMUNA gore yeniden uretiriz: kok kalin unluluyse kalin ek
// ("çocuk" + "lar" + "ınız" + "a"), inceyse ince ek ("düğün" + "ünüz" + "de").
const KALIN = "aıou";
const INCE = "eiöü";

function sonUnlu(k: string): string {
  for (let i = k.length - 1; i >= 0; i--) {
    if (KALIN.includes(k[i]) || INCE.includes(k[i])) return k[i];
  }
  return "";
}

function unluUyumlu(govde: string, ek: string): boolean {
  const g = sonUnlu(govde);
  const e = sonUnlu(ek);
  if (!g || !e) return true; // unlusuz ek ("n", "s", "y") her zaman uyar
  return (KALIN.includes(g) && KALIN.includes(e)) || (INCE.includes(g) && INCE.includes(e));
}

// ASCII ek zincirini gercek Turkce eklere cevirir (unlu uyumuna sadik)
function ekleriTurkcelestir(kok: string, asciiEkler: string): string | null {
  let sonuc = kok;
  let kalan = asciiEkler;
  let derinlik = 0;
  let sonEk: string | null = null;

  while (kalan.length > 0) {
    if (derinlik >= AZAMI_EK) return null;

    let bulundu = false;
    for (const ek of EKLER) {
      const ekAscii = asciiKatla(ek);
      if (!kalan.startsWith(ekAscii)) continue;
      if (ek === sonEk) continue;
      if (!unluUyumlu(sonuc, ek)) continue;

      sonuc += ek;
      kalan = kalan.slice(ekAscii.length);
      sonEk = ek;
      derinlik++;
      bulundu = true;
      break;
    }
    if (!bulundu) return null;
  }
  return sonuc;
}

function sapkasizCoz(kelime: string, sz: Sozluk): string | null {
  const k = kelime.toLocaleLowerCase("tr-TR");
  const a = asciiKatla(k);

  // Tam eslesme GERCEK kelimelerde aranir ("dugun" -> "düğün").
  // Turetimlerde aranmaz: "mutlulug" tek basina kelime degildir, oneri olamaz.
  const tam = sz.asciiGercek.get(a);
  if (tam && tam.length > 0) return tam[0];

  // Cekimli hal: kok TURETIMLERDE de aranir (unsuz yumusamasi/unlu dusmesi),
  // ekler unlu uyumuyla yeniden uretilir.
  //   "mutlulugunuz" -> kok "mutluluğ" + "unuz" -> "mutluluğunuz"
  //   "omrunuze"     -> kok "ömr"      + "ünüz" + "e" -> "ömrünüze"
  for (let kesim = a.length - 1; kesim >= 2; kesim--) {
    const adaylar = sz.asciiTum.get(a.slice(0, kesim));
    if (!adaylar || adaylar.length === 0) continue;

    const tamKelime = ekleriTurkcelestir(adaylar[0], a.slice(kesim));
    if (tamKelime) return tamKelime;
  }

  return null;
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

// TURKCE Q KLAVYE komsulugu - "zaman" yerine "zsman" yazmak, "a" yerine "s"ye
// basmaktir. Komsu harf hatasi, uzak harf hatasindan COK daha olasidir; oneriyi
// buna gore siralarsak Word'un yaptigi isi yapariz.
const KOMSU: Record<string, string> = {
  q: "wa", w: "qes", e: "wrd", r: "etf", t: "ryg", y: "tuh", u: "yij", i: "uok",
  o: "ipl", p: "oğ", ğ: "püp", ü: "ğ",
  a: "qsz", s: "awdx", d: "serfc", f: "drtgv", g: "ftyhb", h: "gyujn", j: "huikm",
  k: "jiol", l: "koşp", ş: "lİ", i̇: "ş",
  z: "asx", x: "zsdc", c: "xdfv", v: "cfgb", b: "vghn", n: "bhjm", m: "njö",
  ö: "mç", ç: "ö.",
  ı: "uo", ş2: "", ü2: "",
};

function komsuMu(a: string, b: string): boolean {
  return (KOMSU[a] ?? "").includes(b) || (KOMSU[b] ?? "").includes(a);
}

// Turkce'de sik karisan harf ciftleri - sapkasiz yazim en yaygin hatadir
const BENZER: [string, string][] = [
  ["i", "ı"], ["o", "ö"], ["u", "ü"], ["c", "ç"], ["s", "ş"], ["g", "ğ"],
];

function benzerMi(a: string, b: string): boolean {
  return BENZER.some(([x, y]) => (a === x && b === y) || (a === y && b === x));
}

// Oneri PUANI: dusuk = iyi.
// Edit mesafesi temeldir; ustune "hata TURU" cezasi eklenir. Boylece ayni
// mesafedeki adaylar arasinda EN OLASI hata one cikar:
//   "zman" -> "zaman" (harf dusmus)      : cok olasi
//   "zman" -> "iman"  (baska harf)       : az olasi
function oneriPuani(hatali: string, aday: string, mesafeDegeri: number): number {
  let puan = mesafeDegeri * 10;

  // Ayni harfle basliyorsa cok daha olasi (insan ilk harfi nadiren sasirir)
  if (hatali[0] !== aday[0]) {
    puan += benzerMi(hatali[0], aday[0]) ? 2 : 6;
  }

  // Uzunluk yakinligi
  puan += Math.abs(hatali.length - aday.length);

  // Ayni harflerden mi olusuyor? ("zmaan"/"zaman" - yalniz sira farkli)
  const harfle = (x: string) => x.split("").sort().join("");
  if (harfle(hatali) === harfle(aday)) puan -= 6;

  // Hatali kelime, adayin harflerinin ALT KUMESI mi? (harf dusurme - en sik hata)
  let i = 0;
  for (const c of aday) {
    if (i < hatali.length && hatali[i] === c) i++;
  }
  if (i === hatali.length) puan -= 5;

  // Klavye komsulugu: tek harf farkliysa ve komsuysa cok olasi
  if (hatali.length === aday.length) {
    let fark = 0;
    let komsuFark = 0;
    for (let j = 0; j < hatali.length; j++) {
      if (hatali[j] !== aday[j]) {
        fark++;
        if (komsuMu(hatali[j], aday[j]) || benzerMi(hatali[j], aday[j])) komsuFark++;
      }
    }
    if (fark > 0 && fark === komsuFark) puan -= 4;
  }

  return puan;
}

function oneriBul(kelime: string, sz: Sozluk, azami = 4): string[] {
  const k = kelime.toLocaleLowerCase("tr-TR");
  const tavan = k.length <= 4 ? 1 : 2;

  const adaylar: { kelime: string; puan: number }[] = [];

  // ONERI HAVUZU: yalniz GERCEK sozluk kelimeleri. Turetilmis kokler
  // ("mutlulug", "kalb") ic esleme icindir; davetliye ONERILMEZ.
  for (const aday of sz.gercek) {
    if (Math.abs(aday.length - k.length) > tavan) continue;

    // Hizli eleme: ilk iki harften biri tutmali (86k kelimeyi tek tek olcmek pahali)
    if (
      aday[0] !== k[0] &&
      aday[1] !== k[0] &&
      aday[0] !== k[1] &&
      !benzerMi(aday[0], k[0])
    ) {
      continue;
    }

    const d = mesafe(k, aday, tavan);
    if (d <= tavan) adaylar.push({ kelime: aday, puan: oneriPuani(k, aday, d) });
  }

  return adaylar
    .sort((a, b) => a.puan - b.puan || a.kelime.length - b.kelime.length)
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
export function yazimDenetle(metin: string, sz: Sozluk | null): Bulgu[] {
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
  if (sz) {
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

      if (kelimeGecerli(govde, sz)) continue;

      // SAPKASIZ YAZIM once denenir: kesin bir duzeltmedir, "bilinmeyen kelime"
      // belirsizligine dusurmeye gerek yok. ("dugun" -> "düğün")
      const sapkali = sapkasizCoz(govde, sz);
      if (sapkali && sapkali !== govde.toLocaleLowerCase("tr-TR")) {
        bulgular.push({
          tur: "yazim",
          baslangic: bas,
          bitis: bit,
          hatali: ham,
          dogru: buyukKoru(ham, sapkali),
          aciklama: "Türkçe karakter eksik",
        });
        continue;
      }

      bulgular.push({
        tur: "bilinmeyen",
        baslangic: bas,
        bitis: bit,
        hatali: ham,
        dogru: "",
        oneriler: oneriBul(govde, sz),
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

// ---------------- KURASYON ASISTANI ----------------
//
// STRATEJI: bir defterin degeri, dizginin kalitesinden DEGIL, iceriginin
// kalitesinden gelir. Kusursuz dizilmis "Mutluluklar dilerim" satirlari, bos bir
// defterdir. Rakipler sablon satabilir; IYI TOPLAMAYI satamaz.
//
// Bu yuzden davetliyi ZORLAMADAN derinlestirmeye davet ederiz. Ton: elestiri
// degil, DAVET. "Yetersiz" demeyiz; "bir kapi daha var" deriz.
//
// Kritik denge: davetli bogulursa hic yazmaz. Bu yuzden asistan yalniz ONERIR,
// asla ENGELLEMEZ - gonderim her zaman aciktir.

export type Davet = {
  seviye: "kisa" | "kalip" | "iyi" | "harika";
  baslik: string;
  metin: string;
  ipuclari: string[];
};

// Herkesin yazdigi kaliplar. Kotu degiller - ama YALNIZ bunlar varsa, defter
// kirk kez ayni cumleyi tasir ve hicbiri hatirlanmaz.
const KALIPLAR = [
  "mutluluklar", "tebrikler", "hayırlı olsun", "uğurlu olsun", "allah",
  "mutlu olun", "bir yastıkta", "nice yıllara", "tebrik ederim", "kutlarım",
  "başınız", "darısı",
];

export function daveti(mesaj: string): Davet | null {
  const m = mesaj.trim();
  if (m.length === 0) return null;

  const kelimeSayisi = m.split(/\s+/).filter((k) => k.length > 0).length;
  const kucuk = m.toLocaleLowerCase("tr-TR");

  // Cok kisa - henuz bir sey soylenmemis
  if (kelimeSayisi < 6) {
    return {
      seviye: "kisa",
      baslik: "Bir cümle daha?",
      metin:
        "Bu satır deftere girecek ve yıllar sonra okunacak. Onlarla bir anını hatırlıyor musun? Tek bir cümle bile bu sayfayı unutulmaz yapar.",
      ipuclari: [
        "Onları ilk nerede tanıdın?",
        "Birlikte güldüğünüz bir an",
        "Onlara ne dilersin?",
      ],
    };
  }

  // Kalip cumle - iyi niyetli ama herkesin yazdigi
  const kalipMi = KALIPLAR.some((k) => kucuk.includes(k));
  const kisiselIz = /\b(hatırl|ilk|birlikte|beraber|o gün|seninle|sizinle|bana|bize|zaman|yıl|okul|çocuk|tanı)/i.test(
    kucuk
  );

  if (kalipMi && !kisiselIz && kelimeSayisi < 20) {
    return {
      seviye: "kalip",
      baslik: "Sadece sana ait bir şey ekle",
      metin:
        "Güzel bir dilek. Ama defterde bunun gibi onlarca satır olacak. Seni ayıran şey, senin hatıran - bir anı, bir söz, bir görüntü.",
      ipuclari: [
        "Aklına gelen ilk anıyı yaz",
        "Onlarda en sevdiğin şey",
        "Yıllar sonra hatırlamalarını istediğin an",
      ],
    };
  }

  // Kisisel iz var ve yeterince uzun - bu iyi bir dilek
  if (kisiselIz && kelimeSayisi >= 15) {
    return {
      seviye: "harika",
      baslik: "İşte bu deftere değer",
      metin:
        "Kendinden bir şey bıraktın. Bu satırlar yıllar sonra okunduğunda seni hatırlatacak.",
      ipuclari: [],
    };
  }

  if (kelimeSayisi >= 12) {
    return {
      seviye: "iyi",
      baslik: "Güzel oluyor",
      metin: "İstersen bir anı ekleyerek bunu daha da kişisel yapabilirsin.",
      ipuclari: [],
    };
  }

  return null;
}
