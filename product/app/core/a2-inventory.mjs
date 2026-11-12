// Draft A2 inventory reducer; deliberately not exported by the live engine.
// These are internal facts, NOT player commands. The future engine transaction
// must validate payment, work, unlocks and its single job before calling this,
// and persist wallet + job + this inventory together. No storage or clocks here.
export const A2_ACCESSORIES = Object.freeze(['rabbit-scarf', 'cat-doily']);
export const A2_CAPACITY = 2;

export function createA2Inventory() {
  return { parts: [], owned: [], receipts: [] };
}

export function occupiedA2Slots(state) {
  return state.parts.filter(part => part.status !== 'consumed').length;
}

function requireId(value) {
  if (typeof value !== 'string' || !value.trim()) throw new Error('Expected stable ID');
}

export function applyA2Inventory(state, event) {
  requireId(event.id);
  const signature = JSON.stringify(event);
  const receipt = state.receipts.find(entry => entry.id === event.id);
  if (receipt) {
    if (receipt.signature !== signature) throw new Error('Event ID reused');
    return structuredClone(state);
  }
  const next = structuredClone(state);
  const part = next.parts.find(entry => entry.partId === event.partId);
  const busy = next.parts.some(entry => ['planned', 'reserved'].includes(entry.status));
  const accessory = () => {
    if (!A2_ACCESSORIES.includes(event.accessoryId)) throw new Error('Unknown accessory');
    if (next.owned.includes(event.accessoryId)) throw new Error('Accessory already owned');
  };
  const reserved = () => {
    if (!part || part.status !== 'reserved' || part.jobId !== event.jobId) {
      throw new Error('Reservation does not belong to job');
    }
  };
  switch (event.type) {
    case 'planPaid': {
      requireId(event.jobId);
      const ids = event.partIds;
      if (!Array.isArray(ids) || ![1, 2].includes(ids.length)) throw new Error('Plan must have 1 or 2 parts');
      ids.forEach(requireId);
      if (new Set(ids).size !== ids.length || ids.some(id => next.parts.some(p => p.partId === id))) {
        throw new Error('Part ID reused');
      }
      const free = next.parts.filter(p => p.status === 'free').length;
      if (busy || occupiedA2Slots(next) + ids.length > A2_CAPACITY ||
          ids.length > A2_ACCESSORIES.length - next.owned.length - free) {
        throw new Error('No capacity for plan');
      }
      next.parts.push(...ids.map(partId => ({ partId, status: 'planned', jobId: event.jobId })));
      break;
    }
    case 'motifFinished':
      if (!part || part.status !== 'planned' || part.jobId !== event.jobId) throw new Error('Unknown planned part');
      part.status = 'free';
      delete part.jobId;
      break;
    case 'preparedStarted':
      requireId(event.jobId);
      accessory();
      if (busy || !part || part.status !== 'free') throw new Error('Motif unavailable');
      Object.assign(part, { status: 'reserved', jobId: event.jobId, accessoryId: event.accessoryId });
      break;
    case 'preparedCancelled':
      // Caller has proved remaining work == 0; only its 4 yarn may be refunded.
      reserved();
      part.status = 'free';
      delete part.jobId;
      delete part.accessoryId;
      break;
    case 'preparedFinished':
      reserved();
      if (next.owned.includes(part.accessoryId)) throw new Error('Accessory already owned');
      part.status = 'consumed';
      next.owned.push(part.accessoryId);
      break;
    case 'directFinished':
      accessory();
      if (busy) throw new Error('Inventory job still active');
      next.owned.push(event.accessoryId);
      break;
    default:
      throw new Error('Unknown inventory fact');
  }
  next.receipts.push({ id: event.id, signature });
  return next;
}
