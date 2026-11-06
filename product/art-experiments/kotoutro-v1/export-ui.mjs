/** Stable contextual controls derived from one3×3 atlas; never overlay/reflow lettering. */
import sharp from 'sharp';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('./',import.meta.url)),at=p=>path.join(root,p),sha=b=>createHash('sha256').update(b).digest('hex');
const controls=[['water','Полить'],['sway','Качнуть'],['knock','Постучать'],['land','Позвать'],['greet','Поздороваться'],['brew','Заварить'],['feed','Угостить'],['rock','Покачать'],['shelter','Зажечь']];
await mkdir(at('ui'),{recursive:true});await mkdir(at('review'),{recursive:true});
const blank=(w,h,color='#00000000')=>sharp({create:{width:w,height:h,channels:4,background:color}});
async function stats(input){const{data,info}=await sharp(input).ensureAlpha().raw().toBuffer({resolveWithObject:true});let left=info.width,top=info.height,right=-1,bottom=-1,transparent=0,opaque=0;const alpha=Buffer.alloc(info.width*info.height);for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){const a=data[(y*info.width+x)*4+3];alpha[y*info.width+x]=a;if(a===0)transparent++;if(a===255)opaque++;if(a>=64){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y)}}return{width:info.width,height:info.height,transparentPixels:transparent,opaquePixels:opaque,alphaSha256:sha(alpha),alphaBounds:{left,top,width:right-left+1,height:bottom-top+1}};}
const{data,info}=await sharp(at('source/ui/actions-atlas.png')).ensureAlpha().raw().toBuffer({resolveWithObject:true});
if(info.width!==info.height||info.width%3)throw Error('UI atlas must be square with3×3equal cells');
for(let i=0;i<data.length;i+=4){if(data[i+3]<=12)data[i]=data[i+1]=data[i+2]=data[i+3]=0;else if(data[i+3]>=248)data[i+3]=255;}
const atlas=await sharp(data,{raw:{width:info.width,height:info.height,channels:4}}).png().toBuffer(),cell=info.width/3,tiles=[];let maxW=0,maxH=0;
for(let i=0;i<9;i++){
 const tile=await sharp(atlas).extract({left:(i%3)*cell,top:Math.floor(i/3)*cell,width:cell,height:cell}).png().toBuffer(),b=(await stats(tile)).alphaBounds;
 const crop={left:Math.max(0,b.left-8),top:Math.max(0,b.top-8),width:Math.min(cell,b.left+b.width+8)-Math.max(0,b.left-8),height:Math.min(cell,b.top+b.height+8)-Math.max(0,b.top-8)};
 const cropped=await sharp(tile).extract(crop).png().toBuffer();tiles.push({cropped,crop});maxW=Math.max(maxW,crop.width);maxH=Math.max(maxH,crop.height);
}
const report={status:'draft-not-approved',source:'source/ui/actions-atlas.png',cellSize:cell,normalCanvas:[768,256],commonSourceCanvas:[maxW,maxH],recipe:'Crop alpha bounds plus8px safety margin; translate into one shared maximum-size source canvas; same whole-asset scaling for every control. No lettering overlay/stretch. Pressed brightness.88/saturation.98; disabled brightness.96/saturation.22.',files:[],controls:{},sources:[]};
for(let i=0;i<controls.length;i++){
 const[id,label]=controls[i],{cropped,crop}=tiles[i];
 const common=await blank(maxW,maxH).composite([{input:cropped,left:Math.floor((maxW-crop.width)/2),top:Math.floor((maxH-crop.height)/2)}]).png().toBuffer();
 const normal=await sharp(common).resize(768,256,{fit:'contain',background:'#00000000'}).png().toBuffer();let alphaHash;
 for(const state of ['normal','pressed','disabled']){
  let pipeline=sharp(normal);if(state==='pressed')pipeline=pipeline.modulate({brightness:.88,saturation:.98});if(state==='disabled')pipeline=pipeline.modulate({brightness:.96,saturation:.22});
  const bytes=await pipeline.webp({quality:95,alphaQuality:100,effort:6}).toBuffer(),measured=await stats(bytes),name=`ui/${id}${state==='normal'?'':'-'+state}.webp`;
  if(!measured.transparentPixels||!measured.opaquePixels)throw Error('Control requires real alpha and opaque lettering: '+id);
  if(alphaHash&&alphaHash!==measured.alphaSha256)throw Error('Control state alpha shifted: '+id);alphaHash=measured.alphaSha256;
  await writeFile(at(name),bytes);report.files.push({path:name,label,state,bytes:bytes.length,sha256:sha(bytes),...measured});
 }
 report.controls[id]={label,cell:[i%3,Math.floor(i/3)],crop,displaySize:[150,50],requiresAccessibleLabel:true};
}
for(const[name,color]of[['dark','#162a1d'],['cream','#f4e3c4']]){
 const layers=[];for(let i=0;i<controls.length;i++)layers.push({input:await sharp(at('ui/'+controls[i][0]+'.webp')).resize(384,128).png().toBuffer(),left:(i%3)*384,top:Math.floor(i/3)*160+16});
 await blank(1152,480,color).composite(layers).png().toFile(at(`review/ui-normal-${name}.png`));
}
const layers=[];for(let i=0;i<controls.length;i++)for(const[j,state]of['normal','pressed','disabled'].entries())layers.push({input:await sharp(at(`ui/${controls[i][0]}${state==='normal'?'':'-'+state}.webp`)).resize(150,50).png().toBuffer(),left:j*150,top:i*50});
await blank(450,450,'#162a1d').composite(layers).png().toFile(at('review/ui-states-150.png'));
for(const file of ['source/ui/actions-atlas.png','source/ui/pet-reference.webp','source/ui/prompts.json']){let b=await readFile(at(file));if(file.endsWith('.json'))b=Buffer.from(b.toString('utf8').replace(/\r\n/g,'\n'));report.sources.push({path:file,bytes:b.length,sha256:sha(b)})}
await writeFile(at('review/ui-report.json'),JSON.stringify(report,null,2)+'\n');
console.log(`Exported ${report.files.length} contextual-control WebPs (${report.files.reduce((s,f)=>s+f.bytes,0)} bytes); 9 exact Russian labels, identical state alpha.`);
