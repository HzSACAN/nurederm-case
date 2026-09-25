# Nurederm uygulama görevi

Başlangıç: **25 Eylül 2026 10.00 Europe/Istanbul**. Genel son teslim: **13.00**.
Bölüm A'nın zorunlu uygulaması, testleri ve gerçek API çıktıları hazır.
**Bölüm B henüz tamamlanmadı.** Bu aşamada n8n workflow'u hazırlanmadı.
İlk Bölüm A tesliminde GitHub'a yükleme ve e-posta gönderimi yapılmadı.
Sonraki kullanıcı talebiyle GitHub hedefi `https://github.com/HzSACAN/nurederm-case.git`, dalı `main` olarak belirlendi.
E-posta gönderimi hâlâ kapsam dışındadır.

Asıl gereksinim kaynağı [case-brief.md](case-brief.md), özgün girdi [mesajlar.json](mesajlar.json).
İki dosya değiştirilmedi; başlangıç/son SHA-256 değerleri çalışma günlüğünde.

## Kurulum ve kullanım

Node.js **22.18 veya üzeri** ve npm gerekir; bu makinede Node **24.19.0** ve npm **10.9.3** ile çalıştırıldı.
Node'un yerleşik TypeScript çalıştırması kullanılır; build, web sunucusu, veritabanı veya frontend gerekmez.
Runtime bağımlılığı yoktur. Geliştirme bağımlılıkları TypeScript, Node tipleri ve Vitest'tir; sürümler paket kilidinde sabitlenmiştir.

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
Fiyatla birlikte somut sipariş sorusu varsa tek konu `siparis-durumu` olur; fiyat isteği `not` alanına yazılır.

Genel kargo firması, hayvan deneyi/marka politikası ve yalnızca genel iade politikası soruları `diger` olur.
Genel politika ifadesi yanında açık kişisel iade talebi varsa hassas iade önceliği korunur.
Spam kuralı eşleşirse `diger`, `devret: false`, boş cevap taslağı üretilir; dış bağlantılar ziyaret edilmez.
Veri kaynağı bulunmayan ürün, fiyat ve diğer genel sorular için **`devret: true`** seçildi:
temsilci doğrulanmış bilgiyi sağlamalıdır. Bu, zorunlu hassas devirlere ek bir uygulama kararıdır.
Ürün arama bonusu bu aşamada uygulanmadı.

Sipariş numarası yalnızca `12 numaralı siparişim`, `sipariş no: 12`, `order #3` gibi bağlamlardan çıkarılır.
Hacim, süre veya müşteri numarası kullanılmaz. Numara eksikse **sipariş numarası** istenir ve yeni yanıt beklenir
(`devret: false`).
Birden fazla farklı sipariş numarası varsa sorgu yapılmadan devredilir; aynı numaranın tekrarı tek sorgudur.

## Güvenlik ve API davranışı

- Tek ağ hedefi `GET https://dummyjson.com/carts/{id}`. Mesajdaki bağlantılar kullanılmaz; HTTP yönlendirmeleri reddedilir.
- Yanıtın `id`, `userId`, `products[].title`, pozitif tam sayı `quantity` ve sonlu, negatif olmayan `total` alanları runtime'da doğrulanır.
- **`userId === musteri_id` kontrolü geçmeden** ürün, miktar veya tutar cevap alanlarına eklenmez.
  Eşleşmezse yalnızca genel sahiplik uyarısı ve devir üretilir; gerçek sahibin kimliği açıklanmaz.
- Sahiplik eşleşince ürün başlıkları, miktarlar ve doğrudan API `total` değeri kullanılır. Ürünlerden yeni toplam hesaplanmaz.
  Para birimi, kargo durumu, takip numarası veya teslim tarihi uydurulmaz; eksiklik cevapta belirtilir.
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

25 Eylül 2026 10.21 Europe/Istanbul itibarıyla **Vitest 3.2.7: 4 dosya, 100 test başarılı**;
`npm run typecheck` başarılı. Testler altı konuyu, TR/EN örnekleri, hassas önceliği ve API'nin çağrılmamasını,
numara ayrımını, iki ayrı sahiplik fixture'ını, ürün/miktar/total kullanımını, JSON/HTML/log gizliliğini,
404/timeout/bağlantı/429/5xx/bozuk yanıtları, sınırlı retry'ı, işlem devamlılığını ve HTML escape'i kapsar.
Verilen 15 mesaj ayrıca mock adaptörle sıra, tam alanlar, boolean devir ve özet tutarlılığı açısından test edilir.

`tests/fixtures/carts.ts` **yalnızca sentetik test verisidir**. Runtime kodu fixture içe aktarmaz.
15 mesajlık mock testte tüm siparişlerin bulunamadığı senaryo seçildiğinden 14 devir beklenir;
bu sayı aşağıdaki canlı sonuçtan bağımsızdır.

**Canlı çalıştırma: 25 Eylül 2026 yaklaşık 10.22 Europe/Istanbul.** İlk sandbox çalıştırmasında
HTTP yanıtı alınamadı (bağlantı hatası); güvenli hata çıktıları üretildi. Ağ izniyle yapılan tekrar gerçek API'ye ulaştı
ve teslim edilen çıktılar bu başarılı canlı çalıştırmayla yenilendi. Otomatik mock/fallback kullanılmadı.

| Canlı kontrol | Sonuç |
| --- | --- |
| Sipariş sorguları | 4 × HTTP 200, 1 × HTTP 404; her biri tek deneme |
| Mesaj 1 | Sahiplik eşleşmedi; ayrıntılar paylaşılmadan devir |
| Mesaj 2, 6, 8 | Sahiplik eşleşti; ürün/miktar/total kullanıldı |
| Mesaj 3 | Sipariş bulunamadı; HTTP 404 ve devir |
| Çıktı | 15 mesaj, girdi sırası korundu, 11 devir |
| Konular | ürün 3, fiyat 2, sipariş 5, iade/şikâyet 1, istenmeyen etki 1, diğer 3 |

Teslim çıktıları: [talepler.json](A-mesaj-otomasyonu/talepler.json) ve [ozet.html](A-mesaj-otomasyonu/ozet.html).
Canlı veri daha sonra değişebilir; testlerin geçmesi tek başına canlı API'nin çalıştığı anlamına gelmez.
HTML içerik/escape testleri geçti; tarayıcıda görsel inceleme denemesi `file://` URL güvenlik politikası nedeniyle engellendi.
Bu nedenle tarayıcı görünümü doğrulanmış olarak raporlanmıyor.

## Sınırlamalar ve kayıtlar

Kurallar tüm doğal dil, yazım hatası veya olumsuzlama çeşitlerini kapsamaz; hassas sözcükler ihtiyatlı biçimde devre yol açabilir.
Ürün bilgisi/fiyat entegrasyonu, otomatik cevap gönderimi, gerçek kargo takibi ve Bölüm B bu teslim aşamasında yoktur.
CLI küçük JSON dosyasını belleğe alır ve mesajları sırayla işler; kuyruk, paralel işleme veya kalıcı veritabanı eklenmedi.

Kullanıcı promptunun tam kaydı [promptlar/A-codex.md](promptlar/A-codex.md) içinde.
Başarısız denemeler, düzeltmeler ve komut sonuçları [çalışma günlüğünde](A-mesaj-otomasyonu/CALISMA-GUNLUGU.md).

Bölüm A tamamlama kaydı: 25.09.2026 10.27 Europe/Istanbul.
