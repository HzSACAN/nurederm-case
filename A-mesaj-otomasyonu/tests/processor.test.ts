import { describe, expect, it, vi } from 'vitest';
import { processMessage, processMessages } from '../src/processor.ts';
import { createCartClient } from '../src/http-client.ts';
import type { HttpEvent } from '../src/http-client.ts';
import { renderHtml } from '../src/output.ts';
import type { ApiFailure, CartLookup, Message } from '../src/types.ts';
import { otherOwnersCart, ownedCart } from './fixtures/carts.ts';

const message = (text: string): Message => ({ id: 8001, kanal: 'whatsapp', musteri_id: 71, mesaj: text });

describe('mesaj güvenliği ve işlem devamlılığı', () => {
  it.each([
    '42 numaralı siparişim nerede? Fiyat? Kullandım, yüzüm yandı; iade istiyorum.',
    '42 numaralı siparişim hasarlı geldi, iade istiyorum. Krem fiyatı nedir?',
    'My order #42 caused a rash. I want a refund.',
  ])('hassas mesajda API çağırmaz: %s', async text => {
    const lookup = vi.fn<CartLookup>();
    const result = await processMessage(message(text), lookup);
    expect(result.devret).toBe(true);
    expect(result.cevap_taslagi).toBe('Mesajınızı müşteri temsilcimize yönlendiriyoruz. Temsilcimiz talebinizi değerlendirecek.');
    expect(lookup).not.toHaveBeenCalled();
  });
  it('fiyat+sipariş yetkili içeriği korur ve fiyat için açıkça devreder', async () => {
    const lookup = vi.fn<CartLookup>().mockResolvedValue({ ok: true, cart: ownedCart });
    const result = await processMessage(message('42 numaralı siparişim nerede, serum fiyatı nedir?'), lookup);
    expect(result.konu).toBe('siparis-durumu');
    expect(result.devret).toBe(true);
    expect(result.cevap_taslagi).toContain('Test serum (2 adet)');
    expect(result.cevap_taslagi).toContain('Test tonik (3 adet)');
    expect(result.cevap_taslagi).toContain('Toplam: 345.67');
    expect(result.cevap_taslagi).toContain('Fiyat talebinizi temsilcimize yönlendiriyoruz.');
    expect(result.cevap_taslagi).toContain('Kargo durumunuzu şu anda doğrulayamıyoruz.');
    expect(result.cevap_taslagi).not.toMatch(/API|HTTP|dummyjson|\btotal\b|userId|products|₺|\$|€|\bTL\b|USD/i);
    expect(result.not).toContain('İkincil fiyat talebi');
    expect(lookup).toHaveBeenCalledExactlyOnceWith(42);
  });
  it('eksik numara için müşteri ID kullanmaz', async () => {
    const lookup = vi.fn<CartLookup>();
    for (const priceQuestion of ['', ' Ayrıca serum fiyatı nedir?']) {
      const result = await processMessage(message('Müşteri numaram 71. 200 ml serum siparişim hâlâ ulaşmadı' + priceQuestion), lookup);
      expect(result.konu).toBe('siparis-durumu');
      expect(result.devret).toBe(priceQuestion.length > 0);
      expect(result.cevap_taslagi).toContain('sipariş numaranızı');
      if (priceQuestion) expect(result.cevap_taslagi).toContain('Fiyat talebinizi temsilcimize yönlendiriyoruz.');
    }
    expect(lookup).not.toHaveBeenCalled();
  });
  it('birden fazla farklı sipariş için seçim yapmadan devreder', async () => {
    const lookup = vi.fn<CartLookup>();
    const result = await processMessage(message('42 ve 53 numaralı siparişlerim nerede?'), lookup);
    expect(result.devret).toBe(true);
    expect(result.not).toContain('Birden fazla');
    expect(lookup).not.toHaveBeenCalled();
  });
  it('aynı siparişin tekrarı tek sorgudur', async () => {
    const lookup = vi.fn<CartLookup>().mockResolvedValue({ ok: true, cart: ownedCart });
    await processMessage(message('42 numaralı siparişim, sipariş no: 42'), lookup);
    expect(lookup).toHaveBeenCalledExactlyOnceWith(42);
  });
  it('beklenen sahip mockunda ürün, miktar ve API total kullanılır', async () => {
    const lookup = vi.fn<CartLookup>().mockResolvedValue({ ok: true, cart: ownedCart });
    const result = await processMessage(message('42 numaralı siparişim nerede?'), lookup);
    expect(result.devret).toBe(false);
    expect(result.cevap_taslagi).toContain('Test serum (2 adet)');
    expect(result.cevap_taslagi).toContain('Test tonik (3 adet)');
    expect(result.cevap_taslagi).toContain('Toplam: 345.67');
    expect(result.cevap_taslagi).toContain('Kargo durumunuzu şu anda doğrulayamıyoruz.');
    expect(result.cevap_taslagi).not.toMatch(/API|HTTP|dummyjson|\btotal\b|userId|products/i);
    expect(result.not).toContain('API total');
    expect(result.not).toContain('Test API');
    expect(result.cevap_taslagi).not.toMatch(/₺|\$|€|\bTL\b|USD|yarın|kargoya verildi/);
  });
  it('farklı sahip mockunda bütün çıktı alanları, HTML ve loglar güvenlidir', async () => {
    const logs: HttpEvent[] = [];
    const consoleSpies = [vi.spyOn(console, 'log').mockImplementation(() => {}), vi.spyOn(console, 'warn').mockImplementation(() => {}), vi.spyOn(console, 'error').mockImplementation(() => {})];
    try {
      const client = createCartClient({
        fetch: async () => ({ status: 200, json: async (): Promise<unknown> => otherOwnersCart }),
        onEvent: event => logs.push(event),
      });
      const results = await processMessages([
        message('42 numaralı siparişim nerede?'),
        { ...message('42 numaralı siparişim nerede, serum fiyatı nedir?'), id: 8002 },
      ], client);
      for (const result of results) {
        expect(result.konu).toBe('siparis-durumu');
        expect(result.devret).toBe(true);
        expect(result.not).toContain('Sahiplik eşleşmedi');
      }
      expect(results[1]?.cevap_taslagi).toContain('Fiyat talebinizi temsilcimize yönlendiriyoruz.');
      const allGenerated = JSON.stringify(results) + renderHtml(results) + JSON.stringify(logs)
        + JSON.stringify(consoleSpies.map(spy => spy.mock.calls));
      for (const secret of ['GİZLİ-ÜRÜN', 'secret()', '91827.46', '987654321', '8675309']) {
        expect(allGenerated).not.toContain(secret);
      }
      expect(logs).toEqual([
        { kind: 'success', status: 200, attempts: 1 },
        { kind: 'success', status: 200, attempts: 1 },
      ]);
    } finally { consoleSpies.forEach(spy => spy.mockRestore()); }
  });

  const failures: ApiFailure[] = [
    { ok: false, kind: 'not-found', status: 404, attempts: 1 },
    { ok: false, kind: 'timeout', status: null, attempts: 3 },
    { ok: false, kind: 'network', status: null, attempts: 3 },
    { ok: false, kind: 'http', status: 429, attempts: 3 },
    { ok: false, kind: 'http', status: 503, attempts: 3 },
    { ok: false, kind: 'invalid-response', status: 200, attempts: 1 },
  ];
  it.each(failures)('$kind / $status güvenli devir üretir', async failure => {
    const result = await processMessage(message('order #42'), async () => failure);
    expect(result.devret).toBe(true);
    expect(result.cevap_taslagi).toContain('temsilcimize');
    if (failure.kind === 'not-found') expect(result.cevap_taslagi).toContain('bulunamadı');
    expect(result.not).toContain(`deneme: ${failure.attempts}`);
  });
  it('ilk sorgu başarısız olsa da sonraki mesajı ve siparişi işler', async () => {
    const lookup = vi.fn<CartLookup>().mockRejectedValueOnce(new Error('PRIVATE-CART'))
      .mockResolvedValue({ ok: true, cart: ownedCart });
    const results = await processMessages([
      message('order #42'), { ...message('Serum fiyatı?'), id: 8002 }, { ...message('order #42'), id: 8003 },
    ], lookup);
    expect(results).toHaveLength(3);
    expect(results.map(result => result.devret)).toEqual([true, true, false]);
    expect(results[2]?.cevap_taslagi).toContain('Test serum');
    expect(JSON.stringify(results)).not.toContain('PRIVATE-CART');
  });
  it('spam ve genel politika için dış bağlantı veya ürün API çağrısı yapmaz', async () => {
    const lookup = vi.fn<CartLookup>();
    const results = await processMessages([
      message('Takipçi kasmak için organik takipçi: https://example.invalid'),
      { ...message('Hayvanlar üzerinde test yapıyor musunuz?'), id: 8002 },
    ], lookup);
    expect(results[0]).toMatchObject({ konu: 'diger', devret: false, cevap_taslagi: '' });
    expect(results[1]).toMatchObject({ konu: 'diger', devret: true });
    expect(lookup).not.toHaveBeenCalled();
  });
});
