import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as core from '../app/core/index.mjs';
const stages=[{at:0},{at:.5},{at:1}];
const placed=(meadowId,slotId)=>({meadowId,slotId});
const c={initialYarn:100,reserveYarnPerHour:12,clickWork:10,idleWorkPerSecond:.7,maxOfflineMs:60000,
 items:['rabbit','flower','cat','duck'].map((id,n)=>({id,meadowId:n<2?'first':'second',yarnCost:5,workUnits:20,art:{stages},...(id==='flower'?{requiresPlaced:[placed('first','rabbit')]}:{})})),
 upgrades:[{id:'hook',target:'click',baseCost:4,costMultiplier:2,amount:2,maxLevel:3}],
 meadows:[{id:'first',slots:[{id:'rabbit',itemId:'rabbit'},{id:'flower',itemId:'flower'}],passive:[{id:'income',requires:['rabbit'],ratePerHour:60}],interactions:[
  {id:'pet',requires:['rabbit'],actorSlot:'rabbit',action:'pet',trigger:'manual',amount:1,cooldownMs:5000},
  {id:'sniff',requires:['rabbit','flower'],action:'sniff',trigger:'idle',amount:.3,cooldownMs:3000},
  {id:'water',requires:['flower'],actorSlot:'flower',action:'water',trigger:'manual',amount:.4,workBonus:3,cooldownMs:5000}]},
 {id:'second',requiresPlaced:[placed('first','rabbit'),placed('first','flower')],slots:[{id:'cat',itemId:'cat'},{id:'duck',itemId:'duck'}],passive:[{id:'income',requires:['cat'],ratePerHour:90}],interactions:[{id:'feed',requires:['duck'],action:'feed',trigger:'manual',amount:.5,cooldownMs:3000}]}],
 worldEvents:[
  {id:'visit-rabbit',trigger:'automatic',requiresPlaced:[placed('first','rabbit'),placed('second','cat')],delayMs:5000,visitMs:7000,rewardYarn:.2,visitor:{itemId:'rabbit',meadowId:'second',x:.2,y:.6,scale:.7}},
  {id:'visit-duck',trigger:'automatic',requiresPlaced:[placed('second','duck')],requiresMemories:['visit-rabbit'],delayMs:3000,visitMs:6000,visitor:{itemId:'duck',meadowId:'first',x:.7,y:.6,scale:.5}},
  {id:'gift',trigger:'project',requiresPlaced:[placed('second','cat'),placed('second','duck')],requiresMemories:['visit-duck'],delayMs:2000,visitMs:3000,cooldownMs:4000,repeatable:true,rewardYarn:1,visitor:{itemId:'rabbit',meadowId:'second',x:.2,y:.6,scale:.7}}],
 recipes:[{id:'picnic',eventId:'gift',requiresMemories:['visit-duck'],yarnCost:4,workUnits:20,art:{stages}}]};
const act=(s,type,data={},config=c)=>core.dispatch(s,{type,now:s.lastTimestamp,...data},config);
function craft(s,id,config=c){s=act(s,'startProject',{itemId:id},config);while(!core.selectView(s,config).project.canComplete)s=act(s,'click',{},config);s=act(s,'completeCraft',{},config);const m=config.meadows.find(m=>m.slots.some(x=>x.itemId===id));return act(s,'placeItem',{meadowId:m.id,slotId:id},config);}
function all(){let s=core.createInitialState(c,0);for(const id of ['rabbit','flower','cat','duck'])s=craft(s,id);return s;}
test('prerequisites gate both project and meadow, all scenes produce globally',()=>{
 let s=core.createInitialState(c,0);assert.equal(core.selectView(s,c).meadows[1].unlocked,false);assert.throws(()=>act(s,'startProject',{itemId:'cat'}));assert.throws(()=>act(s,'startProject',{itemId:'flower'}));
 s=craft(craft(s,'rabbit'),'flower');assert.equal(core.selectView(s,c).meadows[1].unlocked,true);s=craft(s,'cat');
 const next=core.advanceTime(s,1000,c);assert.equal(next.wallet.yarn,s.wallet.yarn+(12+60+90)/3600);assert.equal(core.selectView(next,c).meadows[0].slots[0].placed,true);
});
test('generic whitelist dispatch preserves the exact verb, manual cooldown, and work effect',()=>{
 let s=all();assert.throws(()=>act(s,'startRecipe',{recipeId:'picnic'}));s=core.advanceTime(s,20000,c);s=act(s,'startRecipe',{recipeId:'picnic'});
 const before=s.wallet.yarn;s=act(s,'interact',{meadowId:'first',interactionId:'water'});assert.equal(s.project.work,3);assert.equal(s.wallet.yarn,before+.4);
 assert.throws(()=>act(s,'pet',{meadowId:'first',interactionId:'water'}));assert.throws(()=>act(s,'interact',{meadowId:'first',interactionId:'water'}));
 assert.throws(()=>act(s,'interact',{meadowId:'first',interactionId:'sniff'}));assert.throws(()=>act(s,'invented-action',{meadowId:'first',interactionId:'water'}));
 const loaded=core.deserializeState(core.serializeState(s),c);assert.throws(()=>act(loaded,'water',{meadowId:'first',interactionId:'water'}));
 assert.equal(core.selectView(s,c).meadows[0].interactions.find(r=>r.id==='water').action,'water');
});
test('cross-scene events persist visitors, reciprocal memories and once-only outcomes',()=>{
 let s=all();assert.equal(s.events['visit-rabbit'].phase,'waiting');assert.equal(s.events['visit-rabbit'].dueAt,5000);
 s=core.advanceTime(s,5000,c);assert.equal(core.selectView(s,c).visitors[0].meadowId,'second');assert.equal(s.memories['visit-rabbit'].count,1);
 assert.equal(s.events['visit-duck'].dueAt,8000);s=core.advanceTime(s,8000,c);assert.ok(core.selectView(s,c).visitors.some(v=>v.itemId==='duck'&&v.meadowId==='first'));
 s=core.advanceTime(s,20000,c);assert.equal(core.selectView(s,c).visitors.length,0);assert.equal(s.memories['visit-duck'].count,1);
 const reloaded=core.deserializeState(core.serializeState(s),c);assert.deepEqual(core.advanceTime(reloaded,20000,c),s);
 const later=core.advanceTime(reloaded,50000,c);assert.equal(later.memories['visit-duck'].count,1);assert.equal(later.memories['visit-rabbit'].count,1);
});
test('repeatable gift uses shared paid work, a bounded cooldown and no eleventh owned item',()=>{
 let s=core.advanceTime(all(),20000,c),owned=[...s.owned],before=s.wallet.yarn;
 s=act(s,'startRecipe',{recipeId:'picnic'});assert.equal(s.wallet.yarn,before-4);assert.throws(()=>act(s,'startProject',{itemId:'rabbit'}));
 s=act(act(s,'click'),'click');s=act(s,'completeCraft');assert.deepEqual(s.owned,owned);assert.equal(s.events.gift.dueAt,22000);assert.throws(()=>act(s,'startRecipe',{recipeId:'picnic'}));
 s=core.advanceTime(s,22000,c);assert.equal(s.memories.gift.count,1);s=core.advanceTime(s,29000,c);assert.equal(s.events.gift.phase,'available');
 s=act(s,'startRecipe',{recipeId:'picnic'});s=act(act(s,'click'),'click');s=act(s,'completeCraft');s=core.advanceTime(s,31000,c);assert.equal(s.memories.gift.count,2);assert.equal(Object.keys(s.memories).length,3);assert.deepEqual(s.owned,owned);
});
test('time partition gives identical wallet, work, timers, memories and sequence',()=>{
 const initial=all();const once=core.advanceTime(initial,40000,c);let sliced=initial;
 for(const t of [1,923,3000,4999,5000,5001,8000,13555,20001,29999,40000])sliced=core.advanceTime(sliced,t,c);
 assert.deepEqual(sliced,once);
 const recipe=act(core.advanceTime(initial,20000,c),'startRecipe',{recipeId:'picnic'});
 assert.deepEqual(core.advanceTime(core.advanceTime(recipe,20123,c),22555,c),core.advanceTime(recipe,22555,c));
});
test('offline cap bounds production while expired visits remain memories; rollback never reapplies',()=>{
 const capped={...c,maxOfflineMs:10000};let s=core.advanceTime(all(),20000,capped);
 assert.equal(s.lastTimestamp,20000);assert.equal(s.memories['visit-rabbit'].lastAt,5000);assert.equal(s.memories['visit-duck'].lastAt,8000);
 assert.equal(s.events['visit-rabbit'].phase,'done');assert.equal(s.events['visit-duck'].phase,'done');assert.equal(core.selectView(s,capped).visitors.length,0);
 assert.deepEqual(core.advanceTime(s,0,capped),s);assert.deepEqual(core.advanceTime(core.deserializeState(core.serializeState(s),capped),20000,capped),s);
 s=core.advanceTime(s,22000,capped);assert.equal(s.events['visit-rabbit'].phase,'done');assert.equal(s.memories['visit-rabbit'].count,1);
});
test('v1 migration retains earned state and work ratio, adds only new timers and rejects unknown IDs',()=>{
 let s=craft(core.createInitialState(c,0),'rabbit');s=act(s,'startProject',{itemId:'flower'});s=act(s,'click');
 const legacy=structuredClone(s);legacy.version=1;delete legacy.events;delete legacy.memories;delete legacy.accrual;
 const updated=structuredClone(c);updated.items.find(i=>i.id==='flower').workUnits=80;updated.migrationV1={workUnits:{rabbit:20,flower:20},ruleIds:['first/pet','first/sniff','first/water','second/feed']};
 updated.meadows[0].interactions.push({id:'hello',requires:['rabbit'],action:'greet',trigger:'manual',amount:1,cooldownMs:8000});
 const raw=JSON.stringify(legacy),migrated=core.deserializeState(raw,updated);assert.equal(migrated.version,2);assert.equal(migrated.project.work,40);assert.equal(migrated.wallet.yarn,legacy.wallet.yarn);assert.deepEqual(migrated.owned,legacy.owned);assert.deepEqual(migrated.placements,legacy.placements);assert.equal(migrated.cooldowns['first/hello'],legacy.lastTimestamp);assert.equal(raw,JSON.stringify(legacy));
 const bad=structuredClone(legacy);delete bad.cooldowns['first/pet'];assert.throws(()=>core.deserializeState(JSON.stringify(bad),updated));bad.owned.push('unknown');assert.throws(()=>core.deserializeState(JSON.stringify(bad),updated));
 assert.deepEqual(core.deserializeState(core.serializeState(migrated),updated),migrated);
});
test('corrupt new state and unknown declarative references fail closed',()=>{
 const saved=core.advanceTime(all(),8000,c);
 for(const mutate of [s=>s.memories.unknown={firstAt:1,lastAt:1,count:1},s=>s.events['visit-rabbit'].count=3,s=>s.accrual.baseYarn+=20,s=>delete s.events['visit-duck'],s=>s.events['visit-rabbit'].phase='anything']){const bad=structuredClone(saved);mutate(bad);assert.throws(()=>core.deserializeState(core.serializeState(bad),c));}
 for(const mutate of [x=>x.items[1].requiresPlaced=[placed('first','missing')],x=>x.worldEvents[0].visitor.itemId='missing',x=>x.worldEvents[0].repeatable=true,x=>x.meadows[0].interactions[0].action='eval',x=>x.recipes[0].meadowId='missing']){const bad=structuredClone(c);mutate(bad);assert.throws(()=>core.validateConfig(bad));}
});
test('save rejects replayed one-shot project events, terminal repeats and a blocked active recipe',()=>{
 const once=structuredClone(c);once.worldEvents.find(e=>e.id==='gift').repeatable=false;
 let s=core.advanceTime(all(),20000,once);s=act(s,'startRecipe',{recipeId:'picnic'},once);const working=structuredClone(s);
 s=act(act(s,'click',{},once),'click',{},once);s=act(s,'completeCraft',{},once);s=core.advanceTime(s,30000,once);
 assert.equal(s.events.gift.phase,'done');const replay=structuredClone(s);replay.events.gift.phase='waiting';replay.events.gift.dueAt=s.lastTimestamp+1000;
 assert.throws(()=>core.deserializeState(core.serializeState(replay),once),/phase/);
 let repeated=core.advanceTime(all(),20000,c);repeated=act(repeated,'startRecipe',{recipeId:'picnic'});repeated=act(act(repeated,'click'),'click');repeated=act(repeated,'completeCraft');repeated=core.advanceTime(repeated,30000,c);repeated.events.gift.phase='done';
 assert.throws(()=>core.deserializeState(core.serializeState(repeated),c),/phase/);
 working.events.gift={phase:'waiting',dueAt:working.lastTimestamp+2000,count:0};
 assert.throws(()=>core.deserializeState(core.serializeState(working),once),/Active recipe/);
});
