Bu depodaki case-brief.md dosyasını tamamen oku; özellikle Bölüm B ve teslim gereksinimlerini esas al. Bölüm A tamamlandı ve düzeltmeleri GitHub’a gönderildi. Şimdi yalnızca Bölüm B’yi hazırla.

Genel son teslim: 25 Eylül 2026 13.00 Europe/Istanbul. Bu aşamayı yaklaşık 45–55 dakikada tamamlamayı hedefle. Önce kısa bir uygulama planı çıkar, ardından ek onay beklemeden uygula. Zorunlu gereksinimleri ve anlamlı testleri önceliklendir.

ÇALIŞMA KAYDI VE KAPSAM

- İlk olarak bu promptun tamamını değiştirmeden promptlar/B-n8n.md dosyasına kaydet. Bu bölümle ilgili sonraki promptları da sırasıyla, aynen ekle.
- Özgün case-brief.md ve mesajlar.json dosyalarını değiştirme. Bölüm A’nın koduna ve başarılı canlı çıktılarına dokunma.
- Başarısız denemeleri, kararları ve gerçek doğrulama sonuçlarını B-n8n/CALISMA-GUNLUGU.md içinde kısa şekilde kaydet.
- n8n kurulumu, hesap oluşturma ve gerçek bildirim gönderimi gerekmiyor. Bunlar için zaman harcama.
- Küçük, anlamlı yerel commit’ler oluştur. Bu aşamada push ve e-posta gönderme.

TESLİM DOSYALARI

- B-n8n/workflow\.json
- B-n8n/akis-aciklama.md
- B-n8n/ altında anlamlı testler ve gerekli küçük fixture’lar
- Güncellenmiş kök README.md
- promptlar/B-n8n.md ve çalışma günlüğü

ŞABLON KAYNAĞI

Başlangıç olarak şu gerçek n8n şablonunu kullan:

Adı: Competitor price monitoring with web scraping,Google Sheets & Telegram
Yazar: Tony Paul
Bağlantı:
[https://n8n.io/workflows/4640-competitor-price-monitoring-with-web-scrapinggoogle-sheets-and-telegram/](https://n8n.io/workflows/4640-competitor-price-monitoring-with-web-scrapinggoogle-sheets-and-telegram/)

Şablonun sayfasını ve mümkünse özgün workflow JSON’unu incele. Hangi düğümleri veya akış mantığını koruduğunu, hangilerini değiştirdiğini akis-aciklama.md içinde açıkla.

Şablon JSON’una erişim engellenirse uzun süre takılma: engeli kaydet, sayfada açıklanan akış yapısını referans alarak uyarlamayı oluştur ve bunu dürüstçe belirt. İndirmediğin veya import etmediğin dosyayı indirilmiş/import edilmiş gösterme.

Şablondan kalan gerçek spreadsheet ID, chat ID veya credential referanslarını teslim dosyasına taşıma.

AKIŞ TASARIMI

Depolama için Google Sheets, bildirim için Telegram kullan. Gereken işlemler workflow\.json içindeki bağlı ve yapılandırılmış düğümlerde bulunsun; yalnızca açıklama veya TODO olarak kalmasın.

1. Tetikleme ve yapılandırma

- Günde bir kez çalışacak Schedule Trigger ekle; saat 09.00, saat dilimi Europe/Istanbul.
- İsteğe bağlı deneme için Manual Trigger da ekleyebilirsin.
- Spreadsheet ID ve Telegram chat ID gibi kullanıcı tarafından doldurulacak ayarları tek bir yapılandırma noktasında topla.
- Credential’lar n8n arayüzünden sonradan seçilsin. Token veya şifreyi JSON’a yazma.
- Teslim workflow’u active: false olsun.

2. Bütün sayfaları tarama

Kaynak:
[https://webscraper.io/test-sites/e-commerce/static/computers/laptops](https://webscraper.io/test-sites/e-commerce/static/computers/laptops)

- Gerçek HTML yapısını inceleyerek sayfalama bağlantılarından son sayfayı veya sonraki sayfayı belirle.
- Sayfa sayısını, ürün sayısını veya ürün listesini sabitleme.
- Sayfalama bağlantıları aralıklı gösterilse bile aradaki sayfaları atlama.
- İlk ve son sayfa dahil tüm sayfaları işle. Tek sayfalık sonucu da destekle.
- HTTP Request düğümleriyle istek yap; makul timeout ve sınırlı retry kullan. İstekleri kontrollü hızda gönder.
- Sonsuz döngüye karşı üst sınır koyabilirsin; sınıra ulaşmak başarılı tam tarama sayılmasın.
- Sayfalama hedeflerini kaynak sitenin ilgili kategori yolu ile sınırla.

3. Ürün çıkarma ve doğrulama

Her ürün için:

- product\_name: tam ürün adı; gerekiyorsa başlığın title attribute’unu kullan.
- price: dolar işareti temizlenmiş, sonlu ve negatif olmayan sayı.
- review\_count: sıfır veya pozitif tam sayı.
- product\_url: mutlak ürün URL’si.

Ürünleri URL üzerinden eşleştir; ad veya liste sırası üzerinden eşleştirme.

HTML çıkarımı için n8n’in HTML düğümünü tercih et. Farklı ürünlerin adı/fiyatı/yorumu yanlışlıkla aynı satırda birleşmesin; eksik alanları sessizce kaydırma.

n8n Code düğümünde tarayıcı DOM’u, harici npm paketi, dosya sistemi veya fetch bulunduğunu varsayma. Ağ erişimini HTTP Request, HTML ayrıştırmasını HTML düğümleriyle gerçekleştir. Code düğümlerini dönüşüm, doğrulama ve karşılaştırma için kullan.

4. Önceki başarılı çalışmayla karşılaştırma

Google Sheets’te iki sekme kullan:

- snapshots: run\_id, scraped\_at, product\_url, product\_name, price, review\_count
- runs: run\_id, completed\_at, product\_count

Akış mantığı:

- Mevcut çalışma için tek run\_id ve zaman damgası üret.
- Önceki tamamlanmış çalışmayı runs tablosundan belirle; karşılaştırmada yalnızca o çalışmanın snapshot satırlarını kullan.
- Önceki çalışmada bulunmayan URL’leri “yeni ürün”, fiyatı değişenleri “fiyat değişikliği” olarak ayır.
- Fiyat karşılaştırmasını sayısal yap; “416.99” ile 416.99 farklı fiyat sayılmasın. Gerekirse kuruş/cents üzerinden karşılaştır.
- İlk çalışmada geçmiş yoksa tüm ürünleri yeni kabul et ve bunu belgede belirt.
- İlk çalışmadaki boş Sheets sonucu akışı durdurmasın; hata veren Sheets isteği ise boş geçmiş olarak yorumlanmasın.
- Tüm sayfalar ve ürünler doğrulanmadan snapshot yazmaya başlama.
- Tüm snapshot satırları başarıyla yazıldıktan sonra runs tablosuna tamamlanma kaydı ekle.
- Yarım kalan yazımın satırları sonraki çalışmada başarılı referans veri olarak kullanılmasın.
- Değişiklik olmasa da başarılı taramanın tamamını tarih damgasıyla kaydet.

Bu küçük case için karmaşık kilit/kuyruk altyapısı ekleme; eşzamanlı çalıştırma sınırlamasını açıkça belgele.

5. Bildirim

- Yeni veya fiyatı değişen ürünler varsa Telegram bildirimi oluştur.
- Yeni üründe ad, fiyat ve bağlantı; fiyat değişiminde ayrıca eski ve yeni fiyat bulunsun.
- Değişiklik yoksa değişiklik bildirimi gönderme.
- Çok sayıda değişiklikte Telegram’ın mesaj sınırına uygun bölümlere ayır veya açıkça belirtilmiş bir özet ve tablo bağlantısı kullan.
- Ürün adlarının Telegram biçimlendirmesini bozmasını önle.
- Gerçek mesaj gönderme; düğümleri ve gerekli credential kurulumunu hazırla.
- Bildirim başarısızlığını sessizce yutma. Bildirim ile kayıt sırasının tekrar çalıştırmaya etkisini belgede açıkla.

6. Hata dalı

Aşağıdaki durumlar gerçek, bağlı hata dallarında ele alınsın:

- Siteye erişilememesi, timeout veya başarısız HTTP durumu.
- Bir sayfanın alınamaması nedeniyle eksik tarama.
- Hiç ürün bulunamaması.
- Ürün fiyatı veya zorunlu alanların geçersiz olması.

Bu durumlarda hata bildirimi düğümüne gidilsin; ardından Stop And Error ile çalışma başarısız bitsin. Hata bildirimi de başarısız olursa çalışma yine başarısız kalmalı.

Hata mesajında anlaşılır neden ve ilgili sayfa bulunsun. Eksik tarama normal başarı koluna veya tamamlanmış çalışma kaydına ulaşmasın.

N8N UYUMLULUĞU

- Kullanılan düğümlerin type, typeVersion, parameters ve connections yapısını resmi n8n belgeleri veya kaynak koduyla doğrula.
- Düğüm adları/ID’leri benzersiz, bağlantılar geçerli olsun.
- IF çıkışları, hata çıkışları, döngü tamamlanması ve item eşleştirmelerine özellikle dikkat et.
- Bir düğümün çıktıyı değiştirmesi nedeniyle run\_id veya önceki veriler kaybolmasın.
- Üretim akışına test fixture’ı, pinned data veya başarılı sonuç taklidi ekleme.
- Workflow dışındaki yerel bir script’e bağımlı bırakma.
- Kontrol ettiğin n8n sürümünü veya kaynak referansını belgede belirt.

TESTLER

Ağa ve gerçek credential’lara bağlı olmayan testler yaz. Mevcut Vitest kurulumundan yararlanabilirsin; gereksiz ikinci bağımlılık ağacı oluşturma.

Testler mümkün olduğunca workflow\.json içindeki gerçek Code düğümü kodlarını ve HTML selector yapılandırmasını kullansın. Sadece ayrı bir test uygulamasını sınayıp workflow’u doğrulanmış sayma.

Öncelikli senaryolar:

1. Birden fazla sayfanın eksiksiz planlanması ve tek sayfa durumu.
2. HTML fixture’ından doğru ürün adı, sayısal fiyat, yorum sayısı ve mutlak URL çıkarılması.
3. Eksik/geçersiz fiyatın sıfır olarak kabul edilmemesi.
4. İlk çalışma, yeni ürün, değişmeyen fiyat, fiyat artışı ve düşüşü.
5. Ürün sırası değişse de URL üzerinden doğru eşleştirme.
6. Önceki tamamlanmış snapshot’ın seçilmesi; yarım kalmış çalışma satırlarının dışlanması.
7. Boş sonuç ve başarısız sayfanın hata olarak değerlendirilmesi.
8. Workflow bağlantılarının ve hata bildiriminden başarısız sonuca giden yolun kontrolü.

Test sayısını artırmayı hedefleme. Testleri gerçekten çalıştır ve bulunan hataları düzelt.

JSON parse edilmesi ve birim testlerin geçmesi, gerçek n8n import/runtime doğrulaması değildir. Hangi seviyede kontrol yaptığını doğru raporla.

BELGELEME VE SONUÇ

akis-aciklama.md içinde şunlar yer alsın:

- Kaynak şablonun adı, bağlantısı ve yaptığın değişiklikler.
- Akışın adım adım açıklaması.
- Google Sheets sekmeleri ve sütunları.
- n8n’e import, yapılandırma, credential seçimi ve etkinleştirme adımları.
- İlk çalışma davranışı, hata yönetimi ve bilinen sınırlamalar.
- Test komutu ve gerçek sonuçlar.
- Canlı n8n çalıştırmasının yapılıp yapılmadığı.

Kök README’de Bölüm B’nin durumunu gerçek sonuca göre güncelle. A’nın doğrulama kayıtlarını koru. Google Sheets/Telegram credential’larının yalnızca akışı gerçekten çalıştırmak için gerektiğini açıkla.

Son raporda oluşturulan dosyaları, gerçek test sonuçlarını, şablon erişim durumunu, doğrulama kapsamını, commit’leri ve açık kalan sorunları kısa şekilde bildir.

Tamam yapılan değişiklikleri github'a pushla.
