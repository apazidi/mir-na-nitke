import {stagedCatalog} from './staged-catalog.mjs';
import {PATTERN_ART} from '../art-experiments/pattern-v1/art.mjs';
import {REQUIREMENTS,specification} from '../app/core/pattern.mjs';
export const PATTERN_SAVE_KEY='mir-na-nitke-pattern-study-v1';
export function patternCatalog(){
 const runtime=stagedCatalog();
 for(const [id,displayName]of [['flower-pattern','Узор «Ромашка»'],['rabbit-scarf','Шарфик Кролика'],['cat-doily','Салфетка Котика']]){
  const spec=specification(id,id==='flower-pattern'?'learn':'direct'),art=PATTERN_ART[id];
  const item={id,displayName,workUnits:spec.totalWork,yarnCost:spec.paidCost,requiresPlaced:REQUIREMENTS,benefit:'Украшение без дополнительного дохода',art:{...art,stages:[{at:0,image:art.finishedSprite},{at:1,image:art.finishedSprite}]}};
  runtime.config.items.push(item);if(runtime.catalog.items!==runtime.config.items)runtime.catalog.items.push(item);
 }
 return runtime;
}
