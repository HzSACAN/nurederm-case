export const TOPICS = [
  'urun-sorusu', 'fiyat', 'siparis-durumu', 'iade-sikayet', 'istenmeyen-etki', 'diger',
] as const;
export type Topic = typeof TOPICS[number];

export interface Message {
  id: number;
  kanal: string;
  musteri_id: number;
  mesaj: string;
}

export interface RequestRecord {
  id: number;
  konu: Topic;
  devret: boolean;
  cevap_taslagi: string;
  not: string;
}

export interface Product { title: string; quantity: number }
export interface Cart { id: number; userId: number; products: Product[]; total: number }
export type FailureKind = 'not-found' | 'timeout' | 'network' | 'http' | 'invalid-response';
export interface ApiFailure { ok: false; kind: FailureKind; status: number | null; attempts: number }
export type CartResult = { ok: true; cart: Cart } | ApiFailure;
export type CartLookup = (id: number) => Promise<CartResult>;

export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
export function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}
