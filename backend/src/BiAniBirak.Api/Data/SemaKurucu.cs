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
        """;

    public static void Uygula(BiAniBirakDbContext db)
    {
        db.Database.ExecuteSqlRaw(Ddl);
    }
}
