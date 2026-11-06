/** Local source runner; the published-bundle checker calls the same exercisePlayer helper. */
import {pathToFileURL,fileURLToPath} from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
import {startServer} from '../scripts/serve-preview.mjs';
import {exercisePlayer} from './player-check.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE?pathToFileURL(process.env.PLAYWRIGHT_MODULE).href:'playwright');
const server=await startServer(0),browser=await chromium.launch({...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{}),headless:true});
const evidenceDir=fileURLToPath(new URL('../preview-evidence/gameplay-v3/',import.meta.url));
try{
 for(const [width,height]of [[360,800],[390,844],[430,932]].filter(([width])=>!process.env.VIEWPORT_WIDTH||width===Number(process.env.VIEWPORT_WIDTH))){
  const page=await browser.newPage({viewport:{width,height}}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('response',response=>{if(response.status()>=400)errors.push(response.status()+' '+response.url());});
  page.on('requestfailed',request=>{if(request.failure()?.errorText!=='net::ERR_ABORTED')errors.push(request.failure()?.errorText+' '+request.url());});
  for(const [name,root]of [['scene-v2',process.env.SCENE_REVIEW_ROOT],['kotoutro-v1',process.env.KOTOUTRO_REVIEW_ROOT?path.join(process.env.KOTOUTRO_REVIEW_ROOT,'product/art-experiments/kotoutro-v1'):null]])if(root)await page.route('**/product/art-experiments/'+name+'/**',async route=>{
   const match=new URL(route.request().url()).pathname.match(/\/(exports|ui)\/([a-z0-9-]+\.webp)$/);if(!match){await route.continue();return;}
   await route.fulfill({path:path.join(root,match[1],match[2]),contentType:'image/webp'});
  });
  const report=await exercisePlayer(page,{url:'http://127.0.0.1:'+server.address().port+'/product/ui/?mode=art-review&flower=review&scene=v2&gameplay=v3',evidenceDir,width,height,clock:true});
  assert.deepEqual(errors,[]);console.log(JSON.stringify(report));await page.close();
 }
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
