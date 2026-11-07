// Read-only design model. Uses actual v4 core/config; simulated time is explicit.
import {writeFile,mkdir,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {stagedCatalog,SECTION_WEIGHTS} from '../../ui/staged-catalog.mjs';
import {createInitialState,dispatch,advanceTime,selectView} from '../../app/core/index.mjs';
const referenceBaseline='e7bcbf5d79e41321ef0c805bf8c61403bf04a377';
const root=fileURLToPath(new URL('../../../',import.meta.url));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const canonical=bytes=>Buffer.from(bytes.toString().replace(/\r\n/g,'\n'));
const sourcePaths=['product/app/core/index.mjs','product/ui/staged-catalog.mjs','product/ui/gameplay-catalog.mjs','product/ui/dev-catalog.mjs'];
const sourceFiles=[];
for(const path of sourcePaths){
 const current=canonical(await readFile(new URL('../../../'+path,import.meta.url)));
 const reference=canonical(execFileSync('git',['show',referenceBaseline+':'+path],{cwd:root}));
 sourceFiles.push({path,sha256:hash(current),referenceSHA256:hash(reference)});
 if(hash(current)!==hash(reference))throw Error('Audit input changed since reference baseline: '+path+'. Update the audited baseline explicitly; old results must not be attributed to new inputs.');
}
const {config:c}=stagedCatalog(), start=1_800_000_000_000;
const round=n=>Math.round(n*10000)/10000;
const four=['rabbit','flower','tree','kot-cat'];
const all=[...four,'kot-coffee','kot-duck','house','butterfly','kot-chair','kot-leaf-house'];
function journey({auto=false,hz=1,route=four,returnSeconds=0}={}){
 let s=createInitialState(c,start),clicks=0;const steps=[];
 const act=a=>s=dispatch(s,{now:s.lastTimestamp,...a},c);
 act({type:'setCraftAuto',enabled:auto});
 for(const id of route){
  const i=c.items.find(x=>x.id===id),before=s.lastTimestamp;let wait=0,n=0;
  while(s.wallet.yarn<i.yarnCost){s=advanceTime(s,s.lastTimestamp+1000,c);wait++;if(wait>100000)throw Error('Unbounded affordability wait');}
  act({type:'startProject',itemId:id});const workStart=s.lastTimestamp;
  if(returnSeconds){s=advanceTime(s,s.lastTimestamp+returnSeconds*1000,c);if(!selectView(s,c).project.canComplete)throw Error('Return too early');}
  else if(hz===0){s=advanceTime(s,s.lastTimestamp+Math.ceil(i.workUnits/selectView(s,c).rates.idle*1000),c);}
  else while(!selectView(s,c).project.canComplete){s=advanceTime(s,s.lastTimestamp+1000/hz,c);if(!selectView(s,c).project.canComplete){act({type:'click'});n++;clicks++;}}
  act({type:'completeCraft'});act({type:'placeItem',meadowId:i.meadowId,slotId:id});
  const v=selectView(s,c);steps.push({id,clicks:n,affordabilityWaitSeconds:wait,workSeconds:round((s.lastTimestamp-workStart)/1000),totalStepSeconds:round((s.lastTimestamp-before)/1000),yarn:round(s.wallet.yarn),incomePerHour:v.rates.yarnPerHour,availableProjects:v.projects.filter(p=>p.canStart).map(p=>p.itemId),availableUpgrades:v.upgrades.filter(u=>u.canBuy).map(u=>u.id)});
 }
 return {state:s,summary:{auto,hz,returnSeconds,route,seconds:round((s.lastTimestamp-start)/1000),clicks,steps}};
}
const scenarios=[{auto:false,hz:1},{auto:true,hz:1},{auto:true,hz:2},{auto:true,hz:10},{auto:true,hz:0},{auto:true,hz:0,returnSeconds:1800},{auto:true,hz:1,route:all}].map(options=>journey(options).summary);
const full=journey({auto:true,hz:1,route:all}).state;
const fourState=journey({auto:true,hz:1}).state;
const offlines=[];
for(const label of ['empty','four-placed','full-world']){
 let s=label==='empty'?createInitialState(c,start):label==='four-placed'?fourState:full;
 if(label==='empty'){s=dispatch(s,{type:'setCraftAuto',enabled:true,now:s.lastTimestamp},c);s=dispatch(s,{type:'startProject',itemId:'rabbit',now:s.lastTimestamp},c);}
 for(const seconds of [300,1800,3600,28800,86400]){const after=advanceTime(s,s.lastTimestamp+seconds*1000,c);offlines.push({label,seconds,yarnGain:round(after.wallet.yarn-s.wallet.yarn),workGain:round((after.project?.work??0)-(s.project?.work??0)),ownedBefore:s.owned.length,ownedAfter:after.owned.length,project:after.project,memories:Object.keys(after.memories)});}
}
const result={
 referenceBaseline,actualHead:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),sourceFormat:'UTF-8 canonical LF',sourceMatchesReference:true,sourceFiles,scriptSHA256:hash(canonical(await readFile(new URL('./model-audit.mjs',import.meta.url)))),
 method:'Deterministic actual-core simulation. No UI latency, navigation time, interaction rewards or upgrades in journey paths. Clicks at evenly spaced intervals; first click after 1/hz seconds. This is not human behaviour or retention measurement.',
 configSHA256:createHash('sha256').update(JSON.stringify(c)).digest('hex'),
 config:{initialYarn:c.initialYarn,clickWork:c.clickWork,autoWorkPerSecond:c.idleWorkPerSecond,autoDefault:c.defaultCraftAuto,maxOfflineHours:c.maxOfflineMs/3600000,reserveYarnPerHour:c.reserveYarnPerHour},
 items:c.items.map(i=>({id:i.id,cost:i.yarnCost,work:i.workUnits,baseAutoSeconds:i.workUnits/c.idleWorkPerSecond,baseManualClicks:Math.ceil(i.workUnits/c.clickWork),sections:SECTION_WEIGHTS[i.id]??null,requires:i.requiresPlaced??[],passiveIncomePerHour:c.meadows.flatMap(m=>m.passive).find(r=>r.requires.includes(i.id)).ratePerHour})),
 totalItemCost:c.items.reduce((n,i)=>n+i.yarnCost,0),
 upgrades:c.upgrades.map(u=>({id:u.id,target:u.target,unlock:u.requiresPlaced,totalCostToMax:round(u.baseCost*(u.costMultiplier**u.maxLevel-1)/(u.costMultiplier-1)),level0Cost:u.baseCost,level9To10Cost:round(u.baseCost*u.costMultiplier**9),baseRate:u.target==='click'?c.clickWork:c.idleWorkPerSecond,maxRate:(u.target==='click'?c.clickWork:c.idleWorkPerSecond)+u.amount*u.maxLevel,firstRelativeIncrease:round(u.amount/(u.target==='click'?c.clickWork:c.idleWorkPerSecond))})),
 fullWorldIncomePerHour:selectView(full,c).rates.yarnPerHour,
 scenarios,offlines,
 notes:['No hold-to-repeat handler in current UI; pointerHeld only defers DOM rerender. No crafting-click cooldown in core; clicking faster can always increase rate.','A completed project remains pending until explicit completeCraft/placeItem; time does not start a next project.','Initial 32 guarantees the directed four-item path with no upgrade tradeoff until Cat. Other unlocked branches (House/Butterfly after Tree) can compete for yarn; early choice is limited, not globally absent.','Income events still settle while away; no automatic earning of a new owned item occurs.']
};
await mkdir(new URL('./evidence/',import.meta.url),{recursive:true});
await writeFile(new URL('./evidence/model.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({scenarios:scenarios.map(s=>({auto:s.auto,hz:s.hz,returnSeconds:s.returnSeconds,items:s.route.length,seconds:s.seconds,clicks:s.clicks,wait:s.steps.reduce((n,x)=>n+x.affordabilityWaitSeconds,0)})),upgrades:result.upgrades,income:result.fullWorldIncomePerHour,itemCosts:result.totalItemCost},null,2));
