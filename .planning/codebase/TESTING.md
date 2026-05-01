# Testing Patterns

**Analysis Date:** 2026-05-01

## Test Framework

**Runner:**
- Jest 29.6.3 with `@react-native/jest-preset` 0.85.2 from `package.json` and `jest.config.js`.
- React Native Testing Library `@testing-library/react-native` 13.3.3 for component and hook tests, used in `__tests__/SettingsScreen.test.tsx`, `__tests__/PostCaptureScreen.test.tsx`, `__tests__/autoCapture.test.ts`, and `__tests__/useLighting.test.ts`.
- React Test Renderer `react-test-renderer` 19.2.3 for snapshot/tree-style component rendering, used in `__tests__/App.test.tsx`, `__tests__/CompositionOverlay.test.tsx`, and `__tests__/HorizonIndicator.test.tsx`.
- Config: `jest.config.js`

**Assertion Library:**
- Jest `expect` assertions are used across all test files, including `toBe`, `toEqual`, `toBeTruthy`, `toBeNull`, `toHaveBeenCalledWith`, `rejects.toThrow`, and `toMatch` in `__tests__/scoring.test.ts`, `__tests__/PostCaptureScreen.test.tsx`, `__tests__/LocalPhotoStorage.test.ts`, and `__tests__/telemetry.test.ts`.
- React Native Testing Library query APIs (`getByText`, `getByTestId`, `queryByText`, `screen`, `waitFor`, `fireEvent`) are used in `__tests__/SettingsScreen.test.tsx` and `__tests__/PostCaptureScreen.test.tsx`.

**Run Commands:**
```bash
yarn test              # Run all tests (package.json)
yarn test --watch     # Watch mode via Jest CLI
yarn test --coverage  # Coverage via Jest CLI; no coverage script is defined in package.json
```

## Test File Organization

**Location:**
- Tests are centralized in root `__tests__/` rather than colocated with source files.
- Native/module mocks are centralized in root `__mocks__/` and mapped through `jest.config.js`.
- Source files under `src/` are organized by domain, with tests mirroring domains through names such as `__tests__/scoring.test.ts`, `__tests__/coaching.test.ts`, `__tests__/lighting.test.ts`, `__tests__/edgeDetection.test.ts`, `__tests__/settings.test.ts`, and `__tests__/telemetry.test.ts`.

**Naming:**
- Test files use `*.test.ts` for pure TypeScript logic and hook/storage tests, including `__tests__/scoring.test.ts`, `__tests__/coaching.test.ts`, `__tests__/sensors.test.ts`, `__tests__/useStability.test.ts`, `__tests__/useLighting.test.ts`, and `__tests__/LocalPhotoStorage.test.ts`.
- Test files use `*.test.tsx` for React components/screens, including `__tests__/App.test.tsx`, `__tests__/CompositionOverlay.test.tsx`, `__tests__/HorizonIndicator.test.tsx`, `__tests__/SettingsScreen.test.tsx`, and `__tests__/PostCaptureScreen.test.tsx`.
- Hook-focused tests are named after the hook or domain, including `__tests__/useLighting.test.ts`, `__tests__/useStability.test.ts`, `__tests__/autoCapture.test.ts`, and `__tests__/haptics.test.ts`.

**Structure:**
```
__tests__/
  App.test.tsx
  CompositionOverlay.test.tsx
  HorizonIndicator.test.tsx
  SettingsScreen.test.tsx
  PostCaptureScreen.test.tsx
  scoring.test.ts
  coaching.test.ts
  sensors.test.ts
  useStability.test.ts
  useLighting.test.ts
  autoCapture.test.ts
  haptics.test.ts
  LocalPhotoStorage.test.ts
  telemetry.test.ts
  modes.test.ts
  lighting.test.ts
  edgeDetection.test.ts
  faceDetection.test.ts
  groupPhoto.test.ts
  documentMode.test.ts
  productMode.test.ts
  pitchDetection.test.ts
  aestheticModel.test.ts
__mocks__/
  react-native-vision-camera.js
  react-native-mmkv.ts
  react-native-sensors.js
  react-native-permissions.js
  react-native-safe-area-context.js
  react-native-reanimated.js
  react-native-worklets-core.ts
  react-native-worklets.js
  react-native-gesture-handler.ts
  react-native-vision-camera-face-detector.ts
  @react-native-camera-roll/camera-roll.ts
  @react-native-async-storage/async-storage.js
```

## Test Structure

**Suite Organization:**
```typescript
// Example shape from `__tests__/coaching.test.ts` and `__tests__/scoring.test.ts`
describe("Coaching Prompt Engine", () => {
	describe("selectPrompt", () => {
		const baseContext = { /* domain defaults */ };

		describe("Priority 1: Stability", () => {
			it("should return 'Hold steady' when device is unstable", () => {
				const signals = { /* test inputs */ };
				const result = selectPrompt(signals, baseContext);
				expect(result).toBe(COACHING_PROMPTS.UNSTABLE);
			});
		});
	});
});
```

**Patterns:**
- Pure function tests are highly granular and grouped by function/behavior, such as `computeStabilityScore`, `computeLevelScore`, and `computeWeightedScore` suites in `__tests__/scoring.test.ts`, plus `selectPrompt`, `isReadyForCapture`, and `shouldUpdatePrompt` suites in `__tests__/coaching.test.ts`.
- Hook tests use `renderHook` and `act` from `@testing-library/react-native`, including `__tests__/autoCapture.test.ts`, `__tests__/useLighting.test.ts`, and `__tests__/haptics.test.ts`.
- Component/screen tests use `render`, `screen`, `fireEvent`, and `waitFor` from `@testing-library/react-native`, especially `__tests__/SettingsScreen.test.tsx` and `__tests__/PostCaptureScreen.test.tsx`.
- Some visual overlay components use `ReactTestRenderer.act` and direct prop/testID lookup in `__tests__/CompositionOverlay.test.tsx` and `__tests__/HorizonIndicator.test.tsx`.
- Setup commonly uses `beforeEach` with `jest.clearAllMocks()` and domain resets, including `__tests__/SettingsScreen.test.tsx`, `__tests__/PostCaptureScreen.test.tsx`, `__tests__/LocalPhotoStorage.test.ts`, and `__tests__/telemetry.test.ts`.
- Teardown restores globals when overwritten, such as restoring `console.log` in `__tests__/telemetry.test.ts`.
- Assertions favor deterministic object/value checks over snapshots; no snapshot files were observed in `__tests__/`.

## Mocking

**Framework:** Jest

**Patterns:**
```typescript
// Global module mapping from `jest.config.js`
moduleNameMapper: {
	"^react-native-vision-camera$": "<rootDir>/__mocks__/react-native-vision-camera.js",
	"^react-native-mmkv$": "<rootDir>/__mocks__/react-native-mmkv.ts",
	"^@react-native-camera-roll/camera-roll$": "<rootDir>/__mocks__/@react-native-camera-roll/camera-roll.ts",
}

// Inline module mocks from `__tests__/SettingsScreen.test.tsx`
jest.mock("../src/storage/settings", () => ({
	getAutoCaptureEnabled: jest.fn(),
	setAutoCaptureEnabled: jest.fn(),
	getHapticFeedbackEnabled: jest.fn(),
	setHapticFeedbackEnabled: jest.fn(),
}));
```

**What to Mock:**
- Native React Native modules and device APIs are mocked globally through `jest.config.js`, including `react-native-permissions`, `react-native-vision-camera`, `react-native-safe-area-context`, `react-native-sensors`, `react-native-mmkv`, `@react-native-camera-roll/camera-roll`, `react-native-vision-camera-face-detector`, `react-native-gesture-handler`, `react-native-reanimated`, `react-native-worklets-core`, and `react-native-worklets`.
- VisionCamera v5 camera APIs are mocked in `__mocks__/react-native-vision-camera.js`, including `Camera`, `useCameraDevice`, `useCameraPermission`, `usePhotoOutput`, `useFrameOutput`, and `createMockFrame`.
- MMKV storage is mocked with an in-memory `Map` in `__mocks__/react-native-mmkv.ts`, supporting `getString`, `set`, `remove`, `clearAll`, `contains`, and test helpers.
- Camera roll persistence is mocked with an in-memory photo store and reset helper in `__mocks__/@react-native-camera-roll/camera-roll.ts`.
- Screen-local dependencies are mocked inline where isolating UI behavior is clearer, such as `../src/storage/settings` and `../src/telemetry` in `__tests__/SettingsScreen.test.tsx`, and `../src/storage` in `__tests__/PostCaptureScreen.test.tsx`.
- Console output is mocked when testing logging providers, as in `__tests__/telemetry.test.ts`.

**What NOT to Mock:**
- Pure functions are imported directly and tested without mocks, including scoring helpers in `__tests__/scoring.test.ts`, coaching helpers in `__tests__/coaching.test.ts`, sensor math in `__tests__/sensors.test.ts`, mode configuration in `__tests__/modes.test.ts`, and lighting/edge/document detection utilities in `__tests__/lighting.test.ts`, `__tests__/edgeDetection.test.ts`, and `__tests__/documentMode.test.ts`.
- Hook internals are usually exercised through public hook APIs rather than mocking React state/effects, including `useAutoCapture` in `__tests__/autoCapture.test.ts`, `useLighting` in `__tests__/useLighting.test.ts`, and `useHaptics` in `__tests__/haptics.test.ts`.
- Domain constants and config are not mocked in core algorithm tests; expected outputs are asserted directly against exported constants from `src/scoring/types.ts`, `src/coaching/types.ts`, and `src/config/modes.ts`.

## Fixtures and Factories

**Test Data:**
```typescript
// Representative fixtures from `__tests__/PostCaptureScreen.test.tsx`
const defaultSubScores: SubScores = {
	stability: 85,
	level: 70,
	framing: 90,
	lighting: 75,
	aesthetic: 80,
	flatLay: 85,
	groupFraming: 100,
	centering: 80,
	documentSkew: 90,
	lowLightStability: 85,
};

const defaultProps = {
	photoId: "test-photo-123",
	photoUri: "file://test/photo.jpg",
	subScores: defaultSubScores,
	weakestSubscore: "level" as const,
	onSave: mockOnSave,
	onDiscard: mockOnDiscard,
};
```

**Location:**
- Fixtures are generally defined inside individual test files near the suites that use them, including `defaultSubScores` and `defaultProps` in `__tests__/PostCaptureScreen.test.tsx`, `baseContext` in `__tests__/coaching.test.ts`, and `mockPhoto` in `__tests__/LocalPhotoStorage.test.ts`.
- Mock factories/helpers live in module mocks when shared across tests, including `createMockFrame` in `__mocks__/react-native-vision-camera.js`, `CameraRoll.__resetMocks` in `__mocks__/@react-native-camera-roll/camera-roll.ts`, and MMKV test helpers in `__mocks__/react-native-mmkv.ts`.
- Lighting and frame-processing tests build inline frame stats objects in `__tests__/useLighting.test.ts` and pure luminance fixtures in `__tests__/lighting.test.ts`.

## Coverage

**Requirements:** None enforced in configuration

**View Coverage:**
```bash
yarn test --coverage
```

## Test Types

**Unit Tests:**
- Primary test type. Pure algorithms are extensively covered in `__tests__/scoring.test.ts`, `__tests__/coaching.test.ts`, `__tests__/sensors.test.ts`, `__tests__/lighting.test.ts`, `__tests__/edgeDetection.test.ts`, `__tests__/faceDetection.test.ts`, `__tests__/documentMode.test.ts`, `__tests__/productMode.test.ts`, `__tests__/groupPhoto.test.ts`, and `__tests__/pitchDetection.test.ts`.
- Hook units are covered with `renderHook` in `__tests__/autoCapture.test.ts`, `__tests__/useLighting.test.ts`, `__tests__/useStability.test.ts`, and `__tests__/haptics.test.ts`.
- Storage and telemetry units are covered with native mocks in `__tests__/LocalPhotoStorage.test.ts`, `__tests__/settings.test.ts`, and `__tests__/telemetry.test.ts`.

**Integration Tests:**
- Lightweight component/screen integration tests render UI with mocked dependencies, including `__tests__/SettingsScreen.test.tsx`, `__tests__/PostCaptureScreen.test.tsx`, and `__tests__/App.test.tsx`.
- Domain integration is partly covered by tests that combine inputs through public APIs, including full score computation in `__tests__/scoring.test.ts`, prompt readiness behavior in `__tests__/coaching.test.ts`, and lighting hook plus frame output interactions in `__tests__/useLighting.test.ts`.
- Native device/camera behavior is not exercised against real hardware in Jest; `jest.config.js` routes native modules to mocks under `__mocks__/`.

**E2E Tests:**
- Not used. No Detox, Maestro, Appium, or similar E2E dependency/script appears in `package.json`, and no E2E test directory was observed.

## Common Patterns

**Async Testing:**
```typescript
// From `__tests__/PostCaptureScreen.test.tsx`
fireEvent.press(screen.getByTestId("discard-button"));

await waitFor(() => {
	expect(photoStorage.delete).toHaveBeenCalledWith("test-photo-123");
	expect(mockOnDiscard).toHaveBeenCalledTimes(1);
});
```
- Hook state changes are wrapped in `act`, including `__tests__/autoCapture.test.ts` and `__tests__/useLighting.test.ts`.
- Promise-returning storage calls are awaited directly in `__tests__/LocalPhotoStorage.test.ts`.
- Timer-driven behavior uses real timers for `useAutoCapture` in `__tests__/autoCapture.test.ts` and fake timers for lighting simulation in `__tests__/useLighting.test.ts`.

**Error Testing:**
```typescript
// From `__tests__/LocalPhotoStorage.test.ts`
(CameraRoll.saveAsset as jest.Mock).mockRejectedValueOnce(
	new Error("Permission denied"),
);

await expect(
	storage.save(mockPhoto, { mode: "portrait", score: 80 }),
).rejects.toThrow("Permission denied");
```
- UI error resilience is asserted by rejected dependency mocks while expecting callbacks to still fire, as in discard failure handling in `__tests__/PostCaptureScreen.test.tsx`.
- Storage corruption/error behavior is covered by safe fallback tests in `__tests__/LocalPhotoStorage.test.ts` and settings persistence tests in `__tests__/settings.test.ts`.
- Telemetry opt-out and provider behavior are checked with mock providers and console replacement in `__tests__/telemetry.test.ts`.

---

*Testing analysis: 2026-05-01*
