/** Whole AVAILABLE units; fractional production stays in the saved model. */
export const yarnAmount=value=>Math.floor(Math.max(0,value)).toLocaleString('ru-RU');
export function nextGoal(view,config){
 const find=id=>config.items.find(i=>i.id===id);
 if(view.project){
  const item=view.project.recipeId?config.recipes.find(r=>r.id===view.project.recipeId):find(view.project.itemId);
  return view.project.canComplete?'Работа «'+item.displayName+'» готова — нажмите «'+(view.project.recipeId||view.project.recraft?'Завершить':'Разместить')+'».':'Продолжите: '+item.displayName+'. Касайтесь изделия или включите авто.';
 }
 for(const meadow of view.meadows){const ready=meadow.slots.find(s=>s.canPlace&&!s.placed);if(ready)return 'Разместите: '+find(ready.itemId).displayName+'. Изделие появится на полянке.';}
 const next=view.projects.find(p=>p.unlocked&&!view.owned.includes(p.itemId));
 if(next){const item=find(next.itemId);return 'Следующая работа: '+item.displayName+'. '+item.benefit+'.';}
 return 'Все изделия этой версии созданы. Повторы и встречи — в «Проектах».';
}
