// Browser evidence only. Run export.cjs first; this never overwrites exported artwork.
const fs = require('node:fs/promises');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const sharp = require('sharp');
const {chromium} = require('playwright');
const root = __dirname;
(async () => {
  const master=JSON.parse((await fs.readFile(path.join(root,'source/master.json'),'utf8')).replace(/^\uFEFF/,''));
  const report=JSON.parse(await fs.readFile(path.join(root,'review/webp-report.json'),'utf8'));
  const meadowPanels = [];
  const scale=master.meadowPlacement.scale;
  const [cx,cy]=master.meadowPlacement.contact;
  const left=Math.round(cx-master.placement.contact[0]*scale);
  const top=Math.round(cy-master.placement.contact[1]*scale);
  const placed=await sharp(path.join(root,'exports/finished-sprite.png')).resize(Math.round(1024*scale),Math.round(1820*scale)).png().toBuffer();
  const shadow=Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1820"><defs><filter id="s" x="-50%" y="-150%" width="200%" height="400%"><feGaussianBlur stdDeviation="13"/></filter></defs><ellipse cx="${cx}" cy="${cy}" rx="154" ry="23" fill="#24331b" opacity=".48" filter="url(#s)"/></svg>`);
  for(const name of ['day','evening']) {
    const file=path.join(root,`exports/meadow-${name}.webp`);
    await fs.access(file);
    const composed=await sharp(file).composite([{input:shadow},{input:placed,left,top}]).png().toBuffer();
    const panel=await sharp(composed).resize(390,693).png().toBuffer();
    meadowPanels.push({input:panel,left:meadowPanels.length*390,top:0});
  }
  if(meadowPanels.length) await sharp({create:{width:meadowPanels.length*390,height:693,channels:4,background:'#f4ebd9'}}).composite(meadowPanels).png().toFile(path.join(root,'review/meadow-alpha-proof.png'));
  const browser = await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
  const captures=[];
  try {
    for(const [width,height] of [[360,800],[390,844],[430,932]]) {
      const page = await browser.newPage({viewport:{width,height},deviceScaleFactor:1});
      for(const stage of ['000','025','050','075','100']) {
        await page.goto(pathToFileURL(path.join(root,'review.html')).href+'?stage='+stage);
        await page.locator('#art').evaluate(im=>im.decode());
        const geometry = await page.evaluate(()=>({w:innerWidth,scroll:document.documentElement.scrollWidth,h:innerHeight}));
        if(geometry.scroll!==width) throw Error('Horizontal overflow');
        await page.screenshot({path:path.join(root,`review/phone-${width}x${height}-${stage}.png`)});
        captures.push({width,height,stage,scrollWidth:geometry.scroll});
      }
      await page.close();
    }
  } finally {await browser.close();}
  // Actual browser captures juxtaposed with the approved art reference for review.
  const reference = await sharp(path.join(root,'../../../design-system/reference-v4.webp')).resize(390,844,{fit:'contain',background:'#f4ebd9'}).png().toBuffer();
  await sharp({create:{width:780,height:844,channels:4,background:'#f4ebd9'}}).composite([
    {input:reference,left:0,top:0},
    {input:path.join(root,'review/phone-390x844-100.png'),left:390,top:0}
  ]).png().toFile(path.join(root,'review/reference-comparison-390.png'));
  await fs.writeFile(path.join(root,'review/capture-report.json'),JSON.stringify({revision:master.revision,captures},null,2)+'\n');
  console.log(`Captured ${captures.length} phone views and day/evening placement proof.`);
})().catch(e=>{console.error(e);process.exitCode=1});
