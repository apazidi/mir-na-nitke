import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createSession} from '../app/ui/session.mjs';
import {developmentCatalog} from './dev-catalog.mjs';
import * as core from '../app/core/index.mjs';
import {gameplayCatalog} from './gameplay-catalog.mjs';
const {config}=developmentCatalog();
test('player crafts, places, pets, enables automatic sniff, saves and reloads',()=>{
 let now=1000,raw;const storage={getItem:()=>raw,setItem:(_,v)=>raw=v};const session=createSession(config,{storage,now:()=>now});
 const craftPlace=itemId=>{assert.equal(session.act({type:'startProject',itemId}),true);for(let i=0;i<10;i++)session.act({type:'click'});assert.equal(session.view.project.canComplete,true);session.act({type:'completeCraft'});assert.equal(session.act({type:'placeItem',meadowId:'test-meadow',slotId:itemId}),true);};
 craftPlace('rabbit');assert.equal(session.view.projects.find(p=>p.itemId==='flower').canStart,false);
 const before=session.state.wallet.yarn;assert.equal(session.act({type:'pet',meadowId:'test-meadow',interactionId:'pet'}),true);assert.equal(session.state.wallet.yarn,before+2);assert.equal(session.view.projects.find(p=>p.itemId==='flower').canStart,true);craftPlace('flower');
 const due=session.state.cooldowns['test-meadow/sniff'];now=due;session.tick();assert.ok(session.state.wallet.yarn>=before+3);assert.ok(session.state.cooldowns['test-meadow/sniff']>due);
 assert.deepEqual(createSession(config,{storage,now:()=>now}).state,session.state);
});
test('rejected command commits elapsed idle work and income exactly once',()=>{let now=0;const session=createSession(config,{now:()=>now});session.act({type:'startProject',itemId:'rabbit'});now=10000;assert.equal(session.act({type:'completeCraft'}),false);assert.equal(session.state.project.work,10);const yarn=session.state.wallet.yarn;session.tick();assert.equal(session.state.wallet.yarn,yarn);});
test('broken or incompatible storage preserves original save and permits temporary play',()=>{let writes=0;const notices=[];const session=createSession(config,{storage:{getItem:()=>'{bad',setItem:()=>writes++},now:()=>0,onNotice:t=>notices.push(t)});assert.equal(session.act({type:'startProject',itemId:'rabbit'}),true);assert.equal(writes,0);assert.ok(notices.length);assert.doesNotThrow(()=>createSession(config,{storage:{getItem:()=>null,setItem:()=>{throw Error('quota');}},now:()=>0}).tick());});
test('fixture remains separate from release with exactly five empty slots',()=>{assert.equal(config.meadows[0].slots.length,5);assert.equal(createSession(config,{now:()=>0}).view.meadows[0].slots.filter(s=>s.placed).length,0);});
test('draft flower art requires explicit art-review opt-in and remains fixture-only',()=>{
 const ordinary=developmentCatalog(false,true);assert.ok(ordinary.catalog.items[1].art.finishedSprite.startsWith('data:'));
 const defaultArt=developmentCatalog(true);assert.ok(defaultArt.catalog.items[1].art.finishedSprite.startsWith('data:'));
 const review=developmentCatalog(true,true);assert.deepEqual(review.catalog.items[1].art.stages.map(s=>s.at),[0,.3,.6,1]);assert.match(review.catalog.items[1].art.finishedSprite,/meadow-flower\/art\/finished.webp$/);assert.equal(review.catalog.items[1].id,'flower');assert.equal(review.catalog.items[1].status,undefined);
});

test('scene-v2 art and button assets stay behind the explicit art review opt-in',()=>{
 const ordinary=developmentCatalog(false,true,true), rabbitOnly=developmentCatalog(true,true);
 assert.equal(ordinary.buttonArt,null);assert.equal(rabbitOnly.buttonArt,null);
 assert.ok(ordinary.catalog.items[2].art.finishedSprite.startsWith('data:'));
 assert.ok(rabbitOnly.catalog.items[2].art.finishedSprite.startsWith('data:'));
 const review=developmentCatalog(true,true,true);
 assert.equal(Object.keys(review.buttonArt).length,8);
 for(const item of review.catalog.items.slice(2)){
  assert.equal(item.art.stages.length,4);assert.equal(item.art.stages[0].at,0);assert.equal(item.art.stages.at(-1).at,1);
  assert.ok(item.art.finishedSprite.startsWith('./art-experiments/scene-v2/'));assert.equal(item.status,undefined);
 }
 assert.equal(createSession(review.config,{now:()=>0}).view.meadows[0].slots.filter(slot=>slot.placed).length,0);
});

// Earn a rich v3 world through public commands: no owned/wallet/event injection.
function earnedWorld(legacyConfig){
 let state=core.createInitialState(legacyConfig,0);
 const act=action=>state=core.dispatch(state,{...action,now:state.lastTimestamp},legacyConfig);
 const wait=ms=>state=core.advanceTime(state,state.lastTimestamp+ms,legacyConfig);
 const afford=price=>{while(state.wallet.yarn<price)wait(legacyConfig.maxOfflineMs);};
 for(const item of legacyConfig.items){
  afford(item.yarnCost);act({type:'startProject',itemId:item.id});
  wait(item.workUnits/legacyConfig.idleWorkPerSecond*1000);act({type:'completeCraft'});
  const meadow=legacyConfig.meadows.find(m=>m.slots.some(s=>s.itemId===item.id));
  act({type:'placeItem',meadowId:meadow.id,slotId:meadow.slots.find(s=>s.itemId===item.id).id});
 }
 for(const upgradeId of ['hook','basket']){afford(core.selectView(state,legacyConfig).upgrades.find(u=>u.id===upgradeId).cost);act({type:'buyUpgrade',upgradeId});}
 afford(6);act({type:'startRecipe',recipeId:'invitation'});wait(80000);act({type:'completeCraft'});wait(60000);
 afford(18);act({type:'startRecipe',recipeId:'picnic-gift'});act({type:'click'});
 return state;
}

test('config-import retains a full v3 world and paid recipe, settles old rates once and never rewrites its raw key',()=>{
 const legacyConfig=gameplayCatalog(false).config,source=earnedWorld(legacyConfig);
 delete source.craftAuto; // genuine v3 saves did not yet persist this field
 const raw=core.serializeState(source),config=structuredClone(legacyConfig);
 config.defaultCraftAuto=false;config.recraftableIds=['rabbit','flower','tree','kot-cat'];
 config.initialYarn=32;config.clickWork=2.8;config.idleWorkPerSecond=1;
 config.upgrades[0].amount=.35;config.upgrades[1].amount=.08;
 config.items.forEach(item=>item.workUnits=144.2);config.recipes.find(r=>r.id==='picnic-gift').workUnits=240;
 let now=source.lastTimestamp+20000;const store=new Map([['old-v3',raw]]),writes=[];
 const storage={getItem:key=>store.get(key),setItem:(key,value)=>{writes.push(key);store.set(key,value);}};
 const options={storage,key:'new-v4',legacyKey:'old-v3',legacyConfig,legacyMigration:'config',now:()=>now};
 const expected=core.advanceTime(source,now,legacyConfig),session=createSession(config,options);
 assert.equal(session.imported,true);assert.equal(session.state.craftAuto,true);
 for(const field of ['wallet','owned','placements','upgrades','events','memories','cooldowns','transactionSequence','lastTimestamp'])assert.deepEqual(session.state[field],expected[field],field);
 assert.equal(session.state.owned.length,10);assert.equal(session.state.project.recipeId,'picnic-gift');
 assert.equal(session.state.project.work,expected.project.work/180*240);
 assert.equal(session.state.accrual.elapsedMs,0);assert.equal(session.state.accrual.baseYarn,expected.wallet.yarn);
 const report=session.takeAwayReport();assert.equal(report.elapsedMs,20000);assert.equal(report.yarn,expected.wallet.yarn-source.wallet.yarn);
 assert.equal(report.work,(expected.project.work-source.project.work)*240/180);assert.equal(session.takeAwayReport(),null);
 assert.equal(store.get('old-v3'),raw);assert.ok(writes.every(key=>key==='new-v4'));
 const reloaded=createSession(config,options);assert.equal(reloaded.imported,false);assert.deepEqual(reloaded.state,session.state);assert.equal(reloaded.takeAwayReport(),null);
 now+=1000;reloaded.tick();assert.equal(reloaded.state.project.work,session.state.project.work+1.08);
 assert.equal(reloaded.act({type:'setCraftAuto',enabled:false}),true);const paused=reloaded.state.project.work;
 now+=20000;const pausedReload=createSession(config,options);assert.equal(pausedReload.state.project.work,paused);assert.equal(pausedReload.state.craftAuto,false);
 assert.equal(store.get('old-v3'),raw);
});

test('config-import never replaces any present new key, including empty or incompatible saves',()=>{
 const legacyConfig=gameplayCatalog(false).config,raw=core.serializeState(core.createInitialState(legacyConfig,0));
 const config={...legacyConfig,defaultCraftAuto:false};
 const valid=core.serializeState(core.createInitialState(config,0));
 for(const existing of ['', '{bad', '{}', valid]){
  const store=new Map([['old-v3',raw],['new-v4',existing]]),reads=[],writes=[],notices=[];
  const storage={getItem:key=>{reads.push(key);return store.get(key);},setItem:(key,value)=>{writes.push(key);store.set(key,value);}};
  const session=createSession(config,{storage,key:'new-v4',legacyKey:'old-v3',legacyConfig,legacyMigration:'config',now:()=>0,onNotice:text=>notices.push(text)});
  assert.equal(session.imported,false);assert.ok(!reads.includes('old-v3'));assert.equal(store.get('old-v3'),raw);
  if(existing!==valid){assert.ok(notices.length);session.act({type:'startProject',itemId:'rabbit'});assert.deepEqual(writes,[]);assert.equal(store.get('new-v4'),existing);}
  else{assert.deepEqual(notices,[]);assert.equal(session.state.craftAuto,false);}
 }
});

test('rejected repeat cancellation commits time once without cancelling paid work; paused reload is stable',()=>{
 const config={...developmentCatalog().config,defaultCraftAuto:false,recraftableIds:['rabbit']};
 let now=0;const store=new Map(),storage={getItem:key=>store.get(key),setItem:(key,value)=>store.set(key,value)};
 const session=createSession(config,{storage,now:()=>now});session.act({type:'startProject',itemId:'rabbit'});session.act({type:'click'});
 const work=session.state.project.work;now=20000;
 assert.equal(session.act({type:'cancelRecraft'}),false);assert.equal(session.state.project.itemId,'rabbit');assert.equal(session.state.project.work,work);
 const wallet=session.state.wallet.yarn;session.tick();assert.equal(session.state.wallet.yarn,wallet);
 const loaded=createSession(config,{storage,now:()=>now});assert.deepEqual(loaded.state,session.state);
 loaded.act({type:'setCraftAuto',enabled:true});now+=1000;loaded.tick();assert.equal(loaded.state.project.work,work+config.idleWorkPerSecond);
});

test('failed config-import preserves both keys and does not present an uncommitted away reward',()=>{
 const legacyConfig=gameplayCatalog(false).config;let source=earnedWorld(legacyConfig);
 source=core.dispatch(source,{type:'buyUpgrade',upgradeId:'hook',now:source.lastTimestamp},legacyConfig);
 const raw=core.serializeState(source),config=structuredClone(legacyConfig);config.upgrades[0].maxLevel=1;
 const store=new Map([['old-v3',raw]]),writes=[],notices=[];
 const session=createSession(config,{key:'new-v4',legacyKey:'old-v3',legacyConfig,legacyMigration:'config',now:()=>source.lastTimestamp+20000,
  storage:{getItem:key=>store.get(key),setItem:(key,value)=>{writes.push(key);store.set(key,value);}},onNotice:text=>notices.push(text)});
 assert.equal(session.imported,false);assert.equal(session.takeAwayReport(),null);assert.ok(notices.length);
 session.act({type:'startProject',itemId:'rabbit'});assert.deepEqual(writes,[]);assert.equal(store.get('old-v3'),raw);assert.equal(store.has('new-v4'),false);
});
