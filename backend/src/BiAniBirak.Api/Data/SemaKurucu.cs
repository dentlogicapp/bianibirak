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
            "EtkinlikTarihi" timestamptz NOT NULL,
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

        CREATE TABLE IF NOT EXISTS paylasim_baglantilari (
            "Id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            "EtkinlikId" uuid NOT NULL REFERENCES etkinlikler ("Id"),
            "Es" text NOT NULL,
            "Token" text NOT NULL,
            "Aktif" boolean NOT NULL DEFAULT true,
            created_at timestamptz NOT NULL DEFAULT now()
        );
        CREATE INDEX IF NOT EXISTS ix_paylasim_baglantilari_etkinlik ON paylasim_baglantilari ("EtkinlikId");
        CREATE UNIQUE INDEX IF NOT EXISTS ux_paylasim_baglantilari_token ON paylasim_baglantilari ("Token");
        CREATE UNIQUE INDEX IF NOT EXISTS ux_paylasim_baglantilari_etkinlik_es ON paylasim_baglantilari ("EtkinlikId", "Es");

        CREATE TABLE IF NOT EXISTS etkinlik_ayarlari (
            "Id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            "EtkinlikId" uuid NOT NULL REFERENCES etkinlikler ("Id"),
            "MarkaKapak" text NULL,
            "Tema" text NULL,
            "KarsilamaMetni" text NULL,
            "PromptMetni" text NULL,
            "KapanisPencereGun" integer NOT NULL DEFAULT 30,
            "Ayarlar" jsonb NULL,
            updated_at timestamptz NOT NULL DEFAULT now()
        );
        CREATE UNIQUE INDEX IF NOT EXISTS ux_etkinlik_ayarlari_etkinlik ON etkinlik_ayarlari ("EtkinlikId");

        CREATE TABLE IF NOT EXISTS katkilar (
            "Id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            "EtkinlikId" uuid NOT NULL REFERENCES etkinlikler ("Id"),
            "PaylasimBaglantiId" uuid NOT NULL REFERENCES paylasim_baglantilari ("Id"),
            "KaynakEs" text NOT NULL,
            "DavetliAd" text NOT NULL,
            "DavetliEmail" text NOT NULL,
            "DavetliTelefon" text NOT NULL,
            "Mesaj" text NOT NULL,
            "Tur" text NOT NULL,
            "Durum" text NOT NULL,
            "OnaylayanKullaniciId" uuid NULL,
            "OnayZamani" timestamptz NULL,
            "DuzeltmeNotu" text NULL,
            "DuzeltmeSablonId" uuid NULL,
            "DuzeltmeTokeni" text NULL,
            "DuzeltmeTalepZamani" timestamptz NULL,
            created_at timestamptz NOT NULL DEFAULT now(),
            updated_at timestamptz NOT NULL DEFAULT now()
        );
        CREATE INDEX IF NOT EXISTS ix_katkilar_etkinlik ON katkilar ("EtkinlikId");
        CREATE INDEX IF NOT EXISTS ix_katkilar_izolasyon ON katkilar ("EtkinlikId", "KaynakEs", "Durum");
        CREATE INDEX IF NOT EXISTS ix_katkilar_baglanti ON katkilar ("PaylasimBaglantiId");

        CREATE TABLE IF NOT EXISTS katki_medyalari (
            "Id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            "KatkiId" uuid NOT NULL REFERENCES katkilar ("Id"),
            "EtkinlikId" uuid NOT NULL REFERENCES etkinlikler ("Id"),
            "Tur" text NOT NULL,
            "StorageKey" text NOT NULL,
            created_at timestamptz NOT NULL DEFAULT now()
        );
        CREATE INDEX IF NOT EXISTS ix_katki_medyalari_katki ON katki_medyalari ("KatkiId");
        CREATE INDEX IF NOT EXISTS ix_katki_medyalari_etkinlik ON katki_medyalari ("EtkinlikId");

        CREATE TABLE IF NOT EXISTS cihazlar (
            "Id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            "KullaniciId" uuid NOT NULL REFERENCES kullanicilar ("Id"),
            "Platform" text NOT NULL DEFAULT 'web',
            "PushToken" text NOT NULL,
            "PushP256dh" text NULL,
            "PushAuth" text NULL,
            "CihazAdi" text NULL,
            created_at timestamptz NOT NULL DEFAULT now(),
            "SonAktiflik" timestamptz NOT NULL DEFAULT now()
        );
        CREATE INDEX IF NOT EXISTS ix_cihazlar_kullanici ON cihazlar ("KullaniciId");
        CREATE UNIQUE INDEX IF NOT EXISTS ux_cihazlar_pushtoken ON cihazlar ("PushToken");

        CREATE TABLE IF NOT EXISTS ertelenen_bildirimler (
            "Id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            "EtkinlikId" uuid NULL,
            "KullaniciId" uuid NOT NULL,
            "Baslik" text NOT NULL,
            "Govde" text NOT NULL,
            "Url" text NULL,
            created_at timestamptz NOT NULL DEFAULT now()
        );
        CREATE INDEX IF NOT EXISTS ix_ertelenen_bildirimler_kullanici ON ertelenen_bildirimler ("KullaniciId");

        -- Uygulama-ici bildirimler (avatar cani; push'tan bagimsiz)
        CREATE TABLE IF NOT EXISTS bildirimler (
            "Id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            "KullaniciId" uuid NOT NULL REFERENCES kullanicilar ("Id"),
            "EtkinlikId" uuid NULL,
            "Tip" text NOT NULL,
            "Baslik" text NOT NULL,
            "Mesaj" text NOT NULL,
            "Url" text NULL,
            "OkunduMu" boolean NOT NULL DEFAULT false,
            "OkunmaZamani" timestamptz NULL,
            created_at timestamptz NOT NULL DEFAULT now()
        );
        CREATE INDEX IF NOT EXISTS ix_bildirimler_kullanici_okundu ON bildirimler ("KullaniciId", "OkunduMu");

        -- Push: kullanicilara sessiz saat kolonlari (idempotent)
        ALTER TABLE kullanicilar ADD COLUMN IF NOT EXISTS "SessizSaatAktif" boolean NOT NULL DEFAULT false;
        ALTER TABLE kullanicilar ADD COLUMN IF NOT EXISTS "SessizSaatBaslangic" text NULL;
        ALTER TABLE kullanicilar ADD COLUMN IF NOT EXISTS "SessizSaatBitis" text NULL;
        -- Profilim: cinsiyet kolonu (idempotent)
        ALTER TABLE kullanicilar ADD COLUMN IF NOT EXISTS "Cinsiyet" text NULL;

        -- Etkinlik & Gorunum: sayac kolonlari (idempotent)
        ALTER TABLE etkinlik_ayarlari ADD COLUMN IF NOT EXISTS "SayacAktif" boolean NOT NULL DEFAULT true;
        ALTER TABLE etkinlik_ayarlari ADD COLUMN IF NOT EXISTS "SayacAktifCumle" text NULL;
        ALTER TABLE etkinlik_ayarlari ADD COLUMN IF NOT EXISTS "SayacBittiCumle" text NULL;

        -- 0D.2 gecis: EtkinlikTarihi date -> timestamptz (idempotent; zaten timestamptz ise no-op).
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'etkinlikler'
                  AND column_name = 'EtkinlikTarihi'
                  AND data_type = 'date'
            ) THEN
                ALTER TABLE etkinlikler
                    ALTER COLUMN "EtkinlikTarihi" TYPE timestamptz
                    USING "EtkinlikTarihi"::timestamptz;
            END IF;
        END $$;
        """;

    public static void Uygula(BiAniBirakDbContext db)
    {
        db.Database.ExecuteSqlRaw(Ddl);
    }
}
