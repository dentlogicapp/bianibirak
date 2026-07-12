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

Dilek toplamak, defteri kurmak, düzenlemek ve defterin tamamını ekranda sayfa sayfa görmek ÜCRETSİZDİR.

Ücret yalnızca baskıya hazır nüshanın (yüksek çözünürlüklü, basılabilir dosya) indirilmesi için alınır. Ekranda gösterilen önizleme, baskıya elverişli çözünürlükte değildir.

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

    public const string KvkkEsMetni = @"KVKK Aydınlatma Metni (Hesap Sahibi)

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

    // DAVETLI KVKK - AYRI METIN.
    //
    // Davetli bir MUSTERI DEGIL, bir KONUKTUR. Ondan "kullanim kosullarini kabul et"
    // istemek hem hukuken yanlis (sozlesme tarafi degil) hem de urun olarak yanlistir:
    // davetlinin isi 2 dakika surer, once 9 maddelik bir sozlesme okutmak surtunmedir.
    //
    // Ona sorulacak tek sey su: "biraktigin dilek ve fotograf, ciftin defterinde
    // kullanilsin mi?" Kisa, net, tek amac. KVKK'nin istedigi de budur.
    public const string KvkkDavetliMetni = @"KVKK Aydınlatma Metni (Davetli)

Veri Sorumlusu: BiAnıBırak (Musa Deveci - Konya)

1. HANGİ VERİLERİNİZ İŞLENİYOR

Bu sayfada bıraktığınız: adınız (isteğe bağlı), çiftle ilişkiniz, dilek metniniz, varsa yüklediğiniz fotoğraf ve isteğe bağlı olarak verdiğiniz iletişim bilginiz.

Hesap açmanız, kimlik bilgisi vermeniz veya giriş yapmanız GEREKMEZ. Ad dahil hiçbir alan zorunlu değildir; dilerseniz anonim bırakabilirsiniz.

2. NEDEN İŞLENİYOR

Tek amaç: bıraktığınız dileğin, çiftin anı defterinde yer alması ve baskıya hazır esere dönüştürülmesi.

Hukuki sebep: açık rızanız (KVKK m.5/1). Rıza vermezseniz dilek bırakamazsınız; başka bir sonucu olmaz.

Verileriniz pazarlama amacıyla kullanılmaz, satılmaz, üçüncü kişilerle paylaşılmaz.

3. KİM GÖREBİLİR

Dileğinizi yalnızca ilgili çift görür. Çift, dileği deftere ekleyip eklememekte serbesttir.

Diğer davetliler dileğinizi göremez. Siz de başkalarının dileklerini göremezsiniz.

4. NE KADAR SAKLANIYOR

Verileriniz, etkinlik tarihinden itibaren en fazla 37 gün saklanır. Bu sürenin sonunda dileğiniz, fotoğrafınız ve iletişim bilginiz KALICI OLARAK SİLİNİR.

Çift, defteri bu süre içinde indirir ve basar; bastırdığı kitapta dileğiniz yer alır. Sunucularımızda ise hiçbir iz kalmaz.

5. HAKLARINIZ

KVKK m.11 uyarınca verilerinize erişme, düzeltilmesini veya silinmesini isteme haklarına sahipsiniz. Talebinizi çifte iletebilir ya da bize yazılı olarak başvurabilirsiniz.

Fotoğrafınızdaki konum bilgisi (EXIF/GPS), yükleme sırasında otomatik olarak silinir.";

    public const string GizlilikMetni = @"Gizlilik Politikası

BiAnıBırak, en mahrem aile hatıralarınızı emanet ettiğiniz bir yerdir. Bu politika, o emaneti nasıl koruduğumuzu anlatır.

1. VERİ SAKLAMA - EN ÖNEMLİ İLKEMİZ

Verilerinizi sonsuza dek saklamıyoruz. Etkinlik tarihinizden 37 gün sonra defteriniz ve içindeki her şey kalıcı olarak imha edilir.

Bu bir eksiklik değil, bilinçli bir duruştur. 40 davetlinizin telefon numarasını yıllarca saklamak için hiçbir meşru sebebimiz yok. Mirasınız kâğıtta yaşamalı, sunucumuzda değil.

2. GÜVENLİK

Tüm veri aktarımı şifreli bağlantı (HTTPS) üzerinden yapılır. Şifreler geri döndürülemez şekilde özetlenir (hash) - biz bile göremeyiz.

Her defter, veritabanı düzeyinde diğerlerinden yalıtılmıştır. Bir çiftin verisi, başka bir çifte hiçbir koşulda görünmez.

Eşlerin paylaşım bağlantıları ayrıdır: bir eşin onayına düşen dilek, diğer eş tarafından görülemez.

3. FOTOĞRAFLAR

Yüklenen fotoğraflardaki konum bilgisi (EXIF/GPS) ve cihaz bilgisi, sunucuya ulaştığı anda silinir. Fotoğrafın nerede çekildiği bizde kalmaz.

4. SİSTEM YÖNETİCİSİ ERİŞİMİ

Destek talebiniz olduğunda sistem yöneticisi defterinize salt-okunur erişebilir. Bu erişim:
  - Denetim kaydına yazılır (silinemez),
  - Hiçbir veriyi değiştiremez,
  - Yalnızca sorun çözmek için kullanılır.

5. ÜÇÜNCÜ TARAFLAR

Verilerinizi satmıyoruz, kiralamıyoruz, reklam amacıyla paylaşmıyoruz. Hizmetin çalışması için gereken altyapı sağlayıcıları dışında kimseye aktarılmaz.

Uygulamada reklam gösterilmez.

6. ÇEREZLER

Yalnızca oturumunuzu açık tutmak için zorunlu çerez kullanılır. Takip veya reklam çerezi kullanılmaz.

7. İLETİŞİM

Gizlilikle ilgili her türlü soru ve talebiniz için uygulama içindeki KVKK bölümünden bize ulaşabilirsiniz. Başvurular en geç 30 gün içinde yanıtlanır.";

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

        // KATALOG - dort metin, iki kapsam.
        //
        // ES (hesap sahibi, kayit aninda onaylar):
        //   kvkk_aydinlatma    - kisisel veri islenmesi (zorunlu)
        //   kullanim_kosullari - sozlesme: sure, imha, indirme sorumlulugu (zorunlu)
        //   gizlilik           - nasil koruduğumuz (bilgilendirici, zorunlu degil)
        //
        // DAVETLI (dilek birakirken onaylar):
        //   kvkk_davetli       - kisa, tek amacli riza (zorunlu)
        //
        // Davetliden kullanim kosullari ISTENMEZ: o bir sozlesme tarafi degil, konuktur.
        if (!mevcut.Contains("kvkk_aydinlatma"))
            eklenecek.Add(Olustur("kvkk_aydinlatma", "KVKK Aydınlatma Metni",
                KvkkEsMetni, kapsam: "es", zorunlu: true, sira: 1));

        if (!mevcut.Contains("kullanim_kosullari"))
            eklenecek.Add(Olustur("kullanim_kosullari", "Kullanım Koşulları",
                KullanimKosullariMetni, kapsam: "es", zorunlu: true, sira: 2));

        if (!mevcut.Contains("gizlilik"))
            eklenecek.Add(Olustur("gizlilik", "Gizlilik Politikası",
                GizlilikMetni, kapsam: "es", zorunlu: false, sira: 3));

        if (!mevcut.Contains("kvkk_davetli"))
            eklenecek.Add(Olustur("kvkk_davetli", "KVKK Aydınlatma Metni (Davetli)",
                KvkkDavetliMetni, kapsam: "davetli", zorunlu: true, sira: 1));

        // ERKEN RETURN YOK - arsiv onarimi HER ZAMAN calismali.
        //
        // Burada "eklenecek yoksa cik" deseydik (ilk yazimda oyleydi), tum metinler
        // zaten mevcut olan bir sistemde onarim ASLA calismazdi - ve canlida tam da
        // bu oldu: iki metnin arsiv kaydi eksik kaldi.
        if (eklenecek.Count > 0)
        {
            db.SistemMetinleri.AddRange(eklenecek);

            // ILK SURUMU DE ARSIVLE.
            foreach (var m in eklenecek)
                OnayServisi.IlkSurumuArsivle(db, m);
        }

        await db.SaveChangesAsync(ct);

        // ---- GERIYE DONUK ARSIV ONARIMI ----
        //
        // KANIT ZINCIRINDEKI DELIK (canlida yakalandi):
        // Arsivleme sistemi kurulmadan ONCE seed edilmis metinler vardi. Yeni seed
        // yalniz EKSIK metinleri ekler - dolayisiyla eski metinlerin arsiv kaydi
        // OLUSMADI. Yani hash onay kaydinda duruyor ama o hash'in KARSILIK GELDIGI
        // METIN hicbir yerde yok.
        //
        // Sonuc: "bir metni onayladi" diyebiliriz, HANGI metni oldugunu gosteremeyiz.
        // Hash, ancak metin de saklanirsa kanittir - aksi halde anlamsiz bir karakter
        // dizisidir.
        //
        // Bu blok, yururlukteki her metnin arsivde karsiligi OLMASINI garanti eder.
        // Idempotent: hash zaten arsivdeyse dokunmaz.
        await ArsiviOnarAsync(db, ct);
    }

    // Yururlukteki metinlerin arsivde karsiligi var mi? Yoksa ekle.
    private static async Task ArsiviOnarAsync(BiAniBirakDbContext db, CancellationToken ct)
    {
        var metinler = await db.SistemMetinleri.ToListAsync(ct);
        if (metinler.Count == 0) return;

        var arsivdekiHashler = (await db.SistemMetinSurumleri.AsNoTracking()
            .Select(x => x.Hash)
            .ToListAsync(ct))
            .ToHashSet(StringComparer.Ordinal);

        var onarilan = 0;

        foreach (var m in metinler)
        {
            // Hash bos olabilir (arsivleme oncesi kayit) - once damgala.
            if (string.IsNullOrEmpty(m.Hash))
                OnayServisi.MetniDamgala(m);

            if (arsivdekiHashler.Contains(m.Hash)) continue;

            OnayServisi.IlkSurumuArsivle(db, m);
            arsivdekiHashler.Add(m.Hash);
            onarilan++;
        }

        if (onarilan > 0)
            await db.SaveChangesAsync(ct);
    }

    private static SistemMetni Olustur(
        string anahtar, string baslik, string icerik,
        string kapsam, bool zorunlu, int sira)
    {
        var m = new SistemMetni
        {
            Id = Guid.NewGuid(),
            Anahtar = anahtar,
            Baslik = baslik,
            Icerik = icerik,
            Kapsam = kapsam,
            Zorunlu = zorunlu,
            Sira = sira,
            YururlukTarihi = Yururluk,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow,
        };

        // Hash + surum damgasi. Kanit zincirinin ilk halkasi burada kurulur.
        OnayServisi.MetniDamgala(m);
        return m;
    }
}
