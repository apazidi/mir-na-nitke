/** Local review server. Loopback only; never a public deployment. */
import { createServer } from 'node:http';
import { readFile, realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = await realpath(fileURLToPath(new URL('../../', import.meta.url)));
const mime = { '.html': 'text/html', '.mjs': 'text/javascript', '.js': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml' };
export function startServer(port = Number(process.env.PORT ?? 4173)) {
 const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://localhost');
    const relative = decodeURIComponent(url.pathname).replace(/^\/+/, '');
    if (relative.split(/[\\/]/).some(part => part.startsWith('.'))) throw new Error('Hidden path');
    const art = /^product\/art-experiments\/rabbit-v1\/exports\/([a-z0-9-]+\.webp)$/.exec(relative);
    if (art && process.env.ART_REVIEW_ROOT) {
      const artRoot = await realpath(process.env.ART_REVIEW_ROOT);
      const asset = await realpath(path.join(artRoot, art[1]));
      if (path.dirname(asset) !== artRoot) throw new Error('Outside art review');
      response.writeHead(200, { 'Content-Type': 'image/webp', 'Cache-Control': 'no-store' });
      response.end(await readFile(asset));
      return;
    }
    let target = path.resolve(root, relative || 'product/ui/');
    if ((await stat(target)).isDirectory()) target = path.join(target, 'index.html');
    target = await realpath(target);
    const within = path.relative(root, target);
    if (within.startsWith('..') || path.isAbsolute(within)) throw new Error('Outside preview');
    const type = mime[path.extname(target)];
    if (!type) throw new Error('Unsupported file');
    response.writeHead(200, { 'Content-Type': `${type}${type.startsWith('text/') ? '; charset=utf-8' : ''}`, 'Cache-Control': 'no-store' });
    response.end(await readFile(target));
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Preview file not found');
  }
 });
 return new Promise((resolve, reject) => {
   server.once('error', reject);
   server.listen(port, '127.0.0.1', () => resolve(server));
 });
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
 const server = await startServer();
 console.log(`Local preview: http://127.0.0.1:${server.address().port}/product/ui/`);
}
