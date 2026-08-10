// DENETIM OKUNURLUK KATMANI - TEK KAYNAK.
//
// ================== NEDEN VAR ==================
//
// denetim_gunlukleri'ndeki DegisenAlanlar (JSONB) yillardir yaziliyordu ama HICBIR
// ekranda okunmuyordu. Kullanici "Ayarlar guncellendi" goruyor, NEYIN degistigini
// goremiyordu. Kayitli veri var, karsiligi yok - denetimin asil degeri burada.
//
// Ayrica eylem etiketleri IKI AYRI YERDE tanimliydi (denetim sayfasi "eylemEtiketi",
// super panel "eylemMetni"). Iki kopya kacinilmaz olarak ayrisir: birine yeni eylem
// eklenir, otekine unutulur ve ayni olay iki ekranda iki farkli isimle gorunur.
// Artik tek kaynak burasi.
//
// ================== DURUSTLUK NOTU ==================
//
// Kayitlarin cogu "onceki -> yeni" DEGILDIR; yalnizca yeni degeri ya da baglami
// tasir (ornek AYAR_GUNCELLENDI yalniz yeni metinleri yazar, eskisini yazmaz).
// Bu yuzden burada uydurma bir "degisim" gosterilmez: elimizde ne varsa o soylenir.
// Gercek "eski -> yeni" ancak yazma tarafi da kaydederse mumkun olur (E1-b).

// ---- EYLEM ETIKETLERI ----
// Kullanicinin gordugu cumle. Yeni bir eylem eklendiginde YALNIZCA burasi guncellenir.
const EYLEM_ETIKET: Record<string, string> = {
  // Etkinlik yasam dongusu
  ETKINLIK_OLUSTURULDU: "Defter oluşturuldu",
  ETKINLIK_GUNCELLENDI: "Defter bilgileri güncellendi",
  ETKINLIK_COPE_TASINDI: "Defter çöp kutusuna taşındı",
  ETKINLIK_GERI_ALINDI: "Defter çöp kutusundan geri alındı",
  ETKINLIK_SILINDI: "Defter silindi",
  ETKINLIK_KALICI_SILINDI: "Defter kalıcı olarak silindi",
  ETKINLIK_COPTEN_KALICI_SILINDI: "Defter çöpten kalıcı olarak silindi",
  DEFTER_COPE_ATILDI: "Defter çöp kutusuna taşındı",
  DEFTER_GERI_ALINDI: "Defter geri alındı",
  DEFTER_KALICI_SILINDI: "Defter kalıcı olarak silindi",
  DEFTER_IMHA_EDILDI: "Defter süresi doldu ve imha edildi",
  DEFTER_DONDURULDU: "Defter donduruldu",
  DEFTER_COZULDU: "Defter yeniden açıldı",
  DEFTER_SAKLAMA_DEGISTIRILDI: "Kalıcı saklama süresi değiştirildi",
  DENEME_DEFTERI_URETILDI: "Deneme defteri üretildi",

  // Dilekler
  KATKI_BIRAKILDI: "Bir davetli dilek bıraktı",
  KATKI_ONAYLANDI: "Bir dilek onaylandı",
  KATKI_REDDEDILDI: "Bir dilek reddedildi",
  KATKI_GERI_ALINDI: "Bir dilek geri alındı",
  KATKI_KALICI_SILINDI: "Bir dilek kalıcı olarak silindi",
  KATKI_ONAYLI_COPE_TASINDI: "Onaylı bir dilek çöpe taşındı",
  KATKI_COP_OTOMATIK_SILINDI: "Çöpteki dilek süresi dolduğu için silindi",

  // Kurasyon / eser
  KURASYON_BASLATILDI: "Baskı stüdyosu açıldı",
  KURASYON_GUNCELLENDI: "Defter düzeni güncellendi",
  MIRAS_TAMAMLANDI: "Miras tamamlandı olarak işaretlendi",
  ESER_ONIZLENDI: "Eser önizlemesi alındı",
  ESER_INDIRILDI: "Baskıya hazır defter indirildi",

  // Ayar / görsel / profil
  AYAR_GUNCELLENDI: "Defter ayarları güncellendi",
  GORSEL_EKLENDI: "Görsel eklendi",
  GORSEL_KALDIRILDI: "Görsel kaldırıldı",
  PROFIL_GUNCELLENDI: "Profil bilgileri güncellendi",

  // Hesap / üyelik
  KAYIT: "Hesap oluşturuldu",
  GIRIS: "Giriş yapıldı",
  ES_DAVETI_OLUSTURULDU: "Eş daveti oluşturuldu",
  ES_KATILDI: "Eş deftere katıldı",
  KULLANICI_ASKIYA_ALINDI: "Kullanıcı askıya alındı",
  KULLANICI_GERI_ACILDI: "Kullanıcı yeniden etkinleştirildi",
  KULLANICI_SILINDI: "Kullanıcı silindi",

  // Ödeme
  ODEME_BASLATILDI: "Ödeme başlatıldı",
  ODEME_BILDIRILDI: "Havale bildirimi yapıldı",
  ODEME_ONAYLANDI: "Ödeme onaylandı",
  ODEME_REDDEDILDI: "Ödeme reddedildi",
  ODEME_AYARI_GUNCELLENDI: "Ödeme ayarları güncellendi",

  // Destek
  DESTEK_KAPATILDI: "Destek talebi kapatıldı",
  DESTEK_YENIDEN_ACILDI: "Destek talebi yeniden açıldı",
  DESTEK_KULLANICI_KAPATTI: "Kullanıcı destek talebini kapattı",
  DESTEK_OTOMATIK_KAPANDI: "Destek talebi sessizlik nedeniyle kapandı",
  DESTEK_KALICI_SILINDI: "Destek yazışması kalıcı olarak silindi",

  // KVKK / kanıt
  KVKK_METNI_GUNCELLENDI: "KVKK metni güncellendi",
  ONAY_KANIT_URETILDI: "Onay kanıt belgesi üretildi",
  ONAM_KAYITLARI_DISA_AKTARILDI: "Onam kayıtları dışa aktarıldı",

  // Sistem / yönetici izleri
  PUSH_GONDERILDI: "Bildirim gönderildi",
  INDIRME_HATIRLATMASI: "İndirme hatırlatması gönderildi",
  SUPER_DEFTER_RONTGEN: "Yönetici defter röntgeni aldı",
  DEFTER_GORUNTULEME_BASLADI: "Yönetici defteri görüntülemeye başladı",
  DEFTER_GORUNTULEME_BITTI: "Yönetici görüntülemeyi bitirdi",
  GORUNTULEME_YAZMA_ENGELLENDI: "Görüntüleme modunda yazma engellendi",
};

export function eylemEtiketi(eylem: string): string {
  if (EYLEM_ETIKET[eylem]) return EYLEM_ETIKET[eylem];
  // Onek ile uretilen gorev izleri (SUPER_BILDIRIM_*, DISK_UYARI_*).
  if (eylem.startsWith("SUPER_BILDIRIM_")) return "Yöneticiye sistem bildirimi gönderildi";
  if (eylem.startsWith("DISK_UYARI_")) return "Disk doluluk uyarısı gönderildi";
  // BILINMEYEN EYLEM SESSIZ KALMAZ: ham kod okunur hale getirilir
  // ("YENI_BIR_EYLEM" -> "Yeni bir eylem"). Yeni bir eylem eklendiginde ekran
  // bozulmaz, yalnizca sade gorunur - ve etiket eklenmesi gerektigi belli olur.
  const sade = eylem.replace(/_/g, " ").toLocaleLowerCase("tr-TR");
  return sade.charAt(0).toLocaleUpperCase("tr-TR") + sade.slice(1);
}

// ---- ALAN ETIKETLERI ----
const ALAN_ETIKET: Record<string, string> = {
  kaynak_es: "taraf",
  davetli: "davetli",
  tema: "tema",
  boyut: "boyut",
  dilek_sayisi: "dilek",
  gorsel_sayisi: "görsel",
  konum: "konum",
  bayt: "boyut",
  rol: "rol",
  hedef_rol: "davet edilen",
  email: "e-posta",
  hedef: "hedef",
  defter: "defter",
  durum: "durum",
  tur: "tür",
  evre: "evre",
  saat: "süre",
  gun: "sayım günü",
  kalan_gun: "kalan",
  saklama_gun: "saklama",
  kapanis: "kapanış",
  yol: "adres",
  metot: "yöntem",
  es1: "1. eş",
  es2: "2. eş",
  Tema: "tema",
  MarkaKapak: "kapak",
  PromptMetni: "davet metni",
  KarsilamaMetni: "karşılama metni",
  Tur: "tür",
  Es1Ad: "1. eş adı",
  Es2Ad: "2. eş adı",
  EtkinlikTarihi: "özel gün",
  // Bildirim / gorev govdeleri - ham anahtar olarak ekrana dusuyorlardi.
  baslik: "başlık",
  sayi: "adet",
  BekleyenToplam: "bekleyen iş",
  uye_mi: "üye",
  goruntuleme_modu: "görüntüleme modu",
  gruplama: "gruplama",
  donduruldu: "donduruldu",
};

// OPERASYONEL GURULTU - EKRANDA GORUNMEZ. Push altyapisinin ic sayaclaridir;
// kayitta dururlar (denetim izi bozulmaz), yalnizca GOSTERILMEZLER.
const GIZLI_ALANLAR = new Set(["basarili", "temizlenen", "cihaz_sayisi", "tip", "kaynak_es"]);

function esAdi(v: unknown): string {
  if (v === "es1") return "1. eş";
  if (v === "es2") return "2. eş";
  return String(v);
}

function deger(anahtar: string, v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "boolean") return v ? "evet" : "hayır";
  if (anahtar === "kaynak_es" || anahtar === "rol" || anahtar === "hedef_rol") return esAdi(v);
  if (anahtar === "bayt" && typeof v === "number") {
    return `${(v / 1048576).toFixed(1)} MB`;
  }
  if (anahtar === "saklama_gun" || anahtar === "kalan_gun") return `${v} gün`;
  if (anahtar === "gun") return String(v); // "sayım günü: 9" - birim etikette

  if (anahtar === "saat") return `${v} saat`;
  if (anahtar === "dilek_sayisi") return `${v} dilek`;
  if (anahtar === "gorsel_sayisi") return `${v} görsel`;
  if (anahtar === "boyut" && typeof v === "string") return v.toLocaleUpperCase("tr-TR");
  // ISO tarih gibi gorunuyorsa insan diline cevir
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}T/.test(v)) {
    const t = new Date(v);
    if (!isNaN(t.getTime())) {
      return t.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
    }
  }
  const s = String(v);
  // Uzun metinler kirpilir: denetim satiri bir OZET'tir, metnin kendisi degil.
  return s.length > 60 ? s.slice(0, 60).trimEnd() + "..." : s;
}

// ---- AYRINTI SATIRI ----
// Kayittaki JSON'u tek satirlik okunur Turkce ozete cevirir. Anlamli bir sey
// yoksa null doner (bos satir cizilmez - gurultu uretmeyiz).
export function ayrintiMetni(eylem: string, degisenAlanlar: string | null): string | null {
  if (!degisenAlanlar) return null;

  let veri: Record<string, unknown>;
  try {
    const c = JSON.parse(degisenAlanlar);
    if (!c || typeof c !== "object" || Array.isArray(c)) return null;
    veri = c as Record<string, unknown>;
  } catch {
    return null; // bozuk JSON ekrani bozmaz
  }

  // 0) EYLEMIN KENDISINI TEKRARLAYAN GOVDELER: ayrinti satiri BILGI KATMIYORSA
  // cizilmez. "Defter donduruldu" satirinin altina "donduruldu: evet" yazmak
  // gurultudur; kullanicinin gozu bir sure sonra tum ayrinti satirlarini atlamaya
  // baslar ve GERCEKTEN bilgi tasiyanlar da kaybolur.
  const tekrarEdenler = [
    "DEFTER_DONDURULDU",
    "DEFTER_COZULDU",
    "DESTEK_KAPATILDI",
    "DESTEK_YENIDEN_ACILDI",
    "DESTEK_KULLANICI_KAPATTI",
    "DESTEK_OTOMATIK_KAPANDI",
  ];
  if (tekrarEdenler.includes(eylem)) return null;

  // 1) GERCEK DEGISIM (eski -> yeni). Su an yalniz saklama suresi boyle yaziliyor.
  if ("eski" in veri || "yeni" in veri) {
    const e = veri.eski == null ? "varsayılan" : `${veri.eski} gün`;
    const y = veri.yeni == null ? "varsayılan" : `${veri.yeni} gün`;
    return `${e} → ${y}`;
  }

  // 2) KISMI GUNCELLEME: yalniz DOLU alanlar degistirilmistir; null olanlara
  // dokunulmamistir. "Sunlar guncellendi" demek, ham JSON'dan cok daha dogrudur.
  if (eylem === "AYAR_GUNCELLENDI" || eylem === "ETKINLIK_GUNCELLENDI") {
    const dolu = Object.entries(veri)
      .filter(([, v]) => v !== null && v !== undefined && v !== "")
      .map(([k]) => ALAN_ETIKET[k] ?? k);
    if (dolu.length === 0) return null;
    return `Güncellenen: ${dolu.join(", ")}`;
  }

  // 3) GENEL: anlamli alanlari "etiket: deger" olarak birlestir.
  const parcalar = Object.entries(veri)
    .filter(([k]) => !GIZLI_ALANLAR.has(k))
    .filter(([, v]) => v !== null && v !== undefined && v !== "")
    .map(([k, v]) => {
      const etiket = ALAN_ETIKET[k] ?? k.replace(/_/g, " ");
      const d = deger(k, v);
      if (!d) return "";
      // Sayi+birim zaten kendini anlatiyorsa etiket tekrarlanmaz
      // ("3 dilek" -> "dilek: 3 dilek" olmaz).
      return d.includes(etiket) ? d : `${etiket}: ${d}`;
    })
    .filter(Boolean);

  return parcalar.length > 0 ? parcalar.join(" · ") : null;
}

// ---- ZAMAN (denetimde DAKIKA kesinligi) ----
export function zamanKisa(iso: string): string {
  const t = new Date(iso);
  if (isNaN(t.getTime())) return "-";
  const simdi = new Date();
  const ayniGun =
    t.getDate() === simdi.getDate() &&
    t.getMonth() === simdi.getMonth() &&
    t.getFullYear() === simdi.getFullYear();
  const saat = t.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
  if (ayniGun) return saat;
  const gun = t.toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
  return `${gun} ${saat}`;
}

// ============================================================================
// OZNE DILI - "kim yapti?" once gelir.
//
// CANLIDA OGRENILDI: denetim satirlari OZNESIZ yaziliyordu ("Bir dilek reddedildi")
// ve olayin sahibi ham kodla ekrana dusuyordu ("taraf: 2. es"). Bir aktivite akisinin
// ILK sorusu "kim yapti"dir; elimizde isim varken kod gostermek savunulamaz.
//
// Uc ozne turu var:
//   SEN     -> ikinci tekil, cekimli: "bir dilegi deftere aldin"
//   ESIN    -> adiyla, ucuncu tekil: "Aysegul baskiya hazir defteri indirdi"
//   SISTEM  -> oznesiz/edilgen: "Defter suresi doldu ve imha edildi"
//
// kaynak_es ARTIK EKRANA CIKMAZ (GIZLI_ALANLAR): gorevi yalnizca izolasyon
// filtresidir ve o filtre BACKEND'de calisir.
// ============================================================================

// [sen, o] cekimleri. Yeni eylem eklendiginde YALNIZCA burasi guncellenir.
const FIIL: Record<string, [string, string]> = {
  KATKI_ONAYLANDI: ["bir dileği deftere aldın", "bir dileği deftere aldı"],
  KATKI_REDDEDILDI: ["bir dileği reddettin", "bir dileği reddetti"],
  KATKI_GERI_ALINDI: ["bir dileği geri aldın", "bir dileği geri aldı"],
  KATKI_ONAYLI_COPE_TASINDI: ["onaylı bir dileği çöpe taşıdın", "onaylı bir dileği çöpe taşıdı"],
  KATKI_KALICI_SILINDI: ["bir dileği kalıcı olarak sildin", "bir dileği kalıcı olarak sildi"],

  ESER_INDIRILDI: ["baskıya hazır defteri indirdin", "baskıya hazır defteri indirdi"],
  ESER_ONIZLENDI: ["eserin önizlemesini aldın", "eserin önizlemesini aldı"],
  KURASYON_BASLATILDI: ["baskı stüdyosunu açtın", "baskı stüdyosunu açtı"],
  KURASYON_GUNCELLENDI: ["defter düzenini güncelledin", "defter düzenini güncelledi"],
  MIRAS_TAMAMLANDI: ["mirası tamamladın", "mirası tamamladı"],

  AYAR_GUNCELLENDI: ["defter ayarlarını güncelledin", "defter ayarlarını güncelledi"],
  ETKINLIK_OLUSTURULDU: ["defteri oluşturdun", "defteri oluşturdu"],
  ETKINLIK_GUNCELLENDI: ["defter bilgilerini güncelledin", "defter bilgilerini güncelledi"],
  GORSEL_EKLENDI: ["görsel ekledin", "görsel ekledi"],
  GORSEL_KALDIRILDI: ["görsel kaldırdın", "görsel kaldırdı"],

  ES_DAVETI_OLUSTURULDU: ["eş daveti oluşturdun", "eş daveti oluşturdu"],
  ES_KATILDI: ["deftere katıldın", "deftere katıldı"],

  ODEME_BASLATILDI: ["ödeme başlattın", "ödeme başlattı"],
  ODEME_BILDIRILDI: ["havale bildirimi yaptın", "havale bildirimi yaptı"],

  DEFTER_COPE_ATILDI: ["defteri çöp kutusuna taşıdın", "defteri çöp kutusuna taşıdı"],
  ETKINLIK_COPE_TASINDI: ["defteri çöp kutusuna taşıdın", "defteri çöp kutusuna taşıdı"],
  DEFTER_GERI_ALINDI: ["defteri geri aldın", "defteri geri aldı"],
  ETKINLIK_GERI_ALINDI: ["defteri geri aldın", "defteri geri aldı"],
  DEFTER_DONDURULDU: ["defteri dondurdun", "defteri dondurdu"],
  DEFTER_COZULDU: ["defteri yeniden açtın", "defteri yeniden açtı"],
  DEFTER_KALICI_SILINDI: ["defteri kalıcı olarak sildin", "defteri kalıcı olarak sildi"],
  ETKINLIK_KALICI_SILINDI: ["defteri kalıcı olarak sildin", "defteri kalıcı olarak sildi"],
  DEFTER_SAKLAMA_DEGISTIRILDI: ["saklama süresini değiştirdin", "saklama süresini değiştirdi"],
  SUPER_DEFTER_RONTGEN: ["defter röntgeni aldın", "defter röntgeni aldı"],
  DEFTER_GORUNTULEME_BASLADI: ["defteri görüntülemeye başladın", "defteri görüntülemeye başladı"],
  DEFTER_GORUNTULEME_BITTI: ["görüntülemeyi bitirdin", "görüntülemeyi bitirdi"],
  GIRIS: ["giriş yaptın", "giriş yaptı"],
  KAYIT: ["hesap oluşturdun", "hesap oluşturdu"],
  PROFIL_GUNCELLENDI: ["profil bilgilerini güncelledin", "profil bilgilerini güncelledi"],
  DENEME_DEFTERI_URETILDI: ["deneme defteri ürettin", "deneme defteri üretti"],
};

export type DenetimCumlesi = {
  /** Ozne: "Sen" | esin/davetli adi | null (sistem olayi) */
  ozne: string | null;
  /** Cumlenin geri kalani. Ozne null ise tek basina edilgen cumle olur. */
  fiil: string;
  /** Rozet turu - gorsel ayrim icin. */
  tur: "sen" | "kisi" | "sistem";
};

// Bir denetim kaydini OZNE + CEKIMLI FIIL olarak kurar.
//
//   aktor : kaydi yazan kullanicinin adi (backend'den; sistem olaylarinda null)
//   benMi : bu kaydin aktoru oturumdaki kullanici mi
export function denetimCumlesi(
  eylem: string,
  degisenAlanlar: string | null,
  aktor: string | null,
  benMi: boolean
): DenetimCumlesi {
  // DAVETLI OLAYI: ozne davetlinin KENDISIDIR - "sen" ya da "esin" degil.
  if (eylem === "KATKI_BIRAKILDI") {
    let ad: string | null = null;
    try {
      const c = degisenAlanlar ? JSON.parse(degisenAlanlar) : null;
      if (c && typeof c === "object" && typeof c.davetli === "string") ad = c.davetli;
    } catch {
      /* bozuk govde cumleyi bozmaz */
    }
    return { ozne: ad, fiil: "bir dilek bıraktı", tur: "kisi" };
  }

  const cekim = FIIL[eylem];

  // SISTEM OLAYI (aktor yok): edilgen cumle - uydurma bir ozne YAZILMAZ.
  if (!aktor) {
    return { ozne: null, fiil: eylemEtiketi(eylem), tur: "sistem" };
  }

  if (!cekim) {
    // Cekimi olmayan eylem: ozne + edilgen etiket. Ekran bozulmaz, eksik olan
    // yalnizca dilin akiciligidir - ve hangi eylemin eklenmesi gerektigi bellidir.
    return { ozne: benMi ? "Sen" : aktor, fiil: eylemEtiketi(eylem).toLocaleLowerCase("tr-TR"), tur: benMi ? "sen" : "kisi" };
  }

  return {
    ozne: benMi ? "Sen" : aktor,
    fiil: benMi ? cekim[0] : cekim[1],
    tur: benMi ? "sen" : "kisi",
  };
}

// Super panel (yonetici gorusu): ozne HER ZAMAN ucuncu tekil - "Sen" yoktur,
// yonetici baskalarinin islemlerini izler.
export function akisFiili(eylem: string): string {
  const cekim = FIIL[eylem];
  return cekim ? cekim[1] : eylemEtiketi(eylem).toLocaleLowerCase("tr-TR");
}

// ---- GUN BASLIGI (B1) ----
// "Bugün / Dün / 21 Temmuz". Satirlarda yalniz saat kalir; tarih her satirda
// tekrarlanmaz - goz tarihi degil, OLAYI okur.
export function gunBasligi(iso: string): string {
  const t = new Date(iso);
  if (isNaN(t.getTime())) return "-";
  const bugun = new Date();
  const dun = new Date(bugun);
  dun.setDate(dun.getDate() - 1);
  const ayniGun = (a: Date, b: Date) =>
    a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
  if (ayniGun(t, bugun)) return "Bugün";
  if (ayniGun(t, dun)) return "Dün";
  return t.toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: t.getFullYear() === bugun.getFullYear() ? undefined : "numeric",
  });
}

// Yalniz saat ("14:32") - gun basligi altindaki satirlar icin.
export function saatMetni(iso: string): string {
  const t = new Date(iso);
  if (isNaN(t.getTime())) return "-";
  return t.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
}

// ============================================================================
// CSV DISA AKTARIM (E5)
//
// Toplu inceleme gozle yapilmaz: 500 satiri kaydirarak "ne oldu" anlasilmaz.
// Indirilir, suzulur, siralanir.
//
// YALNIZ SUPER PANELDE: cifte CSV verilmez. Denetim ekrani onlar icin bir
// SEFFAFLIK sayfasidir; tabloya dokup suzmek bir YONETIM eylemidir. Karsiligi
// olmayan bir buton, kullaniciya "bunu ne yapacagim?" diye sordurur ve arayuzu
// kalabalastirir. (KVKK veri tasinabilirligi ayri bir akistir - onam kayitlari.)
// Indirilir, suzulur, siralanir. KVKK/hukuki bir talepte de istenen budur.
//
// EXCEL VE TURKCE: dosya UTF-8 BOM ile yazilir. BOM olmadan Excel dosyayi
// sistem kod sayfasiyla acar ve "Ayşegül" -> "AyÅŸegÃ¼l" olur. Tek karakterlik
// bir onek, raporun okunur olmasiyla cop olmasi arasindaki farktir.
//
// AYIRAC NOKTALI VIRGUL: Turkce Windows Excel'inde varsayilan ayirac ";"dir;
// virgul kullanilirsa tum satir tek hucreye duser.
// ============================================================================

function csvHucre(v: string | number | null | undefined): string {
  const s = v == null ? "" : String(v);
  // Tirnak ikilenir, alan tirnak icine alinir: icindeki ; ve satir sonu
  // hucreyi bolmez. (fromCharCode(34) = cift tirnak - ic ice kacis gerekmez,
  // boylece bu satir hicbir arac zincirinde bozulmaz.)
  const t = String.fromCharCode(34);
  return t + s.split(t).join(t + t) + t;
}

export type CsvSatiri = Record<string, string | number | null | undefined>;

// Tarayicida dosya uretir ve indirir. Sunucuya UGRAMAZ: veri zaten ekranda,
// ikinci bir uc acmak ayni bilgiyi iki yerden uretmek olurdu.
export function denetimCsvIndir(dosyaAdi: string, satirlar: CsvSatiri[]) {
  if (satirlar.length === 0) return;
  const basliklar = Object.keys(satirlar[0]);
  const govde = [
    basliklar.map(csvHucre).join(";"),
    ...satirlar.map((s) => basliklar.map((b) => csvHucre(s[b])).join(";")),
  // Satir sonu KOD NOKTASIYLA: kacis dizileri arac zincirinde (yama ->
  // PowerShell -> dosya) bozulabiliyor, kod noktasi hicbir katmanda yorumlanmaz.
  ].join(String.fromCharCode(13) + String.fromCharCode(10));

  // Excel, BOM olmadan dosyayi sistem kod sayfasiyla acar ve Turkce karakterleri
  // bozar ("Ayşegül" -> "AyÅŸegÃ¼l"). BOM da kod noktasiyla uretilir.
  const bom = String.fromCharCode(0xfeff);
  const blob = new Blob([bom + govde], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = dosyaAdi;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Tam zaman damgasi (CSV icin) - siralanabilir ve okunur.
export function tamZaman(iso: string): string {
  const t = new Date(iso);
  if (isNaN(t.getTime())) return iso;
  return t.toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
