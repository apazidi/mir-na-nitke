/** Explicit development fixture. Never consumed by the release catalog. No ready art claims. */
export function developmentCatalog(artReview=false, flowerReview=false, sceneReview=false) {
 const artRoot='./art-experiments/rabbit-v1/exports/';
 const sceneRoot='./art-experiments/scene-v2/';
 const useScene=artReview&&sceneReview;
 const url=path=>new URL(path,new URL('../',import.meta.url)).href;
 const blank='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1820"><rect width="1024" height="1820" fill="#a49d64"/><text x="512" y="850" text-anchor="middle" fill="#fff" font-size="44">Техническая сцена</text></svg>');
 const shape=(label,color)=>'data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="500"><ellipse cx="200" cy="280" rx="150" ry="180" fill="'+color+'"/><text x="200" y="290" text-anchor="middle" font-size="35">'+label+'</text></svg>');
 const ids=['rabbit','flower','tree','house','butterfly'];
 const names=['Кролик','Цветок','Дерево','Домик','Бабочка'];
 const colors=['#e7c5ae','#e0a6bb','#9aae75','#d5ba8d','#b6b8d8'];
 const items=ids.map((id,n)=>({id,displayName:names[n],workUnits:n<2?40:80,yarnCost:n===1?2:5+n*3,art:{
  stages:[0,.25,.5,.75,1].map(at=>({at,image:artReview&&n===0?artRoot+'stage-'+String(at*100).padStart(3,'0')+'.webp':shape(String(Math.round(at*100))+'%',colors[n])})),
  finishedSprite:artReview&&n===0?artRoot+'finished-sprite.webp':shape(names[n],colors[n])
 }}));
 if(artReview&&flowerReview)items[1].art={stages:[0,.3,.6,1].map((at,n)=>({at,image:'./content/items/meadow-flower/art/stage-0'+n+'.webp'})),finishedSprite:'./content/items/meadow-flower/art/finished.webp'};
 if(useScene)for(const item of items.slice(2))item.art={
  stages:[0,1/3,2/3,1].map((at,n)=>({at,image:sceneRoot+'exports/'+item.id+'-stage-0'+n+'.webp'})),
  finishedSprite:sceneRoot+'exports/'+item.id+'-finished.webp'
 };
 const meadowArt=useScene?sceneRoot+'exports/':artRoot;
 const meadow={id:'test-meadow',displayName:'Малая полянка · тест',art:{
  backgroundDay:artReview?meadowArt+'meadow-day.webp':blank,
  backgroundEvening:artReview?meadowArt+'meadow-evening.webp':blank
 },slots:items.map((item,n)=>({id:item.id,itemId:item.id,
  x:(useScene?[.36,.64,.20,.77,.70]:[.36,.73,.2,.75,.75])[n],
  y:(useScene?[.55,.59,.33,.31,.23]:[.55,.63,.35,.42,.28])[n],
  scale:(useScene?[1.85,1.05,1.4,1.0,.40]:[1.85,1.05,.55,.55,.55])[n],z:useScene?[3,4,1,0,5][n]:n
 })),passive:[{id:'rabbit-income',requires:['rabbit'],ratePerHour:30}],interactions:[
  {id:'pet',requires:['rabbit'],actorSlot:'rabbit',action:'pet',trigger:'manual',amount:2,cooldownMs:5000},
  {id:'sniff',requires:['rabbit','flower'],actorSlot:'rabbit',action:'sniff',trigger:'idle',amount:3,cooldownMs:10000}
 ]};
 const buttonIds={'Мастерская':'workshop','Полянка':'meadow','Проекты':'projects','Вязать':'knit','Завершить':'complete','Погладить':'pet'};
 const buttonArt=useScene?Object.fromEntries(Object.entries(buttonIds).map(([label,id])=>[label,Object.fromEntries(['normal','pressed','disabled'].map(state=>[state,url(sceneRoot+'ui/'+id+(state==='normal'?'':'-'+state)+'.webp')]))])):null;
 return {buttonArt,workshopBackdrop:artReview?url(artRoot+'stage-000.webp'):null,catalog:{items,meadows:[meadow]},
  config:{items,meadows:[meadow],initialYarn:5,reserveYarnPerHour:12,clickWork:4,idleWorkPerSecond:1,maxOfflineMs:28800000,
   upgrades:[{id:'hook',target:'click',baseCost:8,costMultiplier:1.6,amount:2,maxLevel:10},{id:'basket',target:'idle',baseCost:10,costMultiplier:1.6,amount:1,maxLevel:10}]},
  assetUrl:(_,path)=>path.startsWith('data:')?path:url(path)};
}
