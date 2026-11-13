import {fileURLToPath,pathToFileURL} from 'node:url';
import {writeFile} from 'node:fs/promises';
import {startServer} from '../scripts/serve-preview.mjs';
import {exerciseSaveWriter} from './save-writer-check.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE?pathToFileURL(process.env.PLAYWRIGHT_MODULE).href:'playwright');
const server=process.env.PREVIEW_URL?null:await startServer(0);
const baseUrl=process.env.PREVIEW_URL??`http://127.0.0.1:${server.address().port}/`;
const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
const evidenceDir=fileURLToPath(new URL('../preview-evidence/save-writer/',import.meta.url));
try{
  const report=await exerciseSaveWriter(browser,{baseUrl,evidenceDir});
  await writeFile(new URL('../preview-evidence/save-writer/report.json',import.meta.url),JSON.stringify(report,null,2));
  console.log(JSON.stringify(report));
}finally{await browser.close();if(server)await new Promise(resolve=>server.close(resolve));}
