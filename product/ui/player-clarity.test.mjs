import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as core from '../app/core/index.mjs';
import {createSession} from '../app/ui/session.mjs';
import {developmentCatalog} from './dev-catalog.mjs';
import {stagedCatalog} from './staged-catalog.mjs';
import {gameplayCatalog} from './gameplay-catalog.mjs';
import {yarnAmount,nextGoal} from './player-guidance.mjs';
const config=developmentCatalog().config;
function savedSession(){
 let now=1000,active=true,fail=null;
 const store=new Map([['legacy','untouched']]);
 const storage={getItem:key=>store.get(key)??null,setItem:(key,value)=>{if(key===fail)throw Error('quota');store.set(key,value);}};
 const session=createSession(config,{storage,key:'current',now:()=>now,isActive:()=>active});
 session.act({type:'startProject',itemId:'rabbit'});session.act({type:'click'});
 return {session,storage,store,setNow:value=>now=value,setFail:value=>fail=value,revoke:()=>{active=false;}};
}
test('restart backs up paid progress, keeps legacy and survives reload; old confirmation is idempotent',()=>{
 const f=savedSession(),paid=structuredClone(f.session.state);f.setNow(2000);
 assert.equal(f.session.restart('confirm-1'),true);
 const backup=f.session.exportRestartBackup();assert.deepEqual(JSON.parse(backup),core.advanceTime(paid,2000,config));
 assert.equal(f.store.get('legacy'),'untouched');assert.deepEqual(f.session.state,core.createInitialState(config,2000));
 assert.deepEqual(createSession(config,{storage:f.storage,key:'current',now:()=>2000}).state,f.session.state);
 f.session.act({type:'startProject',itemId:'rabbit'});const freshPaid=structuredClone(f.session.state);
 assert.equal(f.session.restart('confirm-1'),true);assert.deepEqual(f.session.state,freshPaid);assert.equal(f.session.exportRestartBackup(),backup);
});
for(const failingKey of ['current-restart-backup','current'])test('restart failure at '+failingKey+' leaves old save and live work playable',()=>{
 const f=savedSession(),raw=f.store.get('current'),before=structuredClone(f.session.state);f.setFail(failingKey);f.setNow(2000);
 assert.equal(f.session.restart('confirmed'),false);assert.deepEqual(f.session.state,before);assert.equal(f.store.get('current'),raw);assert.equal(f.store.get('legacy'),'untouched');
 f.setFail(null);assert.equal(f.session.act({type:'click'}),true);assert.ok(f.session.state.project.work>before.project.work);
});
test('revoked or temporary session cannot reset shared data',()=>{
 const f=savedSession(),before=[...f.store];f.revoke();assert.equal(f.session.canRestart,false);assert.equal(f.session.restart('confirmed'),false);assert.deepEqual([...f.store],before);
 assert.equal(createSession(config,{now:()=>0}).restart('confirmed'),false);
});
test('whole upgrade prices are one shared opt-in rule for shown price, eligibility and exact deduction',()=>{
 const c=structuredClone(config);c.upgrades[0].wholeYarnPrice=true;c.upgrades[0].baseCost=2;c.upgrades[0].costMultiplier=1.8;
 const id=c.upgrades[0].id,s=core.createInitialState(c,0);s.upgrades[id]=1;s.wallet.yarn=3.9;s.accrual.baseYarn=3.9;
 assert.equal(core.selectView(s,c).upgrades[0].cost,4);assert.equal(core.selectView(s,c).upgrades[0].canBuy,false);
 assert.throws(()=>core.dispatch(s,{type:'buyUpgrade',upgradeId:id,now:0},c));
 s.wallet.yarn=4;s.accrual.baseYarn=4;
 const bought=core.dispatch(s,{type:'buyUpgrade',upgradeId:id,now:0},c);assert.equal(bought.wallet.yarn,0);assert.equal(bought.upgrades[id],2);
 delete c.upgrades[0].wholeYarnPrice;assert.equal(core.selectView(s,c).upgrades[0].cost,3.6);
 assert.ok(stagedCatalog().config.upgrades.every(u=>u.wholeYarnPrice));assert.ok(gameplayCatalog().config.upgrades.every(u=>u.wholeYarnPrice===undefined));
 c.upgrades[0].wholeYarnPrice='yes';assert.throws(()=>core.validateConfig(c));
});
test('yarn display floors available units without mutating saved fractions; complete world has no invented next item',()=>{
 assert.equal(yarnAmount(18722.7).replace(/\s/g,''),'18722');assert.equal(yarnAmount(.99),'0');
 const c=stagedCatalog().config,s=core.createInitialState(c,0);s.wallet.yarn=18722.7;s.accrual.baseYarn=18722.7;
 const loaded=core.deserializeState(core.serializeState(s),c);assert.equal(loaded.wallet.yarn,18722.7);
 assert.match(nextGoal(core.selectView(s,c),c),/Кролик/);
 s.owned=c.items.map(i=>i.id);s.placements=Object.fromEntries(c.meadows.map(m=>[m.id,Object.fromEntries(m.slots.map(slot=>[slot.id,slot.itemId]))]));
 assert.match(nextGoal(core.selectView(s,c),c),/Все изделия этой версии созданы/);
});
