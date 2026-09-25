import { fileURLToPath } from 'node:url';

// Reuse Section A's installed test runtime; do not alter its manifest or lockfile.
export default {
  root: fileURLToPath(new URL('.', import.meta.url)),
  resolve: { alias: {
    vitest: fileURLToPath(new URL('../A-mesaj-otomasyonu/node_modules/vitest/dist/index.js', import.meta.url)),
    cheerio: fileURLToPath(new URL('../A-mesaj-otomasyonu/node_modules/cheerio/index.js', import.meta.url)),
    'html-to-text': fileURLToPath(new URL('../A-mesaj-otomasyonu/node_modules/html-to-text', import.meta.url)),
  } },
  test: { include: ['tests/**/*.test.mjs'], environment: 'node' },
};
