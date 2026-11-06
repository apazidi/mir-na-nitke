/** Shared actual-UI journey. Controlled time accelerates waiting only; no wallet/unlock grants. */
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {setTimeout as realDelay} from 'node:timers/promises';
import {gameplayCatalog,LEGACY_SAVE_KEY} from './gameplay-catalog.mjs';
export async function exercisePlayer(page,{url,evidenceDir,width,height,saveKey='mir-na-nitke-gameplay-preview-v3',clock=true}){
 const {config}=gameplayCatalog(),startTime=Date.now();await mkdir(evidenceDir,{recursive:true});
 if(clock){await page.clock.install({time:new Date('2026-11-06T10:00:00Z')});await page.clock.pauseAt(new Date('2026-11-06T10:00:01Z'));}
 const advance=async ms=>{if(clock)await page.clock.fastForward(ms);else await page.waitForTimeout(ms);};
 const key=name=>page.locator('[data-focus-key="'+name+'"]');
 const read=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),saveKey);
 const close=async()=>{if(await key('close-drawer').isVisible())await key('close-drawer').click();};
 const shot=async name=>{
  await page.locator('img').evaluateAll(images=>Promise.all(images.map(image=>image.decode())));
  assert.equal(await page.locator('.notice').count(),0,'No missing art or save warning');
  const geometry=await page.evaluate(()=>({width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,scrollHeight:document.documentElement.scrollHeight,world:document.querySelector('.meadow-scene').getBoundingClientRect().toJSON()}));
  assert.equal(geometry.scrollWidth,width);assert.equal(geometry.scrollHeight,height);assert.ok(geometry.world.width>=width*.94);assert.ok(geometry.world.height>=height*.65);
  await page.screenshot({path:path.join(evidenceDir,'v3-'+name+'-'+width+'.png'),fullPage:false});
 };
 await page.goto(url);await page.locator('[data-gameplay="v3"]').waitFor();const gameplayUrl=page.url();await close();
 const go=async id=>{await close();await key('scene-chooser').click();await key('scene-'+id).click();};
 const workshop=async id=>{if(id)await go(id);await key('tab-workshop').click();};
 const projects=async()=>{if(!await key('close-drawer').isVisible())await key('tab-projects').click();};
 await shot('empty-workshop');await key('scene-chooser').click();assert.equal(await key('scene-kotoutro').isDisabled(),true);await close();
 await key('open-upgrades').click();assert.match(await page.locator('.project-drawer').innerText(),/3 с → 6 с/);await close();
 const report={width,height,timeAcceleration:clock?'Playwright controlled clock; UI commands only':'real time',firstProjectMs:null,unlockedAtMs:null,duckVisitAtMs:null,rabbitVisitAtMs:null,allTenAtMs:null,importVerified:false};
 const initialTime=(await read()).lastTimestamp;
 async function help(){
  const state=await read();
  for(const m of config.meadows){if(!Object.keys(state.placements[m.id]??{}).length)continue;await go(m.id);
   for(const r of m.interactions.filter(r=>r.trigger==='manual')){const current=await read();if((current.cooldowns[m.id+'/'+r.id]??Infinity)>current.lastTimestamp)continue;const target=key('object-'+r.actorSlot);if(await target.count())await target.click();}
  }
 }
 async function afford(cost){for(let attempts=0;(await read()).wallet.yarn<cost;attempts++){assert.ok(attempts<500,'Income wait bound');await help();await advance(5000);}}
 async function craft(id,{midShot=false}={}){
  const item=config.items.find(i=>i.id===id);await afford(item.yarnCost);await workshop(item.meadowId);await projects();await key('start-'+id).click();
  if(midShot){
   const source=await page.locator('.workshop-item').getAttribute('src');await key('craft-art').click();
   assert.equal(await page.locator('.workshop-item').getAttribute('src'),source,'Click feedback before the next stage');assert.equal(await page.locator('.new-stitch').count(),1);assert.equal(await page.locator('.stitch-pulse').count(),1);
   const before=await page.locator('.yarn-glint').evaluate(n=>getComputedStyle(n).strokeDashoffset);await realDelay(180);const after=await page.locator('.yarn-glint').evaluate(n=>getComputedStyle(n).strokeDashoffset);assert.notEqual(after,before,'Yarn flows between stages in real animation time');await shot('workshop-stitch-'+id);
  }
  for(let clicks=0;await key('craft').getAttribute('aria-label')!=='Завершить';clicks++){
   assert.ok(clicks<300,'Craft bound');await advance(1000);if(await key('craft').getAttribute('aria-label')==='Завершить')break;await key('craft').click();
   if(midShot&&clicks===5)await shot('workshop-mid-'+id);
  }
  await key('craft').click();assert.equal(await page.locator('#view-meadow').count(),1);assert.equal(await page.locator('.art-navigation-action').count(),0);await key('next-place').click();assert.ok((await read()).owned.includes(id));console.log(width+' placed '+id);
 }
 await craft('rabbit',{midShot:true});report.firstProjectMs=(await read()).lastTimestamp-initialTime;
 const rabbit=key('object-rabbit'),beforePet=(await read()).wallet.yarn;await rabbit.click();assert.ok((await read()).wallet.yarn>=beforePet+.69);assert.equal(await page.locator('.object-reacting[data-action="pet"]').count(),1);
 await craft('flower');await craft('tree');report.unlockedAtMs=(await read()).lastTimestamp-initialTime;
 await key('scene-chooser').click();assert.equal(await key('scene-kotoutro').isEnabled(),true);await key('scene-kotoutro').click();await shot('kotoutro-empty');
 for(const id of ['kot-cat','kot-coffee','kot-duck'])await craft(id,{midShot:id==='kot-cat'});
 let state=await read();await advance(Math.max(0,state.events['duck-visit'].dueAt-state.lastTimestamp)+1100);await go('test-meadow');
 assert.equal(await page.locator('[data-visitor="duck-visit"]').count(),1);report.duckVisitAtMs=(await read()).lastTimestamp-initialTime;await shot('duck-visit');await go('kotoutro');assert.equal(await key('object-kot-duck').count(),0,'Traveller is absent from home');assert.equal((await read()).placements.kotoutro['kot-duck'],'kot-duck');
 for(const id of ['house','butterfly'])await craft(id,{midShot:id==='house'});
 async function recipe(id){const r=config.recipes.find(r=>r.id===id);await afford(r.yarnCost);await workshop(r.meadowId);await projects();await key('recipe-'+id).click();for(let n=0;(await key('craft').getAttribute('aria-label'))!=='Завершить';n++){assert.ok(n<300);await advance(1000);if((await key('craft').getAttribute('aria-label'))!=='Завершить')await key('craft').click();}await key('craft').click();}
 for(const id of ['kot-chair','kot-leaf-house'])await craft(id);report.allTenAtMs=(await read()).lastTimestamp-initialTime;assert.equal((await read()).owned.length,10);
 await recipe('invitation');state=await read();await advance(state.events['rabbit-visit'].dueAt-state.lastTimestamp+1100);await go('kotoutro');assert.equal(await page.locator('[data-visitor="rabbit-visit"]').count(),1);report.rabbitVisitAtMs=(await read()).lastTimestamp-initialTime;await shot('rabbit-visit');await go('test-meadow');assert.equal(await key('object-rabbit').count(),0,'Rabbit does not duplicate at home');
 await recipe('picnic-gift');state=await read();await advance(state.events['friendship-picnic'].dueAt-state.lastTimestamp+1100);assert.equal((await read()).memories['friendship-picnic'].count,1);
 assert.equal((await read()).events['rabbit-visit'].phase,'visiting','Two earned activities overlap for the same guest');
 assert.equal(await page.locator('.visitor[data-item="rabbit"]').count(),1,'Overlapping activities must show one rabbit');
 await advance(7*60*1000);await go('test-meadow');await workshop();await key('open-upgrades').click();const prior=(await read()).upgrades.hook??0;await key('upgrade-hook').click();assert.equal((await read()).upgrades.hook,prior+1);await close();
 for(const id of ['test-meadow','kotoutro']){await go(id);if(await key('lighting').textContent()==='День')await key('lighting').click();await advance(4000);await shot(id+'-day');await key('lighting').click();await shot(id+'-evening');assert.equal(await page.locator('.placed-object:not(.visitor)').count(),5);}
 const earned=await page.evaluate(key=>localStorage.getItem(key),saveKey);await writeFile(path.join(evidenceDir,'earned-ten-save-'+width+'.json'),earned);
 // A real eight-hour return advances work/production/memories once, then reload proves no second credit.
 const beforeAway=await read();if(clock){await page.goto('about:blank');await page.clock.fastForward(8*3600000);await page.goto(gameplayUrl);await page.locator('[data-gameplay="v3"]').waitFor();assert.equal(await page.getByRole('dialog',{name:'Пока вас не было'}).count(),1);await shot('return');await close();const afterAway=await read();assert.ok(afterAway.wallet.yarn>beforeAway.wallet.yarn);assert.equal(afterAway.memories['friendship-picnic'].count,1);assert.equal(await page.locator('.visitor').count(),0);await page.reload();await page.locator('[data-gameplay="v3"]').waitFor();assert.equal((await read()).wallet.yarn,afterAway.wallet.yarn);}
 if(width===390){
  const earnedReturn=await page.evaluate(key=>localStorage.getItem(key),saveKey),uiReturn=await page.evaluate(key=>localStorage.getItem(key+'-ui'),saveKey);
  const legacyUrl=new URL(gameplayUrl);legacyUrl.searchParams.delete('gameplay');await page.goto(legacyUrl.href);await page.getByRole('button',{name:'Начать',exact:true}).click();await page.getByRole('button',{name:'Вязать',exact:true}).click();
  const legacyRaw=await page.evaluate(key=>localStorage.getItem(key),LEGACY_SAVE_KEY),legacy=JSON.parse(legacyRaw);
  await page.evaluate(key=>{localStorage.removeItem(key);localStorage.removeItem(key+'-ui');},saveKey);await page.goto(gameplayUrl);await page.locator('[data-gameplay="v3"]').waitFor();await close();const imported=await read();
  assert.equal(await page.evaluate(key=>localStorage.getItem(key),LEGACY_SAVE_KEY),legacyRaw);assert.deepEqual(imported.owned,legacy.owned);assert.deepEqual(imported.placements,legacy.placements);assert.ok(Math.abs(imported.project.work/48-legacy.project.work/40)<1e-9);assert.equal(imported.wallet.yarn,legacy.wallet.yarn);report.importVerified=true;
  // Leave the imported session before restoring an earned checkpoint: pagehide
  // legitimately persists its live state and must not overwrite the test restore.
  await page.goto(legacyUrl.href);
  await page.evaluate(({key,raw,ui})=>{localStorage.setItem(key,raw);if(ui)localStorage.setItem(key+'-ui',ui);},{key:saveKey,raw:earnedReturn,ui:uiReturn});await page.goto(gameplayUrl);await page.locator('[data-gameplay="v3"]').waitFor();await close();
  assert.equal(await page.evaluate(key=>localStorage.getItem(key),LEGACY_SAVE_KEY),legacyRaw);
 }
 await page.emulateMedia({reducedMotion:'reduce'});await workshop();await key('tab-projects').click();await key('close-drawer').focus();await page.keyboard.press('Shift+Tab');assert.equal(await page.evaluate(()=>Boolean(document.activeElement.closest('.project-drawer'))),true);await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>document.activeElement.dataset.focusKey),'tab-projects');
 report.wallMs=Date.now()-startTime;report.finalOwned=(await read()).owned.length;assert.equal(report.finalOwned,10);
 await writeFile(path.join(evidenceDir,'v3-player-'+width+'.json'),JSON.stringify(report,null,2));return report;
}
