import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// npm supplies its own CLI path, including when invoked as `node npm-cli.js`.
// Calling that CLI through Node avoids npm.cmd / shell / PATH differences.
const npmCli = process.env.npm_execpath;
const root = fileURLToPath(new URL('../', import.meta.url));
const tests = [['A-mesaj-otomasyonu', 'test'], ['B-n8n', 'test']];
const types = [['A-mesaj-otomasyonu', 'typecheck']];
const tasks = { test: tests, typecheck: types, check: [...tests, ...types] };
const mode = process.argv[2];
if (!npmCli || !Object.hasOwn(tasks, mode)) {
  console.error('Use npm test, npm run typecheck, or npm run check from the repository root.');
  process.exit(1);
}

for (const [directory, command] of tasks[mode]) {
  const result = spawnSync(process.execPath, [npmCli, '--prefix', directory, 'run', command], {
    cwd: root,
    stdio: 'inherit',
    shell: false,
  });
  if (result.error) console.error(`Could not run ${directory}: ${result.error.message}`);
  if (result.error || result.status !== 0) process.exit(result.status ?? 1);
}
