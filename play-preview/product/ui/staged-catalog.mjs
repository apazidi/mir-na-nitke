import {gameplayCatalog,GAMEPLAY_SAVE_KEY} from './gameplay-catalog.mjs';
export const STAGED_SAVE_KEY='mir-na-nitke-gameplay-preview-v4';
export const STAGED_LEGACY_KEY=GAMEPLAY_SAVE_KEY;
export const SECTION_WEIGHTS=Object.freeze({
 rabbit:Object.freeze([.44,.44,1,1,.62,.62]),
 flower:Object.freeze([1,.32,1,.32,1,.48]),
 tree:Object.freeze([1,.72,.6,.6,.6,.6]),
 'kot-cat':Object.freeze([.48,1,1,.68,.48,.48]),
});
export const WORK_PER_WEIGHT=35;
export function sectionAt(itemId,work){
 const weights=SECTION_WEIGHTS[itemId];if(!weights)return null;
 let remaining=Math.max(0,work);
 for(let index=0;index<weights.length;index++){
  const cost=weights[index]*WORK_PER_WEIGHT;
  if(remaining<cost-1e-7)return {index,progress:Math.max(0,remaining/cost)};
  remaining-=cost;
 }
 return {index:weights.length,progress:0};
}
export function stagedCatalog(){
 const runtime=gameplayCatalog(true),c=runtime.config;
 for(const item of c.items)if(SECTION_WEIGHTS[item.id])item.workUnits=SECTION_WEIGHTS[item.id].reduce((a,b)=>a+b,0)*WORK_PER_WEIGHT;
 Object.assign(c,{initialYarn:32,clickWork:2.8,idleWorkPerSecond:1,defaultCraftAuto:false,recraftableIds:Object.keys(SECTION_WEIGHTS)});
 c.upgrades.forEach(u=>{u.amount=u.target==='click'?.35:.08;u.wholeYarnPrice=true;u.displayName=u.target==='click'?'Удобный крючок':'Автовязка';u.requiresPlaced=[{meadowId:'kotoutro',slotId:'kot-cat'}];});
 for(const [n,m]of c.meadows.entries()){
  const path=n?'./art-experiments/stage-integration-v1/exports/pond-day-v1.webp':'./art-experiments/craft-feel-v1/exports/meadow-day.webp';
  m.art.backgroundDay=path;m.art.backgroundEvening=path;
 }
 c.meadows[1].slots.find(s=>s.id==='kot-leaf-house').y=.24;
 return {...runtime,legacyConfig:gameplayCatalog(true).config};
}
