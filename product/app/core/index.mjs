/** Pure deterministic economy and world state. No clocks, storage, DOM or content manifests. */
const copy=value=>structuredClone(value);
const fail=message=>{throw new Error(message);};
const number=(n,label,positive=false)=>{if(!Number.isFinite(n)||n<0||(positive&&n===0))fail(label);};
const integer=(n,label)=>{number(n,label);if(!Number.isSafeInteger(n))fail(label);};
const key=id=>{if(typeof id!=='string'||!/^[a-z0-9][a-z0-9-]*$/.test(id))fail('Invalid stable ID');};
const has=(object,id)=>Object.hasOwn(object,id);
const map=value=>value&&typeof value==='object'&&!Array.isArray(value);
export const MANUAL_ACTIONS=Object.freeze(['pet','sniff','water','sway','knock','glow','land','greet','brew','feed','rock','shelter']);
const meadow=(c,id)=>c.meadows.find(m=>m.id===id)??fail('Unknown meadow');
const item=(c,id)=>c.items.find(i=>i.id===id)??fail('Unknown item');
const events=c=>c.worldEvents??[];
const recipes=c=>c.recipes??[];
const rules=m=>m.interactions??[];
const ruleKey=(m,r)=>m.id+'/'+r.id;
const projectDefinition=(s,c)=>s.project&&(s.project.recipeId?recipes(c).find(r=>r.id===s.project.recipeId)??fail('Unknown recipe'):item(c,s.project.itemId));
export function requirementsMet(state,definition={}){
 return (definition.requiresPlaced??[]).every(p=>has(state.placements[p.meadowId]??{},p.slotId))&&
  (definition.requiresMemories??[]).every(id=>has(state.memories??{},id));
}
const unlocked=(s,c,d)=>requirementsMet(s,d)&&(!d.meadowId||requirementsMet(s,meadow(c,d.meadowId)));
const active=(s,m,r)=>r.requires.every(id=>has(s.placements[m.id]??{},id))&&requirementsMet(s,r);
const rate=(s,c,target)=>(target==='click'?c.clickWork:c.idleWorkPerSecond)+c.upgrades.filter(u=>u.target===target).reduce((n,u)=>n+(s.upgrades[u.id]??0)*u.amount,0);
const price=(s,u)=>u.baseCost*u.costMultiplier**(s.upgrades[u.id]??0);
function incomeRate(s,c){return c.reserveYarnPerHour+c.meadows.reduce((n,m)=>n+(m.passive??[]).filter(p=>active(s,m,p)).reduce((sum,p)=>sum+p.ratePerHour,0),0);}
function validateRequirements(c,d){
 if(d.requiresPlaced!==undefined){if(!Array.isArray(d.requiresPlaced))fail('Placed requirements');for(const p of d.requiresPlaced)if(!meadow(c,p.meadowId).slots.some(s=>s.id===p.slotId))fail('Unknown required slot');}
 if(d.requiresMemories!==undefined){if(!Array.isArray(d.requiresMemories)||d.requiresMemories.some(id=>!events(c).some(e=>e.id===id)))fail('Unknown required memory');}
}
function validateWork(i){
 number(i.workUnits,'workUnits',true);number(i.yarnCost,'yarnCost');
 if(!Array.isArray(i.art?.stages)||i.art.stages.length<2)fail('Missing stages');
 let previous=-1;for(const stage of i.art.stages){number(stage.at,'Stage');if(stage.at<=previous||stage.at>1)fail('Stage order');previous=stage.at;}
 if(i.art.stages[0].at!==0||previous!==1)fail('Stage endpoints');
}
export function validateConfig(c){
 for(const name of ['initialYarn','reserveYarnPerHour','clickWork','idleWorkPerSecond','maxOfflineMs'])number(c[name],name,name==='maxOfflineMs'||name==='reserveYarnPerHour');
 for(const list of [c.items,c.meadows,c.upgrades,recipes(c),events(c)]){
  if(!Array.isArray(list))fail('Expected config arrays');const ids=new Set();
  for(const value of list){key(value.id);if(ids.has(value.id))fail('Duplicate ID');ids.add(value.id);}
 }
 if(!c.items.length)fail('No starter item');
 for(const i of c.items){validateWork(i);validateRequirements(c,i);if(i.meadowId)meadow(c,i.meadowId);}
 if(!c.items.some(i=>i.yarnCost<=c.initialYarn&&unlocked({placements:{},memories:{}},c,i)))fail('Starter unaffordable or locked');
 for(const u of c.upgrades){
  if(!['click','idle'].includes(u.target))fail('Upgrade target');
  for(const p of ['baseCost','costMultiplier','amount','maxLevel'])number(u[p],p,true);
  if(!Number.isSafeInteger(u.maxLevel)||u.costMultiplier<1)fail('Upgrade bounds');number(u.baseCost*u.costMultiplier**(u.maxLevel-1),'Maximum price');validateRequirements(c,u);
 }
 for(const m of c.meadows){
  validateRequirements(c,m);const slots=new Set();
  for(const s of m.slots){key(s.id);item(c,s.itemId);if(slots.has(s.id))fail('Duplicate slot');slots.add(s.id);}
  const ids=new Set();for(const r of [...(m.passive??[]),...rules(m)]){
   key(r.id);if(ids.has(r.id))fail('Duplicate rule');ids.add(r.id);
   if(!Array.isArray(r.requires)||!r.requires.length||r.requires.some(id=>!slots.has(id)))fail('Rule dependencies');validateRequirements(c,r);
   // Production rates cannot change during a time tick; world events are visual/state outcomes.
   if(r.requiresMemories?.length)fail('Income rules use placed requirements, not memories');
   if(has(r,'ratePerHour'))number(r.ratePerHour,'Passive rate');else{
    if(!MANUAL_ACTIONS.includes(r.action)||!['manual','idle'].includes(r.trigger))fail('Interaction');
    number(r.amount,'Reward');number(r.cooldownMs,'Cooldown',true);if(r.workBonus!==undefined)number(r.workBonus,'Work bonus');
    if(r.actorSlot&&!slots.has(r.actorSlot))fail('Unknown actor');
   }
  }
 }
 for(const e of events(c)){
  validateRequirements(c,e);if(!['automatic','project'].includes(e.trigger))fail('Event trigger');
  number(e.delayMs,'Event delay',true);number(e.visitMs,'Visit duration',true);number(e.cooldownMs??0,'Event cooldown');number(e.rewardYarn??0,'Event reward');
  if(e.trigger==='automatic'&&e.repeatable)fail('Automatic events are once-only');
  if(!e.requiresPlaced?.length&&!e.requiresMemories?.length)fail('Event requires progress');
  if(e.visitor){item(c,e.visitor.itemId);meadow(c,e.visitor.meadowId);for(const p of ['x','y','scale'])number(e.visitor[p],'Visitor '+p,p==='scale');if(e.visitor.x>1||e.visitor.y>1)fail('Visitor outside world');}
 }
 for(const r of recipes(c)){validateWork(r);validateRequirements(c,r);if(!events(c).some(e=>e.id===r.eventId&&e.trigger==='project'))fail('Recipe event');}
 if(c.migrationV1){for(const [id,units]of Object.entries(c.migrationV1.workUnits??{})){item(c,id);number(units,'Legacy work',true);}for(const id of c.migrationV1.ruleIds??[])if(!c.meadows.some(m=>rules(m).some(r=>ruleKey(m,r)===id)))fail('Unknown legacy rule');}
 return c;
}
function resetAccrual(s){s.accrual={baseYarn:s.wallet.yarn,baseWork:s.project?.work??0,elapsedMs:0,automatic:{},events:{}};}
function accruedYarn(s,c){
 let yarn=s.accrual.baseYarn+incomeRate(s,c)*s.accrual.elapsedMs/3600000;
 for(const m of c.meadows)for(const r of rules(m))yarn+=(s.accrual.automatic[ruleKey(m,r)]??0)*r.amount;
 for(const e of events(c))yarn+=(s.accrual.events[e.id]??0)*(e.rewardYarn??0);
 return yarn;
}
function sync(s,c,at){
 for(const m of c.meadows)for(const r of rules(m))if(active(s,m,r)&&!has(s.cooldowns,ruleKey(m,r)))s.cooldowns[ruleKey(m,r)]=at+(r.trigger==='idle'?r.cooldownMs:0);
 for(const e of events(c))if(e.trigger==='automatic'&&!has(s.events,e.id)&&requirementsMet(s,e))s.events[e.id]={phase:'waiting',dueAt:at+e.delayMs,count:0};
}
export function createInitialState(c,now){
 validateConfig(c);number(now,'Timestamp');
 const s={version:2,lastTimestamp:now,wallet:{yarn:c.initialYarn},project:null,owned:[],placements:{},upgrades:{},cooldowns:{},transactionSequence:0,events:{},memories:{}};
 resetAccrual(s);sync(s,c,now);return s;
}
function credit(s,amount){number(amount,'Transaction amount');number(s.wallet.yarn+amount,'Wallet overflow');s.wallet.yarn+=amount;if(amount)s.transactionSequence++;}
function spend(s,amount){number(amount,'Price');if(s.wallet.yarn<amount)fail('Insufficient yarn');s.wallet.yarn-=amount;if(amount)s.transactionSequence++;}
function work(s,c,amount){if(s.project)s.project.work=Math.min(projectDefinition(s,c).workUnits,s.project.work+amount);}
function eventAvailable(s,e){const saved=s.events[e.id];return requirementsMet(s,e)&&(!saved||(e.repeatable&&saved.phase==='available'));}
function schedule(s,e){s.events[e.id]={phase:'waiting',dueAt:s.lastTimestamp+e.delayMs,count:s.events[e.id]?.count??0};}
function settleEvents(s,c,end){
 while(true){
  const next=events(c).filter(e=>s.events[e.id]?.dueAt!==null&&s.events[e.id]?.dueAt<=end).sort((a,b)=>s.events[a.id].dueAt-s.events[b.id].dueAt||a.id.localeCompare(b.id))[0];
  if(!next)break;const saved=s.events[next.id],at=saved.dueAt;
  if(saved.phase==='waiting'){
   saved.phase='visiting';saved.dueAt=at+next.visitMs;saved.count++;
   const memory=s.memories[next.id];s.memories[next.id]={firstAt:memory?.firstAt??at,lastAt:at,count:saved.count};
   s.accrual.events[next.id]=(s.accrual.events[next.id]??0)+1;if(next.rewardYarn)s.transactionSequence++;
  }else if(saved.phase==='visiting'){
   saved.phase=next.repeatable?'resting':'done';saved.dueAt=next.repeatable?at+(next.cooldownMs??0):null;
  }else if(saved.phase==='resting'){saved.phase='available';saved.dueAt=null;}else fail('Invalid due phase');
  sync(s,c,at);
 }
}
/** Same elapsed interval has identical economics/work/event state regardless of tick partition.
 * A single resume consumes at most maxOfflineMs; excess time is discarded for every timer. */
export function advanceTime(state,now,c){
 number(now,'Timestamp');const s=copy(state);if(now<=s.lastTimestamp)return s;
 const elapsed=Math.min(now-s.lastTimestamp,c.maxOfflineMs),end=s.lastTimestamp+elapsed,discarded=now-end;
 s.accrual.elapsedMs+=elapsed;
 for(const m of c.meadows)for(const r of rules(m)){
  const id=ruleKey(m,r);if(r.trigger!=='idle'||!active(s,m,r))continue;const due=s.cooldowns[id];
  if(due<=end){const count=Math.floor((end-due)/r.cooldownMs)+1;s.accrual.automatic[id]=(s.accrual.automatic[id]??0)+count;s.cooldowns[id]=due+count*r.cooldownMs;if(r.amount)s.transactionSequence+=count;}
  if(discarded)s.cooldowns[id]+=discarded;
 }
 settleEvents(s,c,end);
 if(discarded)for(const saved of Object.values(s.events))if(saved.dueAt!==null)saved.dueAt+=discarded;
 const yarn=accruedYarn(s,c);
 number(yarn,'Wallet overflow');s.wallet.yarn=yarn;
 if(s.project)s.project.work=Math.min(projectDefinition(s,c).workUnits,s.accrual.baseWork+s.accrual.elapsedMs/1000*rate(s,c,'idle'));
 s.lastTimestamp=now;return s;
}
export function dispatch(state,action,c){
 const s=advanceTime(state,action.now,c);
 switch(action.type){
  case 'startProject':{const i=item(c,action.itemId);if(s.project||s.owned.includes(i.id)||!unlocked(s,c,i))fail('Project unavailable');spend(s,i.yarnCost);s.project={itemId:i.id,work:0};break;}
  case 'startRecipe':{const r=recipes(c).find(r=>r.id===action.recipeId)??fail('Unknown recipe');const e=events(c).find(e=>e.id===r.eventId);if(s.project||!unlocked(s,c,r)||!eventAvailable(s,e))fail('Recipe unavailable');spend(s,r.yarnCost);s.project={recipeId:r.id,work:0};break;}
  case 'click':if(!s.project)fail('No project');work(s,c,rate(s,c,'click'));break;
  case 'completeCraft':{
   if(!s.project||s.project.work<projectDefinition(s,c).workUnits)fail('Project incomplete');
   if(s.project.recipeId){const r=projectDefinition(s,c),e=events(c).find(e=>e.id===r.eventId);if(!eventAvailable(s,e))fail('Event unavailable');schedule(s,e);}else s.owned.push(s.project.itemId);
   s.project=null;break;
  }
  case 'buyUpgrade':{const u=c.upgrades.find(u=>u.id===action.upgradeId)??fail('Unknown upgrade');if(!requirementsMet(s,u)||(s.upgrades[u.id]??0)>=u.maxLevel)fail('Upgrade unavailable');spend(s,price(s,u));s.upgrades[u.id]=(s.upgrades[u.id]??0)+1;break;}
  case 'placeItem':{
   const m=meadow(c,action.meadowId),slot=m.slots.find(x=>x.id===action.slotId)??fail('Unknown slot');
   if(!requirementsMet(s,m))fail('Meadow locked');if(!s.owned.includes(slot.itemId))fail('Item not owned');if(has(s.placements[m.id]??{},slot.id))fail('Already placed');
   if(Object.values(s.placements).some(p=>Object.values(p).includes(slot.itemId)))fail('Item already placed elsewhere');s.placements[m.id]??={};s.placements[m.id][slot.id]=slot.itemId;break;
  }
  default:{
   if(action.type!=='interact'&&!MANUAL_ACTIONS.includes(action.type))fail('Unknown action');
   const m=meadow(c,action.meadowId),r=rules(m).find(x=>x.id===action.interactionId)??fail('Unknown interaction'),id=ruleKey(m,r);
   if((action.type!=='interact'&&r.action!==action.type)||r.trigger!=='manual'||!active(s,m,r)||!requirementsMet(s,m))fail('Interaction unavailable');
   if(s.lastTimestamp<(s.cooldowns[id]??Infinity))fail('Cooldown');credit(s,r.amount);work(s,c,r.workBonus??0);s.cooldowns[id]=s.lastTimestamp+r.cooldownMs;break;
  }
 }
 sync(s,c,s.lastTimestamp);resetAccrual(s);return s;
}
export function selectView(s,c){
 const project=projectDefinition(s,c),progress=project?s.project.work/project.workUnits:0;
 return copy({wallet:s.wallet,owned:s.owned,rates:{click:rate(s,c,'click'),idle:rate(s,c,'idle'),yarnPerHour:incomeRate(s,c)+c.meadows.reduce((n,m)=>n+rules(m).filter(r=>r.trigger==='idle'&&active(s,m,r)).reduce((t,r)=>t+r.amount*3600000/r.cooldownMs,0),0)},
  project:project?{...s.project,progress,remaining:project.workUnits-s.project.work,etaSeconds:rate(s,c,'idle')?(project.workUnits-s.project.work)/rate(s,c,'idle'):null,stage:project.art.stages.findLastIndex(x=>x.at<=progress),canComplete:progress===1}:null,
  projects:c.items.map(i=>({itemId:i.id,yarnCost:i.yarnCost,unlocked:unlocked(s,c,i),canStart:!s.project&&!s.owned.includes(i.id)&&unlocked(s,c,i)&&s.wallet.yarn>=i.yarnCost})),
  recipes:recipes(c).map(r=>({recipeId:r.id,yarnCost:r.yarnCost,unlocked:unlocked(s,c,r),canStart:!s.project&&unlocked(s,c,r)&&eventAvailable(s,events(c).find(e=>e.id===r.eventId))&&s.wallet.yarn>=r.yarnCost})),
  upgrades:c.upgrades.map(u=>({id:u.id,target:u.target,level:s.upgrades[u.id]??0,cost:price(s,u),current:rate(s,c,u.target),next:rate(s,c,u.target)+u.amount,maxed:(s.upgrades[u.id]??0)>=u.maxLevel,canBuy:requirementsMet(s,u)&&(s.upgrades[u.id]??0)<u.maxLevel&&s.wallet.yarn>=price(s,u)})),
  meadows:c.meadows.map(m=>({id:m.id,unlocked:requirementsMet(s,m),slots:m.slots.map(slot=>({...slot,placed:has(s.placements[m.id]??{},slot.id),canPlace:requirementsMet(s,m)&&s.owned.includes(slot.itemId)&&!Object.values(s.placements).some(p=>Object.values(p).includes(slot.itemId))})),interactions:rules(m).map(r=>({id:r.id,action:r.action,actorSlot:r.actorSlot,trigger:r.trigger,amount:r.amount,workBonus:r.workBonus??0,active:active(s,m,r),available:r.trigger==='manual'&&active(s,m,r)&&s.lastTimestamp>=(s.cooldowns[ruleKey(m,r)]??Infinity),readyAt:s.cooldowns[ruleKey(m,r)]??null}))})),
  events:events(c).map(e=>({id:e.id,meadowId:e.visitor?.meadowId,unlocked:requirementsMet(s,e),phase:s.events[e.id]?.phase??'locked',dueAt:s.events[e.id]?.dueAt??null,count:s.events[e.id]?.count??0})),
  visitors:events(c).filter(e=>e.visitor&&s.events[e.id]?.phase==='visiting').map(e=>({eventId:e.id,...e.visitor,until:s.events[e.id].dueAt})),memories:s.memories});
}
export const serializeState=s=>JSON.stringify(s);
/** Explicit v1 migration; unknown IDs always fail. Legacy work ratios use migrationV1.workUnits. */
export function deserializeState(json,c){
 validateConfig(c);const s=JSON.parse(json),legacy=s?.version===1;if(!s||![1,2].includes(s.version))fail('Unsupported save version');
 number(s.lastTimestamp,'Timestamp');number(s.wallet?.yarn,'Wallet');integer(s.transactionSequence,'Sequence');
 if(!Array.isArray(s.owned)||new Set(s.owned).size!==s.owned.length)fail('Save shape');for(const id of s.owned)item(c,id);
 if(legacy){s.version=2;s.events={};s.memories={};}
 for(const field of ['placements','upgrades','cooldowns','events','memories'])if(!map(s[field]))fail('Save map');
 if(s.project!==null){
  if(!map(s.project)||Boolean(s.project.itemId)===Boolean(s.project.recipeId)||(legacy&&s.project.recipeId))fail('Invalid project');const p=projectDefinition(s,c);number(s.project.work,'Work');
  const oldUnits=legacy?(c.migrationV1?.workUnits?.[s.project.itemId]??p.workUnits):p.workUnits;
  if(s.project.work>oldUnits||s.owned.includes(s.project.itemId))fail('Invalid project');if(legacy)s.project.work=s.project.work/oldUnits*p.workUnits;
 }
 const placed=new Set();for(const [id,slots]of Object.entries(s.placements)){const m=meadow(c,id);if(!map(slots))fail('Invalid placement');for(const [slotId,itemId]of Object.entries(slots)){if(!m.slots.some(x=>x.id===slotId&&x.itemId===itemId)||!s.owned.includes(itemId)||placed.has(itemId))fail('Invalid placement');placed.add(itemId);}}
 for(const [id,level]of Object.entries(s.upgrades)){const u=c.upgrades.find(x=>x.id===id);if(!u||!Number.isSafeInteger(level)||level<0||level>u.maxLevel)fail('Invalid upgrade');}
 const expected=new Set();for(const m of c.meadows)for(const r of rules(m))if(active(s,m,r))expected.add(ruleKey(m,r));
 for(const [id,due]of Object.entries(s.cooldowns)){if(!expected.delete(id))fail('Invalid timer');number(due,'Timer');}
 if(expected.size&&(!legacy||!c.migrationV1||[...expected].some(id=>c.migrationV1.ruleIds.includes(id))))fail('Missing timer');
 for(const [id,memory]of Object.entries(s.memories)){if(!events(c).some(e=>e.id===id)||!map(memory))fail('Unknown memory');number(memory.firstAt,'Memory time');number(memory.lastAt,'Memory time');integer(memory.count,'Memory count');if(!memory.count||memory.firstAt>memory.lastAt||memory.lastAt>s.lastTimestamp)fail('Invalid memory');}
 for(const [id,saved]of Object.entries(s.events)){
  const e=events(c).find(e=>e.id===id);if(!e||!map(saved)||!['waiting','visiting','resting','done','available'].includes(saved.phase))fail('Invalid event');integer(saved.count,'Event count');
  if(['done','available'].includes(saved.phase)){if(saved.dueAt!==null)fail('Unexpected event timer');}else number(saved.dueAt,'Event due');
  if(saved.count!==(s.memories[id]?.count??0))fail('Event memory mismatch');
  const validPhase=e.repeatable
   ? saved.phase==='waiting'||(['visiting','resting','available'].includes(saved.phase)&&saved.count>0)
   : (saved.phase==='waiting'&&saved.count===0)||(['visiting','done'].includes(saved.phase)&&saved.count===1);
  if(!validPhase)fail('Event phase mismatch');
  if(!requirementsMet(s,e)||(saved.dueAt!==null&&saved.dueAt<=s.lastTimestamp))fail('Invalid scheduled event');
 }
 for(const id of Object.keys(s.memories))if(!has(s.events,id))fail('Memory without event');
 if(s.project?.recipeId){const r=projectDefinition(s,c),e=events(c).find(e=>e.id===r.eventId);if(!unlocked(s,c,r)||!eventAvailable(s,e))fail('Active recipe event unavailable');}
 if(legacy){sync(s,c,s.lastTimestamp);resetAccrual(s);}else{
  if(!map(s.accrual)||!map(s.accrual.automatic)||!map(s.accrual.events))fail('Missing accrual');
  for(const p of ['baseYarn','baseWork','elapsedMs'])number(s.accrual[p],'Accrual');
  for(const [id,count]of Object.entries(s.accrual.automatic)){if(!c.meadows.some(m=>rules(m).some(r=>ruleKey(m,r)===id&&r.trigger==='idle')))fail('Unknown accrual rule');integer(count,'Accrual count');}
  for(const [id,count]of Object.entries(s.accrual.events)){if(!events(c).some(e=>e.id===id))fail('Unknown accrual event');integer(count,'Accrual count');}
  for(const e of events(c))if(e.trigger==='automatic'&&requirementsMet(s,e)&&!has(s.events,e.id))fail('Missing event');
  if(s.wallet.yarn!==accruedYarn(s,c))fail('Accrual wallet mismatch');
  if(s.project){const total=projectDefinition(s,c).workUnits;if(s.accrual.baseWork>total||s.project.work!==Math.min(total,s.accrual.baseWork+s.accrual.elapsedMs/1000*rate(s,c,'idle')))fail('Accrual work mismatch');}
  else if(s.accrual.baseWork!==0)fail('Accrual without project');
 }
 return copy(s);
}
