# Architecture

**Analysis Date:** 2026-08-30

## Pattern Overview

**Overall:** Feature-oriented React Native application with a stateful app shell, a camera-screen orchestrator, and deep hook/interface seams around analysis, scoring, capture, persistence, and telemetry.

**Key Characteristics:**
- `App.tsx` implements navigation as a local-state screen state machine; there is no routing or global-state library.
- `src/screens/CameraScreen.tsx` composes camera concerns, while `src/shotAnalysis/useShotAnalysis.ts` hides the sensor/frame-analysis cluster behind one typed result.
- Domain folders expose hooks, pure algorithms, types, and small UI components; native services are isolated behind hooks or adapters.
- The independently deployed `website/` is a static HTML/CSS/JavaScript surface, not part of the React Native runtime.

## Layers

**Native bootstrap and app shell:**
- Purpose: Start the JavaScript application, gate onboarding, own cross-screen state, and route callbacks.
- Location: `index.js`, `App.tsx`
- Contains: `AppRegistry` registration, `AppScreen` state, selected mode, captured-photo payload, and session telemetry.
- Depends on: React Native, screens, onboarding storage, telemetry.
- Used by: Android and iOS native shells in `android/` and `ios/`.

**Presentation and orchestration:**
- Purpose: Render onboarding, mode selection, camera preview, review, and settings; translate user actions into domain-hook calls.
- Location: `src/screens/`, `src/screens/onboarding/`, `src/components/`, `src/coaching/`, `src/scoring/ScoreRing.tsx`, `src/faceDetection/*Overlay.tsx`, `src/autoCapture/CountdownOverlay.tsx`
- Contains: Screen components, overlays, prompt pill, score ring, and `src/screens/usePhotoReview.ts`.
- Depends on: Camera, analysis, scoring, storage, settings, telemetry, and native UI APIs.
- Used by: `App.tsx` and `src/screens/CameraScreen.tsx`.

**Camera and capture coordination:**
- Purpose: Resolve device/permissions/mode/settings, construct VisionCamera outputs, capture files, and coordinate single or burst auto-capture.
- Location: `src/camera/`, `src/autoCapture/`
- Contains: `useCameraPermission`, `useCameraMode`, `useCameraSettings`, `useModePrompts`, `usePhotoCapture`, and `useAutoCapture`.
- Depends on: VisionCamera, configuration, storage, haptics, scoring state.
- Used by: `src/screens/CameraScreen.tsx`.

**Shot-analysis composition:**
- Purpose: Turn motion sensors and camera frames into mode-aware signals and a shot-readiness result.
- Location: `src/shotAnalysis/useShotAnalysis.ts`
- Contains: Composition of horizon, stability, pitch, face, lighting, edge, document-skew, product-centering, and scoring hooks; collection of camera frame outputs.
- Depends on: `src/sensors/`, `src/faceDetection/`, `src/lighting/`, `src/edgeDetection/`, `src/documentDetection/`, `src/camera/useProductCentering.ts`, `src/scoring/`.
- Used by: `src/screens/CameraScreen.tsx`.

**Frame and sensor analysis:**
- Purpose: Acquire native motion/frame data and compute normalized domain observations.
- Location: `src/sensors/`, `src/framePipeline/`, `src/faceDetection/`, `src/lighting/`, `src/edgeDetection/`, `src/documentDetection/`
- Contains: Sensor subscriptions, pure analysis functions, VisionCamera frame outputs, face-detector integration, and the shared `useFramePipeline` lifecycle.
- Depends on: `react-native-sensors`, VisionCamera, face-detector native module, worklet-to-JS bridging.
- Used by: `src/shotAnalysis/useShotAnalysis.ts`.

**Scoring and coaching:**
- Purpose: Convert observations into weighted scores and select at most one actionable prompt.
- Location: `src/scoring/`, `src/coaching/`, `src/config/`
- Contains: `ScoreSignals`, pure algorithms and weights, throttled `useScoring`, mode thresholds/metadata, and prioritized/debounced coaching rules.
- Depends on: Analysis result types and mode configuration.
- Used by: Shot analysis, camera UI, auto-capture, and post-capture review.

**Persistence and telemetry:**
- Purpose: Save camera-roll photos and indexed metadata, persist settings/onboarding, manage encryption capability, and emit privacy-gated events.
- Location: `src/storage/`, `src/telemetry/`
- Contains: `PhotoStorage` interface, local/encrypted adapters, `photoStorage` wiring singleton, MMKV/AsyncStorage stores, keychain-backed encryption, `TelemetryTracker`, console/null providers, anonymous install ID.
- Depends on: Camera Roll, MMKV, AsyncStorage, Keychain.
- Used by: `App.tsx`, capture/review hooks, and settings screens.

**Static website and repository tooling:**
- Purpose: Publish marketing and architecture/ADR content and enforce/update repository artifacts.
- Location: `website/`, `scripts/`, `.github/workflows/`, `.planning/adr/`
- Contains: Static page assets, ADR-index generation, page diff/serve scripts, dead-export check, CI, and Pages deployment.
- Depends on: Node scripts and GitHub Actions, not the app runtime.
- Used by: Maintainers and GitHub Pages.

## Data Flow

**Launch and navigation:**
1. Native code invokes `index.js`, which registers `App.tsx` through `AppRegistry`.
2. `App.tsx` reads onboarding completion through `src/storage/onboarding.ts` and chooses onboarding or mode selection.
3. Callback props move the local `currentScreen`, `selectedMode`, and `capturedPhoto` state through mode selector → camera → review/settings.
4. `src/screens/onboarding/OnboardingNavigator.tsx` independently advances its three onboarding steps and persists completion.

**Live camera analysis and guidance:**
1. `src/screens/CameraScreen.tsx` resolves the rear camera and creates a `usePhotoOutput`.
2. `src/shotAnalysis/useShotAnalysis.ts` subscribes to accelerometer/gyroscope hooks and creates enabled face, lighting, and edge frame outputs.
3. Lighting and edge processors use `src/framePipeline/useFramePipeline.ts` to extract pixels, run pure analysis in a worklet, bridge results to JavaScript, and dispose every frame; face detection has its own YUV output/native detector path.
4. `useShotAnalysis` assembles a typed `ScoreSignals` object and `src/scoring/useScoring.ts` refreshes weighted scores at 10 Hz.
5. `src/coaching/useCoaching.ts` prioritizes/debounces observations into one prompt; overlays, `ScoreRing`, and haptics render feedback.
6. `src/autoCapture/useAutoCapture.ts` observes score/stability and advances countdown state; burst position advances only after `usePhotoCapture` acknowledges a persisted shot.

**Capture, persistence, and review:**
1. Manual shutter or auto-capture state calls `src/camera/usePhotoCapture.ts`.
2. `capturePhotoToFile` produces a file path; `photoStorage.save` stores it in Camera Roll and writes indexed metadata through the adapter selected in `src/storage/storageWiring.ts`.
3. A successful save acknowledges the auto-capture sequencer; failures reset it without advancing, and a synchronous guard prevents overlapping physical captures.
4. The callback lifts photo IDs, URI, subscores, and optional burst data into `App.tsx`, which renders `src/screens/PostCaptureScreen.tsx`.
5. `src/screens/usePhotoReview.ts` keeps the selected photo(s) or deletes discarded/non-selected records through the same `PhotoStorage` seam, then returns to camera. A failed Camera Roll deletion preserves metadata and keeps review open for retry.

**State Management:**
- Cross-screen state is local React state in `App.tsx`; screen and domain state lives in hooks.
- Settings and install ID are synchronous MMKV-backed module stores; onboarding uses AsyncStorage.
- `photoStorage` and `telemetry` are module-level singletons. No React Context, Redux, or Zustand is used in the current implementation.

## Key Abstractions

**`ShotAnalysisResult` / `useShotAnalysis`:**
- Purpose: Hide all live-analysis subscriptions and scoring intake from the camera screen.
- Examples: `src/shotAnalysis/useShotAnalysis.ts`, `src/shotAnalysis/index.ts`
- Pattern: Deep compositional hook returning data plus camera frame outputs.

**`ScoreSignals`:**
- Purpose: Stable typed boundary between analysis producers and pure scoring logic.
- Examples: `src/scoring/types.ts`, `src/scoring/algorithms.ts`, `src/scoring/useScoring.ts`
- Pattern: Data-transfer bundle consumed by pure functions and a throttling hook.

**`useFramePipeline`:**
- Purpose: Centralize VisionCamera frame lifecycle, worklet analysis, JS callback bridging, and disposal for lighting/edge consumers.
- Examples: `src/framePipeline/useFramePipeline.ts`, `src/lighting/useLightingFrameProcessor.ts`, `src/edgeDetection/useEdgeDetectionFrameOutput.ts`
- Pattern: Generic lifecycle adapter parameterized by an analyzer and result callback.

**`PhotoStorage`:**
- Purpose: Decouple capture/review from metadata persistence implementation.
- Examples: `src/storage/PhotoStorage.ts`, `src/storage/LocalPhotoStorage.ts`, `src/storage/EncryptedLocalPhotoStorage.ts`, `src/storage/storageWiring.ts`
- Pattern: Interface, adapters, and composition-root singleton; the local unencrypted adapter is currently selected.

**Telemetry provider:**
- Purpose: Keep event construction/opt-out logic independent of event delivery.
- Examples: `src/telemetry/types.ts`, `src/telemetry/index.ts`, `src/telemetry/ConsoleTelemetryProvider.ts`, `src/telemetry/NullTelemetryProvider.ts`
- Pattern: Provider strategy behind a global tracker.

## Entry Points

**React Native application:**
- Location: `index.js` → `App.tsx`
- Triggers: Android/iOS native app launch.
- Responsibilities: Register the root component, initialize onboarding routing, own screen/session state, and connect top-level telemetry.

**Camera feature:**
- Location: `src/screens/CameraScreen.tsx`
- Triggers: Selecting an enabled mode in `src/screens/ModeSelectorScreen.tsx`.
- Responsibilities: Attach photo/frame outputs to `Camera`, compose analysis/coaching/capture hooks, and render camera overlays and controls.

**Static site:**
- Location: `website/index.html`, `website/style.css`, `website/script.js`
- Triggers: Browser request to GitHub Pages.
- Responsibilities: Render marketing content and the ADR index; provide simple DOM interactions.

**Repository commands:**
- Location: `package.json`, `scripts/*.mjs`
- Triggers: Yarn scripts and GitHub Actions.
- Responsibilities: Typecheck/lint/test, regenerate ADR cards, compare Pages output, generate icons, and detect dead exports.

## Error Handling

**Strategy:** Fail soft at UI/native boundaries while using type-safe pure functions for deterministic domain logic.

**Patterns:**
- Async camera/storage operations use `try/catch`, log with `console.error`, and release busy/re-entrancy guards in `src/camera/usePhotoCapture.ts` and `src/screens/usePhotoReview.ts`.
- Frame processing uses `try/finally` to guarantee `frame.dispose()` in `src/framePipeline/useFramePipeline.ts`.
- Permission hooks/screens model checking, denied, blocked, and granted states and offer retry/settings actions.
- Native encryption availability is checked at runtime in `src/storage/encryptedStorage.ts`; telemetry falls back to a null provider in production.

## Cross-Cutting Concerns

**Logging:** Operational errors use `console.error`; development telemetry uses `ConsoleTelemetryProvider`, while production defaults to `NullTelemetryProvider`.

**Validation:** TypeScript types define module seams; mode/scoring thresholds are centralized in `src/config/modes.ts` and `src/scoring/weights.ts`; permission and native-capability checks provide runtime validation.

**Authentication:** None; the app has no accounts or remote backend.

**Privacy and permissions:** Camera/photo permissions are handled by onboarding and `src/camera/useCameraPermission.ts`; telemetry respects the MMKV opt-out and uses an anonymous install ID; storage encryption exists but is disabled by `src/storage/storageWiring.ts`.

---

*Architecture analysis: 2026-08-30 at `c38ed05`*
