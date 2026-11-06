import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {inspect} from './browser.mjs';
for(const [width,height]of [[360,800],[390,844],[430,932]])await inspect({name:`${process.env.EVIDENCE_PREFIX??'qa'}-${width}`,width,height},async({page,context,out,snapshot,points,capture,pass,errors,url})=>{
 const original=await snapshot(),p=await points(),storageKey=`mir-craft-material-pompom-v${original.version}`;
 const at=(x,y)=>({x:p.center.x+x*p.scale+p.gripOffset.x,y:p.center.y+y*p.scale+p.gripOffset.y});
 const otherKeys=['mir-na-nitke-gameplay-preview-v3','mir-craft-feel-study-v1',...(original.version>1?['mir-craft-material-pompom-v1']:[])];
 await page.evaluate(keys=>{for(const key of keys)localStorage.setItem(key,'existing-save-sentinel');},otherKeys);
 await capture('00-start');
 const after=await pass('01-cut',[at(-.92,-.4),at(-.92,0),at(-.92,.4)]);
 assert.ok(after.state.changedFibers>0);assert.equal(after.state.undoDepth,1);
 await page.locator('#finish').click();await capture('02-finished');
 await page.reload();await page.waitForFunction(()=>document.documentElement.dataset.ready==='true');
 assert.deepEqual((await snapshot()).lengths,after.state.lengths);assert.equal((await snapshot()).finished,true);
 await page.locator('#undo').click();assert.deepEqual((await snapshot()).lengths,original.lengths,'undo remains exact after reload');
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 for(const selector of ['#undo','#finish','#reset']){const r=await page.locator(selector).boundingBox();assert.ok(r.width>=44&&r.height>=44&&r.x>=0&&r.y>=0&&r.x+r.width<=width&&r.y+r.height<=height);}
 if(width===390){
  const cdp=await context.newCDPSession(page),before=await snapshot();
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[at(.9,-.4)]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[at(.9,0)]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[at(.9,.4)]});
  // CDP can acknowledge queued touch input before its pointermove reaches JS.
  await page.waitForFunction(({x,y})=>{const p=window.__craftStudy.points().handle;return Math.hypot(p.x-x,p.y-y)<1;},at(.9,.4));
  const held=await snapshot();assert.ok(held.changedFibers>0,'actual touch cuts');
  await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});
  assert.deepEqual((await snapshot()).lengths,held.lengths,'cancellation preserves already cut material');
  await page.mouse.move(p.center.x,p.center.y);assert.deepEqual((await snapshot()).lengths,held.lengths,'cancelled touch cannot keep cutting');
  await capture('03-touch-cancel');await page.locator('#undo').click();assert.deepEqual((await snapshot()).lengths,before.lengths);
  await page.emulateMedia({reducedMotion:'reduce'});await page.locator('#reset').click();await page.locator('#scene').focus();
  for(let i=0;i<12;i++)await page.keyboard.press('ArrowLeft');
  await page.keyboard.down('Space');const oneSnip=await snapshot();assert.ok(oneSnip.changedFibers>0,'keyboard produces a material cut');
  await page.keyboard.down('Space');await page.waitForTimeout(250);assert.deepEqual((await snapshot()).lengths,oneSnip.lengths,'key repeat is not hidden progress');await page.keyboard.up('Space');
  await capture('04-keyboard');
  await page.goto(new URL('style.css',url).href);await page.evaluate(key=>localStorage.setItem(key,'{"lengths":[null]}'),storageKey);
  await page.goto(url);await page.waitForFunction(()=>document.documentElement.dataset.ready==='true');assert.equal((await snapshot()).changedFibers,0,'malformed own save recovers to a new piece');
 }
 assert.deepEqual(await page.evaluate(keys=>keys.map(k=>localStorage.getItem(k)),otherKeys),otherKeys.map(()=>'existing-save-sentinel'));
 assert.deepEqual(errors,[]);
 const report={width,height,localCut:true,exactUndoAfterReload:true,finishPreservesForm:true,otherSavesUntouched:true,controlsVisible:true,noHorizontalOverflow:true,...(width===390?{touch:true,touchCancel:true,keyboard:true,reducedMotion:true,corruptOwnSave:true}:{}),errors,limits:'Automated Chromium browser; no physical phone, human playtest or art PASS.'};
 await writeFile(`${out}/report.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report));
});
