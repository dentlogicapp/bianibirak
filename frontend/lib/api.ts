// Backend /api yardimcisi. Ayni-origin (Caddy handle /api/* -> backend), host-scoped
// cerez otomatik gonderilir; credentials:"include" ile acikca beslenir.
type ApiCevap<T> =
  | { ok: true; veri: T }
  | { ok: false; hata: string; mesaj: string; durum: number };

async function istek<T>(yol: string, secenek?: RequestInit): Promise<ApiCevap<T>> {
  try {
    const yanit = await fetch(yol, {
      ...secenek,
      headers: { "Content-Type": "application/json", ...(secenek?.headers || {}) },
      credentials: "include",
    });
    const govde = await yanit.json().catch(() => ({}));
    if (!yanit.ok) {
      return {
        ok: false,
        hata: govde.hata ?? "HATA",
        mesaj: govde.mesaj ?? "Bir hata oluştu.",
        durum: yanit.status,
      };
    }
    return { ok: true, veri: govde as T };
  } catch {
    return { ok: false, hata: "AG_HATASI", mesaj: "Sunucuya ulaşılamadı.", durum: 0 };
  }
}

export type Kullanici = {
  id: string;
  ad: string;
  email: string;
  cinsiyet: string | null;
  super_admin: boolean;
  goruntuleme_modu: boolean;
  goruntulenen_defter: string | null;
};

// Backend EtkinlikYaniti ile birebir (snake_case alanlar).
export type Etkinlik = {
  id: string;
  tur: string;
  es1_ad: string;
  es2_ad: string;
  etkinlik_tarihi: string; // yyyy-MM-dd
  acilis_tarihi: string; // ISO-8601
  kapanis_tarihi: string; // ISO-8601

  // TEK KANON: imha tarihi ve sureler BACKEND'DEN gelir. Frontend hesaplamaz.
  // (Onceki surumde frontend "kapanis + 7 + 10" uyduruyordu ve cizelge YALAN
  // tarih gosteriyordu.)
  imha_tarihi: string; // ISO-8601
  toplama_gun: number; // 30
  indirme_gun: number; // 7
  toplam_gun: number; // 37
  imha_edildi: boolean;
  // Super admin defteri dondurdu: salt okunur (yazim ve indirme kapali).
  donduruldu: boolean;
  // Ozel gun gectiyse tarih degistirilemez (yasam dongusu kilitlenir).
  tarih_kilitli: boolean;

  durum: string;
  rol: string | null;
};

// Backend AyarYaniti ile birebir.
export type EtkinlikAyar = {
  marka_kapak: string | null;
  tema: string | null;
  karsilama_metni: string | null;
  prompt_metni: string | null;
  kapanis_pencere_gun: number;
  sayac_aktif: boolean;
  sayac_aktif_cumle: string | null;
  sayac_bitti_cumle: string | null;
};

// Public davetli karsilama (GET /api/k/{token}).
export type KatkiKarsilama = {
  es1_ad: string;
  es2_ad: string;
  kaynak_es: string;
  tur: string;
  karsilama_metni: string | null;
  prompt_metni: string | null;
  acildi: boolean;
  kapandi: boolean;
  sayac_aktif: boolean;
  sayac_aktif_cumle: string | null;
  sayac_bitti_cumle: string | null;
  etkinlik_tarihi: string;
  gorseller: { url: string; kapak: boolean; genislik: number; yukseklik: number }[];
  saklama_gun: number;
};

// Katki (moderasyon kuyrugu / defter).
export type SssMadde = {
  id: string;
  kategori: string;
  alt_kategori: string;
  soru: string;
  cevap: string;
  sira: number;
  aktif: boolean;
  goruntulenme: number;
};

export type SssKategori = {
  kategori: string;
  alt_kategoriler: { alt_kategori: string; maddeler: { id: string; soru: string; cevap: string }[] }[];
};

export type DestekMesaj = {
  id: string;
  yonetici_mi: boolean;
  gonderen_ad: string;
  metin: string;
  created_at: string;
};

export type DestekTalep = {
  id: string;
  konu: string;
  durum: string;
  son_mesaj: string;
  created_at: string;
  yonetici_okudu: string | null;
  mesajlar: DestekMesaj[];
};

export type SuperDestekOzet = {
  id: string;
  konu: string;
  durum: string;
  kapanma: string | null;
  son_mesaj: string;
  okunmamis: number;
  kullanici_ad: string;
  kullanici_email: string;
  son_metin: string;
  son_yonetici_mi: boolean;
};

export type SuperDestekKonusma = {
  id: string;
  konu: string;
  durum: string;
  kapanma: string | null;
  yonetici_yaniti_var: boolean;
  kullanici_ad: string;
  kullanici_email: string;
  etkinlik_id: string | null;
  created_at: string;
  mesajlar: DestekMesaj[];
};

export type CopDilek = {
  id: string;
  davetliAd: string;
  mesaj: string;
  tur: string;
  fotoVar: boolean;
  silinmeZamani: string | null;
  kalanGun: number;
};

export type Katki = {
  id: string;
  kaynak_es: string;
  davetli_ad: string;
  davetli_iliski: string;
  davetli_telefon: string;
  davetli_email: string;
  mesaj: string;
  durum: string;
  created_at: string;
  foto_url: string | null;
  foto_genislik: number;
  foto_yukseklik: number;
};

// Uygulama-ici bildirim (avatar cani).
export type Bildirim = {
  id: string;
  tip: string;
  baslik: string;
  mesaj: string;
  url: string | null;
  // Bildirim hangi deftere ait - tiklamada once o deftere gecilir.
  etkinlik_id: string | null;
  okundu_mu: boolean;
  created_at: string;
};

export type BildirimOzeti = {
  okunmamis_sayisi: number;
  bildirimler: Bildirim[];
};

// ---- SUPER PANEL ----
export type SuperOzet = {
  nabiz: {
    disk_yuzde: number;
    disk_bos: string;
    imha_gecikmis: number;
    imha_yakin: number;
    destek_bekleyen: number;
    odeme_bekleyen: number;
    kvkk_bekleyen: number;
    dilek_beklemede: number;
  };
  defter: { toplam: number; aktif: number; donduruldu: number; copte: number; yeni_7gun: number };
  kullanici: { toplam: number; super_admin: number };
  dilek: {
    toplam: number;
    beklemede: number;
    onayli: number;
    red: number;
    kaldirilan: number;
    yeni_7gun: number;
  };
  kvkk: { bekleyen_talep: number };
};

export type SuperDefter = {
  id: string;
  es1_ad: string;
  es2_ad: string;
  tur: string;
  etkinlik_tarihi: string;
  kapanis_tarihi: string;
  imha_tarihi: string;
  imha_edildi: boolean;
  durum: string;
  donduruldu: boolean;
  silindi_mi: boolean;
  silinme_zamani: string | null;
  created_at: string;
  uyeler: { id: string; ad: string; email: string; rol: string; katildi: string }[];
  uye_sayisi: number;
  yetim: boolean;
  dilek_sayisi: number;
  bekleyen_dilek: number;
  hareketsiz: boolean;
  saglik: number;
};

export type SuperKullanici = {
  id: string;
  ad: string;
  email: string;
  super_admin: boolean;
  askida: boolean;
  created_at: string;
  defterler: { defter: string; rol: string }[];
};

export type AkisKaydi = {
  id: string;
  eylem: string;
  varlik: string;
  aktor: string;
  defter: string | null;
  degisen_alanlar: string | null;
  created_at: string;
};

export type KvkkMetin = {
  anahtar: string;
  baslik: string;
  icerik: string;
  yururluk_tarihi: string;
  updated_at: string;
};

export type KvkkTalep = {
  id: string;
  email: string;
  tip: string;
  aciklama: string;
  durum: string;
  sonuc_notu: string | null;
  son_yanit_tarihi: string;
  created_at: string;
};

export type CopKutusu = {
  defterler: {
    id: string;
    es1_ad: string;
    es2_ad: string;
    tur: string;
    silinme_zamani: string;
  }[];
  dilekler: {
    id: string;
    etkinlik_id: string;
    davetli_ad: string;
    mesaj: string;
    silinme_zamani: string;
  }[];
};

// Cift gorseli yukle (multipart - istek<T> JSON gonderir, bu ayri yol).
export async function gorselYukle(
  hazir: { dosya: File },
  konum = "galeri"
): Promise<{ ok: true; veri: EtkinlikGorseli } | { ok: false; mesaj: string }> {
  try {
    const form = new FormData();
    form.append("dosya", hazir.dosya);

    // konum QUERY ile gider - minimal API form alanlarini query'den bind eder
    const yanit = await fetch(`/api/etkinlik/aktif/gorsel?konum=${encodeURIComponent(konum)}`, {
      method: "POST",
      body: form,
      credentials: "include",
    });
    const govde = await yanit.json().catch(() => ({}));
    if (!yanit.ok) {
      return { ok: false, mesaj: govde.mesaj ?? "Fotoğraf yüklenemedi." };
    }
    return { ok: true, veri: govde as EtkinlikGorseli };
  } catch {
    return { ok: false, mesaj: "Sunucuya ulaşılamadı." };
  }
}

// Davetli fotografi yukle (token + katkiId ile; davetli basina 1 adet)
// Not: olcu GONDERILMEZ - backend fotografin baytlarindan okur (istemciye guvenilmez;
// ayrica minimal API form alanlarini query'den bind ettigi icin zaten ulasmiyordu).
export async function davetliFotoYukle(
  token: string,
  katkiId: string,
  dosya: File
): Promise<{ ok: boolean; mesaj?: string }> {
  try {
    const form = new FormData();
    form.append("dosya", dosya);
    const yanit = await fetch(`/api/k/${token}/foto/${katkiId}`, {
      method: "POST",
      body: form,
    });
    if (!yanit.ok) {
      const govde = await yanit.json().catch(() => ({}));
      return { ok: false, mesaj: govde.mesaj ?? "Fotoğraf yüklenemedi." };
    }
    return { ok: true };
  } catch {
    return { ok: false, mesaj: "Sunucuya ulaşılamadı." };
  }
}

// BASKIYA HAZIR DEFTER - 300 DPI, tam kalite.
//
// "onizleme" parametresi KALDIRILDI. Eski surumde filigranli PDF indiriliyordu; bu,
// urunu bedava dagitmakti - filigran bir goruntu modeliyle saniyeler icinde silinir,
// ustelik silmeye bile gerek yok, dosya ZATEN elde.
//
// Onizleme icin onizlemeSayfalari() var: PDF degil, 96 DPI goruntu.
// BOYUT: cift, basimi hangi olcude yaptiracaksa o boyut secilir (a5 | a4 | a3).
//
// Belge DOGRUDAN o olcude uretilir. Yazicidan buyutmeye birakmak da mumkundur
// (ISO 216 - A serisinin orani ayni, duzen bozulmaz), ama o zaman fotograflar
// seyrelir: A3'e buyutmede 300 DPI -> ~215 DPI. Dogru boyutta uretilirse kalite korunur.
export async function defteriIndir(
  boyut: "a5" | "a4" | "a3" = "a5"
): Promise<{ ok: true } | { ok: false; mesaj: string; odemeGerekli?: boolean }> {
  try {
    const yanit = await fetch(
      `/api/etkinlik/aktif/kurasyon/defter.pdf?boyut=${boyut}`,
      { credentials: "include" }
    );
    if (!yanit.ok) {
      const govde = await yanit.json().catch(() => ({}));
      // 402 ODEME_GEREKLI: paywall. Cagiran taraf odeme ekranini acar.
      return {
        ok: false,
        mesaj: govde.mesaj ?? "Defter oluşturulamadı.",
        odemeGerekli: yanit.status === 402,
      };
    }

    const blob = await yanit.blob();
    // Dosya adini Content-Disposition'dan al
    const cd = yanit.headers.get("content-disposition") ?? "";
    const eslesme = cd.match(/filename\*?=(?:UTF-8'')?["']?([^"';]+)["']?/i);
    const dosyaAdi = eslesme ? decodeURIComponent(eslesme[1]) : "ani-defteri.pdf";

    const url = URL.createObjectURL(blob);
    const baglanti = document.createElement("a");
    baglanti.href = url;
    baglanti.download = dosyaAdi;
    document.body.appendChild(baglanti);
    baglanti.click();
    document.body.removeChild(baglanti);
    URL.revokeObjectURL(url);
    return { ok: true };
  } catch {
    return { ok: false, mesaj: "Sunucuya ulaşılamadı." };
  }
}

// ---- GORSELLER (cift - en fazla 8) ----
export type EtkinlikGorseli = {
  id: string;
  url: string;
  konum: string; // kapak | ithaf | bolum | kapanis | galeri
  sira: number;
  genislik: number;
  yukseklik: number;
};

// ---- KURASYON (Asama 6 - miras) ----
export type KurasyonOgesi = {
  katki_id: string;
  davetli_ad: string;
  davetli_telefon: string;
  davetli_email: string;
  mesaj: string;
  kaynak_es: string;
  birakilma: string;
  dahil: boolean;
  sira: number;
  bolum_basligi: string | null;
  davetli_iliski: string;
  foto_url: string | null;
  foto_genislik: number;
  foto_yukseklik: number;
};

export type Kurasyon = {
  tema: string;
  kapak_baslik: string | null;
  kapak_alt_baslik: string | null;
  kapak_gorsel_url: string | null;
  ithaf_metni: string | null;
  kapanis_metni: string | null;
  gruplama_tipi: string;
  tarih_goster: boolean;
  durum: string;
  tamamlanma_zamani: string | null;
  es1_ad: string;
  es2_ad: string;
  tur: string;
  etkinlik_tarihi: string;
  ogeler: KurasyonOgesi[];
  gorseller: { url: string; konum: string }[];
};

// Denetim gunlugu kaydi.
export type DenetimKaydi = {
  id: string;
  eylem: string;
  varlik: string;
  degisen_alanlar: string | null;
  created_at: string;
};

export const api = {
  kayit: (v: { ad: string; email: string; sifre: string; onaylar: string[] }) =>
    istek<Kullanici>("/api/kayit", {
      method: "POST",
      // Onaylar SUNUCUYA GIDER: backend zorunlu metin anahtarlarini burada bekler.
      // Gonderilmezse Onaylar=null olur ve kayit ONAY_ZORUNLU (400) ile reddedilir.
      body: JSON.stringify({
        Ad: v.ad,
        Email: v.email,
        Sifre: v.sifre,
        Onaylar: v.onaylar,
      }),
    }),
  giris: (v: { email: string; sifre: string }) =>
    istek<Kullanici>("/api/giris", {
      method: "POST",
      body: JSON.stringify({ Email: v.email, Sifre: v.sifre }),
    }),
  cikis: () => istek<{ durum: string }>("/api/cikis", { method: "POST" }),
  ben: () => istek<Kullanici>("/api/ben"),
  profilGuncelle: (govde: { ad: string; cinsiyet: string | null }) =>
    istek<Kullanici>("/api/profil", { method: "PUT", body: JSON.stringify(govde) }),

  // --- Tenant cekirdegi (Asama 0C) ---
  etkinlikOlustur: (v: {
    tur: string;
    es1Ad: string;
    es2Ad: string;
    etkinlikTarihi: string;
    acilisTarihi?: string;
    kapanisTarihi?: string;
    kurucuEs?: string;
  }) =>
    istek<Etkinlik>("/api/etkinlik", {
      method: "POST",
      body: JSON.stringify({
        Tur: v.tur,
        Es1Ad: v.es1Ad,
        Es2Ad: v.es2Ad,
        EtkinlikTarihi: v.etkinlikTarihi,
        AcilisTarihi: v.acilisTarihi ?? null,
        KapanisTarihi: v.kapanisTarihi ?? null,
        KurucuEs: v.kurucuEs ?? "es1",
      }),
    }),
  etkinliklerim: () => istek<Etkinlik[]>("/api/etkinliklerim"),
  etkinlikGuncelle: (id: string, v: Partial<{
    tur: string;
    es1Ad: string;
    es2Ad: string;
    etkinlikTarihi: string;
  }>) =>
    istek<Etkinlik>(`/api/etkinlik/${id}`, {
      method: "PUT",
      body: JSON.stringify({
        Tur: v.tur ?? null,
        Es1Ad: v.es1Ad ?? null,
        Es2Ad: v.es2Ad ?? null,
        EtkinlikTarihi: v.etkinlikTarihi ?? null,
      }),
    }),
  etkinlikSil: (id: string) =>
    istek<{ durum: string }>(`/api/etkinlik/${id}`, { method: "DELETE" }),
  etkinlikAktifYap: (id: string) =>
    istek<{ aktif_etkinlik_id: string; rol: string }>(
      `/api/etkinlik/${id}/aktif-yap`,
      { method: "POST" }
    ),
  etkinlikAktif: () => istek<Etkinlik>("/api/etkinlik/aktif"),

  // --- Paylasim linkleri + ayarlar (Asama 2) ---
  etkinlikLinkler: () =>
    istek<{ es: string; token: string; aktif: boolean }[]>(
      "/api/etkinlik/aktif/linkler"
    ),
  etkinlikAyarlar: () => istek<EtkinlikAyar>("/api/etkinlik/aktif/ayarlar"),
  etkinlikAyarGuncelle: (v: Partial<{
    markaKapak: string;
    tema: string;
    karsilamaMetni: string;
    promptMetni: string;
    sayacAktif: boolean;
    sayacAktifCumle: string;
    sayacBittiCumle: string;
  }>) =>
    istek<EtkinlikAyar>("/api/etkinlik/aktif/ayarlar", {
      method: "PUT",
      body: JSON.stringify({
        MarkaKapak: v.markaKapak ?? null,
        Tema: v.tema ?? null,
        KarsilamaMetni: v.karsilamaMetni ?? null,
        PromptMetni: v.promptMetni ?? null,
        SayacAktif: v.sayacAktif ?? null,
        SayacAktifCumle: v.sayacAktifCumle ?? null,
        SayacBittiCumle: v.sayacBittiCumle ?? null,
      }),
    }),

  // --- Public davetli katki (Asama 3; login YOK, token URL'de) ---
  katkiKarsilama: (token: string) =>
    istek<KatkiKarsilama>(`/api/k/${encodeURIComponent(token)}`),
  katkiBirak: (
    token: string,
    v: {
      davetliAd: string;
      davetliEmail: string;
      davetliTelefon: string;
      davetliIliski: string;
      mesaj: string;
      // KVKK RIZASI - sunucuda ZORUNLU. Onceki surumde kutucuk vardi ama gonderilmiyordu;
      // riza aliniyordu ama ISPATLANAMIYORDU.
      riza: boolean;
    }
  ) =>
    istek<{ durum: string; katki_id: string; mesaj: string }>(
      `/api/k/${encodeURIComponent(token)}`,
      {
        method: "POST",
        // Riza SUNUCUYA GIDER: gonderilmezse Riza=false olur ve dilek
        // RIZA_ZORUNLU (400) ile reddedilir.
        body: JSON.stringify({
          DavetliAd: v.davetliAd,
          DavetliEmail: v.davetliEmail,
          DavetliTelefon: v.davetliTelefon,
          DavetliIliski: v.davetliIliski,
          Mesaj: v.mesaj,
          Riza: v.riza,
        }),
      }
    ),

  // --- Moderasyon (Asama 4; izolasyonlu kuyruk + onay/ret + birlesik defter) ---
  katkiKuyruk: () => istek<Katki[]>("/api/etkinlik/aktif/kuyruk"),
  katkiDefter: () => istek<Katki[]>("/api/etkinlik/aktif/defter"),
  katkiDurum: (id: string) =>
    istek<{
      id: string;
      durum: string;
      kaynak_es: string;
      davetli_ad: string;
      benim_kuyrugumda: boolean;
      // Dilek baska bir defterde ise: hangi defter + sinyal.
      etkinlik_id: string | null;
      baska_defterde: boolean;
    }>(`/api/etkinlik/aktif/katki/${id}`),
  // ---- SUPER PANEL ----
  superOzet: () => istek<SuperOzet>("/api/super/ozet"),
  superDefterler: (ara?: string, durum?: string, cop?: boolean) => {
    const p = new URLSearchParams();
    if (ara) p.set("ara", ara);
    if (durum) p.set("durum", durum);
    if (cop) p.set("cop", "true");
    const q = p.toString();
    return istek<SuperDefter[]>(`/api/super/defterler${q ? `?${q}` : ""}`);
  },
  superGoruntule: (id: string) =>
    istek<{
      ok: boolean;
      goruntuleme_modu: boolean;
      defter: { id: string; es1_ad: string; es2_ad: string };
      gecerlilik_bitis: string | null;
    }>(`/api/super/defter/${id}/goruntule`, { method: "POST" }),
  superGoruntulemeBitir: () =>
    istek<{ ok: boolean; aktif_etkinlik_id: string | null }>("/api/super/goruntule/bitir", {
      method: "POST",
    }),
  superDondur: (id: string) =>
    istek<{ ok: boolean; donduruldu: boolean }>(`/api/super/defter/${id}/dondur`, {
      method: "POST",
    }),
  superDefterCopeAt: (id: string) =>
    istek<{ ok: boolean }>(`/api/super/defter/${id}`, { method: "DELETE" }),
  superDefterGeriAl: (id: string) =>
    istek<{ ok: boolean }>(`/api/super/defter/${id}/geri-al`, { method: "POST" }),
  superDenemeDefteri: (evre: string, tur: string) =>
    istek<{ ok: boolean; etkinlik_id: string; evre: string; tur: string; ad: string }>(
      "/api/super/deneme-defteri",
      { method: "POST", body: JSON.stringify({ Evre: evre, Tur: tur }) }
    ),
  superDefterKaliciSil: (id: string, teyit: string) =>
    istek<{ ok: boolean }>(`/api/super/defter/${id}/kalici-sil`, {
      method: "POST",
      body: JSON.stringify({ Teyit: teyit }),
    }),
  superKatkiKaldir: (id: string) =>
    istek<{ ok: boolean }>(`/api/super/katki/${id}`, { method: "DELETE" }),
  superKatkiGeriAl: (id: string) =>
    istek<{ ok: boolean }>(`/api/super/katki/${id}/geri-al`, { method: "POST" }),
  superCop: () => istek<CopKutusu>("/api/super/cop"),
  superKullanicilar: (ara?: string) =>
    istek<SuperKullanici[]>(`/api/super/kullanicilar${ara ? `?ara=${encodeURIComponent(ara)}` : ""}`),
  // --- Teshis: defter detayi, olcum, rontgen (Tur S) ---
  superDefterDetay: (id: string) =>
    istek<SuperDefterDetay>(`/api/super/defter/${id}/detay`),
  superOlcum: () => istek<SuperOlcum>("/api/super/olcum"),

  // --- KVKK Yonetimi ---
  superMetinler: () => istek<MetinKatalog[]>("/api/super/metinler"),
  superMetinSurumler: (anahtar: string) =>
    istek<MetinSurum[]>(`/api/super/metin/${encodeURIComponent(anahtar)}/surumler`),
  superOnaylar: (ara?: string) =>
    istek<OnayArsivi>(`/api/super/onaylar${ara ? `?ara=${encodeURIComponent(ara)}` : ""}`),
  superImhaCalistir: () =>
    istek<{ ok: boolean; imha_edilen: number }>("/api/super/imha/calistir", {
      method: "POST",
    }),

  superAdminAta: (id: string, superAdmin: boolean) =>
    istek<{ ok: boolean; super_admin: boolean }>(`/api/super/kullanici/${id}/super-admin`, {
      method: "POST",
      body: JSON.stringify({ SuperAdmin: superAdmin }),
    }),
  superKullaniciAskiyaAl: (id: string) =>
    istek<{ ok: boolean; askida: boolean }>(`/api/super/kullanici/${id}/askiya-al`, {
      method: "POST",
    }),
  superKullaniciSil: (id: string, teyit: string) =>
    istek<{ ok: boolean }>(`/api/super/kullanici/${id}/sil`, {
      method: "POST",
      body: JSON.stringify({ Teyit: teyit }),
    }),
  superAkis: (limit?: number) =>
    istek<AkisKaydi[]>(`/api/super/akis${limit ? `?limit=${limit}` : ""}`),
  superKvkkMetinler: () => istek<KvkkMetin[]>("/api/super/kvkk/metinler"),
  superKvkkMetinGuncelle: (anahtar: string, v: { baslik?: string; icerik?: string }) =>
    istek<{ ok: boolean }>(`/api/super/kvkk/metin/${anahtar}`, {
      method: "PUT",
      body: JSON.stringify({ Baslik: v.baslik ?? null, Icerik: v.icerik ?? null }),
    }),
  superKvkkTalepler: (durum?: string) =>
    istek<KvkkTalep[]>(`/api/super/kvkk/talepler${durum ? `?durum=${durum}` : ""}`),
  superKvkkTalepIsle: (id: string, durum: string, sonucNotu?: string) =>
    istek<{ ok: boolean }>(`/api/super/kvkk/talep/${id}`, {
      method: "POST",
      body: JSON.stringify({ Durum: durum, SonucNotu: sonucNotu ?? null }),
    }),

  // ---- GORSELLER ----
  gorselListe: () =>
    istek<{ gorseller: EtkinlikGorseli[]; tavan: number }>("/api/etkinlik/aktif/gorseller"),
  gorselGuncelle: (id: string, v: { konum?: string }) =>
    istek<{ ok: boolean }>(`/api/etkinlik/aktif/gorsel/${id}`, {
      method: "PUT",
      body: JSON.stringify({ Konum: v.konum ?? null }),
    }),
  gorselSirala: (idler: string[]) =>
    istek<{ ok: boolean }>("/api/etkinlik/aktif/gorsel/sirala", {
      method: "POST",
      body: JSON.stringify({ Idler: idler }),
    }),
  gorselSil: (id: string) =>
    istek<{ ok: boolean }>(`/api/etkinlik/aktif/gorsel/${id}`, { method: "DELETE" }),

  // ---- KURASYON ----
  kurasyonGetir: () => istek<Kurasyon>("/api/etkinlik/aktif/kurasyon"),
  kurasyonGuncelle: (v: Partial<{
    tema: string;
    kapakBaslik: string;
    kapakAltBaslik: string;
    kapakGorselUrl: string;
    ithafMetni: string;
    kapanisMetni: string;
    gruplamaTipi: string;
    tarihGoster: boolean;
  }>) =>
    istek<{ ok: boolean }>("/api/etkinlik/aktif/kurasyon", {
      method: "PUT",
      body: JSON.stringify({
        Tema: v.tema ?? null,
        KapakBaslik: v.kapakBaslik ?? null,
        KapakAltBaslik: v.kapakAltBaslik ?? null,
        KapakGorselUrl: v.kapakGorselUrl ?? null,
        IthafMetni: v.ithafMetni ?? null,
        KapanisMetni: v.kapanisMetni ?? null,
        GruplamaTipi: v.gruplamaTipi ?? null,
        TarihGoster: v.tarihGoster ?? null,
      }),
    }),
  kurasyonOgeGuncelle: (katkiId: string, v: { dahil?: boolean; bolumBasligi?: string }) =>
    istek<{ ok: boolean }>(`/api/etkinlik/aktif/kurasyon/oge/${katkiId}`, {
      method: "PUT",
      body: JSON.stringify({
        Dahil: v.dahil ?? null,
        BolumBasligi: v.bolumBasligi ?? null,
      }),
    }),
  kurasyonSirala: (katkiIdler: string[]) =>
    istek<{ ok: boolean }>("/api/etkinlik/aktif/kurasyon/sirala", {
      method: "POST",
      body: JSON.stringify({ KatkiIdler: katkiIdler }),
    }),
  kurasyonTamamla: () =>
    istek<{ ok: boolean; dilek_sayisi: number }>("/api/etkinlik/aktif/kurasyon/tamamla", {
      method: "POST",
    }),

  denetimGunlugu: () => istek<DenetimKaydi[]>("/api/etkinlik/aktif/denetim"),

  // Es daveti (paylasilabilir link - mail gerekmez)
  davetDurum: () =>
    istek<{ es_katildi: boolean; hedef_rol: string; token: string | null }>(
      "/api/etkinlik/aktif/davet"
    ),
  davetOlustur: () =>
    istek<{ token: string; hedef_rol: string; durum: string }>("/api/etkinlik/aktif/davet", {
      method: "POST",
    }),
  davetBilgi: (token: string) =>
    istek<{
      durum: string;
      hedef_rol: string;
      es1_ad: string;
      es2_ad: string;
      tur: string;
      etkinlik_tarihi: string;
    }>(`/api/davet/${token}`),
  davetKabul: (token: string) =>
    istek<{ durum: string; etkinlik_id: string; rol: string }>(`/api/davet/${token}/kabul`, {
      method: "POST",
    }),

  // Uygulama-ici bildirimler (avatar cani)
  bildirimler: () => istek<BildirimOzeti>("/api/bildirimler"),
  bildirimOkundu: (id: string) =>
    istek<{ durum: string }>(`/api/bildirimler/${id}/okundu`, { method: "POST" }),
  bildirimHepsiOkundu: () =>
    istek<{ durum: string }>("/api/bildirimler/hepsi-okundu", { method: "POST" }),
  bildirimSil: (id: string) =>
    istek<{ durum: string }>(`/api/bildirimler/${id}`, { method: "DELETE" }),
  bildirimTumunuSil: () =>
    istek<{ durum: string }>("/api/bildirimler", { method: "DELETE" }),
  katkiOnayla: (id: string) =>
    istek<{ durum: string }>(`/api/katki/${id}/onayla`, { method: "POST" }),
  katkiReddet: (id: string) =>
    istek<{ durum: string }>(`/api/katki/${id}/reddet`, { method: "POST" }),

  // Cop kutusu (reddedilen dilekler)
  copListe: () =>
    istek<{ dilekler: CopDilek[]; copGun: number }>("/api/etkinlik/aktif/cop"),
  copGeriAl: (id: string) =>
    istek<{ durum: string }>(`/api/katki/${id}/geri-al`, { method: "POST" }),
  copKaliciSil: (id: string) =>
    istek<{ silindi: boolean }>(`/api/katki/${id}/kalici-sil`, { method: "POST" }),
  // ---- DESTEK ----
  destekKonusmam: () =>
    istek<{ talepler: DestekTalep[] }>("/api/destek"),
  destekGonder: (metin: string) =>
    istek<{ ok: boolean; talep_id: string }>("/api/destek", {
      method: "POST",
      body: JSON.stringify({ Metin: metin }),
    }),
  superDestekListe: () =>
    istek<{ bekleyen: number; talepler: SuperDestekOzet[] }>("/api/super/destek"),
  superDestekKonusma: (id: string) =>
    istek<SuperDestekKonusma>(`/api/super/destek/${id}`),
  superDestekYanit: (id: string, metin: string) =>
    istek<{ ok: boolean }>(`/api/super/destek/${id}/yanit`, {
      method: "POST",
      body: JSON.stringify({ Metin: metin }),
    }),
  sssAgac: () => istek<{ agac: SssKategori[] }>("/api/sss"),
  sssGoruntulendi: (id: string) =>
    istek<{ ok: boolean }>(`/api/sss/${id}/goruntulendi`, { method: "POST" }),
  superSssListe: () => istek<{ maddeler: SssMadde[] }>("/api/super/sss"),
  superSssKaydet: (v: {
    id?: string; kategori: string; altKategori: string;
    soru: string; cevap: string; sira?: number; aktif?: boolean;
  }) =>
    istek<{ ok: boolean; id: string }>("/api/super/sss", {
      method: "POST",
      body: JSON.stringify({
        Id: v.id ?? null, Kategori: v.kategori, AltKategori: v.altKategori,
        Soru: v.soru, Cevap: v.cevap, Sira: v.sira ?? null, Aktif: v.aktif ?? null,
      }),
    }),
  superSssSil: (id: string) =>
    istek<{ ok: boolean }>(`/api/super/sss/${id}`, { method: "DELETE" }),

  superDestekKapat: (id: string) =>
    istek<{ ok: boolean; durum: string }>(`/api/super/destek/${id}/kapat`, { method: "POST" }),
  destekKapat: () => istek<{ ok: boolean }>("/api/destek/kapat", { method: "POST" }),
  superDestekYenidenAc: (id: string) =>
    istek<{ ok: boolean; durum: string }>(`/api/super/destek/${id}/yeniden-ac`, { method: "POST" }),
  superDestekBaslat: (v: { kullaniciId: string; etkinlikId?: string | null; baslik?: string; metin: string }) =>
    istek<{ ok: boolean; talep_id: string }>("/api/super/destek/baslat", {
      method: "POST",
      body: JSON.stringify({
        KullaniciId: v.kullaniciId,
        EtkinlikId: v.etkinlikId ?? null,
        Baslik: v.baslik ?? null,
        Metin: v.metin,
      }),
    }),

  copeat: (id: string) =>
    istek<{ copeAtildi: boolean }>(`/api/katki/${id}/copeat`, { method: "POST" }),

  // --- Push (Asama 10-A; cihaz kaydi + sessiz saat) ---
  pushAnahtar: () => istek<{ anahtar: string }>("/api/push/anahtar"),
  cihazKaydet: (v: {
    pushToken: string;
    platform: string;
    p256dh?: string;
    auth?: string;
    cihazAdi?: string;
  }) =>
    istek<{ durum: string }>("/api/cihaz", {
      method: "POST",
      body: JSON.stringify({
        PushToken: v.pushToken,
        Platform: v.platform,
        P256dh: v.p256dh ?? null,
        Auth: v.auth ?? null,
        CihazAdi: v.cihazAdi ?? null,
      }),
    }),
  sessizSaatGetir: () =>
    istek<{ aktif: boolean; baslangic: string | null; bitis: string | null }>(
      "/api/sessiz-saat"
    ),
  sessizSaatGuncelle: (v: { aktif: boolean; baslangic?: string; bitis?: string }) =>
    istek<{ aktif: boolean; baslangic: string | null; bitis: string | null }>(
      "/api/sessiz-saat",
      {
        method: "PUT",
        body: JSON.stringify({
          Aktif: v.aktif,
          Baslangic: v.baslangic ?? null,
          Bitis: v.bitis ?? null,
        }),
      }
    ),
};

// ---------------- ONIZLEME (goruntu, PDF degil) ----------------

export type OnizlemeBilgi = {
  sayfa_sayisi: number;
  onizleme_dpi: number;
  baski_dpi: number;
};

export function onizlemeBilgi() {
  return istek<OnizlemeBilgi>("/api/etkinlik/aktif/kurasyon/onizleme");
}

// Sayfa GORUNTUSU (PNG). Dosya degil - tarayicida goruntu olarak akar.
// "Farkli kaydet" derse elinde 96 DPI bir PNG olur: ekranda guzel, kagitta bulanik.
export function onizlemeSayfaUrl(sayfa: number): string {
  return `/api/etkinlik/aktif/kurasyon/onizleme/${sayfa}.png`;
}

// ---------------- KVKK YONETIMI (Planlama deseni, cok metinli) ----------------

export type MetinKatalog = {
  id: string;
  anahtar: string;
  baslik: string;
  icerik: string;
  kapsam: string; // "es" | "davetli"
  zorunlu: boolean;
  sira: number;
  deprecated: boolean;
  surum: string;
  hash: string;
  yururluk_tarihi: string;
  guncelleme: string;
  surum_sayisi: number;
  onay_sayisi: number;
};

export type MetinSurum = {
  id: string;
  surum: string;
  hash: string;
  baslik: string;
  icerik: string;
  yururluk_tarihi: string;
  created_at: string;
};

export type OnayKaydi = {
  id: string;
  kullanici_id: string | null;
  ad: string | null;
  email: string | null;
  silinmis: boolean;
  metin_anahtar: string;
  metin_surum: string;
  metin_hash: string;
  ip: string | null;
  tarayici: string | null;
  created_at: string;
};

export type OnayArsivi = {
  kayitlar: OnayKaydi[];
  guncel_metinler: {
    anahtar: string;
    baslik: string;
    surum: string;
    hash: string;
    yururluk: string;
  }[];
  toplam: number;
};

// Kanit belgesi - avukata/mahkemeye sunulabilir tek PDF.
export async function kanitIndir(onayId: string): Promise<{ ok: boolean; mesaj: string }> {
  try {
    const y = await fetch(`/api/super/onay/${onayId}/kanit.pdf`, { credentials: "include" });
    if (!y.ok) return { ok: false, mesaj: "Kanıt belgesi üretilemedi." };
    const blob = await y.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `onay-kaniti-${onayId}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    return { ok: true, mesaj: "Kanıt belgesi indirildi." };
  } catch {
    return { ok: false, mesaj: "Kanıt belgesi üretilemedi." };
  }
}

// Onam kayitlari - toplu CSV (denetim/avukat icin).
export async function onamCsvIndir(kapsam?: string): Promise<{ ok: boolean; mesaj: string }> {
  try {
    const q = kapsam ? `?kapsam=${kapsam}` : "";
    const y = await fetch(`/api/super/onaylar/belge.csv${q}`, { credentials: "include" });
    if (!y.ok) return { ok: false, mesaj: "Belge üretilemedi." };
    const blob = await y.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "onam-kayitlari.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    return { ok: true, mesaj: "Onam kayıtları indirildi." };
  } catch {
    return { ok: false, mesaj: "Belge üretilemedi." };
  }
}

// ---------------- SUPER PANEL TESHIS (Tur S) ----------------

export type SuperDefterDetay = {
  id: string;
  es1_ad: string;
  es2_ad: string;
  tur: string;
  durum: string;
  donduruldu: boolean;
  silindi: boolean;
  created_at: string;
  updated_at: string;

  acilis_tarihi: string;
  etkinlik_tarihi: string;
  kapanis_tarihi: string;
  kapandi: boolean;
  imha_tarihi: string;
  imhaya_kalan_gun: number;

  saglik: number;
  saglik_detay: {
    kurulum: boolean;
    link: boolean;
    katki: boolean;
    aktif_30_gun: boolean;
  };
  son_hareket: string;

  uyeler: {
    id: string;
    ad: string;
    email: string;
    rol: string;
    super_admin: boolean;
    askida: boolean;
    katildi: string;
  }[];

  linkler: { es: string; aktif: boolean; created_at: string }[];

  katki: {
    toplam: number;
    beklemede: number;
    onayli: number;
    red: number;
    fotografli: number;
    es1: number;
    es2: number;
    son_katki: string | null;
  };

  kurasyon: {
    durum: string;
    tema: string;
    esere_dahil: number;
    tamamlanma: string | null;
  } | null;

  ciktilar: {
    tip: string;
    dilek_sayisi: number;
    created_at: string;
  }[];

  medya: { adet: number; bayt: number };
};

export type SuperOlcum = {
  huni: {
    defter_acildi: number;
    link_paylasildi: number;
    ilk_dilek_geldi: number;
    kurasyon_yapildi: number;
    eser_indirildi: number;
  };
  yasam_dongusu: {
    acik: number;
    kapali: number;
    imha_gecikmis: number;
    saklama_gun: number;
  };
  riskli: {
    id: string;
    es1_ad: string;
    es2_ad: string;
    created_at: string;
    gun: number;
    sebep: string;
  }[];
  imha_yaklasan: {
    id: string;
    es1_ad: string;
    es2_ad: string;
    imha_tarihi: string;
    kalan_gun: number;
  }[];
  ilk_dilek_gecikme_saat: number | null;
  son_30_gun: { yeni_defter: number; yeni_dilek: number };
};

// Defter rontgeni - yonetici, cift'in gordugu PDF'i uretir (filigranli, destek amacli)
export async function rontgenIndir(defterId: string): Promise<{ ok: boolean; mesaj: string }> {
  try {
    const yanit = await fetch(`/api/super/defter/${defterId}/rontgen.pdf`, {
      credentials: "include",
    });
    if (!yanit.ok) {
      const govde = await yanit.json().catch(() => null);
      return { ok: false, mesaj: govde?.mesaj ?? "Röntgen üretilemedi." };
    }
    const blob = await yanit.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rontgen-${defterId}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    return { ok: true, mesaj: "Röntgen indirildi." };
  } catch {
    return { ok: false, mesaj: "Röntgen üretilemedi." };
  }
}


/* ===================== ODEME =====================
 *
 * KURAL A - ODEME ONCE, DURUSTLUK SONRA:
 *   Indirme butonu ONCE odemeye goturur. Boyut secimi, DPI uyarilari, baski notlari
 *   odeme SONRASI gosterilir.
 *
 *   Gerekce: durustluk satin alma SONRASI dogru kullanim rehberligidir. Oncesi supe
 *   tohumudur. Odeme ekranindan once "fotograflariniz seyrelir" demek, henuz kararsiz
 *   olan cifti caydirir.
 */

export type OdemeDurum = {
  odemeGerekli: boolean;   // sistem acik mi? (false = paywall yok, herkes indirir)
  odendi: boolean;         // onaylanmis odeme var mi?
  tutar: number;
  paraBirimi: string;
  bekleyen: {
    referansKodu: string;
    tutar: number;
    sonGecerlilik: string;
    olusturma: string;
  } | null;
};

export type OdemeMetni = {
  anahtar: string;
  baslik: string;
  icerik: string;
  surum: string;
};

export type OdemeTalimati = {
  referansKodu: string;
  tutar: number;
  paraBirimi: string;
  sonGecerlilik: string;
  iban: string;
  aliciAd: string;
  bankaAd: string;
};

export async function odemeDurumu(): Promise<OdemeDurum | null> {
  try {
    const y = await fetch("/api/etkinlik/aktif/odeme/durum", { credentials: "include" });
    if (!y.ok) return null;
    return (await y.json()) as OdemeDurum;
  } catch {
    return null;
  }
}

export async function odemeMetinleri(): Promise<OdemeMetni[]> {
  try {
    const y = await fetch("/api/etkinlik/aktif/odeme/metinler", { credentials: "include" });
    if (!y.ok) return [];
    return (await y.json()) as OdemeMetni[];
  } catch {
    return [];
  }
}

export async function odemeBaslat(
  riza: boolean
): Promise<{ ok: true; talimat: OdemeTalimati } | { ok: false; mesaj: string }> {
  try {
    const y = await fetch("/api/etkinlik/aktif/odeme/baslat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ riza }),
    });
    const govde = await y.json().catch(() => ({}));
    if (!y.ok) return { ok: false, mesaj: govde.mesaj ?? "Ödeme başlatılamadı." };
    return { ok: true, talimat: govde as OdemeTalimati };
  } catch {
    return { ok: false, mesaj: "Ödeme başlatılamadı." };
  }
}

export async function odemeBildir(): Promise<{ ok: boolean; mesaj?: string }> {
  try {
    const y = await fetch("/api/etkinlik/aktif/odeme/bildir", {
      method: "POST",
      credentials: "include",
    });
    if (!y.ok) {
      const g = await y.json().catch(() => ({}));
      return { ok: false, mesaj: g.mesaj ?? "Bildirim gönderilemedi." };
    }
    return { ok: true };
  } catch {
    return { ok: false, mesaj: "Bildirim gönderilemedi." };
  }
}

/* ---- SUPER PANEL: odeme yonetimi ---- */

export type SuperOdeme = {
  id: string;
  etkinlikId: string;
  defterAd: string;
  defterSilindi: boolean;
  odeyenAd: string | null;
  odeyenEmail: string | null;
  tutar: number;
  paraBirimi: string;
  saglayici: string;
  referansKodu: string;
  durum: string;
  not: string | null;
  onayZamani: string | null;
  sonGecerlilik: string;
  suresiGecti: boolean;
  createdAt: string;
};

export type SuperOdemeListesi = {
  odemeler: SuperOdeme[];
  ozet: {
    bekleyen: number;
    onaylanan: number;
    reddedilen: number;
    toplamTahsilat: number;
  };
  sistemAktif: boolean;
};

export type OdemeAyar = {
  iban: string;
  aliciAd: string;
  bankaAd: string;
  tutar: number;
  paraBirimi: string;
  gecerlilikGun: number;
  aktif: boolean;
};

export async function superOdemeler(): Promise<SuperOdemeListesi | null> {
  try {
    const y = await fetch("/api/super/odemeler", { credentials: "include" });
    if (!y.ok) return null;
    return (await y.json()) as SuperOdemeListesi;
  } catch {
    return null;
  }
}

export async function superOdemeOnayla(
  id: string,
  not?: string
): Promise<{ ok: boolean; mesaj?: string }> {
  try {
    const y = await fetch(`/api/super/odeme/${id}/onayla`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ not: not ?? null }),
    });
    if (!y.ok) {
      const g = await y.json().catch(() => ({}));
      return { ok: false, mesaj: g.mesaj ?? "Onaylanamadı." };
    }
    return { ok: true };
  } catch {
    return { ok: false, mesaj: "Onaylanamadı." };
  }
}

export async function superOdemeReddet(
  id: string,
  not?: string
): Promise<{ ok: boolean; mesaj?: string }> {
  try {
    const y = await fetch(`/api/super/odeme/${id}/reddet`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ not: not ?? null }),
    });
    if (!y.ok) {
      const g = await y.json().catch(() => ({}));
      return { ok: false, mesaj: g.mesaj ?? "Reddedilemedi." };
    }
    return { ok: true };
  } catch {
    return { ok: false, mesaj: "Reddedilemedi." };
  }
}

export async function superOdemeAyarGetir(): Promise<OdemeAyar | null> {
  try {
    const y = await fetch("/api/super/odeme/ayar", { credentials: "include" });
    if (!y.ok) return null;
    return (await y.json()) as OdemeAyar;
  } catch {
    return null;
  }
}

export async function superOdemeAyarKaydet(
  ayar: Omit<OdemeAyar, "paraBirimi">
): Promise<{ ok: boolean; mesaj?: string }> {
  try {
    const y = await fetch("/api/super/odeme/ayar", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(ayar),
    });
    if (!y.ok) {
      const g = await y.json().catch(() => ({}));
      return { ok: false, mesaj: g.mesaj ?? "Kaydedilemedi." };
    }
    return { ok: true };
  } catch {
    return { ok: false, mesaj: "Kaydedilemedi." };
  }
}


/* ===================== DAVETIYE KAREKODUM =====================
 * Ciftin KENDI kisa kodu (izolasyon - yalniz kendi tarafi).
 * Link frontend'de kurulur: `${origin}/d/${kisaKod}` (mevcut /k/ deseni gibi).
 */

export type DavetiyeKarekodum = {
  es: string;        // es1 | es2
  kisaKod: string;
};

export async function davetiyeKarekodum(): Promise<DavetiyeKarekodum | null> {
  try {
    const y = await fetch("/api/etkinlik/aktif/davetiye-karekodum", { credentials: "include" });
    if (!y.ok) return null;
    return (await y.json()) as DavetiyeKarekodum;
  } catch {
    return null;
  }
}

// Kisa kod -> token (yonlendirme icin; /d/{kod} sayfasi kullanir).
export async function kisaKodCoz(kod: string): Promise<string | null> {
  try {
    const y = await fetch(`/api/kisa/${encodeURIComponent(kod)}`, { credentials: "include" });
    if (!y.ok) return null;
    const g = await y.json();
    return typeof g.token === "string" ? g.token : null;
  } catch {
    return null;
  }
}


/* ===================== DAVETIYE KAREKODUM (genisletilmis) =====================
 * Her iki esin kisa kodu + isimleri (matbaaya iki ZIP) + paylasimli onizleme.
 */

export type KarekodTaraf = { es: string; kisaKod: string; ad: string };
export type Karekodlarim = { es: string; benim: KarekodTaraf; esin: KarekodTaraf };

export async function karekodlarim(): Promise<Karekodlarim | null> {
  try {
    const y = await fetch("/api/etkinlik/aktif/davetiye-karekodum", { credentials: "include" });
    if (!y.ok) return null;
    return (await y.json()) as Karekodlarim;
  } catch {
    return null;
  }
}

export type Onizleme = {
  zemin: string | null;
  olcek: number;
  posX: number;
  posY: number;
  sonDuzenleyen: string | null;
  guncellenme: string | null;
};

export async function onizlemeGetir(): Promise<Onizleme | null> {
  try {
    const y = await fetch("/api/etkinlik/aktif/davetiye-onizleme", { credentials: "include" });
    if (!y.ok) return null;
    return (await y.json()) as Onizleme;
  } catch {
    return null;
  }
}

export async function onizlemeKaydet(g: { zemin: string; olcek: number; posX: number; posY: number }): Promise<Onizleme | null> {
  try {
    const y = await fetch("/api/etkinlik/aktif/davetiye-onizleme", {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ Zemin: g.zemin, Olcek: g.olcek, PosX: g.posX, PosY: g.posY }),
    });
    if (!y.ok) return null;
    return (await y.json()) as Onizleme;
  } catch {
    return null;
  }
}
