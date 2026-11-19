import {PATTERN_ID,ACCESSORIES} from '../app/core/pattern.mjs';
import {PATTERN_ART} from '../art-experiments/pattern-v1/art.mjs';
import {stagedFit} from './staged-layout.mjs';
import {intentPlan,intentComparison} from './pattern-intent.mjs';
const seconds=n=>Number(n.toFixed(2)).toLocaleString('ru-RU',{maximumFractionDigits:2})+' с';
export const patternMeadow=id=>id==='cat-doily'?'kotoutro':'test-meadow';
export const patternCompletion=id=>id===PATTERN_ID?'Запомнить узор':'Применить';
export function patternGuide(view,fallback,intent=null){
 if(!view.pattern?.unlocked)return fallback;
 if(view.pattern.job)return view.project.canComplete?'Работа готова. '+(view.project.itemId===PATTERN_ID?'Нажмите «Запомнить узор».':'Нажмите «Применить», чтобы украсить полянку.'):'Работу можно продолжить касаниями или включить «Авто».';
 const plan=intentPlan(view,intent);
 if(plan)return plan.remaining.length?'Мой замысел: '+plan.title+'. Готово '+plan.completed+' из '+plan.targets.length+'. Следующий выбор — в «Узорах».':'Замысел выполнен: '+plan.title+'.';
 return view.pattern.remaining.length?'Шарфик и салфетка ждут в «Узорах».': 'Оба аксессуара готовы. В этом эксперименте больше нет новых узоров.';
}
export function patternPanel({list,row,view,config,button,el,start,proceed,cancel,intent=null,chooseIntent,editIntent,choosingIntent=false,intentError=''}){
 const begin=(target,method)=>{const jobId=crypto.randomUUID();return ()=>start(target,method,jobId);};
 const p=view.pattern,definition=id=>config.items.find(i=>i.id===id),busy=Boolean(view.project),speed=view.rates.idle;
 if(!p.unlocked){list.append(el('p','Сначала разместите Кролика, Цветок, Дерево и Котика. Это откроет узор и два аксессуара.','return-copy'));return;}
 if(chooseIntent){
  const plan=intentPlan(view,intent),toggle=button(choosingIntent?'Свернуть':plan?'Изменить':'Выбрать',editIntent,{key:'intent-edit'});toggle.setAttribute('aria-expanded',String(choosingIntent));
  row('Мой замысел',plan?(plan.remaining.length?`${plan.title} · Готово ${plan.completed} из ${plan.targets.length}`:'Замысел выполнен: '+plan.title):'Не выбран · необязательно',toggle);
  if(choosingIntent){
  list.append(el('p','Выбор бесплатный, без очереди и автозапуска. Каждую работу начинаете сами.','drawer-note'));
  const choices=el('div',undefined,'pattern-intents');
  for(const [value,label]of [['rabbit-scarf','Шарфик'],['cat-doily','Салфетка'],['both','Оба аксессуара'],[null,'Без замысла']]){
   const control=button(label,()=>chooseIntent(value),{key:'intent-'+(value??'none')});control.setAttribute('aria-pressed',String(intent===value));choices.append(control);
  }
  list.append(choices);
  if(busy)list.append(el('p','Смена замысла не отменяет уже оплаченную работу.','drawer-note'));
  }
  if(intentError){const error=el('p',intentError,'return-copy');error.setAttribute('role','alert');list.append(error);}
 }
 if(busy){
  list.append(el('p','Рабочее место занято. Сначала завершите текущую работу; пауза сохраняет место за ней.','drawer-note'),button('Продолжить текущую работу',proceed,{key:'pattern-continue'}));
  if(p.job){const jobId=p.job.jobId;list.append(button('Отменить и вернуть пряжу',()=>cancel(jobId),{disabled:view.project.work!==0,key:'pattern-cancel'}),el('p','Возврат возможен только до первой петли. После начала можно выключить «Авто» и вернуться позже.','drawer-note'));}
 }
 const comparison=intentComparison(view,intent);
 if(comparison?.learned)list.append(el('p',`Узор изучен. Осталось вещей: ${comparison.count} · ${comparison.yarn} пряжи · ${seconds(comparison.work/speed)}. Повторно учиться не нужно.`,'pattern-comparison'));
 else if(comparison?.count===2)list.append(el('p',`За обе вещи: напрямую — 12 пряжи · ${seconds(288.4/speed)}; с изучением узора — 14 пряжи · ${seconds(261.88/speed)}. Экономия ${seconds(26.52/speed)} за 2 пряжи. Для одной вещи напрямую выгоднее.`,'pattern-comparison'));
 else if(comparison?.count===1)list.append(el('p',`За одну вещь: напрямую — 6 пряжи · ${seconds(144.2/speed)}; с изучением — 8 пряжи · ${seconds(160.94/speed)}. Изучение займёт больше времени и пряжи.`,'pattern-comparison'));
 if(comparison)list.append(el('p','Новые затраты · время с «Авто» при вашем темпе. Касания ускоряют. Результат одинаковый.','drawer-note'));
 const learningRow=()=>row('Узор «Ромашка»',p.learned?'Изучен навсегда · не расходуется':p.remaining.length?'2 пряжи · '+seconds(60/speed)+' · занимает рабочее место':'Оба аксессуара готовы — изучение больше не нужно',button(p.learned?'Изучен':'Изучить узор',begin(PATTERN_ID,'learn'),{disabled:busy||p.learned||!p.remaining.length||view.wallet.yarn<2,key:'pattern-learn'}));
 if(!p.learned)learningRow();
 const wanted=intentPlan(view,intent)?.remaining??[];
 const ordered=[...ACCESSORIES].sort((a,b)=>Number(wanted.includes(b))-Number(wanted.includes(a))||Number(view.owned.includes(a))-Number(view.owned.includes(b)));
 for(const id of ordered){
  const owned=view.owned.includes(id),controls=el('div',undefined,'staged-project-actions');
  const method=p.learned?'learned':'direct';controls.append(button(p.learned?'По узору':'Напрямую',begin(id,method),{disabled:busy||owned||view.wallet.yarn<6,key:`pattern-${id}-${method}`}));
  const entry=row(definition(id).displayName,owned?'Готово · уже украшает полянку':'6 пряжи · '+(p.learned?'по узору '+seconds(100.94/speed):'напрямую '+seconds(144.2/speed)),controls);
  const preview=el('img');preview.src=new URL('../'+PATTERN_ART[id].finishedSprite,import.meta.url).href;preview.alt='Будущее украшение: '+definition(id).displayName;preview.className='pattern-preview';entry.prepend(preview);
 }
 if(p.learned)learningRow();
 list.append(el('p','Украшения необязательны и не меняют доход. Узор запоминается навсегда.','drawer-note'));
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
