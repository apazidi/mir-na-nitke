// Cross-platform export. Artwork comes from retained raster masters, never SVG stand-ins.
const fs = require('node:fs/promises');
const path = require('node:path');
const assert = require('node:assert/strict');
const {createHash} = require('node:crypto');
const sharp = require('sharp');
const root = __dirname;
const svg = (w,h,body) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">${body}</svg>`);
const blank = (w,h) => sharp({create:{width:w,height:h,channels:4,background:'#00000000'}});
const hash = b => createHash('sha256').update(b).digest('hex');
async function rgba(file) { return sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true}); }
function alphaStats(data, info) {
  let visible=0, transparent=0, minX=info.width, minY=info.height, maxX=-1, maxY=-1;
  for(let y=0;y<info.height;y++) for(let x=0;x<info.width;x++) {
    const a=data[(y*info.width+x)*4+3];
    if(a===0) transparent++;
    if(a>32) {visible++; minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);}
  }
  return {visible,transparent,bounds:[minX,minY,maxX,maxY]};
}
async function main() {
  const m=JSON.parse((await fs.readFile(path.join(root,'source/master.json'),'utf8')).replace(/^\uFEFF/,''));
  const [w,h]=m.artboard, [sw,sh]=m.sourceCanvas;
  assert.deepEqual([w,h],[1024,1820]);
  assert.deepEqual(m.stages.map(s=>s.progress),[0,25,50,75,100]);
  await fs.mkdir(path.join(root,'exports'),{recursive:true});
  await fs.mkdir(path.join(root,'review'),{recursive:true});
  const sources={}, sourceReport=[];
  for(const [id,name] of Object.entries(m.sources)) {
    assert(/^[a-z0-9-]+\.png$/.test(name),`Unsafe source name: ${name}`);
    const file=path.join(root,'source',name), bytes=await fs.readFile(file);
    sourceReport.push({id,file:name,sha256:hash(bytes)});
    sources[id]=bytes;
  }
  const hero=await rgba(sources.hero);
  assert.deepEqual([hero.info.width,hero.info.height],[sw,sh]);
  const stats=alphaStats(hero.data,hero.info);
  assert(stats.visible>100000 && stats.transparent>100000,'Hero must contain both real art and true transparency');
  const models={hero:await sharp(sources.hero).png().toBuffer()};
  for(const id of ['cup','body']) {
    const edited=await rgba(sources[id]);
    assert.deepEqual([edited.info.width,edited.info.height],[sw,sh],`${id} canvas drift`);
    // An anchored edit may drift. Replace the entire lower contact region with original hero pixels.
    const offset=m.preserveHeroBelow*sw*4;
    hero.data.copy(edited.data,offset,offset);
    assert(edited.data.subarray(offset).equals(hero.data.subarray(offset)),`${id}: contact pixels changed`);
    models[id]=await sharp(edited.data,{raw:edited.info}).png().toBuffer();
  }
  const headMask=svg(sw,sh,`<path d="${m.headMaskPath}" fill="white"/>`);
  models.heroWithoutEars=await sharp(models.hero).composite([{input:headMask,blend:'dest-in'}]).png().toBuffer();
  const p=m.placement;
  const background=await sharp(sources.workshop).resize(w,h,{fit:'cover'}).removeAlpha().png().toBuffer();
  const [cx,cy]=p.contact;
  // Two soft occlusion lobes connect the planted paws/body to the mat. No shadow in the sprite.
  const shadow=svg(w,h,`<defs><filter id="soft" x="-50%" y="-150%" width="200%" height="400%"><feGaussianBlur stdDeviation="18"/></filter><filter id="tight" x="-50%" y="-150%" width="200%" height="400%"><feGaussianBlur stdDeviation="5"/></filter></defs><ellipse cx="${cx}" cy="${cy-2}" rx="245" ry="43" fill="#53341f" opacity=".32" filter="url(#soft)"/><ellipse cx="${cx}" cy="${cy-5}" rx="184" ry="14" fill="#4a2c18" opacity=".44" filter="url(#tight)"/>`);
  const frames=[], sprites=[], report=[];
  async function save(name,buffer,{png=false}={}) {
    assert(/^(stage-(000|025|050|075|100)|golden-frame|finished-sprite|meadow-(day|evening))$/.test(name),`Unexpected filename: ${name}`);
    const output=await sharp(buffer).webp({quality:90,alphaQuality:100}).toBuffer();
    const meta=await sharp(output).metadata();
    assert.deepEqual([meta.width,meta.height],[w,h],`${name} dimensions`);
    assert(output.length<=1500000,`${name} exceeds 1.5 MB`);
    if(name==='finished-sprite') {
      const decoded=await rgba(output), a=alphaStats(decoded.data,decoded.info);
      assert(a.visible>100000 && a.transparent>100000 && decoded.data[3]===0,'Empty/opaque sprite');
      assert(meta.hasAlpha,'WebP lost alpha');
    }
    await fs.writeFile(path.join(root,`exports/${name}.webp`),output);
    if(png) await fs.writeFile(path.join(root,`exports/${name}.png`),await sharp(buffer).png().toBuffer());
    report.push({file:`${name}.webp`,width:w,height:h,bytes:output.length,sha256:hash(output)});
  }
  for(const s of m.stages) {
    const pieces=[];
    if(s.source!=='empty') {
      assert(models[s.source],`Unknown stage source: ${s.source}`);
      pieces.push({input:await sharp(models[s.source]).resize(p.width,p.height).png().toBuffer(),left:p.left,top:p.top});
    }
    const sprite=await blank(w,h).composite(pieces).png().toBuffer();
    const scene=await sharp(background).composite([...(pieces.length?[{input:shadow}]:[]),{input:sprite}]).png().toBuffer();
    sprites.push(sprite); frames.push(scene);
    await save(`stage-${String(s.progress).padStart(3,'0')}`,scene);
  }
  await save('golden-frame',frames[4]);
  await save('finished-sprite',sprites[4],{png:true});
  for(const name of ['day','evening']) await save(`meadow-${name}`,await sharp(sources[name]).resize(w,h,{fit:'cover'}).removeAlpha().png().toBuffer());
  const panels=[];
  for(let i=0;i<6;i++) {
    const x=(i%3)*512,y=Math.floor(i/3)*512;
    const label=svg(512,40,`<text x="16" y="28" font-family="sans-serif" font-size="24" fill="#483729">${i<5?m.stages[i].progress+'%':'ALPHA SPRITE'}</text>`);
    if(i===5) {
      let squares='';for(let by=0;by<512;by+=24)for(let bx=0;bx<512;bx+=24)squares+=`<rect x="${bx}" y="${by}" width="24" height="24" fill="${(bx/24+by/24)%2?'#fff':'#ddd'}"/>`;
      panels.push({input:svg(512,512,squares),left:x,top:y});
    }
    panels.push({input:await sharp(i<5?frames[i]:sprites[4]).resize(260,462).png().toBuffer(),left:x+126,top:y+40},{input:label,left:x,top:y});
  }
  await sharp({create:{width:1536,height:1024,channels:4,background:'#f4ebd9'}}).composite(panels).png().toFile(path.join(root,'review/contact-sheet.png'));
  for(const [width,height] of [[360,800],[390,844],[430,932]]) {
    const panels=[];
    for(let i=0;i<5;i++) panels.push({input:await sharp(frames[i]).resize(width,height,{fit:'contain',background:'#f4ebd9'}).png().toBuffer(),left:i*width,top:0});
    await sharp({create:{width:width*5,height,channels:4,background:'#f4ebd9'}}).composite(panels).png().toFile(path.join(root,`review/stages-${width}x${height}.png`));
  }
  // Identical contact pixels survive all four nonempty stages. Record the source patch hash.
  const footer=hero.data.subarray(m.preserveHeroBelow*sw*4);
  const qa={revision:m.revision,status:m.status,exporter:'Node/Sharp',node:process.version,sharp:sharp.versions,sourceReport,contactAnchor:p.contact,preservedContactPatch:{fromY:m.preserveHeroBelow,sha256:hash(footer)},heroAlpha:stats,exports:report};
  await fs.writeFile(path.join(root,'review/asset-report.json'),JSON.stringify(qa,null,2)+'\n');
  await fs.writeFile(path.join(root,'review/webp-report.json'),JSON.stringify(report,null,2)+'\n');
  console.log(`Exported ${report.length} assets; ${report.reduce((n,f)=>n+f.bytes,0)} bytes; master revision ${m.revision}`);
}
main().catch(e=>{console.error(e);process.exitCode=1});
