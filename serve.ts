import { createServer } from 'node:http';
import { readFile, realpath, stat } from 'node:fs/promises';
import { resolve, relative, extname, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = await realpath(fileURLToPath(new URL('./game/', import.meta.url)));
const args = process.argv.slice(2);
if (args.length && (args.length !== 2 || args[0] !== '--port')) throw new Error('Usage: node serve.ts [--port 8080]');
const port = Number(args[1] ?? 8080);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Port must be an integer from 1 to 65535');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml' };

const server = createServer(async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD' }).end();
    return;
  }
  try {
    const pathname = decodeURIComponent(new URL(req.url || '/', 'http://localhost').pathname);
    if (pathname.includes('\0') || pathname.includes('\\')) throw new Error('Invalid path');
    const requested = resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    const file = await realpath(requested);
    const distance = relative(root, file);
    if (distance.startsWith('..') || isAbsolute(distance)) {
      res.writeHead(403).end('Outside game root');
      return;
    }
    if (!(await stat(file)).isFile()) throw new Error('Not a file');
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream', 'Content-Length': body.length });
    res.end(req.method === 'HEAD' ? undefined : body);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Not found');
  }
});
server.on('error', error => { console.error(error.message); process.exitCode = 1; });
server.listen(port, '127.0.0.1', () => console.log(`AETHER TIDE · http://localhost:${port}`));
