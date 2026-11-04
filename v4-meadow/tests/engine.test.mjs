import test from 'node:test';import assert from 'node:assert/strict';
import {initialState,safeState,summarizeReturn,isEvening,EVENTS,MIN_RETURN_MS} from '../meadow-engine.mjs';
test('new visitor sees no fake offline events',()=>{const x=summarizeReturn(initialState(1000),1000);assert.equal(x.updated.visits,1);assert.equal(x.event,null)});
test('return after 10 minutes generates deterministic event',()=>{const raw={...initialState(1000),visits:1};const a=summarizeReturn(raw,601000);assert.ok(EVENTS.includes(a.event));assert.equal(a.updated.visits,2);assert.equal(a.away,600000)});
test('short revisit does not create story',()=>{const raw={...initialState(1000),visits:4};assert.equal(summarizeReturn(raw,1000+MIN_RETURN_MS-1).event,null)});
test('invalid stored data cannot increase or corrupt state',()=>{const r=safeState({visits:-1,pets:Infinity,lastAt:999999999,light:'hack'},1000);assert.deepEqual([r.visits,r.pets,r.lastAt,r.light],[0,0,1000,'auto'])});
test('evening mode follows browser time but can be overridden',()=>{assert.equal(isEvening('auto',20),true);assert.equal(isEvening('auto',11),false);assert.equal(isEvening('day',23),false);assert.equal(isEvening('evening',12),true)});
