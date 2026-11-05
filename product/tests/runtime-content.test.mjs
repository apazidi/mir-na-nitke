import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync,mkdirSync,writeFileSync,rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildContentIndex } from '../scripts/build-content-index.mjs';
import { resolveAssetUrl,selectStage,placementLayout,createEngineConfig,loadRuntimeCatalog } from '../app/content/index.mjs';
const item={schemaVersion:1,kind:'item',id:'bunny',status:'ready',displayName:'Bunny',tags:['animal'],workUnits:100,basePath:'content/items/bunny/',art:{styleId:'crochet-diorama-v1',logicalSize:[1024,1820],finishedSprite:'art/finished.png',stages:[0,.3,.6,1].map((at,i)=>({at,label:`Stage ${i}`,image:`art/${i}.png`}))}};
test('asset URLs require verified inventory and reject traversal or foreign protocols',()=>{
 const inventory=['content/items/bunny/art/finished.png'];
 assert.equal(resolveAssetUrl(item,'art/finished.png','https://example.com/preview/product/',inventory),'https://example.com/preview/product/content/items/bunny/art/finished.png');
 for(const p of ['art/../secret.png','https://evil/a.png','art/%2e%2e/a.png','art/missing.png','art/a.png?x']) assert.equal(resolveAssetUrl(item,p,'https://example.com/',inventory),null);
 assert.equal(resolveAssetUrl(item,'art/finished.png','file:///tmp/',inventory),null);
});
test('stage boundaries are exact and clamped',()=>{
 assert.equal(selectStage(item,.3).at,.3); assert.equal(selectStage(item,.299).at,0); assert.equal(selectStage(item,2).at,1); assert.equal(selectStage(item,-1).at,0); assert.equal(selectStage(item,NaN),null);
});
test('placements reveal only placed matching content in drawing order',()=>{
 const meadow={slots:[{id:'one',itemId:'bunny',x:.5,y:.4,scale:1,z:2},{id:'two',itemId:'bunny',x:.1,y:.2,scale:1,z:1}]};
 assert.deepEqual(placementLayout(meadow,{one:'other'},[item]),[]);
 assert.deepEqual(placementLayout(meadow,{one:'bunny'},[item]).map(s=>[s.id,s.left,s.top]),[['one',50,40]]);
});
test('economy comes from explicit overrides, unsupported manifest effects stay absent',()=>{
 const m={id:'garden',status:'ready',slots:[],passive:[{ratePerHour:999}],interactions:[{id:'pet',action:'pet',requires:['one'],amount:999},{id:'greet',action:'greet',requires:['one']}]};
 const catalog={schemaVersion:1,items:[{...item,yarnCost:999}],meadows:[m]};
 const config=createEngineConfig(catalog,{items:{bunny:{yarnCost:12}},meadows:{garden:{interactions:{pet:{amount:2,cooldownMs:1000,trigger:'manual'}}}}});
 assert.equal(config.items[0].yarnCost,12); assert.deepEqual(config.meadows[0].passive,[]); assert.equal(config.meadows[0].interactions.length,1); assert.equal(config.meadows[0].interactions[0].amount,2);
 assert.throws(()=>createEngineConfig({...catalog,items:[{...item,status:'draft'}]}));
});
test('builder excludes drafts and fails closed on missing ready assets',()=>{
 const root=mkdtempSync(path.join(os.tmpdir(),'knit-runtime-'));
 try {
  const dir=path.join(root,'content/items/bunny'); mkdirSync(path.join(dir,'art'),{recursive:true});mkdirSync(path.join(root,'content/meadows'),{recursive:true});
  const save=status=>writeFileSync(path.join(dir,'manifest.json'),JSON.stringify({...item,status}));
  save('draft'); assert.equal(buildContentIndex(root).items.length,0);
  save('ready'); assert.throws(()=>buildContentIndex(root),/Missing asset/);
  const png=Buffer.alloc(1200); Buffer.from([137,80,78,71,13,10,26,10]).copy(png);
  for(const a of [...item.art.stages.map(s=>s.image),item.art.finishedSprite])writeFileSync(path.join(dir,a),png);
  assert.equal(buildContentIndex(root).assets.length,5);
  writeFileSync(path.join(dir,'art/finished.png'),'invalid');assert.throws(()=>buildContentIndex(root),/valid PNG/);
 } finally {rmSync(root,{recursive:true,force:true});}
});
test('browser load resolves prefix and reports fetch failure',async()=>{
 const catalog={schemaVersion:1,items:[item],meadows:[],assets:['content/items/bunny/art/finished.png']};
 const loaded=await loadRuntimeCatalog('https://example.com/demo/product/app/content/catalog.json',{fetch:async()=>({ok:true,json:async()=>catalog})});
 assert.equal(loaded.assetUrl(item,'art/finished.png'),'https://example.com/demo/product/content/items/bunny/art/finished.png');
 await assert.rejects(loadRuntimeCatalog('https://example.com/catalog.json',{fetch:async()=>({ok:false,status:404})}),/404/);
});
