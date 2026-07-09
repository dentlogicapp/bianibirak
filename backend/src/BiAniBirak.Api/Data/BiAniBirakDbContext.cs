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
            e.Property(x => x.SuperAdmin).HasColumnName("super_admin");
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
            e.Property(x => x.EtkinlikTarihi).HasColumnName("EtkinlikTarihi").HasColumnType("date");
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
        });
    }
}
