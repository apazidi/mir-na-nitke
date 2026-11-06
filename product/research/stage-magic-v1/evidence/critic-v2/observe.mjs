// Ordinary UI observation of frozen V2. No game-state setters.
// Set PLAYWRIGHT_MODULE; optionally CHROME_PATH and PLAYWRIGHT_BROWSERS_PATH.
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { startServer } from '../../../../scripts/serve-preview.mjs';

const expectedRuntime = '4f3db4b5b10785e8d20c9070992529a76b66f410';
const repo = fileURLToPath(new URL('../../../../../', import.meta.url));
const runtime = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repo, encoding: 'utf8' }).trim();
if (runtime !== expectedRuntime) throw Error(`Expected ${expectedRuntime}; got ${runtime}`);
if (!process.env.PLAYWRIGHT_MODULE) throw Error('Set PLAYWRIGHT_MODULE');
const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
const out = fileURLToPath(new URL('.', import.meta.url));
await mkdir(out, { recursive: true });
const server = await startServer(0);
const browser = await chromium.launch({ headless: true, ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, recordVideo: { dir: out, size: { width: 390, height: 844 } } });
const page = await context.newPage(), records = [], events = [], errors = [];
page.on('pageerror', e => errors.push(e.message));
const start = performance.now();
const snapshot = () => page.evaluate(() => window.__stageStudy.snapshot());
const mark = name => events.push({ name, t: (performance.now() - start) / 1000 });
async function capture(name) {
  const record = { name, state: await snapshot(), points: await page.evaluate(() => window.__stageStudy.points()), t: (performance.now() - start) / 1000 };
  records.push(record);
  await page.screenshot({ path: `${out}/${name}.png` });
  return record;
}
try {
  await page.goto(`http://127.0.0.1:${server.address().port}/product/research/stage-magic-v1/prototype/?effect=sparks`);
  await page.waitForFunction(() => document.documentElement.dataset.ready === 'true');
  await capture('00-start');
  for (let n = 1; n <= 52; n++) {
    const began = performance.now();
    await page.locator('#craft').click();
    mark(`click-${n}`);
    await page.waitForTimeout(820);
    const r = await capture(`click-${String(n).padStart(2, '0')}`);
    if ([1, 13, 17, 20, 23, 26, 29, 33, 46, 52].includes(n)) console.log(JSON.stringify({ checkpoint: n, state: r.state }));
    await page.waitForTimeout(Math.max(0, 1000 - (performance.now() - began)));
  }
  await page.waitForTimeout(1200);
  const final = await capture('final-quiet');
  await page.reload();
  await page.waitForFunction(() => document.documentElement.dataset.ready === 'true');
  const reloaded = await capture('final-reloaded');
  await page.locator('#reset').click();
  await page.locator('#auto').click();
  mark('auto-start');
  await page.waitForTimeout(5000);
  await capture('auto-5s');
  for (let i = 0; i < 3; i++) { await page.locator('#craft').click(); mark(`auto-click-${i + 1}`); await page.waitForTimeout(1000); }
  await capture('auto-plus-three');
  await page.locator('#auto').click();
  mark('auto-stop');
  await page.waitForTimeout(800);
  const paused = await capture('auto-paused');
  await page.waitForTimeout(2500);
  const held = await capture('auto-still-paused');
  console.log(JSON.stringify({ done: true, finalWork: final.state.work, reloadWork: reloaded.state.work, pausedStable: paused.state.work === held.state.work, records: records.length, errors }));
  const video = page.video();
  await page.close(); await context.close();
  await video.saveAs(`${out}/process.webm`);
} finally {
  await writeFile(`${out}/observations.json`, JSON.stringify({ runtime, effect: 'sparks', records, events, errors }, null, 2));
  await browser.close();
  await new Promise(r => server.close(r));
}
