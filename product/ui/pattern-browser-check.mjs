import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import path from 'node:path';
import {startServer} from '../scripts/serve-preview.mjs';
import * as core from '../app/core/index.mjs';
import * as patternCore from '../app/core/pattern.mjs';
import {stagedCatalog,STAGED_SAVE_KEY} from './staged-catalog.mjs';
import {PATTERN_SAVE_KEY} from './pattern-catalog.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE?pathToFileURL(process.env.PLAYWRIGHT_MODULE).href:'playwright');
process.env.ART_REVIEW_ROOT??=fileURLToPath(new URL('../../play-preview/product/art-experiments/rabbit-v1/exports/',import.meta.url));
process.env.FLOWER_REVIEW_ROOT??=fileURLToPath(new URL('../../play-preview/product/content/items/meadow-flower/art/',import.meta.url));
const server=process.env.PREVIEW_URL?null:await startServer(0),base=process.env.PREVIEW_URL??`http://127.0.0.1:${server.address().port}/`;
const url=new URL('product/ui/?gameplay=v4&experiment=pattern',base).href,evidence=fileURLToPath(new URL('../preview-evidence/pattern/',import.meta.url));
const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
const now=1794580000000,{config}=stagedCatalog(),errors=[],report={url,sizes:[]};
const focus=(p,id)=>p.locator(`[data-focus-key="${id}"]`),ready=p=>p.waitForFunction(()=>Boolean(window.__patternExperiment)),snap=p=>p.evaluate(()=>window.__patternExperiment.snapshot());
async function close(p){if(await focus(p,'close-drawer').isVisible())await focus(p,'close-drawer').click();}
async function shot(p,name){await p.locator('img').evaluateAll(a=>Promise.all(a.map(i=>i.decode())));assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await p.screenshot({path:path.join(evidence,name+'.png')});}
async function finish(p){await p.evaluate(()=>{for(let i=0;i<200&&!window.__patternExperiment.snapshot().view.project.canComplete;i++)document.querySelector('[data-focus-key=craft]').click();});await p.waitForFunction(()=>window.__patternExperiment.snapshot().craft.ready);await p.waitForTimeout(400);}
async function seed(p,raw){await p.goto(new URL('seed',base).href);await p.evaluate(({source,key,raw})=>{localStorage.setItem(source,raw);localStorage.removeItem(key);localStorage.removeItem(key+'-ui');}, {source:STAGED_SAVE_KEY,key:PATTERN_SAVE_KEY,raw});await p.goto(url);await ready(p);await close(p);}
let full=core.createInitialState(config,now);full.wallet.yarn=18722.7;full.accrual.baseYarn=18722.7;
for(const item of config.items){full=core.dispatch(full,{type:'startProject',itemId:item.id,now},config);while(!core.selectView(full,config).project.canComplete)full=core.dispatch(full,{type:'click',now},config);full=core.dispatch(full,{type:'completeCraft',now},config);const meadow=config.meadows.find(m=>m.slots.some(s=>s.itemId===item.id));full=core.dispatch(full,{type:'placeItem',meadowId:meadow.id,slotId:meadow.slots.find(s=>s.itemId===item.id).id,now},config);}
full.wallet.yarn=18722.7;full.accrual.baseYarn=18722.7;const sourceRaw=JSON.stringify(full);
try{
 await mkdir(evidence,{recursive:true});
 for(const [width,height]of [[360,800],[390,844],[430,932]]){
  const c=await browser.newContext({viewport:{width,height},acceptDownloads:true});await c.addInitScript(now=>{window.__testNow=now;Date.now=()=>window.__testNow;},now);c.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));
  const p=await c.newPage();await p.goto(url);await ready(p);await focus(p,'open-pattern').click();assert.match(await p.getByRole('dialog').innerText(),/Сначала разместите/);await shot(p,'locked-'+width);
  await seed(p,sourceRaw);assert.equal((await snap(p)).state.wallet.yarn,18722.7);assert.equal((await p.locator('.yarn-wallet').innerText()).replace(/\s/g,''),'18722ед.пряжи');
  await focus(p,'game-menu').click();const downloadEvent=p.waitForEvent('download');await focus(p,'download-source').click();assert.equal(await readFile(await (await downloadEvent).path(),'utf8'),sourceRaw);await close(p);
  const second=await c.newPage();await second.goto(new URL('product/ui/?gameplay=v4',base).href);await second.locator('[data-save-blocked]').waitFor();await second.close();
  await focus(p,'open-pattern').click();assert.match(await p.getByRole('dialog').innerText(),/288,4 с.*261,88 с.*26,52 с/s);await shot(p,'choice-'+width);
  await focus(p,'pattern-rabbit-scarf-direct').evaluate(b=>{b.click();b.click();});assert.equal((await snap(p)).state.wallet.yarn,18716.7);
  await focus(p,'open-pattern').click();await focus(p,'pattern-cancel').click();assert.equal((await snap(p)).state.wallet.yarn,18722.7);
  await focus(p,'pattern-rabbit-scarf-direct').click();await focus(p,'craft').click();await focus(p,'open-pattern').click();assert.equal(await focus(p,'pattern-cancel').isDisabled(),true);await focus(p,'pattern-continue').click();
  const paused=(await snap(p)).state.project;await p.reload();await ready(p);assert.deepEqual((await snap(p)).state.project,paused);assert.equal((await snap(p)).state.craftAuto,false);await shot(p,'paused-'+width);
  await finish(p);await shot(p,'scarf-ready-'+width);await focus(p,'craft').evaluate(b=>{b.click();b.click();});assert.equal((await snap(p)).state.owned.filter(id=>id==='rabbit-scarf').length,1);await p.locator('[data-pattern-applied=rabbit-scarf]').waitFor();await shot(p,'scarf-applied-'+width);
  await focus(p,'open-pattern').click();assert.match(await p.getByRole('dialog').innerText(),/160,94 с.*больше времени/s);await focus(p,'pattern-learn').click();await focus(p,'craft-auto').click();
  await p.evaluate(()=>{window.__testNow+=3600000;});await p.waitForFunction(()=>window.__patternExperiment.snapshot().view.project.canComplete);
  assert.ok(!(await snap(p)).state.owned.includes('flower-pattern'));await p.reload();await ready(p);await shot(p,'return-ready-'+width);await close(p);assert.match(await focus(p,'craft').innerText(),/Запомнить узор/);
  await focus(p,'craft').click();assert.ok((await snap(p)).state.owned.includes('flower-pattern'));await focus(p,'open-pattern').click();await focus(p,'pattern-cat-doily-learned').click();assert.equal((await snap(p)).state.project.pattern.totalWork,100.94);await focus(p,'craft-auto').click();
  await finish(p);await shot(p,'doily-ready-'+width);await focus(p,'craft').click();await p.locator('[data-pattern-applied=cat-doily]').waitFor();await shot(p,'doily-applied-'+width);await focus(p,'open-pattern').click();assert.equal(await focus(p,'pattern-learn').isDisabled(),true);await shot(p,'completed-'+width);
  assert.equal(await p.evaluate(k=>localStorage.getItem(k),STAGED_SAVE_KEY),sourceRaw);assert.equal(await p.locator('.notice').count(),0);
  if(width===390){
   let minimal=core.createInitialState(config,now);minimal.wallet.yarn=100;minimal.accrual.baseYarn=100;
   for(const id of ['rabbit','flower','tree','kot-cat']){minimal=core.dispatch(minimal,{type:'startProject',itemId:id,now},config);while(!core.selectView(minimal,config).project.canComplete)minimal=core.dispatch(minimal,{type:'click',now},config);minimal=core.dispatch(minimal,{type:'completeCraft',now},config);const m=config.meadows.find(m=>m.slots.some(s=>s.itemId===id));minimal=core.dispatch(minimal,{type:'placeItem',meadowId:m.id,slotId:id,now},config);}
   await seed(p,JSON.stringify(minimal));await focus(p,'open-pattern').click();await shot(p,'minimal-choice-390');await focus(p,'pattern-cat-doily-direct').click();await finish(p);await shot(p,'minimal-doily-ready-390');await focus(p,'craft').click();assert.ok(!(await snap(p)).state.owned.includes('kot-coffee'));await shot(p,'minimal-doily-applied-390');
  }
  await c.close();report.sizes.push(width);
 }
 // A write failure at explicit claim must disclose the failure and retain ready work.
 const c=await browser.newContext({viewport:{width:390,height:844}});await c.addInitScript(now=>{Date.now=()=>now;},now);const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));await seed(p,sourceRaw);await focus(p,'open-pattern').click();await focus(p,'pattern-learn').click();await finish(p);
 await p.evaluate(key=>{const set=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k===key&&JSON.parse(v).owned.includes('flower-pattern'))throw Error('quota');return set.call(this,k,v);};},PATTERN_SAVE_KEY);
 await focus(p,'craft').click();assert.match(await p.getByRole('status').filter({hasText:'Не удалось сохранить работу'}).innerText(),/не применено/);assert.ok(!(await snap(p)).state.owned.includes('flower-pattern'));assert.ok((await snap(p)).view.project.canComplete);await shot(p,'claim-error');await c.close();
 // A real offline import reaches ready work, but never grants permanent knowledge.
 const off=await browser.newContext({viewport:{width:390,height:844}});await off.addInitScript(now=>{Date.now=()=>now+3600000;},now);const op=await off.newPage();
 let work=patternCore.importState(sourceRaw,config,(await import('./pattern-catalog.mjs')).patternCatalog().config),pc=(await import('./pattern-catalog.mjs')).patternCatalog().config;
 work=patternCore.dispatch(work,{type:'startPattern',target:'flower-pattern',method:'learn',jobId:'offline',now},pc);work=patternCore.dispatch(work,{type:'setCraftAuto',enabled:true,now},pc);
 await op.goto(new URL('seed',base).href);await op.evaluate(({key,source,raw,work})=>{localStorage.setItem(source,raw);localStorage.setItem(key,JSON.stringify(work));},{key:PATTERN_SAVE_KEY,source:STAGED_SAVE_KEY,raw:sourceRaw,work});await op.goto(url);await ready(op);assert.equal(await op.getByRole('dialog',{name:'Пока вас не было'}).count(),1);assert.match(await op.getByRole('dialog').innerText(),/Работа готова.*Запомнить узор/s);assert.ok(!(await snap(op)).state.owned.includes('flower-pattern'));await shot(op,'offline-ready-dialog');await off.close();
 for(const badKey of [STAGED_SAVE_KEY,PATTERN_SAVE_KEY]){const c=await browser.newContext(),p=await c.newPage();await p.goto(new URL('seed',base).href);await p.evaluate(k=>localStorage.setItem(k,'broken'),badKey);await p.goto(url);await p.getByRole('alert').waitFor();assert.match(await p.getByRole('alert').innerText(),/не перезаписаны/);assert.equal(await p.evaluate(k=>localStorage.getItem(k),badKey),'broken');assert.equal(await p.locator('[data-focus-key=craft]').count(),0);await c.close();}
 assert.deepEqual(errors,[]);Object.assign(report,{sourceBytesPreserved:true,sharedWriter:true,directAndLearned:true,cancelAndPause:true,explicitClaim:true,atomicClaimFailure:true,corruptionFailsClosed:true});await writeFile(path.join(evidence,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{await browser.close();if(server)await new Promise(resolve=>server.close(resolve));}
