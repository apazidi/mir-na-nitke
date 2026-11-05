/** Browser-safe boundary: manifests describe art; economy is supplied separately. */
const id = value => typeof value === 'string' && /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(value);
const safeAsset = value => typeof value === 'string' && /^art\/(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_-]+\.(png|webp)$/i.test(value);
export function resolveAssetUrl(pkg, relative, baseUrl, assets = []) {
  if (!id(pkg?.id) || !['item', 'meadow'].includes(pkg.kind) || !safeAsset(relative)) return null;
  const expected = `content/${pkg.kind === 'item' ? 'items' : 'meadows'}/${pkg.id}/`;
  if (pkg.basePath !== expected || !assets.includes(expected + relative)) return null;
  const base = new URL(baseUrl);
  if (!['http:', 'https:'].includes(base.protocol)) return null;
  return new URL(expected + relative, base).href;
}
export function selectStage(item, progress) {
  if (!Number.isFinite(progress) || !Array.isArray(item?.art?.stages)) return null;
  const stages = item.art.stages;
  if (!stages.length || stages[0].at !== 0 || stages.at(-1).at !== 1 || stages.some((s,i) => !Number.isFinite(s.at) || s.at < 0 || s.at > 1 || (i && s.at <= stages[i-1].at))) return null;
  return stages.filter(s => s.at <= Math.min(1, Math.max(0, progress))).at(-1) ?? null;
}
export function placementLayout(meadow, placements = {}, items = []) {
  return (meadow?.slots ?? []).filter(s => placements[s.id] === s.itemId)
    .map(s => ({...s, item: items.find(i => i.id === s.itemId), left:s.x * 100, top:s.y * 100}))
    .filter(s => s.item && Number.isFinite(s.x) && s.x >= 0 && s.x <= 1 && Number.isFinite(s.y) && s.y >= 0 && s.y <= 1 && Number.isFinite(s.scale) && s.scale > 0 && s.scale <= 4 && Number.isSafeInteger(s.z))
    .sort((a,b) => a.z-b.z || a.id.localeCompare(b.id));
}
export function createEngineConfig(catalog, economy = {}) {
  if (catalog?.schemaVersion !== 1 || !Array.isArray(catalog.items) || !Array.isArray(catalog.meadows) || [...catalog.items,...catalog.meadows].some(p => p.status !== 'ready')) throw new Error('Expected ready-only v1 catalog');
  return {
    initialYarn: economy.initialYarn ?? 0, reserveYarnPerHour: economy.reserveYarnPerHour ?? 12,
    clickWork: economy.clickWork ?? 5, idleWorkPerSecond: economy.idleWorkPerSecond ?? 1,
    maxOfflineMs: economy.maxOfflineMs ?? 28800000, upgrades: economy.upgrades ?? [],
    items: catalog.items.map(i => ({id:i.id, workUnits:i.workUnits, yarnCost:economy.items?.[i.id]?.yarnCost ?? 0, art:{stages:i.art.stages}})),
    meadows: catalog.meadows.map(m => ({id:m.id, slots:m.slots.map(s => ({id:s.id,itemId:s.itemId})), passive:economy.meadows?.[m.id]?.passive ?? [],
      interactions:m.interactions.filter(t => ['pet','sniff'].includes(t.action) && economy.meadows?.[m.id]?.interactions?.[t.id])
        .map(t => ({id:t.id,action:t.action,requires:t.requires,...pickInteraction(economy.meadows[m.id].interactions[t.id])}))}))
  };
}
function pickInteraction(value) { return {trigger:value.trigger,amount:value.amount,cooldownMs:value.cooldownMs}; }
export async function loadRuntimeCatalog(indexURL, {fetch = globalThis.fetch, economy = {}} = {}) {
  const url = new URL(indexURL, globalThis.location?.href);
  const response = await fetch(url.href);
  if (!response.ok) throw new Error(`Content index unavailable (${response.status})`);
  const catalog = await response.json();
  if (!Array.isArray(catalog.assets)) throw new Error('Content index missing verified asset inventory');
  const config = createEngineConfig(catalog,economy);
  const base = new URL('../../',url);
  // The generated index lives at app/content/catalog.json, relative to product/.
  return {catalog,config,assetUrl:(pkg,relative) => resolveAssetUrl(pkg,relative,base,catalog.assets)};
}
