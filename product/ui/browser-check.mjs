import {fileURLToPath,pathToFileURL} from 'node:url';
import {startServer} from '../scripts/serve-preview.mjs';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE?pathToFileURL(process.env.PLAYWRIGHT_MODULE).href:'playwright');
const server=await startServer(4175),browser=await chromium.launch({...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{}),headless:true});
const mode=process.env.ART_REVIEW_ROOT?'art-review':'development';
const flowerReview=mode==='art-review'&&Boolean(process.env.FLOWER_REVIEW_ROOT);
const saveKey=mode==='art-review'?'mir-na-nitke-art-preview-v2':'mir-na-nitke-development-v1';
const evidence=[];
try{
 await mkdir(new URL('./review/',import.meta.url),{recursive:true});
 for(const [width,height]of [[360,800],[390,844],[430,932]]){
  const page=await browser.newPage({viewport:{width,height}}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  const readSave=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),saveKey);
  const shot=async name=>{
   await page.locator('img').evaluateAll(images=>Promise.all(images.map(image=>image.decode())));
   await page.screenshot({path:fileURLToPath(new URL('./review/world-first-'+name+'-'+width+'.png',import.meta.url)),fullPage:false});
  };
  const geometry=async name=>{
   const result=await page.evaluate(()=>{
    const world=document.querySelector('.meadow-scene').getBoundingClientRect();
    const buttons=[...document.querySelectorAll('button')].filter(node=>!node.closest('.project-drawer')&&!node.classList.contains('drawer-shade')).map(node=>{
     const rect=node.getBoundingClientRect();return {label:node.textContent||node.querySelector('img')?.alt,width:rect.width,height:rect.height,bottom:rect.bottom,left:rect.left,right:rect.right,sprite:node.classList.contains('placed-object')};
    });
    return {worldHeight:world.height/innerHeight,worldWidth:world.width/innerWidth,worldTop:world.top,overflow:document.documentElement.scrollWidth>innerWidth,pageHeight:document.documentElement.scrollHeight,viewportHeight:innerHeight,buttons};
   });
   assert.ok(result.worldHeight>=.65);assert.ok(result.worldWidth>=.94);assert.equal(result.overflow,false);
   assert.ok(result.pageHeight<=height+1,'Main game must fit in one viewport');
   for(const target of result.buttons){assert.ok(target.width>=44&&target.height>=44,target.label+' touch target');if(!target.sprite)assert.ok(target.left>=0&&target.right<=width&&target.bottom<=height,target.label+' inside viewport');}
   evidence.push({width,height,name,...result});
  };
  await page.goto('http://127.0.0.1:4175/product/ui/?mode='+mode+(flowerReview?'&flower=review':''));
  await page.getByRole('button',{name:'Начать',exact:true}).click();
  assert.equal(await page.locator('.placed-object').count(),0);
  if(width===390)await shot('rabbit-stage-000');
  for(let i=1;i<=10;i++){
   if(await page.getByRole('button',{name:'Вязать',exact:true}).count())await page.getByRole('button',{name:'Вязать',exact:true}).click();
   if(width===390&&[3,5,8].includes(i))await shot('rabbit-stage-'+({3:'025',5:'050',8:'075'})[i]);
  }
  await page.getByRole('button',{name:'Завершить',exact:true}).waitFor();
  await page.waitForTimeout(3500);
  await shot('workshop-day');await geometry('workshop-day');
  await page.getByRole('button',{name:'Вечер',exact:true}).click();
  await shot('workshop-evening');await geometry('workshop-evening');
  await page.getByRole('button',{name:'День',exact:true}).click();
  await page.getByRole('button',{name:'Завершить',exact:true}).click();
  assert.equal(await page.locator('[data-feedback-kind="complete"]').count(),1);
  await page.getByRole('button',{name:'Полянка',exact:true}).click();
  await page.getByRole('button',{name:'Разместить',exact:true}).click();
  const beforePet=await readSave();
  await page.getByRole('button',{name:'Кролик',exact:true}).click();
  assert.ok((await readSave()).wallet.yarn>=beforePet.wallet.yarn+2);
  assert.equal(await page.locator('[data-feedback-kind="pet"]').count(),1);
  assert.equal(await page.locator('[data-slot="rabbit"].reacting').count(),1);
  await page.waitForTimeout(3600);
  assert.equal(await page.locator('[data-feedback-kind="pet"]').evaluateAll(nodes=>nodes.every(node=>Number(getComputedStyle(node).opacity)===0)),true);
  await page.getByRole('button',{name:'Мастерская',exact:true}).click();
  assert.match(await page.locator('.action-hint').textContent(),/нюхать цветок/);
  await page.getByRole('button',{name:'Проекты',exact:true}).click();
  await page.locator('.project-row').filter({hasText:'Цветок'}).getByRole('button',{name:'Начать',exact:true}).click();
  if(width===390)await shot('flower-stage-00');
  for(let i=1;i<=10;i++){
   if(await page.getByRole('button',{name:'Вязать',exact:true}).count())await page.getByRole('button',{name:'Вязать',exact:true}).click();
   if(width===390&&[3,6,10].includes(i))await shot('flower-stage-0'+({3:1,6:2,10:3})[i]);
  }
  await page.getByRole('button',{name:'Завершить',exact:true}).click();
  await page.getByRole('button',{name:'Полянка',exact:true}).click();
  await page.getByRole('button',{name:'Разместить',exact:true}).click();
  await page.getByRole('button',{name:'Цветок',exact:true}).click();
  assert.equal(await page.locator('[data-feedback-kind="hello"]').count(),1);
  await page.waitForTimeout(3600);
  await shot('meadow-day');await geometry('meadow-day');
  const beforeSniff=await readSave();
  await page.locator('[data-feedback-kind="sniff"]').waitFor({timeout:14000});
  assert.equal(await page.locator('.flower-scent').count(),1);
  assert.equal(await page.locator('.reacting').count(),2);
  assert.ok((await readSave()).wallet.yarn>=beforeSniff.wallet.yarn+3);
  if(width===390)await shot('sniff');
  await page.getByRole('button',{name:'Вечер',exact:true}).click();
  await page.waitForTimeout(3500);
  await shot('meadow-evening');await geometry('meadow-evening');
  await page.getByRole('button',{name:'Проекты',exact:true}).click();
  if(width===390)await shot('projects');
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('.project-drawer').count(),0);
  await page.reload();await page.getByRole('button',{name:'Полянка',exact:true}).click();
  assert.equal(await page.locator('.placed-object').count(),2);
  assert.equal(errors.length,0,errors.join('\n'));
  assert.equal(await page.locator('img').evaluateAll(images=>images.every(image=>image.complete&&image.naturalWidth>0)),true);
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.getByRole('button',{name:'Цветок',exact:true}).click();
  assert.equal(await page.locator('[data-slot="flower"] img').evaluate(node=>getComputedStyle(node).animationName),'none');
  await page.close();
 }
 await writeFile(new URL('./review/world-first-geometry.json',import.meta.url),JSON.stringify(evidence,null,2)+'\n');
 console.log('PASS: complete loop, direct rabbit/flower feedback, automatic sniff, save/reload, reduced motion, 44px targets, one-screen world geometry, and all 12 day/evening/workshop/meadow views at 360/390/430.');
}finally{await browser.close();server.close();}
