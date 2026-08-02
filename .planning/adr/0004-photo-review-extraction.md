# 0004. Extract the post-capture lifecycle into a deep hook

Date: 2026-08-03

## Status

Accepted

## Context

`PostCaptureScreen` mixed rendering with the save/discard lifecycle: burst
keep-all/keep-best decisions, storage deletion, busy-state tracking, and
parent notification all lived inline in the component. The lifecycle logic
was only exercisable by mounting the full screen, and its behavior was
unpinned by tests.

## Decision

A new deep hook `src/screens/usePhotoReview.ts` owns the post-capture
lifecycle:

- burst-mode detection and keep-all/keep-best decisions;
- storage deletion (single-photo delete, plus a shared `deletePhotos` helper
  that deletes burst photos in parallel via `Promise.all`);
- `isSaving` / `isDiscarding` busy states with re-entrancy guards;
- parent notification via `onSave` / `onDiscard`.

`PostCaptureScreen` only renders state and forwards intent. The lifecycle
has dedicated tests (`__tests__/usePhotoReview.test.ts`) covering single and
burst modes, including the keep-best cleanup path.

## Consequences

### 📋 Positive

- Lifecycle behavior is testable in isolation without mounting the screen.
- The screen is now a pure presentation component.
- Burst deletes run in parallel instead of one-at-a-time.
- Behavior is unchanged from the inline version (verified by tests).

### 📋 Negative

- The hook carries an implicit dependency on the `photoStorage` singleton
  (mocked at module level in tests today) — swapping in a fake requires
  module mocking rather than injection.
- Screen and hook must stay in sync on the result shape.
