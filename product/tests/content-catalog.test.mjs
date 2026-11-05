import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { loadReadyContent } from '../app/content-catalog.mjs';

const itemSample = JSON.parse(readFileSync(new URL('../examples/item.sample.json', import.meta.url), 'utf8'));
const meadowSample = JSON.parse(readFileSync(new URL('../examples/meadow.sample.json', import.meta.url), 'utf8'));

function fixture(fn) {
  const root = mkdtempSync(path.join(tmpdir(), 'knit-discovery-'));
  mkdirSync(path.join(root, 'content', 'items'), { recursive: true });
  mkdirSync(path.join(root, 'content', 'meadows'), { recursive: true });
  try { return fn(root); } finally { rmSync(root, { recursive: true, force: true }); }
}
function syntheticPng() {
  const bytes = Buffer.alloc(2048);
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(bytes);
  return bytes;
}
function addAsset(dir, rel) {
  const dest = path.join(dir, rel);
  mkdirSync(path.dirname(dest), { recursive: true });
  writeFileSync(dest, syntheticPng());
}
function addItem(root, id, status = 'ready') {
  const dir = path.join(root, 'content', 'items', id);
  mkdirSync(dir, { recursive: true });
  const manifest = {
    ...structuredClone(itemSample), id, status,
    art: {
      ...structuredClone(itemSample.art),
      stages: itemSample.art.stages.map((s, i) => ({ ...s, image: `art/stage-0${i}.png` })),
      finishedSprite: 'art/finished.png'
    }
  };
  if (status === 'ready') {
    for (const stage of manifest.art.stages) addAsset(dir, stage.image);
    addAsset(dir, manifest.art.finishedSprite);
  }
  writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(manifest));
}
function addMeadow(root) {
  const id = 'rabbit-meadow', dir = path.join(root, 'content', 'meadows', id);
  mkdirSync(dir, { recursive: true });
  const manifest = {
    ...structuredClone(meadowSample), id, status: 'ready',
    art: {
      ...structuredClone(meadowSample.art),
      backgroundDay: 'art/meadow-day.png', backgroundEvening: 'art/meadow-evening.png'
    },
    plannedNeighbors: [],
    slots: meadowSample.slots.map((slot, i) => ({
      ...slot, itemId: i % 2 === 0 ? 'bunny' : 'crochet-flower'
    }))
  };
  addAsset(dir, manifest.art.backgroundDay);
  addAsset(dir, manifest.art.backgroundEvening);
  writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(manifest));
}

test('two independent ready packages are discovered without editing a registry', () => fixture(root => {
  addItem(root, 'bunny');
  addItem(root, 'crochet-flower');
  let content = loadReadyContent(root);
  assert.deepEqual(content.items.map(i => i.id), ['bunny', 'crochet-flower']);
  assert.equal(content.items[0].basePath, 'content/items/bunny/');
  assert.deepEqual(content.meadows, []);

  // The third contributor installs their folder only, no central file changes.
  addItem(root, 'hedgehog');
  content = loadReadyContent(root);
  assert.deepEqual(content.items.map(i => i.id), ['bunny', 'crochet-flower', 'hedgehog']);
}));

test('a ready meadow references discovered ready item packages', () => fixture(root => {
  addItem(root, 'bunny');
  addItem(root, 'crochet-flower');
  addMeadow(root);
  const content = loadReadyContent(root);
  assert.equal(content.items.length, 2);
  assert.deepEqual(content.meadows.map(m => m.id), ['rabbit-meadow']);
  assert.equal(content.meadows[0].slots.length, 5);
  assert.equal(content.meadows[0].basePath, 'content/meadows/rabbit-meadow/');
}));

test('draft content is deliberately not published to the app', () => fixture(root => {
  addItem(root, 'bunny', 'draft');
  addItem(root, 'crochet-flower', 'ready');
  const content = loadReadyContent(root);
  assert.deepEqual(content.items.map(i => i.id), ['crochet-flower']);
}));

test('ready packages without real assets are rejected', () => fixture(root => {
  addItem(root, 'bunny', 'draft');
  const file = path.join(root, 'content', 'items', 'bunny', 'manifest.json');
  const json = JSON.parse(readFileSync(file, 'utf8'));
  json.status = 'ready';
  writeFileSync(file, JSON.stringify(json));
  assert.throws(() => loadReadyContent(root), /Missing asset/);
}));
