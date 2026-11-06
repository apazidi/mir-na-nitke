// Read-only research of the public prototype; fresh browser, normal UI input only.
import {pathToFileURL} from 'node:url';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});
const out=process.env.REFERENCE_EVIDENCE;
await mkdir(out,{recursive:true});
try {
  const page=await browser.newPage({viewport:{width:1280,height:900},ignoreHTTPSErrors:true});
  await page.goto('https://jhollands.co.uk/spaceplan/',{waitUntil:'domcontentloaded',timeout:60000});
  await page.getByText("Sweet deals, I'm just here for the prototype though.",{exact:true}).click();
  const steps=[];
  async function capture(name){
    const state={name,at:new Date().toISOString(),text:(await page.locator('body').innerText()).slice(0,12000)};
    steps.push(state);
    await page.screenshot({path:out+'/'+name+'.png'});
    console.log(JSON.stringify(state));
  }
  await capture('spaceplan-00');
  for(let i=0;i<15;i++) await page.locator('#kinetigen__button-padding').click({delay:100});
  await capture('spaceplan-15-clicks');
  await page.locator('#item__solar').click();
  await capture('spaceplan-first-purchase');
  await page.waitForTimeout(20000);
  await capture('spaceplan-20s-without-input');
  for(let i=0;i<100;i++) await page.locator('#kinetigen__button-padding').click({delay:100});
  await page.locator('#item__potato').click();
  await capture('spaceplan-potato');
  await writeFile(out+'/spaceplan-observation.json',JSON.stringify(steps,null,2));
} finally {await browser.close();}
