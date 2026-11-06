// Diagnostic import of an existing old-UI save. This is not a fresh player path.
import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {startServer} from '../../../../scripts/serve-preview.mjs';
const {chromium}=await import(pathToFileURL('C:/Users/Apazidi/OneDrive/Документы/ChatGPT/Мир на нитке/release-preview/product/.browser-tools/node_modules/playwright/index.mjs').href);
const raw=await readFile(new URL('../../../../preview-evidence/earned-ten-save-390.json',import.meta.url),'utf8');
const saved=JSON.parse(raw),server=await startServer(0),errors=[];
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const context=await browser.newContext({viewport:{width:430,height:932},deviceScaleFactor:1});
const page=await context.newPage();
page.on('pageerror',error=>errors.push(error.message));
try{
 await page.clock.setFixedTime(new Date(saved.lastTimestamp));
 await page.addInitScript(raw=>{if(/^https?:$/.test(location.protocol)&&!localStorage.getItem('mir-na-nitke-gameplay-preview-v3'))localStorage.setItem('mir-na-nitke-gameplay-preview-v3',raw);},raw);
 await page.goto(`http://127.0.0.1:${server.address().port}/play-preview/`);
 await page.waitForFunction(()=>Boolean(window.__stagedGameplay));
 await page.locator('.meadow-scene').waitFor();
 const key=name=>page.locator('[data-focus-key="'+name+'"]');
 if(await key('close-drawer').isVisible())await key('close-drawer').click();
 const states=[];
 for(const id of ['test-meadow','kotoutro']){
  await key('scene-chooser').click();await key('scene-'+id).click();
  await page.locator('img').evaluateAll(images=>Promise.all(images.map(i=>i.decode())));
  await page.waitForTimeout(900);
  await page.screenshot({path:fileURLToPath(new URL(`./imported-${id}-430.png`,import.meta.url))});
  states.push(await page.evaluate(()=>window.__stagedGameplay.snapshot()));
 }
 await writeFile(new URL('./imported-430-observation.json',import.meta.url),JSON.stringify({runtime:'e2b1376',viewport:[430,932],source:'product/preview-evidence/earned-ten-save-390.json',method:'Isolated old-save import; fixed Date at saved timestamp for diagnostic layout; ordinary UI scene switching; no gameplay claims',errors,states},null,2));
 if(errors.length)throw Error(errors.join('\n'));
 console.log('Two imported-world430 screenshots captured; no page errors.');
}finally{await context.close();await browser.close();await new Promise(resolve=>server.close(resolve));}
