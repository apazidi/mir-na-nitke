/** Fresh game journey through public UI. No grants, model setters or clock acceleration. */
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const boot=page=>page.waitForFunction(()=>Boolean(window.__stagedGameplay&&document.querySelector('.meadow-scene')));
export async function exerciseStagedPlayer(page,{url,evidenceDir,width,height}){
 await mkdir(evidenceDir,{recursive:true});
 const key=name=>page.locator('[data-focus-key="'+name+'"]');
 const snapshot=()=>page.evaluate(()=>window.__stagedGameplay.snapshot());
 const close=async()=>{if(await key('close-drawer').isVisible())await key('close-drawer').click();};
 const shot=async name=>{
  await page.locator('img').evaluateAll(images=>Promise.all(images.map(image=>image.decode())));
  assert.equal(await page.locator('.notice').count(),0,'No missing art or save warning');
  const size=await page.evaluate(()=>({w:document.documentElement.scrollWidth,h:document.documentElement.scrollHeight}));
  assert.deepEqual(size,{w:width,h:height},'One viewport without overflow');
  assert.equal(await page.locator('.working-yarn').count(),0,'The rejected snake is absent from v4');
  await page.screenshot({path:path.join(evidenceDir,`v4-${name}-${width}.png`),fullPage:false});
 };
 const ready=()=>page.waitForFunction(()=>window.__stagedGameplay?.snapshot().craft.ready===true);
 await page.goto(url);await boot(page);await close();
 assert.match(await page.locator('meta[name="robots"]').getAttribute('content'),/noindex/);
 let initial=await snapshot();assert.equal(initial.state.craftAuto,false);assert.equal(initial.state.owned.length,0);assert.ok(initial.state.wallet.yarn>=32&&initial.state.wallet.yarn<33);
 await shot('empty-workshop');
 const report={width,height,clock:'Real browser time; public UI commands; no economy grants',projects:[],repeatVerified:false,autoPauseVerified:false};
 const start=async id=>{
  await close();assert.equal(await key('next-project').isVisible(),true,'The next paid project is directly offered in context');await key('next-project').click();await ready();
  assert.equal((await snapshot()).state.project.itemId,id);
  const bounds=await page.evaluate(()=>window.__stagedGameplay.points().item);
  assert.ok(bounds.width<=170.1&&bounds.height<=230.1,'Moderate whole-object fit');
 };
 async function finish(id,{first=false}={}){
  const before=await snapshot();let clicks=0;
  if(first){
   await key('craft').focus();await page.keyboard.press('Space');clicks++;
   const clicked=await snapshot();assert.ok(clicked.state.project.work>before.state.project.work,'Keyboard contributes actual work');
   assert.equal(clicked.state.craftAuto,false);
   await page.waitForTimeout(1200);assert.equal((await snapshot()).state.project.work,clicked.state.project.work,'Auto starts paused');
   await page.reload();await boot(page);await close();await ready();
   assert.equal((await snapshot()).state.project.work,clicked.state.project.work,'Paused work survives reload');
   await key('craft-auto').click();await page.waitForTimeout(2200);
   const automatic=await snapshot();assert.ok(automatic.state.project.work>=clicked.state.project.work+1.5);
   await page.goto('about:blank');await page.waitForTimeout(1700);await page.goto(url);
   await boot(page);await close();await ready();
   assert.ok((await snapshot()).state.project.work>=automatic.state.project.work+1.5,'Enabled auto continues the paid project while away');
   await key('craft-auto').click();const paused=await snapshot();await page.waitForTimeout(1200);
   assert.equal((await snapshot()).state.project.work,paused.state.project.work);
   report.autoPauseVerified=true;
  }
  while(!(await snapshot()).view.project.canComplete){
   assert.ok(clicks<60,'The base-rate project is bounded at 52 manual clicks');
   await key(clicks===13?'craft-art':'craft').click();clicks++;
   if(clicks===12||clicks===28){await page.waitForTimeout(120);await shot(id+'-'+clicks);}
  }
  await ready();await shot(id+'-finished');
  assert.equal((await snapshot()).craft.sectionIndex,6,'All six sections remain visible before placement');
  // The selected final UI may use one-step completion+placement, or an explicit retained final.
  if(await key('next-place').isVisible())await key('next-place').click();else await key('craft').click();
  let complete=await snapshot();
  if(!Object.values(complete.state.placements).some(slots=>Object.values(slots).includes(id))){
   assert.equal(await key('next-place').isVisible(),true,'A completed item has an explicit placement action');
   await key('next-place').click();complete=await snapshot();
  }
  assert.ok(complete.state.owned.includes(id));
  assert.ok(Object.values(complete.state.placements).some(slots=>Object.values(slots).includes(id)));
  await shot(id+'-placed');report.projects.push({id,manualClicks:clicks,yarn:complete.state.wallet.yarn});
 }
 for(const id of ['rabbit','flower','tree']){await start(id);await finish(id,{first:id==='rabbit'});}
 await key('scene-chooser').click();assert.equal(await key('scene-kotoutro').isEnabled(),true);await key('scene-kotoutro').click();await shot('pond-empty');
 await start('kot-cat');await finish('kot-cat');
 const earned=await snapshot();assert.equal(earned.state.owned.length,4);
 await key('lighting').click();await shot('pond-evening');await key('lighting').click();
 // Repeating is explicitly free practice, with no duplicate object or production reward.
 await key('tab-projects').click();await key('repeat-kot-cat').click();await ready();
 let repeated=await snapshot();assert.equal(repeated.state.project.recraft,true);assert.equal(repeated.state.project.itemId,'kot-cat');
 assert.deepEqual(repeated.state.owned,earned.state.owned);assert.deepEqual(repeated.state.placements,earned.state.placements);
 assert.ok(repeated.state.wallet.yarn>=earned.state.wallet.yarn,'Repeat never charges yarn');
 await key('craft').click();await key('cancel-recraft').click();assert.equal((await snapshot()).state.project,null);
 await key('tab-projects').click();await key('repeat-kot-cat').click();await ready();
 for(let n=0;!(await snapshot()).view.project.canComplete;n++){assert.ok(n<53);await key('craft').click();}
 const preFinish=await snapshot();await shot('repeat-finished');await key('craft').click();
 const postFinish=await snapshot();assert.equal(postFinish.state.project,null);
 assert.deepEqual(postFinish.state.owned,earned.state.owned);assert.deepEqual(postFinish.state.placements,earned.state.placements);
 assert.ok(postFinish.state.wallet.yarn-preFinish.state.wallet.yarn<1,'Repeat finish adds no reward');report.repeatVerified=true;
 await page.reload();await boot(page);await close();
 assert.deepEqual((await snapshot()).state.placements,earned.state.placements);
 await page.emulateMedia({reducedMotion:'reduce'});await key('tab-projects').click();await key('close-drawer').focus();await page.keyboard.press('Shift+Tab');
 assert.equal(await page.evaluate(()=>Boolean(document.activeElement.closest('.project-drawer'))),true,'Drawer traps focus');
 await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>document.activeElement.dataset.focusKey),'tab-projects');
 report.finalOwned=(await snapshot()).state.owned.length;
 await writeFile(path.join(evidenceDir,`v4-player-${width}.json`),JSON.stringify(report,null,2)+'\n');
 console.log(`Staged game ${width}: four paid projects, real unlock, auto pause, reload and free repeat verified.`);
 return report;
}

/** Separate technical fixture: rich old save and an already-paid legacy recipe. */
export async function exerciseStagedMigration(page,{url,evidenceDir}){
 const core=await import('../../app/core/index.mjs');
 const {gameplayCatalog,GAMEPLAY_SAVE_KEY}=await import('../../ui/gameplay-catalog.mjs');
 const {stagedCatalog,STAGED_SAVE_KEY}=await import('../../ui/staged-catalog.mjs');
 const old=gameplayCatalog(true).config,target=stagedCatalog().config;
 const now=Date.parse('2026-11-07T08:00:00Z');
 // The extra wallet is fixture setup only, never used for the fresh UI journey.
 let source=core.createInitialState({...old,initialYarn:100000},now-1000);
 const act=(type,fields={})=>{source=core.dispatch(source,{type,...fields,now:source.lastTimestamp},old);};
 for(const id of ['rabbit','flower','tree','house','butterfly','kot-cat','kot-coffee','kot-duck','kot-chair','kot-leaf-house']){
  act('startProject',{itemId:id});
  const item=old.items.find(i=>i.id===id);
  while(source.project.work<item.workUnits)act('click');
  act('completeCraft');act('placeItem',{meadowId:item.meadowId,slotId:id});
 }
 for(const upgradeId of ['hook','basket'])for(let n=0;n<10;n++)act('buyUpgrade',{upgradeId});
 act('startRecipe',{recipeId:'invitation'});act('click');
 const rawState=JSON.parse(core.serializeState(source));delete rawState.craftAuto;
 const raw=JSON.stringify(rawState);
 // Fix Date for exact economy assertions, while keeping rAF and image layout live.
 await page.clock.setFixedTime(new Date(now));
 await page.addInitScript(({oldKey,newKey,raw})=>{
  if(!/^https?:$/.test(location.protocol))return;
  if(localStorage.getItem(oldKey)===null)localStorage.setItem(oldKey,raw);
 },{oldKey:GAMEPLAY_SAVE_KEY,newKey:STAGED_SAVE_KEY,raw});
 await page.goto(url);await boot(page);
 const key=name=>page.locator('[data-focus-key="'+name+'"]');
 const snapshot=()=>page.evaluate(()=>window.__stagedGameplay.snapshot());
 const imported=await snapshot(),expected=core.migrateConfigState(core.deserializeState(raw,old),old,target,now);
 assert.deepEqual(imported.state,expected,'Browser imports rich old save exactly once at old rates');
 assert.equal(imported.state.craftAuto,true,'An old always-on save keeps auto on visibly');
 assert.equal(await page.evaluate(key=>localStorage.getItem(key),GAMEPLAY_SAVE_KEY),raw);
 if(await key('close-drawer').isVisible())await key('close-drawer').click();
 for(const meadowId of ['test-meadow','kotoutro']){
  await key('scene-chooser').click();await key('scene-'+meadowId).click();
  await page.locator('img').evaluateAll(images=>Promise.all(images.map(image=>image.decode())));
  await page.waitForTimeout(150);
  assert.equal(await page.locator('.placed-object:not(.visitor)').count(),5,'Imported full meadow retains all residents');
  await page.screenshot({path:path.join(evidenceDir,`v4-imported-full-${meadowId}-390.png`),fullPage:false});
 }
 await key('tab-workshop').click();
 assert.equal(await page.locator('.working-yarn').count(),0,'Legacy recipe fallback does not resurrect the rejected animation');
 assert.equal(await key('craft-auto').isVisible(),true);
 await key('tab-projects').click();
 for(const id of ['rabbit','flower','tree','kot-cat'])if(await key('repeat-'+id).count())assert.equal(await key('repeat-'+id).isDisabled(),true,'Paid work cannot be replaced by a repeat');
 await key('close-drawer').click();
 for(let n=0;!(await snapshot()).view.project.canComplete;n++){assert.ok(n<10);await key('craft').click();}
 await key('craft').click();assert.equal((await snapshot()).state.project,null);
 assert.equal((await snapshot()).state.events['rabbit-visit'].phase,'waiting','Old paid recipe still starts the real visit');
 const completed=await snapshot();await page.reload();await boot(page);
 assert.deepEqual((await snapshot()).state,completed.state,'Reload does not pay or finish again');
 assert.equal(await page.evaluate(key=>localStorage.getItem(key),GAMEPLAY_SAVE_KEY),raw,'Old raw save remains intact');
 await writeFile(path.join(evidenceDir,'v4-migration.json'),JSON.stringify({result:'PASS',fixture:'Technical old v3 full world, maximum upgrades, active paid invitation and missing historical craftAuto; fixed clock only for migration assertions',sourceYarn:source.wallet.yarn,importedYarn:imported.state.wallet.yarn,sourceWork:source.project.work,importedWork:imported.state.project.work,owned:imported.state.owned.length,oldRawUnchanged:true},null,2)+'\n');
}

// Focused rerun after v4 repairs. CI still calls both legacy and v4 journeys via check:preview.
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const {chromium}=await import(process.env.PLAYWRIGHT_MODULE?pathToFileURL(process.env.PLAYWRIGHT_MODULE).href:'playwright');
 let server,browser;
 try{
  if(!process.env.PREVIEW_URL){const {startServer}=await import('../../scripts/serve-preview.mjs');server=await startServer(0);}
  const url=process.env.PREVIEW_URL??`http://127.0.0.1:${server.address().port}/play-preview/`;
  if(process.env.PREVIEW_URL)assert.equal(new URL(url).protocol,'https:');
  const evidenceDir=fileURLToPath(new URL('../../preview-evidence/',import.meta.url));
  browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
  for(const [width,height] of [[360,800],[390,844],[430,932]]){
   const context=await browser.newContext({viewport:{width,height},hasTouch:true}),page=await context.newPage(),errors=[];
   page.on('pageerror',error=>errors.push(error.message));
   page.on('response',response=>{if(response.status()>=400)errors.push(response.status()+' '+response.url());});
   page.on('request',request=>{if(/^https?:/.test(request.url())&&!request.url().startsWith(url))errors.push('Outside bundle: '+request.url());});
   try{await exerciseStagedPlayer(page,{url,evidenceDir,width,height});assert.deepEqual(errors,[]);}finally{await context.close();}
   if(width===390){const migrationContext=await browser.newContext({viewport:{width,height}});try{const migrationPage=await migrationContext.newPage();migrationPage.on('pageerror',error=>errors.push(error.message));await exerciseStagedMigration(migrationPage,{url,evidenceDir});assert.deepEqual(errors,[]);}finally{await migrationContext.close();}}
  }
 }finally{await browser?.close();if(server)await new Promise(resolve=>server.close(resolve));}
}
