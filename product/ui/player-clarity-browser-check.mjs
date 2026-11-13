import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import path from 'node:path';
import {startServer} from '../scripts/serve-preview.mjs';
import * as core from '../app/core/index.mjs';
import {stagedCatalog,STAGED_SAVE_KEY,STAGED_LEGACY_KEY} from './staged-catalog.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE?pathToFileURL(process.env.PLAYWRIGHT_MODULE).href:'playwright');
// Source-mode review uses the same pinned artwork already tracked in the bundle.
process.env.ART_REVIEW_ROOT??=fileURLToPath(new URL('../../play-preview/product/art-experiments/rabbit-v1/exports/',import.meta.url));
process.env.FLOWER_REVIEW_ROOT??=fileURLToPath(new URL('../../play-preview/product/content/items/meadow-flower/art/',import.meta.url));
const server=process.env.PREVIEW_URL?null:await startServer(0),base=process.env.PREVIEW_URL??`http://127.0.0.1:${server.address().port}/`;
const url=new URL('product/ui/?gameplay=v4',base).href,evidence=fileURLToPath(new URL('../preview-evidence/player-clarity/',import.meta.url));
const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
const now=1794580000000,key=STAGED_SAVE_KEY,{config}=stagedCatalog(),errors=[];
const report={url,sizes:[],restart:false,map:false,currency:false,failurePreserves:false};
const focus=(page,id)=>page.locator(`[data-focus-key="${id}"]`),ready=page=>page.waitForFunction(()=>Boolean(window.__stagedGameplay));
const raw=page=>page.evaluate(key=>localStorage.getItem(key),key);
const snapshot=page=>page.evaluate(()=>window.__stagedGameplay.snapshot());
async function context(width,height){const c=await browser.newContext({viewport:{width,height},acceptDownloads:true});await c.addInitScript(now=>{Date.now=()=>now;},now);c.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));return c;}
async function closeDrawer(page){if(await focus(page,'close-drawer').isVisible())await focus(page,'close-drawer').click();}
async function shot(page,name){await page.locator('img').evaluateAll(images=>Promise.all(images.map(img=>img.decode())));assert.equal(await page.locator('.notice').count(),0,'No missing art/save warnings');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:path.join(evidence,name+'.png')});}
// Earn a full world through core commands; only the browser edge-case fixture is seeded.
let full=core.createInitialState(config,now-100000000);
for(const item of config.items){
 while(full.wallet.yarn<item.yarnCost)full=core.advanceTime(full,full.lastTimestamp+config.maxOfflineMs,config);
 full=core.dispatch(full,{type:'startProject',itemId:item.id,now:full.lastTimestamp},config);
 while(!core.selectView(full,config).project.canComplete)full=core.dispatch(full,{type:'click',now:full.lastTimestamp},config);
 full=core.dispatch(full,{type:'completeCraft',now:full.lastTimestamp},config);
 const meadow=config.meadows.find(m=>m.slots.some(s=>s.itemId===item.id)),slot=meadow.slots.find(s=>s.itemId===item.id);
 full=core.dispatch(full,{type:'placeItem',meadowId:meadow.id,slotId:slot.id,now:full.lastTimestamp},config);
}
full=core.advanceTime(full,now,config);full.wallet.yarn=18722.7;full.accrual={baseYarn:18722.7,baseWork:0,elapsedMs:0,automatic:{},events:{}};
full.upgrades.hook=1;
try{
 await mkdir(evidence,{recursive:true});
 for(const [width,height]of [[360,800],[390,844],[430,932]]){
  const c=await context(width,height),page=await c.newPage();await page.goto(url);await ready(page);
  assert.match(await page.locator('.world-message').innerText(),/Кролик/);assert.match(await page.locator('.yarn-wallet').innerText(),/^32 ед\. пряжи$/);await shot(page,`fresh-${width}`);
  await focus(page,'scene-chooser').click();assert.equal(await page.getByRole('dialog',{name:'Карта полянок'}).count(),1);
  assert.equal(await page.locator('[data-map-place]').count(),2);assert.equal(await page.locator('.map-requirement[data-done=false]').count(),3);assert.equal(await focus(page,'scene-kotoutro').isDisabled(),true);await shot(page,`map-locked-${width}`);await closeDrawer(page);
  await focus(page,'next-project').click();await focus(page,'craft').click();const paid=await raw(page);
  await page.reload();await ready(page);assert.equal(await raw(page),paid);await shot(page,`resume-${width}`);
  await focus(page,'game-menu').click();await focus(page,'request-restart').click();await shot(page,`restart-${width}`);await focus(page,'cancel-restart').click();assert.equal(await raw(page),paid);
  await page.evaluate(({legacy})=>localStorage.setItem(legacy,'legacy-marker'),{legacy:STAGED_LEGACY_KEY});
  await focus(page,'request-restart').click();await focus(page,'confirm-restart').evaluate(button=>{button.click();button.click();});
  assert.equal((await snapshot(page)).state.project,null);assert.equal((await snapshot(page)).state.wallet.yarn,32);assert.equal(await page.evaluate(key=>localStorage.getItem(key+'-restart-backup'),key),paid);
  await page.reload();await ready(page);assert.equal((await snapshot(page)).ui.screen,'workshop');assert.equal((await snapshot(page)).state.project,null);assert.match(await page.locator('.world-message').innerText(),/Кролик/);
  assert.equal(await page.evaluate(legacy=>localStorage.getItem(legacy),STAGED_LEGACY_KEY),'legacy-marker');
  await focus(page,'game-menu').click();const downloading=page.waitForEvent('download');await focus(page,'download-backup').click();const download=await downloading;assert.equal(await readFile(await download.path(),'utf8'),paid);await closeDrawer(page);
  const second=await c.newPage();await second.goto(url);await second.locator('[data-save-blocked]').waitFor();assert.equal(await second.locator('[data-focus-key=request-restart]').count(),0);await second.close();
  await page.goto(new URL('seed',base).href);await page.evaluate(({key,full})=>localStorage.setItem(key,JSON.stringify(full)),{key,full});await page.goto(url);await ready(page);await closeDrawer(page);
  assert.equal((await snapshot(page)).state.wallet.yarn,18722.7);assert.equal((await page.locator('.yarn-wallet').innerText()).replace(/\s/g,''),'18722ед.пряжи');assert.match(await page.locator('.next-goal-note').innerText(),/Все изделия этой версии созданы/);await shot(page,`complete-${width}`);
  await focus(page,'scene-chooser').click();assert.equal(await page.locator('.map-requirement[data-done=true]').count(),3);assert.equal(await focus(page,'scene-kotoutro').isEnabled(),true);await shot(page,`map-open-${width}`);await focus(page,'scene-kotoutro').click();await focus(page,'scene-chooser').click();assert.match(await page.locator('[data-map-place=kotoutro] .map-current').innerText(),/Вы здесь/);await closeDrawer(page);
  await focus(page,'tab-workshop').click();await focus(page,'open-upgrades').click();const row=page.locator('.project-row').filter({has:focus(page,'upgrade-hook')});assert.match(await row.innerText(),/4 пряжи/);assert.match(await page.getByRole('dialog').innerText(),/Автовязка/);assert.doesNotMatch(await page.getByRole('dialog').innerText(),/корзин/i);
  const before=(await snapshot(page)).state.wallet.yarn;await focus(page,'upgrade-hook').click();assert.equal((await snapshot(page)).state.wallet.yarn,before-4);await closeDrawer(page);
  // Both failure points disclose the failure without covering dialog controls.
  for(const failure of ['backup','new-save']){
   const beforeFailure=await raw(page);
   await page.evaluate(({key,failure})=>{const original=Storage.prototype.setItem;window.__restoreStorage=()=>Storage.prototype.setItem=original;Storage.prototype.setItem=function(k,v){if(failure==='backup'?k===key+'-restart-backup':k===key&&JSON.parse(v).transactionSequence===0)throw Error('quota');return original.call(this,k,v);};},{key,failure});
   await focus(page,'game-menu').click();await focus(page,'request-restart').click();assert.equal(await page.getByRole('alert').count(),0);
   await focus(page,'confirm-restart').click();
   const alert=page.getByRole('dialog',{name:'Начать заново?'}).getByRole('alert');assert.equal(await alert.isVisible(),true);assert.match(await alert.innerText(),/Не удалось начать заново.*Прежняя игра сохранена/s);
   assert.equal(await raw(page),beforeFailure);assert.equal((await snapshot(page)).state.owned.length,10);await shot(page,`restart-error-${failure}-${width}`);
   await page.evaluate(()=>window.__restoreStorage());await focus(page,'cancel-restart').click();assert.equal(await page.getByRole('alert').count(),0);await closeDrawer(page);
   await focus(page,'scene-chooser').click();assert.equal(await page.locator('[data-map-place]').count(),2);await closeDrawer(page);
  }
  report.sizes.push(width);await c.close();
 }
 assert.deepEqual(errors,[]);Object.assign(report,{restart:true,map:true,currency:true,failurePreserves:true});await writeFile(path.join(evidence,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{await browser.close();if(server)await new Promise(resolve=>server.close(resolve));}
