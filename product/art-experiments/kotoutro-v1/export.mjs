/** Local deterministic exports and explicitly non-gameplay composition studies. */
import sharp from 'sharp';
import {readFile, writeFile, readdir, mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('./',import.meta.url));
const at=p=>path.join(root,p), sha=b=>createHash('sha256').update(b).digest('hex');
const ids=['kot-cat','kot-coffee','kot-duck','kot-chair','kot-leaf-house'];
// Reviewed atlas floor corrections, in fixed1024-canvas pixels. Translation only, no fitting.
const stageOffsetY={'kot-cat':[35,33,1,0],'kot-coffee':[-25,-24,0,0],'kot-duck':[10,6,1,0],'kot-chair':[2,1,0,0],'kot-leaf-house':[-83,-84,1,0]};
const layout=JSON.parse(await readFile(at('layout.json')));
await mkdir(at('exports'),{recursive:true});await mkdir(at('review'),{recursive:true});
const report={status:'draft-not-approved',artboard:[1024,1820],sharp:sharp.versions,recipe:{alphaNoiseFloor:12,opaqueThreshold:248,webp:{quality:95,alphaQuality:100,effort:6},stages:'Equal 2×2 atlas cells; entire square resized to1024; placed at(0,440) on transparent1024×1820 artboard. No per-stage trim or fit.'},files:[],sources:[],items:{},compositionStudies:[]};
const blank=(w,h,bg='#00000000')=>sharp({create:{width:w,height:h,channels:4,background:bg}});
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
async function emit(name,input,transparent=true){
 const bytes=await sharp(input).webp({quality:95,alphaQuality:100,effort:6}).toBuffer();
 const measured=await stats(bytes);
 if(transparent&&(!measured.transparentPixels||!measured.opaquePixels))throw Error('Output must have real alpha and solid subject: '+name);
 await writeFile(at('exports/'+name),bytes);
 report.files.push({path:'exports/'+name,bytes:bytes.length,sha256:sha(bytes),transparent,...measured});
 return bytes;
}
const checker=(w,h)=>Buffer.from(`<svg width="${w}" height="${h}"><defs><pattern id="c" width="32" height="32" patternUnits="userSpaceOnUse"><rect width="32" height="32" fill="#dedad0"/><path d="M0 0h16v16H0zM16 16h16v16H16z" fill="#f6f1e6"/></pattern></defs><rect width="100%" height="100%" fill="url(#c)"/></svg>`);
for(const lighting of ['day','evening']){
 const data=await sharp(at(`source/meadow-${lighting}-master.png`)).resize(1024,1820,{fit:'fill'}).png().toBuffer();
 await emit(`meadow-${lighting}.webp`,data,false);
}
for(const id of ids){
 const source=`source/${id}-atlas${['kot-cat','kot-duck'].includes(id)?'-clean':''}.png`,atlas=await clean(at(source)),meta=await sharp(atlas).metadata();
 if(meta.width!==meta.height||meta.width%2)throw Error('Atlas must have four equal square cells: '+id);
 const cell=meta.width/2,contacts=[],stages=[];
 for(let i=0;i<4;i++){
  const offsetY=stageOffsetY[id][i];
  const rawTile=await sharp(atlas).extract({left:(i%2)*cell,top:Math.floor(i/2)*cell,width:cell,height:cell}).resize(1024,1024).png().toBuffer();
  let tile=rawTile;
  if(offsetY){
   const extended=await sharp(rawTile).extend({top:Math.max(0,offsetY),bottom:Math.max(0,-offsetY),left:0,right:0,background:'#00000000'}).png().toBuffer();
   tile=await sharp(extended).extract({left:0,top:Math.max(0,-offsetY),width:1024,height:1024}).png().toBuffer();
  }
  const stage=await blank(1024,1820).composite([{input:tile,left:0,top:440}]).png().toBuffer();
  await emit(`${id}-stage-0${i}.webp`,stage);
  stages.push({index:i,at:[0,1/3,2/3,1][i],fixedCanvasOffset:[0,offsetY],tile:await stats(tile)});
  contacts.push({input:await sharp(tile).resize(320,320).png().toBuffer(),left:i*320,top:0});
  if(i===3){await emit(`${id}-finished.webp`,tile);report.items[id]={source,cellSize:cell,stages,finished:await stats(tile)};}
 }
 await sharp(checker(1280,320)).composite(contacts).png().toFile(at(`review/${id}-contact.png`));
 for(const[name,color]of[['dark','#162a1d'],['cream','#f4e3c4']])await sharp(at(`exports/${id}-finished.webp`)).resize(512,512).flatten({background:color}).png().toFile(at(`review/${id}-alpha-${name}.png`));
}
for(const[name,color]of[['dark','#162a1d'],['cream','#f4e3c4']]){
 const images=[];for(const[i,id]of ids.entries())images.push({input:await sharp(at(`exports/${id}-finished.webp`)).resize(256,256).png().toBuffer(),left:i*256,top:0});
 await blank(1280,256,color).composite(images).png().toFile(at(`review/finished-alpha-${name}.png`));
}
async function composition(width,height,count,lighting,guest=false){
 const selected=layout.slots.filter(s=>ids.slice(0,count).includes(s.id));
 if(guest)selected.push(layout.reservedVisitor);
 const layers=[];const bounds=[];
 for(const slot of selected.sort((a,b)=>a.z-b.z)){
  const source=slot.source||`exports/${slot.id}-finished.webp`,size=Math.round(width*.5*slot.scale);
  let sprite=sharp(at(source)).resize(size,size,{fit:'contain',background:'#00000000'});
  if(lighting==='evening')sprite=sprite.modulate({brightness:.79,saturation:.8});
  const data=await sprite.png().toBuffer(),left=Math.round(slot.x*width-size/2),top=Math.round(slot.y*height-size/2),b=(await stats(data)).alphaBounds;
  if(left+b.left<0||top+b.top<0||left+b.left+b.width>width||top+b.top+b.height>height)throw Error('Visible composition bounds overflow: '+slot.id);
  // Reproduce the world's clipping of transparent canvas margins, never fit a silhouette.
  const crop={left:Math.max(0,-left),top:Math.max(0,-top),width:Math.min(width,left+size)-Math.max(0,left),height:Math.min(height,top+size)-Math.max(0,top)};
  layers.push({input:await sharp(data).extract(crop).png().toBuffer(),left:Math.max(0,left),top:Math.max(0,top)});
  bounds.push({id:slot.id,left:left+b.left,top:top+b.top,width:b.width,height:b.height});
 }
 const filename=`review/scene-${lighting}-${count}${guest?'-visitor':''}-${width}.png`;
 await sharp(at(`exports/meadow-${lighting}.webp`)).resize(width,height,{fit:'cover'}).composite(layers).png().toFile(at(filename));
 report.compositionStudies.push({path:filename,viewport:[width,height],count,guest,lighting,bounds,kind:'asset-composition-study-not-game-screenshot'});
}
for(const lighting of ['day','evening']){
 for(const count of [0,1,3,5])await composition(390,844,count,lighting);
 await composition(390,844,5,lighting,true);
 for(const[w,h]of[[360,800],[430,932]])await composition(w,h,5,lighting);
}
async function sources(directory){for(const entry of await readdir(at(directory),{withFileTypes:true})){
 const name=directory+'/'+entry.name;if(entry.isDirectory()){await sources(name);continue;}if(!/\.(png|webp|json)$/.test(name))continue;
 let bytes=await readFile(at(name));if(name.endsWith('.json'))bytes=Buffer.from(bytes.toString('utf8').replace(/\r\n/g,'\n'));
 let image={};if(/\.(png|webp)$/.test(name)){const m=await sharp(bytes).metadata();image={width:m.width,height:m.height,format:m.format,channels:m.channels};}
 report.sources.push({path:name,bytes:bytes.length,sha256:sha(bytes),...image});
}}
await sources('source');
const layoutBytes=Buffer.from((await readFile(at('layout.json'),'utf8')).replace(/\r\n/g,'\n'));
report.sources.push({path:'layout.json',bytes:layoutBytes.length,sha256:sha(layoutBytes)});
report.sources.sort((a,b)=>a.path.localeCompare(b.path));
await writeFile(at('review/asset-report.json'),JSON.stringify(report,null,2)+'\n');
console.log(`Exported ${report.files.length} draft WebPs (${report.files.reduce((s,f)=>s+f.bytes,0)} bytes); ${ids.length} items ×4 stages; ${report.compositionStudies.length} composition studies.`);
