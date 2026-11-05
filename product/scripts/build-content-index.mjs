import { writeFileSync, mkdirSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadReadyContent } from '../app/content-catalog.mjs';
export function buildContentIndex(root) {
  const catalog = loadReadyContent(root);
  const assets = [];
  for (const pkg of [...catalog.items,...catalog.meadows]) {
    const paths = pkg.kind === 'item' ? [...pkg.art.stages.map(s=>s.image),pkg.art.finishedSprite] : [pkg.art.backgroundDay,pkg.art.backgroundEvening];
    const packageRoot = realpathSync(path.join(root,pkg.basePath));
    for (const asset of paths) {
      const resolved = realpathSync(path.join(packageRoot,asset));
      if (!resolved.startsWith(packageRoot + path.sep)) throw new Error(`Asset escapes package: ${asset}`);
      assets.push(pkg.basePath+asset);
    }
  }
  return {...catalog,assets:[...new Set(assets)].sort()};
}
const self = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === self) {
  const root = path.resolve(path.dirname(self),'..');
  const output = path.join(root,'app/content/catalog.json');
  const catalog = buildContentIndex(root);
  mkdirSync(path.dirname(output),{recursive:true});
  writeFileSync(output,JSON.stringify(catalog,null,2)+'\n');
  console.log(`Built ready catalog: ${catalog.items.length} items, ${catalog.meadows.length} meadows`);
}
