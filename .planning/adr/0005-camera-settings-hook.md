# 0005. Extract persisted camera settings into a focused hook

Date: 2026-08-01

## Status

Accepted

## Context

`CameraScreen` carried auto-capture, haptic, and score-visibility state plus
the settings subscriptions inline in the orchestrator, mixing persisted
preference concerns with camera orchestration. The settings behavior was
untestable without mounting the whole screen.

## Decision

Extract the persisted settings state and subscriptions into a focused hook,
`src/camera/useCameraSettings.ts`, with its own tests. The screen consumes
the hook's result instead of owning preference state itself.

## Consequences

### 📋 Positive

- The screen dropped a concern it did not need to own.
- Settings behavior is testable in isolation via the hook's dedicated tests.
- One owner for persisted preference state (single source of truth).

### 📋 Negative

- The screen now composes another hook, adding a small indirection layer.
- The hook and the screen must stay in sync on the returned shape.
