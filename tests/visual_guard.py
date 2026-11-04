"""Offline, deterministic visual and layout regression check for v4 design preview.

Images and styles are inlined because the game has no build step and the test
must also run in restricted environments (and does not need live GitHub Pages).
"""
from __future__ import annotations
import argparse, base64, io, json, os, sys
from pathlib import Path
from PIL import Image, ImageChops, ImageFilter, ImageStat
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
PAGE = ROOT / 'v4.1-design'
SOURCE = ROOT / 'v4.1'
SKIN = ROOT / 'design-system' / 'skin-v4.css'
BASELINE = ROOT / 'design-system' / 'baseline-v4.1-provisional.png'
CAPTURE = ROOT / 'design-system' / 'latest-v4.1-preview.png'
SIZES = [(360,800), (390,844), (430,932)]


def inline_html() -> str:
    html = (PAGE/'index.html').read_text(encoding='utf-8')
    css = (SOURCE/'styles.css').read_text(encoding='utf-8')
    skin = SKIN.read_text(encoding='utf-8')
    assert 'class="app-wrap design-v4"' in html, 'The v4 design shell has been removed'
    assert '../design-system/skin-v4.css' in html, 'The shared visual skin is missing'
    assert '<nav class="tabs"' in html
    for file in (SOURCE/'assets').glob('*'):
        if file.suffix.lower() not in ('.webp','.png','.jpg','.jpeg'):
            continue
        mime = 'image/webp' if file.suffix.lower()=='.webp' else ('image/png' if file.suffix.lower()=='.png' else 'image/jpeg')
        html = html.replace('./assets/'+file.name, 'data:'+mime+';base64,'+base64.b64encode(file.read_bytes()).decode('ascii'))
    html=html.replace('<link rel="stylesheet" href="./styles.css">','<style>'+css+'</style>')
    border=ROOT/'design-system/assets/garden-borders.webp'
    if border.exists():html=html.replace('../design-system/assets/garden-borders.webp','data:image/webp;base64,'+base64.b64encode(border.read_bytes()).decode('ascii'))
    html=html.replace('<link rel="stylesheet" href="../design-system/skin-v4.css">','<style>'+skin+'</style>')
    html=html.replace('<script type="module" src="./game.js"></script>','')
    assert '<link rel="stylesheet"' not in html
    return html


def evaluate_geometry(page, width: int, height: int):
    return page.evaluate('''() => {
      function box(s){const el=document.querySelector(s);if(!el) return null;
       const r=el.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom};}
      const allTabs=[...document.querySelectorAll('#view-meadow .tab')].map(x=>x.getBoundingClientRect());
      const visibleUI=[...document.querySelectorAll('#view-meadow button')].filter(x=>x.getClientRects().length);
      return {viewport:innerWidth,scrollWidth:document.documentElement.scrollWidth,
       scene:box('#view-meadow .meadow-scene'),header:box('.app-header'),
       title:box('#view-meadow .section-title'),navbar:box('#view-meadow .tabs'),
       action:box('#view-meadow .meadow-actions'),rabbit:box('#rabbit'),
       tabs:allTabs.map(x=>({w:x.width,h:x.height})),
       labels:visibleUI.filter(x=>x.scrollWidth>x.clientWidth+3).map(x=>x.id||x.className)
      };
    }''')


def compare_snapshot(actual: bytes, baseline: Path) -> float:
    a=Image.open(io.BytesIO(actual)).convert('RGB')
    b=Image.open(baseline).convert('RGB')
    if a.size != b.size:
        raise AssertionError(f'Screenshot geometry changed: {a.size} vs baseline {b.size}')
    a=a.resize((195, round(a.height*195/a.width))).filter(ImageFilter.GaussianBlur(.7))
    b=b.resize(a.size).filter(ImageFilter.GaussianBlur(.7))
    return sum(ImageStat.Stat(ImageChops.difference(a,b)).mean)/3/255


def main():
    ap=argparse.ArgumentParser()
    ap.add_argument('--update-baseline',action='store_true',help='Requires deliberate visual approval; do not use in CI')
    ap.add_argument('--browser-path',default=os.getenv('CHROME_PATH'))
    args=ap.parse_args()
    if args.update_baseline and os.getenv('CI'):
        raise AssertionError('CI cannot change the approved visual baseline')
    html=inline_html()
    errors=[]
    with sync_playwright() as p:
      kwargs={'headless':True,'args':['--no-sandbox','--disable-dev-shm-usage']}
      if args.browser_path:kwargs['executable_path']=args.browser_path
      browser=p.chromium.launch(**kwargs)
      for width,height in SIZES:
        page=browser.new_page(viewport={'width':width,'height':height},device_scale_factor=1,reduced_motion='reduce',locale='ru-RU')
        page.set_content(html,wait_until='load')
        g=evaluate_geometry(page,width,height)
        scene=g['scene'];nav=g['navbar'];title=g['title'];action=g['action']
        if g['scrollWidth']>width+1:errors.append(f'{width}: horizontal overflow {g["scrollWidth"]}')
        if scene['w']/width < .94:errors.append(f'{width}: scene narrower than the design contract')
        if scene['h']/height < .67:errors.append(f'{width}: world occupies too little screen height')
        if scene['y'] > 115:errors.append(f'{width}: large UI chrome pushes the world down')
        if nav['y'] < scene['y'] or nav['bottom']>scene['bottom']+1:errors.append(f'{width}: nav left world frame')
        if action['bottom']>nav['y']+1:errors.append(f'{width}: actions overlap navigation')
        if title['y']<scene['y'] or title['bottom']>scene['y']+135:errors.append(f'{width}: title escaped the top of the scene')
        if g['header']['h']>82:errors.append(f'{width}: header wrapped and became too tall')
        for tab in g['tabs']:
            if tab['w']<55 or tab['h']<42:errors.append(f'{width}: nav touch target too small')
        if g['labels']:errors.append(f'{width}: labels overflow {g["labels"]}')
        if width==390:
            screenshot=page.screenshot(full_page=True,animations='disabled')
            CAPTURE.write_bytes(screenshot)
            if args.update_baseline or not BASELINE.exists():
                if not args.update_baseline:errors.append('Visual baseline missing')
                else:
                    BASELINE.write_bytes(screenshot)
                    print('Provisional baseline updated; obtain human visual approval before promoting.')
            if BASELINE.exists():
                error=compare_snapshot(screenshot,BASELINE)
                print(f'390px visual difference: {error:.4%}')
                if error>.065:errors.append(f'Visual drift {error:.2%} > 6.5%')
        page.close()
      browser.close()
    if errors:
       print('\n'.join('FAIL: '+x for x in errors));raise SystemExit(1)
    print('PASS: visual contract (360,390,430) + screenshot baseline')

if __name__=='__main__':main()
