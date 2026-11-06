import {mkdir,writeFile} from 'node:fs/promises';import {fileURLToPath} from 'node:url';import {startServer} from '../../../../scripts/serve-preview.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE.startsWith('file:')?process.env.PLAYWRIGHT_MODULE:(await import('node:url')).pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
const out=fileURLToPath(new URL('.',import.meta.url));await mkdir(out,{recursive:true});const records=[],errors=[],events=[];
const server=await startServer(0),browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
try{
 const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,recordVideo:{dir:out,size:{width:390,height:844}}}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));const clock=performance.now();
 const mark=name=>events.push({name,seconds:(performance.now()-clock)/1000});
 await page.goto(`http://127.0.0.1:${server.address().port}/product/research/craft-material-v1/prototype/`);await page.waitForFunction(()=>document.documentElement.dataset.ready==='true');mark('ready');
 const snapshot=()=>page.evaluate(()=>window.__craftStudy.snapshot()),points=()=>page.evaluate(()=>{const {endpoints,...p}=window.__craftStudy.points();return p;});
 async function snap(name){await page.screenshot({path:`${out}/${name}.png`});const record={name,state:await snapshot(),points:await points()};records.push(record);return record.state;}
 const p=await points(),at=(x,y)=>({x:p.center.x+x*p.scale+p.gripOffset.x,y:p.center.y+y*p.scale+p.gripOffset.y});
 async function pass(name,x0,y0,x1,y1,steps=40){const a=at(x0,y0),b=at(x1,y1);await page.mouse.move(a.x,a.y);await page.mouse.down();mark(`${name}-start`);for(let i=1;i<=steps;i++){await page.mouse.move(a.x+(b.x-a.x)*i/steps,a.y+(b.y-a.y)*i/steps);await page.waitForTimeout(28);}await page.mouse.up();mark(`${name}-end`);await page.waitForTimeout(1050);return snap(name);}
 const start=await snap('00-start');await page.waitForTimeout(450);
 const shallow=await pass('01-shallow',-.88,-1.35,-.88,1.35,54);
 const deep=await pass('02-deep',-.47,-1.35,-.47,1.35,54);
 const repeated=await pass('03-deep-repeat',-.47,-1.35,-.47,1.35,54);
 await page.locator('#undo').click();const undone=await snap('04-undo-deep');mark('undo-deep');
 const top=await pass('05-top',-1.35,-.72,1.35,-.72,54);
 const topRepeat=await pass('06-top-repeat',-1.35,-.72,1.35,-.72,54);
 await page.locator('#finish').click();const done=await snap('07-finished');await page.reload();await page.waitForFunction(()=>document.documentElement.dataset.ready==='true');const reloaded=await snap('08-reloaded');
 await page.locator('#finish').click();await page.locator('#reset').click();await snap('09-touch-start');
 const cdp=await context.newCDPSession(page),a=at(.88,-1.25),b=at(.88,1.25);mark('touch-start');await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...a,id:1,radiusX:12,radiusY:12,force:1}]});const held=await snapshot();await page.waitForTimeout(600);const still=await snapshot();
 for(let i=1;i<=48;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:a.x+(b.x-a.x)*i/48,y:a.y+(b.y-a.y)*i/48,id:1,radiusX:12,radiusY:12,force:1}]});await page.waitForTimeout(30);}
 await page.waitForFunction(({x,y})=>{const h=window.__craftStudy.points().handle;return Math.hypot(h.x-x,h.y-y)<1;},b);const beforeRelease=await snapshot();await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(1000);const touch=await snap('10-touch-released');mark('touch-end');await page.locator('#undo').click();const touchUndo=await snap('11-touch-undone');
 const same=(a,b)=>JSON.stringify(a.lengths)===JSON.stringify(b.lengths),checks={deepRepeatExact:same(deep,repeated),undoToShallow:same(undone,shallow),topRepeatExact:same(top,topRepeat),finishExact:same(top,done),reloadExact:same(done,reloaded),heldStillExact:same(held,still),releaseExact:same(beforeRelease,touch),touchUndoToFresh:touchUndo.changedFibers===0};
 console.log(JSON.stringify({checks,errors,records:records.length,events}));await writeFile(`${out}/checks.json`,JSON.stringify({checks,errors,events},null,2));const video=page.video();await page.close();await context.close();await video.saveAs(`${out}/process.webm`);
}finally{await writeFile(`${out}/observations.json`,JSON.stringify({runtime:'8017c0c9d87809b37d010ef92245d1b4f7c5d867',records,errors,events},null,2));await browser.close();await new Promise(r=>server.close(r));}
