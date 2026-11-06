/** Deterministic player-policy simulation; no grants, shortcuts or hidden state edits. */
import {createInitialState,advanceTime,dispatch,selectView} from '../app/core/index.mjs';
import {gameplayCatalog} from './gameplay-catalog.mjs';
export function simulate({active=false,upgrades=false,maxSeconds=14400}={}){
 const {config:c}=gameplayCatalog();let state=createInitialState(c,0),firstProjectSeconds=null,unlockSeconds=null,duckVisitSeconds=null,allItemsSeconds=null,linksSeconds=null,giftSeconds=null;
 const route=['rabbit','flower','tree','kot-cat','kot-coffee','kot-duck','house','butterfly','kot-chair','kot-leaf-house'];
 const act=(type,data={})=>{state=dispatch(state,{type,now:state.lastTimestamp,...data},c);};
 for(let t=0;t<=maxSeconds;t++){
  state=advanceTime(state,t*1000,c);let view=selectView(state,c);
  if(active)for(const m of view.meadows)for(const r of m.interactions)if(r.available)act('interact',{meadowId:m.id,interactionId:r.id});
  view=selectView(state,c);
  if(upgrades&&state.owned.length>=3)for(const candidate of view.upgrades)if((()=>{const u=selectView(state,c).upgrades.find(u=>u.id===candidate.id);return u.level===0&&u.canBuy&&(upgrades===true||u.target===upgrades);})())act('buyUpgrade',{upgradeId:candidate.id});
  if(state.project){if(active&&!selectView(state,c).project.canComplete)act('click');if(selectView(state,c).project.canComplete){const id=state.project.itemId;act('completeCraft');if(id){const m=c.meadows.find(m=>m.slots.some(s=>s.itemId===id));act('placeItem',{meadowId:m.id,slotId:id});if(id==='rabbit')firstProjectSeconds=t;}}}
  view=selectView(state,c);
  if(view.meadows[1].unlocked&&unlockSeconds===null)unlockSeconds=t;
  if(state.memories['duck-visit']&&duckVisitSeconds===null)duckVisitSeconds=t;
  if(state.owned.length===10&&allItemsSeconds===null)allItemsSeconds=t;
  if(state.memories['duck-visit']&&state.memories['rabbit-visit']&&linksSeconds===null)linksSeconds=t;
  if(state.memories['friendship-picnic']){giftSeconds=t;break;}
  if(!state.project){
   const recipe=view.recipes.find(r=>r.canStart&&(r.recipeId==='invitation'||state.owned.length===10));
   if(recipe)act('startRecipe',{recipeId:recipe.recipeId});
   else {const next=route.find(id=>!state.owned.includes(id));if(view.projects.find(p=>p.itemId===next)?.canStart)act('startProject',{itemId:next});}
  }
 }
 const offline=advanceTime(state,state.lastTimestamp+8*3600000,c);
 return {policy:active?'one click per second while crafting; use each available contextual action':'idle craft; immediate start/complete/place decisions',upgrades,firstProjectSeconds,unlockSeconds,duckVisitSeconds,allItemsSeconds,linksSeconds,giftSeconds,yarnAfter:state.wallet.yarn,offlineYarn:offline.wallet.yarn-state.wallet.yarn,owned:state.owned.length,memories:Object.fromEntries(Object.entries(state.memories).map(([id,m])=>[id,m.count]))};
}
if(process.argv[1]?.replaceAll('\\','/').endsWith('/balance.mjs'))console.log(JSON.stringify([simulate(),simulate({active:true}),simulate({upgrades:true}),simulate({active:true,upgrades:true})],null,2));


