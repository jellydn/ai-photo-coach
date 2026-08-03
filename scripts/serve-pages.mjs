#!/usr/bin/env node
/**
 * serve-pages.mjs — loopback server for the live GitHub Pages site and the
 * local website/ directory.
 *
 * The desktop preview tab only accepts loopback URLs, so this tiny
 * dependency-free server exposes both views on a single port, letting a
 * website change be diffed against production in one preview session:
 *
 *   /          -> live production (https://jellydn.github.io/ai-photo-coach/)
 *   /live/...  -> live production (explicit path)
 *   /local/... -> the local website/ directory on disk
 *
 * Path mapping keeps relative and absolute links working:
 *   /live/           -> /ai-photo-coach/
 *   /live/style.css  -> /ai-photo-coach/style.css
 *   /local/          -> website/index.html
 *   /local/style.css -> website/style.css
 *
 * Usage: node scripts/serve-pages.mjs [port]   (default: 8131)
 */

import http from 'node:http';
import https from 'node:https';
import { readFileSync } from 'node:fs';
import { dirname, extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const PORT = Number(process.argv[2] ?? process.env.PORT ?? 8131);
const ORIGIN = 'https://jellydn.github.io';
const BASE_PATH = '/ai-photo-coach';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const LOCAL_DIR = join(ROOT, 'website');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.txt': 'text/plain; charset=utf-8',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

// Hop-by-hop headers that must not be forwarded; everything else is passed
// through so redirects, caching, and content negotiation keep working.
const HOP_BY_HOP = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
]);

// Headers every response shares — CORS for the preview tab, and no caching
// so local edits show up immediately.
const SHARED_HEADERS = {
  'access-control-allow-origin': '*',
  'cache-control': 'no-cache',
};

// Error responses are plain text; kept as a const so the three sites stay in sync.
const TEXT_PLAIN = { 'content-type': 'text/plain; charset=utf-8' };

/** Map an incoming path onto the live site (handles /live/ and bare /). */
function livePath(pathname) {
  if (pathname === '/live' || pathname === '/live/') {
    return `${BASE_PATH}/`;
  }
  if (pathname.startsWith('/live/')) {
    return `${BASE_PATH}${pathname.slice('/live'.length)}`;
  }
  if (pathname === '/') {
    return `${BASE_PATH}/`;
  }
  if (pathname.startsWith(BASE_PATH)) {
    return pathname; // already absolute on the live site
  }
  return `${BASE_PATH}${pathname}`;
}

/** Serve a file from the local website/ directory. */
function serveLocal(res, pathname) {
  const rel =
    pathname === '/local' || pathname === '/local/'
      ? '/index.html'
      : pathname.slice('/local'.length);
  // The WHATWG URL parser already resolves dot segments (.. and %2e%2e)
  // before routing, so this is defense-in-depth: keep everything inside
  // website/ regardless of how routing evolves.
  const target = resolve(LOCAL_DIR, `.${rel}`);
  if (target !== LOCAL_DIR && !target.startsWith(LOCAL_DIR + sep)) {
    res.writeHead(403, TEXT_PLAIN);
    res.end('403 Forbidden');
    return;
  }
  let body;
  try {
    body = readFileSync(target);
  } catch {
    res.writeHead(404, TEXT_PLAIN);
    res.end(`404 Not Found: ${pathname}`);
    return;
  }
  const type = MIME[extname(target).toLowerCase()] ?? 'application/octet-stream';
  res.writeHead(200, { 'content-type': type, ...SHARED_HEADERS });
  res.end(body);
}

/** Forward a request to the live GitHub Pages site. */
function serveLive(req, res, pathname, search) {
  const url = `${ORIGIN}${livePath(pathname)}${search}`;
  const upstream = https.get(url, (up) => {
    const headers = { ...SHARED_HEADERS };
    for (const [name, value] of Object.entries(up.headers)) {
      if (!HOP_BY_HOP.has(name.toLowerCase())) {
        headers[name] = value;
      }
    }
    res.writeHead(up.statusCode ?? 502, headers);
    up.pipe(res);
  });
  upstream.on('error', (err) => {
    res.writeHead(502, TEXT_PLAIN);
    res.end(`Proxy error: ${err.message}`);
  });
  req.pipe(upstream);
}

const server = http.createServer((req, res) => {
  const { pathname, search } = new URL(req.url, `http://127.0.0.1:${PORT}`);
  if (pathname === '/local' || pathname.startsWith('/local/')) {
    serveLocal(res, pathname);
    return;
  }
  serveLive(req, res, pathname, search);
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(
    `Serving local website/ at http://127.0.0.1:${PORT}/local/ and live ` +
      `GitHub Pages (${ORIGIN}${BASE_PATH}/) at http://127.0.0.1:${PORT}/live/ ` +
      `(and /)`,
  );
});
