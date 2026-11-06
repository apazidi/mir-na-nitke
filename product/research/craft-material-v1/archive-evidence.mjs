// Manual, explicit evidence selection. Does not run in the game or CI.
import {readFile,writeFile,readdir,mkdir,copyFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
const base=fileURLToPath(new URL('./evidence/',import.meta.url));
const selected=(await readdir(base)).filter(n=>/^(03-|04-|06-|07-|08-)/.test(n));
selected.push('reference-comparison-v2.png');
for(const dir of ['critic-v1','critic-v2']){
 for(const name of await readdir(`${base}/${dir}`)){
  if(name.startsWith('page@'))continue; // Identical to process.webm, not a second observation.
  const rel=`${dir}/${name}`;
  if(name.endsWith('.mjs')){
   let source=await readFile(`${base}/${rel}`,'utf8');
   source=source.replace(/^process\.env\.PLAYWRIGHT_BROWSERS_PATH=.*\r?\n/m,'');
   source=source.replace(/await import\('file:\/\/\/C:[^']+playwright\/index\.mjs'\)/,"await import(process.env.PLAYWRIGHT_MODULE.startsWith('file:')?process.env.PLAYWRIGHT_MODULE:(await import('node:url')).pathToFileURL(process.env.PLAYWRIGHT_MODULE).href)");
   source=source.replace("executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'","...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})");
   await writeFile(`${base}/${rel}`,source.replace(/\r\n/g,'\n'));
  }
  selected.push(rel);
 }
}
for(const width of [360,390,430]){
 const dir=`bundle-local-${width}`;
 await mkdir(`${base}/${dir}`,{recursive:true});
 for(const name of ['00-start.png','02-finished.png','report.json']){
  await copyFile(`${base}/qa-${width}/${name}`,`${base}/${dir}/${name}`);
  selected.push(`${dir}/${name}`);
 }
}
const director=['00-start.png','03-left-released.png','06-deep-released.png','07-undo-deep.png','08-own-form.png','09-reopened.png','11-second-own-form.png'];
for(const name of director)selected.push(`director-v2/${name}`);
const raw=await readFile(`${base}/director-v2/observations.json`);
await writeFile(`${base}/director-v2/observations.json.gz`,gzipSync(raw));
selected.push('director-v2/observations.json.gz');
const video=(await readdir(`${base}/director-v2`)).find(n=>n.endsWith('.webm'));
await copyFile(`${base}/director-v2/${video}`,`${base}/director-v2/process.webm`);
selected.push('director-v2/process.webm');
const files=[];
for(const name of selected.sort()){
 let data=await readFile(`${base}/${name}`);
 if(/\.(json|mjs)$/.test(name)){data=Buffer.from(data.toString('utf8').replace(/\r\n/g,'\n'));await writeFile(`${base}/${name}`,data);}
 files.push({name,bytes:data.length,sha256:createHash('sha256').update(data).digest('hex')});
}
await writeFile(`${base}/manifest.json`,JSON.stringify({study:'craft-material-v1',selection:'2026-11-06',notes:['Negative V1 and qualified V2 are both preserved.','Critic scripts have portable environment configuration; scenarios and observations are unchanged.','Director full observations are losslessly gzip-compressed.','Local bundle screenshots use final delivery label; critic V2 predates only copy/storage-warning patch.'],files},null,2)+'\n');
console.log(`Selected ${files.length} files, ${(files.reduce((n,f)=>n+f.bytes,0)/1048576).toFixed(1)} MiB; manifest.json contains exact hashes.`);
