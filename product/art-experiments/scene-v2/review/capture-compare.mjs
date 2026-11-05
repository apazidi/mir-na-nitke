import {fileURLToPath,pathToFileURL} from 'node:url';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE?pathToFileURL(process.env.PLAYWRIGHT_MODULE).href:'playwright');
const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
try{const page=await browser.newPage({viewport:{width:852,height:980},deviceScaleFactor:1});await page.goto(new URL('./compare-before.html',import.meta.url).href);await page.locator('img').evaluateAll(xs=>Promise.all(xs.map(x=>x.decode())));await page.screenshot({path:fileURLToPath(new URL('./comparison-before.png',import.meta.url)),fullPage:true});}finally{await browser.close();}
