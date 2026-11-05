const sharp=require('sharp');
const fs=require('node:fs/promises');
const path=require('node:path');
const root=__dirname;
const blank=(w,h,bg='#00000000')=>sharp({create:{width:w,height:h,channels:4,background:bg}});
async function main(){
 const report={artboard:[1024,1820],productionStatus:'draft',missingStages:[],sources:[]};
 for(const [src,out] of [['master-00.png','stage-00.webp'],['master-01.png','stage-01.webp'],['master-partial.png','stage-02.webp'],['master-final.png','finished.webp']]){
  const input=path.join(root,'source',src); const metadata=await sharp(input).metadata();
  const image=await sharp(input).resize(820,1100,{fit:'contain',background:'#00000000'}).png().toBuffer();
  await blank(1024,1820).composite([{input:image,left:102,top:430}]).webp({quality:94,alphaQuality:100}).toFile(path.join(root,'art',out));
  const {data,info}=await sharp(input).ensureAlpha().raw().toBuffer({resolveWithObject:true});let transparent=0,opaque=0;
  for(let i=3;i<data.length;i+=4){if(data[i]===0)transparent++; if(data[i]===255)opaque++;}
  if(!transparent || !opaque)throw Error('Expected real transparent sprite');
  report.sources.push({file:src,width:metadata.width,height:metadata.height,hasAlpha:metadata.hasAlpha,transparentPixels:transparent,opaquePixels:opaque,totalPixels:info.width*info.height});
 }
 await fs.copyFile(path.join(root,'art/finished.webp'),path.join(root,'art/stage-03.webp'));
 const checker=Buffer.from(`<svg width="512" height="910"><defs><pattern id="c" width="32" height="32" patternUnits="userSpaceOnUse"><rect width="32" height="32" fill="#dedad0"/><path d="M0 0h16v16H0zM16 16h16v16H16z" fill="#f4f0e7"/></pattern></defs><rect width="512" height="910" fill="url(#c)"/></svg>`);
 const panels=[];
 for(const [i,f]of ['stage-00.webp','stage-01.webp','stage-02.webp','finished.webp'].entries()){
 const image=await sharp(path.join(root,'art',f)).resize(512,910).png().toBuffer();
 panels.push({input:await sharp(checker).composite([{input:image}]).png().toBuffer(),left:i*512,top:0});}
 await blank(2048,910).composite(panels).webp({quality:92}).toFile(path.join(root,'review/contact-sheet.webp'));
 for(const[w,h]of [[360,800],[390,844],[430,932]]){
  const sprite=await sharp(path.join(root,'art/finished.webp')).resize(w,h,{fit:'contain',background:'#00000000'}).png().toBuffer();
  await blank(w,h,'#e8e2ca').composite([{input:sprite}]).webp({quality:92}).toFile(path.join(root,`review/phone-${w}x${h}.webp`));
 }
 for(const [name,color] of [['dark','#18251c'],['cream','#f8ecd4']]){
  const diagnostic=[];
  for(const [i,src] of ['master-00.png','master-01.png','master-partial.png','master-final.png'].entries()){
   const sprite=await sharp(path.join(root,'source',src)).resize(600,656).png().toBuffer();
   diagnostic.push({input:sprite,left:600*i,top:0});
  }
  await blank(2400,656,color).composite(diagnostic).png().toFile(path.join(root,`review/alpha-${name}.png`));
 }
 await fs.writeFile(path.join(root,'review/asset-report.json'),JSON.stringify(report,null,2)+'\n');
}
main().catch(e=>{console.error(e);process.exitCode=1});




