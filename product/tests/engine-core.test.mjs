import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState, dispatch, advanceTime, selectView, serializeState, deserializeState, validateConfig } from '../app/core/index.mjs';

const stages = [{ at: 0 }, { at: 0.5 }, { at: 1 }];
const config = {
  initialYarn: 10, reserveYarnPerHour: 1, clickWork: 5, idleWorkPerSecond: 1, maxOfflineMs: 3600000,
  items: [
    { id: 'animal', yarnCost: 10, workUnits: 10, art: { stages } },
    { id: 'plant', yarnCost: 3, workUnits: 10, art: { stages } }
  ],
  upgrades: [{ id: 'hook', target: 'click', baseCost: 2, costMultiplier: 2, amount: 5, maxLevel: 3 }],
  meadows: [{ id: 'garden', slots: [{ id: 'resident', itemId: 'animal' }, { id: 'flower', itemId: 'plant' }],
    passive: [{ id: 'income', requires: ['resident'], ratePerHour: 20 }],
    interactions: [
      { id: 'pet-animal', action: 'pet', trigger: 'manual', requires: ['resident'], amount: 3, cooldownMs: 20000 },
      { id: 'smell', action: 'sniff', trigger: 'idle', requires: ['resident', 'flower'], amount: 8, cooldownMs: 600000 }
    ] }]
};
const action = (s, type, data = {}, now = s.lastTimestamp) => dispatch(s, { type, now, ...data }, config);
function resident() {
  let s = action(createInitialState(config, 0), 'startProject', { itemId: 'animal' });
  s = action(action(s, 'click'), 'click');
  s = action(s, 'completeCraft');
  return action(s, 'placeItem', { meadowId: 'garden', slotId: 'resident' });
}
test('click spends yarn once, stages use work, completion and placement cannot duplicate', () => {
  const initial = createInitialState(config, 0);
  const s = action(initial, 'startProject', { itemId: 'animal' });
  assert.equal(initial.wallet.yarn, 10);
  assert.equal(s.wallet.yarn, 0);
  const halfway = action(s, 'click');
  assert.equal(selectView(halfway, config).project.stage, 1);
  assert.throws(() => action(halfway, 'completeCraft'));
  const ready = action(halfway, 'click');
  assert.equal(selectView(ready, config).project.stage, 2);
  const owned = action(ready, 'completeCraft');
  assert.deepEqual(owned.owned, ['animal']);
  assert.throws(() => action(owned, 'completeCraft'));
  assert.throws(() => action(resident(), 'placeItem', { meadowId: 'garden', slotId: 'resident' }));
});
test('idle, cap, clock rollback and repeated save restoration never reapply time', () => {
  const start = action(createInitialState(config, 100), 'startProject', { itemId: 'animal' });
  const s = advanceTime(start, 7200100, config);
  assert.equal(s.project.work, 10);
  assert.equal(s.wallet.yarn, 1);
  assert.equal(s.lastTimestamp, 7200100);
  assert.deepEqual(advanceTime(s, 0, config), s);
  const loaded = deserializeState(serializeState(s), config);
  assert.deepEqual(advanceTime(loaded, 7200100, config), s);
});
test('manual anti-spam survives save and exact cooldown boundary', () => {
  const placed = resident();
  const p = { meadowId: 'garden', interactionId: 'pet-animal' };
  const rewarded = action(placed, 'pet', p);
  assert.equal(rewarded.wallet.yarn, 3);
  assert.throws(() => action(rewarded, 'pet', p));
  assert.throws(() => action(deserializeState(serializeState(rewarded), config), 'pet', p, 19999));
  assert.ok(action(rewarded, 'pet', p, 20000).wallet.yarn > 6);
});
test('synthetic vertical slice unlocks combo; all placed income runs without active screen', () => {
  let s = action(resident(), 'pet', { meadowId: 'garden', interactionId: 'pet-animal' });
  s = action(s, 'startProject', { itemId: 'plant' });
  s = action(action(s, 'click'), 'click');
  s = action(s, 'completeCraft');
  s = action(s, 'placeItem', { meadowId: 'garden', slotId: 'flower' });
  const next = advanceTime(s, 600000, config);
  assert.equal(next.wallet.yarn, 11.5);
  assert.deepEqual(advanceTime(next, 600000, config), next);
  assert.throws(() => action(s, 'sniff', { meadowId: 'garden', interactionId: 'smell' }));
  const capped = advanceTime(s, 7200000, config);
  assert.equal(capped.wallet.yarn, 69);
  assert.deepEqual(advanceTime(deserializeState(serializeState(capped), config), 7200000, config), capped);
});
test('upgrades charge increasing prices, affect work and stop at max level', () => {
  let s = createInitialState(config, 0);
  s = action(s, 'buyUpgrade', { upgradeId: 'hook' });
  assert.equal(s.wallet.yarn, 8);
  assert.equal(selectView(s, config).upgrades[0].cost, 4);
  s = action(s, 'buyUpgrade', { upgradeId: 'hook' });
  assert.throws(() => action(s, 'buyUpgrade', { upgradeId: 'hook' }));
  s = advanceTime(s, 14400000, { ...config, maxOfflineMs: 14400000 });
  s = action(s, 'buyUpgrade', { upgradeId: 'hook' });
  assert.throws(() => action(s, 'buyUpgrade', { upgradeId: 'hook' }));
  let project = action(createInitialState(config, 0), 'buyUpgrade', { upgradeId: 'hook' });
  project = action(project, 'startProject', { itemId: 'plant' });
  assert.equal(action(project, 'click').project.work, 10);
});
test('reserve recovers after spending; unplaced or missing prerequisites yield no rewards', () => {
  const s = action(createInitialState(config, 0), 'startProject', { itemId: 'animal' });
  assert.equal(advanceTime(s, 3600000, config).wallet.yarn, 1);
  assert.throws(() => action(s, 'pet', { meadowId: 'garden', interactionId: 'pet-animal' }));
  assert.throws(() => action(s, 'placeItem', { meadowId: 'garden', slotId: 'resident' }));
});
test('config and save reject invalid economics, versions, IDs, duplicated items, and missing timers', () => {
  for (const bad of [{ ...config, reserveYarnPerHour: -1 }, { ...config, maxOfflineMs: Infinity },
    { ...config, items: config.items.map(i => ({ ...i, yarnCost: 100 })) }])
    assert.throws(() => validateConfig(bad));
  const s = resident();
  for (const mutate of [
    x => x.version = 2, x => x.wallet.yarn = -1, x => x.owned.push('animal'),
    x => x.owned.push('unknown'), x => x.cooldowns = {}, x => x.upgrades.hook = 4
  ]) {
    const bad = structuredClone(s); mutate(bad);
    assert.throws(() => deserializeState(JSON.stringify(bad), config));
  }
  const view = selectView(s, config); view.wallet.yarn = 999;
  assert.equal(s.wallet.yarn, 0);
});
