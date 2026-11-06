// Independent ordinary-input process review. No grants, state setters or clock control.
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { startServer } from '../../../../scripts/serve-preview.mjs';
const expected = '5cc9ef5af302908a4fce816134708bae31e97911';
const repo = fileURLToPath(new URL('../../../../../', import.meta.url));
const runtime = execFileSync('git', ['rev-parse','HEAD'], {cwd:repo,encoding:'utf8'}).trim();
if(runtime!==expected)throw Error(`Wrong runtime ${runtime}`);
if(!process.env.PLAYWRIGHT_MODULE)throw Error('Set PLAYWRIGHT_MODULE');
const {chromium}=await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
const out=fileURLToPath(new URL('./fresh/',import.meta.url));await mkdir(out,{recursive:true});
const server=await startServer(0),browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
const context=await browser.newContext({viewport:{width:390,height:844},recordVideo:{dir:out,size:{width:390,height:844}}});
const page=await context.newPage(),records=[],events=[],errors=[];let failure=null;
page.on('pageerror',e=>errors.push(e.message));
const started=performance.now(),t=()=>+( (performance.now()-started)/1000 ).toFixed(3);
const key=n=>page.locator(`[data-focus-key="${n}"]`);
const read=()=>page.evaluate(()=>window.__stagedGameplay.snapshot());
const boot=()=>page.waitForFunction(()=>window.__stagedGameplay&&document.querySelector('.meadow-scene'));
const ready=()=>page.waitForFunction(()=>window.__stagedGameplay.snapshot().craft.ready);
async function capture(name){const s=await read(),points=await page.evaluate(()=>window.__stagedGameplay.points());records.push({name,t:t(),snapshot:s,points});await page.screenshot({path:`${out}/${name}.png`});return s;}
async function auto(enabled){const s=await read();if(s.state.craftAuto!==enabled){await key('craft-auto').click();events.push({event:'auto',enabled,t:t()});}}
try{
 await page.goto(`http://127.0.0.1:${server.address().port}/play-preview/`);await boot();await capture('00-fresh');
 for(const id of ['rabbit','flower','tree','kot-cat']){
  if(id==='kot-cat'){await key('scene-chooser').click();await capture('tree-unlocked-map');await key('scene-kotoutro').click();await capture('pond-before-cat');}
  if(!await key('next-project').isEnabled())throw Error(`Next project not available: ${id}`);
  await key('next-project').click();await ready();let s=await capture(`${id}-start`);
  if(s.state.project?.itemId!==id)throw Error(`Expected ${id}`);
  await auto(id==='tree');
  let clicks=0;const captured=new Set();
  if(id==='rabbit'){
   await key('craft').click();clicks++;events.push({event:'click',id,clicks,t:t(),after:(await read()).craft});await page.waitForTimeout(700);const first=await capture('rabbit-first-click');
   await page.waitForTimeout(1800);const held=await capture('rabbit-auto-off-held');
   if(held.state.project.work!==first.state.project.work)throw Error('Off auto advanced');
   await auto(true);await page.waitForTimeout(4000);await capture('rabbit-auto-four-seconds');await auto(false);await capture('rabbit-auto-paused');
  }
  while(!(s=await read()).view.project.canComplete){
   const began=performance.now(),section=s.craft.sectionIndex;
   // Normal rhythm on rabbit and tree throughout, and on the main petal/body/head stages.
   const normal=id==='rabbit'||id==='tree'||(id==='flower'&&section===2)||(id==='kot-cat'&&[1,2].includes(section));
   await key(clicks===8?'craft-art':'craft').click();clicks++;
   let after=await read();events.push({event:'click',id,clicks,t:t(),normal,work:after.state.project.work,craft:after.craft});
   await page.waitForTimeout(normal?720:180);
   after=await read();
   const part=after.craft.sectionIndex;
   if(part<6&&after.craft.sectionProgress>=.5&&!captured.has(part)){
    captured.add(part);await capture(`${id}-part-${part+1}-half`);
   }
   if(clicks>65)throw Error(`Unexpected click count ${id}`);
   await page.waitForTimeout(Math.max(0,(normal?1000:300)-(performance.now()-began)));
  }
  await page.waitForTimeout(800);await capture(`${id}-ready`);events.push({event:'ready',id,clicks,t:t()});
  await key('craft').click();await page.waitForTimeout(250);s=await capture(`${id}-placed`);
  if(!s.state.owned.includes(id)||!Object.values(s.state.placements).some(m=>Object.values(m).includes(id)))throw Error(`Not placed ${id}`);
  events.push({event:'placed',id,clicks,t:t(),wallet:s.state.wallet.yarn});
  console.log(JSON.stringify({id,clicks,wallet:s.state.wallet.yarn,owned:s.state.owned,errors}));
 }
 await page.waitForTimeout(1200);await capture('four-items-earned');
 await page.reload();await boot();if(await key('close-drawer').isVisible())await key('close-drawer').click();await capture('four-items-reloaded');
}catch(e){failure=e.stack;try{await capture('FAILED');}catch{}}finally{
 const video=page.video();await page.close();await context.close();await video.saveAs(`${out}/process.webm`);
 await writeFile(`${out}/observations.json`,JSON.stringify({runtime,clock:'Real time',input:'Ordinary UI only',records,events,errors,failure},null,2));
 await browser.close();await new Promise(r=>server.close(r));
}
if(failure)throw Error(failure);
