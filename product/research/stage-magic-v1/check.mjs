import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {inspect} from './browser.mjs';
import {CLICK_WORK,STAGE_MS,SECTION_COUNT} from './prototype/model.mjs';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} vs ${b}`);
for(const [width,height] of [[360,800],[390,844],[430,932]])await inspect({name:`${process.env.EVIDENCE_PREFIX??'qa'}-${width}`,width,height},async({page,context,out,snapshot,points,capture,errors})=>{
 const oldKeys=['mir-na-nitke-gameplay-preview-v3','mir-craft-feel-study-v1','mir-craft-material-pompom-v1','mir-craft-material-pompom-v2'];
 await page.evaluate(keys=>keys.forEach(k=>localStorage.setItem(k,'existing-save-sentinel')),oldKeys);
 const initial=await snapshot();assert.equal(initial.work,0);assert.equal(initial.started,false);assert.equal(initial.auto,false);
 await page.waitForTimeout(600);assert.equal((await snapshot()).work,0,'new clearing does not make itself before starting');
 assert.equal(await page.locator('#reset').isVisible(),false);
 await capture('00-empty');
 await page.locator('#craft').click();await page.waitForTimeout(350);near((await snapshot()).work,CLICK_WORK);await capture('01-first-click');
 await page.locator('#craft').click();await page.locator('#craft').click();await page.waitForTimeout(350);near((await snapshot()).work,CLICK_WORK*3);await capture('02-three-clicks');
 await page.reload();await page.waitForFunction(()=>document.documentElement.dataset.ready==='true');near((await snapshot()).work,CLICK_WORK*3);
 const before=await snapshot();await page.locator('#auto').click();await page.waitForTimeout(2200);await page.locator('#auto').click();const after=await snapshot();
 assert.ok(after.work>before.work+.04&&after.work<before.work+.2,'real idle time advances current section');
 await page.waitForTimeout(400);near((await snapshot()).work,after.work);await capture('03-auto-paused');
 await page.locator('#auto').click();await page.goto('about:blank');await page.waitForTimeout(1300);await page.goBack();await page.waitForFunction(()=>document.documentElement.dataset.ready==='true');await page.locator('#auto').click();const returned=await snapshot();
 assert.ok(returned.work>after.work+.025&&returned.work<after.work+.25,'return settles elapsed automatic work');
 await page.reload();await page.waitForFunction(()=>document.documentElement.dataset.ready==='true');near((await snapshot()).work,returned.work);
 if(width===390){
  const b=await page.locator('#craft').boundingBox(),cdp=await context.newCDPSession(page),old=(await snapshot()).work;
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:b.x+b.width/2,y:b.y+b.height/2}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await page.waitForFunction(expected=>Math.abs(window.__stageStudy.snapshot().work-expected)<1e-7,old+CLICK_WORK);
  await page.emulateMedia({reducedMotion:'reduce'});await page.locator('#craft').focus();await page.keyboard.press('Space');near((await snapshot()).work,old+CLICK_WORK*2);
 }
 for(const selector of ['#craft','#auto']){const r=await page.locator(selector).boundingBox();assert.ok(r&&r.width>=44&&r.height>=44&&r.x>=0&&r.y>=0&&r.x+r.width<=width&&r.y+r.height<=height,selector);}
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 let count=0;while(!(await snapshot()).finished&&count++<Math.ceil(SECTION_COUNT/CLICK_WORK)+2)await page.locator('#craft').click();
 assert.equal((await snapshot()).work,SECTION_COUNT);assert.equal((await snapshot()).auto,false);await page.waitForTimeout(1200);await capture('04-finished');
 await page.reload();await page.waitForFunction(()=>document.documentElement.dataset.ready==='true');assert.equal((await snapshot()).work,SECTION_COUNT);assert.equal((await snapshot()).finished,true);await capture('05-finished-return');
 const r=await page.locator('#reset').boundingBox();assert.ok(r&&r.width>=44&&r.height>=44&&r.y+r.height<=height);await page.locator('#reset').click();assert.equal((await snapshot()).work,0);assert.equal((await snapshot()).auto,false);
 assert.deepEqual(await page.evaluate(keys=>keys.map(k=>localStorage.getItem(k)),oldKeys),oldKeys.map(()=>'existing-save-sentinel'));assert.deepEqual(errors,[]);
 const report={width,height,firstAndThreeClicks:true,explicitStart:true,autoPause:true,returnSettlesOnce:true,completionPersists:true,oldSavesUntouched:true,controlsVisible:true,noOverflow:true,...(width===390?{touch:true,keyboard:true,reducedMotion:true}:{}),errors,limits:'Automated browser; no claim of physical-phone performance, human enjoyment or art approval.'};
 await writeFile(`${out}/report.json`,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
});
