// Resolve the first-paws pacing question without auto-test pauses. Ordinary fresh UI.
import {mkdir,writeFile} from 'node:fs/promises';import {fileURLToPath,pathToFileURL} from 'node:url';import {startServer} from '../../../../scripts/serve-preview.mjs';
const {chromium}=await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
const out=fileURLToPath(new URL('./rabbit-start/',import.meta.url));await mkdir(out,{recursive:true});
const server=await startServer(0),browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
const context=await browser.newContext({viewport:{width:390,height:844},recordVideo:{dir:out,size:{width:390,height:844}}}),page=await context.newPage(),records=[];
const key=n=>page.locator(`[data-focus-key="${n}"]`);const start=performance.now();
try{await page.goto(`http://127.0.0.1:${server.address().port}/play-preview/`);await page.waitForFunction(()=>window.__stagedGameplay&&document.querySelector('.meadow-scene'));await key('next-project').click();await page.waitForFunction(()=>window.__stagedGameplay.snapshot().craft.ready);
 for(let n=1;n<=12;n++){const at=performance.now();await key('craft').click();await page.waitForTimeout(720);const s=await page.evaluate(()=>window.__stagedGameplay.snapshot());records.push({click:n,t:(performance.now()-start)/1000,work:s.state.project.work,craft:s.craft});if([1,3,6,9,12].includes(n))await page.screenshot({path:`${out}/click-${String(n).padStart(2,'0')}.png`});await page.waitForTimeout(Math.max(0,1000-(performance.now()-at)));}
 const video=page.video();await page.close();await context.close();await video.saveAs(`${out}/process.webm`);
}finally{await writeFile(`${out}/observations.json`,JSON.stringify({runtime:'5cc9ef5af302908a4fce816134708bae31e97911',clock:'Real time, ~1 click/s, auto off, no scripted pauses',records},null,2));await browser.close();await new Promise(r=>server.close(r));}
