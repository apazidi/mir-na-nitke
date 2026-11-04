import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { validateItem, validateMeadow, validateRepository } from '../scripts/validate-content.mjs';

const itemExample = JSON.parse(readFileSync(new URL('../examples/item.sample.json', import.meta.url), 'utf8'));
const meadowExample = JSON.parse(readFileSync(new URL('../examples/meadow.sample.json', import.meta.url), 'utf8'));
const base = () => mkdtempSync(path.join(tmpdir(), 'knit-content-'));
const withFolder = (fn) => { const d=base();try{return fn(d)}finally{rmSync(d,{recursive:true,force:true})} };
function fakePngBytes() {const bytes=Buffer.alloc(2048);Buffer.from([137,80,78,71,13,10,26,10]).copy(bytes);return bytes;}
function asset(dir, relative) { const name=path.join(dir, relative);mkdirSync(path.dirname(name),{recursive:true});writeFileSync(name,fakePngBytes()); }
function readyItem(id) {return {...itemExample,id,status:'ready',art:{...itemExample.art,stages:itemExample.art.stages.map((s,i)=>({...s,image:`art/stage-0${i}.png`})),finishedSprite:'art/reward.png'}};}
function readyMeadow(id, itemIds) {return {...meadowExample,id,status:'ready',art:{...meadowExample.art,backgroundDay:'art/meadow-day.png',backgroundEvening:'art/meadow-evening.png'},slots:meadowExample.slots.map((s,i)=>({...s,itemId:itemIds[i]})),plannedNeighbors:[]};}

test('sample draft item has valid structure and warns about absent art', () => withFolder(dir => {
  const r=validateItem(itemExample,dir,itemExample.id);
  assert.deepEqual(r.errors,[]);
  assert.ok(r.warnings.some(w=>w.includes('Missing asset')));
}));

test('stages must start at zero, end at one, and be strictly increasing', () => withFolder(dir => {
  const item=structuredClone(itemExample);
  item.art.stages[2].at=.10;
  const r=validateItem(item,dir,item.id);
  assert.ok(r.errors.some(e=>e.includes('strictly increasing')));
}));

test('unsafe relative asset paths are rejected even in draft', () => withFolder(dir => {
  const item=structuredClone(itemExample);
  item.art.stages[0].image='../secrets.webp';
  assert.ok(validateItem(item,dir,item.id).errors.some(e=>e.includes('Unsafe')));
}));

test('meadow must have five unique slots and supported interactions', () => withFolder(dir => {
  const broken=structuredClone(meadowExample);
  broken.slots[1].id='rabbit';
  broken.interactions[0].action='run-code';
  const r=validateMeadow(broken,dir,broken.id,new Map(),new Map());
  assert.ok(r.errors.some(e=>e.includes('Duplicate slot')));
  assert.ok(r.errors.some(e=>e.includes('Unsupported interaction')));
}));

test('draft meadow may reference unmerged items with warnings', () => withFolder(dir => {
  const r=validateMeadow(meadowExample,dir,meadowExample.id,new Map(),new Map());
  assert.deepEqual(r.errors,[]);
  assert.ok(r.warnings.some(w=>w.includes('requires ready item')));
}));

test('ready meadow refuses missing item references', () => withFolder(dir => {
  const m={...meadowExample,status:'ready'};
  const r=validateMeadow(m,dir,m.id,new Map(),new Map());
  assert.ok(r.errors.some(e=>e.includes("requires ready item")));
}));

test('complete ready five-item meadow validates with valid PNG header fixtures', () => withFolder(root => {
  const ids=['bunny','crochet-flower','knitted-tree','tiny-house','butterfly'];
  const contentDir=path.join(root,'content');
  mkdirSync(path.join(contentDir,'items'),{recursive:true});
  mkdirSync(path.join(contentDir,'meadows'),{recursive:true});
  for(const id of ids){
    const pkg=path.join(contentDir,'items',id),it=readyItem(id);
    mkdirSync(pkg,{recursive:true});
    for(const stage of it.art.stages)asset(pkg,stage.image);
    asset(pkg,it.art.finishedSprite);
    writeFileSync(path.join(pkg,'manifest.json'),JSON.stringify(it));
  }
  const meadow=readyMeadow('rabbit-meadow',ids), pkg=path.join(contentDir,'meadows',meadow.id);
  mkdirSync(pkg,{recursive:true});
  asset(pkg,meadow.art.backgroundDay);asset(pkg,meadow.art.backgroundEvening);
  writeFileSync(path.join(pkg,'manifest.json'),JSON.stringify(meadow));
  const r=validateRepository(root);
  assert.deepEqual(r.errors,[]);assert.deepEqual(r.warnings,[]);
  assert.equal(r.items,5);assert.equal(r.meadows,1);
}));

import { checkAllowedChanges } from '../scripts/check-agent-scope.mjs';
test('one-item branch cannot alter another item or shared engine', () => {
  const r=checkAllowedChanges('item/apple-tree', [
    'product/content/items/apple-tree/manifest.json',
    'product/content/items/hedgehog/manifest.json',
    'product/app/renderer.ts'
  ]);
  assert.equal(r.checked,true);
  assert.deepEqual(r.violations, ['product/content/items/hedgehog/manifest.json','product/app/renderer.ts']);
});
test('meadow agent stays inside one meadow folder', () => {
  const r=checkAllowedChanges('meadow/autumn-garden', ['product/content/meadows/autumn-garden/manifest.json']);
  assert.deepEqual(r.violations,[]);
});
