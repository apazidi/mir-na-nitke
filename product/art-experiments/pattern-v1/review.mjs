import {mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {startServer} from '../../scripts/serve-preview.mjs';
const {chromium}=await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
const server=await startServer(0),browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});
try{const page=await browser.newPage({viewport:{width:1510,height:1500}});page.on('pageerror',e=>console.error(e));await page.goto(`http://127.0.0.1:${server.address().port}/product/art-experiments/pattern-v1/review.html`);await page.waitForFunction(()=>window.__artReviewReady);const dir=fileURLToPath(new URL('../../preview-evidence/pattern-art/',import.meta.url));await mkdir(dir,{recursive:true});await page.screenshot({path:dir+'contact-sheet.png',fullPage:true});await page.locator('.application').screenshot({path:dir+'rabbit-scarf.png'});await writeFile(dir+'report.json',JSON.stringify({contactSheet:'contact-sheet.png',rabbitOverlay:'rabbit-scarf.png',status:'draft; visual review required'}));console.log(dir);}finally{await browser.close();server.close();}
