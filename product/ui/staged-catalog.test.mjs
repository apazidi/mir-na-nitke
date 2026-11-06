import test from 'node:test';
import assert from 'node:assert/strict';
import {stagedCatalog,SECTION_WEIGHTS,sectionAt} from './staged-catalog.mjs';
import {gameplayCatalog} from './gameplay-catalog.mjs';
import * as core from '../app/core/index.mjs';
test('four paid projects use weighted sections without changing compatibility catalog',()=>{
 const old=gameplayCatalog(true).config,next=stagedCatalog().config;
 assert.equal(old.initialYarn,10);assert.equal(old.items[0].workUnits,48);
 assert.equal(next.initialYarn,32);assert.equal(next.defaultCraftAuto,false);
 for(const id of Object.keys(SECTION_WEIGHTS))assert.ok(Math.abs(next.items.find(i=>i.id===id).workUnits-144.2)<1e-8);
 for(const item of old.items.filter(i=>!SECTION_WEIGHTS[i.id]))assert.equal(next.items.find(i=>i.id===item.id).workUnits,item.workUnits);
 assert.deepEqual(next.upgrades.map(u=>u.amount),[.35,.08]);
 assert.ok(next.upgrades.every(u=>u.requiresPlaced[0].slotId==='kot-cat'));
});
test('semantic mapping carries work across short parts and finishes at same total',()=>{
 assert.deepEqual(sectionAt('flower',35),{index:1,progress:0});
 assert.ok(Math.abs(sectionAt('flower',35+11.2+2.8).progress-.08)<1e-8);
 for(const id of Object.keys(SECTION_WEIGHTS))assert.deepEqual(sectionAt(id,144.2),{index:6,progress:0});
});
test('real prerequisites permit rabbit flower tree cat with fresh wallet and manual work',()=>{
 const c=stagedCatalog().config;let s=core.createInitialState(c,0);
 for(const id of Object.keys(SECTION_WEIGHTS)){
  s=core.dispatch(s,{type:'startProject',itemId:id,now:0},c);
  for(let n=0;n<52;n++)s=core.dispatch(s,{type:'click',now:0},c);
  assert.equal(core.selectView(s,c).project.canComplete,true);
  s=core.dispatch(s,{type:'completeCraft',now:0},c);
  s=core.dispatch(s,{type:'placeItem',meadowId:id==='kot-cat'?'kotoutro':'test-meadow',slotId:id,now:0},c);
 }
 assert.deepEqual(s.owned,Object.keys(SECTION_WEIGHTS));assert.equal(s.wallet.yarn,0);
});
