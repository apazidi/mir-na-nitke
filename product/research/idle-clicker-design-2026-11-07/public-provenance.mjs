import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
export async function readPublicProvenance(url){
 const localBytes=await readFile(new URL('../../../play-preview/preview-manifest.json',import.meta.url));
 const expected=JSON.parse(localBytes);
 const response=await fetch(new URL('preview-manifest.json',url),{signal:AbortSignal.timeout(15000),cache:'no-store'});
 assert.equal(response.status,200);const bytes=Buffer.from(await response.arrayBuffer()),actual=JSON.parse(bytes);
 assert.deepEqual(actual,expected,'Public manifest differs from this checkout');
 assert.equal(actual.saveKey,'mir-na-nitke-gameplay-preview-v4');assert.equal(actual.stagedReview,true);
 return {checkedAt:new Date().toISOString(),url:new URL('preview-manifest.json',url).href,appSourceCommit:actual.appSourceCommit,saveKey:actual.saveKey,manifestSHA256:createHash('sha256').update(bytes).digest('hex'),matchesCheckout:true,limits:'Verifies manifest identity, not all remote file bytes; this is not a gameplay or human-experience check.'};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const result=await readPublicProvenance('https://apazidi.github.io/mir-na-nitke/play-preview/');
 result.relationshipToCapture='Separate check AFTER the first browser observation. The original capture did not collect a manifest; this later check is not claimed to have occurred at capture time.';
 await writeFile(new URL('./evidence/public-provenance-after-observation.json',import.meta.url),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
}
