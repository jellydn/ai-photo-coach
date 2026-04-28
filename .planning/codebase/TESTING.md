# Testing Patterns

**Analysis Date:** 2026-04-28

## Test Framework

**Runner:**
- Framework: Jest 29.6.3
- Config: `jest.config.js`
- Preset: `@react-native/jest-preset`
- Setup file: `jest.setup.js` (global timeout, mock resets)

**Assertion Library:**
- Jest built-in matchers
- `@testing-library/react-native` for component/hook testing

**Run Commands:**
```bash
yarn test              # Run all tests
yarn test --watch      # Watch mode (Jest native)
yarn test --coverage   # Coverage report (not currently configured)
```

**Quality Gates:**
```bash
yarn typecheck         # Required to pass before tests (tsc --noEmit)
yarn lint              # ESLint check
yarn test              # Jest test suite
```

## Test File Organization

**Location:**
- Pattern: Separate `__tests__/` directory at project root
- Not co-located with source files
- Mirrors `src/` structure conceptually

**Naming:**
- `.test.ts` for pure functions and hooks
- `.test.tsx` for React components
- Match source file name (e.g., `scoring.test.ts` tests `src/scoring/types.ts`)

**Structure:**
```
__tests__/
  ├── App.test.tsx
  ├── autoCapture.test.ts
  ├── coaching.test.ts
  ├── CompositionOverlay.test.tsx
  ├── edgeDetection.test.ts
  ├── faceDetection.test.ts
  ├── HorizonIndicator.test.tsx
  ├── lighting.test.ts
  ├── LocalPhotoStorage.test.ts
  ├── modes.test.ts
  ├── PostCaptureScreen.test.tsx
  ├── scoring.test.ts
  ├── sensors.test.ts
  ├── settings.test.ts
  ├── telemetry.test.ts
  ├── useLighting.test.ts
  ├── useStability.test.ts
  └── SettingsScreen.test.tsx
```

**Current Count:** 18 test files covering 390+ tests

## Test Structure

**Suite Organization:**
```typescript
describe("ModuleName", () => {
  describe("functionName", () => {
    it("should do something specific", () => {
      // Arrange
      const input = ...;
      
      // Act
      const result = functionName(input);
      
      // Assert
      expect(result).toBe(expected);
    });
  });
});
```

**Patterns:**

1. **Hook Testing Pattern:**
```typescript
import { renderHook, act } from "@testing-library/react-native";

const { result } = renderHook(() => useMyHook({ enabled: true }));

// Update state
act(() => {
  result.current.handleFrameStats(frameStats);
});

// Assert
expect(result.current.lightingClass).toBe("too_dark");
```

2. **Component Testing Pattern:**
```typescript
import ReactTestRenderer from "react-test-renderer";

await ReactTestRenderer.act(async () => {
  testRenderer = ReactTestRenderer.create(
    <HorizonIndicator roll={0} isLevel={true} visible={true} />
  );
});

const testInstance = testRenderer!.root;
const indicator = testInstance.findByProps({ testID: "horizon-test" });
expect(indicator).toBeTruthy();
```

3. **Async Testing Pattern:**
```typescript
// Use real timers for predictable async
jest.useRealTimers();

// Or fake timers for countdown tests
jest.useFakeTimers();
await act(async () => {
  jest.advanceTimersByTime(100);
});
jest.useRealTimers();
```

4. **Rerender Pattern:**
```typescript
const { result, rerender } = renderHook(
  (props: { score: number; isStable: boolean }) =>
    useAutoCapture({
      enabled: true,
      score: props.score,
      isStable: props.isStable,
      autoCaptureThreshold: 80,
    }),
  { initialProps: { score: 85, isStable: true } },
);

// Update props
act(() => {
  rerender({ score: 75, isStable: true });
});
```

## Mocking

**Framework:** Jest manual mocks

**Location:** `__mocks__/` directory at project root

**Native Module Mocks (13 total):**

| Package | Mock File | Pattern |
|---------|-----------|---------|
| react-native-permissions | `.js` | Jest mock functions |
| react-native-vision-camera | `.js` | Detailed mock with typedefs |
| react-native-safe-area-context | `.js` | Simple component mock |
| @react-native-async-storage/async-storage | `.js` | Key-value store mock |
| react-native-sensors | `.js` | RxJS-style subscription mock |
| react-native-mmkv | `.ts` | Class-based mock with test helpers |
| @react-native-camera-roll/camera-roll | `.ts` | Mock store + testing helpers |
| react-native-vision-camera-face-detector | `.ts` | Plugin mock |
| react-native-gesture-handler | `.ts` | Handler mock |
| react-native-reanimated | `.js` | Worklet/value mock |
| react-native-worklets-core | `.ts` | Core worklet mock |
| react-native-worklets | `.js` | Worklet runtime mock |

**Mock Pattern Examples:**

1. **Class-based Mock with Test Helpers:**
```typescript
class MMKV {
  private store: Map<string, string> = new Map();
  
  getString(key: string): string | undefined {
    return this.store.get(key);
  }
  
  // Testing helpers
  __getStore(): Map<string, string> { return this.store; }
}

export { createMMKV, MMKV };
```

2. **RxJS Subscription Mock:**
```typescript
export const accelerometer = {
  subscribe: jest.fn(() => ({
    unsubscribe: jest.fn(),
  })),
};
```

3. **Complex API Mock with Fixtures:**
```typescript
export const CameraRoll = {
  saveAsset: jest.fn(async (uri: string) => {
    const photo: PhotoIdentifier = { ... };
    mockPhotoStore.push(photo);
    return photo;
  }),
  
  // Testing helpers
  __resetMocks: () => { ... },
  __getMockStore: () => mockPhotoStore,
};
```

**Jest Config Module Name Mapper:**
```javascript
moduleNameMapper: {
  "^react-native-permissions$": "<rootDir>/__mocks__/react-native-permissions.js",
  "^react-native-mmkv$": "<rootDir>/__mocks__/react-native-mmkv.ts",
  // ... all packages mapped
}
```

**What to Mock:**
- All native modules (native APIs unavailable in Node.js test environment)
- Camera, sensors, storage, permissions
- Animation libraries (Reanimated)
- Frame processors (VisionCamera)

**What NOT to Mock:**
- Pure functions (test actual implementation)
- Business logic in `types.ts` files
- React Native core components (provided by preset)

## Fixtures and Factories

**Test Data:**
- Inline fixtures in test files for clarity
- Factory functions for complex objects
- Type-safe fixtures using exported types

**Pattern:**
```typescript
const baseSignals: ScoreSignals = {
  stability: 0.01,
  isStable: true,
  rollDeviation: 0,
  isLevel: true,
  framingGuidance: null,
  faceAreaPercent: 35,
  lightingClass: "good",
  faceFramingEnabled: true,
  lightingAnalysisEnabled: true,
};

// Override for specific test
const darkSignals: ScoreSignals = {
  ...baseSignals,
  lightingClass: "too_dark",
};
```

**Mock Frame Factory:**
```typescript
export function createMockFrame(overrides = {}) {
  const width = overrides.width ?? 640;
  const height = overrides.height ?? 480;
  // ... create pixel data
  return {
    width,
    height,
    getPixelBuffer: jest.fn(() => pixelData.buffer),
    dispose: jest.fn(),
    ...overrides,
  };
}
```

## Coverage

**Requirements:** None enforced (no coverage thresholds configured)

**View Coverage:**
```bash
yarn test --coverage
```

**Current Status:** Not configured in jest.config.js

## Test Types

**Unit Tests:**
- Pure functions in `types.ts` files (scoring, coaching, lighting)
- Sensor math utilities
- Algorithmic calculations
- 90%+ of test suite

**Integration Tests:**
- Hook integration (e.g., `useLighting` + `useLightingFrameOutput`)
- Storage with mocked native modules
- Component rendering with `react-test-renderer`

**E2E Tests:**
- Not used
- Relies on manual device testing per AGENTS.md requirements

## Common Patterns

**Async Testing:**
```typescript
// waitFor for async state changes
await waitFor(() => {
  expect(result.current.state).toBe("counting");
}, { timeout: 100 });

// Promises with real timers
await new Promise<void>((resolve) => setTimeout(resolve, 10));
```

**Error Testing:**
```typescript
it("should handle CameraRoll.saveAsset failure", async () => {
  (CameraRoll.saveAsset as jest.Mock).mockRejectedValueOnce(
    new Error("Permission denied"),
  );
  
  await expect(
    storage.save(mockPhoto, { mode: "portrait", score: 80 })
  ).rejects.toThrow("Permission denied");
});
```

**Timer Testing:**
```typescript
jest.useFakeTimers();

await act(async () => {
  jest.advanceTimersByTime(50);
});

jest.useRealTimers();
```

**State Reset Pattern:**
```typescript
beforeEach(() => {
  storage = new LocalPhotoStorage();
  storage.clearAllMetadata();
  if (CameraRoll.__resetMocks) {
    CameraRoll.__resetMocks();
  }
});
```

## Testing Best Practices (from AGENTS.md)

1. **Unit test pattern:** Pure functions in `__tests__/*.test.ts`, component tests in `*.test.tsx`
2. **All native modules must be mocked** in `__mocks__/{package}.{js,ts}`
3. Add mocks to `jest.config.js` `moduleNameMapper`
4. Exclude `__mocks__` from tsconfig (`"exclude": ["**/__mocks__/**"]`)
5. Use `@testing-library/react-native` for hooks: `renderHook(() => useMyHook())`
6. Use `ReturnType<typeof setTimeout>` for cross-platform timeouts
7. Run `typecheck` before `test` - tests depend on type-correct code

## Jest Configuration Summary

```javascript
module.exports = {
  preset: "@react-native/jest-preset",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  moduleNameMapper: {
    // 13 native module mocks mapped
  },
  transformIgnorePatterns: [
    "node_modules/(?!(react-native|@react-native|react-native-.*|@react-native-.*)/)",
  ],
};
```

**Jest Setup:**
```javascript
// jest.setup.js
jest.setTimeout(10000);

beforeEach(() => {
  if (CameraRoll.__resetMocks) {
    CameraRoll.__resetMocks();
  }
});
```

---

*Testing analysis: 2026-04-28*
