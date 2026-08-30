# Coding Conventions

**Analysis Date:** 2026-08-30
**Baseline:** `origin/main` at `c38ed05` (the current `HEAD`; there are no later commits to analyze)

## Naming Patterns

**Files:**
- React components and screens use `PascalCase.tsx`, such as `src/screens/CameraScreen.tsx` and `src/scoring/ScoreRing.tsx`.
- Hooks and utility modules use `camelCase.ts`, commonly with a `use` prefix for hooks: `src/shotAnalysis/useShotAnalysis.ts`, `src/autoCapture/useAutoCapture.ts`, and `src/storage/photoIndex.ts`.
- Domain contracts are usually in `types.ts`, for example `src/scoring/types.ts` and `src/faceDetection/types.ts`; public domain surfaces commonly use `index.ts`.

**Functions:**
- Functions use `camelCase`; React hooks begin with `use` (`usePhotoReview`, `useFramePipeline`, `useCameraPermission`).
- Event handlers use `handle...` (`handleSave`, `handleDiscard` in `src/screens/usePhotoReview.ts`).

**Variables:**
- Variables use `camelCase`; booleans generally use `is`, `has`, or an imperative state name (`isSaving`, `isBurstMode`, `keepAllBurst`).
- Tests conventionally prefix spies and callbacks with `mock`, as in `mockOnSave` in `__tests__/usePhotoReview.test.ts`.

**Types:**
- Interfaces and type aliases use `PascalCase` (`UsePhotoReviewOptions`, `ScoreSignals`, `PhotoStorage`).
- Props/options and hook results use descriptive suffixes such as `Options`, `Props`, and `Result` (`src/screens/usePhotoReview.ts`, `src/scoring/useScoring.ts`).
- Type-only dependencies use `import type`, demonstrated by `Dispatch` and `SetStateAction` in `src/screens/usePhotoReview.ts`.

## Code Style

**Formatting:**
- Prettier 3.9.6 is configured in `.prettierrc.js` with single quotes, trailing commas, and omitted parentheses for a single arrow parameter.
- Actual TypeScript sources predominantly use tabs and double quotes (for example `src/screens/usePhotoReview.ts`), so checked-in style does not consistently match `.prettierrc.js`. There is no `format` script or CI Prettier check in `package.json` or `.github/workflows/ci.yml`.
- Semicolons and trailing commas are consistently used in TypeScript.

**Linting:**
- ESLint 9 flat config extends `@react-native/eslint-config/flat` in `eslint.config.js`; run with `yarn lint`.
- Only TypeScript is linted. JavaScript/JSX, `scripts/**`, native projects, generated/dependency directories, and lockfiles are ignored because the React Native preset's Flow JavaScript rules are incompatible with the pinned ESLint version.
- TypeScript is strict through `@react-native/typescript-config`; `tsconfig.json` adds Jest types and excludes mocks, Pods, and dependencies.

## Import Organization

**Order:**
1. React and React Native imports.
2. Third-party package imports.
3. Relative domain/module imports.
4. Type-only imports are separated where useful.

Examples appear in `src/screens/usePhotoReview.ts` and `src/screens/CameraScreen.tsx`. Tests import Testing Library before project modules, as in `__tests__/usePhotoReview.test.ts`.

**Path Aliases:**
- None are configured in `tsconfig.json`; source and tests use relative paths.

## Error Handling

**Patterns:**
- Async UI actions use `try/catch/finally`, busy-state guards, and cleanup in `finally`; see save/discard handling in `src/screens/usePhotoReview.ts` and capture handling in `src/camera/usePhotoCapture.ts`.
- Frame resources must be disposed in `finally`; the centralized implementation is `src/framePipeline/useFramePipeline.ts`, with lifecycle assertions in `__tests__/framePipeline.test.ts`.
- Recoverable persistence corruption is logged and converted to a safe fallback (empty/missing metadata) in `src/storage/LocalPhotoStorage.ts` and `src/storage/EncryptedLocalPhotoStorage.ts`.
- Best-effort cleanup catches and warns without masking the primary operation, such as camera-roll deletion in `src/storage/LocalPhotoStorage.ts` and key deletion in `src/storage/encryptedStorage.ts`.
- Storage operations that cannot be recovered reject to the caller; tests assert propagated errors in `__tests__/LocalPhotoStorage.test.ts`.
- User-flow callbacks may still run after cleanup failure to avoid trapping the UI; `handleDiscard` logs and invokes `onDiscard` in `src/screens/usePhotoReview.ts`.
- Native subscriptions and capabilities are guarded and cleaned up: sensor errors are logged in `src/sensors/useStability.ts`, while face-detector cleanup is protected in `src/faceDetection/useFaceDetection.ts`.

## Logging

**Framework:** `console` plus the domain telemetry abstraction in `src/telemetry/`.

**Patterns:**
- `console.error` reports failed required operations and malformed persisted data; `console.warn` reports best-effort cleanup failures.
- Product/session events go through `TelemetryProvider` implementations (`src/telemetry/ConsoleTelemetryProvider.ts`, `src/telemetry/NullTelemetryProvider.ts`) rather than direct analytics SDK calls.
- Logging statements include operation context but avoid exposing photo content; telemetry policy is documented and enforced through the `src/telemetry/` seam.

## Comments

**When to Comment:**
- Domain modules often begin with a responsibility/decision docblock, particularly deep seams such as `src/screens/usePhotoReview.ts` and `src/framePipeline/useFramePipeline.ts`.
- Inline comments explain lifecycle requirements, native API constraints, and non-obvious fallback behavior rather than restating code.
- Worklet code explicitly includes the required `'worklet'` directive; frame-disposal comments reinforce native resource ownership.

**JSDoc/TSDoc:**
- `/** ... */` is common on exported hooks, interfaces, props, and public functions, but is not mandatory for every export.

## Function Design

**Size:** Screens compose UI and delegate stateful behavior to hooks; examples are `src/screens/PostCaptureScreen.tsx` with `src/screens/usePhotoReview.ts`, and `src/screens/CameraScreen.tsx` with hooks under `src/camera/` and `src/shotAnalysis/`. Pure algorithms are isolated in modules such as `src/scoring/algorithms.ts` and `src/sensors/math.ts`.

**Parameters:** Hooks and multi-input functions favor typed options objects. Small pure functions use positional scalar parameters. Async public operations declare `Promise` return types.

**Return Values:** Hooks return named result objects with explicit interfaces; pure calculations return deterministic values suitable for direct unit tests. Optional native data uses `undefined`/empty collections and explicit capability guards rather than unchecked assertions.

## Module Design

**Exports:** Domain internals expose a narrow public API through named exports and typed interfaces. Adapter selection is centralized in `src/storage/storageWiring.ts`; callers consume `photoStorage` through `src/storage/index.ts`.

**Barrel Files:** Most domains have an `index.ts` barrel (`src/scoring/index.ts`, `src/telemetry/index.ts`, `src/framePipeline/index.ts`). New exports must have a production consumer or satisfy the documented exception process because `.github/workflows/ci.yml` runs `yarn dead:check` and a PR merge-base dead/test-only export guard.

**Architectural seams:** Changes to scoring intake, shot analysis, storage wiring/interface, photo review lifecycle, frame pipeline, capture timing, camera settings, or telemetry require an ADR under `.planning/adr/`; the exact path matcher is enforced by the `adr-check` job in `.github/workflows/ci.yml`.

---

*Convention analysis: 2026-08-30 at `origin/main` `c38ed05`*
