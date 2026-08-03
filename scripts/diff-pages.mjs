#!/usr/bin/env node
/**
 * diff-pages.mjs — unified diff of the local website/ vs the live GitHub Pages
 * site, fetched through the loopback proxy (scripts/serve-pages.mjs).
 *
 * Lets a website change be reviewed as a text diff before opening a browser:
 * edit a file in website/, run this, and every local-vs-production difference
 * shows up with diff(1) labels.
 *
 * The CI deploy stamps an invisible <!-- deploy-sha:<commit> --> comment into
 * the served index.html; both sides are normalized before comparing so a
 * deployed build still shows a clean "No differences" against the source.
 *
 * Usage: node scripts/diff-pages.mjs [path] [port]
 *   path  URL path to compare          (default: /)
 *   port  proxy port                   (default: 8131)
 *
 * NOTE: the port does not fall back to $PORT — tooling often exports PORT
 * (e.g. a harness server), which would silently compare against the wrong
 * server. Always target the loopback proxy explicitly.
 *
 * Examples:
 *   node scripts/diff-pages.mjs            # diff the whole page
 *   node scripts/diff-pages.mjs /style.css # diff the stylesheet
 *   node scripts/diff-pages.mjs / 8141     # custom proxy port
 *
 * Exit codes (diff(1) convention):
 *   0  identical
 *   1  differences found
 *   2  error (proxy down, non-200, diff(1) unavailable)
 */

import { execFileSync } from 'node:child_process';
import { writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const [pathArg = '/', portArg = '8131'] = process.argv.slice(2);
const port = Number(portArg);
const path = pathArg.startsWith('/') ? pathArg : `/${pathArg}`;

async function fetchSide(side) {
  const url = `http://127.0.0.1:${port}/${side}${path}`;
  let res;
  try {
    res = await fetch(url);
  } catch {
    console.error(
      `diff-pages: could not reach ${url}\n` +
        `Is the preview proxy running? Start it with: node scripts/serve-pages.mjs ${port}`,
    );
    process.exit(2);
  }
  if (!res.ok) {
    console.error(`diff-pages: ${side}${path} -> HTTP ${res.status}`);
    process.exit(2);
  }
  return res.text();
}

// Strip the CI-stamped deploy marker (and its blank-line halo) so a shipped
// build still compares clean against the source index.html. trimEnd() also
// absorbs a trailing-newline difference left at end of file.
const DEPLOY_SHA_RE = /\s*<!--\s*deploy-sha:[\da-f]+\s*-->\s*/gi;
const normalize = (html) => html.replace(DEPLOY_SHA_RE, '').trimEnd();

const [local, live] = await Promise.all(
  ['local', 'live'].map(async (side) => normalize(await fetchSide(side))),
);

if (local === live) {
  console.log(`No differences between /local${path} and /live${path}.`);
  process.exit(0);
}

const left = join(tmpdir(), `diff-pages-local-${process.pid}.html`);
const right = join(tmpdir(), `diff-pages-live-${process.pid}.html`);
writeFileSync(left, local);
writeFileSync(right, live);

// process.exit() inside the catch would skip the finally (a Node gotcha that
// leaks the temp files), so collect the status and exit after cleanup.
let status = 0;
try {
  execFileSync(
    'diff',
    ['-u', '-L', `/local${path}`, '-L', `/live${path}`, left, right],
    { stdio: 'inherit' },
  );
} catch (err) {
  if (err.status === 1) {
    status = 1; // differences printed by diff(1)
  } else {
    console.error(`diff-pages: could not run diff(1): ${err.message}`);
    status = 2;
  }
} finally {
  rmSync(left, { force: true });
  rmSync(right, { force: true });
}
process.exit(status);
