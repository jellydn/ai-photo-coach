# Testing Patterns

**Analysis Date:** 2026-08-03

## Test Framework

**Runner:**
- Jest ^29.6.3 with `@react-native/jest-preset`
- Config: `jest.config.js`
- Setup: `jest.setup.js` (10 s timeout; CameraRoll mock reset per test)

**Assertion Library:**
- Jest built-in matchers + `@testing-library/react-native` queries

**Run Commands:**
```bash
yarn test              # Run all tests
yarn test --watch      # Watch mode
yarn typecheck         # tsc --noEmit
yarn lint              # eslint .
```

## Test File Organization

**Location:**
- All tests in a flat `__tests__/` directory (not co-located)

**Naming:**
- `<module>.test.ts` or `<screen>.test.tsx`

**Structure:**
```
__tests__/
├── CameraScreen.integration.test.tsx
├── useShotAnalysis.test.ts
├── usePhotoReview.test.ts
├── useScoring... (covered in scoring.test.ts)
├── LocalPhotoStorage.test.ts
├── EncryptedLocalPhotoStorage.test.ts
├── framePipeline.test.ts
├── countdownTimer.test.ts
├── CaptureStateMachine.test.ts
└── ... (33 suites total)
```

## Test Structure

**Suite Organization:**
```typescript
import { renderHook, act } from "@testing-library/react-native";

describe("useShotAnalysis", () => {
  it("composes the expected signals bundle", () => {
    // arrange / act / assert
  });
});
```

**Patterns:**
- `describe`/`it` blocks; hooks tested via `renderHook` + `act`
- Screens tested via `render` with mocked native modules
- Integration tests mount full flows (e.g. `CameraScreen.integration.test.tsx`)

## Mocking

**Framework:** Jest module mocks (`__mocks__/`) + `moduleNameMapper` in `jest.config.js`

**Patterns:**
```typescript
jest.mock("../src/storage", () => ({ photoStorage: { delete: jest.fn() } }));
```

**What to Mock:**
- All native modules: `react-native-vision-camera`, `react-native-mmkv`, `react-native-sensors`, `react-native-permissions`, `react-native-safe-area-context`, `@react-native-camera-roll/camera-roll`, `react-native-keychain`, `react-native-reanimated`, `react-native-worklets`, `react-native-gesture-handler`, `@react-native-async-storage/async-storage`, `react-native-get-random-values`, face-detector

**What NOT to Mock:**
- Pure logic: scoring algorithms, capture FSM, storage adapters' non-native logic, countdown timer, frame pipeline logic

## Fixtures and Factories

**Test Data:**
- Inline fixtures in each test file (mode configs, `PhotoData`, `ScoreSignals`)

**Location:**
- No shared fixture module; data defined per suite

## Coverage

**Requirements:** None enforced (no `collectCoverage` threshold)

**View Coverage:**
```bash
yarn test --coverage
```

## CI Guard Stack (beyond Jest)

The repo layers non-Jest verification on top of the Jest suite:

- **ADR check** (`ci.yml` `adr-check`) — a PR touching an architectural seam must add a numbered ADR
- **ADR index** (`ci.yml` `adr-index`) — runs `yarn adr:index`; fails if `website/index.html` is dirty
- **Deploy smoke test** (`deploy.yml`) — after Pages deploy, polls the live URL for the `deploy-sha` marker and asserts the Architecture section, nav link, every committed ADR card link, card count, and Accepted/Superseded badges
- **Prettier** — `prettier --check` is available locally (`scripts/` currently excluded from ESLint; a CI prettier job is a known gap, see CONCERNS.md)

**Website:** no unit tests; correctness is enforced by the generator (`generate-adr-index.mjs`) + the deploy smoke test against the live page.

## Test Types

**Unit Tests:**
- Hooks (settings, lighting, stability, shot analysis, photo review, camera settings)
- State machine (`CaptureStateMachine.test.ts`), timer (`countdownTimer.test.ts`)
- Storage adapters, telemetry, scoring, modes, sensors, coaching, haptics

**Integration Tests:**
- `CameraScreen.integration.test.tsx` — camera screen wiring end to end
- `PostCaptureScreen.test.tsx` — review flow with mocked storage
- `App.test.tsx` — app shell routing

**E2E Tests:**
- Not used

## Common Patterns

**Async Testing:**
```typescript
await act(async () => {
  await result.current.handleSave();
});
```

**Error Testing:**
```typescript
jest.spyOn(photoStorage, "delete").mockRejectedValue(new Error("boom"));
await act(async () => { await result.current.handleDiscard(); });
// onDiscard still called
```

---

*Testing analysis: 2026-08-03*
