import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createA2Inventory, applyA2Inventory, occupiedA2Slots } from '../app/core/a2-inventory.mjs';

const paid = { id: 'pay-1', type: 'planPaid', jobId: 'plan-1', partIds: ['p1', 'p2'] };
const finish = partId => ({ id: `finish-${partId}`, type: 'motifFinished', jobId: 'plan-1', partId });
const start = { id: 'start-1', type: 'preparedStarted', jobId: 'job-1', partId: 'p1', accessoryId: 'rabbit-scarf' };
function ready() {
  return ['p1', 'p2'].reduce((state, id) => applyA2Inventory(state, finish(id)), applyA2Inventory(createA2Inventory(), paid));
}

test('paid units occupy both slots before completion and cannot duplicate on reload', () => {
  const initial = createA2Inventory();
  const state = applyA2Inventory(initial, paid);
  assert.equal(occupiedA2Slots(state), 2);
  assert.deepEqual(initial, createA2Inventory());
  assert.deepEqual(applyA2Inventory(JSON.parse(JSON.stringify(state)), paid), state);
  assert.throws(() => applyA2Inventory(state, { ...paid, id: 'pay-2', partIds: ['p3'] }));
  assert.throws(() => applyA2Inventory(state, { ...paid, partIds: ['p3'] }), /reused/);
  const first = applyA2Inventory(state, finish('p1'));
  assert.equal(occupiedA2Slots(first), 2);
  assert.deepEqual(applyA2Inventory(first, finish('p1')), first);
});

test('reservation retains capacity; cancellation returns precisely the same motif', () => {
  const state = ready();
  const reserved = applyA2Inventory(state, start);
  assert.equal(occupiedA2Slots(reserved), 2);
  assert.equal(state.parts[0].status, 'free');
  assert.throws(() => applyA2Inventory(reserved, { ...start, id: 'other', jobId: 'other', partId: 'p2' }));
  const cancel = { id: 'cancel-1', type: 'preparedCancelled', jobId: 'job-1', partId: 'p1' };
  assert.throws(() => applyA2Inventory(reserved, { ...cancel, jobId: 'wrong' }));
  const cancelled = applyA2Inventory(reserved, cancel);
  assert.deepEqual(cancelled.parts, state.parts);
  const restarted = applyA2Inventory(cancelled, { ...start, id: 'start-2', jobId: 'job-2' });
  assert.deepEqual(applyA2Inventory(restarted, cancel), restarted);
});

test('completion consumes and grants ownership together; old facts never resurrect a motif', () => {
  const reserved = applyA2Inventory(ready(), start);
  const complete = { id: 'done-1', type: 'preparedFinished', jobId: 'job-1', partId: 'p1' };
  const done = applyA2Inventory(reserved, complete);
  assert.deepEqual(done.owned, ['rabbit-scarf']);
  assert.equal(done.parts[0].status, 'consumed');
  assert.equal(occupiedA2Slots(done), 1);
  for (const event of [paid, finish('p1'), start, complete]) {
    assert.deepEqual(applyA2Inventory(JSON.parse(JSON.stringify(done)), event), done);
  }
  assert.throws(() => applyA2Inventory(done, { ...complete, id: 'duplicate' }));
  assert.throws(() => applyA2Inventory(done, { ...paid, id: 'over-order', partIds: ['p3'] }));
});

test('direct completion preserves unused stock and closes preparation after both accessories', () => {
  let state = ready();
  for (const accessoryId of ['rabbit-scarf', 'cat-doily']) {
    state = applyA2Inventory(state, { id: accessoryId, type: 'directFinished', accessoryId });
  }
  assert.equal(occupiedA2Slots(state), 2);
  assert.ok(state.parts.every(part => part.status === 'free'));
  assert.throws(() => applyA2Inventory(state, { ...paid, id: 'new-plan', partIds: ['p3'] }));
  assert.throws(() => applyA2Inventory(state, { ...start, id: 'duplicate-owner' }));
});
