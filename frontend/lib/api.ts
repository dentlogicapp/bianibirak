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
};

// Katki (moderasyon kuyrugu / defter).
export type Katki = {
  id: string;
  kaynak_es: string;
  davetli_ad: string;
  mesaj: string;
  durum: string;
  created_at: string;
};

// Uygulama-ici bildirim (avatar cani).
export type Bildirim = {
  id: string;
  tip: string;
  baslik: string;
  mesaj: string;
  url: string | null;
  okundu_mu: boolean;
  created_at: string;
};

export type BildirimOzeti = {
  okunmamis_sayisi: number;
  bildirimler: Bildirim[];
};

// ---- SUPER PANEL ----
export type SuperOzet = {
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
  durum: string;
  donduruldu: boolean;
  silindi_mi: boolean;
  silinme_zamani: string | null;
  created_at: string;
  uyeler: { ad: string; email: string; rol: string; katildi: string }[];
  uye_sayisi: number;
  yetim: boolean;
  dilek_sayisi: number;
  bekleyen_dilek: number;
  hareketsiz: boolean;
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

// Baskiya hazir defteri indir (PDF - blob, JSON degil).
// onizleme=true -> filigranli surum (satin alma oncesi).
export async function defteriIndir(onizleme = false): Promise<{ ok: true } | { ok: false; mesaj: string }> {
  try {
    const yanit = await fetch(
      `/api/etkinlik/aktif/kurasyon/defter.pdf${onizleme ? "?onizleme=true" : ""}`,
      { credentials: "include" }
    );
    if (!yanit.ok) {
      const govde = await yanit.json().catch(() => ({}));
      return { ok: false, mesaj: govde.mesaj ?? "Defter oluşturulamadı." };
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

// ---- KURASYON (Asama 6 - miras) ----
export type KurasyonOgesi = {
  katki_id: string;
  davetli_ad: string;
  mesaj: string;
  kaynak_es: string;
  birakilma: string;
  dahil: boolean;
  sira: number;
  bolum_basligi: string | null;
};

export type Kurasyon = {
  tema: string;
  kapak_baslik: string | null;
  kapak_alt_baslik: string | null;
  kapak_gorsel_url: string | null;
  ithaf_metni: string | null;
  kapanis_metni: string | null;
  gruplama_tipi: string;
  qr_koprusu_aktif: boolean;
  durum: string;
  tamamlanma_zamani: string | null;
  es1_ad: string;
  es2_ad: string;
  tur: string;
  etkinlik_tarihi: string;
  ogeler: KurasyonOgesi[];
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
  kayit: (v: { ad: string; email: string; sifre: string }) =>
    istek<Kullanici>("/api/kayit", {
      method: "POST",
      body: JSON.stringify({ Ad: v.ad, Email: v.email, Sifre: v.sifre }),
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
    kapanisPencereGun: number;
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
        KapanisPencereGun: v.kapanisPencereGun ?? null,
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
    v: { davetliAd: string; davetliEmail: string; davetliTelefon: string; mesaj: string }
  ) =>
    istek<{ durum: string; mesaj: string }>(`/api/k/${encodeURIComponent(token)}`, {
      method: "POST",
      body: JSON.stringify({
        DavetliAd: v.davetliAd,
        DavetliEmail: v.davetliEmail,
        DavetliTelefon: v.davetliTelefon,
        Mesaj: v.mesaj,
      }),
    }),

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
    qrKoprusuAktif: boolean;
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
        QrKoprusuAktif: v.qrKoprusuAktif ?? null,
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
