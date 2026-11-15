import {createSession} from '../app/ui/session.mjs';
import {acquireSaveWriter} from '../app/ui/save-writer.mjs';
import {showSaveBlocked} from './save-blocked.mjs';
import {loadRuntimeCatalog, selectStage, placementLayout} from '../app/content/index.mjs';
import {developmentCatalog} from './dev-catalog.mjs';
import {startGameplay} from './gameplay.mjs';

if(new URLSearchParams(location.search).get('experiment')==='pattern'||['v3','v4'].includes(new URLSearchParams(location.search).get('gameplay'))) {
 await startGameplay({staged:new URLSearchParams(location.search).get('gameplay')==='v4'||new URLSearchParams(location.search).get('experiment')==='pattern',pattern:new URLSearchParams(location.search).get('experiment')==='pattern'});
} else {

const app = document.querySelector('#app');
const params = new URLSearchParams(location.search), mode = params.get('mode');
const dev = mode === 'development' || mode === 'art-review';
const el = (tag, text, cls) => {
 const node = document.createElement(tag);
 if (text !== undefined) node.textContent = text;
 if (cls) node.className = cls;
 return node;
};
let notice = '', screen = 'workshop', evening = false, selectedMeadow = 0;
let drawer = false, reaction = null, lastCrafted = null, sequence = 0, buttonArt = null;
const announcer = el('p', '', 'sr-only');
announcer.setAttribute('role', 'status');
announcer.setAttribute('aria-live', 'polite');
document.body.append(announcer);
const button = (label, fn, disabled = false, cls = 'button soft', key) => {
 const node = el('button', label, cls);
 node.type = 'button'; node.dataset.focusKey = key ?? label + '-' + sequence++;
 node.disabled = disabled; node.addEventListener('click', fn);
 const navigationLabel = {'В мастерскую':'Мастерская', 'На полянку':'Полянка'}[label];
 const art = node.classList.contains('primary') || node.classList.contains('tab') ? buttonArt?.[navigationLabel ?? label] : null;
 if (art) {
  node.classList.add('art-button'); node.setAttribute('aria-label', navigationLabel ? navigationLabel + ' — перейти' : label);
  if (navigationLabel) node.classList.add('art-navigation-action');
  const visual = image(disabled ? art.disabled : art.normal, '', 'button-art');
  node.replaceChildren(visual);
  const rest = () => { if (!disabled) visual.src = art.normal; };
  node.addEventListener('pointerdown', () => { if (!disabled) visual.src = art.pressed; });
  for (const event of ['pointerup', 'pointercancel', 'pointerleave', 'blur']) node.addEventListener(event, rest);
  node.addEventListener('keydown', event => { if (!disabled && [' ', 'Enter'].includes(event.key)) visual.src = art.pressed; });
  node.addEventListener('keyup', rest);
  visual.addEventListener('error', () => { node.classList.remove('art-button', 'art-navigation-action'); node.removeAttribute('aria-label'); node.textContent = label; }, {once:true});
 }
 return node;
};
const image = (src, alt, cls) => {
 const node = el('img', undefined, cls);
 node.src = src; node.alt = alt; node.draggable = false;
 node.addEventListener('error', () => {
  node.hidden = true; notice = 'Часть иллюстраций недоступна. Арт ещё не прошёл приёмку.';
 }, {once: true});
 return node;
};

// Retain decoded state images so the first press never waits for an artwork fetch.
const buttonImageCache = new Map();
const spriteBounds = new Map();
function fitSpriteHitArea(target, visual, slot, world) {
 if (!visual.complete || !visual.naturalWidth) return;
 let bounds = spriteBounds.get(visual.src);
 if (!bounds) {
  const canvas = document.createElement('canvas');
  canvas.width = visual.naturalWidth; canvas.height = visual.naturalHeight;
  const context = canvas.getContext('2d', {willReadFrequently:true});
  try {
   context.drawImage(visual, 0, 0);
   const pixels = context.getImageData(0,0,canvas.width,canvas.height).data;
   let left=canvas.width, top=canvas.height, right=-1, bottom=-1;
   for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++)if(pixels[(y*canvas.width+x)*4+3]>=16){
    left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);
   }
   bounds = right>=left ? {left,top,right:right+1,bottom:bottom+1} : {left:0,top:0,right:canvas.width,bottom:canvas.height};
  } catch {
   bounds = {left:0,top:0,right:canvas.width,bottom:canvas.height};
  }
  spriteBounds.set(visual.src,bounds);
 }
 const width=world.clientWidth*.5*slot.scale, height=width*1.25;
 const scale=Math.min(width/visual.naturalWidth,height/visual.naturalHeight);
 const paintWidth=visual.naturalWidth*scale, paintHeight=visual.naturalHeight*scale;
 const offsetX=(width-paintWidth)/2+(bounds.left+bounds.right)*scale/2-width/2;
 const offsetY=(height-paintHeight)/2+(bounds.top+bounds.bottom)*scale/2-height/2;
 const hitWidth=Math.max(44,(bounds.right-bounds.left)*scale);
 const hitHeight=Math.max(44,(bounds.bottom-bounds.top)*scale);
 Object.assign(target.style,{left:(slot.x*world.clientWidth+offsetX)+'px',top:(slot.y*world.clientHeight+offsetY)+'px',width:hitWidth+'px',height:hitHeight+'px',aspectRatio:'auto'});
 Object.assign(visual.style,{position:'absolute',width:width+'px',height:height+'px',left:((hitWidth-width)/2-offsetX)+'px',top:((hitHeight-height)/2-offsetY)+'px'});
}

const react = (kind, text, slots = []) => {
 reaction = {kind, text, slots, start: Date.now(), duration: 3400};
 announcer.textContent = text;
};

try {
 const runtime = dev ? developmentCatalog(mode === 'art-review', params.get('flower') === 'review', params.get('scene') === 'v2')
  : await loadRuntimeCatalog(new URL('../app/content/catalog.json', import.meta.url));
 const {catalog, config, assetUrl, workshopBackdrop} = runtime;
 buttonArt = runtime.buttonArt ?? null; app.classList.toggle('scene-v2', Boolean(buttonArt));
 if(buttonArt)await Promise.all([...new Set(Object.values(buttonArt).flatMap(states=>Object.values(states)))].map(async src=>{
  const visual=new Image();buttonImageCache.set(src,visual);visual.src=src;
  try{await visual.decode();}catch{notice='Часть иллюстраций кнопок недоступна. Арт ещё не прошёл приёмку.';}
 }));
 if (!catalog.items.length || !catalog.meadows.length) {
  app.replaceChildren(el('h1', 'Мир на ниточке'), el('p', 'Готовые полянки ещё проходят художественную приёмку.'), el('p', 'Игровая сборка не подменяет их черновыми пакетами.'));
 } else {
  const writer = await acquireSaveWriter({onLost: reason => showSaveBlocked(app, reason)});
  if (!writer.active) { showSaveBlocked(app, writer.reason); } else {
  const storage = writer.storage;
  if (writer.mode === 'temporary') notice = 'Хранилище браузера недоступно. Прогресс сохранится только в этой вкладке.';
  const session = createSession(config, {storage, key: mode === 'art-review' ? 'mir-na-nitke-art-preview-v2' : dev ? 'mir-na-nitke-development-v1' : 'mir-na-nitke-v1', isActive:()=>writer.active, onPersistenceUnavailable:()=>writer.isolate(), onNotice: text => { notice = text; }});
  writer.setFlush(()=>session.tick());
  const itemById = id => catalog.items.find(item => item.id === id);
  const currentItem = () => itemById(session.view.project?.itemId);
  function act(action) {
   const beforeItem = currentItem();
   const beforeStage = beforeItem && selectStage(beforeItem, session.view.project.progress)?.image;
   const ok = session.act(action);
   if (ok) {
    const meadow = catalog.meadows.find(item => item.id === action.meadowId);
    const rule = meadow?.interactions?.find(item => item.id === action.interactionId);
    const economyRule = config.meadows.find(item => item.id === action.meadowId)?.interactions?.find(item => item.id === action.interactionId);
    if (['pet', 'sniff'].includes(action.type)) {
     react(action.type, action.type === 'pet' ? 'Кролик рад вам · +' + (economyRule?.amount ?? 0) + ' пряжи' : 'Цветочек пахнет летом', rule?.requires ?? []);
    } else if (action.type === 'completeCraft') {
     lastCrafted = beforeItem; react('complete', beforeItem.displayName + ' готов! Пора на полянку');
    } else if (action.type === 'placeItem') {
     drawer = false;
     const slot = meadow.slots.find(item => item.id === action.slotId);
     react('place', itemById(slot.itemId).displayName + ' теперь на полянке', [slot.id]);
    } else if (action.type === 'startProject') {
     screen = 'workshop'; drawer = false; reaction = null;
    } else if (action.type === 'click') {
     const item = currentItem();
     if (item && selectStage(item, session.view.project.progress)?.image !== beforeStage) {
      react('stage', session.view.project.canComplete ? 'Последний штрих — и готово!' : 'Петелька за петелькой — оживает');
     }
    }
   }
   render();
  }
  const navigate = id => { screen = id; drawer = false; render(); };
  function setDrawer(open) {
   drawer=open; render();
   app.querySelector(open?'[data-focus-key="close-drawer"]':'[data-focus-key="tab-projects"]')?.focus({preventScroll:true});
  }
  function renderDrawer(world, view, meadow, meadowView) {
   const shade = button('Закрыть проекты', () => setDrawer(false), false, 'drawer-shade', 'shade');
   shade.tabIndex = -1; world.append(shade);
   const panel = el('section', undefined, 'project-drawer');
   panel.id = 'projects-drawer'; panel.setAttribute('aria-label', 'Проекты и улучшения'); panel.setAttribute('role','dialog'); panel.setAttribute('aria-modal','true');
   const heading = el('div', undefined, 'drawer-heading');
   heading.append(el('h2', screen === 'workshop' ? 'Корзинка проектов' : 'Жители полянки'), button('Закрыть', () => setDrawer(false), false, 'button soft', 'close-drawer'));
   panel.append(heading);
   const details = el('div', undefined, 'project-list');
   if (screen === 'workshop') {
    for (const project of view.projects) {
     const item = itemById(project.itemId), owned = view.owned.includes(item.id);
     const row = el('div', undefined, 'project-row' + (owned ? ' done' : ''));
     const name = el('span', undefined, 'row-copy');
     name.append(el('strong', item.displayName), el('small', owned ? 'Уже связан' : project.yarnCost + ' пряжи'));
     if (item.id === 'flower' && !owned) name.append(el('small', 'Цветочек для друга — вместе больше пряжи'));
     row.append(name, button(owned ? 'Готово' : 'Начать', () => act({type: 'startProject', itemId: item.id}), !project.canStart, 'button soft', 'start-' + item.id));
     details.append(row);
    }
    details.append(el('h3', 'Для уютной работы'));
    for (const upgrade of view.upgrades) {
     const row = el('div', undefined, 'project-row'), name = el('span', undefined, 'row-copy');
     name.append(el('strong', upgrade.id === 'hook' ? 'Удобный крючок' : 'Корзинка помощница'), el('small', 'Ур. ' + upgrade.level + ' · ' + upgrade.cost.toFixed(1) + ' пряжи'));
     row.append(name, button('Улучшить', () => act({type: 'buyUpgrade', upgradeId: upgrade.id}), !upgrade.canBuy, 'button soft', 'upgrade-' + upgrade.id));
     details.append(row);
    }
   } else {
    for (const slot of meadowView.slots) {
     const row = el('div', undefined, 'project-row' + (slot.placed ? ' done' : '')), name = el('span', undefined, 'row-copy');
     name.append(el('strong', itemById(slot.itemId).displayName), el('small', slot.placed ? 'Обживает полянку' : slot.canPlace ? 'Готов к встрече' : 'Ещё предстоит связать'));
     row.append(name, button(slot.placed ? 'На полянке' : 'Разместить', () => act({type: 'placeItem', meadowId: meadow.id, slotId: slot.id}), !slot.canPlace || slot.placed, 'button soft', 'place-' + slot.id)); details.append(row);
    }
    if (catalog.meadows.length > 1) for (const [index, next] of catalog.meadows.entries()) details.append(button(next.displayName, () => { selectedMeadow = index; drawer = false; render(); }));
   }
   panel.append(details, el('p', 'Черновой скин: изображения постоянных кнопок ещё не утверждены. Темп игры ускорен для демо.', 'drawer-note')); world.append(panel);
  }
  function render() {
   if(!writer.active)return;
   const focusKey = document.activeElement?.dataset.focusKey;
   const scrollTop = app.querySelector('.project-drawer')?.scrollTop ?? 0;
   sequence = 0;
   const view = session.view, meadow = catalog.meadows[selectedMeadow];
   const meadowView = view.meadows.find(item => item.id === meadow.id), project = currentItem();
   const activeReaction = reaction && Date.now() - reaction.start < reaction.duration ? reaction : null;
   app.replaceChildren();
   const label = el('p', undefined, 'build-label');
   label.append(el('strong', mode === 'art-review' ? 'TECHNICAL PREVIEW — ART NOT APPROVED' : dev ? 'ТЕХНИЧЕСКИЙ ПРОТОТИП' : 'Игровой прототип'), el('span', dev ? 'Черновик · арт и кнопки не утверждены' : '')); app.append(label);
   const section = el('section', undefined, 'view'); section.id = 'view-' + screen;
   const world = el('div', undefined, 'meadow-scene' + (evening ? ' evening' : '')); world.dataset.screen = screen;
   if (activeReaction) { world.dataset.reaction = activeReaction.kind; world.style.setProperty('--reaction-delay', -(Date.now() - activeReaction.start) + 'ms'); }
   const artwork = project ?? lastCrafted;
   if (screen === 'workshop' && workshopBackdrop) world.append(image(workshopBackdrop, '', 'meadow-back workshop-backdrop'));
   const art = screen === 'workshop' && artwork ? selectStage(artwork, project ? view.project.progress : 1)?.image : meadow.art[evening ? 'backgroundEvening' : 'backgroundDay'];
   if (art && !(screen === 'workshop' && !artwork && workshopBackdrop)) world.append(image(assetUrl(screen === 'workshop' && artwork ? artwork : meadow, art), screen === 'workshop' && artwork ? artwork.displayName : meadow.displayName, 'meadow-back scene-art'));
   const header = el('header', undefined, 'app-header');
   header.append(el('h1', screen === 'workshop' ? 'Мастерская' : dev ? 'Малая полянка' : meadow.displayName),
    el('span', view.wallet.yarn.toFixed(1) + ' пряжи', 'yarn-wallet'),
    button(evening ? 'День' : 'Вечер', () => { evening = !evening; render(); }, false, 'button lighting', 'lighting'));
   world.append(header);
   if (screen === 'meadow') {
    for (const slot of placementLayout(meadow, session.state.placements[meadow.id] ?? {}, catalog.items)) {
     const target = button(slot.item.displayName, () => {
      const rule = meadowView.interactions.find(item => item.trigger === 'manual' && item.available && meadow.interactions.find(source => source.id === item.id)?.actorSlot === slot.id);
      if (rule) act({type: rule.action, meadowId: meadow.id, interactionId: rule.id});
      else { react('hello', slot.item.id === 'flower' ? 'Цветочек качнулся вам навстречу' : slot.item.displayName + ' рад вам', [slot.id]); render(); }
     }, false, 'placed-object', 'object-' + slot.id);
     const prelit = evening && Boolean(slot.item.art.finishedSpriteEvening);
     const sprite = prelit ? slot.item.art.finishedSpriteEvening : slot.item.art.finishedSprite;
     if (prelit) target.classList.add('prelit');
     const visual = image(assetUrl(slot.item, sprite), slot.item.displayName);
     target.replaceChildren(visual); target.dataset.slot = slot.id;
     visual.addEventListener('load',()=>fitSpriteHitArea(target,visual,slot,world));
     requestAnimationFrame(()=>fitSpriteHitArea(target,visual,slot,world));
     target.style.left = slot.x * 100 + '%'; target.style.top = slot.y * 100 + '%'; target.style.width = 50 * slot.scale + '%'; target.style.zIndex = String(6 + slot.z);
     if (activeReaction?.slots.includes(slot.id)) target.classList.add('reacting'); world.append(target);
    }
    if (!Object.keys(session.state.placements[meadow.id] ?? {}).length) world.append(el('p', 'Пока здесь тихо. Поселим первого друга?', 'world-message'));
   }
   if (screen === 'workshop' && !artwork) world.append(el('p', 'Начнём с маленького друга', 'world-message'));
   if (activeReaction) {
    const feedback = el('p', activeReaction.text, 'feedback'); feedback.dataset.feedbackKind = activeReaction.kind; feedback.setAttribute('aria-hidden', 'true');
    if (['complete', 'stage'].includes(activeReaction.kind)) { const sparkle = el('span', '✧', 'craft-sparkle'); sparkle.setAttribute('aria-hidden', 'true'); world.append(sparkle); }
    if (activeReaction.kind === 'sniff') { const scent = el('span', '·  ·  ·', 'flower-scent'); scent.setAttribute('aria-hidden', 'true'); world.append(scent); }
    world.append(feedback);
   }
   if (!drawer) {
    const dock = el('div', undefined, 'action-dock');
    if (screen === 'workshop' && project) {
     const progress = el('div', undefined, 'progress-panel'); progress.append(el('span', project.displayName + ' · ' + Math.floor(view.project.progress * 100) + '%'));
     const bar = el('progress'); bar.max = 1; bar.value = view.project.progress; bar.setAttribute('aria-label', project.displayName + ': готовность'); progress.append(bar); dock.append(progress);
     dock.append(button(view.project.canComplete ? 'Завершить' : 'Вязать', () => act({type: view.project?.canComplete ? 'completeCraft' : 'click'}), false, 'button primary', 'craft'));
    } else if (screen === 'workshop') {
     const ready = meadowView.slots.find(slot => slot.canPlace && !slot.placed), next = view.projects.find(item => item.canStart);
     if (ready) dock.append(el('p', itemById(ready.itemId).displayName + ' ждёт встречи', 'action-hint'), button('На полянку', () => navigate('meadow'), false, 'button primary', 'go-place'));
     else if (next) {
      dock.append(el('p', itemById(next.itemId).displayName + ' · ' + next.yarnCost + ' пряжи' + (next.itemId === 'flower' ? ' · кролик будет нюхать цветок' : ''), 'action-hint'), button('Начать', () => act({type: 'startProject', itemId: next.itemId}), false, 'button primary', 'next-project'));
     } else dock.append(el('p', 'На полянке вас ждёт мягкий друг', 'action-hint'), button('На полянку', () => navigate('meadow'), false, 'button primary'));
    } else {
     const ready = meadowView.slots.find(slot => slot.canPlace && !slot.placed), rules = meadowView.interactions.filter(item => item.trigger === 'manual');
     if (ready) dock.append(el('p', itemById(ready.itemId).displayName + ' готов здесь поселиться', 'action-hint'), button('Разместить', () => act({type: 'placeItem', meadowId: meadow.id, slotId: ready.id}), false, 'button primary', 'next-place'));
     else if (rules.length && Object.keys(session.state.placements[meadow.id] ?? {}).length) {
      const rule = rules[0]; dock.append(el('p', view.projects.some(item => item.itemId === 'flower' && item.canStart) ? 'Хватит на цветок — загляните в мастерскую' : rule.available ? 'Коснитесь кролика — он вас ждал' : 'Можно просто побыть рядом', 'action-hint'), button('Погладить', () => act({type: rule.action, meadowId: meadow.id, interactionId: rule.id}), !rule.available, 'button primary', 'pet'));
     } else dock.append(button('В мастерскую', () => navigate('workshop'), false, 'button primary'));
    }
    world.append(dock);
   } else renderDrawer(world, view, meadow, meadowView);
   const nav = el('nav', undefined, 'tabs' + (buttonArt ? ' art-tabs' : '')); nav.setAttribute('aria-label', 'Места и проекты');
   for (const [id, text] of [['workshop', 'Мастерская'], ['meadow', 'Полянка']]) {
    const tab = button(text, () => navigate(id), false, 'tab ' + (!drawer && screen === id ? 'selected' : ''), 'tab-' + id);
    if (!drawer && screen === id) tab.setAttribute('aria-current', 'page'); nav.append(tab);
   }
   const projects = button('Проекты', () => setDrawer(!drawer), false, 'tab ' + (drawer ? 'selected' : ''), 'tab-projects');
   projects.setAttribute('aria-expanded', String(drawer)); projects.setAttribute('aria-controls', 'projects-drawer'); nav.append(projects); world.append(nav);
   if (notice) { const status = el('p', notice, 'notice'); status.setAttribute('role', 'status'); world.append(status); }
   if(drawer)for(const child of world.children)if(!child.classList.contains('project-drawer')&&!child.classList.contains('drawer-shade'))child.inert=true;
   section.append(world); app.append(section);
   if (drawer) app.querySelector('.project-drawer').scrollTop = scrollTop;
   if (focusKey !== undefined) [...app.querySelectorAll('[data-focus-key]')].find(node => node.dataset.focusKey === focusKey)?.focus({preventScroll: true});
  }
  render();
  setInterval(() => {
   if(!writer.active)return;
   const beforeItem = currentItem(), beforeProgress = session.view.project?.progress;
   const {before, state} = session.tick();
   if (beforeItem && selectStage(beforeItem, beforeProgress)?.image !== selectStage(beforeItem, session.view.project?.progress)?.image) {
    react('stage', session.view.project?.canComplete ? 'Последний штрих — и готово!' : 'Петелька за петелькой — оживает');
   }
   for (const meadow of config.meadows) for (const rule of meadow.interactions ?? []) {
    const key = meadow.id + '/' + rule.id;
    if (rule.trigger === 'idle' && before.cooldowns[key] !== undefined && state.cooldowns[key] > before.cooldowns[key]) {
     // Catalog owns visual metadata: ready runtime rules may omit actorSlot/displayName.
     const source = catalog.meadows.find(item => item.id === meadow.id);
     const visualRule = source?.interactions?.find(item => item.id === rule.id) ?? rule;
     const actor = source?.slots.find(slot => slot.id === visualRule.actorSlot);
     const name = itemById(actor?.itemId)?.displayName ?? 'Полянка';
     react(rule.action, name + (rule.action === 'sniff' ? ' нюхает цветочек · +' : ' оживает · +') + rule.amount + ' пряжи', visualRule.requires ?? []);
    }
   }
   render();
  }, 1000);
  document.addEventListener('keydown', event => {
   if(!drawer)return;
   if(event.key==='Escape'){event.preventDefault();setDrawer(false);return;}
   if(event.key==='Tab'){
    const controls=[...app.querySelectorAll('.project-drawer button:not(:disabled)')];
    const first=controls[0],last=controls.at(-1),active=document.activeElement;
    if(event.shiftKey&&active===first){event.preventDefault();last?.focus();}
    else if(!event.shiftKey&&active===last){event.preventDefault();first?.focus();}
   }
  });
  document.addEventListener('visibilitychange', () => { if(writer.active){session.tick();render();} });
  }
 }
} catch (error) {
 app.replaceChildren(el('h1', 'Не удалось открыть игру'), el('p', 'Проверьте сборку каталога и доступ к файлам. Ваше сохранение не изменено.'), el('pre', error.message));
}
}
