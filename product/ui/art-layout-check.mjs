/** Focused scene-v2 control/layout inspection before the complete art pack is integrated. */
import {pathToFileURL,fileURLToPath} from 'node:url';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {startServer} from '../scripts/serve-preview.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE?pathToFileURL(process.env.PLAYWRIGHT_MODULE).href:'playwright');
if(!process.env.SCENE_REVIEW_ROOT)throw Error('Set SCENE_REVIEW_ROOT to the scene-v2 experiment directory');
const server=await startServer(4177),browser=await chromium.launch({...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{}),headless:true});
try{
 const page=await browser.newPage({viewport:{width:390,height:844}});
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.route('**/product/art-experiments/scene-v2/**',async route=>{
  const tail=new URL(route.request().url()).pathname.split('/scene-v2/')[1];
  if(!/^(ui|exports)\/[a-z0-9-]+\.webp$/.test(tail))return route.abort();
  const body=await readFile(path.join(process.env.SCENE_REVIEW_ROOT,tail));
  await route.fulfill({status:200,contentType:'image/webp',body});
 });
 const shot=async name=>{
  await page.locator('img').evaluateAll(images=>Promise.all(images.map(image=>image.decode())));
  await page.screenshot({path:fileURLToPath(new URL('./review/scene-v2-'+name+'-390.png',import.meta.url)),fullPage:false});
 };
 await page.goto('http://127.0.0.1:4177/product/ui/?mode=art-review&flower=review&scene=v2');
 await page.getByRole('button',{name:'Начать',exact:true}).click();
 const knit=page.getByRole('button',{name:'Вязать',exact:true});
 const rect=await knit.boundingBox();
 await page.mouse.move(rect.x+rect.width/2,rect.y+rect.height/2);await page.mouse.down();
 assert.match(await knit.locator('img').getAttribute('src'),/knit-pressed\.webp$/);await page.mouse.up();
 for(let i=0;i<9;i++)if(await page.getByRole('button',{name:'Вязать',exact:true}).count())await page.getByRole('button',{name:'Вязать',exact:true}).click();
 await page.waitForTimeout(3500);await shot('workshop-day');
 await page.getByRole('button',{name:'Завершить',exact:true}).click();
 await page.getByRole('button',{name:'Полянка',exact:true}).click();
 await page.getByRole('button',{name:'Разместить',exact:true}).click();
 await page.getByRole('button',{name:'Кролик',exact:true}).click();
 assert.match(await page.getByRole('button',{name:'Погладить',exact:true}).locator('img').getAttribute('src'),/pet-disabled\.webp$/);
 await page.getByRole('button',{name:'Мастерская',exact:true}).click();
 await page.getByRole('button',{name:'Начать',exact:true}).click();
 for(let i=0;i<10;i++)if(await page.getByRole('button',{name:'Вязать',exact:true}).count())await page.getByRole('button',{name:'Вязать',exact:true}).click();
 await page.getByRole('button',{name:'Завершить',exact:true}).click();
 await page.getByRole('button',{name:'Полянка',exact:true}).click();
 await page.getByRole('button',{name:'Разместить',exact:true}).click();
 await page.waitForTimeout(3500);await shot('meadow-day');
 await page.getByRole('button',{name:'Вечер',exact:true}).click();await shot('meadow-evening');
  await page.getByRole('button',{name:'День',exact:true}).click();
 for(const [item,cost] of [['Дерево',11],['Домик',14],['Бабочка',17]]){
  const wallet=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('mir-na-nitke-art-preview-v2')).wallet.yarn);
  const deadline=Date.now()+90000;
  while(await wallet()<cost){
   assert.ok(Date.now()<deadline,'Earned yarn timed out for '+item);
   const pet=page.getByRole('button',{name:'Погладить',exact:true});
   if(await pet.isEnabled())await pet.click();
   await page.waitForTimeout(1000);
  }
  await page.getByRole('button',{name:'Мастерская',exact:true}).click();
  await page.getByRole('button',{name:'Проекты',exact:true}).click();
  await page.locator('.project-row').filter({hasText:item}).getByRole('button',{name:'Начать',exact:true}).click();
  for(let i=0;i<20;i++)if(await page.getByRole('button',{name:'Вязать',exact:true}).count())await page.getByRole('button',{name:'Вязать',exact:true}).click();
  await page.getByRole('button',{name:'Завершить',exact:true}).click();
  await page.getByRole('button',{name:'Полянка',exact:true}).click();
  await page.getByRole('button',{name:'Разместить',exact:true}).click();
 }
 await page.waitForTimeout(6000);await shot('full-five-day');
 await page.getByRole('button',{name:'Вечер',exact:true}).click();await shot('full-five-evening');
 assert.equal(await page.locator('.placed-object').count(),5);
 assert.equal(errors.length,0,errors.join('\n'));
 for(const button of await page.locator('.art-button').evaluateAll(nodes=>nodes.map(node=>({label:node.getAttribute('aria-label'),width:node.getBoundingClientRect().width,height:node.getBoundingClientRect().height}))))assert.ok(button.width>=44&&button.height>=44,button.label);
 console.log('PASS: scene-v2 actual image-button states, accessible names, five earned items, day/evening and exact390×844 layout screenshots.');
}finally{await browser.close();server.close();}
