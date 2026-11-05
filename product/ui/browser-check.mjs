import {fileURLToPath,pathToFileURL} from 'node:url';
import {startServer} from '../scripts/serve-preview.mjs';
import {mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE?pathToFileURL(process.env.PLAYWRIGHT_MODULE).href:'playwright');
const server=await startServer(4175), browser=await chromium.launch({...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{}),headless:true});
const mode=process.env.ART_REVIEW_ROOT?'art-review':'development';
try {
 await mkdir(new URL('./review/',import.meta.url),{recursive:true});
 for(const [width,height]of [[360,800],[390,844],[430,932]]) {
  const page=await browser.newPage({viewport:{width,height}}), errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  const shot=name=>page.screenshot({path:fileURLToPath(new URL(`./review/${name}-${width}.png`,import.meta.url)),fullPage:true});
  await page.goto(`http://127.0.0.1:4175/product/ui/?mode=${mode}`);
  await page.getByRole('button',{name:'Начать',exact:true}).first().click();
  if(width===390)await shot('stage-000');
  for(let i=1;i<=10;i++){
   await page.getByRole('button',{name:'Вязать',exact:true}).click();
   if(width===390&&[3,5,8,10].includes(i))await shot('stage-'+({3:'025',5:'050',8:'075',10:'100'})[i]);
  }
  await page.getByRole('button',{name:'Завершить',exact:true}).click();
  await page.getByRole('button',{name:'Полянка',exact:true}).click();
  await page.getByRole('button',{name:'Разместить',exact:true}).first().click();
  await page.getByRole('button',{name:'Погладить',exact:true}).click();await shot('meadow');
  await page.getByRole('button',{name:'Мастерская',exact:true}).click();
  await page.locator('.project-row').filter({hasText:'Цветок'}).getByRole('button',{name:'Начать',exact:true}).click();await shot('workshop');
  await page.getByRole('button',{name:'Вязать',exact:true}).click({clickCount:10,delay:25});
  await page.getByRole('button',{name:'Завершить',exact:true}).click();
  await page.getByRole('button',{name:'Полянка',exact:true}).click();
  await page.locator('.project-row').filter({hasText:'Цветок'}).getByRole('button',{name:'Разместить',exact:true}).click();
  const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('mir-na-nitke-development-v1')));
  await page.waitForTimeout(11000);
  const after=await page.evaluate(()=>JSON.parse(localStorage.getItem('mir-na-nitke-development-v1')));
  assert.ok(after.cooldowns['test-meadow/sniff']>before.cooldowns['test-meadow/sniff']);assert.ok(after.wallet.yarn>before.wallet.yarn+3);
  await page.getByRole('button',{name:'Вечер',exact:true}).click();await shot('evening');
  await page.reload();
  await page.getByRole('button',{name:'Полянка',exact:true}).click();assert.equal(await page.locator('.placed-object').count(),2);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.equal(errors.length,0);assert.equal(await page.locator('img').evaluateAll(xs=>xs.every(x=>x.complete&&x.naturalWidth>0)),true);
  await page.close();
 }
 console.log('Complete browser loop, save/reload persistence, automatic sniff, art loading and geometry pass at 360/390/430.');
} finally {await browser.close();server.close();}
