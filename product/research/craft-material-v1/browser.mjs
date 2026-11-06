// Shared observation harness. All product changes must come from normal UI input.
import {mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {startServer} from '../../scripts/serve-preview.mjs';

export async function inspect({name='director',width=390,height=844,record=false},run){
 const {chromium}=await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
 const out=fileURLToPath(new URL(`./evidence/${name}/`,import.meta.url));await mkdir(out,{recursive:true});
 const server=process.env.PREVIEW_URL?null:await startServer(0);
 const url=process.env.PREVIEW_URL??`http://127.0.0.1:${server.address().port}${process.env.LOCAL_PREVIEW_PATH??'/product/research/craft-material-v1/prototype/'}`;
 if(process.env.PREVIEW_URL&&new URL(url).protocol!=='https:')throw Error('External delivery must use HTTPS');
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
 const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,...(record?{recordVideo:{dir:out,size:{width,height}}}:{})});
 const page=await context.newPage(),errors=[],observations=[];
 page.on('pageerror',e=>errors.push(e.message));
 const snapshot=()=>page.evaluate(()=>window.__craftStudy.snapshot());
 const points=()=>page.evaluate(()=>window.__craftStudy.points());
 async function capture(label){
  const item={label,state:await snapshot(),points:await points()};observations.push(item);
  await page.screenshot({path:`${out}/${label}.png`});return item;
 }
 async function pass(label,path){
  await page.mouse.move(path[0].x,path[0].y);await page.mouse.down();
  for(let i=1;i<path.length;i++){
   await page.mouse.move(path[i].x,path[i].y,{steps:5});await page.waitForTimeout(45);
   if(i===1||i===path.length-1)await capture(`${label}-held-${i}`);
  }
  await page.mouse.up();await page.waitForTimeout(180);return capture(`${label}-released`);
 }
 try{
  await page.goto(url);await page.waitForFunction(()=>window.__craftStudy&&document.documentElement.dataset.ready==='true');
  await run({page,context,out,url,errors,observations,snapshot,points,capture,pass});
 }finally{
  await writeFile(`${out}/observations.json`,JSON.stringify({viewport:{width,height},errors,observations,limits:'Normal browser UI input and frame observations. No physical-phone or human-enjoyment claim.'},null,2));
  await context.close();await browser.close();if(server)await new Promise(r=>server.close(r));
 }
}
