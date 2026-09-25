# Yerel n8n kurulumu ve gerçek import

25.09.2026 tarihinde resmî `docker.n8n.io/n8nio/n8n:2.40.7` imajı indirildi ve başlatıldı. Sayısal sürüm npm `stable/latest` metadata'sı ve GitHub `stable/packages/cli/package.json` üzerinden eşleşti; `docker exec ... n8n --version` da **2.40.7** döndürdü. Önceki **1.112.6**, workflow tasarımında incelenen kaynak sürümüdür; kurulu sürüm değildir.

- Arayüz: **http://localhost:5678/**; ilk girişte **Set up owner account** ekranı.
- Container: `nurederm-case-n8n`; yalnızca `127.0.0.1:5678:5678`.
- Kalıcı volume: `nurederm_case_n8n_data`, container içinde `/home/node/.n8n`.
- Tek servis, SQLite; TZ ve GENERIC_TIMEZONE Europe/Istanbul. Veritabanı, kullanıcı ve encryption key volume'da; depoda değil.
- İmaj digest: `sha256:ffeb52485f78b1b06c9a832205853cf75da72a07a514c9a27724df85979d6c34`.

Depo kökünden:

```sh
docker compose -f B-n8n/compose.yaml up -d
docker compose -f B-n8n/compose.yaml ps
docker exec -u node nurederm-case-n8n n8n --version
# Veriyi silmeden durdur:
docker compose -f B-n8n/compose.yaml stop
# Yeniden başlat:
docker compose -f B-n8n/compose.yaml start
```

`stop` kalıcı volume'u silmez. Volume silme veya `down -v` kullanmayın. Diğer container/volume'lara dokunulmadı. Yeni bir makinede aynı isimler başka işler için kullanılıyorsa compose içindeki container/volume adlarını, port doluysa yalnızca sol taraftaki host portunu değiştirin.

## Doğrulanan durum

Container Up; `/healthz` HTTP 200 ve `{"status":"ok"}`, editör `/` HTTP 200. Tarayıcıda gerçek hesap kurulum ekranı görüldü. JavaScript task runner kayıtlı. Tek servisli yerel case için internal runner seçildi; sürüm bunun ileride kaldırılacağı uyarısını veriyor. Python 3 bulunmadığına dair runner uyarısı da var; bu workflow yalnızca JavaScript Code düğümleri kullanıyor. Ek runner/Assistant/veritabanı/arama servisi kurulmadı.

Desteklenen Server CLI üzerinden **gerçek import başarılı**:

```sh
docker cp B-n8n/workflow.json nurederm-case-n8n:/tmp/nurederm-workflow.json
docker exec -u node nurederm-case-n8n n8n import:workflow --input=/tmp/nurederm-workflow.json
```

İlk deneme `workflow_entity.id` NOT NULL hatası verdi. Yalnızca üst düzey `id: NuredermCaseB2026` eklendi; ikinci deneme `Successfully imported 1 workflow` ile exit 0 döndü. Aynı ID'li workflow üzerine tekrar import yazabileceğinden bu komutu mevcut düzenlemeleri korumak istediğinizde körlemesine tekrar çalıştırmayın.

Import sonrası yalnızca workflow CLI ile dışa aktarılarak karşılaştırıldı: **30 düğüm, 14 Code düğümü, nodes ve connections birebir aynı; active false, activeVersionId null**. Kullanılan 11 farklı node tipi kurulu resmî `n8n-nodes-base` node kayıtlarında mevcut. Kimlik/credential/veritabanı export edilmedi. `/types/nodes.json` HTTP isteği hesap kurulmadan 401 döndüğü için UI üzerinden node kataloğu doğrulaması yapılmış sayılmıyor.

ID düzeltmesinden sonra B `npm test`: **12.18.21 Europe/Istanbul, 17/17 geçti, 1.75 saniye, exit 0**. O kurulum aşamasında execution ve ekran görüntüsü henüz yoktu. **Sonraki kullanıcı koşumu (25.09.2026, n8n 2.40.7): 20 sayfa tarandı, 117 ürün `Finalize Scan` başarı çıkışında doğrulandı; [tarama ekranı](tarama-sonucu.png).** Google Sheets ve Telegram bağlanmadı; uçtan uca çalıştırma yapılmadı. Son belge güncellemesinde tarama tekrar çalıştırılmadı.

## Kullanıcının sıradaki adımı

1. http://localhost:5678/setup adresinde owner hesabını kendi e-posta/ad/parolanızla oluşturun. Parolayı sohbete veya depoya yazmayın. Ardından Workflows listesinden **Nurederm — Günlük laptop fiyat takibi** akışını açın; gerekirse sayfayı yenileyin.
2. `Configuration` düğümünde spreadsheet ID ve Telegram chat ID placeholder'larını doldurun. Sheets'te `snapshots` ve `runs` sekmelerini [belgedeki sütunlarla](akis-aciklama.md#google-sheets-yapısı-ve-ilk-çalışma) hazırlayın.
3. Dört Google Sheets düğümünde Google Sheets OAuth2 credential oluşturup/seçip hesabı bağlayın; aynı credential'ı dört düğüme atayın. OAuth istemcisi gerekiyorsa credential ekranındaki callback URL'yi kullanın.
4. `Send Changes` ve `Send Error` düğümlerinde Telegram credential oluşturup bot token'ını **yalnızca n8n credential ekranına** girin; iki düğümde aynı bağlantıyı seçin.
5. Workflow'u **Publish etmeyin**; zamanlanmış çalışma pasif kalsın. Tarama aşamasının ekranı teslimde mevcut; credential bağlantıları ve gerçek uçtan uca çalıştırma kalan adımdır.

Resmî kaynaklar: [Docker kurulumu](https://docs.n8n.io/deploy/host-n8n/install-options/install-with-docker), [Compose rehberi](https://docs.n8n.io/deploy/host-n8n/install-options/install-using-docker-compose), [Server CLI import](https://docs.n8n.io/deploy/host-n8n/configure-n8n/use-the-command-line), [stable sürüm kaynağı](https://github.com/n8n-io/n8n/blob/stable/packages/cli/package.json). Compose rehberindeki Assistant ek servisleri kullanıcının istediği sade kapsam nedeniyle eklenmedi.
