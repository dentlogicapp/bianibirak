namespace BiAniBirak.Api.Entities;

// SIK SORULAN SORU / DESTEK MADDESI.
//
// UC KADEMELI AGAC: Kategori -> AltKategori -> (soru, cevap)
//   Ornek: "Dilek Toplama" -> "Davetli Sorunlari" -> "Davetlim dilek birakamiyor"
//
// NEDEN AGAC: 50+ maddeyi duz listede aramak, aramamaktan beterdir. Kullanici once
// KONUYU daraltir, sonra sorusunu bulur. Klasorleme, destek yukunu dusuren en ucuz
// yatirimdir - insanlarin cogu sorusunu sormadan once yanitini bulmayi TERCIH EDER.
//
// SUPER YONETICI DUZENLER: icerik koda gomulu DEGILDIR (yalnizca ilk tohum). Ihtiyac
// dogdukca panelden guncellenir - tipki KVKK metinleri gibi. Boylece her yeni destek
// dalgasindan sonra bilgi tabani buyur ve ayni soru bir daha sorulmaz.
public class SssMaddesi
{
    public Guid Id { get; set; }

    // En genis konu basligi (agacin ilk dali).
    public string Kategori { get; set; } = string.Empty;

    // Daha dar konu (agacin ikinci dali).
    public string AltKategori { get; set; } = string.Empty;

    public string Soru { get; set; } = string.Empty;
    public string Cevap { get; set; } = string.Empty;

    // Ayni dal icinde gorunum sirasi.
    public int Sira { get; set; }

    // Yayindan kaldirmak icin: silmek yerine PASIFE alinir (gecmis referanslar bozulmaz).
    public bool Aktif { get; set; } = true;

    // Kac kez acildi - hangi konunun gercekten sorun oldugunu VERI ile gosterir.
    public int GoruntulenmeSayisi { get; set; }

    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}
