// Run after export.ps1. Resolve sharp/playwright from the installed runtime or NODE_PATH.
const fs = require('node:fs/promises');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const sharp = require('sharp');
const {chromium} = require('playwright');
const root = __dirname;
(async () => {
  const report = [];
  const names = (await fs.readdir(path.join(root,'exports'))).filter(n=>n.endsWith('.png'));
  for (const name of names) {
    const input = path.join(root,'exports',name);
    const output = input.replace(/\.png$/,'.webp');
    await sharp(input).webp({quality:90,alphaQuality:100}).toFile(output);
    const m = await sharp(output).metadata();
    if(m.width!==1024 || m.height!==1820) throw Error(`Bad dimensions: ${name}`);
    if(name==='finished-sprite.png' && !m.hasAlpha) throw Error('Missing WebP alpha');
    const bytes = (await fs.stat(output)).size;
    if(bytes>1500000) throw Error(`WebP over 1.5 MB: ${name}`);
    report.push({file:path.basename(output),bytes,width:m.width,height:m.height,hasAlpha:m.hasAlpha});
  }
  await fs.writeFile(path.join(root,'review/webp-report.json'),JSON.stringify(report,null,2)+'\n');
  const meadowPanels = [];
  for(const name of ['day','evening']) {
    const file=path.join(root,`exports/meadow-${name}.webp`);
    try {await fs.access(file)} catch {continue}
    const composed=await sharp(file).composite([{input:path.join(root,'exports/finished-sprite.png')}]).png().toBuffer();
    const panel=await sharp(composed).resize(390,693).png().toBuffer();
    meadowPanels.push({input:panel,left:meadowPanels.length*390,top:0});
  }
  if(meadowPanels.length) await sharp({create:{width:meadowPanels.length*390,height:693,channels:4,background:'#f4ebd9'}}).composite(meadowPanels).png().toFile(path.join(root,'review/meadow-alpha-proof.png'));
  const browser = await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
  try {
    for(const [width,height] of [[360,800],[390,844],[430,932]]) {
      const page = await browser.newPage({viewport:{width,height},deviceScaleFactor:1});
      for(const stage of ['000','025','050','075','100']) {
        await page.goto(pathToFileURL(path.join(root,'review.html')).href+'?stage='+stage);
        await page.locator('#art').evaluate(im=>im.decode());
        const geometry = await page.evaluate(()=>({w:innerWidth,scroll:document.documentElement.scrollWidth,h:innerHeight}));
        if(geometry.scroll!==width) throw Error('Horizontal overflow');
        await page.screenshot({path:path.join(root,`review/phone-${width}x${height}-${stage}.png`)});
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
  console.log(JSON.stringify(report,null,2));
})().catch(e=>{console.error(e);process.exitCode=1});
