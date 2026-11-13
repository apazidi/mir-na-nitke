import {test} from 'node:test';
import assert from 'node:assert/strict';
import {acquireSaveWriter,SAVE_WRITER_LOCK} from '../app/ui/save-writer.mjs';
import {createSession} from '../app/ui/session.mjs';
import {developmentCatalog} from './dev-catalog.mjs';

function fixture() {
  const store=new Map(),writes=[],windowTarget=new EventTarget(),documentTarget=new EventTarget();
  const storage={getItem:key=>store.get(key)??null,setItem:(key,value)=>{writes.push(key);store.set(key,value);}};
  let held=false;
  const locks={async request(name,options,callback){
    assert.equal(name,SAVE_WRITER_LOCK);assert.deepEqual(options,{mode:'exclusive',ifAvailable:true});
    if(held)return callback(null);
    held=true;try{return await callback({name});}finally{held=false;}
  }};
  return {store,writes,storage,locks,windowTarget,documentTarget,
    options:{getStorage:()=>storage,getLocks:()=>locks,windowTarget,documentTarget}};
}

test('one writer holds the browser lock until release; guarded storage then refuses stale writes',async()=>{
  const f=fixture(),first=await acquireSaveWriter(f.options),second=await acquireSaveWriter(f.options);
  assert.equal(first.active,true);assert.equal(second.active,false);assert.equal(second.reason,'occupied');
  assert.throws(()=>second.storage.setItem('save','wrong'));
  first.storage.setItem('save','paid');first.setFlush(()=>first.storage.setItem('save','flushed'));
  f.windowTarget.dispatchEvent(new Event('pagehide'));
  assert.equal(first.active,false);assert.equal(f.store.get('save'),'flushed');
  assert.throws(()=>first.storage.setItem('save','stale'));
  await Promise.resolve();await Promise.resolve();
  const third=await acquireSaveWriter(f.options);assert.equal(third.active,true);third.release();
});

test('missing, throwing and rejected lock managers fail closed without reading saved state',async()=>{
  for(const getLocks of [()=>undefined,()=>{throw Error('denied');},()=>({request(){throw Error('denied');}}),()=>({request:()=>Promise.reject(Error('denied'))})]){
    const f=fixture();let reads=0;f.storage.getItem=()=>{reads++;throw Error('must not read');};
    const lease=await acquireSaveWriter({...f.options,getLocks});
    assert.equal(lease.active,false);assert.equal(lease.reason,'unavailable');assert.equal(reads,0);assert.deepEqual(f.writes,[]);
  }
});

test('genuinely inaccessible storage permits explicitly temporary play without requesting locks',async()=>{
  const f=fixture();
  const lease=await acquireSaveWriter({...f.options,getStorage:()=>{throw Error('SecurityError');},getLocks:()=>{throw Error('must not request');}});
  assert.equal(lease.mode,'temporary');assert.equal(lease.active,true);assert.equal(lease.storage,undefined);
  f.documentTarget.dispatchEvent(new Event('freeze'));
  f.windowTarget.dispatchEvent(new Event('pagehide'));
  const restored=new Event('pageshow');Object.defineProperty(restored,'persisted',{value:true});f.windowTarget.dispatchEvent(restored);
  assert.equal(lease.active,true);assert.equal(lease.storage,undefined);
  lease.release();assert.equal(lease.active,false);
});

test('pagehide during pending acquisition never activates a late granted lock',async()=>{
  const f=fixture();let grant;
  const pending=acquireSaveWriter({...f.options,getLocks:()=>({request:(_name,_options,callback)=>new Promise(resolve=>{grant=()=>resolve(callback({}));})})});
  f.windowTarget.dispatchEvent(new Event('pagehide'));
  const lease=await pending;grant();await Promise.resolve();
  assert.equal(lease.active,false);assert.deepEqual(f.writes,[]);
});

test('revoked session cannot advance, pay or save; BFCache pageshow never flushes a stale state',async()=>{
  const f=fixture(),lease=await acquireSaveWriter(f.options),{config}=developmentCatalog();let now=0;
  const session=createSession(config,{storage:lease.storage,isActive:()=>lease.active,now:()=>now});
  assert.equal(session.act({type:'startProject',itemId:'rabbit'}),true);
  const saved=structuredClone(session.state),writes=f.writes.length;let flushes=0;
  lease.setFlush(()=>{flushes++;session.tick();});
  const restored=new Event('pageshow');Object.defineProperty(restored,'persisted',{value:true});f.windowTarget.dispatchEvent(restored);
  now=60000;session.tick();assert.equal(session.act({type:'click'}),false);
  assert.deepEqual(session.state,saved);assert.equal(f.writes.length,writes);assert.equal(flushes,0);
  assert.throws(()=>createSession(config,{isActive:()=>false}),/inactive/);
});

test('corrupt save isolates temporary play, preserves raw bytes and permanently drops old storage wrappers',async()=>{
  const f=fixture();f.store.set('save','{broken');
  const lease=await acquireSaveWriter(f.options),oldStorage=lease.storage,{config}=developmentCatalog();
  const session=createSession(config,{key:'save',storage:oldStorage,now:()=>0,isActive:()=>lease.active,onPersistenceUnavailable:()=>lease.isolate()});
  assert.equal(lease.mode,'temporary');assert.equal(session.act({type:'startProject',itemId:'rabbit'}),true);
  session.act({type:'click'});const work=session.state.project.work;
  f.documentTarget.dispatchEvent(new Event('freeze'));f.windowTarget.dispatchEvent(new Event('pagehide'));
  await Promise.resolve();await Promise.resolve();
  assert.equal(lease.active,true);assert.equal(session.act({type:'click'}),true);assert.ok(session.state.project.work>work);
  assert.equal(f.store.get('save'),'{broken');assert.deepEqual(f.writes,[]);
  assert.throws(()=>oldStorage.getItem('save'));assert.throws(()=>oldStorage.setItem('ui','stale'));
  const other=await acquireSaveWriter(f.options);assert.equal(other.active,true);other.release();
});

for(const duringExit of [false,true])test(`write failure ${duringExit?'inside pagehide flush':'after paid save'} keeps memory and never retries shared writes`,async()=>{
  const f=fixture(),lease=await acquireSaveWriter(f.options),oldStorage=lease.storage,{config}=developmentCatalog();
  let fail=false,attempts=0;const write=f.storage.setItem;
  f.storage.setItem=(key,value)=>{attempts++;if(fail)throw Error('quota');write(key,value);};
  const session=createSession(config,{key:'save',storage:oldStorage,now:()=>0,isActive:()=>lease.active,onPersistenceUnavailable:()=>lease.isolate()});
  session.act({type:'startProject',itemId:'rabbit'});session.act({type:'click'});
  const paid=structuredClone(session.state),raw=f.store.get('save');lease.setFlush(()=>session.tick());fail=true;
  if(duringExit)f.windowTarget.dispatchEvent(new Event('pagehide'));else session.tick();
  assert.equal(lease.mode,'temporary');assert.equal(lease.active,true);assert.deepEqual(session.state,paid);
  const failedAttempts=attempts;fail=false;
  f.documentTarget.dispatchEvent(new Event('freeze'));
  const restored=new Event('pageshow');Object.defineProperty(restored,'persisted',{value:true});f.windowTarget.dispatchEvent(restored);
  await Promise.resolve();await Promise.resolve();
  const other=await acquireSaveWriter(f.options);assert.equal(other.active,true);
  other.storage.setItem('save','new-writer');const attemptsAfterOther=attempts;
  assert.equal(session.act({type:'click'}),true);assert.ok(session.state.project.work>paid.project.work);
  assert.equal(session.state.wallet.yarn,paid.wallet.yarn);assert.equal(attempts,attemptsAfterOther);
  assert.equal(attemptsAfterOther,failedAttempts+1);assert.equal(f.store.get('save'),'new-writer');assert.notEqual(raw,'new-writer');
  assert.throws(()=>oldStorage.setItem('ui','stale'));assert.throws(()=>oldStorage.getItem('save'));other.release();
});
