import {STORAGE_KEY,FLOWER_WORK,FLOWER_STAGES,initialState,hydrate,startFlower,applyWork,buyUpgrade,clickGain,idleRate,upgradeCost,progress,stageIndex,completedCount,placeFlower,visitMeadow,petRabbit,sniffFlower,isEvening} from './world-model.mjs';
(()=>{'use strict';
const $=id=>document.getElementById(id);
const demo=new URLSearchParams(location.search).get('demo')==='1';
const key=STORAGE_KEY+(demo?'/demo':'');
let raw=null;try{raw=JSON.parse(localStorage.getItem(key)||'null')}catch(_){/* private storage */}
let {state,earnedSeconds}=hydrate(raw,Date.now());
let view='meadow',bubbleTimer=0,toastTimer=0,animTimer=0,saveSecs=0,lastFrame=performance.now(),lastRender=0,lastSniff=0,suppressClickUntil=0,stroke=null;
const fmt=new Intl.NumberFormat('ru-RU',{maximumFractionDigits:0});
const multiplier=demo?8:1;
const save=()=>{try{state.lastSeenAt=Date.now();localStorage.setItem(key,JSON.stringify(state));}catch(_){}};
const isComplete=()=>state.projects.flower==='completed'||state.projects.flower==='living';
function toast(text){const el=$('toast');el.textContent=text;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),2600)}
function say(text){const el=$('bunny-bubble');el.textContent=text;el.classList.add('active');clearTimeout(bubbleTimer);bubbleTimer=setTimeout(()=>el.classList.remove('active'),2800)}
function animation(type,ms=1000){const el=$('rabbit');el.classList.remove('greet','nuzzle','sniff');void el.offsetWidth;el.classList.add(type);clearTimeout(animTimer);animTimer=setTimeout(()=>el.classList.remove(type),ms)}
function heart(){const layer=$('hearts'),h=document.createElement('span');h.className='heart';h.textContent=state.meadows.rabbit01.pets%3===0?'✿':'♥';h.style.left=(24+Math.random()*25)+'%';h.style.top=(54+Math.random()*8)+'%';layer.append(h);setTimeout(()=>h.remove(),1200)}
function greet(){animation('greet',800);say(['Привет, дружище! ♡','Рад тебя видеть!','Хочешь погладить меня?'][state.meadows.rabbit01.visits%3]);try{window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light')}catch(_){}}
function pet(){state=petRabbit(state);animation('nuzzle');heart();say(['Как приятно! ♡','Спасибо за ласку!','Я люблю нашу полянку.'][state.meadows.rabbit01.pets%3]);save()}
function sniff(auto=false){lastSniff=Date.now();if(!state.meadows.rabbit01.objects.flower){toast('Сначала нужно связать цветок');return;}
 state=sniffFlower(state);animation('sniff',1300);if(!auto)say('Как вкусно пахнет наш цветок! 🌼');save();}
function setLighting(){const m=state.meadows.rabbit01;const evening=isEvening(m.light,new Date().getHours());$('meadow-scene').classList.toggle('evening',evening);$('light-name').textContent=evening?'Вечер':'День';$('toggle-light').firstChild.textContent=evening?'🌙 ':'🌤️ ';}
function markView(next,trackVisit=true){view=next;document.querySelectorAll('.view').forEach(el=>el.hidden=el.id!==`view-${next}`);document.querySelectorAll('[data-view]').forEach(el=>{const active=el.dataset.view===next;el.classList.toggle('selected',active);el.setAttribute('aria-current',active?'page':'false')});
  if(next==='meadow'&&trackVisit){const ret=visitMeadow(state,Date.now());state=ret.state;if(ret.event)$('diary').textContent=ret.event;save()}
  render(true);window.scrollTo({top:0,behavior:'instant'});
}
function actionMeadow(){const status=state.projects.flower;if(status==='available'){state=startFlower(state);save();markView('workshop');toast('Новый проект: Цветок! 🌼');return}
 if(status==='knitting'){markView('workshop');return}
 if(status==='completed'){doPlace();return}
 sniff();}
function doPlace(){if(state.projects.flower!=='completed'){return;}state=placeFlower(state);$('diary').textContent='Сегодня на полянке появился первый цветок! Теперь кролик может его нюхать.';save();markView('meadow',false);toast('Цветок посажен! Полянка стала уютнее 🌼');setTimeout(()=>sniff(false),500)}
function flowerSlot(){switch(state.projects.flower){case 'available':markView('projects');break;case 'knitting':markView('workshop');break;case 'completed':doPlace();break;case 'living':sniff();break;}}
function doTap(){if(state.projects.flower!=='knitting'){if(isComplete())toast('Цветок уже готов! Перейди на полянку');else toast('Выбери проект «Цветок»');return;}
 const previous=stageIndex(state.workshop.work);const gain=clickGain(state.workshop.clickLevel)*multiplier;
 state=applyWork(state,gain);const next=stageIndex(state.workshop.work);
 if(next>previous){toast(next===4?'Цветок готов!':'✧ '+FLOWER_STAGES[next].title)}
 save();render(true);try{window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light')}catch(_){}}
function buy(type){const before=state.workshop.coins;const next=buyUpgrade(state,type);if(next===state){toast('Пока не хватает ниточек 🧶');return;}state=next;save();render(true);toast(type==='click'?'Крючок стал ловчее!':'Клубочек работает быстрее!')}
function render(force=false){const now=Date.now();if(!force&&now-lastRender<220)return;lastRender=now;
 const status=state.projects.flower,done=status==='living',n=completedCount(state),pct=Math.round(progress(state)*100);$('meadow-count').textContent=n;$('project-count').textContent=n;$('atlas-progress').textContent=n;
 $('visit-count').textContent=`Визит ${state.meadows.rabbit01.visits}`;
 const words={available:'🌼 Связать цветок',knitting:'🪝 Продолжить цветок',completed:'🌼 Посадить цветок',living:'🌼 Понюхать цветок'};
 $('primary-meadow').textContent=words[status]||'Цветок';
 $('flower-empty').hidden=done;$('flower-placed').hidden=!done;
 $('flower-slot').classList.toggle('ready',status==='completed');
 $('flower-slot-label').textContent=status==='completed'?'Посадить':'Цветок';
 $('flower-slot').setAttribute('aria-label',done?'Понюхать цветок':status==='completed'?'Посадить готовый цветок':'Место для цветка — открыть проект');
 $('meadow-help').textContent=done?'Коснись цветка: кролик подойдёт его понюхать. Его по-прежнему можно гладить.':'Коснись кролика — он поздоровается. Проведи по нему пальцем, чтобы погладить.';
 $('flower-status-desc').textContent={available:'Можно начать вязать',knitting:'Вяжется в мастерской',completed:'Готов — осталось посадить',living:'Уже растёт на полянке'}[status];
 $('project-flower').textContent={available:'Начать',knitting:'Продолжить',completed:'Посадить',living:'На полянку'}[status];
 const w=state.workshop,idx=stageIndex(w.work),st=FLOWER_STAGES[idx];
 $('work-stage-badge').textContent=`Этап ${idx+1} из 5`;
 $('work-stage-name').textContent=st.title;$('work-progress').textContent=pct+'%';$('work-fill').style.width=pct+'%';
 const flowerImg=$('flower-stage');const url=`./assets/flower-stage-${String(idx).padStart(2,'0')}.webp`;if(flowerImg.getAttribute('src')!==url)flowerImg.src=url;flowerImg.alt=st.detail;
 $('work-coins').textContent=fmt.format(Math.floor(w.coins));$('work-idle').textContent=(idleRate(w.idleLevel)*multiplier).toFixed(1).replace('.',',');$('tap-value').textContent=`+${clickGain(w.clickLevel)*multiplier} очков`;
 $('click-cost').textContent=`${fmt.format(upgradeCost('click',w.clickLevel))} 🧶`;$('idle-cost').textContent=`${fmt.format(upgradeCost('idle',w.idleLevel))} 🧶`;
 $('click-level').textContent='ур. '+w.clickLevel;$('idle-level').textContent='ур. '+w.idleLevel;
 $('knit').disabled=status!=='knitting';$('knit').querySelector('b').textContent=status==='knitting'?'Вязать':isComplete()?'Готово!':'Начать';
 $('upgrade-click').disabled=status!=='knitting'||w.coins<upgradeCost('click',w.clickLevel);$('upgrade-idle').disabled=status!=='knitting'||w.coins<upgradeCost('idle',w.idleLevel);
 $('work-note').textContent={available:'Выбери проект «Цветок», затем начинай вязать.',knitting:'Клики и автоматическое вязание вместе приближают завершение цветка.',completed:'Цветок готов! Вернись на полянку и посади его.',living:'Цветок уже растёт на полянке. Можно его навестить.'}[status];
 $('work-finished').hidden=!isComplete();$('work-finished').textContent=status==='completed'?'🌼 Посадить цветок на полянке':'🌿 Вернуться на полянку';
 setLighting();
}
function reset(){state=initialState(Date.now());state=visitMeadow(state,Date.now()).state;$('diary').textContent='Кролик обживается на своей полянке.';save();markView('meadow',false);toast('Новая история начинается!')}
// User interactions
 document.querySelectorAll('[data-view]').forEach(el=>el.addEventListener('click',()=>markView(el.dataset.view)));
 $('primary-meadow').addEventListener('click',actionMeadow);
 $('project-flower').addEventListener('click',actionMeadow);
 $('flower-slot').addEventListener('click',flowerSlot);
 $('pet').addEventListener('click',pet);
 $('rabbit').addEventListener('pointerdown',e=>{stroke={x:e.clientX,y:e.clientY,id:e.pointerId}});
 $('rabbit').addEventListener('pointerup',e=>{if(!stroke||stroke.id!==e.pointerId)return;let dx=e.clientX-stroke.x,dy=e.clientY-stroke.y;stroke=null;if(Math.abs(dx)>23&&Math.abs(dx)>Math.abs(dy)*1.1){suppressClickUntil=Date.now()+500;pet()}});
 $('rabbit').addEventListener('pointercancel',()=>stroke=null);
 $('rabbit').addEventListener('click',()=>{if(Date.now()<suppressClickUntil)return;greet()});
 document.querySelectorAll('[data-locked]').forEach(el=>el.addEventListener('click',()=>toast({tree:'Дерево',house:'Домик',butterfly:'Бабочка'}[el.dataset.locked]+' — будущий проект полянки. Скоро!')));
 $('knit').addEventListener('click',doTap);$('upgrade-click').addEventListener('click',()=>buy('click'));$('upgrade-idle').addEventListener('click',()=>buy('idle'));
 $('work-finished').addEventListener('click',()=>{if(state.projects.flower==='completed')doPlace();else markView('meadow')});
 $('atlas-first').addEventListener('click',()=>markView('meadow'));
 $('atlas-next').addEventListener('click',()=>toast('Следующая полянка откроется после появления новых проектов в одном из будущих выпусков'));
 $('toggle-light').addEventListener('click',()=>{const m=state.meadows.rabbit01;m.light=isEvening(m.light,new Date().getHours())?'day':'evening';setLighting();save()});
 if(demo){$('demo-reset').hidden=false;$('demo-reset').addEventListener('click',reset)}
 // Continuously accrue idle work while any tab is visible. Offline catch-up on focus.
 function tick(time){const delta=Math.min(.25,Math.max(0,(time-lastFrame)/1000));lastFrame=time;if(!document.hidden&&state.projects.flower==='knitting'){
  const prior=stageIndex(state.workshop.work);state=applyWork(state,delta*idleRate(state.workshop.idleLevel)*multiplier);
  if(stageIndex(state.workshop.work)>prior&&state.projects.flower==='completed')toast('Цветок готов! Вернись на полянку 🌼');
  saveSecs+=delta;if(saveSecs>2){saveSecs=0;save()}
 }
 if(!document.hidden&&view==='meadow'&&state.projects.flower==='living'&&Date.now()-lastSniff>45000){lastSniff=Date.now();sniff(true)}
 render();requestAnimationFrame(tick)
 }
 document.addEventListener('visibilitychange',()=>{if(document.hidden){save()}else{const ret=hydrate(state,Date.now());state=ret.state;if(ret.earnedSeconds>45&&state.projects.flower==='completed')toast('Цветок довязался, пока тебя не было!');lastFrame=performance.now();render(true);save()}});
 window.addEventListener('pagehide',save);
 const ret=visitMeadow(state,Date.now());state=ret.state;if(ret.event)$('diary').textContent=ret.event;
 if(earnedSeconds>45&&state.projects.flower==='completed')setTimeout(()=>toast('Пока тебя не было, цветок довязался!'),700);
 save();render(true);requestAnimationFrame(tick);
 window.__knitV41={state:()=>structuredClone(state),start:()=>{state=startFlower(state);save();render(true)},advance:(q)=>{state=applyWork(state,q);save();render(true)},place:doPlace,reset,view:markView};
})();
