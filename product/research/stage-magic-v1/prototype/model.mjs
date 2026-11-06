export const VERSION = 1;
export const SECTION_COUNT = 6;
export const SECTION_COSTS = Object.freeze([1, .32, 1, .32, 1, .48]);
export const CLICK_WORK = .08;
export const STAGE_MS = 35_000;

const clock = value => Number.isSafeInteger(value) && value >= 0;
const complete = work => work >= SECTION_COUNT;
const TOTAL_COST = SECTION_COSTS.reduce((sum, cost) => sum + cost, 0);

// Saved work remains section + fraction. Only time/click accounting uses costs.
function budgetOf(work) {
  if (complete(work)) return TOTAL_COST;
  const section = Math.floor(work);
  return SECTION_COSTS.slice(0, section).reduce((sum, cost) => sum + cost, 0)
    + (work - section) * SECTION_COSTS[section];
}

function workOf(budget) {
  let remaining = Math.max(0, budget);
  for (let section = 0; section < SECTION_COUNT; section++) {
    const cost = SECTION_COSTS[section];
    if (remaining < cost - 1e-10) return section + remaining / cost;
    remaining = Math.max(0, remaining - cost);
  }
  return SECTION_COUNT;
}

export function createState(now = Date.now()) {
  if (!clock(now)) throw new TypeError('Invalid clock');
  return { version: VERSION, work: 0, started: false, auto: false, lastUpdatedAt: now, completedAt: null };
}

// The clock is a high-water mark. Revisiting a previously settled time never
// awards it twice, including after a local clock rollback and reload.
export function advance(state, now) {
  if (!clock(now)) throw new TypeError('Invalid clock');
  const elapsed = Math.max(0, now - state.lastUpdatedAt);
  const lastUpdatedAt = Math.max(now, state.lastUpdatedAt);
  if (!state.started || !state.auto || complete(state.work) || !elapsed) {
    return { ...state, lastUpdatedAt };
  }
  const budget = budgetOf(state.work);
  const work = workOf(budget + elapsed / STAGE_MS);
  // Ignore sub-microsecond floating noise before rounding to integer clock ms.
  const completedAt = complete(work)
    ? Math.min(lastUpdatedAt, Math.ceil(state.lastUpdatedAt + (TOTAL_COST - budget) * STAGE_MS - 1e-6))
    : null;
  return { ...state, work, lastUpdatedAt, completedAt, auto: !complete(work) };
}

export function click(state, now) {
  const settled = advance(state, now);
  if (complete(settled.work)) return settled;
  const work = workOf(budgetOf(settled.work) + CLICK_WORK);
  return {
    ...settled, work, started: true,
    auto: complete(work) ? false : settled.auto,
    completedAt: complete(work) ? settled.lastUpdatedAt : null,
  };
}

export function setAuto(state, enabled, now) {
  if (typeof enabled !== 'boolean') throw new TypeError('Invalid auto choice');
  const settled = advance(state, now);
  return { ...settled, started: settled.started || enabled, auto: enabled && !complete(settled.work) };
}

export function serialize(state) { return JSON.stringify(state); }

export function deserialize(text) {
  try {
    const s = JSON.parse(text);
    if (!s || s.version !== VERSION || !Number.isFinite(s.work) || s.work < 0 || s.work > SECTION_COUNT
      || typeof s.started !== 'boolean' || typeof s.auto !== 'boolean' || !clock(s.lastUpdatedAt)
      || (s.completedAt !== null && !clock(s.completedAt))
      || (!s.started && (s.work !== 0 || s.auto || s.completedAt !== null))
      || (complete(s.work) !== (s.completedAt !== null)) || (complete(s.work) && s.auto)
      || (s.completedAt !== null && s.completedAt > s.lastUpdatedAt)) return null;
    return { version: VERSION, work: s.work, started: s.started, auto: s.auto, lastUpdatedAt: s.lastUpdatedAt, completedAt: s.completedAt };
  } catch { return null; }
}

export function snapshot(state) {
  const done = complete(state.work), stageIndex = done ? SECTION_COUNT - 1 : Math.floor(state.work);
  return {
    ...state, totalSections: SECTION_COUNT, stageIndex,
    stageProgress: done ? 1 : state.work - stageIndex,
    stage: done ? SECTION_COUNT : stageIndex,
    completedSections: done ? SECTION_COUNT : stageIndex, complete: done, finished: done,
  };
}
