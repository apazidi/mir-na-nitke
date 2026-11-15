// Targeted visual repair: real clicks through every new item's stages, both worlds.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {startServer} from '../../scripts/serve-preview.mjs';
import * as base from '../../app/core/index.mjs';
import * as core from '../../app/core/pattern.mjs';
import {stagedCatalog,STAGED_SAVE_KEY} from '../../ui/staged-catalog.mjs';
import {patternCatalog,PATTERN_SAVE_KEY} from '../../ui/pattern-catalog.mjs';
const {chromium}=await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
process.env.ART_REVIEW_ROOT??=fileURLToPath(new URL('../../../play-preview/product/art-experiments/rabbit-v1/exports/',import.meta.url));
process.env.FLOWER_REVIEW_ROOT??=fileURLToPath(new URL('../../../play-preview/product/content/items/meadow-flower/art/',import.meta.url));
const server=await startServer(0),browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH}),now=1794580000000,source=stagedCatalog().config,config=patternCatalog().config;
const evidence=fileURLToPath(new URL('../../preview-evidence/pattern/repair/',import.meta.url)),records=[],errors=[];
const seed=rich=>{let s=base.createInitialState(source,now);s.wallet.yarn=1000;s.accrual.baseYarn=1000;for(const item of source.items){if(!rich&&!['rabbit','flower','tree','kot-cat'].includes(item.id))continue;s=base.dispatch(s,{type:'startProject',itemId:item.id,now},source);while(!base.selectView(s,source).project.canComplete)s=base.dispatch(s,{type:'click',now},source);s=base.dispatch(s,{type:'completeCraft',now},source);const m=source.meadows.find(m=>m.slots.some(a=>a.itemId===item.id));s=base.dispatch(s,{type:'placeItem',meadowId:m.id,slotId:m.slots.find(a=>a.itemId===item.id).id,now},source);}return s;};
try{await mkdir(evidence,{recursive:true});
 for(const [width,height]of [[360,800],[390,844],[430,932]])for(const rich of [false,true])for(const target of core.PATTERN_IDS){
  const original=JSON.stringify(seed(rich));let state=core.importState(original,source,config);state=core.dispatch(state,{type:'startPattern',target,method:target===core.PATTERN_ID?'learn':'direct',jobId:'review-'+target,now},config);
  const c=await browser.newContext({viewport:{width,height}});await c.addInitScript(({key,sourceKey,original,state,now})=>{Date.now=()=>now;localStorage.setItem(sourceKey,original);localStorage.setItem(key,JSON.stringify(state));},{key:PATTERN_SAVE_KEY,sourceKey:STAGED_SAVE_KEY,original,state,now});
  const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto(`http://127.0.0.1:${server.address().port}/product/ui/?gameplay=v4&experiment=pattern`);await p.waitForFunction(()=>window.__patternExperiment&&window.__stagedGameplay.snapshot().craft.ready);
  for(const [label,fraction]of [['start',.08],['middle',.5],['ready',1]]){
   await p.evaluate(fraction=>{for(let i=0;i<100&&window.__stagedGameplay.snapshot().view.project.progress<fraction;i++)document.querySelector('[data-focus-key=craft]').click();},fraction);await p.waitForTimeout(300);
   const rects=await p.evaluate(target=>{const item=window.__stagedGameplay.points().item,resident=document.querySelector('[data-item="'+(target==='cat-doily'?'kot-cat':'rabbit')+'"]').getBoundingClientRect();return {item,resident:{top:resident.top,bottom:resident.bottom},controls:[...document.querySelectorAll('[data-focus-key]')].filter(n=>!n.classList.contains('placed-object')&&n.dataset.focusKey!=='craft-art').map(n=>{const r=n.getBoundingClientRect();return {id:n.dataset.focusKey,x:r.x,y:r.y,width:r.width,height:r.height};})};},target);
   assert.ok(rects.item.y+rects.item.height<=rects.resident.top,`${target}/${width}: work remains above resident`);
   for(const r of rects.controls)assert.ok(rects.item.x+rects.item.width<=r.x||r.x+r.width<=rects.item.x||rects.item.y+rects.item.height<=r.y||r.y+r.height<=rects.item.y,`${target}/${width}: no overlap with ${r.id}`);
   await p.screenshot({path:evidence+`${rich?'rich':'minimal'}-${target}-${label}-${width}.png`});records.push({width,rich,target,label,item:rects.item,residentTop:rects.resident.top});
  }
  assert.equal(await p.evaluate(key=>localStorage.getItem(key),STAGED_SAVE_KEY),original);await c.close();
 }
 assert.deepEqual(errors,[]);await writeFile(evidence+'report.json',JSON.stringify({frames:records.length,sourcePreserved:true,workAboveResidents:true,controlsClear:true,records},null,2));console.log(JSON.stringify({frames:records.length,workAboveResidents:true,controlsClear:true}));
}finally{await browser.close();server.close();}
