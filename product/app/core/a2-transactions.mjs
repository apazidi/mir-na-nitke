import { A2_ACCESSORIES, applyA2Inventory, createA2Inventory } from './a2-inventory.mjs';

// Draft command slice, not a second engine or a live dispatch entrypoint.
// Uses the existing root wallet/project/placements; no separate working slot.
// Caller supplies trusted state with elapsed time already settled exactly at now.
// Until A2 time + save integration exists, do NOT feed these tagged projects into
// index.mjs dispatch/advanceTime/deserializeState or persist them in production.
const REQUIRED_ITEMS = ['rabbit', 'flower', 'tree', 'kot-cat'];
const requireId = id => {
  if (typeof id !== 'string' || !/^[a-z0-9][a-z0-9-]*$/.test(id)) throw new Error('Invalid stable ID');
};

export function dispatchA2Transaction(state, action) {
  requireId(action.id);
  const signature = JSON.stringify(action);
  const old = state.a2?.receipts.find(receipt => receipt.id === action.id);
  if (old) {
    if (old.signature !== signature) throw new Error('Command ID reused');
    return structuredClone(state);
  }
  if (!Number.isFinite(action.now) || action.now !== state.lastTimestamp) throw new Error('Settle elapsed time before command');
  const next = structuredClone(state);
  next.a2 ??= { inventory: createA2Inventory(), receipts: [] };
  if (!Number.isFinite(next.wallet?.yarn) || next.wallet.yarn < 0) throw new Error('Invalid wallet');
  const fact = event => {
    next.a2.inventory = applyA2Inventory(next.a2.inventory, { id: action.id, ...event });
  };
  const pay = amount => {
    if (next.wallet.yarn < amount) throw new Error('Insufficient yarn');
    next.wallet.yarn -= amount;
    next.transactionSequence++;
  };
  const refund = amount => {
    if (!Number.isFinite(next.wallet.yarn + amount)) throw new Error('Wallet overflow');
    next.wallet.yarn += amount;
    next.transactionSequence++;
  };
  const canStart = () => {
    if (next.project || next.a2.inventory.parts.some(part => ['planned', 'reserved'].includes(part.status))) {
      throw new Error('Workshop occupied');
    }
    const placed = new Set(Object.values(next.placements).flatMap(slots => Object.values(slots)));
    if (!REQUIRED_ITEMS.every(id => placed.has(id))) throw new Error('A2 locked');
  };
  const jobId = `a2-${action.id}`;
  switch (action.type) {
    case 'startA2Plan': {
      canStart();
      if (![1, 2].includes(action.count)) throw new Error('Plan must have 1 or 2 units');
      const units = Array.from({ length: action.count }, (_, i) => ({ partId: `${jobId}-part-${i + 1}`, paidAmount: 2 }));
      pay(2 * action.count);
      fact({ type: 'planPaid', jobId, partIds: units.map(unit => unit.partId) });
      next.project = { kind: 'a2', mode: 'plan', jobId, units, completedUnits: 0, work: 0, paused: false };
      break;
    }
    case 'startA2Accessory': {
      canStart();
      if (!A2_ACCESSORIES.includes(action.accessoryId) || next.a2.inventory.owned.includes(action.accessoryId)) {
        throw new Error('Accessory unavailable');
      }
      if (!['direct', 'prepared'].includes(action.mode)) throw new Error('Unknown accessory mode');
      const paidAmount = action.mode === 'prepared' ? 4 : 6;
      pay(paidAmount);
      if (action.mode === 'prepared') {
        fact({ type: 'preparedStarted', jobId, partId: action.partId, accessoryId: action.accessoryId });
      } else if (action.partId !== undefined) throw new Error('Direct has no reserved part');
      next.project = { kind: 'a2', mode: action.mode, jobId, accessoryId: action.accessoryId, paidAmount, work: 0, paused: false };
      if (action.mode === 'prepared') next.project.partId = action.partId;
      break;
    }
    case 'cancelA2Unstarted': {
      const job = next.project;
      if (job?.kind !== 'a2' || job.jobId !== action.jobId) throw new Error('Unknown A2 job');
      if (job.mode === 'plan') {
        // Only project.work is authoritative for the current unit. Later units
        // have not started; completedUnits identifies already finished units.
        const firstRefundable = job.completedUnits + (job.work > 0 ? 1 : 0);
        const units = job.units.slice(firstRefundable);
        if (!units.length) throw new Error('No unstarted units');
        fact({ type: 'planUnitsCancelled', jobId: job.jobId, partIds: units.map(unit => unit.partId) });
        refund(units.reduce((sum, unit) => sum + unit.paidAmount, 0));
        job.units = job.units.filter(unit => !units.some(cancelled => cancelled.partId === unit.partId));
        if (job.completedUnits === job.units.length) next.project = null;
      } else {
        if (job.work !== 0) throw new Error('Started work cannot be refunded');
        if (job.mode === 'prepared') fact({ type: 'preparedCancelled', jobId: job.jobId, partId: job.partId });
        refund(job.paidAmount);
        next.project = null;
      }
      break;
    }
    default:
      throw new Error('Unknown A2 transaction');
  }
  next.a2.receipts.push({ id: action.id, signature });
  // Match the host engine's post-command accrual anchor; old income/work must
  // never overwrite the just-committed payment or refund on the next tick.
  next.accrual = { baseYarn: next.wallet.yarn, baseWork: next.project?.work ?? 0, elapsedMs: 0, automatic: {}, events: {} };
  return next;
}
