import test from 'node:test';
import assert from 'node:assert/strict';
import {VERSION,SECTION_COUNT,SECTION_COSTS,CLICK_WORK,STAGE_MS,createState,advance,click,setAuto,serialize,deserialize,snapshot} from './prototype/model.mjs';
const near=(a,b,message)=>assert.ok(Math.abs(a-b)<1e-8,`${message??'values'}: ${a} / ${b}`);
const effort=work=>SECTION_COSTS.reduce((sum,cost,i)=>sum+cost*Math.max(0,Math.min(1,work-i)),0);

test('an empty meadow waits for an explicit start; one click contributes visible work',()=>{
 const fresh=createState(1000),later=advance(fresh,1000000);
 assert.equal(fresh.work,0);assert.equal(later.work,0);assert.equal(later.started,false);assert.equal(later.auto,false);
 const made=click(later,1000000);near(made.work,CLICK_WORK);assert.equal(made.started,true);assert.equal(fresh.work,0);
});

test('automatic work is independent of tick partition and same-time reload is idempotent',()=>{
 const started=setAuto(createState(1000),true,1000);
 let partitioned=started;for(let i=1;i<=70;i++)partitioned=advance(partitioned,1000+i*STAGE_MS/70);
 const once=advance(started,1000+STAGE_MS);near(partitioned.work,once.work);near(once.work,1);
 const loaded=deserialize(serialize(once));near(advance(loaded,1000+STAGE_MS).work,once.work);
 const off=setAuto(once,false,1000+STAGE_MS);near(advance(off,1000+STAGE_MS*4).work,off.work);
});

test('manual work carries across stage boundaries and remains additive beside auto',()=>{
 let state=createState(0);const count=Math.ceil(1/CLICK_WORK);
 for(let i=0;i<count;i++)state=click(state,i*100);
 near(effort(state.work),count*CLICK_WORK);assert.ok(state.work>1&&state.work<2);
 const on=setAuto(state,true,2000),later=click(on,2000+STAGE_MS/2);
 near(effort(later.work),effort(state.work)+.5+CLICK_WORK);
});

test('small heart sections take four clicks while preserving every contribution',()=>{
 let state=setAuto(advance(setAuto(createState(0),true,0),STAGE_MS),false,STAGE_MS);
 near(state.work,1);const first=state;
 for(let i=0;i<4;i++)state=click(state,STAGE_MS+i*100);
 near(state.work,2);near(effort(state.work)-effort(first.work),CLICK_WORK*4);
 const elapsed=advance(setAuto(createState(0),true,0),50_000);
 near(effort(elapsed.work),50_000/STAGE_MS,'idle crosses differently priced sections without dropping time');
});

test('returning adds elapsed auto work once, while rollback cannot double count time',()=>{
 const on=setAuto(createState(10000),true,10000),saved=advance(on,20000);
 const returned=advance(deserialize(serialize(saved)),30000);near(returned.work,20000/STAGE_MS);
 const repeated=advance(deserialize(serialize(returned)),30000);near(repeated.work,returned.work);
 const back=advance(returned,15000);near(back.work,returned.work);near(advance(back,30000).work,returned.work);
 near(advance(back,35000).work,25000/STAGE_MS);
});

test('completion preserves the full object and cannot generate extra stages',()=>{
 const on=setAuto(createState(1000),true,1000),done=advance(on,1000+STAGE_MS*(SECTION_COUNT+10));
 assert.equal(done.work,SECTION_COUNT);assert.equal(done.auto,false);assert.equal(snapshot(done).finished,true);
 assert.equal(done.completedAt,145200,'six differently priced sections need 144.2 seconds');
 assert.equal(snapshot(advance(on,145199)).finished,false);assert.equal(snapshot(advance(on,145200)).finished,true);
 let partitioned=on;for(let now=2000;now<=150000;now+=1000)partitioned=advance(partitioned,now);
 assert.equal(partitioned.completedAt,done.completedAt);assert.equal(partitioned.work,done.work);
 assert.equal(click(done,1000+STAGE_MS*100).work,SECTION_COUNT);
 assert.equal(advance(deserialize(serialize(done)),1000+STAGE_MS*100).work,SECTION_COUNT);
});

test('save validation rejects malformed, incompatible and impossible progress',()=>{
 const good=JSON.parse(serialize(click(createState(1000),2000)));
 assert.equal(deserialize(JSON.stringify(good)).work,CLICK_WORK);
 for(const data of [null,{}, {...good,version:VERSION+1},{...good,work:-1},{...good,work:SECTION_COUNT+1},{...good,work:null},{...good,lastUpdatedAt:null}]){
  let rejected=false;try{rejected=deserialize(JSON.stringify(data))===null;}catch{rejected=true;}assert.ok(rejected,JSON.stringify(data));
 }
 for(const text of ['', '{']){let rejected=false;try{rejected=deserialize(text)===null;}catch{rejected=true;}assert.ok(rejected);}
});
