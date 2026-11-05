/**
 * Read-only discovery of release-ready content packages.
 * A new item or meadow is installed by adding its own directory.
 * There is deliberately no handwritten central registry.
 */
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { validateRepository } from '../scripts/validate-content.mjs';

function scan(root, type) {
  const folder = join(root, 'content', type);
  if (!existsSync(folder)) return [];
  return readdirSync(folder, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => ({
      id: entry.name,
      manifest: JSON.parse(readFileSync(join(folder, entry.name, 'manifest.json'), 'utf8'))
    }))
    .sort((a, b) => a.id.localeCompare(b.id, 'en'));
}

/**
 * @param {string} root absolute or relative filesystem path to product/
 * @returns {{schemaVersion:number,items:Array,meadows:Array}}
 * @throws when the content repository is structurally invalid
 */
export function loadReadyContent(root) {
  const report = validateRepository(root);
  if (report.errors.length) {
    throw new Error('Invalid content packages:\n' + report.errors.join('\n'));
  }
  const items = scan(root, 'items')
    .filter(item => item.manifest.status === 'ready')
    .map(({ id, manifest }) => ({
      ...manifest,
      basePath: `content/items/${id}/`
    }));
  const meadows = scan(root, 'meadows')
    .filter(meadow => meadow.manifest.status === 'ready')
    .map(({ id, manifest }) => ({
      ...manifest,
      basePath: `content/meadows/${id}/`
    }));
  return { schemaVersion: 1, items, meadows };
}
