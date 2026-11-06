// Narrow ordinary-UI repeat after pose repair. Rabbit/flower earned by fast clicks;
// first two tree sections at ~1 click/s with auto, remaining sections faster.
import {mkdir,writeFile} from 'node:fs/promises';import {fileURLToPath,pathToFileURL} from 'node:url';import {execFileSync} from 'node:child_process';import {startServer} from '../../../../scripts/serve-preview.mjs';
const runtime=execFileSync('git',['rev-parse','HEAD'],{cwd:fileURLToPath(new URL('../../../../../',import.meta.url)),encoding:'utf8'}).trim();
if(runtime!=='e2b137657278cec06b0f202a861f1a2d7018bfca')throw Error('Wrong repaired runtime');
const {chromium}=await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
const out=fileURLToPath(new URL('./repair/',import.meta.url));await mkdir(out,{recursive:true});
const server=await startServer(0),browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
const context=await browser.newContext({viewport:{width:390,height:844},recordVideo:{dir:out,size:{width:390,height:844}}}),page=await context.newPage(),records=[],events=[],errors=[];let failure=null;
page.on('pageerror',e=>errors.push(e.message));const start=performance.now(),time=()=>+( (performance.now()-start)/1000 ).toFixed(3);
const key=n=>page.locator(`[data-focus-key="${n}"]`),read=()=>page.evaluate(()=>window.__stagedGameplay.snapshot());
const boot=()=>page.waitForFunction(()=>window.__stagedGameplay&&document.querySelector('.meadow-scene'));
const ready=()=>page.waitForFunction(()=>window.__stagedGameplay.snapshot().craft.ready);
async function shot(name){const snapshot=await read(),points=await page.evaluate(()=>window.__stagedGameplay.points());const placed=await page.locator('[data-item="tree"]').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height};}));records.push({name,t:time(),snapshot,points,placed});await page.screenshot({path:`${out}/${name}.png`});}
try{
 await page.goto(`http://127.0.0.1:${server.address().port}/play-preview/`);await boot();
 for(const id of ['rabbit','flower']){await key('next-project').click();await ready();let n=0;while(!(await read()).view.project.canComplete){await key('craft').click();n++;if(n>53)throw Error('Unexpected preparation count');}await key('craft').click();events.push({event:'earned-neighbor',id,n,t:time()});}
 await shot('00-neighbors-earned');await key('next-project').click();await ready();await key('craft-auto').click();await shot('01-tree-start');
 let clicks=0,seen=new Set();while(!(await read()).view.project.canComplete){const began=performance.now(),s=await read(),normal=s.craft.sectionIndex<2;
  await key('craft').click();clicks++;let a=await read();events.push({event:'click',clicks,normal,t:time(),work:a.state.project.work,craft:a.craft});await page.waitForTimeout(normal?720:180);a=await read();
  if(clicks===1)await shot('02-first-click');if(a.craft.sectionIndex<2&&a.craft.sectionProgress>=.5&&!seen.has(a.craft.sectionIndex)){seen.add(a.craft.sectionIndex);await shot(`03-part-${a.craft.sectionIndex+1}-half`);}
  if(a.craft.sectionIndex===2&&!seen.has(2)){seen.add(2);await shot('04-next-canopy');}
  await page.waitForTimeout(Math.max(0,(normal?1000:300)-(performance.now()-began)));if(clicks>55)throw Error('Unexpected tree count');
 }
 await page.waitForTimeout(800);await shot('05-tree-ready');await key('craft').click();events.push({event:'place',t:time()});await page.waitForTimeout(300);await shot('06-tree-placed');await page.waitForTimeout(1300);await shot('07-settled');
 console.log(JSON.stringify({runtime,clicks,owned:(await read()).state.owned,errors}));
}catch(e){failure=e.stack;try{await shot('FAILED');}catch{}}finally{const video=page.video();await page.close();await context.close();await video.saveAs(`${out}/process.webm`);await writeFile(`${out}/observations.json`,JSON.stringify({runtime,clock:'Real time; UI-earned neighbors, no grants',records,events,errors,failure},null,2));await browser.close();await new Promise(r=>server.close(r));}
if(failure)throw Error(failure);
