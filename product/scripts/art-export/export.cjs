const sharp=require('sharp');
const fs=require('node:fs/promises');
const path=require('node:path');
if (!process.argv[2]) throw Error('Usage: node export.cjs <item-package-directory>');
const root=path.resolve(process.argv[2]);
const blank=(w,h,bg='#00000000')=>sharp({create:{width:w,height:h,channels:4,background:bg}});
async function main(){
 const spec=JSON.parse(await fs.readFile(path.join(root,'source/export.json'),'utf8'));
 if(spec.schemaVersion!==1 || JSON.stringify(spec.logicalSize)!=='[1024,1820]' || !Array.isArray(spec.stages) || spec.stages.length<4 || spec.stages.length>8) throw Error('Invalid art export specification');
 const {width,height,left,top}=spec.placement??{};
 if(![width,height,left,top].every(Number.isSafeInteger) || width<1 || height<1 || left<0 || top<0 || left+width>1024 || top+height>1820) throw Error('Invalid placement rectangle');
 const outputs=new Set();
 for(const stage of spec.stages){
  if(!/^master-[a-z0-9-]+\.png$/.test(stage.source) || !/^stage-\d\d\.webp$/.test(stage.output) || outputs.has(stage.output)) throw Error('Invalid export filenames');
  outputs.add(stage.output);
 }
 await fs.mkdir(path.join(root,'art'),{recursive:true});
 await fs.mkdir(path.join(root,'review'),{recursive:true});
 const report={artboard:[1024,1820],productionStatus:'draft',missingStages:[],sources:[]};
 for(const {source:src,output:out} of spec.stages){
  const input=path.join(root,'source',src); const metadata=await sharp(input).metadata();
  const image=await sharp(input).resize(width,height,{fit:'contain',background:'#00000000'}).png().toBuffer();
  await blank(1024,1820).composite([{input:image,left,top}]).webp({quality:94,alphaQuality:100}).toFile(path.join(root,'art',out));
  const {data,info}=await sharp(input).ensureAlpha().raw().toBuffer({resolveWithObject:true});let transparent=0,opaque=0;
  for(let i=3;i<data.length;i+=4){if(data[i]===0)transparent++; if(data[i]===255)opaque++;}
  if(!transparent || !opaque)throw Error('Expected real transparent sprite');
  report.sources.push({file:src,width:metadata.width,height:metadata.height,hasAlpha:metadata.hasAlpha,transparentPixels:transparent,opaquePixels:opaque,totalPixels:info.width*info.height});
 }
 await fs.copyFile(path.join(root,'art',spec.stages.at(-1).output),path.join(root,'art/finished.webp'));
 const checker=Buffer.from(`<svg width="512" height="910"><defs><pattern id="c" width="32" height="32" patternUnits="userSpaceOnUse"><rect width="32" height="32" fill="#dedad0"/><path d="M0 0h16v16H0zM16 16h16v16H16z" fill="#f4f0e7"/></pattern></defs><rect width="512" height="910" fill="url(#c)"/></svg>`);
 const panels=[];
 for(const [i,f]of spec.stages.map(s=>s.output).entries()){
 const image=await sharp(path.join(root,'art',f)).resize(512,910).png().toBuffer();
 panels.push({input:await sharp(checker).composite([{input:image}]).png().toBuffer(),left:i*512,top:0});}
 await blank(512*spec.stages.length,910).composite(panels).webp({quality:92}).toFile(path.join(root,'review/contact-sheet.webp'));
 for(const[w,h]of [[360,800],[390,844],[430,932]]){
  const sprite=await sharp(path.join(root,'art/finished.webp')).resize(w,h,{fit:'contain',background:'#00000000'}).png().toBuffer();
  await blank(w,h,'#e8e2ca').composite([{input:sprite}]).webp({quality:92}).toFile(path.join(root,`review/phone-${w}x${h}.webp`));
 }
 for(const [name,color] of [['dark','#18251c'],['cream','#f8ecd4']]){
  const diagnostic=[];
  for(const [i,src] of spec.stages.map(s=>s.source).entries()){
   const sprite=await sharp(path.join(root,'source',src)).resize(600,656).png().toBuffer();
   diagnostic.push({input:sprite,left:600*i,top:0});
  }
  await blank(600*spec.stages.length,656,color).composite(diagnostic).png().toFile(path.join(root,`review/alpha-${name}.png`));
 }
 await fs.writeFile(path.join(root,'review/asset-report.json'),JSON.stringify(report,null,2)+'\n');
}
main().catch(e=>{console.error(e);process.exitCode=1});




