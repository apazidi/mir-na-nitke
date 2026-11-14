import * as engine from '../core/pattern.mjs';
import {createSession} from './session.mjs';
/** Called only after acquiring the shared writer. Never mutates the source key. */
export function createPatternSession(config,{sourceKey,sourceConfig,...options}){
 const {storage,key,isActive=()=>true,now=Date.now}=options,backupKey=key+'-source';
 if(!storage||!isActive())throw Error('Для эксперимента нужно доступное хранилище и одна активная вкладка. Основная игра не изменена.');
 try{
  const own=storage.getItem(key);
  if(own!==null)engine.deserializeState(own,config);
  else{
   const raw=storage.getItem(sourceKey),state=raw===null?engine.createInitialState(config,now()):engine.importState(raw,sourceConfig,config);
   if(raw!==null)storage.setItem(backupKey,raw);
   storage.setItem(key,engine.serializeState(state));
  }
 }catch{throw Error('Не удалось открыть сохранение эксперимента. Данные не перезаписаны; основная игра сохранена.');}
 const session=createSession(config,{...options,engine,strictLoad:true});
 return {...session,get state(){return session.state;},get view(){return session.view;},get canRestart(){return false;},exportSource(){try{return isActive()?storage.getItem(backupKey):null;}catch{return null;}}};
}
