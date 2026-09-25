import { isObject, isPositiveInteger } from './types.ts';
import type { Message } from './types.ts';

export function parseMessages(value: unknown): Message[] {
  if (!Array.isArray(value)) throw new Error('Girdi bir JSON dizisi olmalı.');
  const messages: Message[] = [];
  const ids = new Set<number>();
  for (const [index, item] of (value as unknown[]).entries()) {
    if (!isObject(item) || !isPositiveInteger(item.id) || !isPositiveInteger(item.musteri_id)
      || typeof item.kanal !== 'string' || !item.kanal.trim()
      || typeof item.mesaj !== 'string' || !item.mesaj.trim() || ids.has(item.id)) {
      throw new Error(`Girdi kaydı ${index + 1} geçersiz veya yinelenen ID içeriyor.`);
    }
    ids.add(item.id);
    messages.push({ id: item.id, kanal: item.kanal, musteri_id: item.musteri_id, mesaj: item.mesaj });
  }
  return messages;
}
