Bölüm A ve B tamamlandı ve incelendi. Şimdi teslim düzenlemesini yapacağız; ardından ayrı adımda n8n üzerinde gerçek çalıştırma ve ekran görüntüsü bonusunu tamamlayacağız. Son GitHub push’u bu bonus çalışmasından sonra yapılacak.

Genel son teslim: 25 Eylül 2026 13.00 Europe/Istanbul. Bu düzenlemeyi yaklaşık 10–15 dakika içinde tamamlamayı hedefle.

Önce bu promptu değiştirmeden promptlar/teslim-codex.md dosyasına kaydet. Sonraki teslim promptlarını aynı dosyaya sırasıyla, aynen ekle. Kısa planını belirt ve uygula.

1. TEST BAĞIMLILIKLARINI KALICI HALE GETİR

B testleri şu anda A’nın node\_modules dizinindeki Vitest ve --no-save ile kurulmuş HTML ayrıştırıcılarına bağlı. B testlerini kendi belgelenmiş ve kilitlenmiş bağımlılıklarıyla çalışır hale getir.

- B-n8n/package.json oluştur; private: true olsun.
- Şu anda testleri geçen sürümleri koru: Vitest 3.2.7, cheerio 1.0.0-rc.6, html-to-text 9.0.5.
- B-n8n/package-lock.json oluştur ve Git’e dahil et.
- B’nin vitest.config.mjs dosyasındaki A/node\_modules bağımlı alias’larını kaldır veya uygun şekilde düzenle.
- B dizininde npm ci ve npm test ile testler çalışsın.
- A’nın package.json, paket kilidi, uygulama kodu ve test davranışlarını koru.
- Bu kapsamda B’nin kendi node\_modules dizininin olması kabul ediliyor; Git dışında kalsın.
- Sürüm yükseltmesi veya kapsamlı workspace dönüşümü yapma.

2. KÖKTEN KOLAY DOĞRULAMA EKLE

Depo kökünden:

- npm test: A ve B testlerini çalıştırsın.
- npm run typecheck: A’nın mevcut TypeScript kontrolünü çalıştırsın.
- npm run check: testleri ve typecheck’i birlikte çalıştırsın.

Bunu az dosyayla, Windows ve Linux’ta çalışacak şekilde uygula. Alt komutlardan biri başarısızsa üst komut da başarısız exit code döndürsün. Komutlar uygulamayı canlı API’ye karşı çalıştırmasın ve teslim çıktılarını değiştirmesin.

Mevcut makinedeki npm PATH kısıtını dikkate al. Standart npm kurulu başka bir makinede README’deki standart komutlar çalışmalı.

3. README VE KURULUM BELGESİNİ GÜNCELLE

README’nin başlangıcını değerlendiricinin projeyi hızlıca inceleyebileceği şekilde düzenle:

- A ve B’nin mevcut tamamlanma durumu.
- İlgili çıktı ve açıklama dosyalarına bağlantılar.
- Temiz kurulum, test, typecheck ve A’yı çalıştırma komutları.
- Gerçek test sonuçları.
- Uygulanmamış ürün arama bonusu ve doğrulama sınırları.

“Bölüm B push yapılmadı” gibi eski durum ifadelerini güncelle: önceki A ve B commit’leri GitHub’a gönderildi; bu yeni teslim düzenlemesi henüz gönderilmedi.

B-n8n/akis-aciklama.md içindeki --no-save kurulum talimatlarını da yeni bağımlılık düzenine göre değiştir.

Önceki çalışma günlüklerini ve prompt kayıtlarını silme veya geçmiş sonuçları değiştirme. Yeni durumu yeni kayıtla belirt.

Başlangıç saati 10.00 olarak kalsın. n8n bonusu henüz yapılmadığından bütün proje için nihai tamamlanma saati yazma; bu aşamanın gerçek tamamlanma saatini kaydet.

Gerçek n8n importu/çalıştırması ve ekran görüntüsü henüz yapılmadı. Bunları tamamlanmış gösterme. Sohbette bildirilen bağımsız inceleme sonuçlarını kendi yerel çalıştırmanmış gibi kaydetme.

4. DOĞRULA

- B testlerini kendi package-lock.json dosyasından npm ci ile kurarak çalıştır.
- Kök npm run check komutunu gerçekten çalıştır; sorunları düzelt.
- Test sayısını artırmayı hedefleme; mevcut davranış testlerini koru.
- A’nın talepler.json ve ozet.html dosyalarını yeniden üretme.
- Özgün case-brief.md ve mesajlar.json dosyalarının değişmediğini kontrol et.
- Başarısız deneme ve çözümleri kısa bir teslim çalışma kaydına ekle.
- Değişiklikleri anlamlı yerel commit’lere kaydet; henüz push yapma.

5. SONRAKİ N8N ADIMI İÇİN ORTAMI KONTROL ET

Dosya düzenlemeleri bittikten sonra yalnızca mevcut ortamı incele:

- Kullanılabilir bir yerel n8n kurulumu veya çalışan n8n örneği var mı?
- Docker kurulu mu ve Docker servisi çalışıyor mu?
- Node ve npm sürümleri nedir?
- localhost:5678 üzerinde çalışan bir hizmet var mı?

Mevcut kurulumları veya container’ları değiştirme. Credential dosyalarının içeriğini, ortam değişkenlerindeki sırları veya token’ları yazdırma.

Son raporda şunları belirt:

- Yeni kurulum ve doğrulama komutları.
- Gerçek A/B test ve typecheck sonuçları.
- Değişen dosyalar ve yerel commit’ler.
- n8n/Docker ortamının durumu.
- Gerçek n8n çalıştırmasına geçmek için gereken sonraki somut adım.

Bu promptun kapsamı teslim düzenlemesi ve ortam tespitidir. Gerçek n8n çalıştırması, ekran görüntüleri, son push ve teslim e-postası sonraki adımlardır.

Şimdi n8n canlı çalıştırma bonusunun kurulum ve import aşamasını yapıyoruz. Docker Desktop ve Linux engine çalışıyor; n8n container/imajı henüz yok. Son teslim 25 Eylül 2026 13.00 Europe/Istanbul. Kurulum ve importu yaklaşık 10 dakika içinde hazırlamayı hedefle.

Önce bu promptu promptlar/teslim-codex.md dosyasına aynen ekle. Ek onay beklemeden yetkilendirilmiş yerel kurulumu gerçekleştir.

1. ÖN KONTROL

- Git durumunu kontrol et; mevcut yerel commit’leri koru.
- B-n8n/package-lock.json dosyasının mevcut olduğunu ve Git tarafından takip edildiğini doğrula.
- A dosyaları, özgün girdiler ve mevcut başarılı çıktıları koru.

2. AYRI N8N ÖRNEĞİNİ BAŞLAT

- Mevcut Docker container’larına ve volume’larına dokunmadan bu case için ayrı bir n8n örneği oluştur.
- Resmî n8n imajını kullan. Erişilebilir kararlı sürümün sayısal etiketini doğrula ve sabitle; kullanılan sürümü kaydet.
- Belgelerdeki 1.112.6’nın önceki kaynak incelemesi referansı olduğunu koru; kurduğun sürüm farklıysa ikisini açıkça ayır.
- Tek n8n servisi, SQLite ve kalıcı named volume kullanan sade bir yerel kurulum yeterli. n8n Assistant, ek veritabanı veya arama servisleri kurma.
- Container adı nurederm-case-n8n, volume adı nurederm\_case\_n8n\_data olabilir. İsimler kullanımdaysa mevcut kaynakları silmeden farklı isim seç.
- Portu yalnızca yerel makineye bağla: 127.0.0.1:5678:5678. Çakışma varsa boş yerel port seçip bildir.
- TZ ve GENERIC\_TIMEZONE değerleri Europe/Istanbul olsun.
- Gerekli ayarları seçilen n8n sürümünün resmî belgelerine göre yap.
- Tekrar kullanılabilir kurulum dosyasını B-n8n/compose.yaml altında tut. Credential veya şifre ekleme.
- n8n veritabanı, kullanıcı bilgileri ve encryption key kalıcı Docker volume’unda kalsın; depoya kopyalanmasın.

Container’ı başlat. Sürümünü, çalışma durumunu ve yerel HTTP erişimini gerçekten kontrol et. Başlatma hatası çıkarsa nedenini inceleyip kapsam içinde düzelt.

3. WORKFLOW IMPORTU

- Arayüz erişimi hazır olduğunda B-n8n/workflow\.json dosyasını gerçek n8n’e import et.
- Kullanılabilir tarayıcı araçları veya seçilen sürümün desteklenen import yöntemiyle ilerle.
- Kullanıcı hesabı oluşturma/giriş adımı benim tarafımdan yapılmalıysa sunucuyu hazır bırak; açacağım adresi ve tamamlamam gereken ekranı açıkça bildir. Parolamı sohbette isteme.
- Import gerçekleşirse düğümlerin tanındığını, bağlantıların korunduğunu ve Code düğümlerinin bulunduğunu kontrol et.
- Workflow pasif kalsın; zamanlanmış çalışmayı etkinleştirme.
- Google Sheets ve Telegram credential’ları henüz yapılandırılmadıysa bunu beklenen kurulum ihtiyacı olarak raporla. Bu durumu başarılı uçtan uca çalışma diye gösterme.
- Import sırasında gerçek bir uyumluluk hatası bulunursa yalnızca gerekli düzeltmeyi yap, gerekçesini kaydet ve etkilenen testleri çalıştır.

4. KAYIT VE SONUÇ

- Gerçek komutları, sürümü ve sonucu TESLIM-CALISMA-GUNLUGU.md dosyasına ekle.
- Başlatma/durdurma komutlarını kısa şekilde belgele; durdurma komutu kalıcı volume’u silmesin.
- Arayüz görüntüsü alınabiliyorsa yalnızca gerçek ekranı kaydet. Henüz çalıştırılmamış workflow görüntüsünü “import görünümü” olarak etiketle.
- README’de yalnızca gerçekten doğrulanan durumu güncelle.
- Yerel commit oluştur; henüz push yapma.

Son raporda şunları ver:

- Açacağım yerel n8n adresi.
- Container ve n8n sürümü.
- Import yapıldı mı, yoksa hangi kullanıcı adımı bekleniyor?
- Google Sheets ve Telegram bağlantılarını hazırlamak için arayüzde sıradaki somut adım.

Bu aşamanın ardından credential’ları bağlayıp gerçek çalıştırmayı yapacak, sonuç ekran görüntülerini ekleyecek ve son push’u gerçekleştireceğiz.
