namespace BiAniBirak.Api.Servisler;

// SUPER YONETICI BILDIRIM KURALLARI - TEK MERKEZ (Bolum 4-D5).
//
// Her super-admin olayinin kurali BURADA yasar: hangi kanaldan gider (ANLIK push mu,
// GUNLUK OZET'e mi duser), sessiz saati dinler mi, tiklaninca nereye gider. Olaylar
// cogaldikca kural bu merkeze eklenir; gorev (SuperBildirimGorevi), gunluk ozet (D-B)
// ve ileride MAIL ozeti (FAZ 4 sonrasi) HEP buradan okur - dagilmis, birbiriyle
// celisen esikler olusmaz. "Ozet-hazir kurulur" ilkesi budur.
//
// ZATEN OLAY-GUDUMLU OLANLAR burada TEKRARLANMAZ (cift bildirim olmasin):
//   Destek talebi -> DestekUclari, kullanici yazdigi an super adminlere push atar.
//   Disk esikleri -> DiskGozcusu (ozel olcum; ayni desen, ayri gorev).
//
// Bu merkez, kaynaginda anlik bildirimi OLMAYAN olaylari yonlendirir:
//   ANLIK  : gecikmis imha, sistem hatasi (gorev tespit edince hemen).
//   OZET   : bekleyen odeme, bekleyen kvkk (D-B'de tek gunluk bildirimde toplulastirilir).
public static class BildirimKurallari
{
    public enum Kanal { Anlik, Ozet }

    // Kod        : olay kimligi (audit eylemi + gruplama).
    // Kanal      : Anlik (hemen push) | Ozet (gunluk toplu).
    // SessizSaatDinle : ANLIK icin - sessiz saatte ertelensin mi (D4). Hayati durumlar
    //                   (disk acil) bunu false yapar; o DiskGozcusu'nda.
    // Url        : tiklaninca gidilecek panel yolu.
    public sealed record Kural(string Kod, Kanal Kanal, bool SessizSaatDinle, string Url);

    // ---- ANLIK ----
    // Gecikmis imha: imha suresi gectigi halde duran defter -> imha gorevi aksiyor
    // olabilir. KVKK + disk riski. Gunde bir kez hatirlatilir (kalici durum, gunluk yeter).
    public static readonly Kural GecikmisImha =
        new("gecikmis_imha", Kanal.Anlik, SessizSaatDinle: true, "/super-panel");

    // Sistem hatasi: yakalanmamis exception birikti (1.2). Uc saatte bir tavan; yeni
    // hata varsa bildirir. 1.2'nin AKTIF-UYARI katmani budur (Hatalar sekmesi pasifti).
    public static readonly Kural SistemHatasi =
        new("sistem_hatasi", Kanal.Anlik, SessizSaatDinle: true, "/super-panel");

    // ---- OZET (D-B'de gunluk tek bildirim; burada tanimli, gorev henuz islemez) ----
    public static readonly Kural BekleyenOdeme =
        new("bekleyen_odeme", Kanal.Ozet, SessizSaatDinle: true, "/super-panel");
    public static readonly Kural BekleyenKvkk =
        new("bekleyen_kvkk", Kanal.Ozet, SessizSaatDinle: true, "/super-panel");

    // Gunluk ozet: her gun tek toplu bildirim (D-B). Sabit saatte gider - sessiz
    // saat DINLEMEZ (D4: sessiz saat yalniz ANLIK bildirimleri etkiler).
    public static readonly Kural GunlukOzet =
        new("gunluk_ozet", Kanal.Ozet, SessizSaatDinle: false, "/super-panel");

    // Disk esikleri - DiskGozcusu (ozel olcum, ayri gorev). Merkez audit eylemini
    // uretir; esik gomulu ("DISK_UYARI_85") - seviye yukselince yeni eylem -> hemen
    // bildirilir. (Acil esikte sessiz saat DINLENMEZ; o karar esige bagli, DiskGozcusu'nda.)
    public static readonly Kural Disk =
        new("disk", Kanal.Anlik, SessizSaatDinle: true, "/super-panel");

    // Idempotency audit eylemi: gorev, bildirdikten sonra denetim_gunlukleri'ne bu eylemi
    // yazar; tekrar bildirmeden once zaman penceresinde bu eylem var mi diye bakar
    // (HatirlatmaGorevi deseni - PushGonderici'nin Tip davranisindan BAGIMSIZ).
    public static string AuditEylem(Kural k) => $"SUPER_BILDIRIM_{k.Kod.ToUpperInvariant()}";

    // Disk uyarisi audit eylemi - esik gomulu (idempotency seviye basina).
    public static string DiskAuditEylem(int esik) => $"DISK_UYARI_{esik}";
}
