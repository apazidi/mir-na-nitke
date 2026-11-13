// One cooperative writer per origin, including old/new save-key migration.
// Web Locks holds the lock while its callback's promise remains pending:
// https://www.w3.org/TR/web-locks/#api-lock-manager-request
// Never replace this with a read/check/write localStorage pseudo-lock.
export const SAVE_WRITER_LOCK = 'mir-na-nitke-save-writer';

export async function acquireSaveWriter({
  getStorage = () => globalThis.localStorage,
  getLocks = () => globalThis.navigator?.locks,
  windowTarget = globalThis.window,
  documentTarget = globalThis.document,
  onLost = () => {}
} = {}) {
  let active = false, ended = false, reason = 'unavailable', mode = 'blocked';
  let rawStorage, unlock, flush = () => {}, resolveReady;
  const ready = new Promise(resolve => { resolveReady = resolve; });
  const lease = {
    get active() { return active; },
    get reason() { return reason; },
    get mode() { return mode; },
    storage: undefined,
    setFlush(callback) { flush = callback; },
    isolate() {
      if (!active || ended) return;
      // Drop every shared-storage capability, including wrappers already handed
      // to session/UI callers. Keep the live in-memory state and release the lock.
      mode = 'temporary'; rawStorage = undefined; lease.storage = undefined;
      unlock?.();
    },
    release() { revoke('suspended', true); }
  };
  function revoke(why, shouldFlush = false, preserveTemporary = false) {
    if (ended) return;
    if (active && shouldFlush) { try { flush(); } catch {} }
    // The final flush itself can fail and isolate the only live in-memory save.
    if (preserveTemporary && mode === 'temporary') return;
    const wasActive = active;
    active = false; ended = true; reason = why;
    unlock?.();
    resolveReady(lease);
    if (wasActive) onLost(why);
  }
  // pagehide also runs for BFCache. Frozen documents must not retain a writer.
  // Storage-inaccessible play has no shared writer and only an in-memory save.
  // Keep that state usable across freeze/BFCache; reloading would discard it.
  windowTarget?.addEventListener('pagehide', () => { if (mode !== 'temporary') revoke('suspended', true, true); });
  documentTarget?.addEventListener('freeze', () => { if (mode !== 'temporary') revoke('suspended', true, true); });
  // Never flush a restored stale snapshot, even if the earlier event was missed.
  windowTarget?.addEventListener('pageshow', event => { if (event.persisted && mode !== 'temporary') revoke('suspended'); });
  try {
    rawStorage = getStorage();
    if (rawStorage) void rawStorage.length; // Read-only availability check.
  } catch { rawStorage = undefined; }
  if (!rawStorage) {
    mode = 'temporary'; active = true;
    return lease; // No shared reads/writes, so no lock is necessary.
  }
  lease.storage = {
    getItem(key) { if (!active || mode !== 'persistent') throw Error('Save writer inactive'); return rawStorage.getItem(key); },
    setItem(key, value) { if (!active || mode !== 'persistent') throw Error('Save writer inactive'); rawStorage.setItem(key, value); }
  };
  try {
    const locks = getLocks();
    if (!locks?.request) { revoke('unavailable'); return lease; }
    Promise.resolve(locks.request(SAVE_WRITER_LOCK, { mode: 'exclusive', ifAvailable: true }, async lock => {
      if (ended) return;
      if (!lock) { revoke('occupied'); return; }
      const held = new Promise(resolve => { unlock = resolve; });
      active = true; mode = 'persistent';
      resolveReady(lease);
      await held;
    })).then(() => { if (!ended && mode !== 'temporary') revoke('unavailable'); }, () => { if (mode !== 'temporary') revoke('unavailable'); });
  } catch { revoke('unavailable'); }
  return ready;
}
