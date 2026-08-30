# Testing Patterns

**Analysis Date:** 2026-08-30
**Baseline:** `origin/main` at `c38ed05` (the current `HEAD`; there are no later commits to analyze)

## Test Framework

**Runner:**
- Jest ^29.6.3 with `@react-native/jest-preset` 0.85.2.
- Config: `jest.config.js`; global setup: `jest.setup.js`.
- `jest.setup.js` sets a 10-second timeout and resets the CameraRoll mock before every test.

**Assertion Library:**
- Jest built-in matchers and mock assertions.
- `@testing-library/react-native` 13.3.3 supplies `render`, `renderHook`, `act`, `fireEvent`, and query APIs for components/hooks.

**Run Commands:**
```bash
yarn typecheck                 # Required first; tsc --noEmit
yarn lint                      # ESLint over configured TypeScript scope
yarn test                      # All Jest suites
yarn test --watch              # Jest watch mode
yarn test --coverage           # Local coverage report (no threshold)
yarn test --ci --runInBand     # CI invocation
just check                     # Local typecheck -> lint -> test workflow
```

## Test File Organization

**Location:**
- Tests are separate from source in the root `__tests__/` directory; they are not co-located.
- Native package mocks are centralized under root `__mocks__/`, including scoped package paths such as `__mocks__/@react-native-camera-roll/camera-roll.ts`.

**Naming:**
- Unit/component suites use `<subject>.test.ts` or `<subject>.test.tsx`.
- Cross-module wiring is explicitly named `.integration.test.tsx`, currently `__tests__/CameraScreen.integration.test.tsx`.
- The current tree contains 32 Jest test files.

**Structure:**
```
__tests__/
├── App.test.tsx
├── CameraScreen.integration.test.tsx
├── PostCaptureScreen.test.tsx
├── usePhotoReview.test.ts
├── framePipeline.test.ts
├── scoring.test.ts
├── LocalPhotoStorage.test.ts
└── ...27 additional domain/component suites

__mocks__/
├── react-native-vision-camera.js
├── react-native-mmkv.ts
├── react-native-sensors.js
├── react-native-worklets.js
├── react-native-vision-camera-face-detector.ts
└── @react-native-camera-roll/camera-roll.ts
```

## Test Structure

**Suite Organization:**
```typescript
describe("usePhotoReview", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		(photoStorage.delete as jest.Mock).mockResolvedValue(true);
	});

	it("handleDiscard deletes the single photo and notifies the parent", async () => {
		const { result } = renderHook(() => usePhotoReview(defaultOptions));
		await act(async () => {
			await result.current.handleDiscard();
		});
		expect(photoStorage.delete).toHaveBeenCalledWith("photo-1");
	});
});
```
Pattern from `__tests__/usePhotoReview.test.ts`.

**Patterns:**
- `describe` groups behavior by subject and scenario; `it` names observable behavior.
- `beforeEach` clears mocks and restores default implementations. Timer/sensor suites pair fake setup with `afterEach` cleanup (`__tests__/autoCapture.test.ts`, `__tests__/haptics.test.ts`).
- Hooks use `renderHook` and wrap state changes/promises in `act`; components use `render`, semantic queries, and events.
- Pure functions are called directly with table-like inline cases in suites such as `__tests__/scoring.test.ts` and `__tests__/sensors.test.ts`.
- Assertions emphasize outputs, callback calls, native adapter interactions, and required resource cleanup rather than implementation-private state.

## Mocking

**Framework:** Jest mocks/spies, manual mocks in `__mocks__/`, and `moduleNameMapper` in `jest.config.js`.

**Patterns:**
```typescript
jest.mock("../src/storage", () => ({
	photoStorage: { delete: jest.fn() },
}));

(photoStorage.delete as jest.Mock).mockRejectedValue(
	new Error("Delete failed"),
);
```
Pattern from `__tests__/usePhotoReview.test.ts`.

**What to Mock:**
- Native modules that cannot execute in Node: permissions, VisionCamera, safe-area context, AsyncStorage, sensors, MMKV, CameraRoll, face detector, gesture handler, Reanimated, Worklets, and random-value polyfill. Their exact mappings are in `jest.config.js` and implementations in `__mocks__/`.
- Domain seams when testing a composing hook/screen, such as sensors, face detection, lighting, scoring, storage, and haptics in `__tests__/useShotAnalysis.test.ts` and `__tests__/CameraScreen.integration.test.tsx`.
- Time with Jest fake timers where debounce/countdown behavior matters (`__tests__/autoCapture.test.ts`).

**What NOT to Mock:**
- Pure domain behavior: scoring algorithms (`__tests__/scoring.test.ts`), sensor math (`__tests__/sensors.test.ts`), auto-capture sequencing, and frame pipeline lifecycle.
- Storage adapter orchestration itself; only its native persistence dependencies are mocked in `__tests__/LocalPhotoStorage.test.ts` and `__tests__/EncryptedLocalPhotoStorage.test.ts`.

## Fixtures and Factories

**Test Data:**
```typescript
const burstPhotos = [
	{ id: "burst-1", uri: "file://burst/1.jpg" },
	{ id: "burst-2", uri: "file://burst/2.jpg" },
];

const defaultOptions = {
	photoId: "photo-1",
	onSave: mockOnSave,
	onDiscard: mockOnDiscard,
};
```

**Location:**
- Fixtures and lightweight factories are generally inline in each suite; there is no shared fixture/factory directory.
- Manual native mocks may expose state/reset helpers; `jest.setup.js` calls `CameraRoll.__resetMocks()` globally.

## Coverage

**Requirements:** No coverage threshold or `collectCoverage` policy is configured in `jest.config.js`. CI requires the suite to pass but does not publish/enforce a percentage.

**View Coverage:**
```bash
yarn test --coverage
```

## Test Types

**Unit Tests:**
- Pure calculations, rules, timers, adapters, hooks, and telemetry are covered across files such as `__tests__/scoring.test.ts`, `__tests__/coaching.test.ts`, `__tests__/autoCapture.test.ts`, `__tests__/settings.test.ts`, and `__tests__/telemetry.test.ts`.
- Component tests cover overlays and screens with native boundaries mocked (`__tests__/CompositionOverlay.test.tsx`, `__tests__/SettingsScreen.test.tsx`).

**Integration Tests:**
- `__tests__/CameraScreen.integration.test.tsx` mounts CameraScreen wiring while replacing native/platform boundaries.
- `__tests__/App.test.tsx` and `__tests__/PostCaptureScreen.test.tsx` verify navigation/review flows at the React layer.

**E2E Tests:**
- No mobile E2E framework is configured. Camera/frame processor correctness cannot be established by Jest or simulator alone; `AGENTS.md` requires physical-device validation before a camera user story is considered complete.
- The documentation website has a deployment-level shell smoke test in `.github/workflows/deploy.yml`, not a browser E2E suite. It validates the deployed SHA marker, architecture navigation, ADR links/count, and status badges.

## Common Patterns

**Async Testing:**
```typescript
await act(async () => {
	await result.current.handleSave();
});
```

**Error Testing:**
```typescript
(CameraRoll.saveAsset as jest.Mock).mockRejectedValueOnce(
	new Error("Permission denied"),
);
await expect(storage.save(photo)).rejects.toThrow("Permission denied");
```
Storage propagation is tested in `__tests__/LocalPhotoStorage.test.ts`; recoverable UI cleanup failure is tested in `__tests__/usePhotoReview.test.ts` by asserting `onDiscard` still runs.

## Verification Workflow

- Repository guidance requires `yarn typecheck` before `yarn test`; the complete local gate is typecheck, lint, then test (`just check`, `prek.toml`).
- `.github/workflows/ci.yml` runs independent Node 22 jobs for typecheck, `yarn test --ci --runInBand`, and lint on pushes to `main` and pull requests.
- CI also runs `yarn adr:index`, `yarn dead:check`, a PR-only merge-base dead/test-only export check, and a PR-only ADR requirement check for recorded architectural seams.
- `.github/workflows/deploy.yml` performs a live GitHub Pages smoke test after deployment.
- Native camera, face detection, lighting, edge processing, FPS, and pixel-buffer disposal behavior still require on-device verification; unit/integration tests validate JavaScript contracts and lifecycle intent, not actual device execution.

---

*Testing analysis: 2026-08-30 at `origin/main` `c38ed05`*
