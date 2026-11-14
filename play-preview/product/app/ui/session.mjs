import * as core from '../core/index.mjs';
/** Browser host: commit elapsed time before attempting a possibly rejected command.
 * legacyMigration='config' opts into rich-world balance migration; default 'v1'
 * keeps the historical v2-key to v3-key schema bridge. Never writes legacyKey. */
export function createSession(config, {engine=core,strictLoad=false,storage, key='mir-na-nitke-v1', legacyKey, legacyConfig, legacyMigration='v1', now=Date.now, onNotice=()=>{}, isActive=()=>true, onPersistenceUnavailable=()=>{}}={}) {
  if(!isActive())throw Error('Save writer inactive');
  let state;
  let blockedSave=false,imported=false,importedReport=null;
  try {
    if(!['v1','config'].includes(legacyMigration))throw Error('Unknown legacy migration');
    const raw=storage?.getItem(key),missing=raw===null||raw===undefined;
    const oldRaw=missing&&legacyKey?storage?.getItem(legacyKey):null;
    if(!missing)state=engine.deserializeState(raw,config);
    else if(oldRaw!==null&&oldRaw!==undefined&&legacyConfig){
      // The key and old adapter identify this source, including an old-config v2
      // written by the engine-only preview. Validate before explicit migration.
      const old=engine.deserializeState(oldRaw,legacyConfig),settled=engine.advanceTime(old,now(),legacyConfig);
      importedReport=summarizeAdvance(old,settled,legacyConfig);
      if(importedReport&&old.project){
        const field=old.project.recipeId?'recipes':'items',id=old.project.recipeId??old.project.itemId;
        importedReport.work*=config[field].find(i=>i.id===id).workUnits/legacyConfig[field].find(i=>i.id===id).workUnits;
      }
      if(legacyMigration==='config')state=engine.migrateConfigState(settled,legacyConfig,config,settled.lastTimestamp);
      else{
        const source={...settled,version:1};delete source.events;delete source.memories;delete source.accrual;
        state=engine.deserializeState(JSON.stringify(source),config);
      }
      imported=true;
    }else state=engine.createInitialState(config,now());
  }
  catch (error) { if(strictLoad)throw error; blockedSave=true; importedReport=null; onPersistenceUnavailable(); state=engine.createInitialState(config,now()); onNotice('Сохранение недоступно или несовместимо. Игра работает только в этой вкладке; исходное сохранение не перезаписывается.'); }
  function persist(){ if(blockedSave||!isActive())return; try{storage?.setItem(key,engine.serializeState(state));}catch{blockedSave=true;onPersistenceUnavailable();onNotice('Не удалось сохранить. Прогресс доступен только в этой вкладке. Оставьте её открытой.');} }
  function commitStrict(candidate){
    if(blockedSave||!isActive())return false;
    try{if(!storage)throw Error('Storage unavailable');storage.setItem(key,engine.serializeState(candidate));state=candidate;return true;}
    catch{blockedSave=true;onNotice('Не удалось сохранить работу. Изменение не применено. Оставьте вкладку открытой; сохранённый мир можно открыть после восстановления хранилища.');return false;}
  }
  function tick(){ const before=state;if(!isActive())return {before,state,report:null}; const candidate=engine.advanceTime(state,now(),config); if(strictLoad)commitStrict(candidate);else{state=candidate;persist();} return {before,state,report:summarizeAdvance(before,state,config)}; }
  const initial=tick();let awayReport=importedReport??initial.report;
  const restarted=new Set(),backupKey=key+'-restart-backup';
  return {get state(){return state;},get view(){return engine.selectView(state,config);},get imported(){return imported;},tick,
    get canRestart(){return isActive()&&!blockedSave&&Boolean(storage);},
    restart(requestId){
      if(!isActive()||blockedSave||!storage||typeof requestId!=='string'||!requestId)return false;
      if(restarted.has(requestId))return true;
      // Prepare both snapshots without mutating the live world. localStorage writes
      // are atomic per key; a failed backup/new-save write leaves the old world live.
      const timestamp=now(),previous=engine.advanceTime(state,timestamp,config),fresh=engine.createInitialState(config,timestamp);
      try{storage.setItem(backupKey,engine.serializeState(previous));storage.setItem(key,engine.serializeState(fresh));}
      catch{onNotice('Не удалось начать заново. Прежняя игра сохранена; можно продолжить её.');return false;}
      state=fresh;awayReport=null;imported=false;restarted.add(requestId);return true;
    },
    exportRestartBackup(){try{return isActive()?storage?.getItem(backupKey)??null:null;}catch{return null;}},
    takeAwayReport(){const report=awayReport;awayReport=null;return report;},
    act(action){if(!isActive()||strictLoad&&blockedSave)return false;tick();if(strictLoad&&blockedSave)return false;try{const candidate=engine.dispatch(state,{...action,now:state.lastTimestamp},config);if(strictLoad)return commitStrict(candidate);state=candidate;persist();return true;}catch(error){onNotice(error.message);return false;}},
    exportSave(){tick();return engine.serializeState(state);}
  };
}

/** Report a committed advance; presentation never grants or collects its rewards. */
export function summarizeAdvance(before,state,config){
  const elapsedMs=Math.max(0,state.lastTimestamp-before.lastTimestamp);
  if(elapsedMs<15000)return null;
  const sameProject=before.project&&state.project&&(before.project.itemId===state.project.itemId&&before.project.recipeId===state.project.recipeId);
  return {elapsedMs,productionMs:Math.min(elapsedMs,config.maxOfflineMs),yarn:state.wallet.yarn-before.wallet.yarn,
    work:sameProject?state.project.work-before.project.work:0,
    memories:Object.keys(state.memories??{}).filter(id=>(state.memories[id].count??0)>(before.memories?.[id]?.count??0)),
    visitors:core.selectView(state,config).visitors.map(v=>v.eventId)};
}
