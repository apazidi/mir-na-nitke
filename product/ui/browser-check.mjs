import {fileURLToPath,pathToFileURL} from 'node:url';
import {startServer} from '../scripts/serve-preview.mjs';
import {mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE?pathToFileURL(process.env.PLAYWRIGHT_MODULE).href:'playwright');
const server=await startServer(4175);const browser=await chromium.launch({...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{}),headless:true});
try{await mkdir(new URL('./review/',import.meta.url),{recursive:true});
 for(const [width,height]of [[360,800],[390,844],[430,932]]){const page=await browser.newPage({viewport:{width,height}});const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:4175/product/ui/?mode=art-review');await page.getByRole('button',{name:'Начать',exact:true}).first().click();await page.getByRole('button',{name:'Вязать',exact:true}).click({clickCount:10,delay:30});await page.getByRole('button',{name:'Завершить',exact:true}).click();await page.getByRole('button',{name:'Полянка',exact:true}).click();await page.getByRole('button',{name:'Разместить',exact:true}).first().click();await page.getByRole('button',{name:'Погладить',exact:true}).click();await page.screenshot({path:fileURLToPath(new URL(`./review/meadow-${width}.png`,import.meta.url)),fullPage:true});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.equal(errors.length,0);assert.equal(await page.locator('img').evaluateAll(xs=>xs.every(x=>x.complete&&x.naturalWidth>0)),true);
 await page.getByRole('button',{name:'Мастерская',exact:true}).click();await page.getByRole('button',{name:'Начать',exact:true}).nth(1).click();await page.screenshot({path:fileURLToPath(new URL(`./review/workshop-${width}.png`,import.meta.url)),fullPage:true});await page.close();}
 console.log('Browser loop, art loading and geometry pass at 360/390/430.');
}finally{await browser.close();server.close();}
