// Observations use ordinary input. The runtime inspection API has no setters.
import {mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {startServer} from '../../scripts/serve-preview.mjs';
export async function inspect({name='director',width=390,height=844,effect,record=false},run){
 const {chromium}=await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
 const out=fileURLToPath(new URL(`./evidence/${name}/`,import.meta.url));await mkdir(out,{recursive:true});
 const server=process.env.PREVIEW_URL?null:await startServer(0);
 const url=new URL(process.env.PREVIEW_URL??`http://127.0.0.1:${server.address().port}${process.env.LOCAL_PREVIEW_PATH??'/product/research/stage-magic-v1/prototype/'}`);
 if(process.env.PREVIEW_URL&&url.protocol!=='https:')throw Error('External preview must use HTTPS');
 if(effect)url.searchParams.set('effect',effect);
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
 const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,...(record?{recordVideo:{dir:out,size:{width,height}}}:{})});
 const page=await context.newPage(),errors=[],observations=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
 const snapshot=()=>page.evaluate(()=>window.__stageStudy.snapshot());
 const points=()=>page.evaluate(()=>window.__stageStudy.points());
 async function capture(label){const item={label,state:await snapshot(),points:await points()};observations.push(item);await page.screenshot({path:`${out}/${label}.png`});return item;}
 try{await page.goto(url.href);await page.waitForFunction(()=>document.documentElement.dataset.ready==='true');await run({page,context,out,url:url.href,snapshot,points,capture,errors,observations});}
 finally{await writeFile(`${out}/observations.json`,JSON.stringify({url:url.href,width,height,errors,observations},null,2)+'\n');await context.close();await browser.close();if(server)await new Promise(r=>server.close(r));}
}
