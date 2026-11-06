/** Gameplay candidate only. Production catalog and schema remain unchanged. */
import {developmentCatalog} from './dev-catalog.mjs';
export const GAMEPLAY_SAVE_KEY='mir-na-nitke-gameplay-preview-v3';
export const LEGACY_SAVE_KEY='mir-na-nitke-art-preview-v2';
export function gameplayCatalog(artReview=true){
 const legacy=developmentCatalog(artReview,true,true),runtime=developmentCatalog(artReview,true,true);
 const c=runtime.config,first=c.meadows[0],root='./art-experiments/kotoutro-v1/exports/';
 const placed=(meadowId,slotId)=>({meadowId,slotId});
 const firstReq=(...ids)=>ids.map(id=>placed('test-meadow',id)),secondReq=(...ids)=>ids.map(id=>placed('kotoutro',id));
 first.displayName='Малая полянка';
 const costs=[5,5,12,30,36],work=[48,70,100,180,200],passive=[90,80,110,140,100];
 const benefits=['Первый друг и пряжа для новых работ','Помогает мастерской; кролик узнаёт запах','Открывает тропинку к пруду','Дом для приглашения кролика в гости','Доставит приглашение к пруду'];
 c.items.forEach((i,n)=>{Object.assign(i,{meadowId:first.id,yarnCost:costs[n],workUnits:work[n],benefit:benefits[n]});if(n)i.requiresPlaced=firstReq(n===1?'rabbit':n===2?'flower':'tree');if(n>=2)i.art.transparentStages=true;});
 first.passive=c.items.map((i,n)=>({id:n?'income-'+i.id:'rabbit-income',requires:[i.id],ratePerHour:passive[n]}));
 const interaction=(id,actorSlot,action,label,amount,cooldownMs,workBonus=0)=>({id,requires:[actorSlot],actorSlot,action,label,trigger:'manual',amount,cooldownMs,workBonus});
 first.interactions=[
  interaction('pet','rabbit','pet','Погладить',.7,30000),
  interaction('water','flower','water','Полить цветок',.6,45000,2),
  interaction('sway','tree','sway','Качнуть ветку',.8,60000,1),
  interaction('knock','house','knock','Постучать в домик',1.2,90000),
  interaction('land','butterfly','land','Позвать бабочку',.8,60000),
  {id:'sniff',requires:['rabbit','flower'],actorSlot:'rabbit',action:'sniff',trigger:'idle',amount:.6,cooldownMs:90000,label:'Кролик нюхает цветок'}];
 const ids=['kot-cat','kot-coffee','kot-duck','kot-chair','kot-leaf-house'];
 const names=['Котик','Чашка кофе','Уточка','Кресло','Листовой домик'];
 const extra=ids.map((id,n)=>({id,displayName:names[n],meadowId:'kotoutro',yarnCost:[10,14,18,28,34][n],workUnits:[80,90,100,160,190][n],
  benefit:['Встречает друзей на террасе','Помогает вязать и готовит встречу','Заглянет на первую полянку с приветом','Уютная пауза помогает мастерской','Укрытие для общих тихих вечеров'][n],
  ...(n?{requiresPlaced:secondReq(n===1?'kot-cat':n===2?'kot-coffee':'kot-duck')}:{}),
  art:{transparentStages:true,stages:[0,1/3,2/3,1].map((at,k)=>({at,image:root+id+'-stage-0'+k+'.webp'})),finishedSprite:root+id+'-finished.webp'}}));
 const second={id:'kotoutro',displayName:'Котоутро у пруда',requiresPlaced:firstReq('rabbit','flower','tree'),unlockHint:'Кролик, Цветок и Дерево на Малой полянке',
  art:{backgroundDay:root+'meadow-day.webp',backgroundEvening:root+'meadow-evening.webp'},
  slots:extra.map((i,n)=>({id:i.id,itemId:i.id,x:[.42,.72,.73,.25,.74][n],y:[.61,.61,.46,.405,.300][n],scale:[1.20,.65,.65,.80,.75][n],z:[4,5,2,1,0][n]})),
  passive:extra.map((i,n)=>({id:'income-'+i.id,requires:[i.id],ratePerHour:[110,80,100,120,140][n]})),
  interactions:[interaction('greet','kot-cat','greet','Поздороваться с котом',.8,45000),interaction('brew','kot-coffee','brew','Заварить кофе',.7,60000,3),interaction('feed','kot-duck','feed','Угостить уточку',.9,60000),interaction('rock','kot-chair','rock','Покачать кресло',.4,75000,4),interaction('shelter','kot-leaf-house','shelter','Зажечь уютный свет',.6,90000),
   {id:'coffee-time',requires:['kot-cat','kot-coffee'],actorSlot:'kot-coffee',action:'brew',trigger:'idle',amount:.7,cooldownMs:90000,label:'Котик устроился с кофе'}]};
 c.items.push(...extra);c.meadows.push(second);
 if(runtime.buttonArt){
  const ids={'Полить цветок':'water','Качнуть ветку':'sway','Постучать в домик':'knock','Позвать бабочку':'land','Поздороваться с котом':'greet','Заварить кофе':'brew','Угостить уточку':'feed','Покачать кресло':'rock','Зажечь уютный свет':'shelter'};
  for(const [label,id]of Object.entries(ids))runtime.buttonArt[label]=Object.fromEntries(['normal','pressed','disabled'].map(state=>[state,runtime.assetUrl(null,'./art-experiments/kotoutro-v1/ui/'+id+(state==='normal'?'':'-'+state)+'.webp')]));
 }
 Object.assign(c,{initialYarn:10,reserveYarnPerHour:18,clickWork:3,idleWorkPerSecond:1,maxOfflineMs:8*60*60*1000,
  upgrades:[{id:'hook',displayName:'Удобный крючок',target:'click',baseCost:2,costMultiplier:1.8,amount:3,maxLevel:10},{id:'basket',displayName:'Корзинка-помощница',target:'idle',baseCost:3,costMultiplier:1.8,amount:.75,maxLevel:10}],
  migrationV1:{workUnits:{rabbit:40,flower:40,tree:80,house:80,butterfly:80},ruleIds:['test-meadow/pet','test-meadow/sniff']}});
 const rabbitReq=[...firstReq('rabbit','house','butterfly'),...secondReq('kot-cat','kot-coffee')];
 const allReq=[...firstReq('rabbit','flower','tree','house','butterfly'),...secondReq(...ids)];
 c.worldEvents=[
  {id:'duck-visit',displayName:'Привет от котика',trigger:'automatic',requiresPlaced:[...firstReq('rabbit','tree'),...secondReq('kot-cat','kot-coffee','kot-duck')],delayMs:45000,visitMs:180000,rewardYarn:2,
   waitingText:'Уточка несёт привет от котика',visitText:'Уточка в гостях на Малой полянке',memoryText:'Уточка принесла привет от котика',visitor:{itemId:'kot-duck',meadowId:first.id,x:.76,y:.53,scale:.52,z:6}},
  {id:'rabbit-visit',displayName:'Кролик идёт к пруду',trigger:'project',requiresPlaced:rabbitReq,delayMs:60000,visitMs:180000,rewardYarn:2,
   waitingText:'Бабочка несёт приглашение',visitText:'Кролик пьёт кофе с котиком',memoryText:'Кролик впервые побывал у пруда',visitor:{itemId:'rabbit',meadowId:second.id,x:.17,y:.65,scale:.85,z:6}},
  {id:'friendship-picnic',displayName:'Угощение для друзей',trigger:'project',requiresPlaced:allReq,requiresMemories:['duck-visit','rabbit-visit'],delayMs:90000,visitMs:180000,cooldownMs:180000,repeatable:true,rewardYarn:4,
   waitingText:'Угощение готово, друзья собираются',visitText:'Друзья устроили тихий пикник',memoryText:'Тёплая встреча у пруда',visitor:{itemId:'rabbit',meadowId:second.id,x:.17,y:.65,scale:.85,z:6}}];
 const tableArt={stages:[{at:0,image:'./art-experiments/rabbit-v1/exports/stage-000.webp'},{at:1,image:'./art-experiments/rabbit-v1/exports/stage-000.webp'}]};
 c.recipes=[
  {id:'invitation',displayName:'Приглашение к пруду',benefit:'Связать ленту для письма; бабочка отнесёт его котику',meadowId:second.id,eventId:'rabbit-visit',requiresPlaced:rabbitReq,yarnCost:6,workUnits:80,art:tableArt},
  {id:'picnic-gift',displayName:'Угощение для друзей',benefit:'Повторяемая общая встреча — новый тёплый эпизод',meadowId:second.id,eventId:'friendship-picnic',requiresPlaced:allReq,requiresMemories:['duck-visit','rabbit-visit'],yarnCost:18,workUnits:180,art:tableArt}];
 return {...runtime,legacyConfig:legacy.config,catalog:{items:c.items,meadows:c.meadows},config:c};
}


