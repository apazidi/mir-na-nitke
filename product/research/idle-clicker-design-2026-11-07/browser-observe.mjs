// Fresh public UI observation. Scripted real-time inputs, no grants or time acceleration.
import {mkdir,writeFile} from 'node:fs/promises';
import {pathToFileURL,fileURLToPath} from 'node:url';
import path from 'node:path';
import {readPublicProvenance} from './public-provenance.mjs';
const {chromium}=await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});
const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1});
const page=await context.newPage(),folder=fileURLToPath(new URL('./evidence/',import.meta.url));await mkdir(folder,{recursive:true});
const url='https://apazidi.github.io/mir-na-nitke/play-preview/';
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const key=k=>page.locator('[data-focus-key="'+k+'"]');
const boot=()=>page.waitForFunction(()=>Boolean(window.__stagedGameplay&&document.querySelector('.meadow-scene')));
const snap=()=>page.evaluate(()=>window.__stagedGameplay.snapshot());
const report={url,viewport:{width:390,height:844},method:'Headless Chromium scripted real-time public UI. Fresh context; no save injection, fake clock or work grants. Screens and work timeline are observation evidence; not a human enjoyment test.',events:[],errors};
const note=async(label,shot=false)=>{const s=await snap();report.events.push({label,elapsedMs:Date.now()-began,state:s.state,craft:s.craft,availableProjects:s.view.projects.filter(p=>p.canStart).map(p=>p.itemId),upgrades:s.view.upgrades});if(shot)await page.screenshot({path:path.join(folder,label+'.webp'),type:'webp',quality:78});};
const began=Date.now();
try{
 report.provenance=await readPublicProvenance(url);
 await page.goto(url);await boot();await note('01-empty',true);
 for(const [i,id] of ['rabbit','flower','tree','kot-cat'].entries()){
  if(id==='kot-cat'){await key('scene-chooser').click();await key('scene-kotoutro').click();}
  await key('next-project').click();await page.waitForFunction(()=>window.__stagedGameplay.snapshot().craft.ready);
  if(id==='rabbit'){
   const box=await key('craft').boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.waitForTimeout(3200);await note('02-held-before-release',true);await page.mouse.up();await note('03-held-after-release');
   await key('craft-auto').click();await page.waitForTimeout(2000);await note('04-before-away');
   await page.goto('about:blank');await page.waitForTimeout(6000);await page.goto(url);await boot();if(await key('close-drawer').isVisible())await key('close-drawer').click();await note('05-after-real-away',true);
  }
  if(!(await snap()).state.craftAuto)await key('craft-auto').click();
  let n=0;
  while(!(await snap()).view.project.canComplete){await page.waitForTimeout(1000);if(!(await snap()).view.project.canComplete){await key('craft').click();n++;}if(n===12||n===24)await note(`${id}-${n}-clicks`,id==='rabbit');if(n>55)throw Error('Unbounded crafting loop');}
  await note(`${id}-complete`,true);await key('craft').click();await note(`${id}-placed`,id==='kot-cat');
  console.log(JSON.stringify({id,clicks:n,elapsedMs:Date.now()-began}));
 }
 await key('tab-projects').click();await note('projects-after-four',true);
 report.result='COMPLETED';
}catch(e){report.result='ERROR';report.error=e.stack;throw e;}
finally{await writeFile(path.join(folder,'browser-observation.json'),JSON.stringify(report,null,2)+'\n');await browser.close();}
