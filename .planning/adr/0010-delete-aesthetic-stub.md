# 0010. Delete the un-wired aesthetic model stub

Date: 2026-08-03

## Status

Accepted

## Context

The `src/aestheticModel/` module — a model loader, type/constant definitions, a
frame-processor hook, and a barrel export — was added in `110ae15` as an
"optional TFLite aesthetic model integration". It ships an empty promise:

- **No consumer.** Nothing in `src/` imports the module. Its only external
  user is its own test file (`__tests__/aestheticModel.test.ts`).
- **No runtime path.** `react-native-fast-tflite` is not a dependency, no
  `assets/models/aesthetic_model.tflite` exists in the repo, `tryLoadModel()`
  returns `null` unconditionally, and `processAestheticFrameWorklet` always
  invokes its callback with `null`.
- **No signal feed.** `useShotAnalysis` — the only caller of `useScoring` in
  the app — never passes `modelOutput`, so the aesthetic subscore is always 0
  and the scoring method is always `rules-only` in practice.

The deletion test: removing the module concentrates no complexity anywhere.
Nothing depends on it, and the scoring seam it was meant to feed — the
`MLModelOutput` type plus the optional `modelOutput` argument on
`useScoring`/`computeScore` (ADR-0001) — is independent, tested, and remains
functional without it.

## Decision

Delete `src/aestheticModel/` and its test suite. Keep the tested `MLModelOutput`
seam in `src/scoring/` as the integration point for the ML work that ADR-0007
notes is planned. When a real TFLite binding and a model asset exist, wire the
model through that seam — do not resurrect a pre-built empty hook.

## Consequences

### 📋 Positive

- ~450 lines of dead code and a spec-fiction test suite removed.
- The scoring intake seam (ADR-0001) remains the single, tested place an ML
  model attaches; no parallel empty abstraction to drift.
- CONCERNS.md no longer tracks a stub that can never load.

### 📋 Negative

- No on-device aesthetic subscore until real ML work lands — unchanged in
  practice, since the subscore was always 0 without a model.
- README's "hybrid rules + ML" phrasing now rests on the scoring seam alone
  until that ML work exists.
