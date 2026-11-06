export const VERSION = 1;
export const SECTION_COUNT = 6;
export const CLICK_WORK = .08;
export const STAGE_MS = 35_000;

const clock = value => Number.isSafeInteger(value) && value >= 0;
const complete = work => work >= SECTION_COUNT;

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
  const work = Math.min(SECTION_COUNT, state.work + elapsed / STAGE_MS);
  const completedAt = complete(work)
    ? Math.min(lastUpdatedAt, Math.ceil(state.lastUpdatedAt + (SECTION_COUNT - state.work) * STAGE_MS))
    : null;
  return { ...state, work, lastUpdatedAt, completedAt, auto: !complete(work) };
}

export function click(state, now) {
  const settled = advance(state, now);
  if (complete(settled.work)) return settled;
  const work = Math.min(SECTION_COUNT, settled.work + CLICK_WORK);
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
