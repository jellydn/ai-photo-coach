# Codebase Structure

**Analysis Date:** 2026-04-28

## Directory Layout

```
/Users/huynhdung/src/tries/2026-04-27-ai-photo-coach/
├── src/
│   ├── autoCapture/      # Auto-capture countdown logic
│   ├── coaching/         # Prompt selection engine
│   ├── components/       # Shared UI components
│   ├── config/           # Mode configuration and metadata
│   ├── edgeDetection/    # Travel mode line detection
│   ├── faceDetection/    # Face detection and framing
│   ├── lighting/         # Lighting analysis
│   ├── scoring/          # Shot-readiness scoring
│   ├── screens/          # App screens
│   │   └── onboarding/   # Onboarding flow screens
│   ├── sensors/          # Accelerometer/gyroscope hooks
│   ├── storage/          # Persistence layer
│   └── telemetry/        # Analytics and logging
├── __mocks__/            # Jest mocks for native modules
├── __tests__/            # Unit and integration tests
├── ios/                  # iOS native project
├── android/              # Android native project
├── scripts/ralph/        # Agent workflow files
├── .planning/            # Architecture documentation
├── App.tsx               # Root component
├── index.js              # Entry point
└── package.json          # Dependencies
```

## Directory Purposes

**src/autoCapture/:**
- Purpose: Automatic photo capture with countdown
- Contains: useAutoCapture hook, CountdownOverlay component
- Key files: `useAutoCapture.ts`, `CountdownOverlay.tsx`, `types.ts`

**src/coaching/:**
- Purpose: User coaching prompt selection
- Contains: Prompt engine (pure functions), useCoaching hook, PromptPill component
- Key files: `types.ts` (selectPrompt), `useCoaching.ts`, `PromptPill.tsx`

**src/components/:**
- Purpose: Reusable UI overlays
- Contains: CompositionOverlay, HorizonIndicator
- Key files: `CompositionOverlay.tsx`, `HorizonIndicator.tsx`

**src/config/:**
- Purpose: Mode definitions and thresholds
- Contains: Mode type, ModeConfig interface, per-mode settings, metadata
- Key files: `modes.ts`, `modeMetadata.ts`

**src/edgeDetection/:**
- Purpose: Dominant line detection for Travel mode
- Contains: useEdgeDetection hook, frame output, types
- Key files: `useEdgeDetection.ts`, `useEdgeDetectionFrameOutput.ts`, `types.ts`

**src/faceDetection/:**
- Purpose: Face detection and framing guidance (stub for v5 migration)
- Contains: useFaceDetection hook, FaceOverlay component, types
- Key files: `useFaceDetection.ts`, `FaceOverlay.tsx`, `types.ts`

**src/lighting/:**
- Purpose: Lighting quality analysis
- Contains: useLighting hook, frame processor, lighting classification
- Key files: `useLighting.ts`, `useLightingFrameProcessor.ts`, `types.ts`

**src/scoring/:**
- Purpose: Shot-readiness score calculation
- Contains: computeScore pure function, useScoring hook, ScoreRing component
- Key files: `types.ts` (computeScore), `useScoring.ts`, `ScoreRing.tsx`

**src/screens/:**
- Purpose: Full-screen views
- Contains: CameraScreen, ModeSelectorScreen, PostCaptureScreen, SettingsScreen
- Key files: `CameraScreen.tsx`, `ModeSelectorScreen.tsx`, `PostCaptureScreen.tsx`, `SettingsScreen.tsx`

**src/screens/onboarding/:**
- Purpose: First-time user onboarding
- Contains: ConceptScreen, ModesScreen, PermissionsScreen, OnboardingNavigator
- Key files: `OnboardingNavigator.tsx`, `ConceptScreen.tsx`, `PermissionsScreen.tsx`

**src/sensors/:**
- Purpose: Device sensor integration
- Contains: useStability, useHorizonLevel hooks, math utilities
- Key files: `useStability.ts`, `useHorizonLevel.ts`, `math.ts`

**src/storage/:**
- Purpose: Local persistence
- Contains: PhotoStorage interface, LocalPhotoStorage implementation, settings, onboarding state
- Key files: `LocalPhotoStorage.ts`, `settings.ts`, `onboarding.ts`

**src/telemetry/:**
- Purpose: Event tracking and analytics
- Contains: TelemetryTracker, ConsoleTelemetryProvider, types
- Key files: `index.ts` (TelemetryTracker), `ConsoleTelemetryProvider.ts`

**__mocks__/:**
- Purpose: Jest mocks for React Native native modules
- Contains: Mocks for all external dependencies
- Key files: `react-native-vision-camera.js`, `react-native-sensors.js`, `react-native-mmkv.ts`

**__tests__/:**
- Purpose: Test suites
- Contains: Unit tests for business logic, component tests
- Key files: `scoring.test.ts`, `coaching.test.ts`, `lighting.test.ts`, `sensors.test.ts`

## Key File Locations

**Entry Points:**
- `/Users/huynhdung/src/tries/2026-04-27-ai-photo-coach/index.js`: App registration
- `/Users/huynhdung/src/tries/2026-04-27-ai-photo-coach/App.tsx`: Root component with routing

**Configuration:**
- `/Users/huynhdung/src/tries/2026-04-27-ai-photo-coach/src/config/modes.ts`: Mode definitions and thresholds
- `/Users/huynhdung/src/tries/2026-04-27-ai-photo-coach/src/config/modeMetadata.ts`: UI metadata for modes
- `/Users/huynhdung/src/tries/2026-04-27-ai-photo-coach/package.json`: Dependencies

**Core Logic:**
- `/Users/huynhdung/src/tries/2026-04-27-ai-photo-coach/src/scoring/types.ts`: Score calculation pure functions
- `/Users/huynhdung/src/tries/2026-04-27-ai-photo-coach/src/coaching/types.ts`: Prompt selection pure functions
- `/Users/huynhdung/src/tries/2026-04-27-ai-photo-coach/src/sensors/math.ts`: Sensor math utilities

**Testing:**
- `/Users/huynhdung/src/tries/2026-04-27-ai-photo-coach/__tests__/`: All test files
- `/Users/huynhdung/src/tries/2026-04-27-ai-photo-coach/jest.config.js`: Jest configuration
- `/Users/huynhdung/src/tries/2026-04-27-ai-photo-coach/jest.setup.js`: Test setup

## Naming Conventions

**Files:**
- `use[Feature].ts`: Custom React hooks
- `[Feature].tsx`: React components
- `types.ts`: Type definitions and pure functions
- `[name].test.ts`: Unit tests
- `[name].test.tsx`: Component tests

**Directories:**
- `src/[feature]/`: Feature modules (camelCase)
- `__mocks__/`: Double-underscore for Jest mocks
- `__tests__/`: Double-underscore for test files

## Where to Add New Code

**New Feature:**
- Primary code: `src/[newFeature]/`
- Tests: `__tests__/[newFeature].test.ts`
- Mocks: `__mocks__/react-native-[module].js` if needed

**New Component/Module:**
- Implementation: `src/[feature]/[ComponentName].tsx`
- Types: `src/[feature]/types.ts`

**Utilities:**
- Shared helpers: `src/[feature]/[utility].ts` within relevant feature
- Cross-cutting: Consider new `src/utils/` directory

## Special Directories

**__mocks__/:**
- Purpose: Jest manual mocks for native modules
- Generated: No (hand-written)
- Committed: Yes

**ios/ and android/:**
- Purpose: Native platform projects
- Generated: Yes (by React Native CLI)
- Committed: Yes

**vendor/:**
- Purpose: Ruby gems for CocoaPods
- Generated: Yes (by bundle install)
- Committed: No (in .gitignore)

**.planning/:**
- Purpose: Architecture documentation
- Generated: No
- Committed: Yes

---

*Structure analysis: 2026-04-28*
