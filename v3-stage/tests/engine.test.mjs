import test from 'node:test';import assert from 'node:assert/strict';
import {STAGES,stageIndex,stageThreshold,progress,clickGain,idleRate,upgradeCost,applyWork,hydrate,newState,DEFAULT_TOTAL_WORK} from '../game-engine.js';
const T=DEFAULT_TOTAL_WORK;
test('stage thresholds strictly follow 8 states',()=>{assert.equal(STAGES.length,8);for(let i=0;i<8;i++){assert.equal(stageIndex(stageThreshold(i,T),T),i);if(i<7)assert.equal(stageIndex(stageThreshold(i+1,T)-.02,T),i)}assert.equal(stageIndex(T,T),7)});
test('click and idle bonuses grow with levels',()=>{assert.ok(clickGain(3)>clickGain(0));assert.ok(idleRate(2)>idleRate(1));assert.ok(upgradeCost('click',2)>upgradeCost('click',1))});
test('progress never overflows, money matches generated work',()=>{let s=newState(100000);s=applyWork(s,T+100,T);assert.equal(s.work,T);assert.equal(applyWork(s,900,T).work,T);assert.equal(progress(s.work,T),1)});
test('offline progress has an 8h cap and finishes at threshold',()=>{const now=1_000_000_000;let s=newState(now-1000*50000);let out=hydrate(s,now,T);assert.equal(out.earnedSeconds,8*3600);assert.equal(out.state.work,T)});
test('finished bunny may be on meadow; mid-progress meadow is rejected',()=>{const now=100000;const invalid=hydrate({...newState(now),work:100,meadow:true},now,T);assert.equal(invalid.state.meadow,false);const valid=hydrate({...newState(now),work:T,meadow:true},now,T);assert.equal(valid.state.meadow,true)});
test('partial progress survives reload and coins remain valid',()=>{const now=100000;const old={...newState(now),work:300,coins:77,clickLevel:2,idleLevel:3,lastSeenAt:now};const restored=hydrate(old,now,T);assert.equal(restored.state.work,300);assert.equal(restored.state.clickLevel,2);assert.equal(restored.state.coins,77)});
