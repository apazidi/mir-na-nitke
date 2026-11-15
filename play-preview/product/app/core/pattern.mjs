/** Isolated optional-pattern experiment. The approved economy remains in index.mjs. */
import * as base from './index.mjs';
export const PATTERN_ID='flower-pattern';
export const ACCESSORIES=['rabbit-scarf','cat-doily'];
export const PATTERN_IDS=[PATTERN_ID,...ACCESSORIES];
export const REQUIREMENTS=[['test-meadow','rabbit'],['test-meadow','flower'],['test-meadow','tree'],['kotoutro','kot-cat']].map(([meadowId,slotId])=>({meadowId,slotId}));
const fail=message=>{throw Error(message);};
export function specification(target,method){
 if(!PATTERN_IDS.includes(target)||!(target===PATTERN_ID?method==='learn':['direct','learned'].includes(method)))fail('Неизвестный способ изготовления');
 return {target,method,paidCost:target===PATTERN_ID?2:6,totalWork:target===PATTERN_ID?60:method==='learned'?100.94:144.2};
}
export function effectiveConfig(state,config){
 const p=state.project?.pattern;if(!p)return config;
 const spec=specification(state.project.itemId,p.method);
 return {...config,items:config.items.map(i=>i.id===spec.target?{...i,workUnits:spec.totalWork}:i)};
}
export function createInitialState(config,now){return {...base.createInitialState(config,now),patternVersion:1,patternJobs:{}};}
export function importState(raw,sourceConfig,config){const state=base.deserializeState(raw,sourceConfig);state.patternVersion=1;state.patternJobs={};return deserializeState(JSON.stringify(state),config);}
export function advanceTime(state,now,config){return base.advanceTime(state,now,effectiveConfig(state,config));}
export function serializeState(state){return base.serializeState(state);}
export function deserializeState(raw,config){
 let source;try{source=JSON.parse(raw);}catch{fail('Повреждено сохранение эксперимента');}
 if(source?.patternVersion!==1||!source.patternJobs||typeof source.patternJobs!=='object'||Array.isArray(source.patternJobs))fail('Повреждены записи работ');
 const state=base.deserializeState(raw,effectiveConfig(source,config)),active=[];
 const completed=new Set();
 for(const [id,job]of Object.entries(state.patternJobs)){
  if(!/^[a-z0-9-]{1,80}$/.test(id)||!job||typeof job!=='object')fail('Повреждён номер работы');
  const spec=specification(job.target,job.method);
  if(job.paidCost!==spec.paidCost||job.totalWork!==spec.totalWork||!['active','completed','cancelled'].includes(job.status))fail('Изменены условия оплаченной работы');
  if(job.method==='learned'&&!state.owned.includes(PATTERN_ID))fail('Узор ещё не изучен');
  if(job.status==='active')active.push([id,job]);
  if(job.status==='completed'){if(completed.has(job.target))fail('Повторная уникальная работа');completed.add(job.target);}
 }
 for(const id of PATTERN_IDS)if(state.owned.includes(id)!==completed.has(id))fail('Утрачен результат работы');
 if(state.project?.pattern){
  const p=state.project,m=p.pattern,job=state.patternJobs[m.jobId];
  if(p.recraft||p.recipeId||active.length!==1||!job||job.status!=='active'||job.target!==p.itemId||m.method!==job.method||m.paidCost!==job.paidCost||m.totalWork!==job.totalWork)fail('Изменена текущая работа');
 }else if(active.length||PATTERN_IDS.includes(state.project?.itemId))fail('Утрачена текущая работа');
 return state;
}
function resetAccrual(state){state.accrual={baseYarn:state.wallet.yarn,baseWork:state.project?.work??0,elapsedMs:0,automatic:{},events:{}};}
export function dispatch(state,action,config){
 const settled=advanceTime(state,action.now,config),p=settled.project;
 if(action.type==='startPattern'){
  const spec=specification(action.target,action.method),id=action.jobId;
  if(typeof id!=='string'||!/^[a-z0-9-]{1,80}$/.test(id))fail('Нужен номер работы');
  const previous=settled.patternJobs[id];
  if(previous){if(previous.target!==spec.target||previous.method!==spec.method)fail('Этот номер уже принадлежит другой работе');return settled;}
  if(!base.requirementsMet(settled,{requiresPlaced:REQUIREMENTS}))fail('Сначала разместите Кролика, Цветок, Дерево и Котика');
  if(p)fail('Сначала закончите текущую работу');
  if(spec.target===PATTERN_ID&&ACCESSORIES.every(id=>settled.owned.includes(id)))fail('Оба аксессуара уже готовы');
  if(spec.method==='learned'&&!settled.owned.includes(PATTERN_ID))fail('Сначала изучите узор');
  if(spec.target!==PATTERN_ID&&settled.owned.includes(PATTERN_ID)&&spec.method!=='learned')fail('Для этой работы уже изучен узор');
  const c={...config,items:config.items.map(i=>i.id===spec.target?{...i,workUnits:spec.totalWork}:i)};
  const next=base.dispatch(settled,{type:'startProject',itemId:spec.target,now:settled.lastTimestamp},c);
  next.project.pattern={jobId:id,method:spec.method,paidCost:spec.paidCost,totalWork:spec.totalWork};
  next.patternJobs[id]={...spec,status:'active'};return next;
 }
 if(action.type==='completePattern'||action.type==='cancelPattern'){
  const job=settled.patternJobs[action.jobId];
  if(!job)fail('Работа не найдена');
  if(job.status!=='active')return settled;
  if(p?.pattern?.jobId!==action.jobId)fail('Это другая работа');
  if(action.type==='completePattern'){
   const next=base.dispatch(settled,{type:'completeCraft',now:settled.lastTimestamp},effectiveConfig(settled,config));next.patternJobs[action.jobId].status='completed';return next;
  }
  if(p.work!==0)fail('Первые петли уже связаны. Можно поставить работу на паузу, но вернуть пряжу нельзя.');
  settled.wallet.yarn+=job.paidCost;settled.project=null;settled.patternJobs[action.jobId].status='cancelled';resetAccrual(settled);return settled;
 }
 if(PATTERN_IDS.includes(action.itemId)&&['startProject','startRecraft'].includes(action.type)||p?.pattern&&['completeCraft','cancelRecraft'].includes(action.type))fail('Используйте условия этой работы');
 return base.dispatch(settled,action,effectiveConfig(settled,config));
}
export function selectView(state,config){
 const view=base.selectView(state,effectiveConfig(state,config));view.projects=view.projects.filter(p=>!PATTERN_IDS.includes(p.itemId));
 const remaining=ACCESSORIES.filter(id=>!state.owned.includes(id));
 view.pattern={unlocked:base.requirementsMet(state,{requiresPlaced:REQUIREMENTS}),learned:state.owned.includes(PATTERN_ID),remaining,job:state.project?.pattern??null};
 return view;
}
