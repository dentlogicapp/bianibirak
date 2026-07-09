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
  super_admin: boolean;
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
};

// Public davetli karsilama (GET /api/k/{token}).
export type KatkiKarsilama = {
  es1_ad: string;
  es2_ad: string;
  tur: string;
  karsilama_metni: string | null;
  prompt_metni: string | null;
  acildi: boolean;
  kapandi: boolean;
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

  // --- Tenant cekirdegi (Asama 0C) ---
  etkinlikOlustur: (v: {
    tur: string;
    es1Ad: string;
    es2Ad: string;
    etkinlikTarihi: string;
    acilisTarihi?: string;
    kapanisTarihi?: string;
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
  }>) =>
    istek<EtkinlikAyar>("/api/etkinlik/aktif/ayarlar", {
      method: "PUT",
      body: JSON.stringify({
        MarkaKapak: v.markaKapak ?? null,
        Tema: v.tema ?? null,
        KarsilamaMetni: v.karsilamaMetni ?? null,
        PromptMetni: v.promptMetni ?? null,
        KapanisPencereGun: v.kapanisPencereGun ?? null,
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
};
