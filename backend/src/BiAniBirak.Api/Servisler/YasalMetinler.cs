using BiAniBirak.Api.Data;
using BiAniBirak.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace BiAniBirak.Api.Servisler;

// YASAL METINLER - kayit aninda onaylanan metinlerin TEK KAYNAGI.
//
// Bu metinler DB'de durur (super panelden guncellenebilir) ama ILK hallerini burada
// tutariz: bos bir veritabaninda kimse kaydolamazdi, cunku onaylanacak metin yoktu.
//
// Metin degistiginde hash degisir; eski onaylar eski hash'i tasir. Yani "kullanici
// neyi onayladi" sorusu her zaman yanitlanabilir.
public static class YasalMetinler
{
    // Yururluk tarihi: metin icerigi degistiginde BU TARIH DE guncellenmelidir -
    // yoksa iki farkli metin ayni surum damgasini tasir ve kanit zinciri bulanir.
    private static readonly DateTimeOffset Yururluk =
        new(2026, 1, 1, 0, 0, 0, TimeSpan.Zero);

    public const string KullanimKosullariMetni = @"BiAnıBırak Kullanım Koşulları

1. HİZMETİN TANIMI

BiAnıBırak, bir etkinlik (düğün, nişan, nikah ve benzeri) için davetlilerden dilek ve anı toplayan; toplananları baskıya hazır bir anı defterine dönüştüren süreli bir dijital hizmettir.

Hizmet SÜRELİDİR. Kalıcı bir arşiv, bulut depolama veya yedekleme hizmeti DEĞİLDİR ve bu şekilde sunulmamaktadır.

2. SÜRE VE İMHA - EN ÖNEMLİ MADDE

Her defter için, defterin kurulum tarihinden bağımsız olarak, aşağıdaki süreler kesin olarak uygulanır:

  a) Özel gün (etkinlik tarihi) + 30 gün: Davetli girişleri kapanır. Yeni dilek eklenemez.
  b) Özel gün + 37 gün: Defter ve defterle ilgili TÜM VERİLER kalıcı olarak imha edilir.

İMHA GERİ ALINAMAZ. İmha edilen veriler hiçbir şekilde, hiçbir gerekçeyle geri getirilemez. Bu bir tercih değil, teknik bir gerçektir: veriler sunucudan ve yedeklerden silinir.

Kullanıcı, bu süreyi peşinen kabul ederek hizmete kaydolur.

3. KULLANICININ İNDİRME SORUMLULUĞU

Anı defterinin baskıya hazır nüshasını indirmek, TAMAMEN KULLANICININ SORUMLULUĞUNDADIR.

BiAnıBırak, kullanıcıyı bu konuda defalarca uyarır:
  - Kayıt/kurulum anında süreci anlatan bir bildirim gönderilir.
  - Özel günden sonraki 2, 10, 15, 20, 25 ve 30. günlerde hatırlatma gönderilir.
  - Son 7 gün boyunca HER GÜN hatırlatma gönderilir.
  - İmhaya 14 gün ve 3 gün kala ayrıca uyarı gönderilir.

Bu uyarılara rağmen eserini indirmeyen kullanıcı, imha sonrası herhangi bir hak talebinde bulunamaz. Uyarıların gönderildiği, sistem kayıtlarında (denetim günlüğü) tutulur.

Kullanıcı; bildirim izni vermemesi, bildirimleri kapatması, uygulamaya girmemesi veya e-postalarını okumaması hallerinde de aynı sorumluluğu taşır. Uyarı gönderme yükümlülüğümüz, uyarının okunmasını sağlama yükümlülüğü DEĞİLDİR.

4. ÖDEME, İNDİRME VE İADE

Dilek toplamak, defteri kurmak, düzenlemek ve filigranlı önizleme almak ÜCRETSİZDİR.

Ücret yalnızca filigransız, baskıya hazır nüshanın indirilmesi için alınır.

Ödeme yapılmış olması, imha süresini UZATMAZ. Ödeme yapan kullanıcı da 37. günün sonuna kadar eserini indirmekle yükümlüdür.

Ödeme yapıp eserini indirmeyen kullanıcının verileri, süre sonunda diğer tüm defterlerle aynı şekilde imha edilir. Bu durumda:
  - İmha edilmiş veri geri getirilemez (teknik imkansızlık).
  - Hizmet eksiksiz sunulmuş sayılır: indirme yetkisi verilmiş, defter hazır tutulmuş, kullanıcı defalarca uyarılmıştır.
  - Kullanıcının indirmeme tercihi, hizmetin ifa edilmediği anlamına gelmez.

İade koşulları: Ödeme sonrası indirme yetkisi anında doğar. 6502 sayılı Tüketicinin Korunması Hakkında Kanun'un 15. maddesi ve Mesafeli Sözleşmeler Yönetmeliği'nin 15/1-ğ bendi uyarınca, elektronik ortamda anında ifa edilen ve tüketiciye anında teslim edilen gayrimaddi mallarda cayma hakkı bulunmamaktadır. Kullanıcı, ödeme anında bu hususu kabul eder.

Teknik bir arıza nedeniyle indirme gerçekleşemediyse, kullanıcı süre içinde bize başvurmakla yükümlüdür; bu durumda sorun giderilir veya ödeme iade edilir.

5. YEDEKLEME SORUMLULUĞU

İndirilen dosyanın saklanması, yedeklenmesi ve korunması kullanıcının sorumluluğundadır. BiAnıBırak, indirme sonrası dosyanın kaybı, bozulması veya erişilemez hale gelmesinden sorumlu değildir.

Kullanıcının indirdiği dosyayı kaybetmesi, imha süresi geçtikten sonra yeniden indirme hakkı doğurmaz.

6. İÇERİK SORUMLULUĞU

Davetliler tarafından bırakılan dilek ve fotoğrafların içeriğinden, bunları bırakan kişiler sorumludur. Çift, kendi bağlantısından gelen içerikleri onaylama veya reddetme yetkisine sahiptir; onaylanan içerik deftere girer.

BiAnıBırak, içerik denetimi yapmayı taahhüt etmez; ancak hukuka aykırı içerik bildirimi halinde ilgili içeriği kaldırma hakkını saklı tutar.

7. HİZMETİN SÜREKLİLİĞİ

BiAnıBırak, hizmeti kesintisiz sunmak için makul çabayı gösterir; ancak teknik bakım, arıza veya mücbir sebep hallerinde geçici kesinti yaşanabilir. Kesinti süresi, imha takvimini kendiliğinden uzatmaz; ancak kesinti kullanıcının indirmesini fiilen engellemişse, kullanıcının süre içinde yaptığı başvuru üzerine makul bir ek süre tanınır.

8. UYUŞMAZLIK

İşbu koşullar Türkiye Cumhuriyeti hukukuna tabidir. Uyuşmazlıklarda Konya Mahkemeleri ve İcra Daireleri yetkilidir. Tüketici sıfatını haiz kullanıcılar için Tüketici Hakem Heyetleri ve Tüketici Mahkemeleri'nin yetkisi saklıdır.

9. KABUL

Kullanıcı, hesap oluşturarak işbu Kullanım Koşulları'nı okuduğunu, anladığını ve kabul ettiğini beyan eder. Bu kabul, onay anındaki metnin içeriği ile birlikte (özeti/parmak izi alınarak) sistem kayıtlarında saklanır.

Özellikle 2. ve 3. maddeleri (süre, imha ve indirme sorumluluğu) ayrıca okuduğunu ve anladığını kabul eder.";

    public const string KvkkAydinlatmaMetni = @"KVKK Aydınlatma Metni

Veri Sorumlusu: BiAnıBırak (Musa Deveci - Konya)

1. İŞLENEN KİŞİSEL VERİLER

Çift (hesap sahibi) için: ad, e-posta adresi, şifre özeti (hash), etkinlik bilgileri, yüklenen görseller, IP adresi ve oturum kayıtları.

Davetli için: bıraktığı ad (isteğe bağlı), ilişki bilgisi, dilek metni, varsa fotoğraf ve iletişim bilgisi (isteğe bağlı). Davetlinin hesap açması veya kimlik bilgisi vermesi ZORUNLU DEĞİLDİR.

2. İŞLEME AMACI VE HUKUKİ SEBEBİ

Veriler; anı defterinin oluşturulması, dileklerin toplanması ve baskıya hazır esere dönüştürülmesi amacıyla işlenir.

Hukuki sebep: sözleşmenin kurulması ve ifası (KVKK m.5/2-c) ile açık rıza (m.5/1). Davetlinin verisi, açık rızasına dayanılarak işlenir.

3. SAKLAMA SÜRESİ VE İMHA - KRİTİK

Veriler, etkinlik tarihinden itibaren en fazla 37 gün saklanır. Bu sürenin sonunda:
  - Tüm dilekler, fotoğraflar, iletişim bilgileri ve ilgili kayıtlar KALICI OLARAK İMHA EDİLİR.
  - İmha geri alınamaz; imha edilen veri hiçbir şekilde geri getirilemez.
  - Yalnızca ""bir defter vardı ve şu tarihte imha edildi"" bilgisi (kişisel veri içermeyen) hukuki kanıt olarak saklanır.

Bu, KVKK m.7 ve m.4/2-d (""gerektiğinden uzun süre saklamama"") ilkesinin gereğidir. Verinizi sonsuza dek saklamıyoruz - saklamak için meşru bir sebebimiz yok.

Kullanım onaylarına ilişkin kayıtlar (onay zamanı, onaylanan metnin özeti, IP), bir hakkın tesisi ve korunması için zorunlu olduğundan (KVKK m.5/2-e) hesap silinse dahi saklanır. Bu kayıtlar ad, e-posta veya iletişim bilgisi İÇERMEZ.

4. HAKLARINIZ

KVKK m.11 uyarınca; verilerinize erişme, düzeltilmesini, silinmesini veya anonim hale getirilmesini isteme, işlemeye itiraz etme ve zararınızın giderilmesini talep etme haklarına sahipsiniz.

Başvurularınızı uygulama içindeki KVKK bölümünden veya veri sorumlusuna yazılı olarak iletebilirsiniz. Başvurular en geç 30 gün içinde sonuçlandırılır.

ÖNEMLİ: İmha süresi dolduktan sonra yapılan veri erişim talepleri, verinin fiilen mevcut olmaması nedeniyle karşılanamaz. Bu bir ret değil, teknik imkansızlıktır. Verinizi süresi içinde indirmeniz gerekir.

5. GÜVENLİK

Veriler şifreli bağlantı (HTTPS) üzerinden iletilir. Şifreler geri döndürülemez şekilde özetlenir. Erişim yetkileri sınırlandırılmıştır; sistem yöneticisinin destek amaçlı erişimleri denetim kaydına yazılır.

6. AKTARIM

Verileriniz, hizmetin sunulması için gerekli olan altyapı sağlayıcıları dışında üçüncü kişilere aktarılmaz; pazarlama amacıyla satılmaz veya paylaşılmaz.";

    // IDEMPOTENT SEED: metin yoksa olustur, VARSA DOKUNMA.
    //
    // "Varsa dokunma" kritik: super panelden metni guncelledigin an, bir sonraki
    // restart onu geri EZERSE, yaptigin degisiklik sessizce kaybolur - ve daha kotusu,
    // kullanicilarin onayladigi hash ile DB'deki metin ayrisir.
    public static async Task SeedAsync(BiAniBirakDbContext db, CancellationToken ct = default)
    {
        var mevcut = await db.SistemMetinleri
            .Select(m => m.Anahtar)
            .ToListAsync(ct);

        var eklenecek = new List<SistemMetni>();

        if (!mevcut.Contains("kvkk_aydinlatma"))
            eklenecek.Add(Olustur("kvkk_aydinlatma", "KVKK Aydınlatma Metni", KvkkAydinlatmaMetni));

        if (!mevcut.Contains("kullanim_kosullari"))
            eklenecek.Add(Olustur("kullanim_kosullari", "Kullanım Koşulları", KullanimKosullariMetni));

        if (eklenecek.Count == 0) return;

        db.SistemMetinleri.AddRange(eklenecek);
        await db.SaveChangesAsync(ct);
    }

    private static SistemMetni Olustur(string anahtar, string baslik, string icerik)
    {
        var m = new SistemMetni
        {
            Id = Guid.NewGuid(),
            Anahtar = anahtar,
            Baslik = baslik,
            Icerik = icerik,
            YururlukTarihi = Yururluk,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow,
        };

        // Hash + surum damgasi. Kanit zincirinin ilk halkasi burada kurulur.
        OnayServisi.MetniDamgala(m);
        return m;
    }
}
