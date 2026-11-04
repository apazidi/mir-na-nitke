import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';import {dirname,resolve} from 'node:path';
const base=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const html=readFileSync(resolve(base,'index.html'),'utf-8');
const source=readFileSync(resolve(base,'game.js'),'utf-8');
test('all DOM IDs referenced by game logic exist in page',()=>{const refs=[...source.matchAll(/\$\('([^']+)'\)/g)].map(m=>m[1]);const missing=[...new Set(refs)].filter(id=>!html.includes(`id="${id}"`));assert.deepEqual(missing,[]);});
test('one background and five stage assets, valid RIFF WebP',()=>{for(const name of ['meadow-clean.webp','atelier-background.webp','rabbit.webp','flower-meadow.webp',...Array.from({length:5},(_,i)=>`flower-stage-0${i}.webp`)]){const path=resolve(base,'assets',name);assert.ok(existsSync(path),`Missing ${name}`);const bin=readFileSync(path);assert.equal(bin.toString('ascii',0,4),'RIFF');assert.equal(bin.toString('ascii',8,12),'WEBP');}});
test('meadow scene displays no premade house, tree or butterfly sprite',()=>{assert.ok(!html.includes('src="./assets/tree.webp"'));assert.ok(!html.includes('src="./assets/house.webp"'));assert.ok(!html.includes('src="./assets/butterfly.webp"'));});
