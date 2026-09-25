import { describe, expect, it, vi } from 'vitest';
import { createCartClient } from '../src/http-client.ts';
import type { FetchLike } from '../src/http-client.ts';
import { ownedCart } from './fixtures/carts.ts';

const reply = (status: number, body: unknown = {}) => ({ status, json: async (): Promise<unknown> => body });

describe('HTTP ve runtime doğrulama', () => {
  it('sabit HTTPS endpointine GET gönderir ve yönlendirmeyi reddeder', async () => {
    const fetch = vi.fn<FetchLike>().mockResolvedValue(reply(200, { ...ownedCart, unused: 'ignored' }));
    const client = createCartClient({ fetch });
    expect(await client(42)).toEqual({ ok: true, cart: ownedCart });
    expect(fetch).toHaveBeenCalledWith('https://dummyjson.com/carts/42', expect.objectContaining({ method: 'GET', redirect: 'error', signal: expect.any(AbortSignal) }));
  });

  it.each([400, 401, 403, 404])('HTTP %i için retry yapmaz', async status => {
    const fetch = vi.fn<FetchLike>().mockResolvedValue(reply(status));
    const sleep = vi.fn(async () => {});
    expect(await createCartClient({ fetch, sleep })(42)).toEqual({ ok: false, kind: status === 404 ? 'not-found' : 'http', status, attempts: 1 });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });

  it('başarılı HTTP içinde not found mesajını da işler', async () => {
    const fetch = vi.fn<FetchLike>().mockResolvedValue(reply(200, { message: 'Cart with id 42 not found' }));
    expect(await createCartClient({ fetch })(42)).toMatchObject({ ok: false, kind: 'not-found' });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it.each([429, 500, 502, 503])('HTTP %i için sınırlı retry ve backoff uygular', async status => {
    const fetch = vi.fn<FetchLike>().mockResolvedValue(reply(status));
    const sleep = vi.fn(async () => {});
    expect(await createCartClient({ fetch, sleep })(42)).toEqual({ ok: false, kind: 'http', status, attempts: 3 });
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(sleep.mock.calls).toEqual([[200], [400]]);
  });

  it('geçici hatadan sonra gerçek yanıtı işler', async () => {
    const fetch = vi.fn<FetchLike>().mockResolvedValueOnce(reply(503)).mockResolvedValue(reply(200, ownedCart));
    expect(await createCartClient({ fetch, sleep: async () => {} })(42)).toEqual({ ok: true, cart: ownedCart });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('bağlantı hatasını güvenli biçimde döndürür', async () => {
    const fetch = vi.fn<FetchLike>().mockRejectedValue(new Error('secret transport content'));
    const result = await createCartClient({ fetch, sleep: async () => {} })(42);
    expect(result).toEqual({ ok: false, kind: 'network', status: null, attempts: 3 });
    expect(JSON.stringify(result)).not.toContain('secret');
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it.each(['headers', 'body'])('%s beklerken timeout tüm isteği sınırlar', async stage => {
    vi.useFakeTimers();
    try {
      const never = new Promise<never>(() => {});
      const fetch = vi.fn<FetchLike>().mockImplementation(async () => stage === 'headers' ? never : { status: 200, json: () => never });
      const promise = createCartClient({ fetch, timeoutMs: 50, sleep: async () => {} })(42);
      await vi.advanceTimersByTimeAsync(160);
      expect(await promise).toMatchObject({ ok: false, kind: 'timeout', attempts: 3 });
      expect(fetch).toHaveBeenCalledTimes(3);
      expect(fetch.mock.calls.every(call => call[1].signal?.aborted)).toBe(true);
    } finally { vi.useRealTimers(); }
  });

  const invalid: unknown[] = [
    null, [], {}, { ...ownedCart, id: 43 }, { ...ownedCart, userId: '71' },
    { ...ownedCart, total: '345.67' }, { ...ownedCart, total: Number.NaN },
    { ...ownedCart, total: -2 }, { ...ownedCart, products: [] },
    { ...ownedCart, products: [{ title: '', quantity: 1 }] },
    { ...ownedCart, products: [{ title: 'x', quantity: 0 }] },
    { ...ownedCart, products: [{ title: 'x', quantity: 1.5 }] },
  ];
  it.each(invalid.map((body, index) => ({ body, index })))('bozuk yanıt $index', async ({ body }) => {
    const fetch = vi.fn<FetchLike>().mockResolvedValue(reply(200, body));
    expect(await createCartClient({ fetch })(42)).toEqual({ ok: false, kind: 'invalid-response', status: 200, attempts: 1 });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it('JSON parse hatasını güvenli şekilde döndürür', async () => {
    const fetch = vi.fn<FetchLike>().mockResolvedValue({ status: 200, json: async () => { throw new Error('bad JSON'); } });
    expect(await createCartClient({ fetch })(42)).toMatchObject({ ok: false, kind: 'invalid-response' });
  });
});
