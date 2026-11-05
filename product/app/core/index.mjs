/** Pure deterministic engine. All timestamps are UTC milliseconds.
 * Config is an engine-side economy adapter, NOT a content manifest extension.
 * Public functions return new JSON values and never read clocks or browser APIs.
 */
const copy = value => structuredClone(value);
const fail = message => { throw new Error(message); };
const number = (n, label, positive = false) => {
  if (!Number.isFinite(n) || n < 0 || (positive && n === 0)) fail(label);
};
const key = id => {
  if (typeof id !== 'string' || !/^[a-z0-9][a-z0-9-]*$/.test(id)) fail('Invalid stable ID');
};
const entries = object => Object.entries(object);
const has = (object, id) => Object.hasOwn(object, id);
function meadow(config, id) {
  return config.meadows.find(m => m.id === id) ?? fail('Unknown meadow');
}
function item(config, id) {
  return config.items.find(i => i.id === id) ?? fail('Unknown item');
}
function active(state, m, requires) {
  return requires.every(id => has(state.placements[m.id] ?? {}, id));
}
function rules(m) { return m.interactions ?? []; }
function ruleKey(m, r) { return m.id + '/' + r.id; }

/** Validate economy configuration before using it, including synthetic fixtures. */
export function validateConfig(c) {
  for (const name of ['initialYarn', 'reserveYarnPerHour', 'clickWork', 'idleWorkPerSecond', 'maxOfflineMs'])
    number(c[name], name, name === 'maxOfflineMs' || name === 'reserveYarnPerHour');
  for (const list of [c.items, c.meadows, c.upgrades]) {
    if (!Array.isArray(list)) fail('Expected config arrays');
    const ids = new Set();
    for (const value of list) {
      key(value.id);
      if (ids.has(value.id)) fail('Duplicate ID');
      ids.add(value.id);
    }
  }
  if (!c.items.length) fail('No starter item');
  for (const i of c.items) {
    number(i.workUnits, 'workUnits', true); number(i.yarnCost, 'yarnCost');
    if (!Array.isArray(i.art?.stages) || i.art.stages.length < 2) fail('Missing stages');
    let previous = -1;
    for (const stage of i.art.stages) {
      number(stage.at, 'Stage');
      if (stage.at <= previous || stage.at > 1) fail('Stage order');
      previous = stage.at;
    }
    if (i.art.stages[0].at !== 0 || previous !== 1) fail('Stage endpoints');
  }
  if (!c.items.some(i => i.yarnCost <= c.initialYarn)) fail('Starter unaffordable');
  for (const u of c.upgrades) {
    if (!['click', 'idle'].includes(u.target)) fail('Upgrade target');
    for (const p of ['baseCost', 'costMultiplier', 'amount', 'maxLevel']) number(u[p], p, true);
    if (!Number.isSafeInteger(u.maxLevel) || u.costMultiplier < 1) fail('Upgrade bounds');
    number(u.baseCost * u.costMultiplier ** (u.maxLevel - 1), 'Maximum price');
  }
  for (const m of c.meadows) {
    const slots = new Set();
    for (const s of m.slots) {
      key(s.id); item(c, s.itemId);
      if (slots.has(s.id)) fail('Duplicate slot');
      slots.add(s.id);
    }
    const ids = new Set();
    for (const r of [...(m.passive ?? []), ...rules(m)]) {
      key(r.id);
      if (ids.has(r.id)) fail('Duplicate rule');
      ids.add(r.id);
      if (!Array.isArray(r.requires) || !r.requires.length || r.requires.some(id => !slots.has(id))) fail('Rule dependencies');
      if (has(r, 'ratePerHour')) number(r.ratePerHour, 'Passive rate');
      else {
        if (!['pet', 'sniff'].includes(r.action) || !['manual', 'idle'].includes(r.trigger)) fail('Interaction');
        number(r.amount, 'Reward'); number(r.cooldownMs, 'Cooldown', true);
      }
    }
  }
  return c;
}

/** @returns {object} Versioned JSON save model. now must be supplied by host. */
export function createInitialState(config, now) {
  validateConfig(config); number(now, 'Timestamp');
  return { version: 1, lastTimestamp: now, wallet: { yarn: config.initialYarn },
    project: null, owned: [], placements: {}, upgrades: {}, cooldowns: {}, transactionSequence: 0 };
}
function credit(s, amount) {
  number(amount, 'Transaction amount');
  const balance = s.wallet.yarn + amount;
  number(balance, 'Wallet overflow');
  s.wallet.yarn = balance;
  if (amount) s.transactionSequence++;
}
function spend(s, amount) {
  number(amount, 'Price');
  if (s.wallet.yarn < amount) fail('Insufficient yarn');
  s.wallet.yarn -= amount;
  if (amount) s.transactionSequence++;
}
function rate(s, c, target) {
  return (target === 'click' ? c.clickWork : c.idleWorkPerSecond) +
    c.upgrades.filter(u => u.target === target).reduce((n, u) => n + (s.upgrades[u.id] ?? 0) * u.amount, 0);
}
function work(s, c, amount) {
  if (!s.project) return;
  s.project.work = Math.min(item(c, s.project.itemId).workUnits, s.project.work + amount);
}
function price(s, u) { return u.baseCost * u.costMultiplier ** (s.upgrades[u.id] ?? 0); }

/** Advances once, discards time beyond cap, and never moves the clock backward.
 * Automatic rewards start their timer when dependencies become placed.
 */
export function advanceTime(state, now, config) {
  number(now, 'Timestamp');
  const s = copy(state);
  if (now <= s.lastTimestamp) return s;
  const elapsed = Math.min(now - s.lastTimestamp, config.maxOfflineMs);
  const end = s.lastTimestamp + elapsed;
  work(s, config, elapsed / 1000 * rate(s, config, 'idle'));
  let income = config.reserveYarnPerHour * elapsed / 3600000;
  for (const m of config.meadows) {
    for (const p of m.passive ?? [])
      if (active(s, m, p.requires)) income += p.ratePerHour * elapsed / 3600000;
    for (const r of rules(m)) {
      const id = ruleKey(m, r);
      if (r.trigger !== 'idle' || !active(s, m, r.requires)) continue;
      const due = s.cooldowns[id];
      if (due <= end) {
        const count = Math.floor((end - due) / r.cooldownMs) + 1;
        income += count * r.amount;
        s.cooldowns[id] = due + count * r.cooldownMs;
      }
      // Discard capped-away offline periods for these timers too.
      if (s.cooldowns[id] <= now) s.cooldowns[id] = now + r.cooldownMs;
    }
  }
  credit(s, income);
  s.lastTimestamp = now;
  return s;
}

/** Actions: startProject {itemId}, click, completeCraft, buyUpgrade {upgradeId},
 * placeItem {meadowId,slotId}, pet/sniff {meadowId,interactionId}.
 * Every action includes now; invalid commands throw without mutating input.
 */
export function dispatch(state, action, config) {
  const s = advanceTime(state, action.now, config);
  switch (action.type) {
    case 'startProject': {
      const i = item(config, action.itemId);
      if (s.project || s.owned.includes(i.id)) fail('Project unavailable');
      spend(s, i.yarnCost); s.project = { itemId: i.id, work: 0 }; break;
    }
    case 'click':
      if (!s.project) fail('No project');
      work(s, config, rate(s, config, 'click')); break;
    case 'completeCraft':
      if (!s.project || s.project.work < item(config, s.project.itemId).workUnits) fail('Project incomplete');
      s.owned.push(s.project.itemId); s.project = null; break;
    case 'buyUpgrade': {
      const u = config.upgrades.find(u => u.id === action.upgradeId) ?? fail('Unknown upgrade');
      if ((s.upgrades[u.id] ?? 0) >= u.maxLevel) fail('Maximum level');
      spend(s, price(s, u)); s.upgrades[u.id] = (s.upgrades[u.id] ?? 0) + 1; break;
    }
    case 'placeItem': {
      const m = meadow(config, action.meadowId);
      const slot = m.slots.find(x => x.id === action.slotId) ?? fail('Unknown slot');
      if (!s.owned.includes(slot.itemId)) fail('Item not owned');
      if (has(s.placements[m.id] ?? {}, slot.id)) fail('Already placed');
      if (Object.values(s.placements).some(p => Object.values(p).includes(slot.itemId))) fail('Item already placed elsewhere');
      s.placements[m.id] ??= {};
      s.placements[m.id][slot.id] = slot.itemId;
      for (const r of rules(m)) {
        const id = ruleKey(m, r);
        if (active(s, m, r.requires) && !has(s.cooldowns, id))
          s.cooldowns[id] = s.lastTimestamp + (r.trigger === 'idle' ? r.cooldownMs : 0);
      }
      break;
    }
    case 'pet': case 'sniff': {
      const m = meadow(config, action.meadowId);
      const r = rules(m).find(x => x.id === action.interactionId) ?? fail('Unknown interaction');
      const id = ruleKey(m, r);
      if (r.action !== action.type || r.trigger !== 'manual' || !active(s, m, r.requires)) fail('Interaction unavailable');
      if (s.lastTimestamp < s.cooldowns[id]) fail('Cooldown');
      credit(s, r.amount); s.cooldowns[id] = s.lastTimestamp + r.cooldownMs; break;
    }
    default: fail('Unknown action');
  }
  return s;
}

/** Catalog is the validated engine adapter: ready-only items/meadows plus economy. */
export function selectView(state, catalog) {
  const project = state.project && item(catalog, state.project.itemId);
  const progress = project ? state.project.work / project.workUnits : 0;
  return copy({
    wallet: state.wallet, owned: state.owned,
    project: project ? { ...state.project, progress,
      stage: project.art.stages.findLastIndex(s => s.at <= progress),
      canComplete: progress === 1 } : null,
    projects: catalog.items.map(i => ({ itemId: i.id, yarnCost: i.yarnCost,
      canStart: !state.project && !state.owned.includes(i.id) && state.wallet.yarn >= i.yarnCost })),
    upgrades: catalog.upgrades.map(u => ({ id: u.id, level: state.upgrades[u.id] ?? 0,
      cost: price(state, u), canBuy: (state.upgrades[u.id] ?? 0) < u.maxLevel && state.wallet.yarn >= price(state, u) })),
    meadows: catalog.meadows.map(m => ({ id: m.id, slots: m.slots.map(slot => ({
      ...slot, placed: has(state.placements[m.id] ?? {}, slot.id),
      canPlace: state.owned.includes(slot.itemId) && !Object.values(state.placements).some(p => Object.values(p).includes(slot.itemId))
    })), interactions: rules(m).map(r => ({ id: r.id, action: r.action, trigger: r.trigger,
      available: r.trigger === 'manual' && active(state, m, r.requires) && state.lastTimestamp >= (state.cooldowns[ruleKey(m, r)] ?? Infinity),
      readyAt: state.cooldowns[ruleKey(m, r)] ?? null })) }))
  });
}
export function serializeState(state) { return JSON.stringify(state); }

/** Strict save loading. Unknown config IDs require an explicit migration, never reset silently. */
export function deserializeState(json, config) {
  validateConfig(config);
  const s = JSON.parse(json);
  if (!s || s.version !== 1) fail('Unsupported save version');
  number(s.lastTimestamp, 'Timestamp'); number(s.wallet?.yarn, 'Wallet');
  number(s.transactionSequence, 'Sequence');
  if (!Number.isSafeInteger(s.transactionSequence) || !Array.isArray(s.owned) || new Set(s.owned).size !== s.owned.length) fail('Save shape');
  for (const id of s.owned) item(config, id);
  if (s.project !== null) {
    const i = item(config, s.project.itemId); number(s.project.work, 'Work');
    if (s.project.work > i.workUnits || s.owned.includes(i.id)) fail('Invalid project');
  }
  for (const field of ['placements', 'upgrades', 'cooldowns'])
    if (!s[field] || typeof s[field] !== 'object' || Array.isArray(s[field])) fail('Save map');
  const placed = new Set();
  for (const [id, slots] of entries(s.placements)) {
    const m = meadow(config, id);
    for (const [slotId, itemId] of entries(slots)) {
      if (!m.slots.some(x => x.id === slotId && x.itemId === itemId) || !s.owned.includes(itemId) || placed.has(itemId)) fail('Invalid placement');
      placed.add(itemId);
    }
  }
  for (const [id, level] of entries(s.upgrades)) {
    const u = config.upgrades.find(x => x.id === id);
    if (!u || !Number.isSafeInteger(level) || level < 0 || level > u.maxLevel) fail('Invalid upgrade');
  }
  const expected = new Set();
  for (const m of config.meadows) for (const r of rules(m)) if (active(s, m, r.requires)) expected.add(ruleKey(m, r));
  for (const [id, due] of entries(s.cooldowns)) {
    if (!expected.delete(id)) fail('Invalid timer');
    number(due, 'Timer');
  }
  if (expected.size) fail('Missing timer');
  return copy(s);
}
