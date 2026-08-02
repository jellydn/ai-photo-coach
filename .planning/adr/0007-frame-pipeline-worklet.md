# 0007. Extract a shared worklet frame pipeline

Date: 2026-08-01

## Status

Accepted

## Context

The exact same VisionCamera v5 worklet lifecycle — the enabled guard,
`getPixelBuffer` extraction, `runOnJS` bridge, and `frame.dispose()` in a
`try/finally` — was copy-pasted across the lighting, edge, face, and
aesthetic frame processors. This was the codebase's own documented fragile
area, and each copy risked diverging over time.

## Decision

Extract the lifecycle into a shared module,
`src/framePipeline/useFramePipeline.ts` (barrel: `src/framePipeline/`), and
refactor the lighting and edge processors to consume it. A dedicated test
suite (`__tests__/framePipeline.test.ts`) covers the pipeline. This
concentrates the lifecycle before the next planned ML work (face detection,
TFLite model) lands on these modules.

## Consequences

### 📋 Positive

- One source of truth for the worklet lifecycle; no more copy-paste drift.
- Frame disposal in `try/finally` is guaranteed in one place.
- Future ML processors build on a shared, tested base.

### 📋 Negative

- Processors must conform to the pipeline's contract.
- Simple processors pay an abstraction's indirection cost.
