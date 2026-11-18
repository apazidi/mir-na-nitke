import {test} from 'node:test';
import assert from 'node:assert/strict';
import {normalizeIntent,intentPlan,intentComparison,intentSummary} from './pattern-intent.mjs';
const view=(owned=[],project=null)=>({owned,project,pattern:{learned:owned.includes('flower-pattern')}});
test('intent is optional and invalid UI values cannot manufacture targets',()=>{
 for(const value of [null,undefined,{},['both'],'toString','__proto__','rabbit',''])assert.equal(normalizeIntent(value),null);
 assert.equal(intentPlan(view(),'old-intent'),null);
 assert.deepEqual(intentPlan(view(),'both').remaining,['rabbit-scarf','cat-doily']);
});
test('unclaimed work never completes an intention; learning is separate',()=>{
 const waiting=view([],{itemId:'rabbit-scarf',canComplete:true});
 assert.equal(intentPlan(waiting,'both').completed,0);
 assert.match(intentSummary(waiting,'both'),/Готово 0 из 2.*подтвердите/);
 const learned=view(['flower-pattern']);
 assert.equal(intentPlan(learned,'both').completed,0);
 assert.match(intentSummary(learned,'both'),/Узор уже изучен/);
});
test('costs cover only remaining intentions and never charge knowledge twice',()=>{
 assert.deepEqual(intentComparison(view(),'both'),{count:2,learned:false,direct:{yarn:12,work:288.4},study:{yarn:14,work:261.88}});
 for(const v of [view(),view(['rabbit-scarf'])]){
  assert.deepEqual(intentComparison(v,'cat-doily'),{count:1,learned:false,direct:{yarn:6,work:144.2},study:{yarn:8,work:160.94}});
 }
 assert.deepEqual(intentComparison(view(['flower-pattern']),'both'),{count:2,learned:true,yarn:12,work:201.88});
 assert.deepEqual(intentComparison(view(['flower-pattern','rabbit-scarf']),'both'),{count:1,learned:true,yarn:6,work:100.94});
});
test('busy paid work prevents a speculative new price and survives any intention',()=>{
 const v=view([],{itemId:'flower-pattern',canComplete:false}),before=structuredClone(v);
 for(const intent of ['both','rabbit-scarf','cat-doily',null]){assert.equal(intentComparison(v,intent),null);intentPlan(v,intent);intentSummary(v,intent);}
 assert.deepEqual(v,before);
});
test('a completed single intention never silently becomes the other accessory',()=>{
 const v=view(['rabbit-scarf']);
 assert.deepEqual(intentPlan(v,'rabbit-scarf').remaining,[]);
 assert.equal(intentComparison(v,'rabbit-scarf'),null);
 assert.match(intentSummary(v,'rabbit-scarf'),/Замысел выполнен/);
 assert.deepEqual(intentPlan(v,'both').remaining,['cat-doily']);
 const done=view(['rabbit-scarf','cat-doily','flower-pattern']);
 assert.equal(intentComparison(done,'both'),null);
 assert.equal(intentComparison(done,null),null);
});
