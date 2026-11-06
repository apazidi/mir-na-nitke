// A read-only receipt for exact public bytes, separate from the browser UI QA.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const base=new URL(process.env.PREVIEW_URL);assert.equal(base.protocol,'https:');assert.ok(base.pathname.endsWith('/'));
const manifest=await readFile(new URL('../../../stage-study/manifest.json',import.meta.url));
const expected=JSON.parse(manifest);
const names=['index.html','style.css','model.mjs','sections.mjs','app.mjs','assets/skin-v4.css','assets/meadow.webp','assets/flower-base.webp','assets/flower.webp','assets/knit.webp'];
assert.deepEqual(expected.files.map(f=>f.name),names);
const receipt={url:base.href,reviewedSHA:process.env.REVIEWED_SHA??null,manifestSHA256:createHash('sha256').update(manifest).digest('hex'),runner:process.env.GITHUB_ACTIONS?'GitHub-hosted ubuntu-24.04':'local Node',checks:[],limits:'Exact public HTTPS bytes only; UI and subjective quality require separate review.'};
const attempts=process.env.WAIT_FOR_DEPLOY==='1'?10:1;
// Leave a minute for checkout/setup/upload inside the five-minute job.
const deadline=performance.now()+240_000;
for(let attempt=1;attempt<=attempts;attempt++){
 receipt.attempt=attempt;receipt.checks=[];
 try{
  const get=async name=>{const remaining=Math.floor(deadline-performance.now());if(remaining<=0)throw Error('Public verification deadline exceeded');const r=await fetch(new URL(name,base),{signal:AbortSignal.timeout(Math.min(10000,remaining)),cache:'no-store'});assert.equal(r.status,200,name);return Buffer.from(await r.arrayBuffer());};
  assert.deepEqual(JSON.parse(await get('manifest.json')),expected,'Published manifest must match this checkout');
  for(const file of expected.files){const data=await get(file.name);assert.equal(data.length,file.bytes,file.name);assert.equal(createHash('sha256').update(data).digest('hex'),file.sha256,file.name);receipt.checks.push({...file,result:'PASS'});}
  receipt.result='PASS';delete receipt.error;break;
 }catch(error){receipt.result='FAIL';receipt.error=error.message;console.log(`Public bundle attempt ${attempt}/${attempts}: ${error.message.slice(0,220)}`);if(attempt<attempts){const remaining=deadline-performance.now();if(remaining<=12000){receipt.error+='; total verification deadline reached';break;}await new Promise(r=>setTimeout(r,12000));}}
}
await mkdir(new URL('./evidence/',import.meta.url),{recursive:true});
await writeFile(new URL('./evidence/https-receipt.json',import.meta.url),JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt,null,2));
if(receipt.result!=='PASS')process.exitCode=1;
