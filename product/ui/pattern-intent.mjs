import {ACCESSORIES, PATTERN_ID} from '../app/core/pattern.mjs';

export const INTENTS = Object.freeze({
 'rabbit-scarf': 'Шарфик Кролика',
 'cat-doily': 'Салфетка Котика',
 both: 'Оба аксессуара',
});
export const normalizeIntent = value => typeof value === 'string' && Object.hasOwn(INTENTS, value) ? value : null;
export function intentPlan(view, value) {
 const intent = normalizeIntent(value);
 if (!intent) return null;
 const targets = intent === 'both' ? ACCESSORIES : [intent];
 const remaining = targets.filter(id => !view.owned.includes(id));
 return {intent, title: INTENTS[intent], targets, remaining, completed: targets.length - remaining.length};
}
export function intentSummary(view, value) {
 const plan = intentPlan(view, value);
 if (!plan) return '';
 const title = 'Мой замысел: ' + plan.title + '. ';
 const progress = `Готово ${plan.completed} из ${plan.targets.length}. `;
 if (view.project) {
  const name = view.project.itemId === PATTERN_ID ? 'Узор' : (INTENTS[view.project.itemId] ?? 'Текущая работа');
  return title + progress + 'Сейчас: ' + name + '. ' + (view.project.canComplete ? 'Работа готова — сначала подтвердите завершение.' : 'Сначала продолжите эту работу; замысел ничего не запускает автоматически.');
 }
 if (!plan.remaining.length) return title + 'Замысел выполнен. Новая работа не требуется.';
 return title + progress + (view.pattern.learned ? 'Узор уже изучен. ' : '') + 'Далее: ' + plan.remaining.map(id => INTENTS[id]).join(' или ') + '. Выберите работу в «Узорах».';
}
/** Prices for a new decision only. A paid job must be resolved before another choice. */
export function intentComparison(view, value) {
 if (view.project) return null;
 const remaining = intentPlan(view, value)?.remaining ?? ACCESSORIES.filter(id => !view.owned.includes(id));
 const count = remaining.length;
 if (!count) return null;
 const round = n => Math.round(n * 100) / 100;
 if (view.pattern.learned) return {count, learned: true, yarn: count * 6, work: round(count * 100.94)};
 return {count, learned: false, direct: {yarn: count * 6, work: round(count * 144.2)}, study: {yarn: 2 + count * 6, work: round(60 + count * 100.94)}};
}
