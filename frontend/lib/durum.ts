// GIRDI TIPI: hem Etkinlik hem SuperDefter kabul edilir. Ikisi de ayni ALANLARI
// tasir; evre hesabi icin gereken yalnizca bu alanlardir. Boylece kullanici ekrani
// ile yonetici ekrani AYNI fonksiyondan beslenir - iki farkli cumle olusamaz.
export type EvreGirdisi = {
  tur: string;
  etkinlik_tarihi: string;
  kapanis_tarihi: string;
  imha_tarihi: string;
  imha_edildi: boolean;
  donduruldu: boolean;
};

// DEFTER EVRESI - "hazirlik" kalintisinin yerine gecen CANLI durum.
//
// ESKI HALI NEDEN YANLISTI: Etkinlik.Durum, defter kurulurken "hazirlik" olarak
// yaziliyor ve BIR DAHA HIC DEGISMIYORDU. Sonuc: dugunu gecmis, dilekleri toplanmis,
// imhasina uc gun kalmis bir defter de ekranda "Hazirlik" yaziyordu. Rozet bilgi
// tasimiyor, sadece yer kapliyordu.
//
// YENI HALI: evre TARIHLERDEN TURETILIR. Saklanan bir durum yoktur; dolayisiyla
// gercekle ARASI ACILAMAZ. Tek kaynak burasidir - liste, baslik ve super panel
// ayni fonksiyonu cagirir, uc yerde uc farkli cumle olusmaz.
//
// EVRELER:
//   donduruldu  - super admin durdurdu (her seyin onunde gelir)
//   imha        - suresi doldu, veri yok
//   toplaniyor  - ozel gun gelmedi; davetliler yaziyor
//   son-gunler  - ozel gun gecti, toplama hala acik ama kapanis yaklasti
//   indirme     - toplama kapandi; TEK IS: indir (en kritik evre)
//   sonlaniyor  - imhaya saatler kaldi
export type Evre =
  | "donduruldu"
  | "imha"
  | "toplaniyor"
  | "son-gunler"
  | "indirme"
  | "sonlaniyor";

export type DefterDurum = {
  evre: Evre;
  /** Kisa rozet metni - listede/baslikta gorunur. */
  etiket: string;
  /** Bir cumlelik aciklama - "simdi ne oluyor?" */
  aciklama: string;
  /** Aciliyet: gorsel ton secimi icin. */
  ton: "notr" | "olumlu" | "uyari" | "kritik";
  /** Imhaya kalan sure, insan diliyle ("12 gün", "8 saat"). Imha olduysa null. */
  kalan: string | null;
  /** Kullanicinin SIMDI yapmasi gereken tek is (varsa). */
  eylem: string | null;
};

export function turAdi(tur: string): string {
  if (tur === "dugun") return "Düğün";
  if (tur === "nisan") return "Nişan";
  if (tur === "nikah") return "Nikâh";
  if (tur === "mezuniyet") return "Mezuniyet";
  if (tur === "dogum") return "Doğum";
  return "Etkinlik";
}

function kalanMetin(ms: number): string {
  if (ms <= 0) return "süre doldu";
  const saat = Math.floor(ms / 3_600_000);
  if (saat < 48) return `${Math.max(1, saat)} saat`;
  return `${Math.floor(saat / 24)} gün`;
}

export function defterDurumu(e: EvreGirdisi): DefterDurum {
  const tur = turAdi(e.tur);
  const simdi = Date.now();
  const imha = new Date(e.imha_tarihi).getTime();
  const kapanis = new Date(e.kapanis_tarihi).getTime();
  const ozelGun = new Date(e.etkinlik_tarihi).getTime();
  const kalanMs = imha - simdi;

  // Dondurma her seyin ONUNDE gelir: defter salt okunur, sure isliyor olsa bile
  // kullanicinin yapabilecegi bir sey yok.
  if (e.donduruldu) {
    return {
      evre: "donduruldu",
      etiket: "Donduruldu",
      aciklama: "Defteriniz geçici olarak donduruldu; değişiklik ve indirme kapalı.",
      ton: "kritik",
      kalan: kalanMs > 0 ? kalanMetin(kalanMs) : null,
      eylem: null,
    };
  }

  if (e.imha_edildi || kalanMs <= 0) {
    return {
      evre: "imha",
      etiket: "Süresi doldu",
      aciklama: "Bu defter ve içindeki her şey kalıcı olarak silindi.",
      ton: "notr",
      kalan: null,
      eylem: null,
    };
  }

  // Son saatler - ton en sert, tek is indirmek.
  if (kalanMs <= 24 * 3_600_000) {
    return {
      evre: "sonlaniyor",
      etiket: `Son ${kalanMetin(kalanMs)}`,
      aciklama: `${tur} defteriniz ${kalanMetin(kalanMs)} sonra kalıcı olarak silinecek.`,
      ton: "kritik",
      kalan: kalanMetin(kalanMs),
      eylem: "Baskıya hazır defterini şimdi indir",
    };
  }

  // Toplama kapandi -> indirme penceresi. En kritik evre: yapilacak TEK is var.
  if (simdi >= kapanis) {
    return {
      evre: "indirme",
      etiket: `İndirme · ${kalanMetin(kalanMs)}`,
      aciklama: `Dilek toplama kapandı. ${tur} defteriniz ${kalanMetin(kalanMs)} sonra silinecek.`,
      ton: "uyari",
      kalan: kalanMetin(kalanMs),
      eylem: "Baskıya hazır defterini indir",
    };
  }

  // Ozel gun gecti, toplama surüyor.
  if (simdi >= ozelGun) {
    return {
      evre: "son-gunler",
      etiket: `Dilek toplanıyor · ${kalanMetin(kalanMs)}`,
      aciklama: `${tur} gününüz geçti; davetlileriniz hâlâ dilek bırakabiliyor.`,
      ton: "olumlu",
      kalan: kalanMetin(kalanMs),
      eylem: "Gelen dilekleri onayla",
    };
  }

  // Ozel gun henuz gelmedi.
  return {
    evre: "toplaniyor",
    etiket: `${tur} defteri · hazır`,
    aciklama: `Bağlantınız açık; davetlileriniz dilek bırakabilir.`,
    ton: "olumlu",
    kalan: kalanMetin(kalanMs),
    eylem: "Dilek bağlantını paylaş",
  };
}

// Rozet icin gorsel siniflar - ton dili TEK yerde tanimli.
//
// "uyari" satiri ham Tailwind kehribarindan (amber-400/500/600) TOKEN'a tasindi.
// Ham renk sabit hex'tir ve html.dark ile degismez; bu rozet acik temada koyu
// tema sarabina benzeyen parlak bir sari olarak cikiyordu. Artik --uyari
// degiskeninden gelir ve tema ile birlikte doner.
//
// HEDEF BICIM BUDUR: yeni yazilan her kod "uyari" token'ini kullanir.
// Kalan dosyalardaki "amber-*" cagrilari tailwind.config'teki gecici kopru
// sayesinde ayni rengi gosterir; o dosyalar baska bir is icin acildikca
// buradaki bicime cevrilir.
export function durumTonSinif(ton: DefterDurum["ton"]): string {
  if (ton === "kritik") return "border-sarap/40 bg-sarap/10 text-sarap";
  if (ton === "uyari") return "border-uyari/45 bg-uyari/10 text-uyari";
  if (ton === "olumlu") return "border-yaldiz/40 bg-yaldiz/10 text-yaldiz";
  return "border-ayrac bg-yuzeyKoyu text-ikincil";
}
