import { readFile } from 'node:fs/promises';
import { describe, expect, it, vi } from 'vitest';
import { parseMessages } from '../src/input.ts';
import { processMessages } from '../src/processor.ts';
import { escapeHtml, renderHtml, summarize } from '../src/output.ts';
import { TOPICS } from '../src/types.ts';
import type { CartLookup, RequestRecord } from '../src/types.ts';

describe('girdi ve özet sözleşmesi', () => {
  it('verilen 15 girdi için tam alanlar, sıra, sınıflandırma ve tutarlı sayılar', async () => {
    const raw: unknown = JSON.parse(await readFile(new URL('../../mesajlar.json', import.meta.url), 'utf8'));
    const input = parseMessages(raw);
    // This integration test uses a synthetic adapter, never the live API.
    const lookup = vi.fn<CartLookup>().mockResolvedValue({ ok: false, kind: 'not-found', status: 404, attempts: 1 });
    const records = await processMessages(input, lookup);
    expect(records).toHaveLength(15);
    expect(records.map(record => record.id)).toEqual(input.map(item => item.id));
    expect(records.map(record => record.konu)).toEqual([
      'siparis-durumu', 'siparis-durumu', 'siparis-durumu', 'istenmeyen-etki', 'iade-sikayet',
      'siparis-durumu', 'diger', 'siparis-durumu', 'urun-sorusu', 'fiyat', 'urun-sorusu', 'diger', 'urun-sorusu', 'fiyat', 'diger',
    ]);
    for (const record of records) {
      expect(Object.keys(record).sort()).toEqual(['id', 'konu', 'devret', 'cevap_taslagi', 'not'].sort());
      expect(TOPICS).toContain(record.konu);
      expect(typeof record.devret).toBe('boolean');
      expect(typeof record.cevap_taslagi).toBe('string');
      expect(typeof record.not).toBe('string');
    }
    expect(lookup.mock.calls).toEqual([[12], [5], [9999], [3], [4]]);
    const summary = summarize(records);
    expect(summary).toEqual({ total: 15, handoffs: 14, topics: {
      'urun-sorusu': 3, fiyat: 2, 'siparis-durumu': 5, 'iade-sikayet': 1, 'istenmeyen-etki': 1, diger: 3,
    } });
    expect(Object.values(summary.topics).reduce((a, b) => a + b, 0)).toBe(records.length);
    const html = renderHtml(records);
    expect(html).toContain('Toplam mesaj <strong>15</strong>');
    expect(html).toContain('Temsilciye devir <strong>14</strong>');
    expect(html.match(/<tr>/g)).toHaveLength(16);
    for (const topic of TOPICS) expect(html).toContain(`<span>${topic}</span><strong>${summary.topics[topic]}</strong>`);
  });
  it('sayılara sabit değer koymaz; boş liste ve farklı veri', () => {
    expect(summarize([]).total).toBe(0);
    expect(renderHtml([])).toContain('Toplam mesaj <strong>0</strong>');
    const record: RequestRecord = { id: 891, konu: 'fiyat', devret: false, cevap_taslagi: 'x', not: 'y' };
    expect(summarize([record])).toMatchObject({ total: 1, handoffs: 0, topics: { fiyat: 1 } });
  });
  it('tüm özel karakterleri escape eder, script ve attribute eklenemez', () => {
    const hostile = `<script>alert("x")</script> & ' onclick="attack()"`;
    const record: RequestRecord = { id: 801, konu: 'diger', devret: true, cevap_taslagi: hostile, not: hostile };
    const html = renderHtml([record]);
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('onclick="attack()"');
    expect(html).toContain('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; &#39; onclick=&quot;attack()&quot;');
    expect(escapeHtml('<>&"\'')).toBe('&lt;&gt;&amp;&quot;&#39;');
  });
  it('yetkili siparişin zararlı ürün başlığını da escape eder', async () => {
    const records = await processMessages([{ id: 91, kanal: 'test', musteri_id: 72, mesaj: 'order #52' }], async () => ({
      ok: true, cart: { id: 52, userId: 72, total: 8, products: [{ title: '<img src=x onerror=alert(1)>', quantity: 1 }] },
    }));
    expect(renderHtml(records)).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(renderHtml(records)).not.toContain('<img');
  });
  it.each([null, {}, [{ id: 1 }], [{ id: 1, kanal: 'x', musteri_id: '7', mesaj: 'x' }]])('hatalı girdiyi reddeder: %j', raw => {
    expect(() => parseMessages(raw)).toThrow();
  });
  it('yinelenen ID için sessiz veri kaybı yapmaz', () => {
    const item = { id: 99, kanal: 'test', musteri_id: 1, mesaj: 'selam' };
    expect(() => parseMessages([item, item])).toThrow('yinelenen ID');
  });
});
