import {mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {startServer} from '../../../../scripts/serve-preview.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE.startsWith('file:')?process.env.PLAYWRIGHT_MODULE:(await import('node:url')).pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
const out=fileURLToPath(new URL('.',import.meta.url));await mkdir(out,{recursive:true});
const records=[],errors=[],timings=[];const server=await startServer(0),browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
try{
 const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,deviceScaleFactor:1}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`http://127.0.0.1:${server.address().port}/product/research/craft-material-v1/prototype/`);await page.waitForFunction(()=>document.documentElement.dataset.ready==='true');
 const snapshot=()=>page.evaluate(()=>window.__craftStudy.snapshot());
 const points=()=>page.evaluate(()=>{const {endpoints,...p}=window.__craftStudy.points();return p;});
 async function snap(name,pointer=null){const p=await points(),state=await snapshot();records.push({name,pointer,state,points:p});await page.screenshot({path:`${out}/${name}.png`});return state;}
 function at(p,x,y){return{x:p.center.x+x*p.scale+p.gripOffset.x,y:p.center.y+y*p.scale+p.gripOffset.y};}
 async function mousePass(name,x0,y0,x1,y1,steps=24){const p=await points(),a=at(p,x0,y0),b=at(p,x1,y1);await page.mouse.move(a.x,a.y);await page.mouse.down();const started=performance.now();for(let i=1;i<=steps;i++){const hand={x:a.x+(b.x-a.x)*i/steps,y:a.y+(b.y-a.y)*i/steps};await page.mouse.move(hand.x,hand.y);if([4,12,20].includes(i))await snap(`${name}-held-${i}`,hand);}timings.push({name,withScreenshotsMs:performance.now()-started});await page.mouse.up();await page.waitForTimeout(1000);return snap(`${name}-released`);}
 const initial=await snap('00-start');
 await mousePass('01-left',-.88,-.45,-.88,.45);
 const afterLeft=await snapshot();await mousePass('02-deep',-.47,-.76,-.47,.76,32);
 const deep=await snapshot();await page.locator('#undo').click();const undone=await snap('03-undo');
 await page.locator('#finish').click();const finished=await snap('04-finished');await page.reload();await page.waitForFunction(()=>document.documentElement.dataset.ready==='true');const reloaded=await snap('05-reloaded');
 await page.locator('#finish').click();await mousePass('06-top',-.76,-.72,.76,-.72,32);await page.locator('#finish').click();await snap('07-second-profile');
 await page.locator('#reset').click();await snap('08-touch-start');
 const cdp=await context.newCDPSession(page);let p=await points(),a=at(p,.84,-.48),b=at(p,.84,.48);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:a.x,y:a.y,id:1,radiusX:12,radiusY:12,force:1}]});const beforeHold=await snapshot();await page.waitForTimeout(600);const afterHold=await snapshot();await snap('09-touch-held-still',a);
 for(let i=1;i<=24;i++){const hand={x:a.x+(b.x-a.x)*i/24,y:a.y+(b.y-a.y)*i/24};await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...hand,id:1,radiusX:12,radiusY:12,force:1}]});if([8,16,24].includes(i))await snap(`10-touch-cut-${i}`,hand);}
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(1000);await snap('11-touch-released');
 await page.locator('#undo').click();await snap('12-touch-undone');
 const checks={undoExact:JSON.stringify(undone.lengths)===JSON.stringify(afterLeft.lengths),finishExact:JSON.stringify(finished.lengths)===JSON.stringify(afterLeft.lengths),reloadExact:JSON.stringify(reloaded.lengths)===JSON.stringify(afterLeft.lengths),holdExact:JSON.stringify(beforeHold.lengths)===JSON.stringify(afterHold.lengths),initialChanged:initial.changedFibers,deepChanged:deep.changedFibers};
 console.log(JSON.stringify({checks,errors,records:records.length}));await writeFile(`${out}/checks.json`,JSON.stringify({checks,errors,timings},null,2));await context.close();
}finally{await writeFile(`${out}/observations.json`,JSON.stringify({runtime:'b2cafa0cfcf58a136919d41f059bc4b4ef6939e9',records,errors,timings},null,2));await browser.close();await new Promise(r=>server.close(r));}
