/** Exercises the actual static output under a GitHub Pages project prefix, or PREVIEW_URL. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createServer} from 'node:http';
import {mkdir, readFile, realpath, stat, writeFile} from 'node:fs/promises';
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
  const expectedManifest = JSON.parse(await readFile(path.join(root, 'preview-manifest.json'), 'utf8'));
  assert.deepEqual(manifest, expectedManifest, 'The served manifest must match the exact locally reviewed bundle; an older self-consistent deployment is not accepted');
  assert.equal(manifest.productionContent, false);
  assert.equal(manifest.saveKey, manifest.stagedReview ? 'mir-na-nitke-gameplay-preview-v4' : manifest.gameplayReview ? 'mir-na-nitke-gameplay-preview-v3' : 'mir-na-nitke-art-preview-v2');
  for (const file of manifest.files) {
    const response = await fetch(new URL(file.path, base));
    assert.equal(response.status, 200, file.path);
    const bytes = Buffer.from(await response.arrayBuffer());
    assert.equal(bytes.length, file.bytes, file.path);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), file.sha256, file.path);
  }
  const verifiedAssets = new Set(manifest.files.map(file => new URL(file.path, base).href));
  if (manifest.gameplayReview) {
    const {exercisePlayer} = await import('../ui/player-check.mjs');
    for (const [width, height] of [[360, 800], [390, 844], [430, 932]]) {
      const context = await browser.newContext({viewport: {width, height}});
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('requestfailed', request => {
        if (request.failure()?.errorText === 'net::ERR_ABORTED' && verifiedAssets.has(request.url())) return;
        errors.push(request.url() + ': ' + request.failure()?.errorText);
      });
      page.on('response', response => { if (response.status() >= 400) errors.push(response.status() + ' ' + response.url()); });
      page.on('request', request => {
        if (/^https?:/.test(request.url()) && !request.url().startsWith(base.href)) errors.push('Outside bundle: ' + request.url());
      });
      await context.addInitScript(() => {
        if (!/^https?:$/.test(location.protocol)) return;
        for (const key of ['mir-na-nitke-v1', 'mir-na-nitke-development-v1', 'mir-na-nitke-save']) {
          if (localStorage.getItem(key) === null) localStorage.setItem(key, 'unrelated-save-sentinel');
        }
      });
      const legacyUrl = manifest.stagedReview ? new URL('product/ui/?mode=art-review&flower=review&scene=v2&gameplay=v3', base).href : base.href;
      await exercisePlayer(page, {url: legacyUrl, evidenceDir: evidence, width, height, saveKey: 'mir-na-nitke-gameplay-preview-v3', clock: true});
      for (const key of ['mir-na-nitke-v1', 'mir-na-nitke-development-v1', 'mir-na-nitke-save']) {
        assert.equal(await page.evaluate(key => localStorage.getItem(key), key), 'unrelated-save-sentinel');
      }
      assert.deepEqual(errors, []);
      await context.close();
    }
    console.log(`Static two-meadow preview verified: ${base.href}; ${manifest.files.length} integrity checks; real UI commands with controlled test time at 360/390/430.`);
    if (manifest.stagedReview) {
      const {exerciseStagedPlayer,exerciseStagedMigration} = await import('../research/stage-integration-v1/check.mjs');
      for (const [width,height] of [[360,800],[390,844],[430,932]]) {
        const context = await browser.newContext({viewport:{width,height},hasTouch:true});
        const page = await context.newPage(), errors=[];
        page.on('pageerror', error=>errors.push(error.message));
        page.on('requestfailed', request=>{
          if(request.failure()?.errorText==='net::ERR_ABORTED'&&verifiedAssets.has(request.url()))return;
          errors.push(request.url()+': '+request.failure()?.errorText);
        });
        page.on('response',response=>{if(response.status()>=400)errors.push(response.status()+' '+response.url());});
        page.on('request',request=>{if(/^https?:/.test(request.url())&&!request.url().startsWith(base.href))errors.push('Outside bundle: '+request.url());});
        await exerciseStagedPlayer(page,{url:base.href,evidenceDir:evidence,width,height});
        if(width===390){
          // New isolated storage for the technical migration fixture.
          const migrationContext=await browser.newContext({viewport:{width,height}});
          try{const migrationPage=await migrationContext.newPage();migrationPage.on('pageerror',error=>errors.push(error.message));await exerciseStagedMigration(migrationPage,{url:base.href,evidenceDir:evidence});}
          finally{await migrationContext.close();}
        }
        assert.deepEqual(errors,[]);
        await context.close();
      }
    }
  } else {
  let fullMeadowSave;
  for (const [width, height] of [[360, 800], [390, 844], [430, 932]]) {
    const context = await browser.newContext({viewport: {width, height}});
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('requestfailed', request => {
      // A pointer state may be replaced before its image request completes.
      // Only ignore cancellation for an asset already fetched and hash-verified above.
      if (request.failure()?.errorText === 'net::ERR_ABORTED' && verifiedAssets.has(request.url())) return;
      errors.push(request.url() + ': ' + request.failure()?.errorText);
    });
    page.on('response', response => { if (response.status() >= 400) errors.push(response.status() + ' ' + response.url()); });
    page.on('request', request => { if (/^https?:/.test(request.url()) && !request.url().startsWith(base.href)) errors.push('Outside bundle: ' + request.url()); });
    await context.addInitScript(() => {
      if (!/^https?:$/.test(location.protocol)) return;
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
      if (action === 'Разместить') {
        const primary = page.locator('.action-dock').getByRole('button', {name: action, exact:true});
        if (await primary.isVisible()) {
          await shot(item + '-place');
          await primary.click();
          return;
        }
      }
      let row = page.locator('.project-row').filter({hasText: item});
      if (!await row.isVisible()) {
        const projects = page.getByRole('button', {name: 'Проекты', exact: true});
        if (await projects.count()) await projects.click();
      }
      await row.getByRole('button', {name: action, exact: true}).click();
    };
    const craft = async item => {
      await rowAction(item, 'Начать');
      await shot(item + '-start');
      for (let i = 0; i < 20; i++) {
        if (await page.getByRole('button', {name: 'Завершить', exact: true}).count()) break;
        await page.getByRole('button', {name: 'Вязать', exact: true}).click();
      }
      await shot(item + '-finished');
      await page.getByRole('button', {name: 'Завершить', exact: true}).click();
    };
    await page.goto(base.href);
    await page.waitForURL(/mode=art-review/);
    assert.match(await page.locator('meta[name="robots"]').getAttribute('content'), /noindex/);
    await page.getByText('TECHNICAL PREVIEW — ART NOT APPROVED', {exact: false}).waitFor();
    await shot('empty-workshop');
    await page.getByRole('button', {name:'Полянка', exact:true}).click();
    assert.equal(await page.locator('.placed-object').count(), 0);
    await shot('empty-meadow');
    await page.getByRole('button', {name:'Мастерская', exact:true}).click();
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
    if (manifest.sceneReview && width === 390) {
      // Earn the remaining projects through actual game actions and real idle time.
      // The resulting save is reused only for responsive visual inspection below.
      for (const [item, cost] of [['Дерево',11],['Домик',14],['Бабочка',17]]) {
        const deadline = Date.now() + 120000;
        while ((await readSave()).wallet.yarn < cost) {
          assert.ok(Date.now() < deadline, 'The remaining meadow projects must be reachable without a resource dead end');
          const pet = page.getByRole('button', {name:'Погладить', exact:true});
          if (await pet.isEnabled()) await pet.click();
          await page.waitForTimeout(1000);
        }
        await page.getByRole('button', {name:'Мастерская', exact:true}).click();
        await craft(item);
        await page.getByRole('button', {name:'Полянка', exact:true}).click();
        await rowAction(item, 'Разместить');
      }
      assert.equal(await page.locator('.placed-object').count(), 5);
      fullMeadowSave = await readSave();
      assert.equal(fullMeadowSave.owned.length, 5);
      await writeFile(path.join(evidence, 'earned-five-save.json'), JSON.stringify(fullMeadowSave, null, 2) + '\n');
      await page.reload();
      await page.getByRole('button', {name:'Полянка', exact:true}).click();
      assert.equal(await page.locator('.placed-object').count(), 5);
    }
    for (const key of ['mir-na-nitke-v1', 'mir-na-nitke-development-v1', 'mir-na-nitke-save']) {
      assert.equal(await page.evaluate(key => localStorage.getItem(key), key), 'unrelated-save-sentinel');
    }
    assert.deepEqual(errors, []);
    await context.close();
  }
  if (manifest.sceneReview) {
    assert.ok(fullMeadowSave, 'Full meadow must be earned by the UI test');
    for (const [width,height] of [[360,800],[390,844],[430,932]]) {
      const context = await browser.newContext({viewport:{width,height}});
      await context.addInitScript(({key,save})=>localStorage.setItem(key,JSON.stringify(save)),{key:manifest.saveKey,save:fullMeadowSave});
      const page = await context.newPage();
      const errors=[];
      page.on('pageerror',error=>errors.push(error.message));
      await page.goto(base.href);
      await page.getByRole('button',{name:'Полянка',exact:true}).click();
      await page.waitForFunction(() => !document.querySelector('button[aria-label="Погладить"]')?.disabled);
      await page.waitForFunction(() => !document.querySelector('.feedback'));
      for(const lighting of ['day','evening']) {
        if(lighting==='evening')await page.getByRole('button',{name:'Вечер',exact:true}).click();
        await page.locator('img').evaluateAll(images=>Promise.all(images.map(image=>image.decode())));
        assert.equal(await page.locator('.placed-object').count(),5);
        const cottage = page.getByRole('button',{name:'Домик',exact:true});
        assert.ok((await cottage.locator('img').getAttribute('src')).endsWith(lighting==='evening'?'house-finished-evening.webp':'house-finished.webp'));
        if(lighting==='evening')assert.equal(await cottage.evaluate(node=>getComputedStyle(node).filter),'none','Painted evening lighting must not be dimmed again');
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
        assert.equal(await page.evaluate(()=>document.documentElement.scrollHeight>innerHeight),false,'Full scene must fit one viewport');
        await page.screenshot({path:path.join(evidence,`full-meadow-${lighting}-${width}.png`),fullPage:false});
      }
      assert.deepEqual(errors,[]);
      await context.close();
    }
  }
  console.log(`Static preview verified: ${base.href}; ${manifest.files.length} integrity checks; rabbit → yarn → flower → idle bonus → reload at 360/390/430.${manifest.sceneReview ? ' All five projects earned through real play; full day/evening scenes captured at all three sizes.' : ''}`);
  }
} finally {
  await browser.close();
  if (server) await new Promise(resolve => server.close(resolve));
}
