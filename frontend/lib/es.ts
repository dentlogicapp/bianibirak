// Kaynak es etiketi: "1. es"/"2. es" demode; yerine "Aysegul'un yakini" gibi.
// es1 -> es1 adinin yakini, es2 -> es2 adinin yakini.
export function esYakiniEtiketi(kaynakEs: string, es1Ad: string, es2Ad: string): string {
  const ad = kaynakEs === "es1" ? es1Ad : es2Ad;
  return `${ad} tarafının yakını`;
}

// Kisa hali (kart rozeti): "Ayseg. tarafi"
export function esTarafiKisa(kaynakEs: string, es1Ad: string, es2Ad: string): string {
  const ad = kaynakEs === "es1" ? es1Ad : es2Ad;
  return `${ad} tarafı`;
}

// TURKCE IYELIK EKI - "Musa'nin", "Aysegul'un", "Zeynep'in"
//
// Kural: son UNLU harfe gore ek secilir (buyuk unlu uyumu).
//   a, i(noktasiz) -> in    |  e, i -> in   |  o, u -> un   |  o(noktali), u(noktali) -> un
// Ad UNLU ile bitiyorsa araya kaynastirma "n" girer: Musa -> Musa'nin
// Kesme isareti ozel adlarda zorunludur (TDK).
export function iyelikEki(ad: string): string {
  const temiz = (ad ?? "").trim();
  if (temiz.length === 0) return "";

  const unluler = "aeıioöuüAEIİOÖUÜ";
  const kucuk = temiz.toLocaleLowerCase("tr-TR");

  // Sondan ilk unluyu bul
  let sonUnlu = "";
  for (let i = kucuk.length - 1; i >= 0; i--) {
    if (unluler.includes(kucuk[i])) {
      sonUnlu = kucuk[i];
      break;
    }
  }

  // Buyuk unlu uyumu: son unlu eki belirler
  let ek = "ın";
  if (sonUnlu === "e" || sonUnlu === "i") ek = "in";
  else if (sonUnlu === "o" || sonUnlu === "u") ek = "un";
  else if (sonUnlu === "ö" || sonUnlu === "ü") ek = "ün";

  // Ad unlu ile bitiyorsa kaynastirma "n"
  const sonHarf = kucuk[kucuk.length - 1];
  const kaynastirma = unluler.includes(sonHarf) ? "n" : "";

  return `${temiz}'${kaynastirma}${ek}`;
}

// "Musa ile" / "Aysegul ile" - yalin hal (ek gerektirmeyen kaliplarda)
export function ileKalibi(ad: string): string {
  return `${(ad ?? "").trim()} ile`;
}

// ILISKI METNI - deftere basilacak son hal.
//
// SORUN: davetli kendini serbestce tanimlayabiliyor. "Universiteden sinif arkadasi"
// yazdiginda defterde SADECE bu gorunuyordu - kimin sinif arkadasi? Defter butunlugu
// bozuluyordu. Ama davetli "Musa'nin cocukluk arkadasi" yazdiysa basa bir kez daha
// "Musa'nin" eklemek de sacma olurdu.
//
// COZUM: metin esin adini ZATEN iceriyor mu diye bakariz.
//   iceriyor  -> davetlinin cumlesi AYNEN korunur (o daha iyi biliyor)
//   icermiyor -> basa iyelikli ad eklenir ("Musa'nin universiteden sinif arkadasi")
//
// Ek incelik: onek eklenince ilk kelime kucuk harfe duser - Turkce tamlamada dogru
// olan budur ("Musa'nin universiteden..."). Ama OZEL AD ise buyuk kalir: kesme
// isareti tasiyan kelimeler ("Ankara'dan") ozel addir, ellenmez.
export function iliskiMetniKur(esAd: string, serbestMetin: string): string {
  const metin = (serbestMetin ?? "").trim();
  if (metin.length === 0) return "";

  const ad = (esAd ?? "").trim();
  if (ad.length === 0) return metin;

  const iyelikli = iyelikEki(ad); // "Musa'nın"

  // 1) Metin ZATEN iyelikli adi iceriyor mu? ("Musa'nın okul arkadaşı")
  //    -> Davetli dogru yazmis, dokunma.
  if (icerirMi(metin, iyelikli)) return metin;

  // 2) Vasita hali var mi? ("Musa ile aynı mahallede büyüdük")
  //    -> Bu da dogru bir Turkce kurulum, dokunma.
  if (icerirMi(metin, `${ad} ile`)) return metin;

  // 3) Es adi CIPLAK geciyor mu? ("Musa okul arkadaşı")
  //    -> Ad dogru ama IYELIK EKI eksik. Adi iyelikli haliyle DEGISTIRIRIZ:
  //       "Musa okul arkadaşı" -> "Musa'nın okul arkadaşı"
  //    Deftere ek almadan girmesi, defterin dil butunlugunu bozar.
  const ciplak = new RegExp(`(^|[^\\p{L}])(${kacir(ad)})(?=$|[^\\p{L}'\u2019])`, "iu");
  const e = ciplak.exec(metin);
  if (e) {
    const bas = e.index + e[1].length;
    return metin.slice(0, bas) + iyelikli + metin.slice(bas + e[2].length);
  }

  // 4) Es adi hic gecmiyor -> basa iyelikli ad eklenir.
  //    Ilk kelime kucuk harfe duser (Turkce tamlamada dogru olan bu), ama OZEL AD
  //    ise buyuk kalir: kesme isareti tasiyan kelimeler ("Ankara'dan") ozel addir.
  const parcalar = metin.split(" ");
  const ilk = parcalar[0];
  const ozelAd = ilk.includes("'") || ilk.includes("\u2019");

  if (!ozelAd && ilk.length > 0) {
    parcalar[0] = ilk.charAt(0).toLocaleLowerCase("tr-TR") + ilk.slice(1);
  }

  return `${iyelikli} ${parcalar.join(" ")}`;
}

// Kelime siniriyla arar: "Musa" ararken "Musafir" eslesmesin.
function icerirMi(metin: string, aranan: string): boolean {
  const desen = new RegExp(`(^|[^\\p{L}])${kacir(aranan)}(?=$|[^\\p{L}])`, "iu");
  return desen.test(metin);
}

function kacir(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
