import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile,readdir} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {startServer} from '../../scripts/serve-preview.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE?pathToFileURL(process.env.PLAYWRIGHT_MODULE).href:'playwright');
const server=process.env.STUDY_URL?null:await startServer(0),url=process.env.STUDY_URL??`http://127.0.0.1:${server.address().port}/craft-study/`;
const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
const out=fileURLToPath(new URL('./evidence/',import.meta.url));await mkdir(out,{recursive:true});
const reports=[];
try{
 if(process.env.STUDY_URL)assert.equal(new URL(url).protocol,'https:','deployed study must use HTTPS');
 const request=await browser.newContext(),assetRoot=new URL('../../../craft-study/',import.meta.url);
 const files=['index.html','study.mjs','study.css',...(await readdir(new URL('assets/',assetRoot))).map(n=>'assets/'+n)];
 for(const file of files){const response=await request.request.get(new URL(file,url).href);assert.equal(response.status(),200,file);assert.deepEqual(await response.body(),await readFile(new URL(file,assetRoot)),`exact reviewed bytes: ${file}`);}
 await request.close();
 for(const [width,height]of [[360,800],[390,844],[430,932]]){
  const page=await browser.newPage({viewport:{width,height}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
  await page.addInitScript(()=>{if(location.protocol==='http:'||location.protocol==='https:')for(const k of ['mir-na-nitke-gameplay-preview-v3','mir-na-nitke-art-preview-v2'])if(localStorage.getItem(k)===null)localStorage.setItem(k,'unrelated-save-sentinel');});
  await page.goto(url);await page.waitForFunction(()=>document.querySelector('.atelier').dataset.step==='0');await page.waitForTimeout(200);
  const before=await page.locator('canvas').screenshot();await page.screenshot({path:`${out}/start-${width}.png`});
  await page.locator('#craft').click();await page.waitForTimeout(180);
  assert.equal(await page.locator('.atelier').getAttribute('data-portions'),'1');
  assert.notDeepEqual(await page.locator('canvas').screenshot(),before,'first gesture must change actual artwork');
  await page.screenshot({path:`${out}/first-touch-${width}.png`});
  await page.reload();await page.waitForFunction(()=>document.querySelector('.atelier').dataset.portions==='1');
  const saved=await page.evaluate(()=>localStorage.getItem('mir-craft-feel-study-v1'));
  await page.waitForTimeout(800);assert.equal(await page.evaluate(()=>localStorage.getItem('mir-craft-feel-study-v1')),saved,'there is no claimed idle in this study');
  const box=await page.locator('#craft').boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.waitForTimeout(1700);await page.mouse.up();
  assert.equal(await page.locator('.atelier').getAttribute('data-step'),'1','hold completes only one petal');
  assert.equal(await page.locator('.atelier').getAttribute('data-portions'),'4');
  await page.screenshot({path:`${out}/petal-${width}.png`});
  for(let i=0;i<20;i++)await page.locator('#craft').click();
  await page.waitForTimeout(600);await page.screenshot({path:`${out}/daisy-${width}.png`});
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.locator('#craft').focus();await page.keyboard.press('Enter');
  assert.equal(await page.locator('.atelier').getAttribute('data-portions'),'25');
  for(let i=0;i<23;i++)await page.locator('#craft').click();
  await page.waitForTimeout(100);assert.equal(await page.locator('.atelier').getAttribute('data-mode'),'finish');
  await page.screenshot({path:`${out}/finished-${width}.png`});
  await page.getByRole('button',{name:'Разместить',exact:true}).click();await page.waitForTimeout(200);
  await page.screenshot({path:`${out}/placed-${width}.png`});
  await page.reload();await page.waitForFunction(()=>document.querySelector('.atelier').dataset.mode==='meadow');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'no horizontal overflow');
  const controls=await page.locator('button:visible,a:visible').evaluateAll(ns=>ns.map(n=>{const r=n.getBoundingClientRect();return {label:n.getAttribute('aria-label')||n.textContent,width:r.width,height:r.height,x:r.x,y:r.y};}));
  for(const c of controls){assert.ok(c.x>=0&&c.x+c.width<=width+1,`visible control ${c.label}`);assert.ok(c.height>=44,`touch height ${c.label}`);}
  assert.deepEqual(await page.evaluate(()=>['mir-na-nitke-gameplay-preview-v3','mir-na-nitke-art-preview-v2'].map(k=>localStorage.getItem(k))),['unrelated-save-sentinel','unrelated-save-sentinel']);
  if(width===390){
   await page.locator('#restart').click();const touch=await page.context().newCDPSession(page),r=await page.locator('#craft').boundingBox(),point={x:r.x+r.width/2,y:r.y+r.height/2};
   await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point]});await page.waitForTimeout(1600);await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
   assert.equal(await page.locator('.atelier').getAttribute('data-portions'),'4','real touch hold stops at a petal');
   await page.locator('#craft').focus();for(let i=0;i<10;i++)await page.keyboard.down('Enter');await page.keyboard.up('Enter');
   assert.equal(await page.locator('.atelier').getAttribute('data-portions'),'8','held Enter also stops at a petal');
   // Leave the active renderer before replacing the fixture: pagehide correctly
   // persists its current work and must not overwrite the test's corrupt source.
   await page.goto(new URL('study.css',url).href);
   await page.evaluate(()=>localStorage.setItem('mir-craft-feel-study-v1',JSON.stringify({amounts:Array(12).fill(0),step:0,mode:'finish'})));await page.goto(url);
   await page.waitForFunction(()=>document.querySelector('.atelier').dataset.step==='0');await page.locator('#craft').click();assert.equal(await page.locator('.atelier').getAttribute('data-portions'),'1','inconsistent save recovers to a playable study');
  }
  assert.deepEqual(errors,[]);reports.push({width,height,firstTouchChangesArtwork:true,holdStopsAtPetal:true,reload:true,keyboard:true,reducedMotion:true,liveGameSavesUntouched:true,...(width===390?{realTouch:true,heldEnter:true,corruptSaveRecovery:true}:{}),errors});await page.close();
 }
 await writeFile(`${out}/report.json`,JSON.stringify({url,exactFiles:files.length,reports},null,2));console.log(JSON.stringify({url,exactFiles:files.length,reports},null,2));
}finally{await browser.close();if(server)await new Promise(r=>server.close(r));}
