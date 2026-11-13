import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import path from 'node:path';
import * as core from '../app/core/index.mjs';
import {gameplayCatalog,GAMEPLAY_SAVE_KEY} from './gameplay-catalog.mjs';
import {STAGED_SAVE_KEY} from './staged-catalog.mjs';

const time=1794564000000;
const read=(page,key)=>page.evaluate(key=>localStorage.getItem(key),key);
const ready=page=>page.locator('.meadow-scene').waitFor();
const blocked=page=>page.locator('[data-save-blocked]').waitFor();
export async function exerciseSaveWriter(browser,{baseUrl,evidenceDir}){
  await mkdir(evidenceDir,{recursive:true});
  const url=mode=>{const u=new URL('product/ui/',baseUrl);u.search=mode==='v4'?'?gameplay=v4':'?mode=development';return u.href;};
  const contexts=[];const errors=[];const report={twoTabs:[],failClosed:[],legacyPreserved:false,historyReturn:false};
  async function context(failure){
    const c=await browser.newContext({viewport:{width:390,height:844}});contexts.push(c);
    await c.addInitScript(({time,failure})=>{
      Date.now=()=>time; // Fixed wall clock: equality detects duplicate payments/accrual.
      window.__saveAccess={reads:[],writes:[]};
      const get=Storage.prototype.getItem,set=Storage.prototype.setItem;
      Storage.prototype.getItem=function(key){window.__saveAccess.reads.push(key);return get.call(this,key);};
      Storage.prototype.setItem=function(key,value){window.__saveAccess.writes.push(key);if(window.__failSaveWrites)throw Error('quota');return set.call(this,key,value);};
      if(failure==='unsupported')Object.defineProperty(navigator,'locks',{value:undefined});
      if(failure==='rejected')Object.defineProperty(navigator,'locks',{value:{request:()=>Promise.reject(Error('denied'))}});
      if(failure==='temporary')Object.defineProperty(window,'localStorage',{get(){throw Error('storage disabled');}});
    },{time,failure});
    c.on('page',page=>page.on('pageerror',error=>errors.push(error.message)));
    return c;
  }
  async function noSession(page){
    await blocked(page);
    assert.equal(await page.locator('.meadow-scene').count(),0);
    assert.equal(await page.evaluate(()=>Boolean(window.__stagedGameplay)),false);
    assert.deepEqual(await page.evaluate(()=>window.__saveAccess),{reads:[],writes:[]},'Blocked before migration, tick or UI storage');
  }
  try{
    for(const mode of ['v4','development']){
      const c=await context(),first=await c.newPage(),key=mode==='v4'?STAGED_SAVE_KEY:'mir-na-nitke-development-v1';
      await first.goto(url(mode));await ready(first);
      await first.getByRole('button',{name:'Начать',exact:true}).click();
      await first.getByRole('button',{name:'Вязать',exact:true}).click();
      const paid=await read(first,key);assert.ok(JSON.parse(paid).project.work>0);
      const second=await c.newPage();await second.goto(url(mode));await noSession(second);
      assert.equal(await read(first,key),paid);
      // The original writer remains playable while another tab is blocked.
      await first.getByRole('button',{name:'Вязать',exact:true}).click();
      const continued=await read(first,key);assert.ok(JSON.parse(continued).project.work>JSON.parse(paid).project.work);
      if(mode==='v4')for(const [width,height]of [[360,800],[390,844],[430,932]]){
        await second.setViewportSize({width,height});
        assert.equal(await second.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
        const box=await second.getByRole('button',{name:'Обновить',exact:true}).boundingBox();
        assert.ok(box.width>=44&&box.height>=44&&box.y+box.height<=height);
        await second.screenshot({path:path.join(evidenceDir,`blocked-${width}.png`)});
      }
      await first.close();await second.getByRole('button',{name:'Обновить',exact:true}).click();await ready(second);
      assert.equal(await read(second,key),continued,'Reload resumes exact paid work and wallet');
      assert.equal(JSON.parse(continued).transactionSequence,JSON.parse(paid).transactionSequence);
      // Actual navigation/back: a cached or freshly loaded old page must not write.
      const third=await c.newPage();await third.goto(url(mode));await noSession(third);
      await second.goto(new URL('seed',baseUrl).href);
      await third.reload();await ready(third);const checkpoint=await read(third,key);
      await second.goBack();await blocked(second);
      await second.evaluate(()=>{
        dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}));
        document.dispatchEvent(new Event('visibilitychange'));
      });
      assert.equal(await read(third,key),checkpoint);report.historyReturn=true;
      report.twoTabs.push(mode);await c.close();
    }
    // An old-key paid project must not be imported or overwritten by a blocked tab.
    const {config}=gameplayCatalog();let legacy=core.createInitialState(config,time);
    legacy=core.dispatch(legacy,{type:'startProject',itemId:'rabbit',now:time},config);
    legacy=core.dispatch(legacy,{type:'click',now:time},config);
    const raw=core.serializeState(legacy);
    for(const failure of ['unsupported','rejected']){
      const c=await context(failure),page=await c.newPage();await page.goto(new URL('seed',baseUrl).href);
      await page.evaluate(({key,raw})=>localStorage.setItem(key,raw),{key:GAMEPLAY_SAVE_KEY,raw});
      for(const mode of ['v4','development']){
        await page.goto(url(mode));await noSession(page);
        assert.equal(await read(page,GAMEPLAY_SAVE_KEY),raw);assert.equal(await read(page,STAGED_SAVE_KEY),null);
      }
      report.failClosed.push(failure);await c.close();
    }
    const c=await context(),owner=await c.newPage();await owner.goto(url('development'));await ready(owner);
    await owner.evaluate(({key,raw})=>localStorage.setItem(key,raw),{key:GAMEPLAY_SAVE_KEY,raw});
    const importer=await c.newPage();await importer.goto(url('v4'));await noSession(importer);
    assert.equal(await read(owner,STAGED_SAVE_KEY),null);await owner.close();await importer.reload();await ready(importer);
    assert.equal(await read(importer,GAMEPLAY_SAVE_KEY),raw);
    const imported=JSON.parse(await read(importer,STAGED_SAVE_KEY));assert.equal(imported.wallet.yarn,legacy.wallet.yarn);
    assert.equal(imported.project.itemId,legacy.project.itemId);assert.ok(imported.project.work>0);
    const once=await read(importer,STAGED_SAVE_KEY);await importer.reload();await ready(importer);assert.equal(await read(importer,STAGED_SAVE_KEY),once);
    report.legacyPreserved=true;await c.close();
    const transient=await context('temporary'),page=await transient.newPage();await page.goto(url('development'));await ready(page);
    assert.match(await page.locator('.notice').innerText(),/только в этой вкладке/);
    await page.getByRole('button',{name:'Начать',exact:true}).click();await page.getByRole('button',{name:'Вязать',exact:true}).click();
    const memorySnapshot=()=>page.evaluate(()=>({progress:document.querySelector('progress').value,wallet:document.querySelector('.yarn-wallet').textContent}));
    const inMemory=await memorySnapshot();assert.ok(inMemory.progress>0);
    await page.evaluate(()=>{
      document.dispatchEvent(new Event('freeze'));
      dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true}));
      dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}));
      document.dispatchEvent(new Event('visibilitychange'));
    });
    assert.equal(await page.locator('[data-save-blocked]').count(),0);
    assert.deepEqual(await memorySnapshot(),inMemory);
    await page.getByRole('button',{name:'Вязать',exact:true}).click();
    const resumed=await memorySnapshot();
    assert.ok(resumed.progress>inMemory.progress);
    assert.equal(resumed.wallet,inMemory.wallet);
    assert.deepEqual(await page.evaluate(()=>window.__saveAccess.writes),[]);await transient.close();
    report.temporaryLifecycle=true;
    for(const failure of ['corrupt','write']){
      const isolated=await context(),first=await isolated.newPage(),key='mir-na-nitke-development-v1';
      if(failure==='corrupt'){
        await first.goto(new URL('seed',baseUrl).href);await first.evaluate(key=>localStorage.setItem(key,'{broken'),key);
      }
      await first.goto(url('development'));await ready(first);
      await first.getByRole('button',{name:'Начать',exact:true}).click();await first.getByRole('button',{name:'Вязать',exact:true}).click();
      const saved=await read(first,key);
      if(failure==='write'){
        await first.evaluate(()=>{window.__failSaveWrites=true;});
        await first.getByRole('button',{name:'Вязать',exact:true}).click();
        await first.evaluate(()=>{window.__failSaveWrites=false;});
      }else assert.equal(saved,'{broken');
      assert.match(await first.locator('.notice').innerText(),/только в этой вкладке/);
      const snap=()=>first.evaluate(()=>({work:document.querySelector('progress').value,wallet:document.querySelector('.yarn-wallet').textContent}));
      const memory=await snap(),writes=await first.evaluate(()=>window.__saveAccess.writes.length);
      await first.evaluate(()=>{
        document.dispatchEvent(new Event('freeze'));dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true}));
        dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}));document.dispatchEvent(new Event('visibilitychange'));
      });
      assert.equal(await first.locator('[data-save-blocked]').count(),0);assert.deepEqual(await snap(),memory);
      const other=await isolated.newPage();await other.goto(url(failure==='corrupt'?'v4':'development'));await ready(other);
      if(failure==='write')await other.getByRole('button',{name:'Вязать',exact:true}).click();
      const otherSave=await read(other,key);if(failure==='corrupt')assert.equal(otherSave,'{broken');
      await first.getByRole('button',{name:'Вязать',exact:true}).click();
      assert.ok((await snap()).work>memory.work);assert.equal((await snap()).wallet,memory.wallet);
      assert.equal(await first.evaluate(()=>window.__saveAccess.writes.length),writes);assert.equal(await read(other,key),otherSave);
      await isolated.close();
    }
    report.isolationAfterFailure=['corrupt','write'];
    assert.deepEqual(errors,[]);return report;
  }finally{for(const c of contexts)await c.close();}
}
