export const STAGES = Object.freeze([
  {id:'ring',at:0,name:'Начальное кольцо',hint:'Сначала — одна маленькая петля',description:'Ниточки начинают своё путешествие...',alt:'Начальное кольцо для вязания кролика'},
  {id:'body-start',at:.12,name:'Первые ряды',hint:'Появляется маленькое туловище',description:'Первое чудо уже получилось!',alt:'Вязаное донышко и первые ряды туловища'},
  {id:'body-complete',at:.28,name:'Туловище готово',hint:'Мягкая основа будущего кролика',description:'Какое уютное получилось туловище!',alt:'Готовое туловище кролика из кремовой пряжи'},
  {id:'head',at:.44,name:'Вяжем голову',hint:'Теперь у друга появляется голова',description:'Кролик постепенно обретает форму!',alt:'К туловищу добавлена круглая голова кролика'},
  {id:'ears',at:.60,name:'Длинные ушки',hint:'Два розовых вязаных ушка',description:'Кажется, он уже всё слышит!',alt:'Вязаный кролик с длинными розовыми ушами'},
  {id:'paws',at:.73,name:'Лапки и хвостик',hint:'Осталось добавить несколько деталей',description:'Теперь он почти может прыгать!',alt:'Кролик с вязанными лапками и хвостиком'},
  {id:'face',at:.86,name:'Мордочка',hint:'Улыбка, глазки и румяные щёчки',description:'Посмотри, какой он милый!',alt:'Кролик с глазами носиком и улыбкой'},
  {id:'ready',at:1,name:'Кролик готов!',hint:'Твоя первая история завершена',description:'Первый вязаный друг готов!',alt:'Полностью готовый кролик с розовым шарфиком'}
]);
export const MAX_OFFLINE_SECONDS=8*3600;
export const DEFAULT_TOTAL_WORK=2400;
export function clamp(value,min,max){return Math.min(max,Math.max(min,value))}
export function progress(work,total=DEFAULT_TOTAL_WORK){return clamp(Number(work)/total,0,1)}
export function stageIndex(work,total=DEFAULT_TOTAL_WORK){const p=progress(work,total);for(let i=STAGES.length-1;i>=0;i--)if(p+1e-10>=STAGES[i].at)return i;return 0}
export function nextMilestone(work,total=DEFAULT_TOTAL_WORK){const p=progress(work,total);return STAGES.find(s=>s.at>p+1e-10)||null}
export function stageThreshold(i,total=DEFAULT_TOTAL_WORK){return (STAGES[clamp(Math.round(i),0,STAGES.length-1)]?.at ?? 0)*total}
export function clickGain(level){return 24+12*clamp(Math.floor(Number(level)||0),0,30)}
export function idleRate(level){return 3+1.2*clamp(Math.floor(Number(level)||0),0,30)}
export function upgradeCost(type,level){const base=type==='click'?160:220, ratio=type==='click'?1.68:1.77;return Math.ceil(base*Math.pow(ratio,clamp(Math.floor(Number(level)||0),0,30)))}
export function applyWork(state,amount,total=DEFAULT_TOTAL_WORK){const delta=Math.min(Math.max(0,Number(amount)||0),Math.max(0,total-state.work));return {...state,work:clamp(state.work+delta,0,total),coins:Math.max(0,state.coins+delta*.72)}}
export function offlineWork(state,now,total=DEFAULT_TOTAL_WORK){const elapsed=clamp((now-(Number(state.lastSeenAt)||now))/1000,0,MAX_OFFLINE_SECONDS);return {state:applyWork(state,elapsed*idleRate(state.idleLevel),total),earnedSeconds:elapsed};}
export function newState(now=Date.now()){return {work:0,coins:160,clickLevel:0,idleLevel:0,lastSeenAt:now,meadow:false,completionSeen:false}}
export function hydrate(raw,now=Date.now(),total=DEFAULT_TOTAL_WORK){const initial=newState(now);if(!raw||typeof raw!=='object')return {state:initial,earnedSeconds:0};const safe={...initial,work:clamp(Number(raw.work)||0,0,total),coins:clamp(Number(raw.coins)||0,0,1e12),clickLevel:clamp(Math.floor(Number(raw.clickLevel)||0),0,30),idleLevel:clamp(Math.floor(Number(raw.idleLevel)||0),0,30),lastSeenAt:clamp(Number(raw.lastSeenAt)||now,0,now),meadow:raw.meadow===true&&Number(raw.work)>=total,completionSeen:raw.completionSeen===true};const result=offlineWork(safe,now,total);result.state.lastSeenAt=now;return result;}
