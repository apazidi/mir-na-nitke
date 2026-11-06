import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const base=new URL(process.env.PREVIEW_URL);assert.equal(base.protocol,'https:');assert.ok(base.pathname.endsWith('/'));
const expected=JSON.parse(await readFile(new URL('../../../stage-study/manifest.json',import.meta.url),'utf8'));
const response=await fetch(new URL('manifest.json',base),{signal:AbortSignal.timeout(15000)});assert.equal(response.status,200);
assert.deepEqual(await response.json(),expected,'Public bundle must be this reviewed version');
for(const file of expected.files){const r=await fetch(new URL(file.name,base),{signal:AbortSignal.timeout(15000)});assert.equal(r.status,200,file.name);const data=Buffer.from(await r.arrayBuffer());assert.equal(data.length,file.bytes,file.name);assert.equal(createHash('sha256').update(data).digest('hex'),file.sha256,file.name);}
await import('./check.mjs');
console.log('Exact reviewed HTTPS bundle and ordinary UI verified at 360/390/430.');
