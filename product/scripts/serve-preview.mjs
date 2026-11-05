/** Local review server. Loopback only; never a public deployment. */
import { createServer } from 'node:http';
import { readFile, realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = await realpath(fileURLToPath(new URL('../../', import.meta.url)));
const port = Number(process.env.PORT ?? 4173);
const mime = { '.html': 'text/html', '.mjs': 'text/javascript', '.js': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml' };
createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://localhost');
    const relative = decodeURIComponent(url.pathname).replace(/^\/+/, '');
    if (relative.split(/[\\/]/).some(part => part.startsWith('.'))) throw new Error('Hidden path');
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
}).listen(port, '127.0.0.1', () => console.log(`Local preview: http://127.0.0.1:${port}/product/ui/`));
