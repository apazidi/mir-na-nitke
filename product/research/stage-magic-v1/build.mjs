import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {VERSION,SECTION_COUNT} from './prototype/model.mjs';
const root=fileURLToPath(new URL('../../../',import.meta.url)),output=path.resolve(root,'stage-study');
if(path.dirname(output)!==path.resolve(root)||path.basename(output)!=='stage-study')throw Error('Invalid study output');
const names=['index.html','style.css','model.mjs','sections.mjs','app.mjs'];
const assets=[
 ['design-system/skin-v4.css','assets/skin-v4.css'],
 ...['meadow.webp','flower-base.webp','flower.webp','knit.webp'].map(n=>['craft-study/assets/'+n,'assets/'+n]),
];
await mkdir(path.join(output,'assets'),{recursive:true});
const unexpected=(await readdir(output)).filter(n=>![...names,'manifest.json','assets'].includes(n));
if(unexpected.length)throw Error('Unexpected files in generated output: '+unexpected.join(', '));
const unexpectedAssets=(await readdir(path.join(output,'assets'))).filter(n=>!assets.some(a=>a[1]==='assets/'+n));
if(unexpectedAssets.length)throw Error('Unexpected generated assets: '+unexpectedAssets.join(', '));
const files=[];
async function put(name,data){await writeFile(path.join(output,name),data);files.push({name,bytes:data.length,sha256:createHash('sha256').update(data).digest('hex')});}
for(const name of names){
 let source=await readFile(new URL(`./prototype/${name}`,import.meta.url),'utf8');
 source=source.replaceAll('../../../../design-system/skin-v4.css','assets/skin-v4.css').replaceAll('../../../../craft-study/assets/','assets/').replace(/\r\n/g,'\n');
 if(source.includes('../../../../'))throw Error('Unbundled parent reference in '+name);
 await put(name,Buffer.from(source));
}
for(const [from,to]of assets){let data=await readFile(path.join(root,from));if(from.endsWith('.css'))data=Buffer.from(data.toString('utf8').replace(/\r\n/g,'\n'));await put(to,data);}
await writeFile(path.join(output,'manifest.json'),JSON.stringify({study:'stage-magic-v1',modelVersion:VERSION,sections:SECTION_COUNT,saveKey:'mir-stage-magic-v1',files},null,2)+'\n');
console.log(`Built stage-study/: ${files.length} files, ${files.reduce((n,f)=>n+f.bytes,0)} bytes. Raster assets are unchanged copies.`);
