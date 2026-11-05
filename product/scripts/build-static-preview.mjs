/** Reproducible, self-contained review bundle. Does not promote draft packages. */
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdir, readFile, rm, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const output = path.resolve(root, 'play-preview');
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const git = (...args) => execFileSync('git', args, {cwd: root, maxBuffer: 32 * 1024 * 1024});
const appRef = git('rev-parse', 'HEAD').toString().trim();
const sources = JSON.parse(await readFile(path.join(root, 'product/preview-sources.json'), 'utf8'));
const files = new Map();
const sourceFiles = new Map();
const put = (name, bytes) => {
  if (name.startsWith('/') || name.split(/[\\/]/).some(part => part === '..' || part.startsWith('.'))) throw Error(`Unsafe bundle path: ${name}`);
  files.set(name, Buffer.from(bytes));
};
async function copySource(name) {
  if (sourceFiles.has(name)) return;
  const bytes = git('show', `${appRef}:${name}`);
  const working = Buffer.from((await readFile(path.join(root, name), 'utf8')).replace(/\r\n/g, '\n'));
  if (!working.equals(bytes)) throw Error(`Commit browser source changes before building: ${name}`);
  sourceFiles.set(name, sha256(bytes));
  put(name, bytes);
  if (!name.endsWith('.mjs')) return;
  for (const match of bytes.toString().matchAll(/(?:import|export)\s+(?:[^;]*?\sfrom\s*)?['"]([^'"]+)['"]/g)) {
    if (!match[1].startsWith('.')) throw Error(`Non-local browser import in ${name}: ${match[1]}`);
    const dependency = path.posix.normalize(path.posix.join(path.posix.dirname(name), match[1]));
    await copySource(dependency);
  }
}
await copySource('product/ui/main.mjs');
await copySource('product/ui/index.html');
await copySource('product/ui/shell.css');
await copySource('design-system/skin-v4.css');
const html = files.get('product/ui/index.html').toString();
const main = files.get('product/ui/main.mjs').toString();
if (!/name="robots"[^>]*noindex/.test(html) || !main.includes(sources.label) || !main.includes('mir-na-nitke-art-preview-v2')) {
  throw Error('Review UI must declare noindex, unapproved artwork and an isolated save key');
}
for (const source of sources.sources) {
  if (!/^[a-f0-9]{40}$/.test(source.commit)) throw Error('Art must be pinned to a full commit SHA');
  for (const file of source.files) {
    const name = source.directory + '/' + file;
    let bytes;
    try { bytes = git('show', `${source.commit}:${name}`); }
    catch { throw Error(`Missing pinned artwork ${source.commit}:${name}. Fetch the documented PR refs first.`); }
    if (bytes.subarray(0, 4).toString() !== 'RIFF' || bytes.subarray(8, 12).toString() !== 'WEBP') throw Error(`Not WebP: ${name}`);
    put(name, bytes);
  }
}
put('product/app/content/catalog.json', JSON.stringify({schemaVersion: 1, items: [], meadows: [], assets: []}, null, 2) + '\n');
put('index.html', `<!doctype html>
<html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>Мир на ниточке — техническое превью</title></head>
<body><h1>${sources.label}</h1><p>Техническая сборка. Арт не утверждён.</p>
<a href="./product/ui/?mode=art-review&amp;flower=review">Открыть игру</a>
<script>location.replace('./product/ui/?mode=art-review&flower=review');</script></body></html>\n`);
const manifest = {
  schemaVersion: 1,
  label: sources.label,
  productionContent: false,
  saveKey: 'mir-na-nitke-art-preview-v2',
  appSourceCommit: git('log', '-1', '--format=%H', '--', ...[...sourceFiles.keys()].sort()).toString().trim(),
  sourceFiles: Object.fromEntries([...sourceFiles].sort(([a], [b]) => a.localeCompare(b))),
  artSources: sources.sources,
  files: [...files].sort(([a], [b]) => a.localeCompare(b)).map(([name, bytes]) => ({path: name, bytes: bytes.length, sha256: sha256(bytes)}))
};
// Resolve and verify the exact output before replacing any generated files.
if (path.dirname(output) !== path.resolve(root) || path.basename(output) !== 'play-preview') throw Error('Output must be repository/play-preview');
await rm(output, {recursive: true, force: true});
for (const [name, bytes] of files) {
  const target = path.join(output, name);
  await mkdir(path.dirname(target), {recursive: true});
  await writeFile(target, bytes);
}
await writeFile(path.join(output, 'preview-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`Built play-preview/: ${files.size} files, ${(manifest.files.reduce((n, f) => n + f.bytes, 0) / 1024 / 1024).toFixed(2)} MiB. Draft art remains unapproved.`);
