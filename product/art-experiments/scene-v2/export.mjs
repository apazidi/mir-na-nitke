/** Deterministic export from single coherent atlases; no independent stage rescaling. */
import sharp from 'sharp';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('./',import.meta.url));
const at=name=>path.join(root,name);
const blank=(w,h,color='#00000000')=>sharp({create:{width:w,height:h,channels:4,background:color}});
const report={schemaVersion:1,status:'draft',baselineApproved:false,tool:'built-in image_gen',alphaCleanup:'Values <=12 set to0; values >=248 set to255; other alpha preserved; RGB zeroed only when alpha=0.',items:{},controls:{},files:[]};
await Promise.all(['exports','ui','review'].map(folder=>mkdir(at(folder),{recursive:true})));
async function clean(input){
 const{data,info}=await sharp(input).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 for(let i=0;i<data.length;i+=4){if(data[i+3]<=12){data[i]=data[i+1]=data[i+2]=data[i+3]=0;}else if(data[i+3]>=248)data[i+3]=255;}
 return sharp(data,{raw:{width:info.width,height:info.height,channels:4}}).png().toBuffer();
}
async function stats(input){
 const{data,info}=await sharp(input).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 let transparent=0,opaque=0,left=info.width,top=info.height,right=-1,bottom=-1;
 for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){
  const a=data[(y*info.width+x)*4+3];if(a===0)transparent++;if(a===255)opaque++;
  if(a>=64){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
 }
 return{width:info.width,height:info.height,transparentPixels:transparent,opaquePixels:opaque,alphaBounds:{left,top,width:right-left+1,height:bottom-top+1},normalizedBounds:[left/info.width,top/info.height,(right+1)/info.width,(bottom+1)/info.height]};
}
async function emit(name,input){
 const target=at(name);await sharp(input).webp({quality:95,alphaQuality:100,effort:6}).toFile(target);
 const bytes=await readFile(target);const info=await stats(target);
 if(!info.transparentPixels||!info.opaquePixels)throw Error('Expected transparent and opaque pixels: '+name);
 report.files.push({path:name,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),...info});
 return target;
}
const checker=(w,h)=>Buffer.from(`<svg width="${w}" height="${h}"><defs><pattern id="c" width="32" height="32" patternUnits="userSpaceOnUse"><rect width="32" height="32" fill="#dedad0"/><path d="M0 0h16v16H0zM16 16h16v16H16z" fill="#f6f1e6"/></pattern></defs><rect width="100%" height="100%" fill="url(#c)"/></svg>`);
async function controls(source,names,size){
 const atlas=await clean(at('source/'+source));const meta=await sharp(atlas).metadata();
 if(meta.width%3)throw Error('Controls require three equal cells');
 const cell=meta.width/3,tiles=[];let left=cell,top=meta.height,right=0,bottom=0;
 for(let i=0;i<3;i++){
  const tile=await sharp(atlas).extract({left:i*cell,top:0,width:cell,height:meta.height}).png().toBuffer();
  tiles.push(tile);const b=(await stats(tile)).alphaBounds;
  left=Math.min(left,b.left);top=Math.min(top,b.top);right=Math.max(right,b.left+b.width);bottom=Math.max(bottom,b.top+b.height);
 }
 const crop={left:Math.max(0,left-8),top:Math.max(0,top-8),width:Math.min(cell,right+8)-Math.max(0,left-8),height:Math.min(meta.height,bottom+8)-Math.max(0,top-8)};
 for(let i=0;i<3;i++){
  const name=names[i];const normal=await sharp(tiles[i]).extract(crop).resize(...size,{fit:'contain',background:'#00000000'}).png().toBuffer();
  await emit(`ui/${name}.webp`,normal);
  await emit(`ui/${name}-pressed.webp`,await sharp(normal).modulate({brightness:.88,saturation:.98}).png().toBuffer());
  await emit(`ui/${name}-disabled.webp`,await sharp(normal).modulate({brightness:.96,saturation:.22}).png().toBuffer());
  report.controls[name]={source,crop,canvas:size,...await stats(normal)};
 }
}
await controls('nav-atlas-clean.png',['workshop','meadow','projects'],[512,384]);
await controls('actions-atlas.png',['knit','complete','pet'],[768,256]);
for(const id of ['house','tree','butterfly']){
 const source=`source/${id}-atlas.png`,atlas=await clean(at(source)),meta=await sharp(atlas).metadata();
 if(meta.width!==meta.height||meta.width%2)throw Error('Item atlas must be square, two equal cells each way');
 const cell=meta.width/2;const contacts=[];
 for(let i=0;i<4;i++){
  // Every state uses the entire same-size atlas cell: never trim or fit states separately.
  const tile=await sharp(atlas).extract({left:(i%2)*cell,top:Math.floor(i/2)*cell,width:cell,height:cell}).resize(1024,1024).png().toBuffer();
  const stage=await blank(1024,1820).composite([{input:tile,left:0,top:440}]).png().toBuffer();
  await emit(`exports/${id}-stage-0${i}.webp`,stage);
  if(i===3){await emit(`exports/${id}-finished.webp`,tile);report.items[id]={source,cellSize:cell,constructionAt:[0,.35,.7,1],workshop:{canvas:[1024,1820],cellPlacement:[0,440,1024,1024]},finished:{canvas:[1024,1024],...await stats(tile)}};}
  const panel=await sharp(checker(384,384)).composite([{input:await sharp(tile).resize(384,384).png().toBuffer()}]).png().toBuffer();
  contacts.push({input:panel,left:i*384,top:0});
 }
 await blank(1536,384).composite(contacts).png().toFile(at(`review/${id}-contact.png`));
 for(const [name,color] of [['dark','#162a1d'],['cream','#f4e3c4']]){
  const panels=[];
  for(let i=0;i<4;i++){
   const stage=await sharp(at(`exports/${id}-stage-0${i}.webp`)).extract({left:0,top:440,width:1024,height:1024}).resize(384,384).png().toBuffer();
   panels.push({input:stage,left:i*384,top:0});
  }
  await blank(1536,384,color).composite(panels).png().toFile(at(`review/${id}-alpha-${name}.png`));
 }
}
for(const [name,color] of [['dark','#162a1d'],['cream','#f4e3c4']]){
 const panels=[];for(const [i,id]of ['workshop','meadow','projects','knit','complete','pet'].entries()){
  const input=await sharp(at(`ui/${id}.webp`)).resize(360,270,{fit:'contain',background:'#00000000'}).png().toBuffer();
  panels.push({input,left:(i%3)*360,top:Math.floor(i/3)*270});
 }
 await blank(1080,540,color).composite(panels).png().toFile(at(`review/controls-alpha-${name}.png`));
}
await writeFile(at('review/asset-report.json'),JSON.stringify(report,null,2)+'\n');
console.log(`Exported ${report.files.length} draft WebPs. ${report.files.reduce((sum,f)=>sum+f.bytes,0)} bytes. Alpha verified for every output.`);
