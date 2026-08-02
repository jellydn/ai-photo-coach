# 0001. Bundle frame signals behind a typed scoring intake

Date: 2026-08-03

## Status

Accepted

## Context

`useScoring` is the reactive 10 Hz shot-readiness scoring hook. Its intake
was ~20 scalar props (gating flags such as `faceFramingEnabled` and
`lightingAnalysisEnabled`, plus measured signals like stability, horizon
level, lighting class, face framing, centering, document skew, flat-lay
pitch, and group framing) that `CameraScreen` hand-assembled at the call
site. The interface was nearly as wide as the implementation, and every new
frame-analysis signal meant a new prop threaded through the screen. A
missing or mis-ordered prop produced a silently wrong score, and the failure
mode lived far from the hook that consumed it.

## Decision

`useScoring` now accepts a single typed `ScoreSignals` bundle (defined in
`src/scoring/types.ts`) plus non-signal configuration:

- `signals: ScoreSignals` — one bundle carrying every frame-analysis signal,
  including the mode-gating flags the hook needs for initial sub-score state.
- `modelOutput?`, `weights?`, `autoCaptureThreshold?`, `targetFps?` —
  configuration that is not per-frame.

The hook destructures only the gating flags it needs for initial state; the
full bundle is mirrored into a ref (`signalsRef`) on change, so the 10 Hz
interval always computes against the latest frame without being torn down
and re-created. `ScoreSignals`, `ScoreResult`, and related types are
re-exported from `src/scoring/useScoring.ts` for consumers.

## Consequences

### 📋 Positive

- The interface shrank from ~20 scalars to one bundle plus four config props.
- Missing-signal bugs now concentrate in the single seam where the bundle is
  constructed (`useShotAnalysis`), not scattered across the call site.
- Adding a new signal is a type + bundle change; the hook interface does not
  grow.
- The bundle is type-enforced end to end.

### 📋 Negative

- `ScoreSignals` is a wide type; a caller must assemble the full shape, so
  in practice only the deep analysis module builds it.
- The bundle's object identity matters to the hook's `signals` effect —
  callers must memoize it to avoid dependency churn.
