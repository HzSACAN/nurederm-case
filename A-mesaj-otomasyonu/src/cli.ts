import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { parseMessages } from './input.ts';
import { createCartClient } from './http-client.ts';
import { processMessages } from './processor.ts';
import { renderHtml, summarize } from './output.ts';

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.includes('--help')) {
    console.log('Kullanım: npm run start -- [girdi.json] [çıktı-klasörü]');
    return;
  }
  if (args.length > 2) throw new Error('En fazla iki konumsal argüman bekleniyor.');
  const inputPath = args[0] ? resolve(args[0]) : fileURLToPath(new URL('../../mesajlar.json', import.meta.url));
  const outputPath = args[1] ? resolve(args[1]) : fileURLToPath(new URL('../', import.meta.url));
  const raw: unknown = JSON.parse(await readFile(inputPath, 'utf8'));
  const messages = parseMessages(raw);
  const client = createCartClient({ onEvent: event => {
    console.log(`API: ${event.kind}; HTTP=${event.status ?? 'yok'}; deneme=${event.attempts}`);
  } });
  const records = await processMessages(messages, client);
  await mkdir(outputPath, { recursive: true });
  await writeFile(resolve(outputPath, 'talepler.json'), JSON.stringify(records, null, 2) + '\n', 'utf8');
  await writeFile(resolve(outputPath, 'ozet.html'), renderHtml(records), 'utf8');
  const summary = summarize(records);
  console.log(`Tamamlandı: ${summary.total} mesaj, ${summary.handoffs} devir. talepler.json ve ozet.html üretildi.`);
}

main().catch(() => {
  // Do not expose raw input, response bodies, filesystem contents or exception text.
  console.error('CLI tamamlanamadı. Girdi JSON biçimini, alanlarını ve dosya erişim izinlerini kontrol edin.');
  process.exitCode = 1;
});
