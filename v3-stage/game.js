import {STAGES,DEFAULT_TOTAL_WORK,progress,stageIndex,nextMilestone,stageThreshold,clickGain,idleRate,upgradeCost,applyWork,hydrate,newState} from './game-engine.js';
(() => {
'use strict';
const demo=new URLSearchParams(location.search).get('demo')==='1';
const STORAGE_KEY='mir-na-nitke/v3.1/'+(demo?'demo':'play');
const TOTAL=DEFAULT_TOTAL_WORK;
const $=(id)=>document.getElementById(id);
const format=new Intl.NumberFormat('ru-RU',{maximumFractionDigits:0});
let state=newState();let stageBefore=-1,toastTimeout,sceneTimeout,saveElapsed=0,prevTime=performance.now(),frameToken=0;
try{const raw=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');const loaded=hydrate(raw,Date.now(),TOTAL);state=loaded.state;if(loaded.earnedSeconds>40&&raw) window.addEventListener('load',()=>toast('Пока тебя не было, ниточки продолжали вязаться! ✨'),{once:true});}catch(_){/* localStorage can be unavailable in private contexts */}
const preload=new Map();function getImage(index){const src='./assets/stage-'+String(index).padStart(2,'0')+'.webp';if(!preload.has(index)){const img=new Image();img.src=src;preload.set(index,img);}return src;}for(let i=0;i<8;i++)getImage(i);
function save(){try{state.lastSeenAt=Date.now();localStorage.setItem(STORAGE_KEY,JSON.stringify(state));}catch(_){}}
function toast(message){const el=$('toast');el.textContent=message;el.classList.add('visible');clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>el.classList.remove('visible'),2300)}
function revealStage(stage){if(stageBefore===stage)return;stageBefore=stage;const img=$('stage-image');img.src=getImage(stage);img.alt=STAGES[stage].alt;img.classList.remove('stage-just-changed');void img.offsetWidth;img.classList.add('stage-just-changed');$('stage-progress').textContent=`Этап ${stage+1} из 8`;if(stage>0){$('sparkles').classList.remove('active');void $('sparkles').offsetWidth;$('sparkles').classList.add('active');clearTimeout(sceneTimeout);sceneTimeout=setTimeout(()=>$('sparkles').classList.remove('active'),900)}}
function updateScene(){const stage=stageIndex(state.work,TOTAL);const completed=state.work>=TOTAL;
  $('task-name').textContent=state.meadow?'Твой кролик дома':STAGES[stage].name;
  $('task-hint').textContent=state.meadow?'Можно посмотреть на готовый мир':STAGES[stage].hint;
  $('scene-caption').textContent=state.meadow?'Кроличья полянка ожила!':STAGES[stage].description;
  $('progress-fill').style.width=(progress(state.work,TOTAL)*100).toFixed(3)+'%';
  $('percent').textContent=Math.floor(progress(state.work,TOTAL)*100)+'%';
  $('progress-track').setAttribute('aria-valuenow',String(Math.floor(progress(state.work,TOTAL)*100)));
  $('next-milestone').textContent=completed?'Все восемь стадий готовы!':`Следующая стадия на ${Math.round((nextMilestone(state.work,TOTAL)?.at||1)*100)}%`;
  if(state.meadow){$('stage-image').hidden=true;$('meadow-image').hidden=false;$('stage-progress').textContent='Первая история окончена';$('interaction').hidden=true;$('shop').hidden=true;$('completion').hidden=true;$('finish-message').hidden=false;}else{$('stage-image').hidden=false;$('meadow-image').hidden=true;revealStage(stage);$('finish-message').hidden=true;$('interaction').hidden=completed;$('shop').hidden=completed;$('completion').hidden=!completed;}
  $('coins').textContent=format.format(Math.floor(state.coins));$('idle-rate').textContent=idleRate(state.idleLevel).toFixed(1).replace('.',',');$('click-gain').textContent=`+${clickGain(state.clickLevel)} очков прогресса`;
  $('click-price').textContent=format.format(upgradeCost('click',state.clickLevel));$('idle-price').textContent=format.format(upgradeCost('idle',state.idleLevel));
  $('click-bonus').textContent=`+12 за клик · уровень ${state.clickLevel}`;$('idle-bonus').textContent=`+1,2 в секунду · уровень ${state.idleLevel}`;
  $('upgrade-click').disabled=completed||state.coins<upgradeCost('click',state.clickLevel);$('upgrade-idle').disabled=completed||state.coins<upgradeCost('idle',state.idleLevel);
  $('knit-button').disabled=completed;
  if(demo){$('debug-stage').value=stage;$('debug-label').textContent=`${stage+1} / 8`}
}
function smallEffect(n){const el=$('tap-pop');el.textContent='+'+n;el.classList.remove('active');void el.offsetWidth;el.classList.add('active')}
function makeClick(){if(state.work>=TOTAL||state.meadow)return;const old=stageIndex(state.work,TOTAL);state=applyWork(state,clickGain(state.clickLevel),TOTAL);smallEffect(clickGain(state.clickLevel));updateScene();save();const fresh=stageIndex(state.work,TOTAL);if(fresh>old&&fresh<7)toast(`✧ ${STAGES[fresh].name}!`);if(fresh===7&&old!==7)toast('Твой первый кролик готов! 🐰');try{window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light')}catch(_){}}
function buy(type){if(state.work>=TOTAL||state.meadow)return;const lv=type==='click'?state.clickLevel:state.idleLevel;const cost=upgradeCost(type,lv);if(state.coins<cost){toast('Для улучшения ещё нужны ниточки');return;}state.coins-=cost;if(type==='click')state.clickLevel+=1;else state.idleLevel+=1;updateScene();save();toast(type==='click'?'Крючок стал ловчее! ✨':'Теперь ниточки вяжутся быстрее! ✨')}
$('knit-button').addEventListener('click',makeClick);
$('upgrade-click').addEventListener('click',()=>buy('click'));
$('upgrade-idle').addEventListener('click',()=>buy('idle'));
$('show-meadow').addEventListener('click',()=>{if(state.work<TOTAL)return;state.meadow=true;state.completionSeen=true;updateScene();save();toast('Добро пожаловать на полянку! 🌸')});
function tick(timestamp){const seconds=Math.min(.2,Math.max(0,(timestamp-prevTime)/1000));prevTime=timestamp;if(!document.hidden&&!state.meadow&&state.work<TOTAL){state=applyWork(state,seconds*idleRate(state.idleLevel),TOTAL);saveElapsed+=seconds;if(saveElapsed>1){save();saveElapsed=0;}updateScene();}frameToken=requestAnimationFrame(tick)}
document.addEventListener('visibilitychange',()=>{if(document.hidden){save();cancelAnimationFrame(frameToken)}else{const resume=hydrate(state,Date.now(),TOTAL);state=resume.state;updateScene();save();prevTime=performance.now();frameToken=requestAnimationFrame(tick)}});
window.addEventListener('pagehide',save);
if(demo){$('developer').hidden=false;$('debug-stage').addEventListener('input',event=>{const i=Number(event.target.value);state.work=stageThreshold(i,TOTAL);state.meadow=false;state.completionSeen=false;updateScene();save();});$('reset-demo').addEventListener('click',()=>{state=newState();stageBefore=-1;updateScene();save();toast('Начинаем с первой ниточки')});}
updateScene();frameToken=requestAnimationFrame(tick);
window.__knitGameDebug={state:()=>({...state}),stage:()=>stageIndex(state.work,TOTAL),total:TOTAL,reset:()=>{state=newState();stageBefore=-1;updateScene();save()},advance:(n)=>{state=applyWork(state,n,TOTAL);updateScene();save()}};
})();
