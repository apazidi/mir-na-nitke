// Isolated arithmetic, not an engine/prototype and not player evidence.
// Run: node product/research/next-mechanic-2026-11-07/model.mjs
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';

const base = {click: 2.8, auto: 1};
const maximum = {click: 2.8 + .35 * 10, auto: 1 + .08 * 10};
const proposed = {partYarn: 2, partWork: 36, remainderYarn: 4, remainderWork: 108.2, directYarn: 6, directWork: 144.2, capacity: 2};
const round = n => Math.round(n * 1e6) / 1e6;
assert(Math.abs(proposed.partWork + proposed.remainderWork - proposed.directWork) < 1e-9);
assert.equal(proposed.partYarn + proposed.remainderYarn, proposed.directYarn);

// Scheduled input: first click at 1/hz, then every 1/hz.
// Idle applies before each click. Work above each job boundary is discarded.
// Switching to the remainder costs no time in this model: actual UI costs extra.
function scheduled(work, click, auto, hz) {
  let progress = 0, ticks = 0, taps = 0;
  while (progress < work - 1e-9) {
    ticks++;
    progress = Math.min(work, progress + auto / hz);
    if (progress < work - 1e-9) {
      progress = Math.min(work, progress + click);
      taps++;
    }
    assert(ticks < 100000);
  }
  return {seconds: round(ticks / hz), taps};
}
const pairSum = (a, b) => ({seconds: round(a.seconds + b.seconds), taps: a.taps + b.taps});
const schedules = [];
for (const [level, rate] of Object.entries({base, maximum})) {
  for (const hz of [1, 10]) for (const autoOn of [false, true]) {
    const auto = autoOn ? rate.auto : 0;
    const part = scheduled(proposed.partWork, rate.click, auto, hz);
    const remainder = scheduled(proposed.remainderWork, rate.click, auto, hz);
    const direct = scheduled(proposed.directWork, rate.click, auto, hz);
    const prepared = pairSum(part, remainder);
    schedules.push({level, hz, autoOn, continuousTotalSeconds: round(proposed.directWork / (rate.click * hz + auto)), part, remainder, direct, prepared, overheadSeconds: round(prepared.seconds - direct.seconds)});
  }
}
assert.equal(schedules.find(x => x.level === 'base' && x.hz === 1 && x.autoOn).prepared.seconds, 39);
assert.equal(schedules.find(x => x.level === 'maximum' && x.hz === 1 && !x.autoOn).prepared.taps, 24);
assert.equal(schedules.find(x => x.level === 'maximum' && x.hz === 1 && !x.autoOn).direct.taps, 23);

function planAfter(seconds, rate = base.auto) {
  const work = Math.min(72, Math.max(0, Math.min(seconds, 8 * 3600)) * rate);
  const completed = Math.min(2, Math.floor((work + 1e-9) / 36));
  return {seconds, completed, currentPartWork: completed === 2 ? 0 : round(work - completed * 36), paidYarn: 4, stopped: completed === 2};
}
const absence = [0, 20, 36, 60, 72, 900, 3600, 8 * 3600].map(t => planAfter(t));
assert.equal(absence.at(-1).completed, 2);
assert.equal(planAfter(-10).completed, 0);
assert.equal(planAfter(8 * 3600, 0).completed, 0);

const output = {
  kind: 'arithmetic-only; proposed A2; no browser or player test',
  baseCommit: '8ceeaf0249c810539beb3ab78c92eabea06b4e9a',
  base, maximum, proposed, schedules, absence,
  pureAuto: Object.fromEntries(Object.entries({base, maximum}).map(([name, rate]) => [name, {
    partSeconds: round(36 / rate.auto), planTwoSeconds: round(72 / rate.auto),
    remainderSeconds: round(108.2 / rate.auto), directAndPreparedTotalSeconds: round(144.2 / rate.auto)
  }])),
  finiteCost: {twoAccessoriesYarn: 12, twoAccessoriesWork: 288.4, permanentExtraIncome: 0, existingAllItemsYarn: 192, existingAllUpgradesYarn: 2225.292},
  incomeContext: {ratesAreMeanEquivalentIncludingDiscreteIdlePayouts: true, afterFourPerHour: 432, fullWorldPerHour: 1140, fullWorldEightHoursMean: 9120, zeroWalletMeanEstimateSecondsForPartAfterFour: round(2 / (432 / 3600)), zeroWalletMeanEstimateSecondsForWholeAfterFour: round(6 / (432 / 3600)), afterFourContinuousOnlyPerHour: 408, zeroWalletNoSniffSecondsForPart: round(2 / (408 / 3600)), zeroWalletNoSniffSecondsForWhole: round(6 / (408 / 3600))},
  limitations: ['No engine state machine or timing simulation', 'No interactions, human latency, rendering or network', 'Nominal work equality is not equality of taps or actual completion time', 'T/C must use identical boundaries and timing rules', 'No inference of fun, retention or economic sustainability']
};
writeFileSync(new URL('./model-output.json', import.meta.url), JSON.stringify(output, null, 2) + '\n');
console.log(JSON.stringify({checks: 'passed', output: 'model-output.json', discreteSchedules: schedules.length, absenceCases: absence.length}));
