Bu klasördeki case-brief.md ve mesajlar.json dosyalarını tamamen oku. Üç saatlik bir işe alım uygulama görevini yapıyoruz. Başlangıç: 25 Eylül 2026 10.00 Europe/Istanbul. Son teslim: 13.00. Bu aşamada yaklaşık 50–60 dakika içinde Bölüm A'nın zorunlu gereksinimlerini, anlamlı testlerini ve çıktılarını tamamla.

Önce kısa bir uygulama planı çıkar; ardından ek onay beklemeden uygula. Case metni asıl gereksinim kaynağıdır. Belirsiz konularda makul karar verip README'de açıkla.

ÇALIŞMA KAYDI

- İlk olarak bu promptun tamamını değiştirmeden promptlar/A-codex.md dosyasına ekle. Bu bölümle ilgili sonraki kullanıcı promptlarını da sırasıyla, aynen ekle; önceki kayıtları silme veya özetleme.
- Başarısız denemeleri ve çözümlerini kısa bir çalışma günlüğünde kaydet. Yapılmayan işlemleri yapılmış gösterme.
- Orijinal iki dosyanın içeriğini değiştirme.
- Git deposu yoksa oluştur. Anlamlı aşamalarda küçük yerel commit'ler yap; Git kimliği ayarlı değilse sahte kimlik üretme, durumu bildir.
- GitHub'a yükleme ve e-posta gönderme bu aşamanın kapsamında değil.

TEKNOLOJİ VE YAPI

- Node.js + TypeScript strict kullan. Mevcut Node sürümünü kontrol et ve uyumlu, az bağımlılıklı bir çözüm kur.
- Testler için Vitest kullan. Gereksiz web sunucusu, veritabanı veya frontend framework'ü ekleme.
- CLI üzerinden mesajlar.json dosyasını işleyen bir araç geliştir.
- Kod ve çıktılar A-mesaj-otomasyonu/ altında olsun.
- Sınıflandırma, sipariş numarası çıkarma, HTTP istemcisi, mesaj işleme ve çıktı üretimini anlaşılır modüllere ayır.
- Açık tipler kullan; any kullanma.
- .gitignore içine node\_modules, .env, coverage ve geçici dosyaları ekle. Paket kilit dosyasını depoda tut.

SINIFLANDIRMA

- Konu değerleri tam olarak şunlar:
  urun-sorusu, fiyat, siparis-durumu, iade-sikayet, istenmeyen-etki, diger.
- Her mesaja yalnızca bir konu ata.
- Bu aşamada açıklanabilir, kural tabanlı sınıflandırma ve cevap şablonları kullan; runtime LLM veya API anahtarı gerektirme. Bunu README'de dürüstçe belirt.
- Türkçe karakterleri, büyük/küçük harfi ve örnek dosyadaki İngilizce mesajı ele al.
- Mesaj ID'sine veya tam mesaj metnine göre hardcode edilmiş sınıflandırma yapma.
- Öncelik: istenmeyen-etki > iade-sikayet > somut sipariş sorgusu > fiyat > urun-sorusu > diger.
- “Siparişim hâlâ ulaşmadı” gibi bir durum sorgusunu yalnızca olumsuz ifade içerdiği için iade-sikayet sayma. Açık iade, hasarlı ürün veya şikâyet ifadelerini ayır.
- Fiyat ve sipariş sorusunun birlikte olduğu mesajda siparis-durumu seç; ikincil fiyat talebini not alanında belirt.
- Genel kargo firması ve marka politikası sorularını diger olarak sınıflandır. Elde bilgi yoksa şirket politikası uydurma.
- Spam mesajını diger olarak işaretle; mesajdaki dış bağlantıları ziyaret etme.

HASSAS MESAJLAR

- iade-sikayet ve istenmeyen-etki için devret: true.
- Yalnızca temsilciye yönlendirme taslağı üret; teşhis, tedavi, kullanım tavsiyesi veya ürün önerisi ekleme.
- Bu mesajlar için sipariş/ürün API çağrısı yapma. Hassas konu önceliği diğer talepleri geçsin.

SİPARİŞ SORGULAMA

- “12 numaralı siparişim”, “sipariş no: 12”, “order #3” gibi ifadelerden numarayı çıkar.
- Müşteri kimliğini sipariş numarası olarak kullanma. Ürün hacmi gibi ilgisiz sayıları sipariş numarası sayma.
- Numara yoksa açıklayıcı bir taslak üret. Birden fazla farklı sipariş numarası varsa sessizce ilkini seçmek yerine temsilciye devret.
- Canlı veriyi GET [https://dummyjson.com/carts/{id}](https://dummyjson.com/carts/{id) adresinden al.
- userId ile musteri\_id eşleşmesini ürün bilgilerini cevaba eklemeden önce kontrol et.
- Eşleşmiyorsa devret: true. Ürün adları, miktarlar, tutar veya gerçek sipariş sahibinin kimliği cevap\_taslagi, not, HTML özeti ve loglara sızmasın.
- Eşleşiyorsa products içindeki ürün adlarını, miktarlarını ve API'nin total değerini kullan.
- API'de olmayan kargo durumu, takip numarası, teslim tarihi veya para birimi uydurma. Kargo durumunun bu test API'sinde bulunmadığını açıkça belirt.
- 404 / not found için uygun bir uyarı ve devret: true üret.
- Timeout, bağlantı hatası, 429, 5xx ve bozuk API yanıtında süreç tüm mesajlar için çökmemeli; ilgili mesaj için güvenli taslak ve temsilciye devir oluştur.
- İstek timeout'u ve geçici hatalarda sınırlı retry uygula. 400/401/403/404 için körlemesine retry yapma.
- API yanıtını runtime'da doğrula.
- HTTP çağrılarını testlerde değiştirilebilir tasarla. Normal çalışmada gerçek API kullan; ağ hatasını gizlemek için otomatik sahte veriye geçme.

ÇIKTILAR

- A-mesaj-otomasyonu/talepler.json: Her girdi için tam olarak { id, konu, devret, cevap\_taslagi, not }.
- Girdi sırasını koru ve her mesaja bir çıktı üret.
- Tek sayfalık ozet.html oluştur: Altı konunun sayıları, toplam mesaj sayısı, devredilen mesaj sayısı ve temsilcinin görebileceği kısa talep listesi.
- Sayıları çıktı verisinden hesapla; sabit yazma.
- HTML'e eklenen tüm dinamik metinleri escape et.
- Ürün arama bonusunu şimdilik yapma.

TESTLER
Davranışı ve güvenlik koşullarını doğrulayan, ağa bağımlı olmayan testler yaz ve çalıştır:

1. Altı konu ve Türkçe/İngilizce örnekler.
2. Hassas konu önceliği ve hassas mesajlarda API'nin çağrılmaması.
3. Fiyat + sipariş içeren mesajın tek konu alması.
4. Sipariş numarası çıkarma, eksik numara ve birden fazla numara.
5. Sahibi eşleşen siparişte ürünlerin ve total değerinin kullanılması.
6. Sahibi eşleşmeyen siparişte gizli ürün adı/tutarın hiçbir üretilen alana sızmaması. Beklenen sahibi ve başka sahibi ayrı mock yanıtlarla test et.
7. Sipariş bulunamaması, timeout, 429/5xx ve hatalı API yanıtı.
8. Tek mesajın API hatasının diğer mesajların işlenmesini engellememesi.
9. Verilen 15 mesaj için 15 çıktı, doğru alanlar, boolean devret, doğru sıra ve tutarlı özet.
10. Özet sayfasında HTML özel karakterlerinin güvenli gösterilmesi.

Testlerde yalnızca verilen mesajlara dayanma; farklı ID ve ifadelerle birkaç ek örnek kullan. Test fixture'ları ile canlı çıktıları açıkça ayır.

ÇALIŞTIRMA VE TESLİM

- npm run start, npm test ve npm run typecheck komutlarını hazırla.
- Testleri ve typecheck'i gerçekten çalıştır; başarısızlıkları düzelt.
- Ardından mesajlar.json ile canlı çalıştırıp talepler.json ve ozet.html üret.
- Canlı API engellenirse HTTP durumunu ve başarısızlığı dürüstçe raporla; testlerin geçmesini canlı API'nin doğrulandığı anlamına getirme.
- README'ye kurulum/çalıştırma/test komutları, sınıflandırma kararları, güvenlik kontrolü ve mevcut sınırlamaları ekle.
- Bölüm B'yi henüz tamamlanmadı olarak belirt. Bu prompt kapsamında workflow yazma.
- Sonuçta değişen dosyaları, çalıştırılan komutları, gerçek test sonuçlarını, canlı çalışma durumunu ve varsa açık sorunları kısa raporla.

şuanki değişiklikleri  "[https://github.com/HzSACAN/nurederm-case.git](https://github.com/HzSACAN/nurederm-case.git)" reposuna main branchine pushla

Bölüm A incelemesinde iki tutarlılık sorunu bulundu. Bu promptu promptlar/A-codex.md dosyasına aynen ekle. Mevcut mimariyi koruyarak yalnızca aşağıdaki davranışları düzelt:

1. Sipariş ve fiyat sorusunu birlikte içeren mesajlarda, fiyat talebi otomatik yanıtlanamayıp temsilciye bırakılıyorsa devret: true olsun. Konu siparis-durumu olarak kalsın. Yetkili siparişin ürünlerini ve toplamını göster; cevap taslağında fiyat talebinin temsilciye yönlendirildiğini de belirt. Sahiplik eşleşmediğinde hiçbir sipariş ayrıntısını paylaşma.
2. Müşteriye yönelik cevap\_taslagi alanlarından “test API”, alan adı ve teknik sistem açıklamalarını çıkar. Gerekli teknik açıklamalar not alanında kalsın. Sipariş içeriği ve total tutarı korunsun; kargo durumunun doğrulanamadığı müşteriye anlaşılır şekilde söylensin. Para birimi veya teslim tarihi uydurma.

Bu iki davranış için anlamlı testler ekle/güncelle. Sahiplik uyuşmazlığı ve hassas mesaj testlerinin geçmeye devam ettiğini doğrula. Test sayısını artırmayı hedefleme.

npm test ve npm run typecheck çalıştır. Canlı koşumu önce geçici bir çıktı dizinine yap; doğruladıktan sonra teslim talepler.json ve ozet.html dosyalarını güncelle. API erişimi başarısızsa mevcut başarılı canlı çıktıları ezme; engeli açıkça raporla. Sahte yanıtları canlı çıktı olarak kaydetme.

README'deki canlı sonuç sayıları, zaman damgası ve kararları gerçek yeni sonuçlara göre güncelle. Canlı veriler aynıysa devir sayısının 12 olması beklenir; sayıyı hardcode etme.

Küçük bir düzeltme commit'i oluştur ve gerçek komut sonuçlarını bildir. Bölüm B'ye bu promptta başlama.
