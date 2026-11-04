/** Мир на ниточке · v4.1. Deterministic, browser-independent game state. */
export const VERSION=1;
export const STORAGE_KEY='mir-na-nitke/v4.1/world';
export const MAX_AWAY_SEC=8*3600;
export const FLOWER_WORK=1200;
export const FLOWER_STAGES=Object.freeze([
  {at:0,title:'Волшебное колечко',detail:'Начало цветка'},
  {at:.22,title:'Стебелёк и листья',detail:'Появляется зелёная основа'},
  {at:.48,title:'Серединка',detail:'Связываем солнечный центр'},
  {at:.72,title:'Лепестки',detail:'Белые лепестки раскрываются'},
  {at:1,title:'Цветок готов!',detail:'Ему пора на полянку'}
]);
export const PROJECTS=Object.freeze(['rabbit','flower','tree','house','butterfly']);
const n=(x,def=0)=>Number.isFinite(Number(x))?Number(x):def;
export const clamp=(x,lo,hi)=>Math.min(hi,Math.max(lo,x));
export const clickGain=level=>24+12*clamp(Math.floor(n(level)),0,30);
export const idleRate=level=>1.5+1.1*clamp(Math.floor(n(level)),0,30);
export const upgradeCost=(type,level)=>Math.ceil((type==='click'?150:210)*Math.pow(type==='click'?1.65:1.72,clamp(Math.floor(n(level)),0,30)));
export const progress=state=>clamp(n(state.workshop.work)/FLOWER_WORK,0,1);
export function stageIndex(work,total=FLOWER_WORK){const p=clamp(n(work)/total,0,1);for(let i=FLOWER_STAGES.length-1;i>=0;i--)if(p+1e-10>=FLOWER_STAGES[i].at)return i;return 0;}
export const completedCount=state=>Object.values(state.meadows.rabbit01.objects).filter(Boolean).length;
export const flowerStatus=state=>state.projects.flower;
export function initialState(now=Date.now()){
  return {version:VERSION,projects:{rabbit:'living',flower:'available',tree:'locked',house:'locked',butterfly:'locked'},
    meadows:{rabbit01:{objects:{rabbit:true,flower:false,tree:false,house:false,butterfly:false},visits:0,lastVisitAt:now,light:'auto',pets:0,flowerSniffs:0}},
    atlas:{unlocked:['rabbit01'],links:[]},
    workshop:{activeProject:null,work:0,coins:160,clickLevel:0,idleLevel:0},
    lastSeenAt:now,completionShown:false};
}
export function normalize(raw,now=Date.now()){
  const d=initialState(now);if(!raw||typeof raw!=='object')return d;
  const rp=raw.projects&&typeof raw.projects==='object'?raw.projects:{};
  const rw=raw.workshop&&typeof raw.workshop==='object'?raw.workshop:{};
  const rm=raw.meadows?.rabbit01&&typeof raw.meadows.rabbit01==='object'?raw.meadows.rabbit01:{};
  let work=clamp(n(rw.work),0,FLOWER_WORK);
  let flower=['available','knitting','completed','living'].includes(rp.flower)?rp.flower:'available';
  const placed=rm.objects?.flower===true || flower==='living';
  if(placed){flower='living';work=FLOWER_WORK;}
  else if(work>=FLOWER_WORK){flower='completed';}
  else if(work>0&&flower==='available'){flower='knitting';}
  if(flower==='completed'&&work<FLOWER_WORK)work=FLOWER_WORK;
  d.projects.flower=flower;
  d.workshop={activeProject:flower==='knitting'?'flower':null,work,coins:clamp(n(rw.coins,160),0,1e10),
    clickLevel:clamp(Math.floor(n(rw.clickLevel)),0,30),idleLevel:clamp(Math.floor(n(rw.idleLevel)),0,30)};
  d.meadows.rabbit01={objects:{rabbit:true,flower:placed,tree:false,house:false,butterfly:false},
    visits:clamp(Math.floor(n(rm.visits)),0,1e9),lastVisitAt:clamp(n(rm.lastVisitAt,now),0,now),
    light:['day','evening','auto'].includes(rm.light)?rm.light:'auto',
    pets:clamp(Math.floor(n(rm.pets)),0,1e9),flowerSniffs:clamp(Math.floor(n(rm.flowerSniffs)),0,1e9)};
  d.lastSeenAt=clamp(n(raw.lastSeenAt,now),0,now);
  d.completionShown=Boolean(raw.completionShown);
  return d;
}
export function startFlower(state){if(state.projects.flower!=='available')return state;return {...state,projects:{...state.projects,flower:'knitting'},workshop:{...state.workshop,activeProject:'flower'}};}
export function applyWork(state,quantity){if(state.projects.flower!=='knitting')return state;
  const diff=Math.min(Math.max(0,n(quantity)),FLOWER_WORK-state.workshop.work);if(diff<=0)return state;
  const work=state.workshop.work+diff,done=work>=FLOWER_WORK;
  return {...state,projects:{...state.projects,flower:done?'completed':'knitting'},
    workshop:{...state.workshop,work,activeProject:done?null:'flower',coins:state.workshop.coins+diff*.7},
    completionShown:done?false:state.completionShown};
}
export function buyUpgrade(state,type){if(!['click','idle'].includes(type)||state.projects.flower!=='knitting')return state;
  const k=type==='click'?'clickLevel':'idleLevel';const cost=upgradeCost(type,state.workshop[k]);
  if(state.workshop.coins<cost)return state;
  return {...state,workshop:{...state.workshop,coins:state.workshop.coins-cost,[k]:state.workshop[k]+1}};
}
export function hydrate(raw,now=Date.now()){
  let state=normalize(raw,now),secs=clamp((now-state.lastSeenAt)/1000,0,MAX_AWAY_SEC);
  if(state.projects.flower==='knitting')state=applyWork(state,secs*idleRate(state.workshop.idleLevel));
  return {state:{...state,lastSeenAt:now},earnedSeconds:secs};
}
export function placeFlower(state){if(state.projects.flower!=='completed')return state;
  return {...state,projects:{...state.projects,flower:'living'},meadows:{...state.meadows,rabbit01:{...state.meadows.rabbit01,objects:{...state.meadows.rabbit01.objects,flower:true}}}};
}
export function visitMeadow(state,now=Date.now()){
  const meadow=state.meadows.rabbit01;
  const away=now-meadow.lastVisitAt;
  const eligible=meadow.visits>0&&away>=5*60*1000;
  const event=eligible?(meadow.objects.flower?'Пока тебя не было, кролик любовался новым цветком.':'Пока тебя не было, кролик отдыхал на мягкой траве.'):null;
  return {event,state:{...state,meadows:{...state.meadows,rabbit01:{...meadow,visits:meadow.visits+1,lastVisitAt:now}}}};
}
export const isEvening=(mode='auto',hour=12)=>mode==='evening'||(mode==='auto'&&(hour>=19||hour<7));
export function petRabbit(state){const m=state.meadows.rabbit01;return {...state,meadows:{...state.meadows,rabbit01:{...m,pets:m.pets+1}}};}
export function sniffFlower(state){if(!state.meadows.rabbit01.objects.flower)return state;
  const m=state.meadows.rabbit01;return {...state,meadows:{...state.meadows,rabbit01:{...m,flowerSniffs:m.flowerSniffs+1}}};}
