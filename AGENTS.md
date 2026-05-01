# AGENTS.md – AI Photo Coach

## Project Status

✅ **MVP Complete.** All 17 user stories implemented (US-001 through US-017). 

**Frame Processor Status:**
- ✅ **Working**: Horizon level, stability detection, pitch detection (sensors via react-native-sensors)
- ⚠️ **Stub**: Face detection (returns empty arrays, MLKit not installed)
- ⚠️ **Implemented - needs on-device validation**: Lighting analysis, edge detection (code present with real frameOutput wiring; requires on-device pixel buffer verification)
- ⚠️ **Stub**: Aesthetic ML model (returns null, TFLite not installed)

**Important:** Every user story implementation must be verified on device before being marked complete; simulator testing is insufficient for camera frame processor functionality.

See "Known Stubs" below for details.

## Architecture

- **Stack**: React Native 0.85.2 (TypeScript) + VisionCamera v5 + react-native-worklets (v0.8.1)
- **Overlays**: View-based with `pointerEvents="none"` (not Skia/SVG)
- **State**: Zustand/React Context; Reanimated shared values for UI updates
- **Storage**: MMKV for settings/metadata; Indexed photo storage (by ID, not single array); Camera roll for photos
- **ML**: MLKit Face Detection stub (returns empty arrays — see Known Stubs)

## Ralph Agent Workflow

This repo uses the Ralph autonomous agent system in `scripts/ralph/`.

**Key files**:

- `prd.json` – Machine-readable PRD with all user stories
- `progress.txt` – Append-only log with `## Codebase Patterns` section at top
- `prompt-opencode.md` – Agent instructions

## Known Stubs

1. **Face detection** (`src/faceDetection/useFaceDetection.ts`) — Returns empty arrays. `react-native-vision-camera-face-detector` is in devDependencies but native module integration incomplete. Portrait/group/pet-kids modes work with rule-based scoring only.

2. **Aesthetic ML model** (`src/aestheticModel/modelLoader.ts`) — `tryLoadModel()` returns `null`. `react-native-fast-tflite` not installed. Scoring falls back to `method: "rules-only"`.

3. **Lighting analysis** (`src/lighting/useLightingFrameProcessor.ts`) — Frame processor code complete with real frameOutput wiring; requires on-device validation of pixel buffer extraction.

4. **Edge detection** (`src/edgeDetection/useEdgeDetectionFrameOutput.ts`) — Frame processor code complete with real frameOutput wiring; requires on-device validation of pixel buffer extraction.

5. **Product mode centering** (`src/camera/useProductCentering.ts`) — Uses stability-based heuristic (MVP); planned upgrade to real frame analysis.

**To activate real frame processors:**
- Face detection: Complete MLKit integration with VisionCamera v5 outputs
- Lighting/Edge: Verify pixel buffer extraction and disposal works on device (code is ready, needs device testing)
- Aesthetic ML: Install `react-native-fast-tflite`, bundle TFLite model, implement worklet inference

**Workflow**:

1. Read `prd.json` and `progress.txt` (Codebase Patterns section first)
2. Work on **ONE** story with `passes: false` per iteration
3. Quality checks **must pass** before commit (typecheck, lint, test)
4. Commit message: `feat: [Story ID] - [Story Title]`
5. Update PRD: set `passes: true` for completed story
6. Append to `progress.txt` with Learnings section

## Development Commands

```bash
yarn install
cd ios && pod install && cd ..
yarn ios        # iOS 15+
yarn android    # Android 8+ (API 26+)

yarn typecheck  # Required to pass for every US
yarn lint
yarn test
```

**Command order matters**: Always run `typecheck` before `test` – tests depend on type-correct code.

## VisionCamera v5 API (Critical)

VisionCamera v5 uses a completely different API from v4:

```typescript
// Photo capture
import { usePhotoOutput } from 'react-native-vision-camera';
const photoOutput = usePhotoOutput();
<Camera outputs={[photoOutput]} />;
const photoFile = await photoOutput.capturePhotoToFile(
  { flashMode: 'off' },
  {},
);
// photoFile.filePath contains the path (NOT .path)

// Frame processing
import { useFrameOutput } from 'react-native-vision-camera';
const frameOutput = useFrameOutput({
  pixelFormat: 'rgba',
  onFrame: frame => {
    'worklet';
    const buffer = frame.getPixelBuffer();
    runOnJS(processFrame)(buffer);
    frame.dispose(); // REQUIRED to prevent memory leaks
  },
});
<Camera outputs={[photoOutput, frameOutput]} />;
```

**Key differences from v4:**

- No `ref` or `takePhoto()` method on Camera
- Must use `outputs={[...]}` prop (array of mixed output types)
- `capturePhotoToFile()` returns `{ filePath: string }` (not `path`)
- Frame processing uses `useFrameOutput` hook with `onFrame` callback (not `useFrameProcessor`)
- Frame must be disposed via `frame.dispose()` in `try/finally`
- Worklet callbacks need `'worklet'` directive and `runOnJS` for React state updates

## Project Structure

```
src/
├── screens/           # CameraScreen, ModeSelectorScreen, PostCaptureScreen, SettingsScreen
├── components/        # CompositionOverlay, HorizonIndicator
├── config/           # modes.ts (per-mode thresholds), modeMetadata.ts
├── sensors/          # useHorizonLevel, useStability, math.ts (pure functions)
├── faceDetection/    # useFaceDetection, FaceOverlay (MLKit integration)
├── lighting/         # useLighting, useLightingFrameOutput, types.ts
├── edgeDetection/    # useEdgeDetection, useEdgeDetectionFrameOutput (Travel mode)
├── coaching/         # selectPrompt, useCoaching, PromptPill
├── scoring/          # computeScore, useScoring, ScoreRing
├── autoCapture/      # useAutoCapture, CountdownOverlay
├── storage/          # PhotoStorage, LocalPhotoStorage, settings.ts
├── telemetry/        # TelemetryTracker, ConsoleTelemetryProvider
└── haptics/          # Haptic feedback with rate limiting, useHaptics hook

__mocks__/          # Jest mocks for all native modules
__tests__/          # Unit tests (390+ tests total)
scripts/ralph/      # Agent workflow config
```

## Testing

**Unit test pattern**: Pure functions in `__tests__/*.test.ts`, component tests in `*.test.tsx`.

**Jest mocks required** for all native modules (see `jest.config.js`):

- react-native-permissions, react-native-vision-camera, react-native-safe-area-context
- @react-native-async-storage/async-storage, react-native-sensors
- react-native-mmkv, @react-native-camera-roll/camera-roll
- react-native-vision-camera-face-detector, react-native-gesture-handler
- react-native-reanimated, react-native-worklets

**Test coverage**: 590+ tests including unit tests, component tests, and CameraScreen integration tests.

**Mock pattern**: Create mock in `__mocks__/{package}.{js,ts}`, add to `jest.config.js` `moduleNameMapper`, exclude `__mocks__` from tsconfig.

**Key test patterns**:

```typescript
// Use @testing-library/react-native for hooks
import { renderHook, act } from '@testing-library/react-native';
const { result } = renderHook(() => useMyHook());

// ReturnType<typeof setTimeout> for cross-platform timeouts
const timer: ReturnType<typeof setTimeout> = setTimeout(() => {}, 1000);
```

## Codebase Patterns (from progress.txt)

- **z-index layering**: camera (0) < composition overlay (10) < face overlay (12) < horizon (15) < prompt pill (25) < header (20) < score ring (30)
- **Percentage positioning**: Use `marginTop: "33.33%"` for rule-of-thirds grid (scales across aspect ratios)
- **React Native StyleSheet**: Use `absoluteFill` (not `absoluteFillObject`)
- **Coaching prompt priority**: stability > level > framing > lighting > composition (early return pattern)
- **Debounce strategy**: immediate first prompt, immediate clear to null, 500ms rate-limit between changes
- **Frame output hooks**: Always wrap in `try/finally` to ensure `frame.dispose()`
- **Sensor types**: `SensorTypes.accelerometer` (lowercase, not `Accelerometer`)
- **RxJS subscriptions**: Use `.unsubscribe()`, not `.remove()`
- **Timeouts**: Use `ReturnType<typeof setTimeout>` instead of `NodeJS.Timeout`
- **Face detection**: v2 plugin returns pixel coordinates in `Face.bounds`; convert to normalized (0-1) for UI using `bounds.x / frame.width` etc. Landmark keys use UPPER_SNAKE_CASE (`LEFT_EYE`, `RIGHT_EYE`, `NOSE_BASE`, `MOUTH_LEFT`, `MOUTH_RIGHT`).
- **Worklet callbacks**: Use `'worklet'` directive and `globalThis.runOnJS` for state updates. Cast as `(globalThis as Record<string, unknown>).runOnJS` for TypeScript compatibility.
- **Face detection v2**: Uses `useFaceDetector` (Nitro Modules), `useAsyncRunner`, and `useFrameOutput` with `pixelFormat: 'yuv'`. Must call `faceDetector.stopListeners()` on unmount.
- **MMKV v4+**: Use `createMMKV()` factory (not `new MMKV()`); methods are `remove()` (not `delete`), `getString()` (not `get`)
- **Camera outputs array type**: `(ReturnType<typeof usePhotoOutput> | ReturnType<typeof useFrameOutput>)[]`

## Mode-Specific Behavior

Per-mode thresholds in `src/config/modes.ts`:

| Mode     | Face Framing | Horizon | Stability | Edge Detection |
| -------- | ------------ | ------- | --------- | -------------- |
| Portrait | ON           | ON      | 0.02      | OFF            |
| Travel   | OFF          | ON      | 0.05      | ON             |
| Others   | Stub only    | -       | -         | -              |

## Constraints & Gotchas

- **Frame processor budget**: Target 33ms/frame on mid-range (Pixel 6a / iPhone 12)
- **Performance targets**: ≥ 30 FPS preview, ≥ 20 FPS frame processing
- **Verification requirement**: Every user story must be "verified on device" – not just simulator
- **Pure functions**: All scoring logic must be unit-testable pure functions (FR-14)
- **Prompt rules**: Max ONE prompt visible at a time, ≤ 5 words, debounced 500ms (US-007)
- **Auto-capture**: Only when score ≥ 80 AND isStable (US-010)
- **Platform permissions**: Use `Platform.OS === 'ios' ? PERMISSIONS.IOS.CAMERA : PERMISSIONS.ANDROID.CAMERA` (NOT `||` operator)

## Security Documentation

- **Telemetry & Storage Security**: See [SECURITY.md](./SECURITY.md) for complete security model including data collection, retention policies, storage encryption status, and production deployment recommendations
