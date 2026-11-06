import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {VERSION} from './prototype/model.mjs';
const root=fileURLToPath(new URL('../../../',import.meta.url)),output=path.resolve(root,'material-study');
if(path.dirname(output)!==path.resolve(root)||path.basename(output)!=='material-study')throw Error('Invalid study output');
const names=['index.html','style.css','model.mjs','app.mjs'];
await mkdir(output,{recursive:true});
const unexpected=(await readdir(output)).filter(n=>![...names,'manifest.json'].includes(n));
if(unexpected.length)throw Error('Unexpected files in generated output: '+unexpected.join(', '));
const files=[];
for(const name of names){
 const source=await readFile(new URL(`./prototype/${name}`,import.meta.url),'utf8');
 const data=Buffer.from(source.replace(/\r\n/g,'\n'));
 await writeFile(path.join(output,name),data);
 files.push({name,bytes:data.length,sha256:createHash('sha256').update(data).digest('hex')});
}
const app=await readFile(path.join(output,'app.mjs'),'utf8'),saveKey=app.match(/const KEY='([^']+)'/)?.[1];
if(saveKey!==`mir-craft-material-pompom-v${VERSION}`)throw Error('Storage namespace and model version disagree');
await writeFile(path.join(output,'manifest.json'),JSON.stringify({study:'craft-material-v1',modelVersion:VERSION,saveKey,files},null,2)+'\n');
console.log(`Built isolated material-study/: ${files.length} files, ${files.reduce((n,f)=>n+f.bytes,0)} bytes. No game data or production artwork changed.`);
