import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as base from '../app/core/index.mjs';
import * as core from '../app/core/pattern.mjs';
import {createPatternSession} from '../app/ui/pattern-session.mjs';
import {patternCatalog} from './pattern-catalog.mjs';
import {stagedCatalog} from './staged-catalog.mjs';
import {restoreIntent} from './pattern-intent.mjs';
const config=patternCatalog().config,sourceConfig=stagedCatalog().config;
function source(){const s=base.createInitialState(sourceConfig,0);s.wallet.yarn=18722.7;s.accrual.baseYarn=s.wallet.yarn;s.owned=sourceConfig.items.map(i=>i.id);s.placements=Object.fromEntries(sourceConfig.meadows.map(m=>[m.id,Object.fromEntries(m.slots.map(p=>[p.id,p.itemId]))]));return base.dispatch(s,{type:"setCraftAuto",enabled:false,now:0},sourceConfig);}
const initial=()=>core.importState(JSON.stringify(source()),sourceConfig,config);
const act=(s,type,fields={})=>core.dispatch(s,{type,now:s.lastTimestamp,...fields},config);
const start=(s,target,method,jobId=target)=>act(s,'startPattern',{target,method,jobId});
function finish(s){while(!core.selectView(s,config).project.canComplete)s=act(s,'click');return act(s,'completePattern',{jobId:s.project.pattern.jobId});}
test('direct and permanently learned routes keep exact totals; capped clicks never carry',()=>{
 const seed=initial();let direct=seed;for(const target of core.ACCESSORIES){direct=start(direct,target,'direct');assert.equal(core.selectView(direct,config).project.remaining,144.2);direct=finish(direct);}
 assert.equal(direct.wallet.yarn,seed.wallet.yarn-12);assert.equal(direct.project,null);assert.throws(()=>start(direct,core.PATTERN_ID,'learn'));
 let learned=start(seed,core.PATTERN_ID,'learn');assert.ok(!learned.owned.includes(core.PATTERN_ID));learned=finish(learned);
 for(const target of core.ACCESSORIES){learned=start(learned,target,'learned');assert.equal(core.selectView(learned,config).project.remaining,100.94);learned=finish(learned);}
 assert.equal(learned.wallet.yarn,seed.wallet.yarn-14);assert.ok(learned.owned.includes(core.PATTERN_ID));assert.equal(60+2*100.94,261.88);assert.equal(2*144.2,288.4);
 assert.deepEqual(core.deserializeState(core.serializeState(learned),config),learned);
});
test('starts and completions are idempotent, conflicting IDs and mutated methods fail',()=>{
 const s=start(initial(),'rabbit-scarf','direct','one');assert.deepEqual(start(s,'rabbit-scarf','direct','one'),s);
 assert.throws(()=>start(s,'cat-doily','direct','one'));assert.throws(()=>start(s,'cat-doily','direct','two'));
 assert.throws(()=>act(s,'completeCraft'));assert.throws(()=>act(initial(),'startProject',{itemId:'rabbit-scarf'}));
 const done=finish(s);assert.deepEqual(act(done,'completePattern',{jobId:'one'}),done);assert.deepEqual(start(done,'rabbit-scarf','direct','one'),done);
 const forged=structuredClone(s);forged.project.pattern.method='learned';assert.throws(()=>core.deserializeState(JSON.stringify(forged),config));
});
test('refund only once at exact zero; elapsed auto work settles before cancellation',()=>{
 const seed=initial(),s=start(seed,'rabbit-scarf','direct','one'),cancel=act(s,'cancelPattern',{jobId:'one'});
 assert.equal(cancel.wallet.yarn,seed.wallet.yarn);assert.deepEqual(act(cancel,'cancelPattern',{jobId:'one'}),cancel);
 assert.throws(()=>act(act(s,'click'),'cancelPattern',{jobId:'one'}));
 const auto=act(s,'setCraftAuto',{enabled:true});assert.throws(()=>act(auto,'cancelPattern',{jobId:'one',now:1}));
 const stopped=act(auto,'setCraftAuto',{enabled:false,now:1});assert.ok(stopped.project.work>0);assert.equal(core.advanceTime(stopped,3600000,config).project.work,stopped.project.work);
});
test('pause/reload, reverse clock and capped 8h offline preserve method without automatic claim',()=>{
 let s=start(initial(),core.PATTERN_ID,'learn');s=act(s,'click');const reload=core.deserializeState(JSON.stringify(s),config);
 assert.equal(reload.craftAuto,false);assert.equal(core.advanceTime(reload,1e9,config).project.work,s.project.work);assert.deepEqual(core.advanceTime(core.advanceTime(reload,100,config),99,config),core.advanceTime(reload,100,config));
 s=act(reload,'setCraftAuto',{enabled:true});const a=core.advanceTime(s,config.maxOfflineMs,config),b=core.advanceTime(s,1e9,config);
 assert.equal(b.project.work,60);assert.ok(!b.owned.includes(core.PATTERN_ID));assert.equal(a.wallet.yarn,b.wallet.yarn);assert.equal(b.project.pattern.method,'learn');
});
function fixture(raw=JSON.stringify(source())){const values=new Map([['source',raw],['legacy','unchanged']]);let now=0,active=true,failure=null;const storage={getItem:k=>values.get(k)??null,setItem:(k,v)=>{if(failure?.(k,v))throw Error('quota');values.set(k,v);}};const open=()=>createPatternSession(config,{storage,key:'own',sourceKey:'source',sourceConfig,now:()=>now,isActive:()=>active});return {values,open,fail:f=>failure=f,clock:n=>now=n,revoke:()=>active=false};}
test('pattern restart backs up paid work, starts a persistent empty world and keeps source bytes',()=>{
 const f=fixture(),s=f.open(),raw=s.exportSource();
 assert.ok(s.act({type:'startPattern',target:'rabbit-scarf',method:'direct',jobId:'paid'}));s.act({type:'click'});
 const paid=structuredClone(s.state);assert.equal(s.canRestart,true);assert.equal(s.restart('restart'),true);
 assert.deepEqual(core.deserializeState(s.exportRestartBackup(),config),paid);
 assert.equal(s.state.wallet.yarn,32);assert.deepEqual(s.state.owned,[]);assert.equal(s.state.project,null);
 assert.deepEqual(f.open().state,s.state);assert.equal(s.restart('restart'),true);
 assert.deepEqual(core.deserializeState(s.exportRestartBackup(),config),paid);
 assert.equal(f.values.get('source'),raw);assert.equal(s.exportSource(),raw);assert.equal(f.values.get('legacy'),'unchanged');
 f.revoke();assert.equal(s.canRestart,false);assert.equal(s.restart('another'),false);
});
test('pattern restart failures keep the paid world live and reloadable',()=>{
 for(const key of ['own-restart-backup','own']){
  const f=fixture(),s=f.open();s.act({type:'startPattern',target:'rabbit-scarf',method:'direct',jobId:'paid'});
  const before=structuredClone(s.state),source=s.exportSource();f.fail(k=>k===key);
  assert.equal(s.restart('reset'),false);assert.deepEqual(s.state,before);
  assert.deepEqual(core.deserializeState(f.values.get('own'),config),before);
  f.fail(null);assert.deepEqual(f.open().state,before);assert.equal(s.exportSource(),source);
 }
});
test('failed UI writes cannot reconnect a pre-restart intention after unlocking again',()=>{
 const f=fixture(),s=f.open(),oldUI={patternIntent:'both'};f.values.set('own-ui',JSON.stringify(oldUI));
 assert.equal(restoreIntent(oldUI,s.state),'both');f.fail(k=>k==='own-ui');assert.ok(s.restart('new-world'));
 const id=s.state.patternWorldId;assert.ok(id);assert.equal(restoreIntent(oldUI,s.state),null);
 for(const itemId of ['rabbit','flower','tree','kot-cat']){
  f.clock(s.state.lastTimestamp+config.maxOfflineMs);s.tick();assert.ok(s.act({type:'startProject',itemId}));
  while(!s.view.project.canComplete)assert.ok(s.act({type:'click'}));assert.ok(s.act({type:'completeCraft'}));
  const m=config.meadows.find(m=>m.slots.some(p=>p.itemId===itemId)),slot=m.slots.find(p=>p.itemId===itemId);
  assert.ok(s.act({type:'placeItem',meadowId:m.id,slotId:slot.id}));
 }
 const reload=f.open();assert.equal(reload.view.pattern.unlocked,true);assert.equal(reload.state.patternWorldId,id);
 assert.equal(restoreIntent(JSON.parse(f.values.get('own-ui')),reload.state),null);
 assert.equal(restoreIntent({...oldUI,patternWorldId:id},reload.state),'both');
 assert.ok(reload.restart('second-world'));assert.notEqual(reload.state.patternWorldId,id);
 assert.equal(restoreIntent({...oldUI,patternWorldId:id},reload.state),null);
});
test('new import durably retires only an orphan intention before committing the world',()=>{
 const f=fixture();f.values.set('own-ui',JSON.stringify({patternIntent:'both',evening:true,selected:{'test-meadow':'rabbit'}}));
 const raw=f.values.get('source');f.open();
 assert.deepEqual(JSON.parse(f.values.get('own-ui')),{patternIntent:null,evening:true,selected:{'test-meadow':'rabbit'}});
 f.open();assert.equal(JSON.parse(f.values.get('own-ui')).patternIntent,null);
 assert.equal(f.values.get('source'),raw);
 // A real existing world's intention is preserved on resume.
 f.values.set('own-ui',JSON.stringify({patternIntent:'cat-doily'}));f.open();assert.equal(JSON.parse(f.values.get('own-ui')).patternIntent,'cat-doily');
});
test('failure to retire orphan UI cannot commit a new core save or source backup',()=>{
 const f=fixture();f.values.set('own-ui',JSON.stringify({patternIntent:'both'}));const before=[...f.values];
 f.fail(k=>k==='own-ui');assert.throws(()=>f.open());assert.deepEqual([...f.values],before);
 f.fail(null);f.open();assert.equal(JSON.parse(f.values.get('own-ui')).patternIntent,null);
});
test('protected import preserves legacy paid slot and source bytes; own resume ignores source changes',()=>{
 const src=source();
 const paid=base.dispatch(src,{type:'startRecipe',recipeId:'invitation',now:0},sourceConfig),raw=JSON.stringify(paid),f=fixture(raw),s=f.open();
 assert.deepEqual(s.state.project,paid.project);assert.equal(s.exportSource(),raw);assert.equal(f.values.get('source'),raw);assert.throws(()=>start(s.state,'rabbit-scarf','direct'));
 f.values.set('source','now corrupt');assert.deepEqual(f.open().state,s.state);assert.equal(f.values.get('legacy'),'unchanged');
});
test('corruption fails closed without writes; inactive writer cannot import',()=>{
 for(const key of ['source','own']){const f=fixture();f.values.set(key,'broken');const before=[...f.values];assert.throws(()=>f.open());assert.deepEqual([...f.values],before);}
 const f=fixture();f.revoke();assert.throws(()=>f.open());assert.ok(!f.values.has('own'));
});
test('failed atomic completion applies neither knowledge nor cosmetic; inactive session makes no writes',()=>{
 for(const target of [core.PATTERN_ID,'rabbit-scarf']){
  const f=fixture(),s=f.open();assert.ok(s.act({type:'startPattern',target,method:target===core.PATTERN_ID?'learn':'direct',jobId:'one'}));
  while(!s.view.project.canComplete)s.act({type:'click'});
  const raw=f.values.get('own');f.fail((k,v)=>k==='own'&&JSON.parse(v).owned.includes(target));
  assert.equal(s.act({type:'completePattern',jobId:'one'}),false);assert.equal(f.values.get('own'),raw);assert.ok(!s.state.owned.includes(target));assert.ok(s.state.project);
 }
 const f=fixture(),s=f.open(),before=[...f.values];f.revoke();assert.equal(s.act({type:'startPattern',target:'rabbit-scarf',method:'direct',jobId:'one'}),false);assert.deepEqual([...f.values],before);
});
