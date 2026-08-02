# 0002. Collapse shot analysis behind one deep module

Date: 2026-08-03

## Status

Accepted

## Context

`CameraScreen` was ~841 lines and wired 15+ sensor and frame-analysis hooks
by hand (`useHorizonLevel`, `useStability`, `usePitchDetection`,
`useFaceDetection`, `useLighting`, `useLightingFrameOutput`,
`useProductCentering`, `useEdgeDetection`, `useEdgeDetectionFrameOutput`,
document-skew detection, and others), then hand-assembled ~20 scalars for
the scoring intake. Camera concerns (session, capture) were tangled with
frame-analysis concerns, and the analysis wiring was untestable without
mounting a camera.

## Decision

A new deep module `src/shotAnalysis/useShotAnalysis.ts` (barrel:
`src/shotAnalysis/index.ts`) owns:

- all sensor subscriptions and frame-analysis hook wiring;
- mode-gated analysis (group framing, document skew) and frame-output
  collection;
- construction of the `ScoreSignals` bundle consumed by `useScoring`,
  including a memoized `lightingThresholds` object shared by the lighting
  hooks;
- the scoring intake via `useScoring`.

It exposes one narrow result object. `CameraScreen` is now a thin
orchestrator that wires camera concerns only and renders the analysis
result. The seam has dedicated tests (`__tests__/useShotAnalysis.test.ts`)
covering sensor wiring, the composed signals bundle, mode-gated analysis,
and frame-output collection.

## Consequences

### 📋 Positive

- The screen dropped to a single responsibility and a fraction of its size.
- Analysis wiring is testable in isolation via dedicated hook tests.
- Bundle construction lives next to the signals that feed it — one place to
  get the scoring intake right.
- New analysis features land in the module, not the screen.

### 📋 Negative

- `useShotAnalysis` is a wide internal module; changing analysis behavior
  requires understanding it.
- The screen couples to the module's result shape — the seam must stay
  narrow for that coupling to stay cheap.
