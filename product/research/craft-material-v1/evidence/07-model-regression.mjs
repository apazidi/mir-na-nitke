import assert from 'node:assert/strict';
import * as model from '../prototype/model.mjs';

const tolerance = 1e-6;
const initial = model.createState();
const fibers = model.makeFibers(initial.seed);

// A complete straight cut cannot leave a root or retained piece on its outside.
for (const [a, b, inside] of [
  [{ x: -.47, y: -2 }, { x: -.47, y: 2 }, p => p.x >= -.47 - tolerance],
  [{ x: -2, y: -.72 }, { x: 2, y: -.72 }, p => p.y >= -.72 - tolerance],
]) {
  const result = model.cutSegment(initial, a, b);
  assert.ok(result.changed > 0);
  for (const fiber of fibers) {
    assert.ok(model.visiblePoints(fiber, result.state.lengths[fiber.id]).every(inside));
  }
  assert.equal(model.cutSegment(result.state, a, b).changed, 0);
  assert.deepEqual(model.undo(result.state).lengths, initial.lengths);
}

// Continuous blade movement must also catch strands nearly parallel to it.
function pass(state, from, to) {
  state = model.beginPass(state);
  const steps = Math.ceil(Math.hypot(to.x - from.x, to.y - from.y) / .028);
  const half = .118 / Math.sqrt(2);
  const blade = p => ({
    a: { x: p.x - half, y: p.y - half },
    b: { x: p.x + half, y: p.y + half },
  });
  let previous = blade(from);
  for (let i = 1; i <= steps; i++) {
    const current = blade({
      x: from.x + (to.x - from.x) * i / steps,
      y: from.y + (to.y - from.y) * i / steps,
    });
    state = model.cutSweep(state, previous, current).state;
    previous = current;
  }
  return model.endPass(state);
}

const shallow = pass(initial, { x: -.88, y: -1.25 }, { x: -.88, y: 1.25 });
const deep = pass(shallow, { x: -.47, y: -1.25 }, { x: -.47, y: 1.25 });
const top = pass(deep, { x: -1.25, y: -.72 }, { x: 1.25, y: -.72 });
const shallowBounds = model.snapshot(shallow).profileBounds;
const deepBounds = model.snapshot(deep).profileBounds;
const topBounds = model.snapshot(top).profileBounds;
assert.ok(deepBounds.left - shallowBounds.left > .40);
assert.ok(deepBounds.left >= -.47 + .118 / Math.sqrt(2) - tolerance);
assert.ok(topBounds.top >= -.72 + .118 / Math.sqrt(2) - tolerance);
assert.deepEqual(model.undo(deep).lengths, shallow.lengths);
assert.deepEqual(pass(deep, { x: -.47, y: -1.25 }, { x: -.47, y: 1.25 }).lengths, deep.lengths);
assert.deepEqual(model.load(model.save(top)).lengths, top.lengths);
assert.deepEqual(model.finish(top).lengths, top.lengths);
assert.equal(model.load(JSON.stringify({ ...top, version: 1 })), null);
assert.ok(initial.lengths.every(length => length === 1));

// The untouched right half does not silently follow the chosen left profile.
for (const fiber of fibers.filter(f => f.points.every(p => p.x >= 0))) {
  assert.equal(deep.lengths[fiber.id], 1);
}

console.log(JSON.stringify({
  version: model.VERSION,
  wholeLineCuts: 'pass',
  sweptBladeCuts: 'pass',
  undoReloadFinishAndV1Rejection: 'pass',
  shallow: shallowBounds,
  deep: deepBounds,
  top: topBounds,
}, null, 2));
