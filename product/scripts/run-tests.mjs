import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const files = readdirSync(new URL('../tests/', import.meta.url))
  .filter(name => name.endsWith('.test.mjs')).sort().map(name => `tests/${name}`);
try {
  files.push(...readdirSync(new URL('../ui/', import.meta.url)).filter(name => name.endsWith('.test.mjs')).sort().map(name => `ui/${name}`));
} catch (error) { if (error.code !== 'ENOENT') throw error; }
if (!files.length) throw new Error('No product tests discovered');
const result = spawnSync(process.execPath, ['--test', ...files], { cwd: root, stdio: 'inherit' });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
