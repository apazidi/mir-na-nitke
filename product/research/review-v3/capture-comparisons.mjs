/** Frame actual browser captures next to the unchanged reference, without retouching. */
import {copyFile, readFile, writeFile} from 'node:fs/promises';
import {fileURLToPath, pathToFileURL} from 'node:url';
const inputs = process.argv.slice(2);
if (inputs.length !== 3) throw Error('Pass first-meadow, second-meadow and workshop 390x844 PNG captures');
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright');
const manifest = JSON.parse(await readFile(new URL('../../../play-preview/preview-manifest.json', import.meta.url), 'utf8'));
const labels = ['Малая полянка', 'Котоутро у пруда', 'Мастерская'];
const names = ['first-meadow', 'second-meadow', 'workshop'];
const browser = await chromium.launch({headless: true, ...(process.env.CHROME_PATH ? {executablePath: process.env.CHROME_PATH} : {})});
try {
  for (let i = 0; i < inputs.length; i++) {
    await copyFile(inputs[i], new URL('./' + names[i] + '-390.png', import.meta.url));
    const html = `<!doctype html><html lang="ru"><meta charset="utf-8"><title>Сравнение 390×844 — ${labels[i]}</title>
<style>*{box-sizing:border-box}body{margin:0;padding:24px;background:#20271f;color:#faf0d9;font:16px system-ui}h1{font-size:22px;margin:0 0 8px}p{font-size:13px;line-height:1.4;margin:0 0 18px;color:#cbd0c3}.grid{display:flex;gap:24px}.label{height:30px;font-weight:650}.frame{width:390px;height:844px;background:#101610;display:flex;align-items:center;justify-content:center}.frame img{display:block;width:390px;height:844px;object-fit:contain}</style>
<h1>Одинаковые рамки 390×844 · ${labels[i]}</h1><p>Референс 387×620 вписан целиком, без обрезки и растяжения. Справа — реальный игровой экран 390×844.<br>Техническое превью; арт не утверждён. Исходники сборки: ${manifest.appSourceCommit.slice(0, 12)}.</p>
<div class="grid"><section><div class="label">Утверждённый референс</div><div class="frame"><img alt="Референс v4" src="../../../design-system/reference-v4.webp"></div></section><section><div class="label">${labels[i]} · игровой экран</div><div class="frame"><img alt="${labels[i]}" src="${names[i]}-390.png"></div></section></div></html>`;
    const url = new URL('./compare-' + names[i] + '.html', import.meta.url);
    await writeFile(url, html);
    const page = await browser.newPage({viewport: {width: 852, height: 1000}, deviceScaleFactor: 1});
    await page.goto(url.href);
    await page.locator('img').evaluateAll(images => Promise.all(images.map(image => image.decode())));
    const gameSize = await page.locator('img').last().evaluate(image => [image.naturalWidth, image.naturalHeight]);
    if (gameSize[0] !== 390 || gameSize[1] !== 844) throw Error('Game comparison requires a native 390x844 capture');
    await page.screenshot({path: fileURLToPath(new URL('./comparison-' + names[i] + '.png', import.meta.url)), fullPage: true});
    await page.close();
  }
} finally { await browser.close(); }
