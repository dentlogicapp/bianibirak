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
        -- Defense in depth: ayni kullanici ayni deftere IKI KEZ uye olamaz (es1 + es2 ayni kisi olamaz).
        -- Kodda kontrol var (DavetKabul 409); bu DB seviyesinde ikinci katman.
        CREATE UNIQUE INDEX IF NOT EXISTS ux_etkinlik_uyelikleri_etkinlik_kullanici
            ON etkinlik_uyelikleri ("EtkinlikId", "KullaniciId");

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

        -- ================= SUPER PANEL =================
        -- Sistem yoneticisi yetkisi (filtreli index: yalniz super adminler)
        -- NOT: kolon adi super_admin (snake_case) - DbContext eslemesi boyle. PascalCase DEGIL.
        ALTER TABLE kullanicilar ADD COLUMN IF NOT EXISTS super_admin boolean NOT NULL DEFAULT false;
        CREATE INDEX IF NOT EXISTS ix_kullanicilar_super_admin
            ON kullanicilar (super_admin) WHERE super_admin = true;
        -- Yanlislikla acilan PascalCase kolonu varsa degerini tasi ve dusur (idempotent)
        DO $$
        BEGIN
            IF EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_name='kullanicilar' AND column_name='SuperAdmin') THEN
                UPDATE kullanicilar SET super_admin = true WHERE "SuperAdmin" = true;
                ALTER TABLE kullanicilar DROP COLUMN "SuperAdmin";
            END IF;
        END $$;

        -- Etkinlik: cop kutusu (iki asamali silme) + dondurma (kotuye kullanim)
        ALTER TABLE etkinlikler ADD COLUMN IF NOT EXISTS "SilindiMi" boolean NOT NULL DEFAULT false;
        ALTER TABLE etkinlikler ADD COLUMN IF NOT EXISTS "SilinmeZamani" timestamptz NULL;
        ALTER TABLE etkinlikler ADD COLUMN IF NOT EXISTS "Donduruldu" boolean NOT NULL DEFAULT false;
        CREATE INDEX IF NOT EXISTS ix_etkinlikler_silindi ON etkinlikler ("SilindiMi");

        -- Katki: moderasyon kaldirma (cop kutusu, geri alinabilir)
        ALTER TABLE katkilar ADD COLUMN IF NOT EXISTS "SilindiMi" boolean NOT NULL DEFAULT false;
        ALTER TABLE katkilar ADD COLUMN IF NOT EXISTS "SilinmeZamani" timestamptz NULL;
        ALTER TABLE katkilar ADD COLUMN IF NOT EXISTS "SilenKullaniciId" uuid NULL;
        CREATE INDEX IF NOT EXISTS ix_katkilar_silindi ON katkilar ("SilindiMi");

        -- KVKK / gizlilik metinleri (hardcoded yasak: sayfalar buradan okur)
        CREATE TABLE IF NOT EXISTS sistem_metinleri (
            "Id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            "Anahtar" text NOT NULL,
            "Baslik" text NOT NULL,
            "Icerik" text NOT NULL,
            "YururlukTarihi" timestamptz NOT NULL DEFAULT now(),
            "GuncelleyenKullaniciId" uuid NULL,
            created_at timestamptz NOT NULL DEFAULT now(),
            updated_at timestamptz NOT NULL DEFAULT now()
        );
        CREATE UNIQUE INDEX IF NOT EXISTS ux_sistem_metinleri_anahtar ON sistem_metinleri ("Anahtar");

        -- KVKK ilgili kisi talepleri (erisim/duzeltme/silme/itiraz - 30 gun yasal sure)
        CREATE TABLE IF NOT EXISTS kvkk_talepleri (
            "Id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            "KullaniciId" uuid NULL,
            "Email" text NOT NULL,
            "Tip" text NOT NULL,
            "Aciklama" text NOT NULL,
            "Durum" text NOT NULL DEFAULT 'yeni',
            "SonucNotu" text NULL,
            "SonYanitTarihi" timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
            "IsleyenKullaniciId" uuid NULL,
            "IslemZamani" timestamptz NULL,
            created_at timestamptz NOT NULL DEFAULT now()
        );
        CREATE INDEX IF NOT EXISTS ix_kvkk_talepleri_durum ON kvkk_talepleri ("Durum");

        -- ================= KURASYON (Asama 6 - Kuzey Yildizi) =================
        -- Toplanani ESERE ceviren katman. Katkilar dokunulmaz (ozgunluk - Karar 2).
        CREATE TABLE IF NOT EXISTS kurasyonlar (
            "Id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            "EtkinlikId" uuid NOT NULL REFERENCES etkinlikler ("Id"),
            "Tema" text NOT NULL DEFAULT 'klasik',
            "KapakBaslik" text NULL,
            "KapakAltBaslik" text NULL,
            "KapakGorselUrl" text NULL,
            "IthafMetni" text NULL,
            "KapanisMetni" text NULL,
            "GruplamaTipi" text NOT NULL DEFAULT 'taraf',
            "Durum" text NOT NULL DEFAULT 'taslak',
            "TamamlanmaZamani" timestamptz NULL,
            created_at timestamptz NOT NULL DEFAULT now(),
            updated_at timestamptz NOT NULL DEFAULT now()
        );
        CREATE UNIQUE INDEX IF NOT EXISTS ux_kurasyonlar_etkinlik ON kurasyonlar ("EtkinlikId");

        CREATE TABLE IF NOT EXISTS kurasyon_ogeleri (
            "Id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            "KurasyonId" uuid NOT NULL REFERENCES kurasyonlar ("Id") ON DELETE CASCADE,
            "KatkiId" uuid NOT NULL REFERENCES katkilar ("Id") ON DELETE CASCADE,
            "Dahil" boolean NOT NULL DEFAULT true,
            "Sira" integer NOT NULL DEFAULT 0,
            "BolumBasligi" text NULL,
            created_at timestamptz NOT NULL DEFAULT now()
        );
        CREATE UNIQUE INDEX IF NOT EXISTS ux_kurasyon_ogeleri_kurasyon_katki
            ON kurasyon_ogeleri ("KurasyonId", "KatkiId");
        CREATE INDEX IF NOT EXISTS ix_kurasyon_ogeleri_sira
            ON kurasyon_ogeleri ("KurasyonId", "Sira");

        CREATE TABLE IF NOT EXISTS kurasyon_ciktilari (
            "Id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            "KurasyonId" uuid NOT NULL,
            "EtkinlikId" uuid NOT NULL,
            "Tip" text NOT NULL,
            "AyarlarAnlik" jsonb NOT NULL DEFAULT '{}'::jsonb,
            "Filigranli" boolean NOT NULL DEFAULT false,
            "SayfaSayisi" integer NOT NULL DEFAULT 0,
            "DilekSayisi" integer NOT NULL DEFAULT 0,
            "OlusturanKullaniciId" uuid NULL,
            created_at timestamptz NOT NULL DEFAULT now()
        );
        CREATE INDEX IF NOT EXISTS ix_kurasyon_ciktilari_etkinlik
            ON kurasyon_ciktilari ("EtkinlikId");

        -- Cift gorselleri (en fazla 8 - uygulama seviyesinde kontrol)
        CREATE TABLE IF NOT EXISTS etkinlik_gorselleri (
            "Id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            "EtkinlikId" uuid NOT NULL REFERENCES etkinlikler ("Id") ON DELETE CASCADE,
            "DepolamaAnahtari" text NOT NULL,
            "Konum" text NOT NULL DEFAULT 'galeri',
            "Sira" integer NOT NULL DEFAULT 0,
            "Genislik" integer NOT NULL DEFAULT 0,
            "Yukseklik" integer NOT NULL DEFAULT 0,
            "Bayt" bigint NOT NULL DEFAULT 0,
            created_at timestamptz NOT NULL DEFAULT now()
        );
        CREATE INDEX IF NOT EXISTS ix_etkinlik_gorselleri_sira
            ON etkinlik_gorselleri ("EtkinlikId", "Sira");

        -- Davetli: iliski (kim oldugunu hatirlatir) + tek fotograf
        ALTER TABLE katkilar ADD COLUMN IF NOT EXISTS "DavetliIliski" text NOT NULL DEFAULT '';
        ALTER TABLE katkilar ADD COLUMN IF NOT EXISTS "FotoAnahtari" text NULL;
        ALTER TABLE katkilar ADD COLUMN IF NOT EXISTS "FotoGenislik" integer NOT NULL DEFAULT 0;
        ALTER TABLE katkilar ADD COLUMN IF NOT EXISTS "FotoYukseklik" integer NOT NULL DEFAULT 0;

        -- Kurasyon: QR koprusu KALDIRILDI (Musa karari); tarih gosterimi eklendi
        ALTER TABLE kurasyonlar ADD COLUMN IF NOT EXISTS "TarihGoster" boolean NOT NULL DEFAULT true;
        ALTER TABLE kurasyonlar DROP COLUMN IF EXISTS "QrKoprusuAktif";

        -- Altyazi kaldirildi (Musa karari): gorsel kendi basina konusur
        ALTER TABLE etkinlik_gorselleri DROP COLUMN IF EXISTS "Altyazi";

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

    // DDL'yi HAM olarak calistirir.
    //
    // NEDEN ExecuteSqlRaw DEGIL: EF Core'un ExecuteSqlRaw'i SQL'i String.Format'tan
    // gecirir. DDL'de gecen her suslu parantez bir format yer tutucusu sanilir; ornegin
    // jsonb bos-nesne varsayilani FormatException firlatir ("Expected an ASCII digit").
    // Ham ADO.NET komutu boyle bir donusum YAPMAZ - jsonb varsayilanlari, PL/pgSQL
    // bloklari ve suslu parantez iceren her ifade guvenle yazilabilir.
    public static void Uygula(BiAniBirakDbContext db)
    {
        var baglanti = db.Database.GetDbConnection();
        var acikMiydi = baglanti.State == System.Data.ConnectionState.Open;
        if (!acikMiydi) baglanti.Open();
        try
        {
            using var komut = baglanti.CreateCommand();
            komut.CommandText = Ddl;
            komut.CommandTimeout = 120; // buyuk semada guvenli pay
            komut.ExecuteNonQuery();
        }
        finally
        {
            if (!acikMiydi) baglanti.Close();
        }
    }
}
