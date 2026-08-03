# Category C — Test-Only Export Verdicts

Date: 2026-08-03
Status: Analysis complete — **no code touched.** Verdicts recorded for every
Category C ("test-only") export from `.planning/deletion-test-whole-codebase.md`.

## Verdict options

| Verdict | Meaning |
|---|---|
| **STAY — public test surface** | Keep exported from `src/`. It is either transitively live (called by a production function in the same module), a spec/perf constant the tests pin, or a thin pure convenience with no cheaper home. |
| **MOVE — `__tests__` helpers** | No production caller today and no plausible one; it exists only for tests. Relocate into a shared `__tests__/helpers/` module so the `src/` public surface stops advertising it. |
| **GET PRODUCTION CALLER** | The function/constant encodes real behavior the product should use but currently doesn't. Wire it into its natural consumer (and delete any duplicate logic it replaces). |

## Headline findings

1. **Lighting algorithm duplication (7 exports).** `useLightingFrameProcessor.ts`
   contains a private `computeLightingFromPixels` that re-implements the entire
   exported lighting pipeline (mean luminance, histogram bins, face/background
   brightness, brightness ratio) instead of calling the tested
   `computeLightingStatsWithRegions`. The exported family — 7 functions — is
   orphaned reference code. The fix is to make the frame processor consume the
   exported algorithm and delete the private copy.
2. **`MIN_FACE_CONFIDENCE` drift.** The constant is `0.7`, but
   `useFaceDetection.ts:93` falls back to a hardcoded `0.9` and the detector
   confidence is used raw — the exported floor is never applied in production.
3. **User-facing copy never rendered (3 exports).** `getStateDescription`,
   `getDocumentStatusDescription`, and `getLineOrientationDescription` produce
   UI-ready strings that are fully tested but no screen or coaching prompt
   calls. They belong in the CameraScreen status area and the document/travel
   coaching prompts.

## Verdicts

### `src/lighting/types.ts`

| Symbol | Verdict | Evidence / action |
|---|---|---|
| `computeLightingStats` | **GET PRODUCTION CALLER** | Only tests call it; the frame processor's private `computeLightingFromPixels` duplicates its math. Unify on the exported function, then delete the private copy. |
| `computeLightingStatsWithRegions` | **GET PRODUCTION CALLER** | The exact function the frame processor should call for `LightingStatsWithRegions` (identical return shape). |
| `computeHistogramStats` | **GET PRODUCTION CALLER** | Composes into `computeLightingStats`; becomes live once the frame processor delegates. |
| `calculateMeanLuminance` | **GET PRODUCTION CALLER** | Same — step function of the exported pipeline, currently test-only. |
| `calculateRegionLuminance` | **GET PRODUCTION CALLER** | Face-region luminance used by `computeLightingStatsWithRegions`; live once unified. |
| `calculateBackgroundBrightness` | **GET PRODUCTION CALLER** | Same. |
| `extractLuminanceValues` | **GET PRODUCTION CALLER** | Same. |
| `TARGET_LIGHTING_FPS` | **STAY — public test surface** | Spec constant (≥ 20 FPS) pinned by tests; wiring the pipeline throttle is a separate perf feature, not a defect. |
| `MAX_LIGHTING_LONG_EDGE` | **STAY — public test surface** | Documents the downscale budget; tests pin `320`. No production consumer needed while the frame pipeline owns pixel extraction. |

### `src/faceDetection/types.ts`

| Symbol | Verdict | Evidence / action |
|---|---|---|
| `GROUP_MIN_TOTAL_FACE_AREA_PCT` | **STAY — public test surface** | Transitively live: used by `computeGroupFramingAnalysis` → `useShotAnalysis.ts:184` (production). Tests also pin it. |
| `GROUP_MAX_TOTAL_FACE_AREA_PCT` | **STAY — public test surface** | Same — group-framing threshold in the production chain. |
| `GROUP_EDGE_MARGIN_PCT` | **STAY — public test surface** | Same — default for `isFaceTouchingEdge` (live via `GroupFaceOverlay`). |
| `computeTotalFaceAreaPercent` | **STAY — public test surface** | Called by `computeGroupFramingAnalysis` (production chain). |
| `MAX_ML_LONG_EDGE` | **STAY — public test surface** | Spec constant for the ML input budget; MLKit v2 manages its own sizing, so no production consumer is warranted. |
| `TARGET_FACE_DETECTION_FPS` | **STAY — public test surface** | Perf target pinned by tests; the detector owns its own cadence. |
| `MIN_FACE_CONFIDENCE` | **GET PRODUCTION CALLER** | Production uses a hardcoded `0.9` fallback (`useFaceDetection.ts:93`) — the exported `0.7` floor is never applied. Make the hook read the constant so confidence filtering has one source of truth. |
| `downscaleFrame` | **MOVE — `__tests__` helpers** | Only tests call it (5 cases in `faceDetection.test.ts`); no production caller and none plausible — MLKit handles scaling. Relocate to `__tests__/helpers/`. |

### `src/sensors/math.ts`

| Symbol | Verdict | Evidence / action |
|---|---|---|
| `TARGET_FLATLAY_PITCH_DEG` | **STAY — public test surface** | Transitively live: used by `isFlatLayPosition` (→ `usePitchDetection`) and `computeFlatLayScore` (scoring chain). |

### `src/capture/CaptureStateMachine.ts`

| Symbol | Verdict | Evidence / action |
|---|---|---|
| `isValidTransition` | **STAY — public test surface** | Used internally by the FSM reducer (`CaptureStateMachine.ts:133,149`) — production-live. |
| `isCaptureComplete` | **STAY — public test surface** | Test-pinned FSM predicate. Optional future caller: `useCaptureStateMachine`'s completion detection only fires on `"completed"` while this also covers `cancelled`/`error` — wire it if those should terminate flows. |
| `getStateDescription` | **GET PRODUCTION CALLER** | UI copy ("Ready to capture", "Taking photo", …) is defined and tested but no screen renders it. Wire into the CameraScreen status/countdown area. |

### `src/config/modes.ts`

| Symbol | Verdict | Evidence / action |
|---|---|---|
| `getEnabledModes` | **STAY — public test surface** | Pure convenience over `modeConfig`; production already uses `isModeEnabled` per mode. Tests pin the enabled/disabled contract. |
| `getDisabledModes` | **STAY — public test surface** | Same. |

### `src/storage/settings.ts`

| Symbol | Verdict | Evidence / action |
|---|---|---|
| `clearAllSettings` | **STAY — public test surface** | Thin utility used by tests; a "reset settings" or onboarding affordance is a product decision, not a defect. |
| `toggleAutoCaptureEnabled` | **GET PRODUCTION CALLER** | `SettingsScreen.tsx:60-62` re-implements the flip inline (`setAutoCaptureEnabled(!value)`). Replace with a call to the exported toggle (which returns the new value) so the flip has one definition. |

### `src/documentDetection/types.ts`

| Symbol | Verdict | Evidence / action |
|---|---|---|
| `SKEW_ANGLE_THRESHOLD` | **STAY — public test surface** | Transitively live: used inside `detectDocumentSkew` (`types.ts:140,148,219`), which `useShotAnalysis:252` consumes. |
| `MIN_DOCUMENT_CONFIDENCE` | **STAY — public test surface** | Transitively live: `detectDocumentSkew` gates on it (`types.ts:119`). |
| `isDocumentAligned` | **GET PRODUCTION CALLER** | Public predicate with no production consumer; `useShotAnalysis` surfaces raw `skewAngle`/`isFlat` instead. Wire the aligned signal into document-mode guidance. |
| `getDocumentStatusDescription` | **GET PRODUCTION CALLER** | User-facing copy ("Document aligned", …) defined and tested, never rendered. Belongs in the document-mode coaching prompt. |

### `src/edgeDetection/types.ts`

| Symbol | Verdict | Evidence / action |
|---|---|---|
| `getLineOrientationDescription` | **GET PRODUCTION CALLER** | User-facing copy for the dominant-line orientation, tested but never rendered. Belongs in the travel/document-mode coaching prompt alongside `getDocumentStatusDescription`. |

## Summary

| Verdict | Count | Symbols |
|---|---|---|
| **STAY — public test surface** | 16 | `TARGET_LIGHTING_FPS`, `MAX_LIGHTING_LONG_EDGE`, `GROUP_MIN_TOTAL_FACE_AREA_PCT`, `GROUP_MAX_TOTAL_FACE_AREA_PCT`, `GROUP_EDGE_MARGIN_PCT`, `computeTotalFaceAreaPercent`, `MAX_ML_LONG_EDGE`, `TARGET_FACE_DETECTION_FPS`, `TARGET_FLATLAY_PITCH_DEG`, `isValidTransition`, `isCaptureComplete`, `getEnabledModes`, `getDisabledModes`, `clearAllSettings`, `SKEW_ANGLE_THRESHOLD`, `MIN_DOCUMENT_CONFIDENCE` |
| **GET PRODUCTION CALLER** | 13 | `computeLightingStats`, `computeLightingStatsWithRegions`, `computeHistogramStats`, `calculateMeanLuminance`, `calculateRegionLuminance`, `calculateBackgroundBrightness`, `extractLuminanceValues`, `MIN_FACE_CONFIDENCE`, `getStateDescription`, `toggleAutoCaptureEnabled`, `isDocumentAligned`, `getDocumentStatusDescription`, `getLineOrientationDescription` |
| **MOVE — `__tests__` helpers** | 1 | `downscaleFrame` |

Next step, when approved: execute the GET PRODUCTION CALLER batch (lighting unify,
`MIN_FACE_CONFIDENCE`, status copy, `toggleAutoCaptureEnabled`, document/edge
copy), move `downscaleFrame`, then re-run `yarn dead:check --update-baseline`
— the newly-live exports drop out of the baseline automatically.
## Enforcement — the test-surface boundary is now a CI guard

The `dead-export-pr` guard enforces this boundary between audits. It applies the
mechanical definition — *every exported symbol whose cross-file consumers live
only under `__tests__/`* — at HEAD vs the PR's merge-base, and fails a PR that
introduces a new test-only export. The merge-base diff grandfathers everything
that already exists, so the curated 30 above (and the broader mechanical
inventory they came from — 62 symbols as of 2026-08-03, including contract
types and modules the original audit did not enumerate, e.g.
`src/scoring/algorithms.ts`, `src/coaching/types.ts`, `src/haptics/`,
`src/telemetry/`) stays green until deliberately resolved.

A PR that adds a new test-only export must do one of:
1. Wire a production caller (the GET PRODUCTION CALLER path), or
2. Move it to a shared `__tests__/helpers/` module (the MOVE path), or
3. Record a verdict for it here (the STAY path — e.g. a new spec constant the
   tests pin).

Run `yarn dead:check` to see the full current test-only inventory.
Two caveats. Relocating an existing test-only export between files changes its
merge-base key, so a move is treated as a new export — keep the defining file
stable, or record a verdict alongside the move. And enforcement is PR-scoped:
a direct push to `main` bypasses the guard (`yarn dead:check` does not fail on
test-only exports), so land new test-only exports through a PR.
