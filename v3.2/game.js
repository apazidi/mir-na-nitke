import {STAGES, DEFAULT_TOTAL_WORK, progress, stageIndex, stageThreshold, nextMilestone, clickGain, idleRate, upgradeCost, applyWork, hydrate, newState} from './game-engine.js';
(() => {
'use strict';
const $ = id => document.getElementById(id);
const params = new URLSearchParams(location.search);
const demo = params.get('demo') === '1';
const KEY = `mir-na-nitke/v3.2/${demo ? 'demo':'play'}`;
const TOTAL = DEFAULT_TOTAL_WORK;
let state = newState();
let prev = performance.now(), saveSeconds = 0, priorStage = -1, toastTimeout = 0, particleTimeout = 0;
const fmt = new Intl.NumberFormat('ru-RU', {maximumFractionDigits:0});
const sources = STAGES.map((s,i)=>`./assets/stage-${String(i).padStart(2,'0')}.webp`);
const imgCache = sources.map(src=>{const i=new Image();i.src=src;return i});
function save(){try{state.lastSeenAt=Date.now();localStorage.setItem(KEY,JSON.stringify(state))}catch(_){}}
try{
  const raw=JSON.parse(localStorage.getItem(KEY)||'null');
  const recovered=hydrate(raw,Date.now(),TOTAL);
  state=recovered.state;
  if(raw&&recovered.earnedSeconds>45)window.addEventListener('load',()=>toast('Пока тебя не было, мастерская продолжала работу ✨'),{once:true});
}catch(_){}
function toast(message){const el=$('toast');el.textContent=message;el.classList.add('active');clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>el.classList.remove('active'),2100)}
function sparkle(){const s=$('sparkles');s.classList.remove('active');void s.offsetWidth;s.classList.add('active');clearTimeout(particleTimeout);particleTimeout=setTimeout(()=>s.classList.remove('active'),900)}
function changeStage(index){if(index===priorStage)return;const before=priorStage;priorStage=index;
  const im=$('stage-image');im.src=sources[index];im.alt=STAGES[index].alt;
  const hero=$('hero-art');hero.classList.remove('stage-pop');void hero.offsetWidth;hero.classList.add('stage-pop');
  if(index>0&&before>=0){sparkle();toast(`✿ ${STAGES[index].name}`)}
}
function update(){const completed=state.work>=TOTAL;const p=progress(state.work,TOTAL);const index=stageIndex(state.work,TOTAL);changeStage(index);
  $('progress-fill').style.width=(p*97).toFixed(2)+'%';$('progress-percent').textContent=Math.floor(p*100)+'%';$('progress-track').setAttribute('aria-valuenow',String(Math.floor(p*100)));
  $('task-title').textContent=completed?'Кролик готов!':'Вяжем кролика';
  $('stage-pill').textContent=STAGES[index].name;
  $('coins').textContent=fmt.format(Math.floor(state.coins));
  $('idle-rate').textContent=idleRate(state.idleLevel).toFixed(1).replace('.',',');
  $('click-gain').textContent=`+${clickGain(state.clickLevel)} очка прогресса`;
  $('click-description').textContent=`+12 к нажатию · ур. ${state.clickLevel}`;
  $('idle-description').textContent=`+1,2 очка/сек · ур. ${state.idleLevel}`;
  const cp=upgradeCost('click',state.clickLevel),ip=upgradeCost('idle',state.idleLevel);
  $('click-price').textContent=fmt.format(cp);$('idle-price').textContent=fmt.format(ip);
  $('knit-button').disabled=completed;
  $('upgrade-click').disabled=completed||state.coins<cp;
  $('upgrade-idle').disabled=completed||state.coins<ip;
  $('hero-art').classList.toggle('alive',state.meadow);
  if(demo){$('stage-slider').value=String(index);$('stage-label').textContent=`${index+1} / 8`}
  if(completed&&!state.completionSeen&&!demo){$('completion').hidden=false;state.completionSeen=true;save()}
}
function click(){if(state.work>=TOTAL)return;const was=stageIndex(state.work,TOTAL);state=applyWork(state,clickGain(state.clickLevel),TOTAL);update();save();
  if(stageIndex(state.work,TOTAL)===was){const b=$('knit-button');b.classList.add('tapped');setTimeout(()=>b.classList.remove('tapped'),95)}
  try{window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light')}catch(_){}
}
function buy(type){if(state.work>=TOTAL)return;
  const level=type==='click'?state.clickLevel:state.idleLevel;
  const cost=upgradeCost(type,level);
  if(state.coins<cost){toast('Нужно ещё немного ниточек');return}
  state.coins-=cost;
  if(type==='click')state.clickLevel++;else state.idleLevel++;
  update();save();toast(type==='click'?'Ловкий крючок улучшен!':'Клубочек стал быстрее!');
}
$('knit-button').addEventListener('click',click);
$('upgrade-click').addEventListener('click',()=>buy('click'));
$('upgrade-idle').addEventListener('click',()=>buy('idle'));
$('finish-close').addEventListener('click',()=>{state.meadow=true;$('completion').hidden=true;update();save();sparkle();toast('Теперь на полянке живёт кролик 🐰')});
const dialog=$('settings-dialog');
$('settings-open').addEventListener('click',()=>dialog.showModal());
$('settings-close').addEventListener('click',()=>dialog.close());
$('restart').addEventListener('click',()=>{state=newState();priorStage=-1;$('completion').hidden=true;update();save();dialog.close();toast('Новая ниточка — новая история!')});
if(demo){$('demo-tools').hidden=false;
  $('stage-slider').addEventListener('input',event=>{const i=Number(event.target.value);state.work=stageThreshold(i,TOTAL);state.meadow=false;state.completionSeen=i>=7;$('completion').hidden=true;update();save()});
  $('reset-demo').addEventListener('click',()=>{state=newState();priorStage=-1;update();save();toast('Начинаем с первой ниточки')});
}
function frame(now){const dt=Math.min(.25,Math.max(0,(now-prev)/1000));prev=now;
  if(!document.hidden&&state.work<TOTAL){state=applyWork(state,dt*idleRate(state.idleLevel),TOTAL);update();saveSeconds+=dt;if(saveSeconds>1){save();saveSeconds=0;}}
  requestAnimationFrame(frame);
}
document.addEventListener('visibilitychange',()=>{if(document.hidden)save();else{state=hydrate(state,Date.now(),TOTAL).state;prev=performance.now();update();save()}});
window.addEventListener('pagehide',save);
update();requestAnimationFrame(frame);
window.__knitV32={getState:()=>({...state}),getStage:()=>stageIndex(state.work,TOTAL),advance:(n)=>{state=applyWork(state,n,TOTAL);update();save()},reset:()=>{state=newState();priorStage=-1;$('completion').hidden=true;update();save()},setStage:(i)=>{state.work=stageThreshold(i,TOTAL);state.completionSeen=true;state.meadow=false;update();save()},sources};
})();
