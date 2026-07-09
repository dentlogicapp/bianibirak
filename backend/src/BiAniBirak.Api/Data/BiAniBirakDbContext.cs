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
    }
}
