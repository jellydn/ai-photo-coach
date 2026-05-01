# Coding Conventions

**Analysis Date:** 2026-05-01

## Naming Patterns

**Files:**
- Feature folders under `src/` use domain names such as `src/scoring/`, `src/coaching/`, `src/lighting/`, `src/faceDetection/`, `src/autoCapture/`, `src/storage/`, and `src/screens/`.
- React components and screens use PascalCase filenames, including `App.tsx`, `src/screens/CameraScreen.tsx`, `src/screens/PostCaptureScreen.tsx`, `src/screens/SettingsScreen.tsx`, `src/components/CompositionOverlay.tsx`, and `src/components/HorizonIndicator.tsx`.
- Hooks use `use*.ts` filenames and exported hook names, including `src/scoring/useScoring.ts`, `src/coaching/useCoaching.ts`, `src/lighting/useLighting.ts`, `src/sensors/useStability.ts`, `src/haptics/useHaptics.ts`, and `src/autoCapture/useAutoCapture.ts`.
- Shared domain types and pure logic are commonly kept in `types.ts` files, including `src/scoring/types.ts`, `src/coaching/types.ts`, `src/lighting/types.ts`, `src/faceDetection/types.ts`, `src/edgeDetection/types.ts`, and `src/documentDetection/types.ts`.
- Tests are centralized in `__tests__/` with matching domain names such as `__tests__/scoring.test.ts`, `__tests__/coaching.test.ts`, `__tests__/useLighting.test.ts`, and component-specific files like `__tests__/SettingsScreen.test.tsx`.

**Functions:**
- React hooks are named with `use` prefixes and return structured state/control objects, as in `useScoring` in `src/scoring/useScoring.ts`, `useAutoCapture` in `src/autoCapture/useAutoCapture.ts`, and `useHaptics` in `src/haptics/useHaptics.ts`.
- Pure computation functions use verb phrases such as `computeScore`, `computeStability`, `computeRollFromAccel`, `selectPrompt`, and `canStartAutoCapture` in `src/scoring/types.ts`, `src/sensors/math.ts`, `src/coaching/types.ts`, and `src/autoCapture/types.ts`.
- Event handlers in components use `handle*` naming, including `handleModeSelected`, `handlePhotoCaptured`, `handlePhotoSaved`, and `handleSettings` in `App.tsx`, plus `handleFrameStats` in `src/lighting/useLighting.ts` and `src/edgeDetection/useEdgeDetection.ts`.
- Boolean helpers use `is*`, `has*`, or `can*`, including `isTelemetryOptedOut` in `src/telemetry/index.ts`, `isReadyForCapture` in `src/coaching/types.ts`, `isLevel` in `src/sensors/math.ts`, and `canStartAutoCapture` in `src/autoCapture/types.ts`.

**Variables:**
- State variables use descriptive React pairs such as `currentScreen`/`setCurrentScreen`, `selectedMode`/`setSelectedMode`, and `capturedPhoto`/`setCapturedPhoto` in `App.tsx`.
- Refs end with `Ref`, including `sessionStartTimeRef` in `App.tsx`, `intervalRef` and `frameCountRef` in `src/lighting/useLighting.ts`, and `samplesRef`, `accelSubRef`, and `gyroSubRef` in `src/sensors/useStability.ts`.
- Constants are uppercase snake case for domain configuration, including `DEFAULT_RULES_WEIGHTS`, `DEFAULT_HYBRID_WEIGHTS`, and `SCORE_THRESHOLDS` in `src/scoring/types.ts`, plus `COUNTDOWN_INTERVAL_MS` in `src/autoCapture/types.ts`.
- Local mock callbacks in tests use `mock*` names, including `mockOnBack` in `__tests__/SettingsScreen.test.tsx`, `mockOnSave` and `mockOnDiscard` in `__tests__/PostCaptureScreen.test.tsx`, and `mockOnStats` in `__tests__/useLighting.test.ts`.

**Types:**
- Interfaces are PascalCase and frequently describe props/results/options, such as `UseScoringProps`, `UseScoringResult` in `src/scoring/useScoring.ts`, `UseLightingOptions`, `UseLightingResult` in `src/lighting/useLighting.ts`, and `CameraScreenProps` in `src/screens/CameraScreen.tsx`.
- Domain union types are explicit string unions, including `AppScreen` in `App.tsx`, `PermissionStatus` in `src/screens/CameraScreen.tsx`, and scoring method unions in `src/scoring/types.ts`.
- Type-only imports/exports are used for TypeScript hygiene, including `import type React` in `App.tsx`, `import type { SubScores }` in `src/screens/CameraScreen.tsx`, and type re-exports in `src/telemetry/index.ts`.

## Code Style

**Formatting:**
- Prettier is configured in `.prettierrc.js` with `arrowParens: 'avoid'`, `singleQuote: true`, and `trailingComma: 'all'`.
- Observed TypeScript/TSX files mostly use tab indentation and double quotes, such as `App.tsx`, `src/screens/CameraScreen.tsx`, `src/components/CompositionOverlay.tsx`, and `__tests__/scoring.test.ts`; this differs from `.prettierrc.js` single-quote configuration, and Prettier is not wired into `package.json` scripts.
- React Native styles use `StyleSheet.create`, object literals, and array style composition, as in `src/components/CompositionOverlay.tsx`, `src/scoring/ScoreRing.tsx`, `src/screens/SettingsScreen.tsx`, and `src/screens/PostCaptureScreen.tsx`.
- Return types are explicit on exported hooks/classes/functions in many modules, including `useScoring` in `src/scoring/useScoring.ts`, `useAutoCapture` in `src/autoCapture/useAutoCapture.ts`, `LocalPhotoStorage.save` in `src/storage/LocalPhotoStorage.ts`, and `TelemetryTracker.track` in `src/telemetry/index.ts`.

**Linting:**
- ESLint is configured through `.eslintrc.js` with `root: true` and `extends: '@react-native'`.
- `package.json` exposes `yarn lint` as `eslint .` and `yarn typecheck` as `tsc --noEmit`.
- Pre-commit quality checks in `prek.toml` run `yarn typecheck`, `yarn lint`, and `yarn test` before commits.
- Native/test mock files are excluded from TypeScript compilation by `tsconfig.json` via `exclude: ["**/node_modules", "**/Pods", "**/__mocks__/**"]` while app and test `.ts`/`.tsx` files are included.

## Import Organization

**Order:**
1. External React/React Native imports first, as shown in `App.tsx`, `src/screens/CameraScreen.tsx`, and `src/components/CompositionOverlay.tsx`.
2. Third-party/native-library imports next, including `react-native-permissions`, `react-native-safe-area-context`, and `react-native-vision-camera` in `src/screens/CameraScreen.tsx`, plus `react-native-mmkv` in `src/storage/LocalPhotoStorage.ts` and `src/telemetry/index.ts`.
3. Local domain imports follow, commonly grouped by relative module path, as in `src/screens/CameraScreen.tsx` importing from `../autoCapture`, `../coaching`, `../components`, `../config`, `../faceDetection`, `../lighting`, `../scoring`, and `../storage`.
4. Type-only imports are interleaved where needed with `type` specifiers, including `type useFrameOutput` in `src/screens/CameraScreen.tsx` and `type LightingClass` in `src/lighting/useLighting.ts`.

**Path Aliases:**
- No custom path aliases are configured in `tsconfig.json`; imports use relative paths such as `../src/scoring/types` in `__tests__/scoring.test.ts`, `../lighting/types` in `src/scoring/types.ts`, and `../storage/settings` in `src/screens/CameraScreen.tsx`.
- Domain barrel exports are used through `index.ts` files, including `src/scoring/index.ts`, `src/coaching/index.ts`, `src/lighting/index.ts`, `src/storage/index.ts`, `src/telemetry/index.ts`, and imports such as `from "../scoring"` in `src/screens/CameraScreen.tsx`.

## Error Handling

**Patterns:**
- Async failures are caught at UI boundaries and logged before graceful continuation, including capture errors in `src/screens/CameraScreen.tsx`, save/discard errors in `src/screens/PostCaptureScreen.tsx`, and camera-roll delete failures in `src/storage/LocalPhotoStorage.ts`.
- Storage parsing failures return safe defaults: `LocalPhotoStorage.getStoredMetadata` logs and returns `[]` in `src/storage/LocalPhotoStorage.ts`.
- Expected failure paths are surfaced with thrown errors where callers/tests can assert them, such as `throw new Error("Failed to save photo to camera roll")` in `src/storage/LocalPhotoStorage.ts` and rejected save behavior tested in `__tests__/LocalPhotoStorage.test.ts`.
- Sensor subscription errors use observable error callbacks and `console.error` in `src/sensors/useStability.ts`, `src/sensors/useHorizonLevel.ts`, and `src/sensors/usePitchDetection.ts`.
- Hooks guard disabled states and reset data instead of throwing, including `useLighting` in `src/lighting/useLighting.ts`, `useAutoCapture` in `src/autoCapture/useAutoCapture.ts`, and `useHaptics` in `src/haptics/useHaptics.ts`.

## Logging

**Framework:** console

**Patterns:**
- Runtime diagnostics use `console.error`, `console.warn`, and `console.log`; there is no dedicated logging library in `package.json`.
- Telemetry's MVP provider logs JSON payloads through `ConsoleTelemetryProvider` in `src/telemetry/ConsoleTelemetryProvider.ts`, and tests replace `console.log` in `__tests__/telemetry.test.ts`.
- Recoverable native/storage failures use `console.warn` or `console.error`, including `src/storage/LocalPhotoStorage.ts`, `src/aestheticModel/modelLoader.ts`, and `src/aestheticModel/useAestheticFrameProcessor.ts`.
- Sensor and camera failures log specific contextual prefixes in `src/sensors/useStability.ts`, `src/sensors/useHorizonLevel.ts`, `src/sensors/usePitchDetection.ts`, and `src/screens/CameraScreen.tsx`.

## Comments

**When to Comment:**
- Comments document domain algorithms and thresholds for pure functions, including stability math in `src/sensors/math.ts`, scoring weights in `src/scoring/types.ts`, and prompt priority in `src/coaching/types.ts`.
- Comments explain React hook side effects and cleanup, including interval management in `src/autoCapture/useAutoCapture.ts`, simulation behavior in `src/lighting/useLighting.ts`, and sensor subscriptions in `src/sensors/useStability.ts`.
- Comments mark MVP/stub limitations and future compatibility work in `src/faceDetection/useFaceDetection.ts`, `src/lighting/useLightingFrameProcessor.ts`, `src/edgeDetection/useEdgeDetectionFrameOutput.ts`, and `src/screens/CameraScreen.tsx`.
- JSX comments are used for visual overlay structure and test clarity in `src/components/CompositionOverlay.tsx`.

**JSDoc/TSDoc:**
- Public hooks/classes/interfaces are documented with JSDoc/TSDoc comments in `src/scoring/useScoring.ts`, `src/lighting/useLighting.ts`, `src/autoCapture/useAutoCapture.ts`, `src/haptics/useHaptics.ts`, and `src/telemetry/index.ts`.
- Interfaces use property-level TSDoc for most exported domain types, including `ScoreSignals` and `SubScores` in `src/scoring/types.ts`, `CoachingSignals` in `src/coaching/types.ts`, and `StabilityState` in `src/sensors/useStability.ts`.
- Mock files sometimes include JSDoc typedefs for JavaScript mocks, especially `__mocks__/react-native-vision-camera.js`.

## Function Design

**Size:**
- Pure utilities are generally small and single-purpose, such as `computeRollFromAccel`, `isLevel`, `lowPassFilter`, and `computeAccelMagnitude` in `src/sensors/math.ts`, plus prompt/scoring helpers in `src/coaching/types.ts` and `src/scoring/types.ts`.
- Hooks encapsulate stateful behavior and can be medium sized when managing intervals/subscriptions, including `useAutoCapture` in `src/autoCapture/useAutoCapture.ts`, `useLighting` in `src/lighting/useLighting.ts`, and `useScoring` in `src/scoring/useScoring.ts`.
- `src/screens/CameraScreen.tsx` is a large orchestration component that wires permissions, sensors, scoring, overlays, camera outputs, capture, and per-mode logic in one file.

**Parameters:**
- Hooks and components prefer object parameters or props interfaces, including `UseScoringProps` in `src/scoring/useScoring.ts`, `UseLightingOptions` in `src/lighting/useLighting.ts`, `UseAutoCaptureProps` in `src/autoCapture/types.ts`, and `CameraScreenProps` in `src/screens/CameraScreen.tsx`.
- Pure functions use explicit primitive/domain parameters for deterministic behavior, including `computeLevelScore(isLevel, rollDeviation)` in `src/scoring/types.ts`, `computeStability(samples, threshold)` in `src/sensors/math.ts`, and `selectPrompt(signals, context)` in `src/coaching/types.ts`.
- Optional parameters have defaults where appropriate, such as `useScoring` defaults in `src/scoring/useScoring.ts`, `useAutoCapture` defaults in `src/autoCapture/useAutoCapture.ts`, and `isFlatLayPosition` tolerance in `src/sensors/math.ts`.

**Return Values:**
- Hooks return plain objects with state plus actions, including `UseScoringResult` in `src/scoring/useScoring.ts`, `UseAutoCaptureResult` in `src/autoCapture/types.ts`, `UseHapticsReturn` in `src/haptics/useHaptics.ts`, and `UseLightingResult` in `src/lighting/useLighting.ts`.
- Pure functions return primitives or plain domain records for testability, including booleans from `isReadyForCapture` in `src/coaching/types.ts`, numbers from score/math functions in `src/scoring/types.ts` and `src/sensors/math.ts`, and structured payloads from `createTelemetryPayload` in `src/telemetry/types.ts`.
- Storage APIs return promises for async native work and synchronous values for MMKV metadata reads, as seen in `src/storage/LocalPhotoStorage.ts`.

## Module Design

**Exports:**
- Domain folders expose barrel files such as `src/scoring/index.ts`, `src/coaching/index.ts`, `src/lighting/index.ts`, `src/sensors/index.ts`, `src/storage/index.ts`, and `src/telemetry/index.ts`.
- Modules commonly colocate constants, types, and pure functions in `types.ts`, then hooks import and re-export selected symbols, as in `src/scoring/types.ts` plus `src/scoring/useScoring.ts`, and `src/autoCapture/types.ts` plus `src/autoCapture/useAutoCapture.ts`.
- Singleton service instances are exported for app-wide use, including `photoStorage` in `src/storage/LocalPhotoStorage.ts` and `telemetry` in `src/telemetry/index.ts`.
- Test-only helpers are exposed on mocks with double-underscore names, including `CameraRoll.__resetMocks` in `__mocks__/@react-native-camera-roll/camera-roll.ts` and `MMKV.__getStore` in `__mocks__/react-native-mmkv.ts`.

**Barrel Files:**
- Barrel files are actively used for domain imports in screens, including `src/screens/CameraScreen.tsx` importing from `../autoCapture`, `../coaching`, `../documentDetection`, `../edgeDetection`, `../faceDetection`, `../lighting`, `../scoring`, `../sensors`, and `../storage`.
- Tests often bypass barrels for specific pure functions/types, such as `__tests__/scoring.test.ts` importing `../src/scoring/types` and `__tests__/coaching.test.ts` importing `../src/coaching/types`.
- `src/telemetry/index.ts` is both the primary implementation and the barrel for telemetry providers, types, and helpers.

---

*Convention analysis: 2026-05-01*
