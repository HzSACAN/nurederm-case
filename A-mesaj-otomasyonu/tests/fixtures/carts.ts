import type { Cart } from '../../src/types.ts';

// Synthetic test data only. Never imported by runtime code or live outputs.
export const ownedCart: Cart = {
  id: 42, userId: 71, total: 345.67,
  products: [{ title: 'Test serum', quantity: 2 }, { title: 'Test tonik', quantity: 3 }],
};
export const otherOwnersCart: Cart = {
  id: 42, userId: 987654321, total: 91827.46,
  products: [{ title: 'GİZLİ-ÜRÜN-<script>secret()</script>', quantity: 8675309 }],
};
