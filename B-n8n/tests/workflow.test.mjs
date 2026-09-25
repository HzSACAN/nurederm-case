import { describe, expect, it } from 'vitest';
import { load } from 'cheerio';
import { byName, code, completedScan, compare, fixture, html, initial, items, next, page, previous, runGraph, singlePageFixture, workflow } from './harness.mjs';

describe('workflow içindeki gerçek Code ve HTML ayarları', () => {
  it('aralıklı sayfa bağlantılarında ilk/son ve aradaki sayfaları tarar; tek sayfayı da tamamlar', () => {
    let state = initial();
    const visited = [];
    do {
      const $ = load(fixture);
      $('.pagination .active span').text(String(state.page));
      $('a.title').each((index, element) => $(element).attr('href', `/test-sites/e-commerce/static/product/${state.page * 1000 + index}`));
      visited.push(state.page);
      state = page(state, $.html());
    } while (state.more_pages);
    expect(visited).toEqual([1, 2, 3, 4]);
    expect(code('Finalize Scan', items([state]))[0].json.product_count).toBe(8);
    const single = completedScan();
    expect(single.visited_pages).toEqual([1]);
    expect(single.more_pages).toBe(false);
  });

  it('sonraki sayfada keşfedilen daha ileri hedefleri plana dahil eder', () => {
    const $ = load(fixture);
    $('.pagination a').attr('href', '?page=2');
    let state = page(initial(), $.html());
    expect(state.last_page).toBe(2);
    $('.active span').text('2');
    $('.pagination a').last().attr('href', '?page=5');
    $('a.title').each((index, element) => $(element).attr('href', `/test-sites/e-commerce/static/product/${300 + index}`));
    state = page(state, $.html());
    expect(state.last_page).toBe(5);
    expect(state.page).toBe(3);
    expect(state.more_pages).toBe(true);
  });

  it('kategori dışına çıkmaz ve sınırı başarı olarak yorumlamaz', () => {
    for (const href of ['https://example.invalid/?page=2', '//example.invalid/?page=2', '?page=200', '?page=2&redirect=evil', '/test-sites/e-commerce/static/phones?page=2']) {
      const $ = load(fixture);
      $('.pagination a').first().attr('href', href);
      expect(() => page(initial(), $.html())).toThrow(/Sayfa|sayfa/);
    }
    const state = page(initial(), fixture);
    expect(() => code('Finalize Scan', items([state]))).toThrow('Eksik tarama');
  });

  it('tam başlığı, fiyatı, sıfır dahil yorum sayısını ve mutlak URLyi aynı karttan çıkarır', () => {
    const state = page(initial(), fixture);
    expect(state.products).toEqual([
      { product_name: 'Alpha & Beta Laptop <Pro> Full Name', price: 416.99, review_count: 12, product_url: 'https://webscraper.io/test-sites/e-commerce/static/product/101' },
      { product_name: 'Zero Review Laptop', price: 0, review_count: 0, product_url: 'https://webscraper.io/test-sites/e-commerce/static/product/202' },
    ]);
    expect(state.run_id).toContain('offline-fixture');
    expect(Number.isFinite(Date.parse(state.scraped_at))).toBe(true);
  });

  it('eksik/geçersiz fiyatı sıfıra veya komşu kartın fiyatına dönüştürmez', () => {
    for (const value of ['', 'N/A', '$-1', '$NaN', '$Infinity', '$1.999']) {
      const $ = load(fixture);
      $('[itemprop="price"]').first().text(value);
      expect(() => page(initial(), $.html())).toThrow(/fiyat/);
    }
    const $ = load(fixture);
    $('[itemprop="price"]').first().remove();
    expect(() => page(initial(), $.html())).toThrow('Eksik/çoklu fiyat');
    expect(html('Extract Card HTML', items([{ card_html: $('.thumbnail').eq(1).html() }]))[0].json.prices).toEqual(['$0.00']);
    const source = code('Page State', items([initial()]));
    const checked = code('Check HTTP', items([{ body: fixture, statusCode: 200 }]), { 'Page State': source });
    const cards = code('Expand Cards', html('Extract Page HTML', checked), { 'Check HTTP': checked });
    const partial = html('Extract Card HTML', cards).slice(0, -1);
    expect(() => code('Validate Page', partial, { 'Expand Cards': cards })).toThrow('Eksik ürün kartı çıktısı');
  });

  it('zorunlu alan kaybı, boş sayfa, HTTP hatası ve tekrarlanan sayfa taramayı durdurur', () => {
    expect(() => page(initial(), '<html><body>no products</body></html>')).toThrow('Hiç ürün');
    for (const status of [404, 429, 500]) expect(() => page(initial(), fixture, status)).toThrow('Sayfa alınamadı');
    expect(() => page(initial(), '', 200)).toThrow('boş HTTP');
    for (const selector of ['a.title', '[itemprop="reviewCount"]']) {
      const $ = load(fixture); $(selector).first().remove();
      expect(() => page(initial(), $.html())).toThrow(/Eksik/);
    }
    const first = page(initial(), fixture);
    const $ = load(fixture); $('.active span').text('2');
    expect(() => page(first, $.html())).toThrow('Yinelenen ürün');
  });

  it('ilk çalışmada tüm ürünler yenidir, boş Sheets çıktısı zinciri kesmez', () => {
    const scan = completedScan();
    const state = previous(scan, []);
    expect(state.previous_run).toBeNull();
    const result = compare(state, []);
    expect(result.first_run).toBe(true);
    expect(result.changes.map(change => change.kind)).toEqual(['new', 'new']);
    for (const name of ['Read Runs', 'Read Snapshots']) {
      expect(byName(name).alwaysOutputData).toBe(true);
      expect(byName(name).onError).toBe('continueRegularOutput');
    }
  });

  it('en yeni tamamlanmış run seçilir; yarım runlar ve eski snapshotlar referansa karışmaz', () => {
    const scan = completedScan();
    const runs = [
      { run_id: 'old', completed_at: '2026-09-23T06:00:00.000Z', product_count: 2 },
      { run_id: 'done', completed_at: '2026-09-24T06:00:00.000Z', product_count: '2' },
    ];
    const state = previous(scan, runs.reverse());
    expect(state.previous_run.run_id).toBe('done');
    const rows = scan.products.map(product => ({ ...product, run_id: 'done', price: String(product.price) }));
    rows.reverse();
    rows.push({ ...rows[0], run_id: 'partial', price: 'BROKEN' }, { ...rows[1], run_id: 'old', price: 9000 });
    expect(compare(state, rows).changes).toEqual([]);
    expect(() => compare(state, rows.filter(row => row.run_id !== 'done'))).toThrow('snapshot sayısı uyuşmuyor');
  });

  it('URL üzerinden yeni ürün, artış ve düşüş belirlenir; sayısal metin aynı fiyattır', () => {
    const scan = completedScan();
    scan.products.push({ ...scan.products[0], product_url: 'https://webscraper.io/test-sites/e-commerce/static/product/303', product_name: 'New laptop', price: 500 });
    const state = previous(scan, [{ run_id: 'done', completed_at: '2026-09-24T06:00:00Z', product_count: 2 }]);
    const snapshots = [
      { ...scan.products[1], run_id: 'done', price: '20.00' },
      { ...scan.products[0], run_id: 'done', price: 400 },
    ];
    expect(compare(state, snapshots).changes.map(change => [change.kind, change.old_price, change.price]))
      .toEqual([['price', 400, 416.99], ['price', 20, 0], ['new', undefined, 500]]);
    snapshots[1].price = '416.99';
    expect(compare(state, snapshots).changes).toHaveLength(2);
  });

  it('Sheets hatası ilk çalışmada bile boş geçmiş sayılmaz', () => {
    const scan = completedScan();
    expect(() => previous(scan, [{ error: 'permission denied' }])).toThrow('runs okuması başarısız');
    const state = previous(scan, []);
    expect(() => compare(state, [{ error: 'timeout' }])).toThrow('snapshots okuması başarısız');
    expect(() => code('Compare Snapshots', [{ json: {}, error: { message: 'network' } }], { 'Select Previous Run': items([state]) })).toThrow('snapshots okuması başarısız');
  });

  it('tam snapshot yazımı doğrulanmadan tamamlanma kaydı hazırlanmaz', () => {
    const state = compare(previous(completedScan(), []), []);
    const rows = code('Snapshot Rows', items([state]));
    expect(Object.keys(rows[0].json)).toEqual(['run_id', 'scraped_at', 'product_url', 'product_name', 'price', 'review_count']);
    expect(() => code('Confirm Snapshots', rows.slice(1), { 'Compare Snapshots': items([state]) })).toThrow('Snapshot yazımı tamamlanmadı');
    const confirmed = code('Confirm Snapshots', rows, { 'Compare Snapshots': items([state]) });
    expect(confirmed[0].json.run_id).toBe(state.run_id);
    const run = code('Prepare Completed Run', confirmed, { 'Compare Snapshots': items([state]) })[0].json;
    expect(run.product_count).toBe(state.products.length);
    expect(Object.keys(run)).toEqual(['run_id', 'completed_at', 'product_count']);
    expect(byName('Append Snapshots').parameters.options.cellFormat).toBe('RAW');
  });

  it('Telegram özel karakterleri güvenlidir; uzun sonuç özetlenir ve değişmeyende bildirim kapalıdır', () => {
    const state = compare(previous(completedScan(), []), []);
    let result = code('Build Notification', items([state]))[0].json;
    expect(result.has_changes).toBe(true);
    expect(result.notification_text).toContain('Alpha &amp; Beta Laptop &lt;Pro&gt; Full Name');
    expect(result.notification_text).toContain('$416.99');
    expect(result.notification_text).toContain(state.products[0].product_url);
    state.changes = [{ ...state.products[0], kind: 'price', old_price: 900 }, ...Array.from({ length: 150 }, () => ({ ...state.products[0], kind: 'new' }))];
    result = code('Build Notification', items([state]))[0].json;
    expect(result.notification_text).toContain('$900.00 → $416.99');
    expect(result.notification_text.length).toBeLessThanOrEqual(3900);
    expect(result.notification_text).toContain('ek değişiklik');
    expect(result.notification_text).toContain('https://docs.google.com/spreadsheets/d/offline_sheet/edit');
    state.changes = [];
    expect(code('Build Notification', items([state]))[0].json.has_changes).toBe(false);
    expect(next('Has Changes', 1)).toEqual(['Prepare Completed Run']);
  });

  it('hata mesajı neden ve sayfayı içerir; Telegram HTML olarak kaçışlanır', () => {
    const state = { ...initial(), page_url: 'https://webscraper.io/test-sites/e-commerce/static/computers/laptops?page=3' };
    const result = code('Build Error', items([{ error: 'HTTP timeout <bad>' }]), { 'Page State': items([state]) })[0].json;
    expect(result.failure).toContain('HTTP timeout <bad>');
    expect(result.failure).toContain('page=3');
    expect(result.telegram_text).toContain('&lt;bad&gt;');
  });
});

describe('workflow yapısı ve yürütme kapıları', () => {
  it('bağlı grafikte tüm sayfalardan sonra yazar; connector çıktıları run bağlamını kaybettirmez', () => {
    const pages = {};
    for (let number = 1; number <= 4; number++) {
      const $ = load(fixture);
      $('.active span').text(String(number));
      $('a.title').each((index, element) => $(element).attr('href', `/test-sites/e-commerce/static/product/${1000 * number + index}`));
      pages[number] = $.html();
    }
    const result = runGraph({ pages });
    expect(result.failed).toBe(false);
    expect(result.trace.filter(name => name === 'Fetch Page')).toHaveLength(4);
    expect(result.snapshotRows).toHaveLength(8);
    expect(result.completedRuns).toHaveLength(1);
    expect(new Set(result.snapshotRows.map(row => row.run_id))).toEqual(new Set([result.completedRuns[0].run_id]));
    expect(result.trace.indexOf('Append Snapshots')).toBeGreaterThan(result.trace.lastIndexOf('Validate Page'));
    expect(result.trace.indexOf('Append Completed Run')).toBeGreaterThan(result.trace.indexOf('Send Changes'));
    const unchanged = runGraph({ pages, runs: result.completedRuns, snapshots: result.snapshotRows });
    expect(unchanged.snapshotRows).toHaveLength(8);
    expect(unchanged.completedRuns).toHaveLength(1);
    expect(unchanged.alerts).toHaveLength(0);
    expect(unchanged.failed).toBe(false);
  });

  it('eksik sayfa veya Sheets/bildirim hatası grafikte tamamlanma kaydına ulaşamaz', () => {
    const missingPage = runGraph({ pages: { 1: fixture } });
    expect(missingPage.failed).toBe(true);
    expect(missingPage.snapshotRows).toEqual([]);
    expect(missingPage.completedRuns).toEqual([]);
    expect(missingPage.errors[0]).toContain('page=2');
    for (const failAt of ['Read Runs', 'Read Snapshots', 'Append Snapshots', 'Send Changes']) {
      const result = runGraph({ pages: { 1: singlePageFixture() }, failAt });
      expect(result.failed).toBe(true);
      expect(result.completedRuns).toEqual([]);
      expect(result.errors).toHaveLength(1);
    }
    const bothFailed = runGraph({ pages: {}, failErrorNotification: true });
    expect(bothFailed.failed).toBe(true);
    expect(bothFailed.trace.at(-1)).toBe('Fail Execution');
    expect(bothFailed.completedRuns).toEqual([]);
  });

  it('benzersiz isim/ID, geçerli bağlantılar, pasif teslim ve 09.00 Istanbul ayarı', () => {
    const names = workflow.nodes.map(node => node.name);
    expect(new Set(names).size).toBe(names.length);
    expect(new Set(workflow.nodes.map(node => node.id)).size).toBe(names.length);
    expect(workflow.active).toBe(false);
    expect(workflow.settings.timezone).toBe('Europe/Istanbul');
    expect(byName('Daily 09 Istanbul').parameters.rule.interval).toEqual([{ field: 'days', daysInterval: 1, triggerAtHour: 9, triggerAtMinute: 0 }]);
    expect(workflow.pinData).toBeUndefined();
    for (const node of workflow.nodes) {
      expect(node.credentials).toBeUndefined();
      if (node.type.endsWith('.code')) expect(node.parameters.jsCode).not.toMatch(/\brequire\s*\(|\bfetch\s*\(|\bimport\s|\bdocument\.|\bDOMParser\b|\$getWorkflowStaticData/);
    }
    for (const [name, connection] of Object.entries(workflow.connections)) {
      expect(names).toContain(name);
      for (const edge of connection.main.flat()) {
        expect(names).toContain(edge.node);
        expect(edge.type).toBe('main');
        expect(edge.index).toBe(0);
      }
    }
    expect(byName('Fetch Page')).toMatchObject({ retryOnFail: true, maxTries: 3, waitBetweenTries: 1000 });
    expect(byName('Fetch Page').parameters.options.redirect.redirect.followRedirects).toBe(false);
    expect(next('More Pages', 0)).toEqual(['Page Delay']);
    expect(next('Page Delay')).toEqual(['Page State']);
    expect(next('More Pages', 1)).toEqual(['Finalize Scan']);
  });

  it('bütün kritik hata çıkışları bildirim ve Stop And Error yoluna gider; başarı yoluna bağlanmaz', () => {
    for (const node of workflow.nodes.filter(node => node.onError === 'continueErrorOutput' && node.name !== 'Send Error')) {
      expect(next(node.name, 1)).toEqual(['Build Error']);
    }
    expect(next('Build Error')).toEqual(['Send Error']);
    expect(next('Send Error', 0)).toEqual(['Fail Execution']);
    expect(next('Send Error', 1)).toEqual(['Fail Execution']);
    expect(byName('Fail Execution').type).toBe('n8n-nodes-base.stopAndError');
    expect(next('Fail Execution')).toEqual([]);
    expect(next('Read Runs')).toEqual(['Select Previous Run']);
    expect(next('Read Snapshots')).toEqual(['Compare Snapshots']);
    expect(next('Send Changes', 1)).toEqual(['Build Error']);
    expect(next('Append Snapshots')).toEqual(['Confirm Snapshots']);
    expect(next('Send Changes')).toEqual(['Prepare Completed Run']);
    expect(next('Prepare Completed Run')).toEqual(['Append Completed Run']);
    const inbound = name => Object.entries(workflow.connections).flatMap(([from, value]) => value.main.flat().filter(edge => edge.node === name).map(() => from));
    expect(inbound('Append Snapshots')).toEqual(['Snapshot Rows']);
    expect(inbound('Snapshot Rows')).toEqual(['Compare Snapshots']);
    expect(inbound('Append Completed Run')).toEqual(['Prepare Completed Run']);
    expect(inbound('Prepare Completed Run').sort()).toEqual(['Has Changes', 'Send Changes']);
  });
});
