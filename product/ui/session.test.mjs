import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createSession} from '../app/ui/session.mjs';
import {developmentCatalog} from './dev-catalog.mjs';
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
