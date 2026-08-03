#!/usr/bin/env node
/**
 * dead-export-check.mjs — whole-codebase deletion-test audit.
 *
 * One command that replaces the one-off /tmp/deletion-audit.mjs,
 * /tmp/verify-candidates.mjs and /tmp/whole-file-check.mjs passes:
 *
 *   1. Enumerates every exported symbol from src/.
 *   2. Counts cross-file references (imports + JSX + bare usages) across
 *      src/, __tests__/, scripts/, and the root entry files (App.tsx,
 *      index.js), so screens mounted from App.tsx are not misreported dead.
 *   3. Classifies zero-caller symbols into:
 *        ZERO-REF        — never referenced anywhere, not even in the defining
 *                          file beyond its own declaration → dead.
 *        RE-EXPORT-ONLY  — the only other occurrences are barrel re-exports
 *                          (`export { X } from "./..."`) with no real consumer
 *                          → dead. (Rename chains such as
 *                          `export { X as Y }` are not followed — out of scope
 *                          for a regex tool.)
 *        CONTRACT        — referenced by an exported signature/type inside its
 *                          own defining file → part of the module contract →
 *                          keep (e.g. hook option/result types).
 *        LOW-REFERENCE   — 1-2 real consumers → verify by hand.
 *   4. Finds whole src/ modules that no other file imports (dead barrels),
 *      resolving directory imports ("../faceDetection") to their index.ts.
 *   5. Flags Category C "test-only" exports — symbols whose only cross-file
 *      consumers live under __tests__/ — for the dead-export-pr guard, which
 *      fails PRs that grow the test-only surface between audits (see
 *      .planning/category-c-verdicts.md).
 *
 * CI: exits 1 when a dead export or dead barrel is found that is NOT already
 * in the baseline (.planning/dead-export-baseline.json). The baseline
 * grandfathers the currently-known dead surface; regenerate it with
 * --update-baseline after a deliberate clean-up. This means a PR that adds a
 * brand-new dead export or dead barrel fails CI immediately, while the known
 * backlog stays green until it is deleted. Category C test-only exports are
 * reported but do not affect this exit code — the dead-export-pr guard fails
 * PRs that introduce new ones.
 *
 * Usage:
 *   node scripts/dead-export-check.mjs                # report + CI exit code
 *   node scripts/dead-export-check.mjs --no-baseline  # flag everything
 *   node scripts/dead-export-check.mjs --update-baseline  # rewrite baseline
 *   node scripts/dead-export-check.mjs --json         # machine-readable
 *   node scripts/dead-export-check.mjs --exit-0       # JSON even when dead (for diffing)
 *   node scripts/dead-export-check.mjs --root <path>  # audit a different checkout
 *   node scripts/dead-export-check.mjs --diff <head.json> <base.json>  # PR guard comparison
 *   yarn dead:check
 *
 * Limitations (regex-based, dependency-free): a comment or string literal that
 * mentions a symbol counts as a reference, so the check errs toward not
 * flagging — good for CI, where false alarms are worse than missed catches.
 */

import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// --root <path> audits a different checkout instead of the repo this script
// lives in. Used by the dead-export-pr CI guard to diff a PR head against its
// base branch (a throwaway worktree).
const rootArgIndex = process.argv.indexOf('--root');
const ROOT =
  rootArgIndex >= 0 && process.argv[rootArgIndex + 1]
    ? resolve(process.argv[rootArgIndex + 1])
    : join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'src');
const BASELINE_PATH = join(ROOT, '.planning', 'dead-export-baseline.json');

// --exit-0 forces a zero exit code even when dead exports are found, for
// callers that want the raw JSON report without failing. The dead-export-pr
// guard uses it to fetch the HEAD and merge-base reports, then hands them to
// --diff, which fails only on newly-introduced dead or test-only exports.
const EXIT_ZERO = process.argv.includes('--exit-0');

// --diff <head.json> <base.json> — the dead-export-pr guard's comparison. Both
// arguments are --json reports (HEAD and merge-base); this mode fails when the
// PR introduced a dead export or a new test-only export, so the guard logic
// lives in one place instead of inline node -e in ci.yml.
const diffArgIndex = process.argv.indexOf('--diff');
if (diffArgIndex >= 0) {
  const headReport = JSON.parse(
    readFileSync(process.argv[diffArgIndex + 1], 'utf8'),
  );
  const baseReport = JSON.parse(
    readFileSync(process.argv[diffArgIndex + 2], 'utf8'),
  );
  const deadOf = r => [...r.zeroRef, ...r.reExportOnly, ...r.deadBarrels];
  const testOnlyOf = r => r.testOnly || [];
  const headDead = new Set(deadOf(headReport));
  const baseDead = new Set(deadOf(baseReport));
  const headTestOnly = new Set(testOnlyOf(headReport));
  const baseTestOnly = new Set(testOnlyOf(baseReport));
  const introducedDead = [...headDead].filter(k => !baseDead.has(k));
  const introducedTestOnly = [...headTestOnly].filter(
    k => !baseTestOnly.has(k),
  );
  let failed = false;
  if (introducedDead.length > 0) {
    failed = true;
    console.error('::error::This PR introduces dead exports:');
    introducedDead.forEach(k => console.error('  ' + k));
  }
  if (introducedTestOnly.length > 0) {
    failed = true;
    console.error(
      '::error::This PR introduces test-only exports (consumed only by __tests__). ' +
        'Add a production caller, move them to __tests__/helpers/, or record a verdict in .planning/category-c-verdicts.md:',
    );
    introducedTestOnly.forEach(k => console.error('  ' + k));
  }
  if (failed) process.exit(1);
  console.log(
    `No new dead or test-only exports vs base (${headDead.size} dead, ${headTestOnly.size} test-only at HEAD)`,
  );
  process.exit(0);
}

const SRC_EXT = /\.(ts|tsx)$/;
const SCAN_EXT = /\.(ts|tsx|js|jsx|mjs)$/;

// A barrel re-export (`export { A, type B } from "./x"`, possibly multi-line)
// is NOT a consumer — strip it before deciding whether a symbol has real
// callers. Import statements are deliberately left in place.
const RE_EXPORT_RE = /export\s+(?:type\s+)?\{[^}]*\}\s*from\s*['"][^'"]+['"]/g;

// ---------------------------------------------------------------- walking

function walk(dir, extRe) {
  const out = [];
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const entry of entries) {
    const p = join(dir, entry);
    let st;
    try {
      st = statSync(p);
    } catch {
      continue;
    }
    if (st.isDirectory()) out.push(...walk(p, extRe));
    else if (extRe.test(entry)) out.push(p);
  }
  return out;
}

const srcFiles = walk(SRC, SRC_EXT).sort();

// Root entry files that mount src modules (App.tsx, index.js, ...). Including
// them is what stops screens mounted in App.tsx from looking dead.
const rootFiles = readdirSync(ROOT)
  .filter(f => SCAN_EXT.test(f))
  .filter(f => {
    try {
      return statSync(join(ROOT, f)).isFile();
    } catch {
      return false;
    }
  })
  .map(f => join(ROOT, f));

const scanFiles = [
  ...srcFiles,
  ...rootFiles,
  ...walk(join(ROOT, '__tests__'), SCAN_EXT),
  ...walk(join(ROOT, 'scripts'), SCAN_EXT),
];

const cache = new Map();
function read(p) {
  if (!cache.has(p)) {
    try {
      cache.set(p, readFileSync(p, 'utf8'));
    } catch {
      cache.set(p, '');
    }
  }
  return cache.get(p);
}

// --------------------------------------------------------- export extraction

/**
 * Returns [{ name, declLines }] for every exported symbol in a file.
 * declLines are the 0-based line numbers of the export declarations, used to
 * tell "referenced by another exported signature" from "self-declaration".
 */
function exportedNames(src) {
  const names = new Map(); // name -> Set<line>
  const lines = src.split('\n');

  const declRe =
    /^export\s+(?:declare\s+)?(?:async\s+)?(?:const|let|var|function|class|interface|type|enum)\s+([A-Za-z_$][A-Za-z0-9_$]*)/g;
  const defaultRe =
    /^export\s+default\s+(?:function|class|async\s+function)\s+([A-Za-z_$][A-Za-z0-9_$]*)/g;
  // Local `export { A, B }` without a `from` clause (re-exports with `from`
  // belong to the source module and are skipped — they add nothing here).
  const braceRe = /^export\s+(?:type\s+)?\{([^}]*)\}(?!\s*from)/g;

  const add = (name, line) => {
    if (!name) return;
    if (!names.has(name)) names.set(name, new Set());
    names.get(name).add(line);
  };

  lines.forEach((line, i) => {
    for (const m of line.matchAll(declRe)) add(m[1], i);
    for (const m of line.matchAll(defaultRe)) if (m[1]) add(m[1], i);
    for (const m of line.matchAll(braceRe)) {
      for (const item of m[1].split(',')) {
        // Strip `type ` modifiers and `as` aliases from brace items.
        const name = item
          .trim()
          .replace(/^type\s+/, '')
          .split(/\s+as\s+/)[0]
          ?.trim();
        add(name, i);
      }
    }
  });

  return [...names.entries()].map(([name, declLines]) => ({
    name,
    declLines: [...declLines],
  }));
}

/** True when `nameRe` matches `text` somewhere other than a re-export line. */
function consumesName(text, nameRe) {
  const stripped = text.replace(RE_EXPORT_RE, '');
  return nameRe.test(stripped);
}

// ------------------------------------------------------------- dead barrels

function importTargets(spec, importerFile) {
  if (!spec.startsWith('.')) return [];
  const base = join(dirname(importerFile), spec);
  const candidates = [
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.js`,
    `${base}.jsx`,
    `${base}.mjs`,
    join(base, 'index.ts'),
    join(base, 'index.tsx'),
    join(base, 'index.js'),
  ];
  return candidates.filter(p => {
    try {
      return statSync(p).isFile();
    } catch {
      return false;
    }
  });
}

const imported = new Set();
for (const f of scanFiles) {
  const text = read(f);
  for (const m of text.matchAll(/from\s+['"]([^'"]+)['"]/g)) {
    for (const t of importTargets(m[1], f)) imported.add(relative(ROOT, t));
  }
  for (const m of text.matchAll(
    /(?:import|require)\(\s*['"]([^'"]+)['"]\s*\)/g,
  )) {
    for (const t of importTargets(m[1], f)) imported.add(relative(ROOT, t));
  }
  for (const m of text.matchAll(/^\s*import\s*['"]([^'"]+)['"]/gm)) {
    for (const t of importTargets(m[1], f)) imported.add(relative(ROOT, t));
  }
}
const deadBarrels = srcFiles
  .map(f => relative(ROOT, f))
  .filter(f => !imported.has(f))
  .sort();

// ---------------------------------------------------------------- classify

const zeroRef = []; // no references anywhere, not even in own file
const reExportOnly = []; // only unconsumed barrel re-exports elsewhere
const contract = []; // referenced by an exported signature in own file
const lowReference = []; // 1-2 real consumers — verify by hand
const testOnly = []; // Category C: consumers exist, all under __tests__/

let enumerated = 0;

for (const file of srcFiles) {
  const src = read(file);
  if (!src) continue;
  const fileLines = src.split('\n');
  for (const { name, declLines } of exportedNames(src)) {
    enumerated += 1;
    const declSet = new Set(declLines);
    const nameRe = new RegExp(`\\b${name}\\b`);
    const otherRefs = []; // files (≠ defining) whose text mentions the name
    const consumers = []; // files with a real, non-re-export usage
    const selfRefLines = []; // 1-based lines in own file beyond declaration

    fileLines.forEach((line, idx) => {
      if (declSet.has(idx)) return;
      if (nameRe.test(line)) selfRefLines.push(idx + 1);
    });

    for (const f of scanFiles) {
      if (f === file) continue;
      const text = read(f);
      if (!nameRe.test(text)) continue;
      otherRefs.push(relative(ROOT, f));
      if (consumesName(text, nameRe)) consumers.push(relative(ROOT, f));
    }

    const entry = {
      file: relative(ROOT, file),
      name,
      // NOTE: a symbol referenced only by a dead export's signature (e.g.
      // DocumentCorners via estimateDocumentCorners) is kept as CONTRACT here;
      // it surfaces as zero-ref only once the dead export is deleted. That is
      // the conservative choice for a CI gate — see the deletion-test report.
      selfRefLines,
      consumers: [...new Set(consumers)].sort(),
    };
    const key = `${entry.file}:${entry.name}`;
    entry.key = key;

    if (consumers.length > 0) {
      // Category C — test-only export: every cross-file consumer lives under
      // __tests__/, so src/ has no production consumer. The dead-export-pr
      // guard fails PRs that grow this set between audits (see
      // .planning/category-c-verdicts.md).
      if (consumers.every(c => c.startsWith('__tests__/'))) {
        testOnly.push(entry);
      }
      if (consumers.length <= 2) lowReference.push(entry);
      continue;
    }
    if (otherRefs.length === 0) {
      if (selfRefLines.length === 0) zeroRef.push(entry);
      else contract.push(entry);
    } else if (selfRefLines.length === 0) {
      reExportOnly.push(entry);
    } else {
      // Re-exported by a barrel AND used by an own-file exported signature —
      // e.g. component props types. Keep; the barrel re-export is the contract.
      contract.push(entry);
    }
  }
}

// ----------------------------------------------------------------- baseline

function loadBaseline() {
  try {
    return JSON.parse(readFileSync(BASELINE_PATH, 'utf8'));
  } catch {
    return { exports: [], barrels: [] };
  }
}

const keyOf = e => e.key;

if (process.argv.includes('--update-baseline')) {
  const next = {
    exports: [...zeroRef, ...reExportOnly].map(keyOf).sort(),
    barrels: deadBarrels,
  };
  writeFileSync(BASELINE_PATH, `${JSON.stringify(next, null, 2)}\n`);
  console.log(
    `Baseline written to ${relative(ROOT, BASELINE_PATH)} (${next.exports.length} exports, ${next.barrels.length} barrels)`,
  );
  process.exit(0);
}

const baseline = process.argv.includes('--no-baseline')
  ? { exports: [], barrels: [] }
  : loadBaseline();
const baselineExports = new Set(baseline.exports);
const baselineBarrels = new Set(baseline.barrels);

const newZeroRef = zeroRef.filter(e => !baselineExports.has(e.key));
const newReExportOnly = reExportOnly.filter(e => !baselineExports.has(e.key));
const newBarrels = deadBarrels.filter(b => !baselineBarrels.has(b));
const newCount = newZeroRef.length + newReExportOnly.length + newBarrels.length;

// ------------------------------------------------------------------- report

const jsonReport = {
  zeroRef: zeroRef.map(e => e.key),
  reExportOnly: reExportOnly.map(e => e.key),
  deadBarrels,
  newSinceBaseline: {
    zeroRef: newZeroRef.map(e => e.key),
    reExportOnly: newReExportOnly.map(e => e.key),
    barrels: newBarrels,
  },
  contract: contract.map(e => e.key),
  testOnly: testOnly.map(e => e.key),
  lowReference: lowReference.map(e => ({
    file: e.file,
    name: e.name,
    consumers: e.consumers,
  })),
  totals: {
    srcFiles: srcFiles.length,
    exports: enumerated,
    dead: zeroRef.length + reExportOnly.length + deadBarrels.length,
    testOnly: testOnly.length,
    newSinceBaseline: newCount,
    baselineExports: baselineExports.size,
    baselineBarrels: baselineBarrels.size,
  },
};

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(jsonReport, null, 2));
  process.exit(EXIT_ZERO || newCount === 0 ? 0 : 1);
}

console.log(
  '=== DEAD EXPORTS — zero references (never referenced anywhere) ===',
);
console.log(zeroRef.map(e => e.key).join('\n') || '  (none)');

console.log('\n=== DEAD EXPORTS — re-export only (no real consumer) ===');
console.log(reExportOnly.map(e => e.key).join('\n') || '  (none)');

console.log('\n=== DEAD BARRELS — whole file never imported ===');
console.log(deadBarrels.join('\n') || '  (none)');

console.log('\n=== NEW SINCE BASELINE (fails CI) ===');
const newList = [...newZeroRef, ...newReExportOnly].map(e => e.key);
console.log(newList.join('\n') || '  (none)');
if (newBarrels.length) console.log(newBarrels.join('\n'));

console.log(
  '\n=== CONTRACT-REFERENCED (kept — exported signature in own file) ===',
);
console.log(contract.map(e => e.key).join('\n') || '  (none)');

console.log('\n=== LOW-REFERENCE exports (1-2 consumers) — verify by hand ===');
for (const e of lowReference) {
  console.log(`  ${e.file}:${e.name}  (${e.consumers.join(', ')})`);
}

console.log(
  '\n=== TEST-ONLY exports (consumed only by __tests__) — Category C ===',
);
console.log(
  testOnly.length === 0
    ? '  (none)'
    : testOnly
        .map(e => `  ${e.file}:${e.name}  (${e.consumers.join(', ')})`)
        .join('\n'),
);

console.log(
  `\n${jsonReport.totals.srcFiles} src files, ${jsonReport.totals.exports} exported symbols, ` +
    `${jsonReport.totals.dead} dead, ${jsonReport.totals.testOnly} test-only, ` +
    `${jsonReport.totals.newSinceBaseline} new since baseline.`,
);
if (newCount > 0) {
  console.log(
    'Run --update-baseline after a deliberate clean-up to accept the new baseline.',
  );
}

process.exit(EXIT_ZERO || newCount === 0 ? 0 : 1);
