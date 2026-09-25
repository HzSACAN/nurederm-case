import { isObject, isPositiveInteger } from './types.ts';
import type { ApiFailure, Cart, CartLookup, CartResult, Product } from './types.ts';

export type FetchLike = (url: string, init: RequestInit) => Promise<Pick<Response, 'status' | 'json'>>;
export interface HttpEvent { kind: 'success' | ApiFailure['kind']; status: number | null; attempts: number }
export interface ClientOptions {
  fetch?: FetchLike;
  timeoutMs?: number;
  retries?: number;
  sleep?: (ms: number) => Promise<void>;
  onEvent?: (event: HttpEvent) => void;
}

export function parseCart(value: unknown, requestedId: number): Cart | null {
  if (!isObject(value) || value.id !== requestedId || !isPositiveInteger(value.userId)
    || typeof value.total !== 'number' || !Number.isFinite(value.total) || value.total < 0
    || !Array.isArray(value.products) || value.products.length === 0) return null;
  const products: Product[] = [];
  for (const item of value.products as unknown[]) {
    if (!isObject(item) || typeof item.title !== 'string' || !item.title.trim()
      || !isPositiveInteger(item.quantity)) return null;
    products.push({ title: item.title, quantity: item.quantity });
  }
  return { id: requestedId, userId: value.userId, total: value.total, products };
}

export function createCartClient(options: ClientOptions = {}): CartLookup {
  const fetcher = options.fetch ?? globalThis.fetch;
  const timeoutMs = options.timeoutMs ?? 5000;
  const retries = options.retries ?? 2;
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0 || !Number.isInteger(retries) || retries < 0 || retries > 5) {
    throw new Error('Geçersiz HTTP istemcisi ayarı.');
  }
  const sleep = options.sleep ?? ((ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms)));
  return async (id: number): Promise<CartResult> => {
    for (let attempt = 1; attempt <= retries + 1; attempt++) {
      const controller = new AbortController();
      let timer: ReturnType<typeof setTimeout> | undefined;
      let status: number | null = null;
      let result: CartResult;
      const operation = async (): Promise<CartResult> => {
        const response = await fetcher(`https://dummyjson.com/carts/${id}`, {
          method: 'GET', signal: controller.signal, redirect: 'error', headers: { Accept: 'application/json' },
        });
        status = response.status;
        if (status < 200 || status >= 300) {
          return { ok: false, kind: status === 404 ? 'not-found' : 'http', status, attempts: attempt };
        }
        let body: unknown;
        try { body = await response.json(); }
        catch { return { ok: false, kind: 'invalid-response', status, attempts: attempt }; }
        if (isObject(body) && typeof body.message === 'string' && /not found/i.test(body.message)) {
          return { ok: false, kind: 'not-found', status, attempts: attempt };
        }
        const cart = parseCart(body, id);
        return cart ? { ok: true, cart } : { ok: false, kind: 'invalid-response', status, attempts: attempt };
      };
      try {
        const deadline = new Promise<never>((_resolve, reject) => {
          timer = setTimeout(() => { controller.abort(); reject(new Error('deadline')); }, timeoutMs);
        });
        // Deadline covers both headers and body, including transports that ignore abort.
        result = await Promise.race([operation(), deadline]);
      } catch {
        result = { ok: false, kind: controller.signal.aborted ? 'timeout' : 'network', status, attempts: attempt };
      } finally { clearTimeout(timer); }
      // Whitelisted telemetry only: never log response bodies, thrown errors, or owners.
      options.onEvent?.({ kind: result.ok ? 'success' : result.kind, status, attempts: attempt });
      if (result.ok) return result;
      const transient = result.kind === 'timeout' || result.kind === 'network'
        || (result.kind === 'http' && (result.status === 429 || (result.status !== null && result.status >= 500)));
      if (!transient || attempt > retries) return result;
      await sleep(200 * 2 ** (attempt - 1));
    }
    return { ok: false, kind: 'network', status: null, attempts: retries + 1 };
  };
}
