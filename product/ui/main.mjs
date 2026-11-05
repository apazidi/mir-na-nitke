import {createSession} from '../app/ui/session.mjs';
import {loadRuntimeCatalog,selectStage,placementLayout} from '../app/content/index.mjs';
import {developmentCatalog} from './dev-catalog.mjs';
const app=document.querySelector('#app'), params=new URLSearchParams(location.search), mode=params.get('mode');
const dev=mode==='development'||mode==='art-review';
const el=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
let buttonSequence=0;
let notice='',screen='workshop',evening=false,selectedMeadow=0,feedback='',feedbackUntil=0;
const button=(label,fn,disabled=false,cls='button soft')=>{const b=el('button',label,cls);b.type='button';b.dataset.focusKey=String(buttonSequence++);b.disabled=disabled;b.addEventListener('click',fn);return b;};
const image=(src,alt,cls)=>{const e=el('img',undefined,cls);e.src=src;e.alt=alt;e.addEventListener('error',()=>{e.hidden=true;notice='Часть иллюстраций недоступна. Арт ещё не прошёл приёмку.';},{once:true});return e;};
try {
 const runtime=dev?developmentCatalog(mode==='art-review'):await loadRuntimeCatalog(new URL('../app/content/catalog.json',import.meta.url));
 const {catalog,config,assetUrl}=runtime;
 if(!catalog.items.length||!catalog.meadows.length){app.replaceChildren(el('h1','Мир на ниточке'),el('p','Готовые полянки ещё проходят художественную приёмку.'),el('p','Игровая сборка не подменяет их черновыми пакетами.'));}
 else {
 let storage;try{storage=localStorage;}catch{notice='Хранилище браузера недоступно. Прогресс сохранится только в этой вкладке.';}
 const session=createSession(config,{storage,key:dev?'mir-na-nitke-development-v1':'mir-na-nitke-v1',onNotice:t=>{notice=t;}});
 function act(action){const ok=session.act(action);if(ok&&['pet','sniff'].includes(action.type)){feedback='Тёплая встреча · бонус пряжи';feedbackUntil=Date.now()+2800;}render();}
 function render(){
  const focused=document.activeElement?.dataset.focusKey;buttonSequence=0;
  const view=session.view,m=catalog.meadows[selectedMeadow],mv=view.meadows.find(x=>x.id===m.id);
  app.replaceChildren();
  const header=el('header',undefined,'app-header');header.append(el('strong','Мир на ниточке'),el('span',`${view.wallet.yarn.toFixed(1)} пряжи`));app.append(header);
  app.append(el('p',dev?(mode==='art-review'?'ART REVIEW · кролик не утверждён, остальные фигуры тестовые':'ТЕХНИЧЕСКИЙ ПРОТОТИП · тестовые фигуры'):'Игровой прототип','build-label'));
  const section=el('section',undefined,'view');section.id='view-'+screen;
  const world=el('div',undefined,'meadow-scene');
  const project=view.project&&catalog.items.find(i=>i.id===view.project.itemId);
  const art=screen==='workshop'&&project?selectStage(project,view.project.progress)?.image:m.art[evening?'backgroundEvening':'backgroundDay'];
  if(art)world.append(image(assetUrl(project&&screen==='workshop'?project:m,art),project?project.displayName:m.displayName,'meadow-back'));
  const title=el('div',undefined,'section-title');title.append(el('h1',screen==='workshop'?'Мастерская':m.displayName));world.append(title);
  if(screen==='meadow'){
   for(const slot of placementLayout(m,session.state.placements[m.id]??{},catalog.items)){
    const target=button(slot.item.displayName,()=>{const rule=mv.interactions.find(r=>r.trigger==='manual'&&r.available&&m.interactions.find(x=>x.id===r.id)?.actorSlot===slot.id);if(rule)act({type:rule.action,meadowId:m.id,interactionId:rule.id});},false,'placed-object');
    target.replaceChildren(image(assetUrl(slot.item,slot.item.art.finishedSprite),slot.item.displayName));target.style.left=slot.x*100+'%';target.style.top=slot.y*100+'%';target.style.width=50*slot.scale+'%';target.style.zIndex=String(6+slot.z);world.append(target);
   }
   if(!Object.keys(session.state.placements[m.id]??{}).length)world.append(el('p','Свяжите первый предмет в мастерской','world-message'));
  }
  if(screen==='workshop'&&!project)world.append(el('p','Выберите следующий проект ниже','world-message'));
  if(project&&screen==='workshop'){
   const progress=el('div',undefined,'progress-panel');progress.append(el('span',`${project.displayName} · ${Math.floor(view.project.progress*100)}%`));const bar=el('progress');bar.max=1;bar.value=view.project.progress;progress.append(bar);world.append(progress);
  }
  if(Date.now()<feedbackUntil)world.append(el('p',feedback,'feedback'));
  const actions=el('div',undefined,'meadow-actions');
  if(screen==='workshop')actions.append(button(view.project?.canComplete?'Завершить':'Вязать',()=>act({type:view.project?.canComplete?'completeCraft':'click'}),!project,'button primary'));
  else {for(const rule of mv.interactions.filter(r=>r.trigger==='manual'))actions.append(button('Погладить',()=>act({type:rule.action,meadowId:m.id,interactionId:rule.id}),!rule.available));}
  actions.append(button(evening?'День':'Вечер',()=>{evening=!evening;render();}));world.append(actions);
  const nav=el('nav',undefined,'tabs');for(const [id,label]of [['workshop','Мастерская'],['meadow','Полянка']])nav.append(button(label,()=>{screen=id;render();},false,'tab '+(screen===id?'selected':'')));world.append(nav);section.append(world);app.append(section);
  const details=el('section',undefined,'project-list');
  if(screen==='workshop'){
   for(const p of view.projects){const item=catalog.items.find(i=>i.id===p.itemId);const row=el('div',undefined,'project-row');row.append(el('span',`${item.displayName} · ${p.yarnCost} пряжи`),button(view.owned.includes(item.id)?'Готово':'Начать',()=>act({type:'startProject',itemId:item.id}),!p.canStart));details.append(row);}
   for(const u of view.upgrades){const row=el('div',undefined,'project-row');row.append(el('span',`${u.id==='hook'?'Удобный крючок':'Корзинка помощница'} · ур. ${u.level} · ${u.cost.toFixed(1)} пряжи`),button('Улучшить',()=>act({type:'buyUpgrade',upgradeId:u.id}),!u.canBuy));details.append(row);}
  }else{
   for(const slot of mv.slots){const item=catalog.items.find(i=>i.id===slot.itemId);const row=el('div',undefined,'project-row');row.append(el('span',item.displayName),button(slot.placed?'На полянке':'Разместить',()=>act({type:'placeItem',meadowId:m.id,slotId:slot.id}),!slot.canPlace||slot.placed));details.append(row);}
   if(catalog.meadows.length>1)for(const [n,meadow]of catalog.meadows.entries())details.append(button(meadow.displayName,()=>{selectedMeadow=n;render();}));
  }
  app.append(details);if(notice){const status=el('p',notice,'notice');status.setAttribute('role','status');app.append(status);}
  if(focused!==undefined)app.querySelector('[data-focus-key="'+focused+'"]')?.focus({preventScroll:true});
  app.append(el('p','Скин v4 · техническая сборка. Надписи кнопок временно текстовые: утверждённой библиотеки изображений кнопок пока нет.','help-line'));
 }
 render();setInterval(()=>{const {before,state}=session.tick();for(const m of config.meadows)for(const r of m.interactions??[]){const id=m.id+'/'+r.id;if(r.trigger==='idle'&&before.cooldowns[id]!==undefined&&state.cooldowns[id]>before.cooldowns[id]){const actor=m.slots.find(s=>s.id===r.actorSlot);const name=config.items.find(i=>i.id===actor?.itemId)?.displayName??m.displayName;feedback=name+' · '+(r.action==='sniff'?'исследует полянку':'живёт своей жизнью')+' · бонус пряжи';feedbackUntil=Date.now()+3000;}}render();},1000);
 document.addEventListener('visibilitychange',()=>{session.tick();render();});window.addEventListener('pagehide',()=>session.tick());
 }
}catch(error){app.replaceChildren(el('h1','Не удалось открыть игру'),el('p','Проверьте сборку каталога и доступ к файлам. Ваше сохранение не изменено.'),el('pre',error.message));}

