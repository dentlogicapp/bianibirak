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
            e.Property(x => x.Mesaj).HasColumnName("Mesaj").IsRequired();
            e.Property(x => x.Tur).HasColumnName("Tur").IsRequired();
            e.Property(x => x.Durum).HasColumnName("Durum").IsRequired();
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
    }
}
