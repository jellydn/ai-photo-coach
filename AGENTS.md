# AGENTS.md – AI Photo Coach

## Project Status

✅ **MVP Mostly Complete.** All 17 user stories have UI/shell implemented (US-001 through US-025). 4 frame processor hooks are **stubs** returning neutral data (face detection, lighting, edge detection, aesthetic ML model). See "Known Stubs" below.

## Architecture

- **Stack**: React Native 0.85.2 (TypeScript) + VisionCamera v5 + react-native-worklets (v0.8.1)
- **Overlays**: View-based with `pointerEvents="none"` (not Skia/SVG)
- **State**: Zustand/React Context; Reanimated shared values for UI updates
- **Storage**: MMKV for settings/metadata; Camera roll for photos via @react-native-camera-roll/camera-roll
- **ML**: MLKit Face Detection via react-native-vision-camera-face-detector (STUB — plugin not installed; face detection returns empty arrays)

## Ralph Agent Workflow

This repo uses the Ralph autonomous agent system in `scripts/ralph/`.

**Key files**:

- `prd.json` – Machine-readable PRD with all user stories
- `progress.txt` – Append-only log with `## Codebase Patterns` section at top
- `prompt-opencode.md` – Agent instructions

## Known Stubs

4 frame processor hooks currently return neutral/stub data instead of real camera frame analysis:

1. **`useFaceDetection`** (`src/faceDetection/useFaceDetection.ts`) — Returns empty `faces[]`. MLKit plugin (`react-native-vision-camera-face-detector`) is mocked in tests but not installed as a dependency. Pure functions (`computeFaceFramingGuidance`, `selectPrimaryFace`, `calculateFaceAreaPercent`) are implemented and tested.

2. **`useLightingFrameOutput`** (`src/lighting/useLightingFrameProcessor.ts`) — Returns `frameOutput: null`, calls `onLightingStats` once with neutral data (`meanLuminance: 128`). Pure classification functions work; no real pixel analysis.

3. **`useEdgeDetectionFrameOutput`** (`src/edgeDetection/useEdgeDetectionFrameOutput.ts`) — Returns `frameOutput: null`, calls `onFrameStats` once with neutral data. Pure functions in `types.ts` work; no real frame processing.

4. **Aesthetic model loader** (`src/aestheticModel/modelLoader.ts`) — `tryLoadModel()` returns `null`. `react-native-fast-tflite` not installed. Scoring falls back to `method: "rules-only"`.

**To activate these**: Install the missing native dependencies and re-implement the frame output hooks using VisionCamera v5's `useFrameOutput` API with `onFrame` worklet callbacks that process real pixel buffers.

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
- **Face detection**: Plugin returns pixel coordinates; convert to normalized (0-1) for UI
- **Worklet callbacks**: Use `'worklet'` directive and `globalThis.runOnJS` for state updates
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
