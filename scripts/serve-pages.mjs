#!/usr/bin/env node
/**
 * serve-pages.mjs — loopback proxy for the live GitHub Pages site.
 *
 * The desktop preview tab only accepts loopback URLs, so this tiny
 * dependency-free proxy serves the deployed production site
 * (https://jellydn.github.io/ai-photo-coach/) at http://127.0.0.1:<port>.
 * Requests are forwarded verbatim and responses are streamed back, letting
 * the preview be checked against production instead of a local build.
 *
 * Path mapping keeps both relative and absolute links working:
 *   /                      -> /ai-photo-coach/
 *   /style.css             -> /ai-photo-coach/style.css
 *   /ai-photo-coach/foo    -> /ai-photo-coach/foo   (already absolute)
 *
 * Usage: node scripts/serve-pages.mjs [port]   (default: 8131)
 */

import http from 'node:http';
import https from 'node:https';

const PORT = Number(process.argv[2] ?? process.env.PORT ?? 8131);
const ORIGIN = 'https://jellydn.github.io';
const BASE_PATH = '/ai-photo-coach';

function upstreamUrl(requestUrl) {
  const { pathname, search } = new URL(requestUrl, `http://127.0.0.1:${PORT}`);
  const path =
    pathname === '/'
      ? `${BASE_PATH}/`
      : pathname.startsWith(BASE_PATH)
        ? pathname
        : `${BASE_PATH}${pathname}`;
  return `${ORIGIN}${path}${search}`;
}

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

const server = http.createServer((req, res) => {
  const url = upstreamUrl(req.url);
  const upstream = https.get(url, (up) => {
    const headers = {
      'access-control-allow-origin': '*',
      'cache-control': 'no-cache',
    };
    for (const [name, value] of Object.entries(up.headers)) {
      if (!HOP_BY_HOP.has(name.toLowerCase())) {
        headers[name] = value;
      }
    }
    res.writeHead(up.statusCode ?? 502, headers);
    up.pipe(res);
  });
  upstream.on('error', (err) => {
    res.writeHead(502, { 'content-type': 'text/plain; charset=utf-8' });
    res.end(`Proxy error: ${err.message}`);
  });
  req.pipe(upstream);
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(
    `Serving live GitHub Pages (${ORIGIN}${BASE_PATH}/) at http://127.0.0.1:${PORT}`,
  );
});
