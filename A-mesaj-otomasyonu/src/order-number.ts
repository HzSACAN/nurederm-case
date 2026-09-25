import { normalize } from './normalize.ts';
import { isPositiveInteger } from './types.ts';

export function extractOrderNumbers(message: string): number[] {
  const text = normalize(message);
  const numbers = new Set<number>();
  // Only numbers attached to an order expression are candidates. Customer IDs
  // and loose numbers (e.g. 200 ml) never enter this set.
  const list = String.raw`#?\d+(?:\s*(?:,|ve|and|&)\s*#?\d+)*`;
  const patterns = [
    new RegExp(String.raw`(?<![\w.,/-])\b(${list})\s*(?:numarali|nolu|no['’]?lu)\s+siparis[a-z]*\b`, 'g'),
    new RegExp(String.raw`\b(?:siparis[a-z]*|orders?)\s*(?:(?:numarasi|numaralari|numaram|no|number|numbers)\.?\s*)?[:#]?\s*(${list})\b(?![./-]\d)(?!\s*(?:ml|mg|gr|gram|litre|adet|gun[a-z]*|hafta[a-z]*|ay|yil|saat[a-z]*|days?|weeks?|months?|hours?|tl|lira)\b)`, 'g'),
  ];
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      for (const digits of (match[1] ?? '').matchAll(/\d+/g)) {
        const value = Number(digits[0]);
        if (isPositiveInteger(value)) numbers.add(value);
      }
    }
  }
  return [...numbers];
}
