import {createSession,summarizeAdvance} from '../app/ui/session.mjs';
import {selectStage,placementLayout} from '../app/content/index.mjs';
import {gameplayCatalog,GAMEPLAY_SAVE_KEY,LEGACY_SAVE_KEY} from './gameplay-catalog.mjs';
import {el,viewTools,duration,amount} from './view-tools.mjs';
import {fitSpriteHitArea} from './sprite-hit.mjs';
import {stagedCatalog,STAGED_SAVE_KEY,STAGED_LEGACY_KEY,SECTION_WEIGHTS} from './staged-catalog.mjs';
import {createStagedRenderer} from './staged-renderer.mjs';
import {loadStagedArt} from './staged-art.mjs';
import {fitStagedSprite,stagedFit} from './staged-layout.mjs';

export async function startGameplay({staged=false}={}){
 const app=document.querySelector('#app'),params=new URLSearchParams(location.search);
 const runtime=staged?stagedCatalog():gameplayCatalog(params.get('mode')==='art-review'),{catalog,config,assetUrl}=runtime,saveKey=staged?STAGED_SAVE_KEY:GAMEPLAY_SAVE_KEY;
 let notice='',storage;try{storage=localStorage;}catch{notice='Прогресс доступен только в этой вкладке.';}
 const session=createSession(config,{storage,key:saveKey,legacyKey:staged?STAGED_LEGACY_KEY:LEGACY_SAVE_KEY,legacyConfig:runtime.legacyConfig,legacyMigration:staged?'config':'v1',onNotice:text=>{notice=text;}});
 const defaults={screen:'workshop',meadowId:'test-meadow',evening:false,selected:{}};
 let ui={...defaults};try{const saved=JSON.parse(storage?.getItem(saveKey+'-ui')??'null');if(saved)ui={...defaults,...saved,selected:saved.selected??{}};}catch{}
 if(!['workshop','meadow'].includes(ui.screen))ui.screen='workshop';if(!session.view.meadows.some(m=>m.id===ui.meadowId&&m.unlocked))ui.meadowId='test-meadow';
 if(staged&&ui.screen==='workshop'&&session.state.project){const p=session.state.project;ui.meadowId=(p.recipeId?config.recipes.find(i=>i.id===p.recipeId):catalog.items.find(i=>i.id===p.itemId)).meadowId;}
 let pointerHeld=false;if(staged){document.addEventListener('pointerdown',()=>{pointerHeld=true;},true);for(const type of ['pointerup','pointercancel'])document.addEventListener(type,()=>{pointerHeld=false;},true);}
 let away=session.takeAwayReport(),drawer=away?'return':null,drawerOpener='tab-projects',replay=null,hiddenState=null,projectStarted=Date.now(),reactions=[],pulse=null;
 const {image,button,preload}=viewTools(runtime.buttonArt,text=>{notice=text;});await preload();
 app.classList.add('gameplay-v3');app.classList.toggle('scene-v2',Boolean(runtime.buttonArt));app.dataset.gameplay=staged?'v4':'v3';app.classList.toggle('gameplay-v4',staged);
 const stagedRenderer=staged?createStagedRenderer(text=>{notice=text;render();}):null,finishedSprites=new Map(),stagedArt=new Map();
 if(staged)await Promise.all(Object.keys(SECTION_WEIGHTS).map(async id=>{try{const art=await loadStagedArt(catalog.items.find(i=>i.id===id));stagedArt.set(id,art);finishedSprites.set(id,art.finishedUrl);}catch{notice='Часть изделий недоступна. Попробуйте обновить страницу.';}}));
 if(staged)await Promise.all(catalog.meadows.map(async m=>{try{const img=new Image();img.src=assetUrl(m,m.art.backgroundDay);await img.decode();}catch{notice='Фон недоступен. Попробуйте обновить страницу.';}}));
 if(staged)window.__stagedGameplay=Object.freeze({snapshot:()=>structuredClone({state:session.state,view:session.view,ui,craft:stagedRenderer.snapshot()}),points:()=>({...stagedRenderer.points(),controls:Object.fromEntries([...app.querySelectorAll('[data-focus-key]')].map(n=>{const r=n.getBoundingClientRect();return [n.dataset.focusKey,{x:r.x,y:r.y,width:r.width,height:r.height}];}))})});
 const announcer=el('p','','sr-only');announcer.setAttribute('role','status');announcer.setAttribute('aria-live','polite');document.body.append(announcer);
 const byId=id=>catalog.items.find(i=>i.id===id),byMeadow=id=>catalog.meadows.find(m=>m.id===id);
 const reactionText={pet:'Кролик приподнялся к ладони',water:'На цветок упали капельки',sway:'Веточка тихо качнулась',knock:'В окошке зажёгся свет',land:'Бабочка опустилась поближе',greet:'Котик сонно потянулся',brew:'Над чашкой поднялся пар',feed:'Уточка склёвывает угощение',rock:'Кресло мягко покачалось',shelter:'В листовом домике зажёгся свет',sniff:'Кролик нюхает цветок'};
 const definition=()=>session.state.project?.recipeId?config.recipes.find(r=>r.id===session.state.project.recipeId):byId(session.state.project?.itemId);
 const saveUI=()=>{try{storage?.setItem(saveKey+'-ui',JSON.stringify(ui));}catch{}};
 const announce=(scope,kind,text,slots=[])=>{reactions.push({scope,kind,text,slots,at:Date.now()});reactions=reactions.slice(-12);announcer.textContent=text;};
 const navigate=(screen,meadowId=ui.meadowId)=>{ui.screen=screen;ui.meadowId=staged&&screen==='workshop'&&definition()?definition().meadowId:meadowId;drawer=null;replay=null;saveUI();render();};
 const openDrawer=kind=>{drawerOpener=document.activeElement?.dataset.focusKey??'tab-projects';drawer=kind;render('close-drawer');};
 const closeDrawer=()=>{drawer=null;away=null;render(drawerOpener);};
 const savedSeconds=(work,view=session.view)=>Math.min(work,view.project?.remaining??work)/view.rates.idle;
 function act(action,event){
  const before=definition(),previous=structuredClone(session.view),start=performance.now();
  if(staged&&action.type==='click')stagedRenderer.pulse(event);
  const ok=session.act(action);if(!ok){render();return;}
  if(action.type==='startProject'||action.type==='startRecipe'||action.type==='startRecraft'){ui.screen='workshop';if(staged&&definition().meadowId)ui.meadowId=definition().meadowId;drawer=null;replay=null;projectStarted=Date.now();announce('workshop','start','Начинаем: '+definition().displayName);}
  if(action.type==='click'){
   const world=app.querySelector('.meadow-scene')?.getBoundingClientRect();
   pulse={at:Date.now(),seconds:savedSeconds(previous.rates.click,previous),x:event?.clientX&&world?(event.clientX-world.left)/world.width*100:54,y:event?.clientY&&world?Math.min(70,(event.clientY-world.top)/world.height*100):62};
   announce('workshop','stitch','Готовность ближе на '+amount(pulse.seconds)+' с');
  }
  if(action.type==='cancelRecraft'){ui.screen='meadow';drawer=null;}
  if(action.type==='completeCraft'){
   if(before.eventId){ui.screen='meadow';ui.meadowId=config.worldEvents.find(e=>e.id===before.eventId).visitor.meadowId;announce(ui.meadowId,'complete','Приготовление закончено — друзья скоро встретятся');}
   else {ui.screen='meadow';ui.meadowId=before.meadowId;ui.selected[ui.meadowId]=before.id;
    if(staged&&!previous.project.recraft){const slot=byMeadow(before.meadowId).slots.find(s=>s.itemId===before.id);session.act({type:'placeItem',meadowId:before.meadowId,slotId:slot.id});}
    announce(ui.meadowId,'complete',previous.project.recraft?'Повтор закончен — изделие осталось на полянке':staged?before.displayName+' обживает полянку':before.displayName+' готов! Осталось разместить');}
   drawer=null;
  }
  if(action.type==='placeItem'){
   drawer=null;ui.selected[action.meadowId]=action.slotId;announce(action.meadowId,'place',byId(action.slotId).displayName+' обживает полянку',[action.slotId]);
   if(!previous.meadows[1].unlocked&&session.view.meadows[1].unlocked)announce(action.meadowId,'unlock','Открылась тропинка: Котоутро у пруда');
  }
  if(action.type==='interact'){
   const m=byMeadow(action.meadowId),r=m.interactions.find(r=>r.id===action.interactionId);ui.selected[m.id]=r.actorSlot;
   const benefit='+'+amount(r.amount)+' пряжи'+(r.workBonus&&previous.project?' · −'+amount(savedSeconds(r.workBonus,previous))+' с вязания':'');
   announce(m.id,r.action,reactionText[r.action]+' · '+benefit,r.requires);
  }
  if(action.type==='buyUpgrade'){const u=session.view.upgrades.find(u=>u.id===action.upgradeId);announce('workshop','upgrade',u.target==='click'?'Каждое касание экономит до '+amount(u.current/session.view.rates.idle)+' с':'Самостоятельная вязка: темп ×'+amount(u.current/config.idleWorkPerSecond));}
  saveUI();render();if(action.type==='click')app.dataset.lastClickRenderMs=String(performance.now()-start);
 }
 function renderSprite(world,slot,meadow,view,{visitor=false,memory=false}={}){
  const target=button(visitor?(memory?'Воспоминание: ':'В гостях: ')+slot.item.displayName:slot.item.displayName,()=>{
   if(visitor){announce(ui.meadowId,'hello',memory?'Это воспоминание о встрече':slot.item.displayName+' гостит у друзей');render();return;}
   ui.selected[meadow.id]=slot.id;saveUI();const rule=view.interactions.find(r=>r.trigger==='manual'&&r.actorSlot===slot.id);
   if(rule?.available)act({type:'interact',meadowId:meadow.id,interactionId:rule.id});
   else{announce(meadow.id,rule?.action??'hello',reactionText[rule?.action]??slot.item.displayName,[slot.id]);render();}
  },{cls:'placed-object'+(visitor?' visitor':'')+(memory?' memory-visitor':''),key:(visitor?'visitor-':'object-')+slot.id});
  const prelit=ui.evening&&Boolean(slot.item.art.finishedSpriteEvening);if(prelit)target.classList.add('prelit');
  if(staged&&slot.item.id==='flower'&&!finishedSprites.has('flower'))loadStagedArt(slot.item).then(a=>{finishedSprites.set('flower',a.finishedUrl);render();}).catch(()=>{notice='Не удалось загрузить цветок.';});
  const visual=image(finishedSprites.get(slot.item.id)??assetUrl(slot.item,prelit?slot.item.art.finishedSpriteEvening:slot.item.art.finishedSprite),slot.item.displayName);target.replaceChildren(visual);
  target.dataset.item=slot.item.id;target.dataset.slot=slot.id;if(visitor)target.dataset.visitor=slot.eventId;
  Object.assign(target.style,{left:slot.x*100+'%',top:slot.y*100+'%',width:50*slot.scale+'%',zIndex:String(6+(slot.z??0))});
  const fit=()=>staged&&!visitor&&stagedArt.has(slot.item.id)?fitStagedSprite(target,visual,stagedArt.get(slot.item.id),slot.item.id,world):fitSpriteHitArea(target,visual,slot,world);
  visual.addEventListener('load',fit);requestAnimationFrame(fit);
  const reaction=reactions.findLast(r=>r.scope===meadow.id&&r.slots.includes(slot.id)&&Date.now()-r.at<2600);
  if(reaction){target.dataset.action=reaction.kind;target.style.setProperty('--reaction-delay',-(Date.now()-reaction.at)+'ms');target.classList.add('object-reacting');
   const symbols={water:'· · ·',brew:'∿',feed:'· · ·',knock:'✦',shelter:'✦',land:'·',pet:'♡',greet:'',rock:'',sway:'',sniff:'· ·'};
   if(symbols[reaction.kind]){const fx=el('span',symbols[reaction.kind],'object-effect effect-'+reaction.kind);fx.setAttribute('aria-hidden','true');target.append(fx);}
  }
  if(!visitor&&ui.selected[meadow.id]===slot.id)target.classList.add('selected-object');world.append(target);
 }
 function workingYarn(){
  const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 1000 1700');svg.setAttribute('preserveAspectRatio','none');svg.setAttribute('aria-hidden','true');
  const fresh=pulse&&Date.now()-pulse.at<650;svg.classList.add('working-yarn');if(fresh)svg.classList.add('yarn-pulse');
  const curve='M -25 1110 C 90 1070 120 1190 245 1210 S 390 1105 470 1128 S 525 1165 563 1118';
  for(const [cls,width,color]of [['yarn-shadow',13,'#735035'],['yarn-body',9,'#d9a765'],['yarn-highlight',3,'#ffe9ab'],['yarn-glint',3,'#fff9d9']]){const p=document.createElementNS(ns,'path');p.setAttribute('d',curve);p.setAttribute('fill','none');p.setAttribute('stroke',color);p.setAttribute('stroke-width',width);p.setAttribute('stroke-linecap','round');p.setAttribute('class',cls);if(cls==='yarn-glint'){p.setAttribute('stroke-dasharray','8 35');p.style.animationDelay=-(Date.now()-projectStarted)+'ms';}svg.append(p);}
  if(fresh){const loop=document.createElementNS(ns,'path');loop.setAttribute('d','M 550 1137 C 522 1102 559 1073 578 1100 C 599 1130 563 1158 550 1137');loop.setAttribute('class','new-stitch');loop.setAttribute('fill','none');loop.setAttribute('stroke','#fff1b1');loop.setAttribute('stroke-width','8');loop.style.animationDelay=-(Date.now()-pulse.at)+'ms';svg.append(loop);}
  return svg;
 }
 function drawerPanel(world,view,meadow,meadowView){
  const shade=button('Закрыть',closeDrawer,{cls:'drawer-shade',key:'shade'});shade.tabIndex=-1;world.append(shade);
  const panel=el('section',undefined,'project-drawer');panel.id='projects-drawer';panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');
  const titles={projects:'Корзинка проектов',map:'Тропинки между полянками',upgrades:'Мастерская помогает',memories:'Тёплые воспоминания',return:'Пока вас не было'};
  panel.setAttribute('aria-label',titles[drawer]);const head=el('div',undefined,'drawer-heading');head.append(el('h2',titles[drawer]),button('Закрыть',closeDrawer,{key:'close-drawer'}));panel.append(head);
  const list=el('div',undefined,'project-list');
  const row=(title,detail,control)=>{const n=el('div',undefined,'project-row'),copy=el('span',undefined,'row-copy');copy.append(el('strong',title),el('small',detail));n.append(copy);if(control)n.append(control);list.append(n);return n;};
  if(drawer==='map')for(const m of view.meadows){const source=byMeadow(m.id);row(source.displayName,m.unlocked?m.slots.filter(s=>s.placed).length+' из 5 жителей':source.unlockHint,button(m.unlocked?'Перейти':'Закрыто',()=>navigate('meadow',m.id),{disabled:!m.unlocked,key:'scene-'+m.id}));}
  if(drawer==='projects'){
   panel.append(button(meadow.displayName+' · сменить',()=>openDrawer('map'),{key:'project-scene'}));
   for(const p of view.projects.filter(p=>byId(p.itemId).meadowId===meadow.id)){
    const i=byId(p.itemId),owned=view.owned.includes(i.id),slot=meadowView.slots.find(s=>s.itemId===i.id);
    const state=owned?(slot.placed?'Живёт на полянке':'Готов к размещению'):p.unlocked?amount(p.yarnCost)+' пряжи · '+i.benefit:'Сначала: '+(i.requiresPlaced??[]).map(p=>byId(p.slotId).displayName).join(', ');
    let control=owned&&staged&&SECTION_WEIGHTS[i.id]?button('Повторить бесплатно',()=>act({type:'startRecraft',itemId:i.id}),{disabled:!p.canRecraft,key:'repeat-'+i.id}):owned?button(slot.placed?'Готово':'Разместить',()=>{ui.screen='meadow';act({type:'placeItem',meadowId:meadow.id,slotId:slot.id});},{disabled:slot.placed,key:'place-'+i.id}):button('Начать',()=>act({type:'startProject',itemId:i.id}),{disabled:!p.canStart,key:'start-'+i.id});
    if(owned&&!slot.placed&&staged&&SECTION_WEIGHTS[i.id]){const group=el('div',undefined,'staged-project-actions');group.append(button('Разместить',()=>{ui.screen='meadow';act({type:'placeItem',meadowId:meadow.id,slotId:slot.id});},{key:'place-'+i.id}),control);control=group;}
    row(i.displayName,state,control);
   }
   list.append(el('h3','Встречи друзей'));
   for(const r of view.recipes){const source=config.recipes.find(x=>x.id===r.recipeId),event=view.events.find(e=>e.id===source.eventId);row(source.displayName,r.unlocked?source.benefit+' · '+source.yarnCost+' пряжи':source.id==='invitation'?'Кролик, Домик, Бабочка + Котик и Кофе':'Все 10 предметов и две встречи',button(event.phase==='done'?'Встреча состоялась':'Приготовить',()=>act({type:'startRecipe',recipeId:r.recipeId}),{disabled:!r.canStart,key:'recipe-'+r.recipeId}));}
  }
  if(drawer==='upgrades')for(const u of view.upgrades){const source=config.upgrades.find(x=>x.id===u.id),effect=u.target==='click'?'Касание экономит: '+amount(u.current/view.rates.idle)+' с → '+amount(u.next/view.rates.idle)+' с':'Темп автовязки: ×'+amount(u.current/config.idleWorkPerSecond)+' → ×'+amount(u.next/config.idleWorkPerSecond);row(source.displayName,(staged&&!session.state.placements.kotoutro?.['kot-cat']?'После размещения котика · ':'')+'Ур. '+u.level+' · '+effect+' · '+amount(u.cost)+' пряжи',button(u.maxed?'Максимум':'Улучшить',()=>act({type:'buyUpgrade',upgradeId:u.id}),{disabled:!u.canBuy,key:'upgrade-'+u.id}));}
  if(drawer==='memories'){
   if(!Object.keys(view.memories).length)list.append(el('p','Новые сочетания жителей приведут гостей. Первая тропинка откроется после Кролика, Цветка и Дерева.','drawer-note'));
   for(const [id,memory]of Object.entries(view.memories)){const event=config.worldEvents.find(e=>e.id===id);row(event.memoryText,'Встреч: '+memory.count,button('Вспомнить',()=>{replay={eventId:id,until:Date.now()+12000};ui.screen='meadow';ui.meadowId=event.visitor.meadowId;drawer=null;render();},{key:'memory-'+id}));}
  }
  if(drawer==='return'&&away){
   list.append(el('p','За '+duration(away.elapsedMs/1000)+' отсутствия: +'+amount(away.yarn)+' пряжи.'+(away.work?(view.project?.canComplete?' Изделие довязалось и ждёт вас.':' Изделие стало ближе к завершению.'):'')+' Уже сохранено.','return-copy'));
   if(away.elapsedMs>away.productionMs)list.append(el('p','Производство учтено за первые 8 часов. Встречи завершались в своё время.','drawer-note'));
   for(const id of away.memories){const event=config.worldEvents.find(e=>e.id===id);row(event.memoryText,'Встреча сохранена в воспоминаниях',button('Вспомнить',()=>{replay={eventId:id,until:Date.now()+12000};ui.screen='meadow';ui.meadowId=event.visitor.meadowId;away=null;drawer=null;render();},{key:'return-memory-'+id}));}
   list.append(button('Продолжить',closeDrawer,{key:'continue-return'}));
  }
  panel.append(list,el('p','TECHNICAL PREVIEW · арт не утверждён. Темп — проверяемая гипотеза.','drawer-note'));world.append(panel);
 }
 function nextStaged(view){return Object.keys(SECTION_WEIGHTS).map(id=>view.projects.find(p=>p.itemId===id)).find(p=>p&&!view.owned.includes(p.itemId)&&p.unlocked);}
 function render(focusOverride){
  const focused=focusOverride??document.activeElement?.dataset.focusKey,scroll=app.querySelector('.project-drawer')?.scrollTop??0,view=session.view;
  const meadow=byMeadow(ui.meadowId),meadowView=view.meadows.find(m=>m.id===meadow.id),project=definition(),scope=ui.screen==='workshop'?'workshop':meadow.id;
  let absenceText='';
  reactions=reactions.filter(r=>Date.now()-r.at<5000);if(replay&&Date.now()>replay.until)replay=null;
  const reaction=reactions.findLast(r=>r.scope===scope&&r.kind!=='stitch'&&Date.now()-r.at<3400);
  app.replaceChildren();const build=el('p',undefined,'build-label');build.append(el('strong','TECHNICAL PREVIEW — ART NOT APPROVED'),el('span','Черновик · две полянки и общая мастерская'));app.append(build);
  const section=el('section',undefined,'view');section.id='view-'+ui.screen;const world=el('div',undefined,'meadow-scene'+(ui.evening?' evening':''));world.dataset.screen=ui.screen;world.dataset.meadow=meadow.id;
  if(ui.screen==='workshop'){
   world.append(image(staged?assetUrl(meadow,meadow.art.backgroundDay):runtime.workshopBackdrop,'','meadow-back workshop-backdrop'));
   if(staged){const travelling=new Set(view.visitors.map(v=>v.itemId));for(const slot of placementLayout(meadow,session.state.placements[meadow.id]??{},catalog.items))if(slot.item.id!==project?.id&&!travelling.has(slot.item.id))renderSprite(world,slot,meadow,meadowView);for(const visitor of [...new Map(view.visitors.filter(v=>v.meadowId===meadow.id).map(v=>[v.itemId,v])).values()])renderSprite(world,{...visitor,id:visitor.eventId,item:byId(visitor.itemId)},meadow,meadowView,{visitor:true});}
   if(staged&&project&&SECTION_WEIGHTS[project.id])stagedRenderer.mount(world,project,view.project.work,view.craftAuto,6+(meadow.slots.find(s=>s.itemId===project.id)?.z??0));else stagedRenderer?.detach();
   if(project&&!session.state.project.recipeId&&!(staged&&SECTION_WEIGHTS[project.id])){const stage=selectStage(project,view.project.progress);world.append(image(assetUrl(project,stage.image),project.displayName,'meadow-back scene-art workshop-item'+(project.art.transparentStages?' transparent-stage':'')));}
   if(project){
    const tap=button((view.project.canComplete?(staged&&!view.project.recraft&&!view.project.recipeId?'Разместить: ':'Завершить: '):staged?'Вязать: ':'Добавить петлю: ')+project.displayName,event=>act({type:view.project.canComplete?'completeCraft':'click'},event),{cls:'craft-target',key:'craft-art'});tap.setAttribute('aria-label',tap.textContent);tap.replaceChildren();world.append(tap);
    if(staged&&stagedArt.has(project.id))requestAnimationFrame(()=>{const art=stagedArt.get(project.id),{scale,x,y}=stagedFit(project.id,art,world.clientWidth,world.clientHeight),[l,t,w,h]=art.visibleBounds;Object.assign(tap.style,{left:x+l*scale+'px',top:y+t*scale+'px',right:'auto',width:w*scale+'px',height:h*scale+'px'});});
    if(!view.project.canComplete&&!staged)world.append(workingYarn());
    if(session.state.project.recipeId)world.append(el('p',project.displayName+' · '+project.benefit,'recipe-label'));
   }else world.append(el('p','Новая работа ждёт в корзинке','world-message compact-message'));
  }else{
   stagedRenderer?.detach();
   world.append(image(assetUrl(meadow,meadow.art[ui.evening?'backgroundEvening':'backgroundDay']),'','meadow-back scene-art'));
   const travelling=new Set(view.visitors.map(v=>v.itemId));
   for(const slot of placementLayout(meadow,session.state.placements[meadow.id]??{},catalog.items))if(!travelling.has(slot.item.id))renderSprite(world,slot,meadow,meadowView);
   // Several activities may overlap during one visit; show the resident once.
   const visitors=[...new Map(view.visitors.filter(v=>v.meadowId===meadow.id).map(v=>[v.itemId,v])).values()];const recalled=replay?config.worldEvents.find(e=>e.id===replay.eventId):null;
   if(recalled&&!visitors.some(v=>v.itemId===recalled.visitor.itemId))visitors.push({...recalled.visitor,eventId:recalled.id,memory:true});
   for(const visitor of visitors)renderSprite(world,{...visitor,id:visitor.eventId,item:byId(visitor.itemId)},meadow,meadowView,{visitor:true,memory:visitor.memory});
   if(!meadowView.slots.some(s=>s.placed))world.append(el('p','Здесь поселятся ваши новые друзья','world-message compact-message'));
   const gone=meadowView.slots.find(s=>s.placed&&travelling.has(s.itemId));if(gone)absenceText=byId(gone.itemId).displayName+' гостит у друзей';
  }
  const header=el('header',undefined,'app-header');
  header.append(button(ui.screen==='workshop'?'Мастерская':meadow.displayName+' ▾',()=>openDrawer('map'),{cls:'place-title',key:'scene-chooser'}),el('span',amount(view.wallet.yarn)+' пряжи','yarn-wallet'),button(ui.evening?'День':'Вечер',()=>{ui.evening=!ui.evening;saveUI();render();},{cls:'button lighting',key:'lighting'}));world.append(header);
  if(ui.screen==='workshop')world.append(button('Крючок и корзинка',()=>openDrawer('upgrades'),{cls:'button workshop-tools',key:'open-upgrades'}));
  else world.append(button('Воспоминания'+(Object.keys(view.memories).length?' · '+Object.keys(view.memories).length:''),()=>openDrawer('memories'),{cls:'button memory-tools',key:'open-memories'}));
  if(!staged&&pulse&&Date.now()-pulse.at<650&&ui.screen==='workshop'){
   const stitch=el('span','−'+amount(pulse.seconds)+' с','stitch-pulse');stitch.style.left=pulse.x+'%';stitch.style.top=pulse.y+'%';stitch.style.animationDelay=-(Date.now()-pulse.at)+'ms';stitch.setAttribute('aria-hidden','true');world.append(stitch);
  }
  if(reaction&&!replay){const feedback=el('p',reaction.text,'feedback');feedback.style.setProperty('--reaction-delay',-(Date.now()-reaction.at)+'ms');feedback.dataset.feedbackKind=reaction.kind;feedback.setAttribute('aria-hidden','true');world.append(feedback);}
  if(replay){const note=el('div',undefined,'story-note memory-note');note.append(el('span','Воспоминание · '+config.worldEvents.find(e=>e.id===replay.eventId).memoryText),button('Закончить',()=>{replay=null;render();},{key:'stop-memory'}));world.append(note);}
  else if(ui.screen==='meadow'&&!reaction){
   const story=view.events.find(e=>e.meadowId===meadow.id&&['waiting','visiting'].includes(e.phase));
   const notes=[];if(story){const source=config.worldEvents.find(e=>e.id===story.id);notes.push((story.phase==='waiting'?source.waitingText:byId(source.visitor.itemId).displayName+' в гостях')+' · '+duration((story.dueAt-session.state.lastTimestamp)/1000));}if(absenceText)notes.push(absenceText);if(notes.length)world.append(el('p',notes.join(' · '),'story-note'));
  }
  if(drawer)drawerPanel(world,view,meadow,meadowView);
  else{
   const dock=el('div',undefined,'action-dock');
   if(ui.screen==='workshop'&&project){
    const progress=el('div',undefined,'progress-panel');progress.append(el('span',project.displayName+' · '+Math.floor(view.project.progress*100)+'%'));
    const bar=el('progress');bar.max=1;bar.value=view.project.progress;bar.setAttribute('aria-label',project.displayName+': готовность');progress.append(bar,el('small',view.project.canComplete?(staged?(view.project.recipeId?'Приготовление закончено':view.project.recraft?'Повтор готов':'Готово — можно разместить'):'Готово! Можно завершить'):staged?(view.craftAuto?'Авто вяжет · осталось '+duration(view.project.etaSeconds):'Касайтесь — деталь постепенно проявляется'):'Касание: −'+amount(savedSeconds(view.rates.click,view))+' с · осталось '+duration(view.project.etaSeconds)));if(!staged&&!view.owned.length&&!view.project.canComplete)progress.append(el('small','Касайтесь изделия — оно свяжется быстрее'));dock.append(progress);
    const controls=staged?el('div',undefined,'staged-controls'):dock;
    controls.append(button(view.project.canComplete?(staged&&!session.state.project.recipeId&&!session.state.project.recraft?'Разместить':'Завершить'):'Вязать',event=>act({type:view.project.canComplete?'completeCraft':'click'},event),{cls:'button primary',key:'craft',art:true}));
    if(staged&&!view.project.canComplete){const auto=button('Авто: '+(view.craftAuto?'вкл':'выкл'),()=>act({type:'setCraftAuto',enabled:!view.craftAuto}),{cls:'button staged-auto',key:'craft-auto'});auto.setAttribute('aria-pressed',String(view.craftAuto));controls.append(auto);}
    if(staged)dock.append(controls);
    if(staged&&view.project.recraft)world.append(button('Отменить повтор',()=>act({type:'cancelRecraft'}),{cls:'button staged-cancel',key:'cancel-recraft'}));
   }else if(ui.screen==='workshop'){
    const ready=meadowView.slots.find(s=>s.canPlace&&!s.placed),next=(staged?nextStaged(view):null)??view.projects.find(p=>byId(p.itemId).meadowId===meadow.id&&!view.owned.includes(p.itemId)&&p.unlocked);
    if(ready){dock.append(el('p',byId(ready.itemId).displayName+' готов к полянке','action-hint'),button('Разместить',()=>{ui.screen='meadow';act({type:'placeItem',meadowId:meadow.id,slotId:ready.id});},{cls:'button primary',key:'next-place',art:true}));}
    else if(next){const item=byId(next.itemId);dock.append(el('p',item.displayName+' · '+next.yarnCost+' пряжи · '+item.benefit,'action-hint'),button('Начать',()=>act({type:'startProject',itemId:item.id}),{cls:'button primary',key:'next-project',disabled:!next.canStart,art:true}));if(!next.canStart)dock.append(el('small','Нужно ещё '+amount(Math.max(0,next.yarnCost-view.wallet.yarn))+' · полянки дают '+amount(view.rates.yarnPerHour)+'/ч','income-hint'));}
    else {const recipe=view.recipes.find(r=>r.unlocked&&view.events.find(e=>e.id===config.recipes.find(x=>x.id===r.recipeId).eventId).phase!=='done');
     if(recipe){const source=config.recipes.find(r=>r.id===recipe.recipeId);dock.append(el('p',source.displayName+' · '+source.yarnCost+' пряжи · '+source.benefit,'action-hint'),button('Начать',()=>act({type:'startRecipe',recipeId:recipe.recipeId}),{cls:'button primary',key:'next-recipe',disabled:!recipe.canStart,art:true}));}
     else dock.append(el('p','Все жители здесь дома. Новые встречи — в корзинке проектов.','action-hint'));
    }
   }else{
    const ready=meadowView.slots.find(s=>s.canPlace&&!s.placed);
    if(ready)dock.append(el('p',byId(ready.itemId).displayName+' готов здесь поселиться','action-hint'),button('Разместить',()=>act({type:'placeItem',meadowId:meadow.id,slotId:ready.id}),{cls:'button primary',key:'next-place',art:true}));
    else if(staged&&view.project){dock.append(button('Продолжить вязание',()=>navigate('workshop',definition().meadowId??ui.meadowId),{cls:'button primary',key:'continue-craft'}));}
    else if(staged&&nextStaged(view)){const next=nextStaged(view),item=byId(next.itemId);dock.append(el('p',(item.meadowId!==meadow.id?'Тропинка к пруду · ':'')+item.displayName+' · '+next.yarnCost+' пряжи','action-hint'),button('Начать',()=>act({type:'startProject',itemId:item.id}),{cls:'button primary',key:'next-project',disabled:!next.canStart,art:true}));}
    else{
     const selected=ui.selected[meadow.id],rules=meadowView.interactions.filter(r=>r.trigger==='manual'&&r.active&&!view.visitors.some(v=>v.itemId===r.actorSlot));
     const rule=rules.find(r=>r.actorSlot===selected)??rules[0];
     if(rule){const source=meadow.interactions.find(r=>r.id===rule.id);dock.append(el('p',byId(rule.actorSlot).displayName+' · +'+amount(rule.amount)+' пряжи'+(rule.workBonus&&view.project?' · −'+amount(savedSeconds(rule.workBonus,view))+' с вязания':'')+(rule.available?'':' · через '+duration((rule.readyAt-session.state.lastTimestamp)/1000)),'action-hint'),button(source.label,()=>act({type:'interact',meadowId:meadow.id,interactionId:rule.id}),{cls:'button primary contextual-action',key:'context-action',disabled:!rule.available,art:true}));}
     else dock.append(el('p','Первый проект ждёт в мастерской','action-hint'));
    }
   }
   world.append(dock);
  }
  const nav=el('nav',undefined,'tabs'+(runtime.buttonArt?' art-tabs':''));nav.setAttribute('aria-label','Места и проекты');
  for(const [id,label]of [['workshop','Мастерская'],['meadow','Полянка']]){const n=button(label,()=>navigate(id),{cls:'tab '+(!drawer&&ui.screen===id?'selected':''),key:'tab-'+id,art:true});if(!drawer&&ui.screen===id)n.setAttribute('aria-current','page');nav.append(n);}
  const projects=button('Проекты',()=>drawer?closeDrawer():openDrawer('projects'),{cls:'tab '+(drawer?'selected':''),key:'tab-projects',art:true});projects.setAttribute('aria-expanded',String(Boolean(drawer)));projects.setAttribute('aria-controls','projects-drawer');nav.append(projects);world.append(nav);
  if(notice){const n=el('p',notice,'notice');n.setAttribute('role','status');world.append(n);}
  if(drawer)for(const child of world.children)if(!child.classList.contains('project-drawer')&&!child.classList.contains('drawer-shade'))child.inert=true;
  section.append(world);app.append(section);stagedRenderer?.refresh();if(drawer)app.querySelector('.project-drawer').scrollTop=scroll;if(focused)([...app.querySelectorAll('[data-focus-key]')].find(n=>n.dataset.focusKey===focused)??app.querySelector('[data-focus-key="tab-projects"]'))?.focus({preventScroll:true});
 }
 render(drawer?'close-drawer':undefined);
 setInterval(()=>{
  const {before,state}=session.tick();
  for(const m of config.meadows)for(const r of m.interactions.filter(r=>r.trigger==='idle')){const id=m.id+'/'+r.id;if(before.cooldowns[id]!==undefined&&state.cooldowns[id]>before.cooldowns[id])announce(m.id,r.action,r.label+' · +'+amount(r.amount)+' пряжи',r.requires);}
  for(const [id,memory]of Object.entries(state.memories))if(memory.count>(before.memories[id]?.count??0)){const source=config.worldEvents.find(e=>e.id===id);announce(source.visitor.meadowId,'visit',source.visitText);}
  if(!pointerHeld)render();
 },1000);
 document.addEventListener('keydown',event=>{if(!drawer)return;if(event.key==='Escape'){event.preventDefault();closeDrawer();}if(event.key==='Tab'){const controls=[...app.querySelectorAll('.project-drawer button:not(:disabled)')],first=controls[0],last=controls.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}}});
 document.addEventListener('visibilitychange',()=>{if(document.hidden){hiddenState=structuredClone(session.state);session.tick();}else{const {state}=session.tick();if(hiddenState){away=summarizeAdvance(hiddenState,state,config);if(away)drawer='return';hiddenState=null;}render(drawer?'close-drawer':undefined);}});
 window.addEventListener('pagehide',()=>{session.tick();saveUI();});
}
