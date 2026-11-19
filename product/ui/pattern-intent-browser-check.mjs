import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import path from 'node:path';
import {startServer} from '../scripts/serve-preview.mjs';
import * as baseCore from '../app/core/index.mjs';
import {stagedCatalog,STAGED_SAVE_KEY} from './staged-catalog.mjs';
import {PATTERN_SAVE_KEY} from './pattern-catalog.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE?pathToFileURL(process.env.PLAYWRIGHT_MODULE).href:'playwright');
process.env.ART_REVIEW_ROOT??=fileURLToPath(new URL('../../play-preview/product/art-experiments/rabbit-v1/exports/',import.meta.url));
process.env.FLOWER_REVIEW_ROOT??=fileURLToPath(new URL('../../play-preview/product/content/items/meadow-flower/art/',import.meta.url));
const server=process.env.PREVIEW_URL?null:await startServer(0),base=process.env.PREVIEW_URL??`http://127.0.0.1:${server.address().port}/`;
const url=new URL('product/ui/?gameplay=v4&experiment=pattern',base).href;
const evidence=fileURLToPath(new URL('../preview-evidence/pattern-intent/',import.meta.url));
const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
const now=1795000000000,{config}=stagedCatalog(),errors=[],report={url,sizes:[]};
let source=baseCore.createInitialState(config,now);source.wallet.yarn=18722.7;source.accrual.baseYarn=18722.7;
source.owned=config.items.map(i=>i.id);source.placements=Object.fromEntries(config.meadows.map(m=>[m.id,Object.fromEntries(m.slots.map(s=>[s.id,s.itemId]))]));
source=baseCore.dispatch(source,{type:'setCraftAuto',enabled:false,now},config);const raw=JSON.stringify(source);
const focus=(p,key)=>p.locator(`[data-focus-key="${key}"]`),ready=p=>p.waitForFunction(()=>Boolean(window.__patternExperiment)),snap=p=>p.evaluate(()=>window.__patternExperiment.snapshot());
async function choose(p,id){await focus(p,'intent-edit').click();await focus(p,'intent-'+id).click();}
async function visibleAction(p,key){
 const actual=await focus(p,key).evaluate(b=>{const r=b.getBoundingClientRect(),p=b.closest('.project-drawer').getBoundingClientRect();return {key:b.dataset.focusKey,top:r.top,bottom:r.bottom,panelTop:p.top,panelBottom:p.bottom,disabled:b.disabled};});
 assert.equal(actual.disabled,false,key);assert.ok(actual.top>=actual.panelTop&&actual.bottom<=actual.panelBottom,JSON.stringify(actual));
 (report.visibleActions??=[]).push({width:p.viewportSize().width,...actual});
}
async function close(p){if(await focus(p,'close-drawer').isVisible())await focus(p,'close-drawer').click();}
async function finish(p){await p.evaluate(()=>{for(let i=0;i<200&&!window.__patternExperiment.snapshot().view.project.canComplete;i++)document.querySelector('[data-focus-key=craft]').click();});await p.waitForFunction(()=>window.__patternExperiment.snapshot().craft.ready);await p.waitForTimeout(400);}
async function shot(p,name){await p.locator('img').evaluateAll(a=>Promise.all(a.map(i=>i.decode())));assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await p.screenshot({path:path.join(evidence,name+'.png')});}
async function seed(p){await p.goto(new URL('seed',base).href);await p.evaluate(({raw,source,key})=>{localStorage.setItem(source,raw);localStorage.removeItem(key);localStorage.removeItem(key+'-ui');},{raw,source:STAGED_SAVE_KEY,key:PATTERN_SAVE_KEY});await p.goto(url);await ready(p);await close(p);}
try{
 await mkdir(evidence,{recursive:true});
 for(const [width,height]of [[360,800],[390,844],[430,932]]){
  const context=await browser.newContext({viewport:{width,height}});
  await context.addInitScript(now=>{window.__testNow=Number(sessionStorage.getItem('intent-test-now')??now);Date.now=()=>window.__testNow;},now);
  const p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));await seed(p);
  await focus(p,'open-pattern').click();const before=await p.evaluate(k=>localStorage.getItem(k),PATTERN_SAVE_KEY);await visibleAction(p,'pattern-rabbit-scarf-direct');
  await choose(p,'rabbit-scarf');assert.match(await p.locator('.pattern-comparison').innerText(),/144,2 с.*160,94 с.*больше времени/s);await visibleAction(p,'pattern-rabbit-scarf-direct');
  await choose(p,'cat-doily');await visibleAction(p,'pattern-cat-doily-direct');
  await choose(p,'both');assert.equal((await snap(p)).state.project,null);assert.equal(await p.evaluate(k=>localStorage.getItem(k),PATTERN_SAVE_KEY),before);await visibleAction(p,'pattern-learn');await visibleAction(p,'pattern-rabbit-scarf-direct');await shot(p,'chosen-'+width);
  await focus(p,'pattern-learn').click();await focus(p,'craft-auto').click();
  await p.evaluate(()=>{sessionStorage.setItem('intent-test-now',String(window.__testNow+3600000));});await p.reload();await ready(p);
  assert.match(await p.getByRole('dialog').innerText(),/Мой замысел: Оба аксессуара.*Готово 0 из 2.*подтвердите/s);
  assert.ok(!(await snap(p)).state.owned.includes('flower-pattern'));await shot(p,'return-'+width);
  await focus(p,'return-intent').click();await focus(p,'craft').click();
  assert.equal((await snap(p)).state.project,null);assert.match(await p.locator('.pattern-comparison').innerText(),/12 пряжи.*201,88 с.*Повторно/s);await visibleAction(p,'pattern-rabbit-scarf-learned');await shot(p,'learned-choice-'+width);
  await focus(p,'pattern-rabbit-scarf-learned').click();await focus(p,'open-pattern').click();
  const paid=JSON.stringify((await snap(p)).state.project);await choose(p,'cat-doily');assert.equal(JSON.stringify((await snap(p)).state.project),paid);assert.equal(await focus(p,'pattern-cat-doily-learned').isDisabled(),true);
  await choose(p,'both');await focus(p,'pattern-continue').click();await finish(p);await focus(p,'craft').click();
  assert.ok((await snap(p)).state.owned.includes('rabbit-scarf'));await shot(p,'first-applied-'+width);
  await p.reload();await ready(p);await close(p);assert.equal((await snap(p)).ui.patternIntent,'both');
  await focus(p,'continue-intent').click();assert.match(await p.getByRole('dialog').innerText(),/Готово 1 из 2.*Салфетка/s);assert.match(await p.locator('.pattern-comparison').innerText(),/6 пряжи.*100,94 с/s);await visibleAction(p,'pattern-cat-doily-learned');await shot(p,'one-remaining-'+width);
  await focus(p,'pattern-cat-doily-learned').click();await finish(p);await focus(p,'craft').click();await focus(p,'continue-intent').click();
  assert.match(await p.getByRole('dialog').innerText(),/Замысел выполнен/);assert.equal(await p.locator('.pattern-comparison').count(),0);assert.equal((await snap(p)).state.project,null);await shot(p,'complete-'+width);
  await choose(p,'none');assert.equal((await snap(p)).ui.patternIntent,null);assert.equal(await p.evaluate(k=>localStorage.getItem(k),STAGED_SAVE_KEY),raw);
  await context.close();report.sizes.push(width);
 }
 // Failed UI writes keep the former choice, without starting work or touching the core save.
 const c=await browser.newContext({viewport:{width:390,height:844}});await c.addInitScript(now=>{Date.now=()=>now;},now);const p=await c.newPage();await seed(p);await focus(p,'open-pattern').click();await choose(p,'rabbit-scarf');
 const before=await p.evaluate(k=>localStorage.getItem(k),PATTERN_SAVE_KEY);
 await p.evaluate(key=>{const set=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k===key)throw Error('quota');return set.call(this,k,v);};},PATTERN_SAVE_KEY+'-ui');
 await choose(p,'both');assert.match(await p.getByRole('alert').innerText(),/Не удалось сохранить замысел/);assert.equal((await snap(p)).ui.patternIntent,'rabbit-scarf');assert.equal(await p.evaluate(k=>localStorage.getItem(k),PATTERN_SAVE_KEY),before);await shot(p,'write-error');
 await p.reload();await ready(p);assert.equal((await snap(p)).ui.patternIntent,'rabbit-scarf');
 await p.goto(new URL('seed',base).href);
 await p.evaluate(key=>{const ui=JSON.parse(localStorage.getItem(key));ui.patternIntent={both:true};localStorage.setItem(key,JSON.stringify(ui));},PATTERN_SAVE_KEY+'-ui');
 await p.goto(url);await ready(p);assert.equal((await snap(p)).ui.patternIntent,null);assert.equal(await p.evaluate(k=>localStorage.getItem(k),PATTERN_SAVE_KEY),before);
 // Orphan UI from an earlier experiment must not attach to a freshly imported rich source.
 await p.goto(new URL('seed',base).href);
 await p.evaluate(key=>{localStorage.removeItem(key);localStorage.setItem(key+'-ui',JSON.stringify({patternIntent:'both'}));},PATTERN_SAVE_KEY);
 await p.goto(url);await ready(p);assert.equal((await snap(p)).ui.patternIntent,null);assert.equal((await snap(p)).view.pattern.unlocked,true);
 // A new source/world does not inherit a stale optional goal.
 await p.goto(new URL('seed',base).href);
 await p.evaluate(key=>{localStorage.removeItem(key);localStorage.removeItem('mir-na-nitke-gameplay-preview-v4');localStorage.setItem(key+'-ui',JSON.stringify({patternIntent:'both'}));},PATTERN_SAVE_KEY);
 await p.goto(url);await ready(p);assert.equal((await snap(p)).ui.patternIntent,null);assert.equal((await snap(p)).state.owned.length,0);await c.close();
 assert.deepEqual(errors,[]);Object.assign(report,{noAutomaticQueue:true,explicitClaims:true,remainingCost:true,paidSlotPreserved:true,sourceBytesPreserved:true,invalidIntentSafe:true,writeFailureHonest:true,freshWorldClearsIntent:true});
 await writeFile(path.join(evidence,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{await browser.close();if(server)await new Promise(resolve=>server.close(resolve));}
