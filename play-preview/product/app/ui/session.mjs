import * as core from '../core/index.mjs';
/** Browser host: commit elapsed time before attempting a possibly rejected command. */
export function createSession(config, {storage, key='mir-na-nitke-v1', legacyKey, legacyConfig, now=Date.now, onNotice=()=>{}}={}) {
  let state;
  let blockedSave=false,imported=false,importedReport=null;
  try {
    const raw=storage?.getItem(key),missing=raw===null||raw===undefined;
    const oldRaw=missing&&legacyKey?storage?.getItem(legacyKey):null;
    if(!missing)state=core.deserializeState(raw,config);
    else if(oldRaw!==null&&oldRaw!==undefined&&legacyConfig){
      // The key and old adapter identify this source, including an old-config v2
      // written by the engine-only preview. Validate before explicit migration.
      const old=core.deserializeState(oldRaw,legacyConfig),settled=core.advanceTime(old,now(),legacyConfig);
      importedReport=summarizeAdvance(old,settled,legacyConfig);
      if(importedReport&&old.project?.itemId){const id=old.project.itemId;importedReport.work*=config.items.find(i=>i.id===id).workUnits/legacyConfig.items.find(i=>i.id===id).workUnits;}
      const source={...settled,version:1};delete source.events;delete source.memories;delete source.accrual;
      state=core.deserializeState(JSON.stringify(source),config);imported=true;
    }else state=core.createInitialState(config,now());
  }
  catch { blockedSave=true; state=core.createInitialState(config,now()); onNotice('Сохранение недоступно или несовместимо. Игра работает временно; исходное сохранение не перезаписывается.'); }
  function persist(){ if(blockedSave)return; try{storage?.setItem(key,core.serializeState(state));}catch{onNotice('Не удалось сохранить. Оставьте эту вкладку открытой.');} }
  function tick(){ const before=state; state=core.advanceTime(state,now(),config); persist(); return {before,state,report:summarizeAdvance(before,state,config)}; }
  const initial=tick();let awayReport=importedReport??initial.report;
  return {get state(){return state;},get view(){return core.selectView(state,config);},get imported(){return imported;},tick,
    takeAwayReport(){const report=awayReport;awayReport=null;return report;},
    act(action){tick();try{state=core.dispatch(state,{...action,now:state.lastTimestamp},config);persist();return true;}catch(error){onNotice(error.message);return false;}},
    exportSave(){tick();return core.serializeState(state);}
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
