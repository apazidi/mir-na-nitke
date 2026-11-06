/** One exploratory art candidate. Re-export only; does not generate or edit artwork. */
// Optional absolute module URL reuses an already-installed local Sharp without package installation.
const sharp=(await import(process.env.CRAFT_SHARP_MODULE??'sharp')).default;
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('./',import.meta.url));
const at=p=>path.join(root,p);
await mkdir(at('exports'),{recursive:true});
await mkdir(at('review'),{recursive:true});
const source=await readFile(at('source/meadow-day-master.png'));
const metadata=await sharp(source).metadata();
const candidate=await sharp(source).resize(1024,1820,{fit:'cover',position:'centre'}).webp({quality:94,effort:6}).toBuffer();
await writeFile(at('exports/meadow-day.webp'),candidate);
const frames=[];
for(const [width,height]of [[360,800],[390,844],[430,932]]){
 const frame=await sharp(candidate).resize(width,height,{fit:'cover',position:'centre'}).png().toBuffer();
 const name=`review/meadow-empty-${width}.png`;
 await writeFile(at(name),frame);
 frames.push({path:name,width,height});
}
await writeFile(at('asset-report.json'),JSON.stringify({status:'draft-not-approved',candidateCount:1,source:{path:'source/meadow-day-master.png',width:metadata.width,height:metadata.height,bytes:source.length,sha256:createHash('sha256').update(source).digest('hex')},export:{path:'exports/meadow-day.webp',width:1024,height:1820,bytes:candidate.length,sha256:createHash('sha256').update(candidate).digest('hex'),resize:'cover; center crop, preserve aspect ratio',webp:{quality:94,effort:6}},reviewFrames:frames},null,2)+'\n');
// Explicitly an art composition study, not a screenshot of implemented game behavior.
const empty=await sharp(candidate).resize(390,844,{fit:'cover'}).png().toBuffer();
const flower=await sharp(at('../../../play-preview/product/content/items/meadow-flower/art/finished.webp')).trim().resize(228,292,{fit:'inside'}).png().toBuffer();
const flowerMeta=await sharp(flower).metadata();
const placed=await sharp(empty).composite([{input:flower,left:Math.round((390-flowerMeta.width)/2),top:Math.round(675-flowerMeta.height)}]).png().toBuffer();
await writeFile(at('review/meadow-with-flower-390.png'),placed);
const reference=await sharp(at('../../../design-system/reference-v4.webp')).resize(390,844,{fit:'contain',background:'#20261f'}).png().toBuffer();
const labels=Buffer.from('<svg width="1170" height="48"><rect width="1170" height="48" fill="#20261f"/><g fill="#f8e6c8" font-family="Arial" font-size="17"><text x="16" y="29">Reference · 390 × 844</text><text x="406" y="29">Draft clearing · 390 × 844</text><text x="796" y="29">Composition study · 390 × 844</text></g></svg>');
await sharp({create:{width:1170,height:892,channels:4,background:'#20261f'}}).composite([{input:labels,left:0,top:0},{input:reference,left:0,top:48},{input:empty,left:390,top:48},{input:placed,left:780,top:48}]).png().toFile(at('review/reference-empty-flower-390.png'));
console.log(`Exported one draft meadow, ${candidate.length} bytes, 1024×1820; 3 native-size review frames.`);
