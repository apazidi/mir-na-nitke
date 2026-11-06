import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const base=new URL(process.env.PREVIEW_URL);
assert.equal(base.protocol,'https:');assert.ok(base.pathname.endsWith('/'));
const expected=JSON.parse(await readFile(new URL('../../../material-study/manifest.json',import.meta.url),'utf8'));
const response=await fetch(new URL('manifest.json',base));assert.equal(response.status,200);
assert.deepEqual(await response.json(),expected,'The deployed bundle must be the reviewed version, not an older internally consistent deployment');
for(const file of expected.files){
 const response=await fetch(new URL(file.name,base));assert.equal(response.status,200);
 const data=Buffer.from(await response.arrayBuffer());assert.equal(data.length,file.bytes);
 assert.equal(createHash('sha256').update(data).digest('hex'),file.sha256,file.name+' integrity');
}
await import('./check.mjs');
console.log('Delivered HTTPS bundle verified against local manifest and exercised through normal UI at 360/390/430.');
