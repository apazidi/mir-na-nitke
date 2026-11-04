/** Deterministic content validation for the new Мир на ниточке product.
 * Node.js built-ins only. No asset is published just because it validates.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const STYLE_ID = 'crochet-diorama-v1';
export const SIZE = [1024, 1820];
export const ACTIONS = new Set(['greet', 'pet', 'sniff', 'glow', 'sway', 'land', 'visit', 'idle']);
const ID_RE = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const isId = value => typeof value === 'string' && ID_RE.test(value);
const isNonempty = value => typeof value === 'string' && value.trim().length > 0;

function makeReport() {
  const result = { errors: [], warnings: [] };
  result.error = message => result.errors.push(message);
  result.warning = message => result.warnings.push(message);
  return result;
}
function checkIdentity(manifest, dirId, kind, result) {
  if (!isObject(manifest)) { result.error('Manifest must be a JSON object'); return false; }
  if (manifest.schemaVersion !== 1) result.error('Unsupported schemaVersion (expected 1)');
  if (manifest.kind !== kind) result.error(`kind must equal '${kind}'`);
  if (!isId(manifest.id)) result.error('id must be lowercase kebab-case');
  if (dirId && manifest.id !== dirId) result.error(`Directory '${dirId}' must match manifest id '${manifest.id}'`);
  if (!['draft', 'ready'].includes(manifest.status)) result.error('status must be draft or ready');
  if (!isNonempty(manifest.displayName)) result.error('displayName is required');
  if (!isObject(manifest.art)) result.error('art object is required');
  else {
    if (manifest.art.styleId !== STYLE_ID) result.error(`art.styleId must be ${STYLE_ID}`);
    if (!Array.isArray(manifest.art.logicalSize) || manifest.art.logicalSize.length !== 2 ||
        manifest.art.logicalSize.some((n, i) => n !== SIZE[i])) {
      result.error(`art.logicalSize must equal [${SIZE.join(', ')}]`);
    }
  }
  return true;
}
function safeAssetPath(relative) {
  if (typeof relative !== 'string' || relative.length === 0 || relative.includes('\\') || relative.includes('?') || relative.includes('#')) return false;
  if (path.posix.isAbsolute(relative) || relative.split('/').some(segment => !segment || segment === '.' || segment === '..')) return false;
  return relative.startsWith('art/') && /\.(webp|png)$/i.test(relative);
}
function assertAsset(packageDir, relative, result, ready) {
  if (!safeAssetPath(relative)) { result.error(`Unsafe or unsupported asset path: ${JSON.stringify(relative)}`); return; }
  const fullPath = path.resolve(packageDir, relative);
  if (!fullPath.startsWith(path.resolve(packageDir) + path.sep)) { result.error(`Asset escapes package: ${relative}`); return; }
  if (!existsSync(fullPath)) {
    const msg = `Missing asset: ${relative}`;
    if (ready) result.error(msg); else result.warning(msg + ' (allowed in draft)');
    return;
  }
  try {
    const bytes = readFileSync(fullPath);
    const png = bytes.length >= 24 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    const webp = bytes.length >= 12 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP';
    if (!(png || webp)) result.error(`Asset is not a valid PNG/WebP header: ${relative}`);
    if (bytes.length < 1024) result.error(`Asset suspiciously small (<1 KB): ${relative}`);
  } catch (e) { result.error(`Unreadable asset ${relative}: ${e.message}`); }
}

export function validateItem(item, packageDir, dirId = item?.id) {
  const result = makeReport();
  if (!checkIdentity(item, dirId, 'item', result)) return result;
  if (!Array.isArray(item.tags) || !item.tags.length || !item.tags.every(isId) || new Set(item.tags).size !== item.tags.length) {
    result.error('tags must be a nonempty list of distinct kebab-case strings');
  }
  if (!Number.isSafeInteger(item.workUnits) || item.workUnits <= 0 || item.workUnits > 1e8) result.error('workUnits must be a positive safe integer <= 1e8');
  const stages = item.art?.stages;
  if (!Array.isArray(stages) || stages.length < 4 || stages.length > 8) result.error('art.stages must contain 4–8 stages');
  else {
    const seen = new Set();
    let last = -1;
    for (let i = 0; i < stages.length; i++) {
      const s = stages[i];
      if (!isObject(s)) { result.error(`Stage ${i} must be an object`); continue; }
      if (!Number.isFinite(s.at) || s.at < 0 || s.at > 1 || s.at <= last) result.error(`Stage ${i} 'at' must be strictly increasing within 0..1`);
      last = s.at;
      if (!isNonempty(s.label)) result.error(`Stage ${i} label missing`);
      if (seen.has(s.image)) result.error(`Duplicate stage image: ${s.image}`);
      seen.add(s.image);
      assertAsset(packageDir, s.image, result, item.status === 'ready');
    }
    if (stages[0]?.at !== 0 || stages.at(-1)?.at !== 1) result.error('First stage must start at 0 and last stage must start at 1');
  }
  assertAsset(packageDir, item.art?.finishedSprite, result, item.status === 'ready');
  return result;
}

export function validateMeadow(meadow, packageDir, dirId = meadow?.id, items = new Map(), meadows = new Map()) {
  const result = makeReport();
  if (!checkIdentity(meadow, dirId, 'meadow', result)) return result;
  for (const field of ['backgroundDay', 'backgroundEvening']) assertAsset(packageDir, meadow.art?.[field], result, meadow.status === 'ready');
  const slots = meadow.slots;
  if (!Array.isArray(slots) || slots.length !== 5) result.error('Every meadow must have exactly 5 slots');
  const ids = new Set();
  if (Array.isArray(slots)) slots.forEach((s, i) => {
    if (!isObject(s) || !isId(s.id)) { result.error(`slots[${i}].id invalid`); return; }
    if (ids.has(s.id)) result.error(`Duplicate slot id: ${s.id}`);
    ids.add(s.id);
    if (!isId(s.itemId)) result.error(`slots[${i}].itemId invalid`);
    for (const xy of ['x', 'y']) if (!Number.isFinite(s[xy]) || s[xy] < 0 || s[xy] > 1) result.error(`slots[${i}].${xy} must be 0..1`);
    if (!Number.isFinite(s.scale) || s.scale <= 0 || s.scale > 4) result.error(`slots[${i}].scale must be >0 and <=4`);
    if (!Number.isSafeInteger(s.z)) result.error(`slots[${i}].z must be an integer`);
    const item = items.get(s.itemId);
    if (!item || item.status !== 'ready') {
      const msg = `slots[${i}] requires ready item '${s.itemId}'`;
      if (meadow.status === 'ready') result.error(msg); else result.warning(msg + ' (allowed in draft)');
    }
  });
  if (!Array.isArray(meadow.interactions)) result.error('interactions must be an array');
  else {
    const seen = new Set();
    for (let i = 0; i < meadow.interactions.length; i++) {
      const t = meadow.interactions[i];
      if (!isObject(t) || !isId(t.id)) { result.error(`interactions[${i}].id invalid`); continue; }
      if (seen.has(t.id)) result.error(`Duplicate interaction id: ${t.id}`);
      seen.add(t.id);
      if (!ACTIONS.has(t.action)) result.error(`Unsupported interaction action: ${t.action}`);
      if (!Array.isArray(t.requires) || !t.requires.length || !t.requires.every(id => ids.has(id))) result.error(`Invalid requires for interaction '${t.id}'`);
      if (!ids.has(t.actorSlot) || !t.requires?.includes(t.actorSlot)) result.error(`actorSlot must be a required slot in interaction '${t.id}'`);
    }
  }
  for (const linkProp of ['neighbors', 'plannedNeighbors']) {
    if (!Array.isArray(meadow[linkProp]) || !meadow[linkProp].every(isId) || new Set(meadow[linkProp]).size !== meadow[linkProp].length) result.error(`${linkProp} must be an array of distinct meadow IDs`);
  }
  const overlaps = (meadow.neighbors ?? []).filter(x => (meadow.plannedNeighbors ?? []).includes(x));
  if (overlaps.length) result.error('The same neighbor cannot be both active and planned');
  for (const id of meadow.neighbors ?? []) {
    if (id === meadow.id) result.error('A meadow cannot link to itself');
    const neighbor = meadows.get(id);
    if (!neighbor || neighbor.status !== 'ready') {
      const msg = `Active neighbor '${id}' must exist as ready meadow`;
      if (meadow.status === 'ready') result.error(msg); else result.warning(msg + ' (allowed in draft)');
    }
  }
  return result;
}

function loadPackages(root, folderName) {
  const folder = path.join(root, 'content', folderName);
  const packages = new Map();
  const diagnostics = makeReport();
  if (!existsSync(folder)) { diagnostics.error(`Missing content folder: ${folder}`); return { packages, diagnostics }; }
  for (const entry of readdirSync(folder, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const pkg = path.join(folder, entry.name), manifestFile = path.join(pkg, 'manifest.json');
    if (!existsSync(manifestFile)) { diagnostics.error(`Missing manifest.json in ${folderName}/${entry.name}`); continue; }
    try {
      const manifest = JSON.parse(readFileSync(manifestFile, 'utf8'));
      if (packages.has(entry.name)) diagnostics.error(`Duplicate package: ${entry.name}`);
      packages.set(entry.name, { manifest, dir: pkg });
    } catch (e) { diagnostics.error(`Invalid JSON in ${folderName}/${entry.name}: ${e.message}`); }
  }
  return { packages, diagnostics };
}

export function validateRepository(root) {
  const all = makeReport();
  const its = loadPackages(root, 'items'), mes = loadPackages(root, 'meadows');
  all.errors.push(...its.diagnostics.errors, ...mes.diagnostics.errors);
  for (const [id, { manifest, dir }] of its.packages) {
    const r = validateItem(manifest, dir, id);
    all.errors.push(...r.errors.map(e => `items/${id}: ${e}`));
    all.warnings.push(...r.warnings.map(w => `items/${id}: ${w}`));
  }
  const itemMap = new Map([...its.packages].map(([id, d]) => [id, d.manifest]));
  const meadowMap = new Map([...mes.packages].map(([id, d]) => [id, d.manifest]));
  for (const [id, { manifest, dir }] of mes.packages) {
    const r = validateMeadow(manifest, dir, id, itemMap, meadowMap);
    all.errors.push(...r.errors.map(e => `meadows/${id}: ${e}`));
    all.warnings.push(...r.warnings.map(w => `meadows/${id}: ${w}`));
  }
  return { errors: all.errors, warnings: all.warnings, items: its.packages.size, meadows: mes.packages.size };
}

const self = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(self)) {
  const root = path.resolve(path.dirname(self), '..');
  const r = validateRepository(root);
  r.warnings.forEach(w => console.warn('WARN  ' + w));
  r.errors.forEach(e => console.error('ERROR ' + e));
  console.log(`Validated ${r.items} item(s), ${r.meadows} meadow(s): ${r.errors.length} error(s), ${r.warnings.length} warning(s)`);
  if (r.errors.length) process.exitCode = 1;
}
