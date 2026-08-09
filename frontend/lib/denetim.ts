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
};

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
