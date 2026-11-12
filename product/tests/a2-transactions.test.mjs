import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dispatchA2Transaction as dispatch } from '../app/core/a2-transactions.mjs';
import { applyA2Inventory, occupiedA2Slots } from '../app/core/a2-inventory.mjs';

const initial = () => ({ lastTimestamp: 100, wallet: { yarn: 10 }, project: null, transactionSequence: 0, craftAuto: false,
  placements: { meadow: { rabbit: 'rabbit', flower: 'flower', tree: 'tree' }, pond: { cat: 'kot-cat' } },
  owned: ['rabbit', 'flower', 'tree', 'kot-cat'], upgrades: { hook: 3 } });
const plan = { id: 'plan', type: 'startA2Plan', count: 2, now: 100 };
const cancel = { id: 'cancel', type: 'cancelA2Unstarted', jobId: 'a2-plan', now: 100 };
const accessory = { id: 'accessory', type: 'startA2Accessory', accessoryId: 'rabbit-scarf', mode: 'direct', now: 100 };
const roundtrip = state => JSON.parse(JSON.stringify(state));

test('payment, job and both slots commit together; duplicate commands never pay/refund twice', () => {
  const before = initial();
  const state = dispatch(before, plan);
  assert.deepEqual(before, initial());
  assert.equal(state.wallet.yarn, 6);
  assert.equal(state.project.units.length, 2);
  assert.equal(occupiedA2Slots(state.a2.inventory), 2);
  assert.equal(state.craftAuto, false);
  assert.deepEqual(state.owned, before.owned);
  assert.deepEqual(state.placements, before.placements);
  assert.deepEqual(state.upgrades, before.upgrades);
  assert.equal(state.accrual.baseYarn, 6);
  assert.deepEqual(dispatch(roundtrip(state), plan), state);
  const later = { ...roundtrip(state), lastTimestamp: 200 };
  assert.deepEqual(dispatch(later, plan), later);
  const stopped = dispatch(state, cancel);
  assert.equal(stopped.wallet.yarn, 10);
  assert.equal(stopped.project, null);
  assert.equal(occupiedA2Slots(stopped.a2.inventory), 0);
  assert.ok(stopped.a2.inventory.parts.every(part => part.status === 'cancelled'));
  assert.throws(() => applyA2Inventory(stopped.a2.inventory, { id: 'reuse', type: 'planPaid', jobId: 'other', partIds: ['a2-plan-part-1'] }), /reused/);
  assert.deepEqual(dispatch(roundtrip(stopped), cancel), stopped);
  assert.deepEqual(dispatch(stopped, plan), stopped);
  assert.throws(() => dispatch(stopped, { ...plan, count: 1 }), /reused/);
  assert.throws(() => dispatch(stopped, { ...cancel, id: 'again' }));
});

test('failed payment, unlock, inventory and occupied-slot checks leave all input unchanged', () => {
  for (const before of [
    { ...initial(), wallet: { yarn: 3 } },
    { ...initial(), placements: { meadow: { rabbit: 'rabbit', flower: 'flower' } } },
    { ...initial(), project: { itemId: 'house', work: 7, paused: true } },
    dispatch(initial(), plan)
  ]) {
    const snapshot = roundtrip(before);
    assert.throws(() => dispatch(before, { ...plan, id: 'new-plan' }));
    assert.deepEqual(before, snapshot);
  }
  const before = initial();
  assert.throws(() => dispatch(before, { ...accessory, mode: 'prepared', partId: 'missing' }));
  assert.deepEqual(before, initial());
  assert.throws(() => dispatch(before, { ...plan, now: 101 }), /Settle/);
});

test('partial first unit keeps paid work; cancelling only unstarted second refunds exactly 2', () => {
  const state = dispatch(initial(), plan);
  // Trusted settled fixture: work advancement is deliberately the next slice.
  state.project.work = 12;
  const stopped = dispatch(state, cancel);
  assert.equal(stopped.wallet.yarn, 8);
  assert.equal(stopped.project.work, 12);
  assert.equal(stopped.project.units.length, 1);
  assert.equal(occupiedA2Slots(stopped.a2.inventory), 1);
  assert.throws(() => dispatch(stopped, { ...cancel, id: 'again' }), /No unstarted/);
  assert.equal(state.wallet.yarn, 6);
});

test('inventory capacity rejection rolls back payment and direct preserves an existing motif', () => {
  let state = dispatch(initial(), plan);
  for (const unit of state.project.units) {
    state.a2.inventory = applyA2Inventory(state.a2.inventory, { id: `finish-${unit.partId}`, type: 'motifFinished', jobId: state.project.jobId, partId: unit.partId });
  }
  state.project = null;
  const snapshot = roundtrip(state);
  assert.throws(() => dispatch(state, { ...plan, id: 'over-capacity', count: 1 }), /capacity/);
  assert.deepEqual(state, snapshot);
  state = dispatch(state, accessory);
  assert.equal(state.wallet.yarn, 0);
  assert.deepEqual(state.a2.inventory, snapshot.a2.inventory);
  assert.equal(occupiedA2Slots(state.a2.inventory), 2);
});

test('finished first unit survives stopping untouched second; prepared cancellation returns only 4', () => {
  let state = dispatch(initial(), plan);
  const partId = state.project.units[0].partId;
  state.a2.inventory = applyA2Inventory(state.a2.inventory, { id: 'finished-first', type: 'motifFinished', jobId: state.project.jobId, partId });
  state.project.completedUnits = 1;
  state.project.work = 0;
  state = dispatch(state, cancel);
  assert.equal(state.wallet.yarn, 8);
  assert.equal(state.project, null);
  assert.equal(occupiedA2Slots(state.a2.inventory), 1);
  state = dispatch(state, { ...accessory, mode: 'prepared', partId });
  assert.equal(state.wallet.yarn, 4);
  assert.equal(state.a2.inventory.parts[0].status, 'reserved');
  const stopped = dispatch(state, { ...cancel, id: 'cancel-accessory', jobId: state.project.jobId });
  assert.equal(stopped.wallet.yarn, 8);
  assert.equal(stopped.a2.inventory.parts[0].status, 'free');
  assert.equal(occupiedA2Slots(stopped.a2.inventory), 1);
  const progressed = roundtrip(state);
  progressed.project.work = 0.1;
  assert.throws(() => dispatch(progressed, { ...cancel, id: 'too-late', jobId: progressed.project.jobId }), /Started work/);
  assert.equal(progressed.a2.inventory.parts[0].status, 'reserved');
});

test('direct costs/refunds 6; old cancellation cannot affect a new job; started direct is retained', () => {
  let state = dispatch(initial(), accessory);
  assert.equal(state.wallet.yarn, 4);
  const stop = { ...cancel, jobId: state.project.jobId };
  state = dispatch(state, stop);
  assert.equal(state.wallet.yarn, 10);
  state = dispatch(state, { ...accessory, id: 'new-accessory' });
  assert.deepEqual(dispatch(state, stop), state);
  assert.throws(() => dispatch(state, { ...stop, id: 'stale-cancel' }));
  state.project.work = 1;
  assert.throws(() => dispatch(state, { ...stop, id: 'late', jobId: state.project.jobId }), /Started work/);
  assert.equal(state.wallet.yarn, 4);
});
