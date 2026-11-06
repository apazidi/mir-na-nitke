// Read-only exact-byte receipt from outside the author's worker.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const base=new URL(process.env.PREVIEW_URL);
assert.equal(base.protocol,'https:');assert.ok(base.pathname.endsWith('/'));
const bytes=await readFile(new URL('../../../play-preview/preview-manifest.json',import.meta.url));
const expected=JSON.parse(bytes);
assert.equal(expected.stagedReview,true);
assert.equal(expected.saveKey,'mir-na-nitke-gameplay-preview-v4');
assert.ok(expected.files.length>20);
const names=new Set();
for(const file of expected.files){
 assert.match(file.path,/^[a-zA-Z0-9_.\/-]+$/);
 assert.ok(!file.path.startsWith('/')&&!file.path.split('/').includes('..'));
 assert.ok(!names.has(file.path));names.add(file.path);
 assert.equal(new URL(file.path,base).origin,base.origin);
}
const receipt={url:base.href,reviewedSHA:process.env.REVIEWED_SHA??null,appSourceCommit:expected.appSourceCommit,manifestSHA256:createHash('sha256').update(bytes).digest('hex'),runner:process.env.GITHUB_ACTIONS?'GitHub-hosted ubuntu-24.04':'local Node',checks:[],limits:'Exact public HTTPS bytes only. UI, artwork and the crafting experience are reviewed separately.'};
const deadline=performance.now()+240_000,attempts=process.env.WAIT_FOR_DEPLOY==='1'?10:1;
for(let attempt=1;attempt<=attempts;attempt++){
 receipt.attempt=attempt;receipt.checks=[];
 try{
  const get=async name=>{const remaining=Math.floor(deadline-performance.now());assert.ok(remaining>0,'Public verification deadline');const response=await fetch(new URL(name,base),{signal:AbortSignal.timeout(Math.min(10000,remaining)),cache:'no-store'});assert.equal(response.status,200,name);return Buffer.from(await response.arrayBuffer());};
  assert.deepEqual(JSON.parse(await get('preview-manifest.json')),expected,'Published bundle must match this checkout');
  // Bounded batches keep a full game bundle inside the overall deadline.
  for(let offset=0;offset<expected.files.length;offset+=6){
   const batch=expected.files.slice(offset,offset+6);
   const results=await Promise.allSettled(batch.map(async file=>{const data=await get(file.path);assert.equal(data.length,file.bytes,file.path);assert.equal(createHash('sha256').update(data).digest('hex'),file.sha256,file.path);return {...file,result:'PASS'};}));
   for(const result of results){if(result.status==='fulfilled')receipt.checks.push(result.value);}
   const failures=results.filter(result=>result.status==='rejected');if(failures.length)throw failures[0].reason;
  }
  receipt.result='PASS';delete receipt.error;break;
 }catch(error){receipt.result='FAIL';receipt.error=error.message;console.log(`Public attempt ${attempt}/${attempts}: ${error.message.slice(0,220)}`);if(attempt<attempts){if(deadline-performance.now()<=12000){receipt.error+='; total deadline reached';break;}await new Promise(resolve=>setTimeout(resolve,12000));}}
}
await mkdir(new URL('./evidence/',import.meta.url),{recursive:true});
await writeFile(new URL('./evidence/https-receipt.json',import.meta.url),JSON.stringify(receipt,null,2)+'\n');
console.log(`${receipt.result}: ${receipt.checks.length}/${expected.files.length} exact files; ${base.href}`);
if(receipt.result!=='PASS')process.exitCode=1;
