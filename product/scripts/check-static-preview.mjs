/** Exercises the actual static output under a GitHub Pages project prefix, or PREVIEW_URL. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createServer} from 'node:http';
import {mkdir, readFile, realpath, stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

const {chromium} = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright');
const root = fileURLToPath(new URL('../../play-preview/', import.meta.url));
const evidence = fileURLToPath(new URL('../preview-evidence/', import.meta.url));
const mime = {'.html': 'text/html; charset=utf-8', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp'};
const prefix = '/mir-na-nitke/play-preview/';
let server;
let url = process.env.PREVIEW_URL;
if (!url) {
  server = createServer(async (request, response) => {
    try {
      const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
      if (!pathname.startsWith(prefix)) throw Error('Outside isolated bundle');
      let target = path.resolve(root, pathname.slice(prefix.length) || 'index.html');
      if ((await stat(target)).isDirectory()) target = path.join(target, 'index.html');
      target = await realpath(target);
      const relative = path.relative(root, target);
      if (relative.startsWith('..') || path.isAbsolute(relative) || !mime[path.extname(target)]) throw Error('Outside bundle');
      response.writeHead(200, {'Content-Type': mime[path.extname(target)], 'Cache-Control': 'no-store'});
      response.end(await readFile(target));
    } catch { response.writeHead(404); response.end('Preview file not found'); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  url = `http://127.0.0.1:${server.address().port}${prefix}`;
}
if (!url.endsWith('/')) throw Error('PREVIEW_URL must be the canonical preview directory ending in /');
const base = new URL(url);
if (process.env.PREVIEW_URL) assert.equal(base.protocol, 'https:', 'External preview must use HTTPS');
const browser = await chromium.launch({...(process.env.CHROME_PATH ? {executablePath: process.env.CHROME_PATH} : {}), headless: true});
try {
  await mkdir(evidence, {recursive: true});
  const manifestResponse = await fetch(new URL('preview-manifest.json', base));
  assert.equal(manifestResponse.status, 200);
  const manifest = await manifestResponse.json();
  assert.equal(manifest.productionContent, false);
  assert.equal(manifest.saveKey, 'mir-na-nitke-art-preview-v2');
  for (const file of manifest.files) {
    const response = await fetch(new URL(file.path, base));
    assert.equal(response.status, 200, file.path);
    const bytes = Buffer.from(await response.arrayBuffer());
    assert.equal(bytes.length, file.bytes, file.path);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), file.sha256, file.path);
  }
  for (const [width, height] of [[360, 800], [390, 844], [430, 932]]) {
    const context = await browser.newContext({viewport: {width, height}});
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('requestfailed', request => errors.push(request.url() + ': ' + request.failure()?.errorText));
    page.on('response', response => { if (response.status() >= 400) errors.push(response.status() + ' ' + response.url()); });
    page.on('request', request => { if (/^https?:/.test(request.url()) && !request.url().startsWith(base.href)) errors.push('Outside bundle: ' + request.url()); });
    await context.addInitScript(() => {
      for (const key of ['mir-na-nitke-v1', 'mir-na-nitke-development-v1', 'mir-na-nitke-save']) {
        if (localStorage.getItem(key) === null) localStorage.setItem(key, 'unrelated-save-sentinel');
      }
    });
    const shot = async name => {
      await page.locator('img').evaluateAll(images => Promise.all(images.map(image => image.decode())));
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'Horizontal overflow');
      await page.screenshot({path: path.join(evidence, `${name}-${width}.png`), fullPage: true});
    };
    const rowAction = async (item, action) => {
      let row = page.locator('.project-row').filter({hasText: item});
      if (!await row.isVisible()) {
        const projects = page.getByRole('button', {name: 'Проекты', exact: true});
        if (await projects.count()) await projects.click();
      }
      await row.getByRole('button', {name: action, exact: true}).click();
    };
    const craft = async item => {
      await rowAction(item, 'Начать');
      await shot(item === 'Кролик' ? 'rabbit-start' : 'flower-start');
      for (let i = 0; i < 20; i++) {
        if (await page.getByRole('button', {name: 'Завершить', exact: true}).count()) break;
        await page.getByRole('button', {name: 'Вязать', exact: true}).click();
      }
      await page.getByRole('button', {name: 'Завершить', exact: true}).click();
    };
    await page.goto(base.href);
    await page.waitForURL(/mode=art-review/);
    assert.match(await page.locator('meta[name="robots"]').getAttribute('content'), /noindex/);
    await page.getByText('TECHNICAL PREVIEW — ART NOT APPROVED', {exact: false}).waitFor();
    await craft('Кролик');
    await page.getByRole('button', {name: 'Полянка', exact: true}).click();
    await rowAction('Кролик', 'Разместить');
    const readSave = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), manifest.saveKey);
    const beforePet = await readSave();
    await page.getByRole('button', {name: 'Погладить', exact: true}).click();
    assert.ok((await readSave()).wallet.yarn >= beforePet.wallet.yarn + 2);
    await shot('rabbit-meadow');
    await page.getByRole('button', {name: 'Мастерская', exact: true}).click();
    await craft('Цветок');
    await page.getByRole('button', {name: 'Полянка', exact: true}).click();
    await rowAction('Цветок', 'Разместить');
    await shot('day-complete');
    const before = await readSave();
    await page.waitForTimeout(11000);
    const after = await readSave();
    assert.ok(after.cooldowns['test-meadow/sniff'] > before.cooldowns['test-meadow/sniff']);
    assert.ok(after.wallet.yarn > before.wallet.yarn + 3);
    await page.getByRole('button', {name: 'Вечер', exact: true}).click();
    await shot('evening-complete');
    await page.reload();
    await page.getByRole('button', {name: 'Полянка', exact: true}).click();
    assert.equal(await page.locator('.placed-object').count(), 2);
    assert.deepEqual((await readSave()).placements, after.placements);
    await shot('reload');
    for (const key of ['mir-na-nitke-v1', 'mir-na-nitke-development-v1', 'mir-na-nitke-save']) {
      assert.equal(await page.evaluate(key => localStorage.getItem(key), key), 'unrelated-save-sentinel');
    }
    assert.deepEqual(errors, []);
    await context.close();
  }
  console.log(`Static preview verified: ${base.href}; ${manifest.files.length} integrity checks; full rabbit → yarn → flower → idle bonus → reload loop at 360/390/430.`);
} finally {
  await browser.close();
  if (server) await new Promise(resolve => server.close(resolve));
}
