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
