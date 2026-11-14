import {PATTERN_ID,ACCESSORIES} from '../app/core/pattern.mjs';
import {PATTERN_ART} from '../art-experiments/pattern-v1/art.mjs';
import {stagedFit} from './staged-layout.mjs';
const seconds=n=>Number(n.toFixed(2)).toLocaleString('ru-RU',{maximumFractionDigits:2})+' с';
export const patternMeadow=id=>id==='cat-doily'?'kotoutro':'test-meadow';
export const patternCompletion=id=>id===PATTERN_ID?'Запомнить узор':'Применить';
export function patternGuide(view,fallback){
 if(!view.pattern?.unlocked)return fallback;
 if(view.pattern.job)return view.project.canComplete?'Работа готова. '+(view.project.itemId===PATTERN_ID?'Нажмите «Запомнить узор».':'Нажмите «Применить», чтобы украсить полянку.'):'Работу можно продолжить касаниями или включить «Авто».';
 return view.pattern.remaining.length?'Шарфик и салфетка ждут в «Узорах».': 'Оба аксессуара готовы. В этом эксперименте больше нет новых узоров.';
}
export function patternPanel({list,row,view,config,button,el,start,proceed,cancel}){
 const begin=(target,method)=>{const jobId=crypto.randomUUID();return ()=>start(target,method,jobId);};
 const p=view.pattern,definition=id=>config.items.find(i=>i.id===id),busy=Boolean(view.project),speed=view.rates.idle;
 list.append(el('p','Необязательное украшение мира. Узор «Ромашка» запоминается навсегда и ускоряет оба аксессуара. Доход не меняется.','drawer-note'));
 if(!p.unlocked){list.append(el('p','Сначала разместите Кролика, Цветок, Дерево и Котика. Это откроет узор и два аксессуара.','return-copy'));return;}
 if(busy){
  list.append(el('p','Рабочее место занято. Сначала завершите текущую работу; пауза сохраняет место за ней.','drawer-note'),button('Продолжить текущую работу',proceed,{key:'pattern-continue'}));
  if(p.job){const jobId=p.job.jobId;list.append(button('Отменить и вернуть пряжу',()=>cancel(jobId),{disabled:view.project.work!==0,key:'pattern-cancel'}),el('p','Возврат возможен только до первой петли. После начала можно выключить «Авто» и вернуться позже.','drawer-note'));}
 }
 if(!p.learned&&p.remaining.length===2)list.append(el('p',`Два аксессуара напрямую: 12 пряжи · ${seconds(288.4/speed)}. Изучить узор и связать оба: 14 пряжи · ${seconds(261.88/speed)}. Узор сбережёт ${seconds(26.52/speed)}, но потребует ещё 2 пряжи. Если нужна одна вещь, напрямую быстрее и дешевле.`,'pattern-comparison'));
 if(!p.learned&&p.remaining.length===1)list.append(el('p',`Остался один аксессуар: напрямую — 6 пряжи · ${seconds(144.2/speed)}. Вместе с изучением узора — 8 пряжи · ${seconds(160.94/speed)}. Для одной работы изучение займёт больше времени.`,'pattern-comparison'));
 if(p.remaining.length)list.append(el('p','Время указано для включённой автовязки при вашем текущем темпе. Касания ускоряют работу. Оба способа дают одинаковое украшение.','drawer-note'));
 row('Узор «Ромашка»',p.learned?'Изучен навсегда · не расходуется':p.remaining.length?'2 пряжи · '+seconds(60/speed)+' · занимает рабочее место':'Оба аксессуара готовы — изучение больше не нужно',button(p.learned?'Изучен':'Изучить узор',begin(PATTERN_ID,'learn'),{disabled:busy||p.learned||!p.remaining.length||view.wallet.yarn<2,key:'pattern-learn'}));
 for(const id of ACCESSORIES){
  const owned=view.owned.includes(id),controls=el('div',undefined,'staged-project-actions');
  const method=p.learned?'learned':'direct';controls.append(button(p.learned?'По узору':'Напрямую',begin(id,method),{disabled:busy||owned||view.wallet.yarn<6,key:`pattern-${id}-${method}`}));
  const entry=row(definition(id).displayName,owned?'Готово · уже украшает полянку':'6 пряжи · '+(p.learned?'по узору '+seconds(100.94/speed):'напрямую '+seconds(144.2/speed)),controls);
  const preview=el('img');preview.src=new URL('../'+PATTERN_ART[id].finishedSprite,import.meta.url).href;preview.alt='Будущее украшение: '+definition(id).displayName;preview.className='pattern-preview';entry.prepend(preview);
 }
}
/** Apply only owned accessories. Original resident artwork stays untouched. */
export function applyScarf(target,visual,art,state,image){
 if(!state.owned.includes('rabbit-scarf'))return;
 const accessory=image(new URL('../'+PATTERN_ART['rabbit-scarf'].finishedSprite,import.meta.url).href,'Шарфик Кролика','pattern-accessory');accessory.dataset.patternApplied='rabbit-scarf';
 const [x,y,w,h]=PATTERN_ART['rabbit-scarf'].application.rect,[l,t]=art.visibleBounds;
 const scale=parseFloat(visual.style.width)/art.width;
 Object.assign(accessory.style,{position:'absolute',left:(x-l)*scale+'px',top:(y-t)*scale+'px',width:w*scale+'px',height:h*scale+'px',objectFit:'fill',pointerEvents:'none'});
 target.querySelector('[data-pattern-applied]')?.remove();target.append(accessory);
}
export function applyDoily(world,state,meadowId,art,image){
 if(meadowId!=='kotoutro'||!state.owned.includes('cat-doily')||!art)return;
 const decoration=image(art.finishedUrl,'Салфетка Котика','pattern-doily');decoration.dataset.patternApplied='cat-doily';world.append(decoration);
 requestAnimationFrame(()=>{const fit=stagedFit('cat-doily',art,world.clientWidth,world.clientHeight,PATTERN_ART['cat-doily'].application.pose);Object.assign(decoration.style,{left:fit.x+'px',top:fit.y+'px',width:art.width*fit.scale+'px',height:art.height*fit.scale+'px'});});
}
