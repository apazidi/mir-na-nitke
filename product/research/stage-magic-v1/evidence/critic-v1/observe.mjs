// Reproduction script for runtime d37550ae3c2a41ae89cdec13680539422c91c241.
// PLAYWRIGHT_MODULE points to its index.mjs; CHROME_PATH is optional.
// PLAYWRIGHT_BROWSERS_PATH may select the installed video/Chromium bundle.
// Run from the repository root at the recorded runtime; retain existing evidence separately.
import {mkdir,writeFile} from 'node:fs/promises';import {fileURLToPath,pathToFileURL} from 'node:url';import {startServer} from '../../../../scripts/serve-preview.mjs';
if(!process.env.PLAYWRIGHT_MODULE)throw Error('Set PLAYWRIGHT_MODULE to the Playwright index.mjs path');
const {chromium}=await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
const base=fileURLToPath(new URL('.',import.meta.url)),server=await startServer(0),browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
async function run(effect){const out=`${base}/${effect}`;await mkdir(out,{recursive:true});const context=await browser.newContext({viewport:{width:390,height:844},recordVideo:{dir:out,size:{width:390,height:844}}}),page=await context.newPage(),records=[],errors=[],events=[];page.on('pageerror',e=>errors.push(e.message));const start=performance.now();const mark=name=>events.push({name,t:(performance.now()-start)/1000});
 const snapshot=()=>page.evaluate(()=>window.__stageStudy.snapshot());
 async function snap(name){const record={name,state:await snapshot(),points:await page.evaluate(()=>window.__stageStudy.points()),t:(performance.now()-start)/1000};records.push(record);await page.screenshot({path:`${out}/${name}.png`});return record;}
 try{await page.goto(`http://127.0.0.1:${server.address().port}/product/research/stage-magic-v1/prototype/?effect=${effect}`);await page.waitForFunction(()=>document.documentElement.dataset.ready==='true');await snap('00-start');
 const captured=new Set([1,3,6,9,12,13,14,16,19,22,25,26,28,31,34,37,38,39,41,44,47,50,51,56,62,63,75]);
 for(let n=1;n<=75;n++){const t=performance.now();await page.locator('#craft').click();mark(`click-${n}`);const normal=n>=14&&n<=50;if(captured.has(n)){await page.waitForTimeout(820);await snap(`click-${String(n).padStart(2,'0')}`);}else await page.waitForTimeout(normal?900:160);if(normal)await page.waitForTimeout(Math.max(0,1000-(performance.now()-t)));if([25,38,50,75].includes(n))console.log(JSON.stringify({effect,checkpoint:n,state:await snapshot()}));}
 await page.waitForTimeout(1200);const final=await snap('final-quiet');await page.reload();await page.waitForFunction(()=>document.documentElement.dataset.ready==='true');await snap('final-reloaded');
 await page.locator('#reset').click();await page.locator('#auto').click();mark('auto-start');await page.waitForTimeout(5000);await snap('auto-5s');for(let i=0;i<3;i++){await page.locator('#craft').click();await page.waitForTimeout(1000);}await snap('auto-plus-three');await page.locator('#auto').click();await page.waitForTimeout(800);const paused=await snap('auto-paused');await page.waitForTimeout(2500);const held=await snap('auto-still-paused');
 console.log(JSON.stringify({effect,done:true,pausedStable:paused.state.work===held.state.work,finalWork:final.state.work,errors}));const video=page.video();await page.close();await context.close();await video.saveAs(`${out}/process.webm`);
 }finally{await writeFile(`${out}/observations.json`,JSON.stringify({runtime:'d37550ae3c2a41ae89cdec13680539422c91c241',effect,records,errors,events},null,2));if(!page.isClosed()){await page.close();await context.close();}}
}
try{await Promise.all([run('sparks'),run('wave')]);}finally{await browser.close();await new Promise(r=>server.close(r));}
