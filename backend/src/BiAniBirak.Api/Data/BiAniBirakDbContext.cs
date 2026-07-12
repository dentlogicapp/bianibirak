using BiAniBirak.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace BiAniBirak.Api.Data;

// Tek dogruluk kaynagi - entity <-> Belge 04 tablo/kolon eslemesi.
// Tablo adlari snake_case Turkce-ASCII cogul; ekosistem kolonlari snake_case
// (email, sifre_hash, super_admin, created_at/updated_at/deleted_at);
// domain kolonlari PascalCase ASCII (Id, EtkinlikId, KullaniciId, Eylem...).
public class BiAniBirakDbContext : DbContext
{
    public BiAniBirakDbContext(DbContextOptions<BiAniBirakDbContext> options)
        : base(options)
    {
    }

    public DbSet<Kullanici> Kullanicilar => Set<Kullanici>();
    public DbSet<DenetimGunlugu> DenetimGunlukleri => Set<DenetimGunlugu>();
    public DbSet<Etkinlik> Etkinlikler => Set<Etkinlik>();
    public DbSet<EtkinlikUyeligi> EtkinlikUyelikleri => Set<EtkinlikUyeligi>();
    public DbSet<UyeDaveti> UyeDavetleri => Set<UyeDaveti>();
    public DbSet<PaylasimBaglantisi> PaylasimBaglantilari => Set<PaylasimBaglantisi>();
    public DbSet<EtkinlikAyari> EtkinlikAyarlari => Set<EtkinlikAyari>();
    public DbSet<Katki> Katkilar => Set<Katki>();
    public DbSet<KatkiMedyasi> KatkiMedyalari => Set<KatkiMedyasi>();
    public DbSet<Cihaz> Cihazlar => Set<Cihaz>();
    public DbSet<ErtelenenBildirim> ErtelenenBildirimler => Set<ErtelenenBildirim>();
    public DbSet<Bildirim> Bildirimler => Set<Bildirim>();
    public DbSet<SistemMetni> SistemMetinleri => Set<SistemMetni>();
    public DbSet<KvkkTalebi> KvkkTalepleri => Set<KvkkTalebi>();
    public DbSet<Kurasyon> Kurasyonlar => Set<Kurasyon>();
    public DbSet<KurasyonOgesi> KurasyonOgeleri => Set<KurasyonOgesi>();
    public DbSet<KurasyonCiktisi> KurasyonCiktilari => Set<KurasyonCiktisi>();
    public DbSet<EtkinlikGorseli> EtkinlikGorselleri => Set<EtkinlikGorseli>();

    protected override void OnModelCreating(ModelBuilder model)
    {
        base.OnModelCreating(model);

        // ---- kullanicilar ----
        model.Entity<Kullanici>(e =>
        {
            e.ToTable("kullanicilar");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("Id");
            e.Property(x => x.Email).HasColumnName("email").IsRequired();
            e.Property(x => x.SifreHash).HasColumnName("sifre_hash").IsRequired();
            e.Property(x => x.Ad).HasColumnName("Ad").IsRequired();
            e.Property(x => x.Cinsiyet).HasColumnName("Cinsiyet");
            e.Property(x => x.SuperAdmin).HasColumnName("super_admin");
            e.Property(x => x.SessizSaatAktif).HasColumnName("SessizSaatAktif");
            e.Property(x => x.SessizSaatBaslangic).HasColumnName("SessizSaatBaslangic");
            e.Property(x => x.SessizSaatBitis).HasColumnName("SessizSaatBitis");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
            e.Property(x => x.UpdatedAt).HasColumnName("updated_at");
            e.Property(x => x.DeletedAt).HasColumnName("deleted_at");
            e.HasIndex(x => x.Email).IsUnique();
        });

        // ---- denetim_gunlukleri (append-only audit) ----
        model.Entity<DenetimGunlugu>(e =>
        {
            e.ToTable("denetim_gunlukleri");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("Id");
            e.Property(x => x.EtkinlikId).HasColumnName("EtkinlikId");
            e.Property(x => x.KullaniciId).HasColumnName("KullaniciId");
            e.Property(x => x.Eylem).HasColumnName("Eylem").IsRequired();
            e.Property(x => x.Varlik).HasColumnName("Varlik").IsRequired();
            e.Property(x => x.VarlikId).HasColumnName("VarlikId");
            e.Property(x => x.DegisenAlanlar).HasColumnName("DegisenAlanlar").HasColumnType("jsonb");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
        });

        // ---- etkinlikler (TENANT - izolasyon siniri) ----
        model.Entity<Etkinlik>(e =>
        {
            e.ToTable("etkinlikler");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("Id");
            e.Property(x => x.Tur).HasColumnName("Tur").IsRequired();
            e.Property(x => x.Es1Ad).HasColumnName("Es1Ad").IsRequired();
            e.Property(x => x.Es2Ad).HasColumnName("Es2Ad").IsRequired();
            e.Property(x => x.EtkinlikTarihi).HasColumnName("EtkinlikTarihi");
            e.Property(x => x.AcilisTarihi).HasColumnName("AcilisTarihi");
            e.Property(x => x.KapanisTarihi).HasColumnName("KapanisTarihi");
            e.Property(x => x.Durum).HasColumnName("Durum").IsRequired();
            e.Property(x => x.SilindiMi).HasColumnName("SilindiMi");
            e.Property(x => x.SilinmeZamani).HasColumnName("SilinmeZamani");
            e.Property(x => x.Donduruldu).HasColumnName("Donduruldu");
            e.Property(x => x.UstOrganizatorId).HasColumnName("UstOrganizatorId");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
            e.Property(x => x.UpdatedAt).HasColumnName("updated_at");
            e.Property(x => x.DeletedAt).HasColumnName("deleted_at");
            // gelecek B2B2C sorgusu icin index (bugun hepsi NULL)
            e.HasIndex(x => x.UstOrganizatorId);
        });

        // ---- etkinlik_uyelikleri (cift = iki uye; Karar 5) ----
        model.Entity<EtkinlikUyeligi>(e =>
        {
            e.ToTable("etkinlik_uyelikleri");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("Id");
            e.Property(x => x.EtkinlikId).HasColumnName("EtkinlikId");
            e.Property(x => x.KullaniciId).HasColumnName("KullaniciId");
            e.Property(x => x.Rol).HasColumnName("Rol").IsRequired();
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
            // tenant filtresi (WHERE EtkinlikId) icin index
            e.HasIndex(x => x.EtkinlikId);
            // kullanicinin uyelikleri sorgusu icin index
            e.HasIndex(x => x.KullaniciId);
            // kural: etkinlik basina her rol tek satir
            e.HasIndex(x => new { x.EtkinlikId, x.Rol }).IsUnique();
            e.HasIndex(x => new { x.EtkinlikId, x.KullaniciId }).IsUnique();
            // FK iliskileri (model seviyesinde) -> EF insert sirasini dogru belirler
            e.HasOne<Etkinlik>().WithMany().HasForeignKey(x => x.EtkinlikId);
            e.HasOne<Kullanici>().WithMany().HasForeignKey(x => x.KullaniciId);
        });

        // ---- uye_davetleri (es2 davet tokeni; Karar 5) ----
        model.Entity<UyeDaveti>(e =>
        {
            e.ToTable("uye_davetleri");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("Id");
            e.Property(x => x.EtkinlikId).HasColumnName("EtkinlikId");
            e.Property(x => x.Token).HasColumnName("Token").IsRequired();
            e.Property(x => x.HedefRol).HasColumnName("HedefRol").IsRequired();
            e.Property(x => x.Durum).HasColumnName("Durum").IsRequired();
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
            // tenant filtresi icin index
            e.HasIndex(x => x.EtkinlikId);
            // token ile tekil arama + benzersizlik (Belge 08)
            e.HasIndex(x => x.Token).IsUnique();
            // FK iliskisi (model seviyesinde) -> EF insert sirasini dogru belirler
            e.HasOne<Etkinlik>().WithMany().HasForeignKey(x => x.EtkinlikId);
        });

        // ---- paylasim_baglantilari (cift-link: her ese ayri token) ----
        model.Entity<PaylasimBaglantisi>(e =>
        {
            e.ToTable("paylasim_baglantilari");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("Id");
            e.Property(x => x.EtkinlikId).HasColumnName("EtkinlikId");
            e.Property(x => x.Es).HasColumnName("Es").IsRequired();
            e.Property(x => x.Token).HasColumnName("Token").IsRequired();
            e.Property(x => x.Aktif).HasColumnName("Aktif");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
            // tenant filtresi icin index
            e.HasIndex(x => x.EtkinlikId);
            // token ile public sayfa cozumleme + benzersizlik (Belge 08)
            e.HasIndex(x => x.Token).IsUnique();
            // kural: etkinlik basina her es tek link
            e.HasIndex(x => new { x.EtkinlikId, x.Es }).IsUnique();
            // FK iliskisi (0C dersi: model seviyesinde)
            e.HasOne<Etkinlik>().WithMany().HasForeignKey(x => x.EtkinlikId);
        });

        // ---- etkinlik_ayarlari (hardcoded yasak; bire-bir etkinlik) ----
        model.Entity<EtkinlikAyari>(e =>
        {
            e.ToTable("etkinlik_ayarlari");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("Id");
            e.Property(x => x.EtkinlikId).HasColumnName("EtkinlikId");
            e.Property(x => x.MarkaKapak).HasColumnName("MarkaKapak");
            e.Property(x => x.Tema).HasColumnName("Tema");
            e.Property(x => x.KarsilamaMetni).HasColumnName("KarsilamaMetni");
            e.Property(x => x.PromptMetni).HasColumnName("PromptMetni");
            e.Property(x => x.KapanisPencereGun).HasColumnName("KapanisPencereGun");
            e.Property(x => x.SayacAktif).HasColumnName("SayacAktif");
            e.Property(x => x.SayacAktifCumle).HasColumnName("SayacAktifCumle");
            e.Property(x => x.SayacBittiCumle).HasColumnName("SayacBittiCumle");
            e.Property(x => x.Ayarlar).HasColumnName("Ayarlar").HasColumnType("jsonb");
            e.Property(x => x.UpdatedAt).HasColumnName("updated_at");
            // bire-bir: her etkinlige tek ayar satiri
            e.HasIndex(x => x.EtkinlikId).IsUnique();
            // FK iliskisi (0C dersi: model seviyesinde)
            e.HasOne<Etkinlik>().WithMany().HasForeignKey(x => x.EtkinlikId);
        });

        // ---- katkilar (davetli dilekleri; birlesim-oncesi izolasyon) ----
        model.Entity<Katki>(e =>
        {
            e.ToTable("katkilar");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("Id");
            e.Property(x => x.EtkinlikId).HasColumnName("EtkinlikId");
            e.Property(x => x.PaylasimBaglantiId).HasColumnName("PaylasimBaglantiId");
            e.Property(x => x.KaynakEs).HasColumnName("KaynakEs").IsRequired();
            e.Property(x => x.DavetliAd).HasColumnName("DavetliAd").IsRequired();
            e.Property(x => x.DavetliEmail).HasColumnName("DavetliEmail").IsRequired();
            e.Property(x => x.DavetliTelefon).HasColumnName("DavetliTelefon").IsRequired();
            e.Property(x => x.DavetliIliski).HasColumnName("DavetliIliski");
            e.Property(x => x.FotoAnahtari).HasColumnName("FotoAnahtari");
            e.Property(x => x.FotoGenislik).HasColumnName("FotoGenislik");
            e.Property(x => x.FotoYukseklik).HasColumnName("FotoYukseklik");
            e.Property(x => x.Mesaj).HasColumnName("Mesaj").IsRequired();
            e.Property(x => x.Tur).HasColumnName("Tur").IsRequired();
            e.Property(x => x.Durum).HasColumnName("Durum").IsRequired();
            e.Property(x => x.SilindiMi).HasColumnName("SilindiMi");
            e.Property(x => x.SilinmeZamani).HasColumnName("SilinmeZamani");
            e.Property(x => x.SilenKullaniciId).HasColumnName("SilenKullaniciId");
            e.Property(x => x.OnaylayanKullaniciId).HasColumnName("OnaylayanKullaniciId");
            e.Property(x => x.OnayZamani).HasColumnName("OnayZamani");
            e.Property(x => x.DuzeltmeNotu).HasColumnName("DuzeltmeNotu");
            e.Property(x => x.DuzeltmeSablonId).HasColumnName("DuzeltmeSablonId");
            e.Property(x => x.DuzeltmeTokeni).HasColumnName("DuzeltmeTokeni");
            e.Property(x => x.DuzeltmeTalepZamani).HasColumnName("DuzeltmeTalepZamani");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
            e.Property(x => x.UpdatedAt).HasColumnName("updated_at");
            // tenant filtresi
            e.HasIndex(x => x.EtkinlikId);
            // izolasyon sorgusu: WHERE EtkinlikId=@e AND KaynakEs=@es AND Durum='beklemede'
            e.HasIndex(x => new { x.EtkinlikId, x.KaynakEs, x.Durum });
            // hangi linkten geldi
            e.HasIndex(x => x.PaylasimBaglantiId);
            // FK iliskileri (0C dersi: model seviyesinde)
            e.HasOne<Etkinlik>().WithMany().HasForeignKey(x => x.EtkinlikId);
            e.HasOne<PaylasimBaglantisi>().WithMany().HasForeignKey(x => x.PaylasimBaglantiId);
        });

        // ---- katki_medyalari (opsiyonel foto; sema hazir, storage Asama 6) ----
        model.Entity<KatkiMedyasi>(e =>
        {
            e.ToTable("katki_medyalari");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("Id");
            e.Property(x => x.KatkiId).HasColumnName("KatkiId");
            e.Property(x => x.EtkinlikId).HasColumnName("EtkinlikId");
            e.Property(x => x.Tur).HasColumnName("Tur").IsRequired();
            e.Property(x => x.StorageKey).HasColumnName("StorageKey").IsRequired();
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
            e.HasIndex(x => x.KatkiId);
            e.HasIndex(x => x.EtkinlikId);
            // FK iliskileri
            e.HasOne<Katki>().WithMany().HasForeignKey(x => x.KatkiId);
            e.HasOne<Etkinlik>().WithMany().HasForeignKey(x => x.EtkinlikId);
        });

        // ---- cihazlar (Web Push abone; native hazir) ----
        model.Entity<Cihaz>(e =>
        {
            e.ToTable("cihazlar");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("Id");
            e.Property(x => x.KullaniciId).HasColumnName("KullaniciId");
            e.Property(x => x.Platform).HasColumnName("Platform").IsRequired();
            e.Property(x => x.PushToken).HasColumnName("PushToken").IsRequired();
            e.Property(x => x.PushP256dh).HasColumnName("PushP256dh");
            e.Property(x => x.PushAuth).HasColumnName("PushAuth");
            e.Property(x => x.CihazAdi).HasColumnName("CihazAdi");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
            e.Property(x => x.SonAktiflik).HasColumnName("SonAktiflik");
            e.HasIndex(x => x.KullaniciId);
            e.HasIndex(x => x.PushToken).IsUnique();
            e.HasOne<Kullanici>().WithMany().HasForeignKey(x => x.KullaniciId);
        });

        // ---- ertelenen_bildirimler (sessiz saat kuyrugu) ----
        model.Entity<ErtelenenBildirim>(e =>
        {
            e.ToTable("ertelenen_bildirimler");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("Id");
            e.Property(x => x.EtkinlikId).HasColumnName("EtkinlikId");
            e.Property(x => x.KullaniciId).HasColumnName("KullaniciId");
            e.Property(x => x.Baslik).HasColumnName("Baslik").IsRequired();
            e.Property(x => x.Govde).HasColumnName("Govde").IsRequired();
            e.Property(x => x.Url).HasColumnName("Url");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
            e.HasIndex(x => x.KullaniciId);
        });

        // ---- bildirimler (uygulama-ici bildirim; avatar cani) ----
        model.Entity<Bildirim>(e =>
        {
            e.ToTable("bildirimler");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("Id");
            e.Property(x => x.KullaniciId).HasColumnName("KullaniciId");
            e.Property(x => x.EtkinlikId).HasColumnName("EtkinlikId");
            e.Property(x => x.Tip).HasColumnName("Tip").IsRequired();
            e.Property(x => x.Baslik).HasColumnName("Baslik").IsRequired();
            e.Property(x => x.Mesaj).HasColumnName("Mesaj").IsRequired();
            e.Property(x => x.Url).HasColumnName("Url");
            e.Property(x => x.OkunduMu).HasColumnName("OkunduMu");
            e.Property(x => x.OkunmaZamani).HasColumnName("OkunmaZamani");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
            e.HasIndex(x => new { x.KullaniciId, x.OkunduMu });
            e.HasOne<Kullanici>().WithMany().HasForeignKey(x => x.KullaniciId);
        });

        // ---- sistem_metinleri (KVKK/gizlilik - super panelden yonetilir) ----
        model.Entity<SistemMetni>(e =>
        {
            e.ToTable("sistem_metinleri");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("Id");
            e.Property(x => x.Anahtar).HasColumnName("Anahtar").IsRequired();
            e.Property(x => x.Baslik).HasColumnName("Baslik").IsRequired();
            e.Property(x => x.Icerik).HasColumnName("Icerik").IsRequired();
            e.Property(x => x.YururlukTarihi).HasColumnName("YururlukTarihi");
            e.Property(x => x.GuncelleyenKullaniciId).HasColumnName("GuncelleyenKullaniciId");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
            e.Property(x => x.UpdatedAt).HasColumnName("updated_at");
            e.HasIndex(x => x.Anahtar).IsUnique();
        });

        // ---- kvkk_talepleri (ilgili kisi haklari) ----
        model.Entity<KvkkTalebi>(e =>
        {
            e.ToTable("kvkk_talepleri");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("Id");
            e.Property(x => x.KullaniciId).HasColumnName("KullaniciId");
            e.Property(x => x.Email).HasColumnName("Email").IsRequired();
            e.Property(x => x.Tip).HasColumnName("Tip").IsRequired();
            e.Property(x => x.Aciklama).HasColumnName("Aciklama").IsRequired();
            e.Property(x => x.Durum).HasColumnName("Durum").IsRequired();
            e.Property(x => x.SonucNotu).HasColumnName("SonucNotu");
            e.Property(x => x.SonYanitTarihi).HasColumnName("SonYanitTarihi");
            e.Property(x => x.IsleyenKullaniciId).HasColumnName("IsleyenKullaniciId");
            e.Property(x => x.IslemZamani).HasColumnName("IslemZamani");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
            e.HasIndex(x => x.Durum);
        });

        // ---- kurasyonlar (miras kurgusu - Belge 03 Akis 6) ----
        model.Entity<Kurasyon>(e =>
        {
            e.ToTable("kurasyonlar");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("Id");
            e.Property(x => x.EtkinlikId).HasColumnName("EtkinlikId");
            e.Property(x => x.Tema).HasColumnName("Tema").IsRequired();
            e.Property(x => x.KapakBaslik).HasColumnName("KapakBaslik");
            e.Property(x => x.KapakAltBaslik).HasColumnName("KapakAltBaslik");
            e.Property(x => x.KapakGorselUrl).HasColumnName("KapakGorselUrl");
            e.Property(x => x.IthafMetni).HasColumnName("IthafMetni");
            e.Property(x => x.KapanisMetni).HasColumnName("KapanisMetni");
            e.Property(x => x.GruplamaTipi).HasColumnName("GruplamaTipi").IsRequired();
            e.Property(x => x.TarihGoster).HasColumnName("TarihGoster");
            e.Property(x => x.Durum).HasColumnName("Durum").IsRequired();
            e.Property(x => x.TamamlanmaZamani).HasColumnName("TamamlanmaZamani");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
            e.Property(x => x.UpdatedAt).HasColumnName("updated_at");
            e.HasIndex(x => x.EtkinlikId).IsUnique(); // etkinlik basina TEK kurasyon
            e.HasOne<Etkinlik>().WithMany().HasForeignKey(x => x.EtkinlikId);
        });

        // ---- kurasyon_ogeleri (dilegin eserdeki yeri) ----
        model.Entity<KurasyonOgesi>(e =>
        {
            e.ToTable("kurasyon_ogeleri");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("Id");
            e.Property(x => x.KurasyonId).HasColumnName("KurasyonId");
            e.Property(x => x.KatkiId).HasColumnName("KatkiId");
            e.Property(x => x.Dahil).HasColumnName("Dahil");
            e.Property(x => x.Sira).HasColumnName("Sira");
            e.Property(x => x.BolumBasligi).HasColumnName("BolumBasligi");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
            e.HasIndex(x => new { x.KurasyonId, x.KatkiId }).IsUnique();
            e.HasIndex(x => new { x.KurasyonId, x.Sira });
            e.HasOne<Kurasyon>().WithMany().HasForeignKey(x => x.KurasyonId);
            e.HasOne<Katki>().WithMany().HasForeignKey(x => x.KatkiId);
        });

        // ---- kurasyon_ciktilari (surumleme - B6) ----
        model.Entity<KurasyonCiktisi>(e =>
        {
            e.ToTable("kurasyon_ciktilari");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("Id");
            e.Property(x => x.KurasyonId).HasColumnName("KurasyonId");
            e.Property(x => x.EtkinlikId).HasColumnName("EtkinlikId");
            e.Property(x => x.Tip).HasColumnName("Tip").IsRequired();
            e.Property(x => x.AyarlarAnlik).HasColumnName("AyarlarAnlik").HasColumnType("jsonb");
            e.Property(x => x.Filigranli).HasColumnName("Filigranli");
            e.Property(x => x.SayfaSayisi).HasColumnName("SayfaSayisi");
            e.Property(x => x.DilekSayisi).HasColumnName("DilekSayisi");
            e.Property(x => x.OlusturanKullaniciId).HasColumnName("OlusturanKullaniciId");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
            e.HasIndex(x => x.EtkinlikId);
        });

        // ---- etkinlik_gorselleri (cift gorselleri - en fazla 8) ----
        model.Entity<EtkinlikGorseli>(e =>
        {
            e.ToTable("etkinlik_gorselleri");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("Id");
            e.Property(x => x.EtkinlikId).HasColumnName("EtkinlikId");
            e.Property(x => x.DepolamaAnahtari).HasColumnName("DepolamaAnahtari").IsRequired();
            e.Property(x => x.Konum).HasColumnName("Konum").IsRequired();
            e.Property(x => x.Sira).HasColumnName("Sira");
            e.Property(x => x.Genislik).HasColumnName("Genislik");
            e.Property(x => x.Yukseklik).HasColumnName("Yukseklik");
            e.Property(x => x.Bayt).HasColumnName("Bayt");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
            e.HasIndex(x => new { x.EtkinlikId, x.Sira });
            e.HasOne<Etkinlik>().WithMany().HasForeignKey(x => x.EtkinlikId);
        });
    }
}
