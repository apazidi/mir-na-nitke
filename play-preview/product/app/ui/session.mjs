import * as core from '../core/index.mjs';
/** Browser host: commit elapsed time before attempting a possibly rejected command. */
export function createSession(config, {storage, key='mir-na-nitke-v1', now=Date.now, onNotice=()=>{}}={}) {
  let state;
  let blockedSave=false;
  try { const raw=storage?.getItem(key); state=raw ? core.deserializeState(raw,config) : core.createInitialState(config,now()); }
  catch { blockedSave=true; state=core.createInitialState(config,now()); onNotice('Сохранение недоступно или несовместимо. Игра работает временно; исходное сохранение не перезаписывается.'); }
  function persist(){ if(blockedSave)return; try{storage?.setItem(key,core.serializeState(state));}catch{onNotice('Не удалось сохранить. Оставьте эту вкладку открытой.');} }
  function tick(){ const before=state; state=core.advanceTime(state,now(),config); persist(); return {before,state}; }
  return {get state(){return state;},get view(){return core.selectView(state,config);},tick,
    act(action){tick();try{state=core.dispatch(state,{...action,now:state.lastTimestamp},config);persist();return true;}catch(error){onNotice(error.message);return false;}},
    exportSave(){tick();return core.serializeState(state);}
  };
}
