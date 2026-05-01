# Codebase Structure

**Analysis Date:** 2026-05-01

## Directory Layout

```
2026-04-27-ai-photo-coach/
├── App.tsx # Root React component, manual screen routing, session/capture telemetry
├── index.js # React Native JavaScript entry registered with AppRegistry
├── app.json # Native app name consumed by index.js
├── package.json # Node/Yarn scripts and React Native dependencies
├── tsconfig.json # TypeScript config extending @react-native/typescript-config
├── jest.config.js # Jest preset and native module mock mapping
├── jest.setup.js # Jest runtime setup
├── babel.config.js # React Native Babel preset
├── metro.config.js # Metro bundler config
├── prek.toml # Pre-commit/prek hook config
├── justfile # Local command shortcuts
├── android/ # Native Android React Native project
├── ios/ # Native iOS React Native project and CocoaPods files
├── assets/ # Logo, splash, and preview static assets
├── src/ # TypeScript application source, feature-sliced by domain
│   ├── aestheticModel/ # Optional aesthetic model preprocessing/loading/frame processing
│   ├── autoCapture/ # Countdown overlay, auto-capture state machine, types
│   ├── coaching/ # Prompt selection, debounce hook, PromptPill UI
│   ├── components/ # Generic camera overlays shared across modes
│   ├── config/ # Mode metadata and per-mode thresholds/feature flags
│   ├── documentDetection/ # Document skew detection utilities
│   ├── edgeDetection/ # Dominant-line detection state and frame-output stub
│   ├── faceDetection/ # Face types, framing utilities, overlays, detection stub
│   ├── haptics/ # Haptic events, rate limiting, React hook
│   ├── lighting/ # Lighting analysis state, types, frame-output stub
│   ├── scoring/ # Readiness scoring engine, hook, ScoreRing UI
│   ├── screens/ # App screens and onboarding sub-flow
│   ├── sensors/ # Accelerometer/gyroscope hooks and math helpers
│   ├── storage/ # Onboarding, settings, photo persistence abstractions
│   └── telemetry/ # Telemetry events, tracker, console provider
├── __tests__/ # Jest unit and component tests
├── __mocks__/ # Jest mocks for native modules and storage/camera dependencies
├── scripts/ralph/ # Ralph autonomous-agent workflow files and PRD/progress artifacts
├── tasks/ # Product requirements/task documentation
├── .planning/codebase/ # Generated codebase-map documents
├── README.md # Product overview and setup notes
├── README_RN.md # React Native generated/project notes
├── SECURITY.md # Telemetry and storage security model
├── AGENTS.md # Project-specific agent/development instructions
├── CLAUDE.md # Claude-specific project guidance
├── Gemfile # Ruby tooling dependencies for native iOS workflow
└── yarn.lock # Locked JavaScript dependency graph
```

## Directory Purposes

**`src/screens/`:**
- Purpose: Full-screen application flows and screen-level orchestration.
- Contains: `src/screens/CameraScreen.tsx`, `src/screens/ModeSelectorScreen.tsx`, `src/screens/PostCaptureScreen.tsx`, `src/screens/SettingsScreen.tsx`, plus onboarding screens under `src/screens/onboarding/`.
- Key files: `src/screens/CameraScreen.tsx` composes camera hooks/overlays; `src/screens/PostCaptureScreen.tsx` handles photo review/save/discard; `src/screens/onboarding/OnboardingNavigator.tsx` manages onboarding steps.

**`src/screens/onboarding/`:**
- Purpose: Local onboarding mini-flow shown before mode selection.
- Contains: Step components and local step navigator.
- Key files: `src/screens/onboarding/OnboardingNavigator.tsx`, `src/screens/onboarding/ConceptScreen.tsx`, `src/screens/onboarding/ModesScreen.tsx`, and `src/screens/onboarding/PermissionsScreen.tsx`.

**`src/config/`:**
- Purpose: Central static configuration for shooting modes and UI metadata.
- Contains: Mode union, mode list, thresholds, feature flags, countdown timing, and emoji/title/description metadata.
- Key files: `src/config/modes.ts`, `src/config/modeMetadata.ts`, and `src/config/index.ts`.

**`src/components/`:**
- Purpose: Generic reusable overlays independent of a specific feature detector.
- Contains: Camera composition and horizon UI.
- Key files: `src/components/CompositionOverlay.tsx` and `src/components/HorizonIndicator.tsx`.

**`src/sensors/`:**
- Purpose: Native sensor subscriptions and pure sensor math for horizon, stability, and pitch.
- Contains: Accelerometer/gyroscope hooks, low-pass filtering, roll/pitch calculations, flat-lay scoring, and stability computation.
- Key files: `src/sensors/useHorizonLevel.ts`, `src/sensors/useStability.ts`, `src/sensors/usePitchDetection.ts`, `src/sensors/math.ts`, and `src/sensors/index.ts`.

**`src/faceDetection/`:**
- Purpose: Face detection domain model, framing analysis, and visual face overlays.
- Contains: Normalized face bounds, primary-face selection, portrait/group framing helpers, overlays, and current VisionCamera v5 detection stub.
- Key files: `src/faceDetection/types.ts`, `src/faceDetection/useFaceDetection.ts`, `src/faceDetection/FaceOverlay.tsx`, `src/faceDetection/GroupFaceOverlay.tsx`, and `src/faceDetection/index.ts`.

**`src/lighting/`:**
- Purpose: Lighting statistics classification and user prompts.
- Contains: Lighting types/pure classifiers, React state hook, and frame-output bridge stub.
- Key files: `src/lighting/types.ts`, `src/lighting/useLighting.ts`, `src/lighting/useLightingFrameProcessor.ts`, and `src/lighting/index.ts`.

**`src/edgeDetection/`:**
- Purpose: Dominant-line analysis for travel framing and reusable frame stats for document mode.
- Contains: Edge/dominant-line types, state hook, and frame-output bridge stub.
- Key files: `src/edgeDetection/types.ts`, `src/edgeDetection/useEdgeDetection.ts`, `src/edgeDetection/useEdgeDetectionFrameOutput.ts`, and `src/edgeDetection/index.ts`.

**`src/documentDetection/`:**
- Purpose: Document-mode skew, flatness, and corner-estimation logic built on edge stats.
- Contains: Document skew result/corner types and pure functions.
- Key files: `src/documentDetection/types.ts` and `src/documentDetection/index.ts`.

**`src/coaching/`:**
- Purpose: Converts current signals into one user-facing coaching prompt.
- Contains: Prompt constants, selection priority, readiness helper, debounce hook, and prompt UI.
- Key files: `src/coaching/types.ts`, `src/coaching/useCoaching.ts`, `src/coaching/PromptPill.tsx`, and `src/coaching/index.ts`.

**`src/scoring/`:**
- Purpose: Live shot-readiness scoring, score breakdown state, and score display.
- Contains: Score signal/subscore types, pure score functions and mode weights, 10 Hz scoring hook, and ring UI.
- Key files: `src/scoring/types.ts`, `src/scoring/useScoring.ts`, `src/scoring/ScoreRing.tsx`, and `src/scoring/index.ts`.

**`src/autoCapture/`:**
- Purpose: Auto-capture countdown and burst-mode state management.
- Contains: Countdown state types, `canStartAutoCapture()` pure helper, auto-capture hook, and countdown overlay.
- Key files: `src/autoCapture/types.ts`, `src/autoCapture/useAutoCapture.ts`, `src/autoCapture/CountdownOverlay.tsx`, and `src/autoCapture/index.ts`.

**`src/haptics/`:**
- Purpose: Haptic event rate limiting and capture/ready feedback.
- Contains: Haptic event types, platform haptic trigger helpers, and React hook.
- Key files: `src/haptics/haptics.ts`, `src/haptics/useHaptics.ts`, `src/haptics/types.ts`, and `src/haptics/index.ts`.

**`src/storage/`:**
- Purpose: Local persistence for photos, metadata, settings, and onboarding.
- Contains: Photo storage interface and local implementation, MMKV settings, and AsyncStorage onboarding helpers.
- Key files: `src/storage/PhotoStorage.ts`, `src/storage/LocalPhotoStorage.ts`, `src/storage/settings.ts`, `src/storage/onboarding.ts`, and `src/storage/index.ts`.

**`src/telemetry/`:**
- Purpose: Anonymous telemetry event payloads, opt-out-aware tracker, and MVP console provider.
- Contains: Event/property types, telemetry payload creation, global tracker, install ID storage, and provider interface.
- Key files: `src/telemetry/types.ts`, `src/telemetry/index.ts`, and `src/telemetry/ConsoleTelemetryProvider.ts`.

**`src/aestheticModel/`:**
- Purpose: Optional aesthetic scoring model support and fallback behavior.
- Contains: Model/frame data types, preprocessing/rate limiting, model loading stub, and hook for model frame processing.
- Key files: `src/aestheticModel/types.ts`, `src/aestheticModel/modelLoader.ts`, `src/aestheticModel/useAestheticFrameProcessor.ts`, and `src/aestheticModel/index.ts`.

**`__tests__/`:**
- Purpose: Jest tests for hooks, pure functions, storage, components, screens, and mode-specific behavior.
- Contains: Flat test files matching feature names rather than mirrored source directories.
- Key files: `__tests__/App.test.tsx`, `__tests__/scoring.test.ts`, `__tests__/coaching.test.ts`, `__tests__/CameraScreen`-related coverage through feature tests, and mode tests such as `__tests__/documentMode.test.ts`, `__tests__/productMode.test.ts`, and `__tests__/groupPhoto.test.ts`.

**`__mocks__/`:**
- Purpose: Jest module replacements for native React Native packages.
- Contains: Mock files mapped by `jest.config.js`.
- Key files: `__mocks__/react-native-vision-camera.js`, `__mocks__/react-native-sensors.js`, `__mocks__/react-native-mmkv.ts`, `__mocks__/@react-native-camera-roll/camera-roll.ts`, `__mocks__/react-native-permissions.js`, and `__mocks__/react-native-gesture-handler.ts`.

**`android/`:**
- Purpose: Native Android project generated/configured by React Native.
- Contains: Gradle config, app module, signing/debug key, and Android native source tree.
- Key files: `android/build.gradle`, `android/settings.gradle`, `android/app/build.gradle`, `android/app/proguard-rules.pro`, and `android/gradle.properties`.

**`ios/`:**
- Purpose: Native iOS project and CocoaPods configuration.
- Contains: Xcode project/workspace, Swift app delegate, Info.plist, launch screen, privacy manifest, Podfile, and lockfile.
- Key files: `ios/Podfile`, `ios/Podfile.lock`, `ios/AIPhotoCoach/AppDelegate.swift`, `ios/AIPhotoCoach/Info.plist`, and `ios/AIPhotoCoach/PrivacyInfo.xcprivacy`.

**`assets/`:**
- Purpose: Static product assets and generated preview/icon/splash resources.
- Contains: Logo SVGs, splash SVG/PNGs, and preview HTML.
- Key files: `assets/logo/logo.svg`, `assets/logo/logo-icon.svg`, `assets/splash/splash-screen.svg`, `assets/splash/splash-screen-tablet.svg`, `assets/preview.html`, and `assets/README.md`.

**`scripts/ralph/`:**
- Purpose: Ralph autonomous-agent workflow configuration and product tracking artifacts.
- Contains: PRD JSON, progress log, prompts, and shell entrypoint.
- Key files: `scripts/ralph/prd.json`, `scripts/ralph/progress.txt`, `scripts/ralph/prompt-opencode.md`, `scripts/ralph/prompt-pi.md`, and `scripts/ralph/ralph.sh`.

## Key File Locations

**Entry Points:**
- `index.js`: Native JavaScript entry that registers `App.tsx` with React Native.
- `App.tsx`: Root UI state machine and screen routing.
- `src/screens/CameraScreen.tsx`: Main camera and real-time coaching entry for selected mode.
- `src/screens/onboarding/OnboardingNavigator.tsx`: Entry for the onboarding sub-flow.

**Configuration:**
- `package.json`: Scripts (`android`, `ios`, `lint`, `start`, `test`, `typecheck`), dependencies, and Node engine.
- `tsconfig.json`: TypeScript include/exclude and Jest type configuration.
- `jest.config.js`: Jest preset, native mock mappings, and transform ignore pattern.
- `babel.config.js`: Babel preset for React Native.
- `metro.config.js`: Metro configuration merged with default React Native config.
- `app.json`: App display/name metadata used by `index.js`.
- `src/config/modes.ts`: Per-mode thresholds and feature toggles.
- `src/config/modeMetadata.ts`: Mode display metadata.
- `ios/Podfile`: iOS CocoaPods and deployment-target configuration.
- `android/app/build.gradle`: Android app module build configuration.

**Core Logic:**
- `src/screens/CameraScreen.tsx`: Orchestrates sensors, frame-analysis stubs, scoring, coaching, auto-capture, haptics, storage, and overlays.
- `src/sensors/math.ts`: Pure sensor math for roll, pitch, low-pass filtering, and stability calculations.
- `src/scoring/types.ts`: Pure scoring functions, weights, thresholds, and subscore types.
- `src/scoring/useScoring.ts`: Live scoring hook that recomputes score on an interval.
- `src/coaching/types.ts`: Pure prompt-priority logic and readiness helper.
- `src/coaching/useCoaching.ts`: Debounced prompt hook.
- `src/autoCapture/types.ts`: Auto-capture state types and pure `canStartAutoCapture()` helper.
- `src/autoCapture/useAutoCapture.ts`: Countdown and burst state machine.
- `src/faceDetection/types.ts`: Face framing/group framing calculations.
- `src/lighting/types.ts`: Lighting classification and prompt helpers.
- `src/edgeDetection/types.ts`: Dominant-line analysis primitives.
- `src/documentDetection/types.ts`: Document skew detection and corner estimation.
- `src/storage/LocalPhotoStorage.ts`: Camera Roll and MMKV photo metadata persistence.
- `src/telemetry/index.ts`: Global telemetry tracker and opt-out logic.

**Testing:**
- `__tests__/App.test.tsx`: Root app rendering/navigation tests.
- `__tests__/scoring.test.ts`: Scoring engine tests.
- `__tests__/coaching.test.ts`: Prompt selection/debounce tests.
- `__tests__/sensors.test.ts`, `__tests__/useStability.test.ts`, and `__tests__/pitchDetection.test.ts`: Sensor and math tests.
- `__tests__/lighting.test.ts` and `__tests__/useLighting.test.ts`: Lighting classifier/hook tests.
- `__tests__/edgeDetection.test.ts`: Dominant-line detection tests.
- `__tests__/faceDetection.test.ts` and `__tests__/groupPhoto.test.ts`: Face and group framing tests.
- `__tests__/LocalPhotoStorage.test.ts`: Photo persistence tests.
- `__tests__/settings.test.ts` and `__tests__/SettingsScreen.test.tsx`: Settings storage/UI tests.
- `__mocks__/`: Native module mocks referenced by `jest.config.js`.

## Naming Conventions

**Files:**
- `PascalCase.tsx`: React screen and UI components, for example `src/screens/CameraScreen.tsx`, `src/components/CompositionOverlay.tsx`, `src/scoring/ScoreRing.tsx`, and `src/coaching/PromptPill.tsx`.
- `useFeature.ts`: React hooks, for example `src/sensors/useHorizonLevel.ts`, `src/scoring/useScoring.ts`, `src/coaching/useCoaching.ts`, `src/autoCapture/useAutoCapture.ts`, and `src/haptics/useHaptics.ts`.
- `types.ts`: Feature-local types, constants, and pure helpers, for example `src/scoring/types.ts`, `src/coaching/types.ts`, `src/lighting/types.ts`, `src/edgeDetection/types.ts`, `src/documentDetection/types.ts`, and `src/autoCapture/types.ts`.
- `index.ts`: Barrel exports for feature folders, for example `src/config/index.ts`, `src/scoring/index.ts`, `src/storage/index.ts`, and `src/telemetry/index.ts`.
- `*.test.ts` / `*.test.tsx`: Jest test files in `__tests__/`, for example `__tests__/scoring.test.ts` and `__tests__/CompositionOverlay.test.tsx`.
- Native/config files keep framework defaults: `index.js`, `app.json`, `babel.config.js`, `metro.config.js`, `jest.config.js`, `ios/Podfile`, and `android/app/build.gradle`.

**Directories:**
- Feature directories use lower camel case or lowercase domain names under `src/`, for example `src/autoCapture/`, `src/faceDetection/`, `src/edgeDetection/`, `src/aestheticModel/`, `src/documentDetection/`, and `src/telemetry/`.
- UI screens live in plural `src/screens/`, generic shared components in `src/components/`, and pure/platform storage in `src/storage/`.
- Tests and mocks use root-level Jest conventions: `__tests__/` and `__mocks__/`.
- Native projects use standard React Native directory names: `android/` and `ios/`.

## Where to Add New Code

**New Feature:**
- Primary code: Create a feature folder under `src/[featureName]/` with `types.ts`, `use[Feature].ts` if hook-based, optional `PascalCase.tsx` UI component, and `index.ts`; follow examples in `src/lighting/`, `src/edgeDetection/`, and `src/autoCapture/`.
- Tests: Add focused tests in `__tests__/[featureName].test.ts` for pure logic and `__tests__/[ComponentName].test.tsx` for UI, matching existing files like `__tests__/lighting.test.ts` and `__tests__/CompositionOverlay.test.tsx`.

**New Camera Signal or Analysis Module:**
- Primary code: Add signal types/pure functions in `src/[signal]/types.ts`, hook/frame bridge in `src/[signal]/use[Signal].ts`, and wire it through `src/screens/CameraScreen.tsx`.
- Tests: Add pure logic tests in `__tests__/[signal].test.ts` and hook tests with `@testing-library/react-native` when stateful behavior mirrors `__tests__/useLighting.test.ts` or `__tests__/useStability.test.ts`.

**New Shooting Mode:**
- Primary code: Add the mode to the `Mode` union, `MODES`, and `modeConfig` in `src/config/modes.ts`; add icon/title/description in `src/config/modeMetadata.ts`; add mode-specific prompts/signals in `src/screens/CameraScreen.tsx`, `src/coaching/types.ts`, and `src/scoring/types.ts` as needed.
- Tests: Add or extend mode tests in `__tests__/modes.test.ts` and a dedicated mode file like `__tests__/documentMode.test.ts`, `__tests__/productMode.test.ts`, or `__tests__/groupPhoto.test.ts`.

**New Screen:**
- Primary code: Add `src/screens/[ScreenName].tsx`, define props with callbacks, and route it from `App.tsx` by extending the `AppScreen` union and render condition.
- Tests: Add `__tests__/[ScreenName].test.tsx` and mock any native dependencies through `__mocks__/` plus `jest.config.js` if needed.

**New Component/Module:**
- Implementation: Place generic camera overlays in `src/components/`, feature-specific UI in the feature folder such as `src/scoring/ScoreRing.tsx` or `src/coaching/PromptPill.tsx`, and re-export through that folder's `index.ts`.

**Utilities:**
- Shared helpers: Keep feature-specific pure utilities inside the feature folder's `types.ts` or a named helper file such as `src/sensors/math.ts`; only create broader shared utilities if multiple feature folders consume the same logic.

**Storage or Native Integration:**
- Primary code: Add persistent settings helpers to `src/storage/settings.ts`, new storage interfaces/implementations under `src/storage/`, telemetry events/types under `src/telemetry/types.ts`, and native module mocks under `__mocks__/` with mappings in `jest.config.js`.

## Special Directories

**`android/`:**
- Purpose: Native Android app project for React Native builds.
- Generated: Yes, initially generated by React Native and then project-modified.
- Committed: Yes.

**`ios/`:**
- Purpose: Native iOS app project, Xcode workspace/project, Swift app delegate, privacy manifest, and CocoaPods configuration.
- Generated: Yes, initially generated by React Native and then project-modified.
- Committed: Yes.

**`__mocks__/`:**
- Purpose: Test doubles for native modules unavailable in Jest.
- Generated: No.
- Committed: Yes.

**`__tests__/`:**
- Purpose: Unit, hook, screen, and component tests.
- Generated: No.
- Committed: Yes.

**`assets/`:**
- Purpose: Product visuals, logo/splash sources, and preview HTML.
- Generated: Mixed; SVG/HTML sources are authored, while splash PNGs under `assets/splash/png/` appear generated from source assets.
- Committed: Yes.

**`scripts/ralph/`:**
- Purpose: Autonomous-agent workflow scripts, prompts, PRD, and progress tracking.
- Generated: Mixed; scripts/prompts are authored, while progress/PRD are workflow artifacts.
- Committed: Yes.

**`.planning/codebase/`:**
- Purpose: Generated codebase documentation from the codemap workflow.
- Generated: Yes.
- Committed: Depends on repository workflow; current task writes `ARCHITECTURE.md` and `STRUCTURE.md` here.

**`vendor/`:**
- Purpose: Vendored external/native dependency area; no files were observed in the inspected top-level file listing.
- Generated: Mixed/unknown.
- Committed: Directory exists in the working tree.

**`tasks/`:**
- Purpose: Product/task documentation outside executable source.
- Generated: No.
- Committed: Yes.

---

*Structure analysis: 2026-05-01*
