/** Prevent content-only agent branches from editing engine/UI/shared files.
 * This protects the codebase; review still enforces artistic quality.
 */
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export function checkAllowedChanges(branch, paths) {
  const match = /^(item|meadow)\/([a-z][a-z0-9]*(?:-[a-z0-9]+)*)$/.exec(branch ?? '');
  if (!match) return { checked: false, violations: [] };
  const prefix = match[1] === 'item' ? `product/content/items/${match[2]}/` : `product/content/meadows/${match[2]}/`;
  return { checked: true, prefix, violations: paths.filter(p => !p.startsWith(prefix)) };
}

const self = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(self)) {
  const branch = process.env.AGENT_BRANCH ?? '';
  const base = process.env.TARGET_BRANCH ?? 'main';
  if (!/^[a-z0-9._/-]+$/i.test(base)) throw new Error('Invalid base branch');
  const files = execFileSync('git', ['diff', '--name-only', `origin/${base}...HEAD`], { encoding: 'utf8' }).trim().split('\n').filter(Boolean);
  const result = checkAllowedChanges(branch, files);
  if (!result.checked) console.log(`No content-only scope restriction for branch '${branch}'`);
  else {
    console.log(`Allowed file prefix: ${result.prefix}`);
    for (const bad of result.violations) console.error(`Out-of-scope change: ${bad}`);
    if (result.violations.length) process.exitCode = 1;
  }
}
