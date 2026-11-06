// Portable preservation of the independent local storage fault check.
// Run from any cwd with PLAYWRIGHT_MODULE and optional CHROME_PATH.
// Progress uses ordinary UI clicks; only storage faults/sentinels are injected.
import assert from 'node:assert/strict';
import {mkdir, writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {startServer} from '../../scripts/serve-preview.mjs';

if (!process.env.PLAYWRIGHT_MODULE) throw Error('Set PLAYWRIGHT_MODULE to Playwright index.mjs');
const {chromium} = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
const server = await startServer(0);
const base = `http://127.0.0.1:${server.address().port}`;
let browser;
const reports = [];
const oldKeys = ['mir-na-nitke-gameplay-preview-v3', 'mir-craft-feel-study-v1',
  'mir-craft-material-pompom-v1', 'mir-craft-material-pompom-v2', 'mir-assembly-contact-study-v1'];
try {
  browser = await chromium.launch({headless:true,
    ...(process.env.CHROME_PATH ? {executablePath:process.env.CHROME_PATH} : {})});
  for (const mode of ['denied', 'write-denied', 'corrupt']) {
    const context = await browser.newContext({viewport:{width:390,height:844}});
    try {
      const page = await context.newPage(), errors = [], requests = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('request', request => requests.push(request.url()));
      await page.addInitScript(({mode, oldKeys}) => {
        if (location.protocol !== 'http:') return;
        const proto = Storage.prototype, get = proto.getItem, set = proto.setItem;
        if (get.call(sessionStorage, 'review-fixture-applied')) return;
        set.call(sessionStorage, 'review-fixture-applied', 'yes');
        for (const key of oldKeys) set.call(localStorage, key, 'review-sentinel');
        window.__restoreStorageForReview = () => { proto.getItem = get; proto.setItem = set; };
        if (mode === 'corrupt') set.call(localStorage, 'mir-stage-magic-v1', '');
        else proto.setItem = function() { throw new DOMException('Injected write failure', 'QuotaExceededError'); };
        if (mode === 'denied') proto.getItem = function() { throw new DOMException('Injected read failure', 'SecurityError'); };
      }, {mode, oldKeys});
      const ready = () => page.waitForFunction(() => document.documentElement.dataset.ready === 'true');
      const snapshot = () => page.evaluate(() => window.__stageStudy.snapshot());
      await page.goto(base + '/stage-study/'); await ready();
      assert.equal((await snapshot()).work, 0);
      const initial = await page.locator('#status').textContent();
      let clicks = 0;
      if (mode === 'corrupt') {
        assert.match(initial, /не прочиталось/);
        await page.locator('#craft').click(); clicks++;
        assert.equal((await snapshot()).work, .08);
        assert.equal(await page.locator('#status').textContent(), '');
      } else {
        while (!(await snapshot()).finished && clicks < 53) {
          await page.locator('#craft').click(); clicks++;
        }
        assert.equal(clicks, 52);
        assert.equal((await snapshot()).work, 6);
        assert.equal((await snapshot()).auto, false);
        assert.equal((await snapshot()).storageAvailable, false);
        assert.match(await page.locator('#status').textContent(), /сохранение недоступно/);
      }
      const beforeReturn = await snapshot();
      const completedStatus = await page.locator('#status').textContent();
      await page.evaluate(() => window.__restoreStorageForReview());
      await page.goto('about:blank'); await page.goBack(); await ready();
      const returned = await snapshot();
      assert.equal(returned.work, beforeReturn.work);
      assert.equal(returned.storageAvailable, true);
      if (returned.finished) assert.match(await page.locator('#status').textContent(), /Сохранено/);
      assert.deepEqual(await page.evaluate(keys => keys.map(key => localStorage.getItem(key)), oldKeys), oldKeys.map(() => 'review-sentinel'));
      const externalRequests = requests.filter(url => !url.startsWith(base + '/'));
      assert.deepEqual(errors, []); assert.deepEqual(externalRequests, []);
      reports.push({mode, initial, completedStatus, ordinaryClicks:clicks, workAfterReturn:returned.work,
        recoveryPreservesWork:true, allFiveOldKeysUntouched:true, externalRequests, errors});
    } finally { await context.close(); }
  }
  const evidence = new URL('./evidence/', import.meta.url);
  await mkdir(evidence, {recursive:true});
  await writeFile(new URL('technical-storage-recheck.json', evidence), JSON.stringify({
    result:'PASS', route:'stage-study/', viewport:{width:390,height:844}, reports,
    limits:'Local technical fault injection and ordinary UI clicks; not external HTTPS or human enjoyment.'
  }, null, 2) + '\n');
  console.log('Independent storage replay PASS');
} finally {
  if (browser) await browser.close();
  await new Promise(resolve => server.close(resolve));
}
