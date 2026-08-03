# 0011. Keep real adapters; remove dead encrypted settings twins

Date: 2026-08-03

## Status

Accepted

## Context

Following the deletion test applied to the aesthetic model stub (ADR-0010),
the same test was run on the two remaining "adapter-selected but
unselected" seams flagged by the architecture review:

1. The `USE_ENCRYPTED_PHOTO_STORAGE = false` encrypted adapter — the
   second `PhotoStorage` adapter added by ADR-0008 and wired by ADR-0003
   (the active selection record; ADR-0008 is superseded by it).
2. The frame pipeline's consumers (ADR-0007).

The deletion test asks: would deleting the module concentrate complexity
elsewhere, or just move it? "Concentrates" means the module earns its keep.

## Decision

- **Keep `EncryptedLocalPhotoStorage` + `encryptedStorage`.** The encrypted
  adapter is a real second `PhotoStorage` implementation: all dependencies
  are installed (`react-native-keychain`, `react-native-mmkv`,
  `react-native-get-random-values`), it has a passing test suite
  (`__tests__/EncryptedLocalPhotoStorage.test.ts`), and flipping the flag
  selects it with zero call-site churn (ADR-0003). The seam has two real
  adapters — deleting one would reduce it back to a hypothetical seam.
- **Keep `useFramePipeline`.** Its consumers are not unused: lighting
  (`useLightingFrameProcessor`) and edge detection
  (`useEdgeDetectionFrameOutput`) both feed frame output through it into
  `<Camera outputs={...}>` via `useShotAnalysis`. Deleting it would
  re-concentrate the fragile worklet lifecycle (enabled guard, pixel
  extraction, `runOnJS`, dispose) into every consumer — the exact
  copy-paste drift ADR-0007 was written to eliminate.
- **Delete the `*Encrypted()` settings variants in `src/storage/settings.ts`.**
  These are dead twin exports with zero callers anywhere in the repo — the
  same smell ADR-0009 removed from telemetry. `encryptedStorage.ts` itself
  stays: it backs the kept adapter.

## Consequences

### 📋 Positive

- The two real seams are confirmed to earn their keep; a future architecture
  review won't re-litigate them without new evidence.
- Dead encrypted settings exports are gone, matching the ADR-0009 precedent.

### 📋 Negative

- The bundle still ships both storage adapters (ADR-0003 negative, unchanged).
- Face detection still uses raw `useFrameOutput` rather than the pipeline —
  an adoption gap, not a deletion candidate.
