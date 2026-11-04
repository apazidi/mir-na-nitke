import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,statSync,readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,join} from 'node:path';
const root=join(dirname(fileURLToPath(import.meta.url)),'..');
test('background plus eight separate stage sprites are present',()=>{
 const paths=['atelier-background.webp',...Array.from({length:8},(_,i)=>`stage-${String(i).padStart(2,'0')}.webp`)];
 for(const name of paths){const p=join(root,'assets',name);assert.ok(existsSync(p),`Missing ${name}`);assert.ok(statSync(p).size>12000,`Suspiciously small ${name}`)}
});
test('stage viewport and action bindings are in the HTML',()=>{
 const html=readFileSync(join(root,'index.html'),'utf8');
 for(const id of ['stage-image','progress-track','knit-button','upgrade-click','upgrade-idle','settings-dialog','stage-slider'])assert.ok(html.includes(`id="${id}"`),`Missing ${id}`)
});
