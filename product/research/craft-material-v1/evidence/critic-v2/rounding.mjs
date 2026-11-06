import {writeFile} from 'node:fs/promises';import {fileURLToPath} from 'node:url';import {startServer} from '../../../../scripts/serve-preview.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE.startsWith('file:')?process.env.PLAYWRIGHT_MODULE:(await import('node:url')).pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
const out=fileURLToPath(new URL('.',import.meta.url)),records=[];const server=await startServer(0),browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
try{const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage();await page.goto(`http://127.0.0.1:${server.address().port}/product/research/craft-material-v1/prototype/`);await page.waitForFunction(()=>document.documentElement.dataset.ready==='true');const p=await page.evaluate(()=>{const {endpoints,...p}=window.__craftStudy.points();return p;});const at=(x,y)=>({x:p.center.x+x*p.scale+p.gripOffset.x,y:p.center.y+y*p.scale+p.gripOffset.y});
 async function snap(name){await page.screenshot({path:`${out}/${name}.png`});records.push({name,state:await page.evaluate(()=>window.__craftStudy.snapshot())});}
 await snap('round-00-start');
 // A real drawn arc: shorten the visibly taller upper contour, preserving the lower half.
 let first=at(Math.cos(-Math.PI)*1.04,Math.sin(-Math.PI)*1.04);await page.mouse.move(first.x,first.y);await page.mouse.down();
 for(let i=1;i<=60;i++){const angle=-Math.PI+Math.PI*i/60,hand=at(Math.cos(angle)*1.04,Math.sin(angle)*1.04);await page.mouse.move(hand.x,hand.y);await page.waitForTimeout(20);}
 await page.mouse.up();await page.waitForTimeout(1050);await snap('round-01-upper-refined');
 await page.locator('#finish').click();await snap('round-02-finished');
 await context.close();console.log(JSON.stringify(records.map(r=>({name:r.name,changed:r.state.changedFibers,bounds:r.state.profileBounds}))));
}finally{await writeFile(`${out}/rounding.json`,JSON.stringify(records,null,2));await browser.close();await new Promise(r=>server.close(r));}
