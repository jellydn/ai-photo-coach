# Architecture

**Analysis Date:** 2026-08-03

## Pattern Overview

**Overall:** Deep-module / seam architecture over a screen orchestrator. Screens stay thin; domain logic lives in focused modules behind typed seams. Architectural choices are recorded as ADRs in `.planning/adr/` (see [Decision Records](#decision-records)).

**Key Characteristics:**
- Thin screens: `CameraScreen` and `PostCaptureScreen` delegate analysis and lifecycle to deep hooks
- Single-purpose seams: analysis (`useShotAnalysis`), scoring intake (`ScoreSignals`), storage (`PhotoStorage`), post-capture lifecycle (`usePhotoReview`)
- Dependency flow is inward: screens → deep modules → leaf hooks/adapters
- Persistence and telemetry behind interfaces with code-level switches

## Layers

**Screens:**
- Purpose: Render state and forward user intent
- Location: `src/screens/`
- Contains: `CameraScreen.tsx`, `PostCaptureScreen.tsx`, `ModeSelectorScreen.tsx`, `SettingsScreen.tsx`, onboarding flow
- Depends on: analysis, scoring, capture, storage seams
- Used by: `App.tsx` (screen state machine)

**Analysis seam (`useShotAnalysis`):**
- Purpose: Own all sensor subscriptions, frame analysis, and scoring intake for the camera
- Location: `src/shotAnalysis/useShotAnalysis.ts`
- Contains: wiring of `useHorizonLevel`, `useStability`, `usePitchDetection`, `useFaceDetection`, `useLighting`, `useLightingFrameOutput`, `useProductCentering`, `useEdgeDetection`, `useEdgeDetectionFrameOutput`, document-skew detection; composed `ScoreSignals` bundle; `useScoring`
- Depends on: `src/sensors/`, `src/faceDetection/`, `src/lighting/`, `src/edgeDetection/`, `src/documentDetection/`, `src/camera/useProductCentering.ts`, `src/scoring/`
- Used by: `CameraScreen` (ADR-0002)

**Scoring:**
- Purpose: Compute 0–100 shot-readiness at 10 Hz from a typed signals bundle
- Location: `src/scoring/`
- Contains: `useScoring.ts`, `algorithms.ts`, `types.ts` (`ScoreSignals`, `ScoreResult`), `weights.ts`, `labels.ts`, `ScoreRing.tsx`
- Used by: `useShotAnalysis` (ADR-0001)

**Capture pipeline:**
- Purpose: Drive capture state machine, countdown timing, auto-capture, camera settings
- Location: `src/capture/`, `src/camera/`, `src/autoCapture/`
- Contains: `CaptureStateMachine.ts`, `countdownTimer.ts` (ADR-0006), `useCameraSettings.ts` (ADR-0005), `usePhotoCapture.ts`, `useAutoCapture.ts`
- Used by: screens

**Frame processing:**
- Purpose: Shared VisionCamera worklet lifecycle (enabled guard, pixel extraction, `runOnJS`, dispose)
- Location: `src/framePipeline/useFramePipeline.ts`
- Used by: lighting and edge frame processors (ADR-0007)

**Storage:**
- Purpose: Persist photos, metadata, settings; single adapter selection point
- Location: `src/storage/`
- Contains: `PhotoStorage.ts` interface, `LocalPhotoStorage` / `EncryptedLocalPhotoStorage` adapters, `storageWiring.ts` (selection point, ADR-0003, ADR-0008), `settings.ts`, `encryptedStorage.ts`, `photoIndex.ts`, `onboarding.ts`
- Used by: capture hooks, review lifecycle, settings UI

**Post-capture lifecycle (`usePhotoReview`):**
- Purpose: Own save/discard, burst keep-all/keep-best, storage deletion, busy states
- Location: `src/screens/usePhotoReview.ts`
- Used by: `PostCaptureScreen` (ADR-0004)

## Data Flow

**Live scoring:**
1. VisionCamera frame + sensor reads arrive at `useShotAnalysis`
2. Leaf hooks compute signals (level, stability, lighting, framing, centering, skew, flat-lay, group)
3. Signals composed into one `ScoreSignals` bundle (memoized) and passed to `useScoring`
4. `useScoring` computes the score at 10 Hz via a `setInterval` against a `signalsRef`; the weakest subscore drives coaching prompts and the score ring
5. `useAutoCapture` fires when score meets threshold

**Capture → review:**
1. `usePhotoCapture` saves the photo via the `photoStorage` seam (`storageWiring.ts`)
2. `App.tsx` routes to `PostCaptureScreen` with `CapturedPhotoData`
3. `usePhotoReview` handles save/discard; burst "keep best" deletes all but the selected shot; discard deletes the photo(s)
4. Telemetry events track capture/save/discard through the opt-out-gated tracker

**State Management:**
- Local component/hook state + module singletons (`photoStorage`, `telemetry`)
- MMKV-backed settings with subscription support (`src/storage/settings.ts`)
- No global state library

## Key Abstractions

**`PhotoStorage` interface:**
- Purpose: Abstract persistence behind save/list/delete
- Examples: `src/storage/PhotoStorage.ts`, `LocalPhotoStorage.ts`, `EncryptedLocalPhotoStorage.ts`
- Pattern: Interface + adapters + single wiring point (ADR-0003)

**`ScoreSignals` bundle:**
- Purpose: One typed object for every frame-analysis signal feeding the score
- Examples: `src/scoring/types.ts`, `src/shotAnalysis/useShotAnalysis.ts`
- Pattern: Typed bundle intake (ADR-0001)

**`useShotAnalysis` seam:**
- Purpose: Collapse ~15 analysis hooks + scoring intake behind one narrow result
- Examples: `src/shotAnalysis/useShotAnalysis.ts`
- Pattern: Deep module behind a screen (ADR-0002)

**`usePhotoReview`:**
- Purpose: Post-capture lifecycle ownership
- Examples: `src/screens/usePhotoReview.ts`
- Pattern: Deep hook behind a screen (ADR-0004)

**`useFramePipeline`:**
- Purpose: Shared worklet lifecycle for frame processors
- Examples: `src/framePipeline/useFramePipeline.ts`
- Pattern: Extracted shared pipeline (ADR-0007)

## Entry Points

**App:**
- Location: `index.js` → `App.tsx`
- Triggers: App launch (native → JS)
- Responsibilities: Screen routing, onboarding gate, telemetry bootstrap

**Landing page:**
- Location: `website/index.html`
- Triggers: Static host / GitHub Pages
- Responsibilities: Marketing/landing content

## Error Handling

**Strategy:** Fail soft in UI paths, log via `console.error`, notify parent to continue

**Patterns:**
- `try/catch/finally` with re-entrancy guards (`isSaving`/`isDiscarding` in `usePhotoReview`)
- `onDiscard` still called even if a delete fails, to exit the screen
- Runtime capability checks (e.g. MMKV v4 `createMMKV` guard in `settings.ts`, keychain availability in `encryptedStorage.ts`)

## Cross-Cutting Concerns

**Logging:** `console.error` for failures; telemetry events for user/session actions (opt-out gated, ADR-0009)

**Validation:** TypeScript strictness via `@react-native/typescript-config`; runtime checks for native API availability

**Authentication:** None (no accounts)

**Permissions:** `react-native-permissions` for camera and photo library, gated in onboarding

## Decision Records

Architecture decisions are recorded in `.planning/adr/`. Relevant records for this codebase:

| ADR | Decision |
| --- | --- |
| [0001](../adr/0001-frame-signals-scoring-intake.md) | Bundle frame signals behind a typed scoring intake |
| [0002](../adr/0002-shot-analysis-seam.md) | Collapse shot analysis behind one deep module |
| [0003](../adr/0003-storage-wiring-point.md) | Centralize storage adapter selection behind a wiring point |
| [0004](../adr/0004-photo-review-extraction.md) | Extract the post-capture lifecycle into a deep hook |
| [0005](../adr/0005-camera-settings-hook.md) | Extract persisted camera settings into a focused hook |
| [0006](../adr/0006-capture-timing-module.md) | Absorb countdown timing into a deep timer module |
| [0007](../adr/0007-frame-pipeline-worklet.md) | Extract a shared worklet frame pipeline |
| [0008](../adr/0008-encrypted-storage-adapter.md) | Add a real encrypted adapter behind the PhotoStorage seam (superseded by 0003) |
| [0009](../adr/0009-telemetry-interface-shrink.md) | Shrink the telemetry tracker interface |

---

*Architecture analysis: 2026-08-03*
