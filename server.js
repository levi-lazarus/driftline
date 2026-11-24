/**
 * DRIFTLINE — tiny zero-dependency static dev server.
 * Usage: npm run start   (or: PORT=4000 npm run start)
 *
 * ES modules don't run from file://, so the site needs to be served over http.
 * This uses only Node's built-in modules — no `npm install` required.
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)));
const START_PORT = Number(process.env.PORT) || 3000;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.md': 'text/markdown; charset=utf-8',
};

async function handler(req, res) {
  try {
    let pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (pathname.endsWith('/')) pathname += 'index.html';

    // Block path traversal: the resolved file must stay inside the project.
    const filePath = normalize(join(ROOT, pathname));
    if (filePath !== ROOT && !filePath.startsWith(ROOT + sep)) {
      res.writeHead(403).end('Forbidden');
      return;
    }

    const info = await stat(filePath).catch(() => null);
    if (!info || !info.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('404 — Not found');
      log(req, 404);
      return;
    }

    const body = await readFile(filePath);
    res.writeHead(200, {
      'Content-Type': MIME[extname(filePath).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-cache', // always see your latest edits
    });
    res.end(body);
    log(req, 200);
  } catch (err) {
    res.writeHead(500).end('Server error');
    console.error(err);
  }
}

function log(req, status) {
  if (status !== 200) console.log(`  ${status}  ${req.method} ${req.url}`);
}

// Try the requested port; if it's busy, move to the next one.
function listen(port, attemptsLeft = 10) {
  const server = createServer(handler);
  server.once('error', (err) => {
    if (err.code === 'EADDRINUSE' && attemptsLeft > 0) listen(port + 1, attemptsLeft - 1);
    else throw err;
  });
  server.listen(port, () => {
    console.log(`\n  DRIFTLINE is running → http://localhost:${port}\n  Press Ctrl+C to stop.\n`);
  });
}

listen(START_PORT);
