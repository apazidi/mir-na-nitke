import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as core from '../app/core/index.mjs';
import {createSession} from '../app/ui/session.mjs';
import {gameplayCatalog,GAMEPLAY_SAVE_KEY,LEGACY_SAVE_KEY} from './gameplay-catalog.mjs';
const {config,legacyConfig}=gameplayCatalog();
test('gameplay fixture remains two five-slot scenes with reciprocal links and capped sniff economy',()=>{
 core.validateConfig(config);assert.equal(config.items.length,10);assert.deepEqual(config.meadows.map(m=>m.slots.length),[5,5]);assert.equal(config.meadows[1].id,'kotoutro');
 const sniff=config.meadows[0].interactions.find(r=>r.id==='sniff');assert.equal(sniff.amount*3600000/sniff.cooldownMs,24);assert.ok(config.items.every(i=>config.meadows.some(m=>m.passive.some(r=>r.requires.includes(i.id)))));
 const destinations=new Set(config.worldEvents.map(e=>e.visitor.meadowId));assert.deepEqual([...destinations].sort(),['kotoutro','test-meadow']);
});
test('old-key v1 and old-config v2 import once with exact paid progress and untouched source',()=>{
 let old=core.createInitialState(legacyConfig,1000);old=core.dispatch(old,{type:'startProject',itemId:'rabbit',now:1000},legacyConfig);old=core.dispatch(old,{type:'click',now:1000},legacyConfig);
 for(const version of [1,2]){
  const source=structuredClone(old);source.version=version;if(version===1){delete source.accrual;delete source.events;delete source.memories;}
  const raw=core.serializeState(source),store=new Map([[LEGACY_SAVE_KEY,raw]]),storage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v)};
  const session=createSession(config,{storage,key:GAMEPLAY_SAVE_KEY,legacyKey:LEGACY_SAVE_KEY,legacyConfig,now:()=>1000});
  assert.equal(session.imported,true);assert.ok(Math.abs(session.state.project.work-4.8)<1e-10);assert.equal(session.state.wallet.yarn,0);assert.equal(store.get(LEGACY_SAVE_KEY),raw);assert.ok(store.has(GAMEPLAY_SAVE_KEY));
  session.act({type:'click'});const work=session.state.project.work;
  const reload=createSession(config,{storage,key:GAMEPLAY_SAVE_KEY,legacyKey:LEGACY_SAVE_KEY,legacyConfig,now:()=>1000});assert.equal(reload.imported,false);assert.equal(reload.state.project.work,work);assert.equal(store.get(LEGACY_SAVE_KEY),raw);
 }
});
test('away summary describes already-committed progress once, including production cap',()=>{
 let now=1000;const store=new Map(),storage={getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v)};
 const first=createSession(config,{storage,key:GAMEPLAY_SAVE_KEY,now:()=>now});first.act({type:'startProject',itemId:'rabbit'});now+=12*60*60*1000;
 const resumed=createSession(config,{storage,key:GAMEPLAY_SAVE_KEY,now:()=>now}),report=resumed.takeAwayReport();assert.equal(report.productionMs,8*60*60*1000);assert.equal(report.work,48);assert.equal(resumed.takeAwayReport(),null);
 const yarn=resumed.state.wallet.yarn;resumed.tick();assert.equal(resumed.state.wallet.yarn,yarn);assert.equal(createSession(config,{storage,key:GAMEPLAY_SAVE_KEY,now:()=>now}).takeAwayReport(),null);
});
test('an existing empty new save fails closed and cannot be replaced by legacy import',()=>{
 const raw=core.serializeState(core.createInitialState(legacyConfig,1000)),store=new Map([[LEGACY_SAVE_KEY,raw],[GAMEPLAY_SAVE_KEY,'']]),notices=[];
 const session=createSession(config,{storage:{getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v)},key:GAMEPLAY_SAVE_KEY,legacyKey:LEGACY_SAVE_KEY,legacyConfig,now:()=>1000,onNotice:n=>notices.push(n)});
 assert.equal(session.imported,false);session.act({type:'startProject',itemId:'rabbit'});assert.equal(store.get(GAMEPLAY_SAVE_KEY),'');assert.equal(store.get(LEGACY_SAVE_KEY),raw);assert.ok(notices.length);
});
test('legacy absence settles once at the old economy before balance migration',()=>{
 let old=core.createInitialState(legacyConfig,1000);old=core.dispatch(old,{type:'startProject',itemId:'rabbit',now:1000},legacyConfig);
 const raw=core.serializeState(old),store=new Map([[LEGACY_SAVE_KEY,raw]]),storage={getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v)},now=41000;
 const expected=core.advanceTime(old,now,legacyConfig),session=createSession(config,{storage,key:GAMEPLAY_SAVE_KEY,legacyKey:LEGACY_SAVE_KEY,legacyConfig,now:()=>now});
 assert.equal(session.state.wallet.yarn,expected.wallet.yarn);assert.equal(session.state.project.work,48);assert.equal(session.takeAwayReport().yarn,expected.wallet.yarn-old.wallet.yarn);assert.equal(store.get(LEGACY_SAVE_KEY),raw);
});

