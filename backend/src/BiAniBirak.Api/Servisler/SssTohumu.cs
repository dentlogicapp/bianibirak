using BiAniBirak.Api.Data;
using BiAniBirak.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace BiAniBirak.Api.Servisler;

// SSS TOHUMU - bilgi tabaninin ILK halini kurar.
//
// TASARIM KARARI: bu icerik koda GOMULU DEGILDIR, yalnizca BASLANGIC tohumudur.
// Bir kez eklenir; sonrasi super panelden yonetilir. Tohumu her acilista yeniden
// yazsaydik, yoneticinin duzenlemeleri her deploy'da SILINIRDI - bilgi tabani
// buyuyemezdi. Bu yuzden kural: tablo BOSSA tohumla, doluysa DOKUNMA.
//
// AGAC: Kategori > AltKategori > (Soru, Cevap)
// Cevaplar UYGULAMANIN GERCEK davranisina gore yazildi; sure/DPI gibi taahhut
// iceren teknik sayilar bilincli olarak verilmedi (KURAL F).
public static class SssTohumu
{
    public static async Task TohumlaAsync(BiAniBirakDbContext db, CancellationToken ct = default)
    {
        if (await db.SssMaddeleri.AnyAsync(ct)) return; // doluysa DOKUNMA

        var simdi = DateTimeOffset.UtcNow;
        var sira = 0;
        var liste = new List<SssMaddesi>();

        void Ekle(string kategori, string alt, string soru, string cevap)
        {
            liste.Add(new SssMaddesi
            {
                Id = Guid.NewGuid(),
                Kategori = kategori,
                AltKategori = alt,
                Soru = soru,
                Cevap = cevap,
                Sira = sira++,
                Aktif = true,
                CreatedAt = simdi,
                UpdatedAt = simdi,
            });
        }

        // ==================== 1. BAŞLARKEN ====================
        Ekle("Başlarken", "Kurulum",
            "BiAnıBırak nedir, ne işe yarar?",
            "BiAnıBırak, düğün/nişan/nikâh gibi özel günlerinizde davetlilerinizin bıraktığı dilekleri toplayıp, bunları baskıya hazır bir anı defterine dönüştüren bir kürasyon stüdyosudur. Amaç dijitalde biriktirmek değil; elinizde tutabileceğiniz, çocuklarınıza gösterebileceğiniz bir eser bırakmaktır.");
        Ekle("Başlarken", "Kurulum",
            "Defter oluşturmak için neler gerekiyor?",
            "Yalnızca iki isim ve bir tarih. Karşılama metni, tema ve diğer ayarlar hazır gelir; dilerseniz sonradan düzenlersiniz. Kurulum birkaç dakika sürer.");
        Ekle("Başlarken", "Kurulum",
            "Etkinlik tarihini yanlış girdim, değiştirebilir miyim?",
            "Evet. Ayarlar → Etkinlik & Görünüm bölümünden tarihi güncelleyebilirsiniz. Tarihi değiştirdiğinizde defterin tüm takvimi (dilek toplamanın kapanışı ve saklama süresi) otomatik olarak yeniden hesaplanır.");
        Ekle("Başlarken", "Kurulum",
            "Birden fazla defter oluşturabilir miyim?",
            "Evet. Avatar menüsündeki \"Yeni Etkinlik Defteri Aç\" ile istediğiniz kadar defter açabilirsiniz. Defterler tamamen bağımsızdır; menüden aralarında geçiş yaparsınız ve hangisinde olduğunuzu menünün üstünde her zaman görürsünüz.");
        Ekle("Başlarken", "Kurulum",
            "Uygulamayı telefonuma nasıl kurarım?",
            "Tarayıcıdan siteye girip \"Ana ekrana ekle\" seçeneğini kullanmanız yeterli. Uygulama bu şekilde telefonunuzda bir simge olarak durur ve normal uygulama gibi açılır.");

        Ekle("Başlarken", "Eşinizi Ekleme",
            "Eşimi nasıl davet ederim?",
            "Defterinizi kurduğunuzda doğrudan davet adımına yönlendirilirsiniz. Oluşturulan bağlantıyı WhatsApp'tan veya istediğiniz bir yoldan eşinize gönderirsiniz. Bu adımı daha sonra Ayarlar → Eşini Ekle bölümünden tekrarlayabilirsiniz.");
        Ekle("Başlarken", "Eşinizi Ekleme",
            "Eşim davet bağlantısını kaybetti, ne yapmalıyım?",
            "Ayarlar → Eşini Ekle bölümünden yeni bir bağlantı oluşturup tekrar gönderebilirsiniz. Bu sayfa kalıcıdır; bağlantı ne zaman gerekirse buradan yenilenir.");
        Ekle("Başlarken", "Eşinizi Ekleme",
            "Eşim katılmazsa ne olur?",
            "Defter yine çalışır ama eksik kalır: her eşin kendi davet bağlantısı ve kendi onay kuyruğu vardır. Eşiniz katılmazsa, onun yakınlarından gelen dilekleri kimse onaylayamaz ve o dilekler deftere hiç girmez.");
        Ekle("Başlarken", "Eşinizi Ekleme",
            "Eşim benim onay kuyruğumu görebilir mi?",
            "Hayır. Her eş yalnızca kendi bağlantısından gelen dilekleri görür ve onaylar. Onaylanan dilekler ortak deftere birleşir. Bu ayrım bilinçlidir: kimse diğerinin onaylamadığı bir mesajı görmez.");

        // ==================== 2. DİLEK TOPLAMA ====================
        Ekle("Dilek Toplama", "Bağlantı Paylaşma",
            "Davetlilerime bağlantıyı nasıl gönderirim?",
            "\"Dilek Bağlantısını Paylaş\" bölümünden kendi bağlantınızı kopyalayabilir veya doğrudan paylaşabilirsiniz. Bağlantıyı WhatsApp grubunuzda, mesajla ya da sosyal medyada paylaşabilirsiniz.");
        Ekle("Dilek Toplama", "Bağlantı Paylaşma",
            "Neden iki farklı bağlantı var?",
            "Her eşin ayrı bir bağlantısı vardır. Sizin bağlantınızdan gelen dilekler sizin onayınıza, eşinizinkinden gelenler onun onayına düşer. Böylece herkes kendi yakınlarının mesajlarını kendisi görür ve onaylar.");
        Ekle("Dilek Toplama", "Bağlantı Paylaşma",
            "Davetlim bağlantıya tıklayınca üye olmak zorunda mı?",
            "Hayır. Davetliniz hiçbir kayıt yapmadan, üyelik açmadan doğrudan dileğini bırakır. Ad ve iletişim bilgisi vermek bile zorunlu değildir.");

        Ekle("Dilek Toplama", "Davetli Sorunları",
            "Davetlim dilek bırakamıyor, ne yapmalıyım?",
            "Önce dilek toplama süresinin dolup dolmadığını kontrol edin: özel gününüzden belirli bir süre sonra davetli girişleri kapanır. Süre dolmadıysa bağlantının doğru kopyalandığından emin olun. Sorun sürerse bize bu ekrandan yazın, birlikte bakalım.");
        Ekle("Dilek Toplama", "Davetli Sorunları",
            "Davetlim fotoğraf yükleyemiyor",
            "Fotoğraf çok büyükse veya bağlantı yavaşsa yükleme tamamlanmayabilir. Davetlinizden tekrar denemesini isteyin. Fotoğraflar yüklenirken otomatik olarak küçültülür ve konum bilgisi silinir; bu işlem birkaç saniye sürebilir.");
        Ekle("Dilek Toplama", "Davetli Sorunları",
            "Davetlimin gönderdiği dilek görünmüyor",
            "Dilek, o bağlantının sahibi olan eşin onay kuyruğuna düşer. Eşinizin bağlantısından gelmişse sizin ekranınızda görünmez. Ayrıca reddedilen dilekler Çöp Kutusu'na taşınır, ortak defterde görünmez.");
        Ekle("Dilek Toplama", "Davetli Sorunları",
            "Aynı kişi birden fazla dilek bırakabilir mi?",
            "Evet, bir davetli istediği kadar dilek bırakabilir. Her biri ayrı bir kayıt olarak onayınıza düşer.");

        Ekle("Dilek Toplama", "Süre ve Kapanış",
            "Dilek toplama ne zaman kapanır?",
            "Özel gününüzden belirli bir süre sonra davetli girişleri otomatik olarak kapanır. Kapanış tarihini defterinizin zaman çizelgesinde her zaman görebilirsiniz.");
        Ekle("Dilek Toplama", "Süre ve Kapanış",
            "Toplama kapandıktan sonra defterimi düzenleyebilir miyim?",
            "Evet. Kapanan tek şey davetli girişleridir. Defterinizi düzenlemek, dilekleri sıralamak ve baskıya hazır nüshayı indirmek imha anına kadar açıktır.");
        Ekle("Dilek Toplama", "Süre ve Kapanış",
            "Süreyi uzatabilir miyim?",
            "Hayır. Takvim her defterde aynıdır ve değiştirilemez. Bu bilinçli bir karardır: değişken süre, herkesin farklı bir söz duyması demektir. Tek istisna, özel gün tarihini değiştirmenizdir - takvim ona göre yeniden hesaplanır.");

        // ==================== 3. DEFTERİNİZİ YÖNETME ====================
        Ekle("Defterinizi Yönetme", "Onay ve Moderasyon",
            "Gelen dilekleri nasıl onaylarım?",
            "\"Gelen Dilekler\" bölümünde onayınızı bekleyen dilekleri görürsünüz. Her dileği önce inceleyip defterde nasıl görüneceğini görebilir, sonra onaylayabilir veya reddedebilirsiniz.");
        Ekle("Defterinizi Yönetme", "Onay ve Moderasyon",
            "Yanlışlıkla reddettim, geri alabilir miyim?",
            "Evet. Reddedilen dilekler Çöp Kutusu'na taşınır ve belirli bir süre orada bekler. Çöp Kutusu'ndan \"Geri Al\" ile dileği tekrar onay kuyruğunuza alabilirsiniz.");
        Ekle("Defterinizi Yönetme", "Onay ve Moderasyon",
            "Onayladığım bir dileği sonradan çıkarabilir miyim?",
            "Evet. Ortak defterdeki dileği açıp \"Çöpe Taşı\" diyebilirsiniz. Dilek defterden çıkar, Çöp Kutusu'na gider ve isterseniz oradan geri alabilirsiniz.");
        Ekle("Defterinizi Yönetme", "Onay ve Moderasyon",
            "Davetlinin yazdığı metni düzenleyebilir miyim?",
            "Hayır. Davetlinin mesajı olduğu gibi kalır. Bu bilinçli bir sınırdır: defterdeki her satır, gerçekten o kişinin yazdığı sözdür.");
        Ekle("Defterinizi Yönetme", "Onay ve Moderasyon",
            "Reddettiğim dilek davetliye bildirilir mi?",
            "Hayır. Davetliye herhangi bir bildirim gitmez. Kimse reddedildiğini öğrenmez.");

        Ekle("Defterinizi Yönetme", "Çöp Kutusu",
            "Çöp Kutusu ne işe yarar?",
            "Reddettiğiniz dilekler doğrudan silinmez, Çöp Kutusu'na taşınır. Orada bir süre bekler; fikrinizi değiştirirseniz geri alabilirsiniz. Süre sonunda otomatik olarak kalıcı silinirler.");
        Ekle("Defterinizi Yönetme", "Çöp Kutusu",
            "Çöp Kutusundaki dilek ne zaman kalıcı silinir?",
            "Çöpe atıldıktan bir süre sonra otomatik olarak kalıcı silinir. Her dileğin yanında kalan gün sayısı yazar; silinmeden önce ayrıca bildirim alırsınız.");
        Ekle("Defterinizi Yönetme", "Çöp Kutusu",
            "Eşimin çöp kutusunu görebilir miyim?",
            "Hayır. Her eş yalnızca kendi reddettiği dilekleri görür.");

        Ekle("Defterinizi Yönetme", "Fotoğraflar",
            "Kendi fotoğraflarımı nasıl eklerim?",
            "\"Fotoğraflar\" bölümünden fotoğraf yükleyebilir, defterde nerede görüneceğini (kapak, ithaf, bölüm arası, kapanış) seçebilirsiniz.");
        Ekle("Defterinizi Yönetme", "Fotoğraflar",
            "Fotoğraflarımın konum bilgisi kalıyor mu?",
            "Hayır. Yüklenen her fotoğrafın konum (GPS) ve cihaz bilgisi, daha telefonunuzdan çıkarken silinir. Fotoğrafın nerede çekildiği bizde kalmaz.");
        Ekle("Defterinizi Yönetme", "Fotoğraflar",
            "Kaç fotoğraf yükleyebilirim?",
            "Defterinize belirli sayıda görsel ekleyebilirsiniz. Sınıra ulaştığınızda mevcut fotoğraflardan birini silip yenisini ekleyebilirsiniz.");

        Ekle("Defterinizi Yönetme", "Kişiselleştirme",
            "Karşılama metnini değiştirebilir miyim?",
            "Evet. Ayarlar → Etkinlik & Görünüm bölümünden davetlilerinizin göreceği karşılama metnini ve yönlendirici metni düzenleyebilirsiniz.");
        Ekle("Defterinizi Yönetme", "Kişiselleştirme",
            "Geri sayım sayacını kapatabilir miyim?",
            "Evet. Ayarlar → Etkinlik & Görünüm → Sayaç bölümünden sayacı kapatabilir, sayaç metinlerini kendi cümlelerinizle değiştirebilirsiniz.");
        Ekle("Defterinizi Yönetme", "Kişiselleştirme",
            "Defterin kapak başlığını değiştirebilir miyim?",
            "Evet. \"Baskıya Hazır Defter\" bölümünde kapak başlığı, alt başlık, ithaf ve kapanış metinlerini düzenleyebilirsiniz.");

        // ==================== 4. BASKI VE İNDİRME ====================
        Ekle("Baskı ve İndirme", "Defteri İndirme",
            "Defterimi nasıl indiririm?",
            "\"Baskıya Hazır Defter\" bölümünden defterinizi baskıya hazır bir PDF dosyası olarak indirebilirsiniz. İndirmeden önce sayfaları tek tek önizleyebilirsiniz.");
        Ekle("Baskı ve İndirme", "Defteri İndirme",
            "Defterimi kaç kez indirebilirim?",
            "Sınırsız. Yeni dilekler eklendikçe defterinizi tekrar indirebilirsiniz; her indirme o anki güncel hali içerir.");
        Ekle("Baskı ve İndirme", "Defteri İndirme",
            "Defterimi indiremiyorum, ne yapmalıyım?",
            "Deftere en az bir onaylanmış dilek eklenmiş olmalıdır. Ayrıca çok uzun bir dilek veya çok büyük bir görsel sayfa düzenini zorlayabilir. Sorun sürerse bu ekrandan bize yazın; hangi defter olduğunu görebiliyoruz.");
        Ekle("Baskı ve İndirme", "Defteri İndirme",
            "Hangi boyutu seçmeliyim?",
            "İndirme sırasında farklı kâğıt boyutları arasından seçim yapabilirsiniz. Her boyutun yanında fotoğrafların nasıl görüneceğine dair açıklama yer alır; en yaygın tercih albüm ölçüsüdür.");

        Ekle("Baskı ve İndirme", "Matbaa",
            "Dosyayı matbaaya nasıl veririm?",
            "İndirdiğiniz PDF doğrudan matbaaya verilebilir. Matbaanın kullandığı programlar bu dosyayı açar; sayfa ölçüsü ve cilt payı dosyanın içinde tanımlıdır.");
        Ekle("Baskı ve İndirme", "Matbaa",
            "Matbaa \"dosya bozuk\" diyor, ne yapmalıyım?",
            "Dosyayı yeniden indirip tekrar deneyin; aktarım sırasında bozulma olabilir. Sorun sürerse bu ekrandan bize yazın, matbaanızın istediği formatı birlikte hazırlayalım.");
        Ekle("Baskı ve İndirme", "Matbaa",
            "Kaç sayfa olacağını önceden görebilir miyim?",
            "Evet. \"Baskıya Hazır Defter\" bölümündeki önizlemede sayfa sayısı ve her sayfanın nasıl görüneceği yer alır. Bastığınızda elinize geçecek olan tam olarak budur.");

        Ekle("Baskı ve İndirme", "Davetiye Karekodu",
            "Davetiyeme karekod nasıl eklerim?",
            "\"Davetiyene QR Kodu Ekle\" bölümünden karekodunuzu tasarlayıp indirebilirsiniz. İndirdiğiniz paket içinde matbaanın kullanabileceği vektör dosyalar ve dijital paylaşım için görseller ayrı klasörlerde yer alır.");
        Ekle("Baskı ve İndirme", "Davetiye Karekodu",
            "Karekodun rengini ve yerini değiştirebilir miyim?",
            "Evet. Zemin rengini seçebilir, karekodu sürükleyerek konumlandırabilir ve boyutunu ayarlayabilirsiniz. Açık/koyu görünüm, seçtiğiniz zemin rengine göre otomatik belirlenir.");
        Ekle("Baskı ve İndirme", "Davetiye Karekodu",
            "Neden iki ayrı karekod gönderiliyor?",
            "Her eşin kendi karekodu vardır ve kendi bağlantısına gider. Sizin yakınlarınıza dağıtılacak davetiyelerde sizin karekodunuz, eşinizin yakınlarına dağıtılacaklarda onunki kullanılmalıdır.");
        Ekle("Baskı ve İndirme", "Davetiye Karekodu",
            "Karekodun altındaki beyaz alan kaldırılabilir mi?",
            "Kaldırmayın. Karekod okuyucular koyu desenin çevresinde açık bir alan arar; bu beyaz alan kaldırılırsa renkli davetiye üzerinde karekod okunmayabilir.");

        // ==================== 5. SÜRE, SAKLAMA VE GÜVENLİK ====================
        Ekle("Süre, Saklama ve Güvenlik", "Saklama Süresi",
            "Defterim ne kadar süre saklanıyor?",
            "Defteriniz özel gününüzden sonra belirli bir süre saklanır; bu sürenin sonunda defter ve içindeki her şey kalıcı olarak silinir. Kalan süreyi defterinizin zaman çizelgesinde ve size gönderdiğimiz bildirimlerde görürsünüz.");
        Ekle("Süre, Saklama ve Güvenlik", "Saklama Süresi",
            "Neden sonsuza kadar saklamıyorsunuz?",
            "Çünkü verdiğimiz söz dijital depolama değil, elinizde kalacak bir eser. Süreyi sınırlı tutmak, fotoğraflarınızı çok daha yüksek kalitede işleyebilmemizi sağlıyor. Miras kâğıtta kalıcıdır; sunucuda değil.");
        Ekle("Süre, Saklama ve Güvenlik", "Saklama Süresi",
            "Süre dolduğunda ne oluyor?",
            "Defteriniz, dilekler, fotoğraflar ve iletişim bilgileri kalıcı olarak silinir. Bu işlem geri alınamaz. Silme gerçekleştiğinde size ayrıca bildirim gönderilir.");
        Ekle("Süre, Saklama ve Güvenlik", "Saklama Süresi",
            "Süre dolmadan hatırlatma alıyor muyum?",
            "Evet, hem de sık sık. Özel gününüzden sonra her gün, son günlerde ise saat bazlı uyarılar gönderiyoruz. Amacımız kimsenin mirasını farkında olmadan kaybetmemesi.");
        Ekle("Süre, Saklama ve Güvenlik", "Saklama Süresi",
            "İndirdiğim dosya da siliniyor mu?",
            "Hayır. İndirdiğiniz dosya tamamen sizindir ve sizin cihazınızda kalır. Silinen yalnızca bizim sunucumuzdaki kopyadır. Bu yüzden indirdiğiniz dosyayı yedeklemenizi öneririz.");

        Ekle("Süre, Saklama ve Güvenlik", "Gizlilik",
            "Dilekleri başkaları görebilir mi?",
            "Hayır. Defteriniz yalnızca size ve eşinize açıktır. Davetliler yalnızca dilek bırakır, başkalarının yazdıklarını göremez.");
        Ekle("Süre, Saklama ve Güvenlik", "Gizlilik",
            "Verilerim nerede saklanıyor?",
            "Verileriniz kendi sunucumuzda saklanır ve üçüncü taraflarla paylaşılmaz. Ayrıntılar için Gizlilik Politikası ve KVKK Aydınlatma Metni'ni inceleyebilirsiniz.");
        Ekle("Süre, Saklama ve Güvenlik", "Gizlilik",
            "Hesabımı silebilir miyim?",
            "Evet. Talebinizi bu destek ekranından iletebilirsiniz; hesabınız ve verileriniz mevzuata uygun şekilde silinir.");
        Ekle("Süre, Saklama ve Güvenlik", "Gizlilik",
            "Davetlilerin telefon numarası bizde kalıyor mu?",
            "Davetli isterse iletişim bilgisi paylaşır, zorunlu değildir. Paylaşılan bilgiler defterin saklama süresi sonunda diğer tüm verilerle birlikte kalıcı olarak silinir.");

        // ==================== 6. HESAP VE BİLDİRİMLER ====================
        Ekle("Hesap ve Bildirimler", "Giriş",
            "Şifremi unuttum",
            "Giriş ekranındaki şifre sıfırlama adımını kullanabilirsiniz. Sorun yaşarsanız bu ekrandan bize yazın.");
        Ekle("Hesap ve Bildirimler", "Giriş",
            "Sürekli çıkış yapmak zorunda kalıyorum",
            "Oturumunuz uzun süre açık kalacak şekilde ayarlıdır. Böyle bir durum yaşıyorsanız uygulamayı telefonunuzdan kaldırıp yeniden eklemeyi deneyin; sorun sürerse bize yazın.");
        Ekle("Hesap ve Bildirimler", "Giriş",
            "Aynı hesaba iki telefondan girebilir miyim?",
            "Evet. Aynı hesapla istediğiniz cihazdan giriş yapabilirsiniz; defteriniz her cihazda aynı görünür.");

        Ekle("Hesap ve Bildirimler", "Bildirimler",
            "Bildirim gelmiyor, neden?",
            "Telefonunuzun bildirim iznini vermeniz gerekir. Ayrıca sessiz saat ayarınız açıksa, acil olmayan bildirimler o saatlerde ertelenir. Uygulama içi bildirimler her durumda avatar menüsünde birikir.");
        Ekle("Hesap ve Bildirimler", "Bildirimler",
            "Sessiz saat nedir?",
            "Belirlediğiniz saat aralığında bildirim sesi almazsınız. Ancak defterinizin silinmesi gibi hayati uyarılar, kayıp geri dönüşsüz olduğu için bu ayardan etkilenmez.");
        Ekle("Hesap ve Bildirimler", "Bildirimler",
            "Bildirime tıkladığımda yanlış yere gidiyorum",
            "Bildirim, ilgili defterin ekranına götürür; farklı bir defterdeyseniz otomatik olarak o deftere geçilir. Sorun yaşarsanız bize yazın.");

        // ==================== 7. ÖDEME ====================
        Ekle("Ödeme", "Ücretlendirme",
            "Uygulama ücretli mi?",
            "Dilek toplamak, defterinizi kurmak, düzenlemek ve tam önizleme almak ücretsizdir. Yalnızca baskıya hazır nüshayı indirmek ücretlidir.");
        Ekle("Ödeme", "Ücretlendirme",
            "Ödeme yaparsam süre uzar mı?",
            "Hayır. Ödeme, defterin saklama süresini uzatmaz. Ödeme yalnızca baskıya hazır nüshayı indirme yetkisi verir; indirme işlemini süre içinde yapmanız gerekir.");
        Ekle("Ödeme", "Ücretlendirme",
            "Bir kez ödeyip birden fazla indirebilir miyim?",
            "Evet. Ödeme yaptıktan sonra süre boyunca istediğiniz kadar indirebilirsiniz.");

        db.SssMaddeleri.AddRange(liste);
        await db.SaveChangesAsync(ct);
    }
}
