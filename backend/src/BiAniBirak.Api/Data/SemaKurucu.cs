using Microsoft.EntityFrameworkCore;

namespace BiAniBirak.Api.Data;

// Idempotent sema: her acilista guvenle calisir (IF NOT EXISTS). Sonuc degismez.
// Tek-seferlik veri tasima YOK (instruction). Ham SQL - EF migration dosyasi degil.
public static class SemaKurucu
{
    private const string Ddl = """
        CREATE TABLE IF NOT EXISTS kullanicilar (
            "Id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            email text NOT NULL,
            sifre_hash text NOT NULL,
            "Ad" text NOT NULL,
            super_admin boolean NOT NULL DEFAULT false,
            created_at timestamptz NOT NULL DEFAULT now(),
            updated_at timestamptz NOT NULL DEFAULT now(),
            deleted_at timestamptz NULL
        );
        CREATE UNIQUE INDEX IF NOT EXISTS ux_kullanicilar_email ON kullanicilar (email);

        CREATE TABLE IF NOT EXISTS denetim_gunlukleri (
            "Id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            "EtkinlikId" uuid NULL,
            "KullaniciId" uuid NULL,
            "Eylem" text NOT NULL,
            "Varlik" text NOT NULL,
            "VarlikId" uuid NULL,
            "DegisenAlanlar" jsonb NULL,
            created_at timestamptz NOT NULL DEFAULT now()
        );

        CREATE TABLE IF NOT EXISTS etkinlikler (
            "Id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            "Tur" text NOT NULL,
            "Es1Ad" text NOT NULL,
            "Es2Ad" text NOT NULL,
            "EtkinlikTarihi" date NOT NULL,
            "AcilisTarihi" timestamptz NOT NULL,
            "KapanisTarihi" timestamptz NOT NULL,
            "Durum" text NOT NULL,
            "UstOrganizatorId" uuid NULL,
            created_at timestamptz NOT NULL DEFAULT now(),
            updated_at timestamptz NOT NULL DEFAULT now(),
            deleted_at timestamptz NULL
        );
        CREATE INDEX IF NOT EXISTS ix_etkinlikler_ust_organizator ON etkinlikler ("UstOrganizatorId");

        CREATE TABLE IF NOT EXISTS etkinlik_uyelikleri (
            "Id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            "EtkinlikId" uuid NOT NULL REFERENCES etkinlikler ("Id"),
            "KullaniciId" uuid NOT NULL REFERENCES kullanicilar ("Id"),
            "Rol" text NOT NULL,
            created_at timestamptz NOT NULL DEFAULT now()
        );
        CREATE INDEX IF NOT EXISTS ix_etkinlik_uyelikleri_etkinlik ON etkinlik_uyelikleri ("EtkinlikId");
        CREATE INDEX IF NOT EXISTS ix_etkinlik_uyelikleri_kullanici ON etkinlik_uyelikleri ("KullaniciId");
        CREATE UNIQUE INDEX IF NOT EXISTS ux_etkinlik_uyelikleri_etkinlik_rol ON etkinlik_uyelikleri ("EtkinlikId", "Rol");

        CREATE TABLE IF NOT EXISTS uye_davetleri (
            "Id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            "EtkinlikId" uuid NOT NULL REFERENCES etkinlikler ("Id"),
            "Token" text NOT NULL,
            "HedefRol" text NOT NULL,
            "Durum" text NOT NULL,
            created_at timestamptz NOT NULL DEFAULT now()
        );
        CREATE INDEX IF NOT EXISTS ix_uye_davetleri_etkinlik ON uye_davetleri ("EtkinlikId");
        CREATE UNIQUE INDEX IF NOT EXISTS ux_uye_davetleri_token ON uye_davetleri ("Token");
        """;

    public static void Uygula(BiAniBirakDbContext db)
    {
        db.Database.ExecuteSqlRaw(Ddl);
    }
}
