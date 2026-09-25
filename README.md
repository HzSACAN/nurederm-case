# Nurederm uygulama görevi

Başlangıç: **25 Eylül 2026 10.00 Europe/Istanbul**. Genel son teslim: **13.00**.
Bölüm A'nın zorunlu uygulaması, testleri ve gerçek API çıktıları hazır.
**Bölüm B'nin workflow'u, açıklaması ve çevrimdışı testleri hazır.** Gerçek n8n importu/çalıştırması yapılmadı.
İlk Bölüm A tesliminde GitHub'a yükleme ve e-posta gönderimi yapılmadı.
Sonraki kullanıcı talebiyle GitHub hedefi `https://github.com/HzSACAN/nurederm-case.git`, dalı `main` olarak belirlendi.
E-posta gönderimi hâlâ kapsam dışındadır.
Bu Bölüm B aşamasında yalnızca yerel commit oluşturuldu; push yapılmadı.

Asıl gereksinim kaynağı [case-brief.md](case-brief.md), özgün girdi [mesajlar.json](mesajlar.json).
İki dosya değiştirilmedi; başlangıç/son SHA-256 değerleri çalışma günlüğünde.

## Kurulum ve kullanım

Node.js **22.18 veya üzeri** ve npm gerekir; bu makinede Node **24.19.0** ve npm **10.9.3** ile çalıştırıldı.
Node'un yerleşik TypeScript çalıştırması kullanılır; build, web sunucusu, veritabanı veya frontend gerekmez.
Bölüm A'nın runtime bağımlılığı yoktur. Geliştirme bağımlılıkları TypeScript, Node tipleri ve Vitest'tir; sürümler paket kilidinde sabitlenmiştir.

Depo kökünden:

```sh
cd A-mesaj-otomasyonu
npm ci
npm run typecheck
npm test
npm run start
```

`npm run start`, varsayılan olarak kökteki `mesajlar.json` dosyasını okur ve
`A-mesaj-otomasyonu/talepler.json` ile `A-mesaj-otomasyonu/ozet.html` dosyalarını üretir.
Özet doğrudan tarayıcıda açılabilen tek bir HTML dosyasıdır; harici kaynak yüklemez.
Yeni çalıştırma bu iki çıktıyı günceller. API erişimi için internet gerekir; testler ağa bağlı değildir.

İsteğe bağlı girdi ve çıktı dizini (yollar çalıştırılan dizine göre çözülür):

```sh
npm run start -- ../mesajlar.json ./deneme-ciktilari
npm run start -- --help
```

Bu makinede `npm` başlangıçta PATH'te yoktu. Resmi npm paketi geçici, Git dışında kalan
`.tmp/package/` dizinine indirildi. Yukarıdaki komutlar burada aynı npm CLI üzerinden
`node ../.tmp/package/bin/npm-cli.js test`, `run typecheck`, `run start` şeklinde çalıştırıldı.
Başka makinede `.tmp/` gerekmez; standart Node + npm kurulumu ve `npm ci` yeterlidir.

## Modüller

| Dosya | Sorumluluk |
| --- | --- |
| `src/cli.ts`, `src/input.ts` | CLI argümanları, girdi doğrulama ve dosya yazımı |
| `src/normalize.ts`, `src/classifier.ts` | Türkçe normalizasyon ve tek konu seçimi |
| `src/order-number.ts` | Sipariş bağlamına bağlı numara çıkarımı |
| `src/http-client.ts` | Sabit DummyJSON endpointi, timeout/retry, runtime doğrulama |
| `src/processor.ts` | Hassas mesajlar, sahiplik kontrolü, güvenli taslaklar |
| `src/output.ts` | Çıktıdan hesaplanan sayılar ve escape edilmiş HTML |
| `src/types.ts` | Açık veri tipleri ve altı konu sabiti |

Tüm kod TypeScript `strict`, `noUncheckedIndexedAccess` ve `exactOptionalPropertyTypes` ile kontrol edilir.
Uygulama ve test kodunda `any` kullanılmaz.

## Sınıflandırma ve kararlar

Bu uygulama **açıklanabilir kurallara ve sabit cevap şablonlarına** dayanır; runtime LLM veya API anahtarı kullanmaz.
ID veya tam mesaj eşleştirme yoktur. Türkçe harfler/şapka işaretleri normalize edilir; İngilizce temel ifadeler de tanınır.
İngilizce mesaj tanınsa da temsilci taslakları bu aşamada Türkçe üretilir.

Öncelik: **istenmeyen-etki > iade-sikayet > somut sipariş sorgusu > fiyat > urun-sorusu > diger**.
Hassas konular yalnızca temsilciye yönlendirilir; ürün önerisi, teşhis, tedavi veya kullanım tavsiyesi verilmez ve API çağrılmaz.
“Siparişim hâlâ ulaşmadı” sipariş sorgusudur; açık iade/hasar/şikâyet ifadeleri ayrı kurallardır.
Fiyatla birlikte somut sipariş sorusu varsa tek konu `siparis-durumu` olur. Fiyat otomatik yanıtlanamadığından
`devret: true` seçilir; cevapta fiyat talebinin temsilciye yönlendirildiği belirtilir ve `not` alanında kaydedilir.
Yetkili siparişin ürünleri, miktarları ve toplamı yine gösterilir; sahiplik eşleşmezse sipariş ayrıntıları paylaşılmaz.

Genel kargo firması, hayvan deneyi/marka politikası ve yalnızca genel iade politikası soruları `diger` olur.
Genel politika ifadesi yanında açık kişisel iade talebi varsa hassas iade önceliği korunur.
Spam kuralı eşleşirse `diger`, `devret: false`, boş cevap taslağı üretilir; dış bağlantılar ziyaret edilmez.
Veri kaynağı bulunmayan ürün, fiyat ve diğer genel sorular için **`devret: true`** seçildi:
temsilci doğrulanmış bilgiyi sağlamalıdır. Bu, zorunlu hassas devirlere ek bir uygulama kararıdır.
Ürün arama bonusu bu aşamada uygulanmadı.

Sipariş numarası yalnızca `12 numaralı siparişim`, `sipariş no: 12`, `order #3` gibi bağlamlardan çıkarılır.
Hacim, süre veya müşteri numarası kullanılmaz. Numara eksikse **sipariş numarası** istenir ve yeni yanıt beklenir
(`devret: false`; aynı mesajda temsilci gerektiren fiyat talebi de varsa `devret: true`).
Birden fazla farklı sipariş numarası varsa sorgu yapılmadan devredilir; aynı numaranın tekrarı tek sorgudur.

## Güvenlik ve API davranışı

- Tek ağ hedefi `GET https://dummyjson.com/carts/{id}`. Mesajdaki bağlantılar kullanılmaz; HTTP yönlendirmeleri reddedilir.
- Yanıtın `id`, `userId`, `products[].title`, pozitif tam sayı `quantity` ve sonlu, negatif olmayan `total` alanları runtime'da doğrulanır.
- **`userId === musteri_id` kontrolü geçmeden** ürün, miktar veya tutar cevap alanlarına eklenmez.
  Eşleşmezse yalnızca genel sahiplik uyarısı ve devir üretilir; gerçek sahibin kimliği açıklanmaz.
- Sahiplik eşleşince ürün başlıkları, miktarlar ve doğrudan API `total` değeri kullanılır. Ürünlerden yeni toplam hesaplanmaz.
  Müşteriye yalnızca “Kargo durumunuzu şu anda doğrulayamıyoruz.” denir; para birimi veya teslim tarihi uydurulmaz.
  Test API'si, alan adları ve teknik eksiklikler müşteriye yönelik `cevap_taslagi` yerine temsilcinin `not` alanında kalır.
- İstek başına **5 saniye timeout**, ilk denemeye ek **en fazla 2 retry**, **200/400 ms backoff** uygulanır.
  Timeout başlık ve gövde okumasını kapsar. Bağlantı hatası, timeout, 429 ve 5xx tekrar denenir.
  400/401/403/404 ve bozuk yanıt körlemesine tekrar denenmez. `Retry-After` bu küçük uygulamada yorumlanmaz.
- HTTP 404 ve gövdedeki `not found` güvenli bulunamadı taslağına dönüşür.
  Diğer API hataları ilgili mesajı devreder; sonraki mesajlar sırayla işlenir. Sahte veriye otomatik geçiş yoktur.
- Loglar yalnızca izin verilen olay türü, HTTP durumu ve deneme sayısını içerir.
  Ham yanıt gövdesi, müşteri kimliği, ürünler ve exception metni loglanmaz.
- HTML yalnızca üretilen beş alanı kullanır; tüm dinamik değerlerde `& < > " '` escape edilir.
  Ek olarak harici içerikleri engelleyen Content Security Policy vardır.
- Girdide pozitif tam sayı ID/müşteri kimliği, boş olmayan kanal/mesaj ve benzersiz ID aranır.
  Geçersiz dosyada CLI exit code 1 verir; geçerli dosyada mesaj düzeyindeki API hataları çıktı üretimini durdurmaz (exit code 0).

Bu case'te `musteri_id` güvenilir girdi kabul edilir. Gerçek müşteri kanalında kimlik doğrulaması ayrıca gerekir;
DummyJSON herkese açık sentetik bir test servisidir. Üretilen cevaplar **taslaktır**, müşterilere gönderilmez.

## Doğrulama ve canlı sonuç

25 Eylül 2026 10.42 Europe/Istanbul itibarıyla **Vitest 3.2.7: 4 dosya, 100 test başarılı**;
`npm run typecheck` başarılı. Testler altı konuyu, TR/EN örnekleri, hassas önceliği ve API'nin çağrılmamasını,
numara ayrımını, iki ayrı sahiplik fixture'ını, ürün/miktar/total kullanımını, JSON/HTML/log gizliliğini,
404/timeout/bağlantı/429/5xx/bozuk yanıtları, sınırlı retry'ı, işlem devamlılığını ve HTML escape'i kapsar.
Verilen 15 mesaj ayrıca mock adaptörle sıra, tam alanlar, boolean devir ve özet tutarlılığı açısından test edilir.
İnceleme düzeltmesinde mevcut testler güncellendi: sipariş+fiyat devri, sipariş içeriğinin korunması,
teknik açıklamaların müşteri taslağından çıkarılması ve fiyat içeren sahiplik uyuşmazlığında gizlilik doğrulandı.
Hassas mesaj testleri de geçti; test sayısı değişmedi.

`tests/fixtures/carts.ts` **yalnızca sentetik test verisidir**. Runtime kodu fixture içe aktarmaz.
15 mesajlık mock testte tüm siparişlerin bulunamadığı senaryo seçildiğinden 14 devir beklenir;
bu sayı aşağıdaki canlı sonuçtan bağımsızdır.

**Son canlı çalıştırma: 25 Eylül 2026 10.42 Europe/Istanbul.** İnceleme düzeltmesi sonrası gerçek API koşumu
`npm run start -- ../mesajlar.json ../.tmp/A-review-live` ile önce geçici dizine yapıldı.
HTTP sonuçları, 15 kaydın sırası/alanları, müşteri metinleri, fiyat devri ve JSON/HTML tutarlılığı doğrulandı.
Üç yetkili siparişin ürünleri, miktarları ve toplamları önceki canlı çıktılarla aynı kaldı.
Bu kontroller geçene kadar önceki teslim dosyaları değiştirilmedi; ardından doğrulanan iki dosya teslim dizinine kopyalandı.
Otomatik mock/fallback kullanılmadı. Önceki 10.22 koşumundaki sandbox engeli ve çözümü çalışma günlüğünde korunuyor.

| Canlı kontrol | Sonuç |
| --- | --- |
| Sipariş sorguları | 4 × HTTP 200, 1 × HTTP 404; her biri tek deneme |
| Mesaj 1 | Sahiplik eşleşmedi; ayrıntılar paylaşılmadan devir |
| Mesaj 2, 6, 8 | Sahiplik eşleşti; ürün/miktar/total kullanıldı |
| Mesaj 8 | Ek fiyat talebi nedeniyle devir; konu hâlâ sipariş durumu |
| Mesaj 3 | Sipariş bulunamadı; HTTP 404 ve devir |
| Çıktı | 15 mesaj, girdi sırası korundu, çıktı verisinden hesaplanan 12 devir |
| Konular | ürün 3, fiyat 2, sipariş 5, iade/şikâyet 1, istenmeyen etki 1, diğer 3 |

Teslim çıktıları: [talepler.json](A-mesaj-otomasyonu/talepler.json) ve [ozet.html](A-mesaj-otomasyonu/ozet.html).
Canlı veri daha sonra değişebilir; testlerin geçmesi tek başına canlı API'nin çalıştığı anlamına gelmez.
HTML içerik/escape testleri geçti; tarayıcıda görsel inceleme denemesi `file://` URL güvenlik politikası nedeniyle engellendi.
Bu nedenle tarayıcı görünümü doğrulanmış olarak raporlanmıyor.

## Sınırlamalar ve kayıtlar

Kurallar tüm doğal dil, yazım hatası veya olumsuzlama çeşitlerini kapsamaz; hassas sözcükler ihtiyatlı biçimde devre yol açabilir.
Bölüm A'da ürün bilgisi/fiyat entegrasyonu, otomatik cevap gönderimi ve gerçek kargo takibi yoktur.
CLI küçük JSON dosyasını belleğe alır ve mesajları sırayla işler; kuyruk, paralel işleme veya kalıcı veritabanı eklenmedi.

Kullanıcı promptunun tam kaydı [promptlar/A-codex.md](promptlar/A-codex.md) içinde.
Başarısız denemeler, düzeltmeler ve komut sonuçları [çalışma günlüğünde](A-mesaj-otomasyonu/CALISMA-GUNLUGU.md).

İlk Bölüm A tamamlama kaydı: 25.09.2026 10.27 Europe/Istanbul.
İnceleme düzeltmesi doğrulaması: 25.09.2026 10.42 Europe/Istanbul.

## Bölüm B — n8n fiyat takibi

[workflow.json](B-n8n/workflow.json) pasif (`active: false`) teslim edildi. Günde 09.00 Europe/Istanbul tetiklemesi,
dinamik ve eksiksiz sayfalama, kart bazında HTML çıkarımı, alan doğrulama, URL üzerinden fiyat karşılaştırması,
Google Sheets snapshot/tamamlanma kayıtları ve bağlı Telegram başarı/hata yolları içerir.
Hata bildirimi de başarısız olsa çalışma Stop And Error ile başarısız biter.

Başlangıç şablonu: Tony Paul'un
[Competitor price monitoring with web scraping,Google Sheets & Telegram](https://n8n.io/workflows/4640-competitor-price-monitoring-with-web-scrapinggoogle-sheets-and-telegram/).
Şablon sayfası ve özgün JSON gerçekten indirildi/incelendi; n8n'e import edilmedi. Özgün kimlik/credential'lar taşınmadı.
Korunan ve değiştirilen mantık, tablo sütunları, import/kurulum adımları, hata sırası ve sınırlamalar
[akis-aciklama.md](B-n8n/akis-aciklama.md) içinde.

Akışın Code düğümleri harici script/npm/DOM/fetch gerektirmez; ağ ve HTML işleri n8n HTTP Request/HTML düğümlerindedir.
Google Sheets/Telegram credential'ları **yalnızca akışı gerçekten çalıştırmak için** gerekir;
dosyaları incelemek ve çevrimdışı testleri çalıştırmak için gerekmez. İki ID Configuration düğümünden,
credential'lar n8n arayüzünden seçilir. JSON'da token/şifre veya pinned test verisi bulunmaz.

### Çevrimdışı test

Depo kökünden; A bağımlılıkları kuruluysa ilk komut atlanabilir:

```sh
npm --prefix A-mesaj-otomasyonu ci
npm --prefix A-mesaj-otomasyonu install --no-save --package-lock=false --no-audit --no-fund cheerio@1.0.0-rc.6 html-to-text@9.0.5
node A-mesaj-otomasyonu/node_modules/vitest/vitest.mjs run --config B-n8n/vitest.config.mjs
```

Mevcut Vitest kurulumu kullanılır; ikinci bağımlılık ağacı ve A manifest/kilit değişikliği yoktur.
Ek ayrıştırıcılar yalnızca B testleri içindir; sonra `npm ci` çalıştırılırsa tekrar kurulmaları gerekir.
Bu makinede npm PATH'te olmadığından kurulum mevcut geçici npm CLI ile yapıldı; gerçek komutlar B günlüğünde/belgesinde.

**25.09.2026 11.29.30 Europe/Istanbul: Vitest 3.2.7, 1 dosya / 17 test başarılı, 3.77 saniye, exit 0.**
Testler workflow içindeki gerçek Code metinlerini ve HTML selector'larını kullanır. Sentetik fixture'lar
`B-n8n/tests/fixtures/` altında ayrıdır. Mock connector'larla bağlı grafik; sayfalama, alan doğrulama,
yeni/değişen/değişmeyen fiyatlar, önceki başarılı run seçimi, yarım kayıtlar ve hata yolları sınandı.

Düğüm şemaları ve yürütme davranışı resmi **n8n@1.112.6** kaynaklarıyla kontrol edildi
(`0c00d3b18c17ce36c62b54fecfa79215f649ebf8`). Gerçek ilk sayfanın indirilmiş HTML'inde 11.30.37'de
6 kart doğru çıkarıldı ve son sayfa bağlantısı 20 olarak keşfedildi; bu değerler akışta sabitlenmedi.
**JSON parse ve testler, gerçek n8n import/runtime doğrulaması değildir.** Bütün site üzerinde canlı tarama,
Sheets yazımı veya Telegram gönderimi yapılmadı. Bunlar gerçek kullanım öncesi kalan doğrulamalardır.

İlk çalışmada bütün ürünler yeni kabul edilir. Snapshot → bildirim → tamamlanma kaydı sırası kullanılır;
yarım yazımlar sonraki çalışmada referans olmaz. Bildirim başarılı olup tamamlanma kaydı başarısızsa tekrar bildirim olabilir.
Aynı spreadsheet için eşzamanlı execution çalıştırılmamalıdır; bu küçük case'te kilit/kuyruk eklenmedi.

Bölüm B başlangıcı: 25.09.2026 11.03 Europe/Istanbul.
Bölüm B tasarım/test/belgeleme tamamlama kaydı: 25.09.2026 11.36 Europe/Istanbul.
Promptun tam kaydı [promptlar/B-n8n.md](promptlar/B-n8n.md), başarısız denemeler ve gerçek sonuçlar
[B çalışma günlüğünde](B-n8n/CALISMA-GUNLUGU.md). Bölüm A'nın yukarıdaki doğrulama kayıtları, kodu ve başarılı canlı çıktıları korundu.
