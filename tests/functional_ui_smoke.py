from pathlib import Path
from playwright.sync_api import sync_playwright
import re, os
from visual_guard import ROOT, PAGE, inline_html

html=inline_html()
model=(ROOT/'v4.1/world-model.mjs').read_text()
model=re.sub(r'(?m)^export ', '', model)
js=(ROOT/'v4.1/game.js').read_text()
js=re.sub(r"^import\s+\{[^\n]*\}\s+from\s+'./world-model.mjs';\s*",'',js)
js=model+'\n'+js
with sync_playwright() as p:
 kwargs={'headless':True,'args':['--no-sandbox']}
 if os.getenv('CHROME_PATH'):kwargs['executable_path']=os.getenv('CHROME_PATH')
 br=p.chromium.launch(**kwargs)
 page=br.new_page(viewport={'width':390,'height':844},reduced_motion='reduce')
 errs=[];page.on('pageerror',lambda exc:errs.append(str(exc)))
 page.set_content(html,wait_until='load')
 page.add_script_tag(content=js)
 assert page.evaluate("document.querySelector('#meadow-count').textContent")=='1'
 page.locator('#primary-meadow').click()
 assert page.locator('#view-workshop').is_visible()
 assert page.evaluate("window.__knitV41.state().projects.flower")=='knitting'
 page.evaluate('window.__knitV41.advance(1200)')
 assert page.evaluate("window.__knitV41.state().projects.flower")=='completed'
 page.locator('#work-finished').click()
 assert page.locator('#view-meadow').is_visible()
 assert page.locator('#flower-placed').is_visible()
 assert page.evaluate("window.__knitV41.state().projects.flower")=='living'
 page.screenshot(path=str(ROOT/'design-system'/'latest-v4.1-after-flower.png'),full_page=True)
 page.locator('#view-meadow .tab[data-view=\"atlas\"]').click()
 assert page.locator('#view-atlas').is_visible()
 page.locator('#view-atlas .tab[data-view=\"meadow\"]').click()
 assert page.locator('#view-meadow').is_visible()
 print('logic good, JS console errs',errs, 'placed Flower',page.locator('#flower-placed').get_attribute('src')[:30])
 assert not errs
 br.close()
