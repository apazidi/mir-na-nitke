// Technical fixture only: imported rich v3 world, max upgrades, then real-time UI repeat.
// Not an earned player journey. No clock acceleration is used for the observed process.
import {mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {startServer} from '../../../../scripts/serve-preview.mjs';
import * as core from '../../../../app/core/index.mjs';
import {gameplayCatalog,GAMEPLAY_SAVE_KEY} from '../../../../ui/gameplay-catalog.mjs';
const runtime=execFileSync('git',['rev-parse','HEAD'],{cwd:fileURLToPath(new URL('../../../../../',import.meta.url)),encoding:'utf8'}).trim();
if(runtime!=='5cc9ef5af302908a4fce816134708bae31e97911')throw Error('Wrong runtime');
const old=gameplayCatalog(true).config;
let source=core.createInitialState({...old,initialYarn:100000},Date.now());
const act=(type,fields={})=>{source=core.dispatch(source,{type,...fields,now:source.lastTimestamp},old);};
for(const id of ['rabbit','flower','tree','house','butterfly','kot-cat','kot-coffee','kot-duck','kot-chair','kot-leaf-house']){
 act('startProject',{itemId:id});while(source.project.work<old.items.find(i=>i.id===id).workUnits)act('click');act('completeCraft');act('placeItem',{meadowId:old.items.find(i=>i.id===id).meadowId,slotId:id});
}
for(const upgradeId of ['hook','basket'])for(let i=0;i<10;i++)act('buyUpgrade',{upgradeId});
const rawState=JSON.parse(core.serializeState(source));delete rawState.craftAuto;const raw=JSON.stringify(rawState);
const {chromium}=await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
const out=fileURLToPath(new URL('./max-fixture/',import.meta.url));await mkdir(out,{recursive:true});
const server=await startServer(0),browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
const context=await browser.newContext({viewport:{width:390,height:844},recordVideo:{dir:out,size:{width:390,height:844}}});
await context.addInitScript(({key,raw})=>{if(location.protocol.startsWith('http')&&localStorage.getItem(key)===null)localStorage.setItem(key,raw);},{key:GAMEPLAY_SAVE_KEY,raw});
const page=await context.newPage(),records=[],events=[],errors=[];let failure=null;const began=performance.now(),t=()=>+( (performance.now()-began)/1000 ).toFixed(3);
page.on('pageerror',e=>errors.push(e.message));
const key=n=>page.locator(`[data-focus-key="${n}"]`),read=()=>page.evaluate(()=>window.__stagedGameplay.snapshot());
async function shot(name){const snapshot=await read();records.push({name,t:t(),snapshot,points:await page.evaluate(()=>window.__stagedGameplay.points())});await page.screenshot({path:`${out}/${name}.png`});return snapshot;}
try{
 await page.goto(`http://127.0.0.1:${server.address().port}/play-preview/`);await page.waitForFunction(()=>window.__stagedGameplay&&document.querySelector('.meadow-scene'));if(await key('close-drawer').isVisible())await key('close-drawer').click();
 const before=await shot('00-imported');if(before.state.owned.length!==10||before.state.upgrades.hook!==10||before.state.upgrades.basket!==10)throw Error('Not max imported fixture');
 await key('tab-projects').click();await shot('01-projects-repeat');await key('repeat-tree').click();await page.waitForFunction(()=>window.__stagedGameplay.snapshot().craft.ready);await shot('02-repeat-start');
 let n=0,seen=new Set();while(!(await read()).view.project.canComplete){const tick=performance.now();await key('craft').click();n++;const s=await read();events.push({event:'click',n,t:t(),craft:s.craft,work:s.state.project.work});await page.waitForTimeout(700);const p=(await read()).craft;if(p.sectionIndex<6&&p.sectionProgress>=.45&&!seen.has(p.sectionIndex)){seen.add(p.sectionIndex);await shot(`03-part-${p.sectionIndex+1}`);}await page.waitForTimeout(Math.max(0,1000-(performance.now()-tick)));if(n>30)throw Error('Excessive max clicks');}
 await page.waitForTimeout(800);const complete=await shot('04-repeat-ready');await key('craft').click();const restored=await shot('05-world-restored');
 if(JSON.stringify(before.state.owned)!==JSON.stringify(restored.state.owned)||JSON.stringify(before.state.placements)!==JSON.stringify(restored.state.placements))throw Error('Repeat changed earned objects');
 const rawStill=await page.evaluate(k=>localStorage.getItem(k),GAMEPLAY_SAVE_KEY);if(rawStill!==raw)throw Error('Legacy source changed');
 events.push({event:'repeat-finished',n,t:t(),walletBefore:complete.state.wallet.yarn,walletAfter:restored.state.wallet.yarn,owned:restored.state.owned.length});
 await key('tab-projects').click();await key('repeat-rabbit').click();await page.waitForFunction(()=>window.__stagedGameplay.snapshot().craft.ready);await key('craft').click();await key('cancel-recraft').click();await shot('06-repeat-cancelled');
 console.log(JSON.stringify({fixture:'Imported complete world, max10',clicks:n,owned:restored.state.owned.length,finishWalletDelta:restored.state.wallet.yarn-complete.state.wallet.yarn,errors}));
}catch(e){failure=e.stack;try{await shot('FAILED');}catch{}}finally{const video=page.video();await page.close();await context.close();await video.saveAs(`${out}/process.webm`);await writeFile(`${out}/observations.json`,JSON.stringify({runtime,fixture:'Synthetic v3 full world and max10 levels; observed UI uses real time',records,events,errors,failure},null,2));await browser.close();await new Promise(r=>server.close(r));}
if(failure)throw Error(failure);
