# Architecture

**Analysis Date:** 2026-05-01

## Pattern Overview

**Overall:** Single-bundle React Native camera app with feature-sliced modules and hook-driven signal pipelines.

**Key Characteristics:**
- Manual in-app navigation is controlled by top-level React state in `App.tsx`; no React Navigation dependency is present in `package.json`.
- Camera experience is orchestrated in one smart screen, `src/screens/CameraScreen.tsx`, which composes feature hooks from `src/sensors/`, `src/faceDetection/`, `src/lighting/`, `src/edgeDetection/`, `src/scoring/`, `src/coaching/`, `src/autoCapture/`, `src/haptics/`, and `src/storage/`.
- Feature modules are organized as folders with `index.ts`, `types.ts`, pure functions, React hooks, and optional UI components, for example `src/scoring/index.ts`, `src/scoring/types.ts`, `src/scoring/useScoring.ts`, and `src/scoring/ScoreRing.tsx`.
- Native capabilities are wrapped behind React hooks and storage abstractions: VisionCamera in `src/screens/CameraScreen.tsx`, sensors in `src/sensors/useHorizonLevel.ts`, `src/sensors/useStability.ts`, and `src/sensors/usePitchDetection.ts`, Camera Roll/MMKV in `src/storage/LocalPhotoStorage.ts`, and permissions in `src/screens/CameraScreen.tsx` plus `src/screens/onboarding/PermissionsScreen.tsx`.
- Current real-time camera-frame analysis for face detection, lighting frame output, and edge frame output is partially stubbed for VisionCamera v5 migration in `src/faceDetection/useFaceDetection.ts`, `src/lighting/useLightingFrameProcessor.ts`, and `src/edgeDetection/useEdgeDetectionFrameOutput.ts`.

## Layers

**App Shell / Navigation Layer:**
- Purpose: Owns app boot, onboarding check, selected mode, captured-photo state, and screen transitions.
- Location: `App.tsx`
- Contains: `AppScreen` union, `CapturedPhotoData`, `BurstPhoto`, callbacks for mode selection, camera exit, capture, save/discard, and settings navigation.
- Depends on: `src/screens/CameraScreen.tsx`, `src/screens/ModeSelectorScreen.tsx`, `src/screens/onboarding/OnboardingNavigator.tsx`, `src/screens/PostCaptureScreen.tsx`, `src/screens/SettingsScreen.tsx`, `src/storage/onboarding.ts`, and `src/telemetry/index.ts`.
- Used by: React Native registration in `index.js` through `AppRegistry.registerComponent(appName, () => App)`.

**Screen Layer:**
- Purpose: Presents full-screen user flows and binds feature modules into user-facing experiences.
- Location: `src/screens/`
- Contains: Camera capture flow in `src/screens/CameraScreen.tsx`, mode selection in `src/screens/ModeSelectorScreen.tsx`, post-capture review in `src/screens/PostCaptureScreen.tsx`, settings in `src/screens/SettingsScreen.tsx`, and onboarding under `src/screens/onboarding/`.
- Depends on: UI components from `src/components/`, feature modules from `src/autoCapture/`, `src/coaching/`, `src/faceDetection/`, `src/haptics/`, `src/lighting/`, `src/scoring/`, `src/sensors/`, `src/storage/`, and platform APIs from `react-native-permissions`, `react-native-vision-camera`, `react-native-safe-area-context`, and `react-native-gesture-handler`.
- Used by: `App.tsx` for app navigation and state transitions.

**Feature Signal Layer:**
- Purpose: Converts device/camera inputs and mode configuration into normalized domain signals.
- Location: `src/sensors/`, `src/faceDetection/`, `src/lighting/`, `src/edgeDetection/`, `src/documentDetection/`, and `src/aestheticModel/`
- Contains: Horizon roll and level detection in `src/sensors/useHorizonLevel.ts`, stability windows in `src/sensors/useStability.ts`, pitch/flat-lay detection in `src/sensors/usePitchDetection.ts`, face framing utilities in `src/faceDetection/types.ts`, lighting classification in `src/lighting/useLighting.ts`, dominant-line detection state in `src/edgeDetection/useEdgeDetection.ts`, document skew helpers in `src/documentDetection/types.ts`, and optional aesthetic model preprocessing/loading in `src/aestheticModel/useAestheticFrameProcessor.ts` and `src/aestheticModel/modelLoader.ts`.
- Depends on: `react-native-sensors`, VisionCamera frame-output concepts, and pure utility modules such as `src/sensors/math.ts`, `src/lighting/types.ts`, `src/edgeDetection/types.ts`, and `src/scoring/types.ts`.
- Used by: `src/screens/CameraScreen.tsx`, `src/scoring/useScoring.ts`, and `src/coaching/useCoaching.ts`.

**Decision / Coaching Layer:**
- Purpose: Turns normalized signals into score, readiness, prompt, auto-capture, and haptic decisions.
- Location: `src/scoring/`, `src/coaching/`, `src/autoCapture/`, and `src/haptics/`
- Contains: Pure scoring functions and weights in `src/scoring/types.ts`, live 10 Hz scoring orchestration in `src/scoring/useScoring.ts`, prompt priorities in `src/coaching/types.ts`, prompt debouncing in `src/coaching/useCoaching.ts`, countdown/burst state in `src/autoCapture/useAutoCapture.ts`, and ready/capture haptic triggers in `src/haptics/useHaptics.ts`.
- Depends on: Signal types from `src/faceDetection/types.ts`, `src/lighting/types.ts`, and `src/edgeDetection/types.ts`, plus haptic primitives in `src/haptics/haptics.ts`.
- Used by: `src/screens/CameraScreen.tsx`, `src/coaching/PromptPill.tsx`, `src/scoring/ScoreRing.tsx`, and `src/autoCapture/CountdownOverlay.tsx`.

**Presentation Overlay Layer:**
- Purpose: Renders non-capturing camera guides and feedback overlays over the native camera preview.
- Location: `src/components/`, `src/faceDetection/`, `src/coaching/`, `src/scoring/`, and `src/autoCapture/`
- Contains: Rule-of-thirds grid in `src/components/CompositionOverlay.tsx`, horizon line in `src/components/HorizonIndicator.tsx`, face and group boxes in `src/faceDetection/FaceOverlay.tsx` and `src/faceDetection/GroupFaceOverlay.tsx`, prompt pill in `src/coaching/PromptPill.tsx`, score ring in `src/scoring/ScoreRing.tsx`, and countdown overlay in `src/autoCapture/CountdownOverlay.tsx`.
- Depends on: React Native `View`, `Text`, `Animated`, `TouchableOpacity`, and normalized signal props passed from `src/screens/CameraScreen.tsx`.
- Used by: `src/screens/CameraScreen.tsx`.

**Persistence / Integration Layer:**
- Purpose: Persists onboarding, settings, telemetry IDs, and captured photo metadata while integrating with native device storage.
- Location: `src/storage/` and `src/telemetry/`
- Contains: AsyncStorage onboarding state in `src/storage/onboarding.ts`, MMKV settings in `src/storage/settings.ts`, Camera Roll photo persistence and MMKV metadata in `src/storage/LocalPhotoStorage.ts`, photo storage interface in `src/storage/PhotoStorage.ts`, telemetry tracker in `src/telemetry/index.ts`, and console provider in `src/telemetry/ConsoleTelemetryProvider.ts`.
- Depends on: `@react-native-async-storage/async-storage`, `react-native-mmkv`, `@react-native-camera-roll/camera-roll`, and console logging.
- Used by: `App.tsx`, `src/screens/CameraScreen.tsx`, `src/screens/PostCaptureScreen.tsx`, `src/screens/SettingsScreen.tsx`, and onboarding components in `src/screens/onboarding/`.

**Configuration Layer:**
- Purpose: Centralizes mode definitions, thresholds, feature flags, and display metadata.
- Location: `src/config/`
- Contains: `Mode` union, `MODES`, `ModeConfig`, and per-mode threshold records in `src/config/modes.ts`; emoji/title/description metadata in `src/config/modeMetadata.ts`; barrel exports in `src/config/index.ts`.
- Depends on: TypeScript only.
- Used by: `src/screens/ModeSelectorScreen.tsx`, `src/screens/CameraScreen.tsx`, and tests such as `__tests__/modes.test.ts`.

## Data Flow

**Application Startup and Navigation Flow:**
1. `index.js` registers the root component from `App.tsx` using `AppRegistry.registerComponent` and `app.json`.
2. `App.tsx` calls `isOnboardingComplete()` from `src/storage/onboarding.ts` during initial `useEffect` and switches `currentScreen` between `"onboarding"` and `"modeSelector"`.
3. `src/screens/onboarding/OnboardingNavigator.tsx` sequences `ConceptScreen`, `ModesScreen`, and `PermissionsScreen`, then persists completion through `setOnboardingComplete()` in `src/storage/onboarding.ts`.
4. `src/screens/ModeSelectorScreen.tsx` renders `MODES` from `src/config/modes.ts` and calls `App.tsx` `handleModeSelected`, which tracks `mode_selected` through `src/telemetry/index.ts` and opens `src/screens/CameraScreen.tsx`.
5. Camera capture routes to `src/screens/PostCaptureScreen.tsx`; save/discard callbacks in `App.tsx` return to `src/screens/CameraScreen.tsx`, while settings callbacks open `src/screens/SettingsScreen.tsx`.

**Live Camera Coaching Flow:**
1. `src/screens/CameraScreen.tsx` reads current `ModeConfig` via `getModeConfig(mode)` from `src/config/modes.ts` and display metadata via `getModeMetadata(mode)` from `src/config/modeMetadata.ts`.
2. Device sensors produce horizon, stability, and pitch signals through `src/sensors/useHorizonLevel.ts`, `src/sensors/useStability.ts`, and `src/sensors/usePitchDetection.ts`.
3. Camera/frame-analysis modules produce face, lighting, edge, document, and product-mode heuristic signals through `src/faceDetection/useFaceDetection.ts`, `src/lighting/useLighting.ts`, `src/edgeDetection/useEdgeDetection.ts`, `src/documentDetection/types.ts`, and local memoized product logic in `src/screens/CameraScreen.tsx`.
4. `src/scoring/useScoring.ts` samples the latest signals at target FPS and calls `computeScore()` from `src/scoring/types.ts` to produce `score`, `subScores`, `weakestSubscore`, and readiness threshold status.
5. `src/coaching/useCoaching.ts` builds a `CoachingSignals` object and selects one prompt through `selectPrompt()` in `src/coaching/types.ts`, then debounces prompt changes.
6. `src/screens/CameraScreen.tsx` passes the outputs to `src/components/CompositionOverlay.tsx`, `src/components/HorizonIndicator.tsx`, `src/faceDetection/FaceOverlay.tsx` or `src/faceDetection/GroupFaceOverlay.tsx`, `src/coaching/PromptPill.tsx`, `src/scoring/ScoreRing.tsx`, and `src/autoCapture/CountdownOverlay.tsx`.

**Photo Capture and Persistence Flow:**
1. `src/autoCapture/useAutoCapture.ts` transitions from `idle` to `counting` to `capturing` when `score >= autoCaptureThreshold` and `isStable`.
2. Manual shutter in `src/screens/CameraScreen.tsx` cancels countdown and calls `capturePhoto(0)`; automatic capture is triggered by the `captureState === "capturing"` effect in `src/screens/CameraScreen.tsx`.
3. `capturePhoto()` in `src/screens/CameraScreen.tsx` uses VisionCamera v5 `photoOutput.capturePhotoToFile()` and receives `photoFile.filePath`.
4. `src/storage/LocalPhotoStorage.ts` saves the path to Camera Roll via `CameraRoll.saveAsset()` and writes metadata to MMKV under `@photo_metadata`.
5. `App.tsx` receives `onPhotoCaptured`, tracks `shot_captured` or `auto_captured` through `src/telemetry/index.ts`, stores `CapturedPhotoData`, and renders `src/screens/PostCaptureScreen.tsx`.
6. `src/screens/PostCaptureScreen.tsx` displays the saved image, annotates the weakest subscore, and deletes discarded photos through `photoStorage.delete()` from `src/storage/LocalPhotoStorage.ts`.

**Settings and Privacy Flow:**
1. `src/screens/SettingsScreen.tsx` initializes UI state from `src/storage/settings.ts` getters for auto-capture, haptics, score visibility, and telemetry opt-out.
2. Toggle handlers in `src/screens/SettingsScreen.tsx` update MMKV through `setAutoCaptureEnabled()`, `setHapticFeedbackEnabled()`, `setScoreVisibilityEnabled()`, and `setTelemetryOptOut()`.
3. `src/telemetry/index.ts` reads the same `@telemetry_opt_out` key from MMKV before emitting events through `TelemetryTracker.track()`.
4. `src/screens/CameraScreen.tsx` reads camera-related settings on mount to configure auto-capture, haptics, and score ring visibility.

**State Management:**
- Top-level route-like state is local React state in `App.tsx`: `currentScreen`, `selectedMode`, `capturedPhoto`, `isLoading`, and `sessionStartTimeRef`.
- Feature runtime state is colocated in hooks: `src/scoring/useScoring.ts` stores score/breakdown, `src/coaching/useCoaching.ts` stores displayed prompt and debounce timers, `src/autoCapture/useAutoCapture.ts` stores countdown and burst state, `src/lighting/useLighting.ts` stores lighting class/stats, and `src/edgeDetection/useEdgeDetection.ts` stores dominant-line result/frame stats.
- Persistent settings use synchronous MMKV in `src/storage/settings.ts`; onboarding completion uses AsyncStorage in `src/storage/onboarding.ts`; photo metadata uses MMKV in `src/storage/LocalPhotoStorage.ts`; telemetry install ID uses MMKV in `src/telemetry/index.ts`.
- No global Zustand store or React Context state container is present in the inspected source; state is React hooks plus storage modules.

## Key Abstractions

**Mode and ModeConfig:**
- Purpose: Encodes per-shooting-mode thresholds, feature toggles, and countdown timing.
- Examples: `src/config/modes.ts`, `src/config/modeMetadata.ts`, `src/screens/ModeSelectorScreen.tsx`, `src/screens/CameraScreen.tsx`.
- Pattern: Static configuration record keyed by `Mode` union, consumed by screen orchestration and tests.

**Feature Hook + Pure Types Module:**
- Purpose: Keeps React subscription/state logic separate from deterministic calculations and exported types.
- Examples: `src/scoring/useScoring.ts` with `src/scoring/types.ts`, `src/coaching/useCoaching.ts` with `src/coaching/types.ts`, `src/autoCapture/useAutoCapture.ts` with `src/autoCapture/types.ts`, `src/sensors/useStability.ts` with `src/sensors/math.ts`, and `src/documentDetection/index.ts` with `src/documentDetection/types.ts`.
- Pattern: Hooks orchestrate timers/subscriptions and call pure functions; tests can import the pure functions directly from module `types.ts` or `math.ts`.

**Camera Output Assembly:**
- Purpose: Combines VisionCamera v5 outputs into one memoized outputs array for capture and optional frame processing.
- Examples: `src/screens/CameraScreen.tsx`, `src/lighting/useLightingFrameProcessor.ts`, `src/edgeDetection/useEdgeDetectionFrameOutput.ts`.
- Pattern: `usePhotoOutput()` is always included; nullable frame-output hooks are conditionally appended in `cameraOutputs`.

**Prompt Selection:**
- Purpose: Guarantees at most one visible coaching prompt from many signal sources.
- Examples: `src/coaching/types.ts`, `src/coaching/useCoaching.ts`, `src/coaching/PromptPill.tsx`, `src/screens/CameraScreen.tsx`.
- Pattern: Pure priority chain in `selectPrompt()` followed by hook-level debounce and animated presentation.

**Scoring Model:**
- Purpose: Converts heterogeneous signals into weighted subscores and an overall readiness score.
- Examples: `src/scoring/types.ts`, `src/scoring/useScoring.ts`, `src/scoring/ScoreRing.tsx`, `src/screens/PostCaptureScreen.tsx`.
- Pattern: Rules-only or optional hybrid model with mode-specific weights, periodic recomputation, and weakest-subscore annotation.

**PhotoStorage Interface:**
- Purpose: Abstracts photo persistence and metadata handling away from camera and post-capture UI.
- Examples: `src/storage/PhotoStorage.ts`, `src/storage/LocalPhotoStorage.ts`, `src/screens/CameraScreen.tsx`, `src/screens/PostCaptureScreen.tsx`.
- Pattern: Interface plus singleton local implementation backed by Camera Roll and MMKV.

**TelemetryTracker and Provider:**
- Purpose: Centralizes event creation, anonymous install ID, opt-out behavior, and provider substitution.
- Examples: `src/telemetry/index.ts`, `src/telemetry/ConsoleTelemetryProvider.ts`, `src/telemetry/types.ts`, `App.tsx`, `src/screens/SettingsScreen.tsx`.
- Pattern: Class-based facade with a pluggable provider and a global singleton export.

**Onboarding Mini-Navigator:**
- Purpose: Implements a local multi-step onboarding flow without app-wide navigation dependencies.
- Examples: `src/screens/onboarding/OnboardingNavigator.tsx`, `src/screens/onboarding/ConceptScreen.tsx`, `src/screens/onboarding/ModesScreen.tsx`, `src/screens/onboarding/PermissionsScreen.tsx`.
- Pattern: Local `OnboardingStep` union and switch statement backed by AsyncStorage completion state.

## Entry Points

**Native JavaScript Entry:**
- Location: `index.js`
- Triggers: React Native app launch on iOS/Android.
- Responsibilities: Imports `App.tsx`, reads app name from `app.json`, and registers the root component with `AppRegistry.registerComponent`.

**Root React Component:**
- Location: `App.tsx`
- Triggers: Registered component render after `index.js` bootstraps the bundle.
- Responsibilities: Provides `SafeAreaProvider`, shows loading state, checks onboarding completion, renders the active screen, tracks session/mode/capture telemetry, and passes navigation callbacks between screens.

**Camera Experience Entry:**
- Location: `src/screens/CameraScreen.tsx`
- Triggers: `App.tsx` renders it when `currentScreen === "camera"` and `selectedMode` is non-null.
- Responsibilities: Checks camera permission, chooses camera device, constructs VisionCamera outputs, composes all sensor/analysis/coaching/scoring hooks, renders overlays, handles manual and auto-capture, saves photos, and reports capture results to `App.tsx`.

**Onboarding Entry:**
- Location: `src/screens/onboarding/OnboardingNavigator.tsx`
- Triggers: `App.tsx` renders it when onboarding is incomplete.
- Responsibilities: Manages onboarding step state, presents concept/mode/permission screens, and persists completion through `src/storage/onboarding.ts`.

**Mode Selection Entry:**
- Location: `src/screens/ModeSelectorScreen.tsx`
- Triggers: `App.tsx` renders it after onboarding or returning from camera.
- Responsibilities: Lists `MODES` from `src/config/modes.ts`, shows metadata from `src/config/modeMetadata.ts`, prevents disabled mode selection, and invokes `onModeSelected(mode)`.

**Post-Capture Entry:**
- Location: `src/screens/PostCaptureScreen.tsx`
- Triggers: `App.tsx` renders it after `onPhotoCaptured` receives a saved photo from `src/screens/CameraScreen.tsx`.
- Responsibilities: Displays captured image, supports burst carousel, shows before/after annotation based on weakest subscore, keeps selected burst photos, or deletes discarded photos through `photoStorage`.

**Settings Entry:**
- Location: `src/screens/SettingsScreen.tsx`
- Triggers: Settings button callback from `src/screens/CameraScreen.tsx` routed through `App.tsx`.
- Responsibilities: Reads and writes camera/privacy preferences via `src/storage/settings.ts` and telemetry opt-out via `src/telemetry/index.ts`.

## Error Handling

**Strategy:** Local try/catch around native IO and permission operations with defensive fallbacks that keep the UI usable.

**Patterns:**
- Permission checks in `src/screens/CameraScreen.tsx` catch failures and set `permissionStatus` to `"error"`, then render a retry UI.
- Photo capture in `src/screens/CameraScreen.tsx` catches failures from VisionCamera or storage, logs `console.error("Failed to capture photo:", error)`, and resets capture state when appropriate.
- Post-capture save/discard in `src/screens/PostCaptureScreen.tsx` catches storage errors, logs failures, and still exits on discard to avoid trapping the user.
- `src/storage/LocalPhotoStorage.ts` throws when Camera Roll save returns no asset ID, catches malformed JSON metadata by logging and returning an empty list, and warns without failing if Camera Roll deletion fails.
- Sensor subscriptions in `src/sensors/useHorizonLevel.ts`, `src/sensors/useStability.ts`, and `src/sensors/usePitchDetection.ts` log subscription errors and unsubscribe in cleanup.
- Optional ML loading in `src/aestheticModel/modelLoader.ts` logs expected/unexpected model load failures and falls back to rules-only scoring rather than throwing.
- Onboarding storage in `src/storage/onboarding.ts` swallows AsyncStorage failures and falls back to showing onboarding again.

## Cross-Cutting Concerns

**Logging:** Console logging is used directly for native/processing diagnostics in `src/screens/CameraScreen.tsx`, `src/screens/PostCaptureScreen.tsx`, `src/storage/LocalPhotoStorage.ts`, `src/sensors/useHorizonLevel.ts`, `src/sensors/useStability.ts`, `src/sensors/usePitchDetection.ts`, and `src/aestheticModel/modelLoader.ts`; telemetry events are logged by `src/telemetry/ConsoleTelemetryProvider.ts` through `TelemetryTracker` in `src/telemetry/index.ts`.

**Validation:** Runtime validation is mostly threshold-based and defensive: mode feature flags/thresholds live in `src/config/modes.ts`, score inputs are clamped/weighted in `src/scoring/types.ts`, prompt selection filters by `CoachingContext` in `src/coaching/types.ts`, auto-capture requires `score >= threshold && isStable` in `src/autoCapture/types.ts`, and permission status is normalized in `src/screens/CameraScreen.tsx` and `src/screens/onboarding/PermissionsScreen.tsx`.

**Authentication:** No authentication layer is present; the app is local-first. Privacy controls are limited to telemetry opt-out in `src/screens/SettingsScreen.tsx`, `src/storage/settings.ts`, and `src/telemetry/index.ts`; stored photo metadata and settings are local device data.

---

*Architecture analysis: 2026-05-01*
