# Coding Conventions

**Analysis Date:** 2026-08-03

## Naming Patterns

**Files:**
- Hooks/modules: `camelCase` (`useShotAnalysis.ts`, `storageWiring.ts`, `countdownTimer.ts`)
- Components/screens: `PascalCase` (`CameraScreen.tsx`, `ScoreRing.tsx`, `FaceOverlay.tsx`)
- Per-module types: `types.ts` (e.g. `src/scoring/types.ts`)

**Functions:**
- `camelCase`, hooks prefixed `use` (`useScoring`, `usePhotoReview`, `useFramePipeline`)

**Variables:**
- `camelCase`; booleans prefixed `is`/`has`/`keep` (`isLevel`, `isBurstMode`, `keepAllBurst`)

**Types:**
- Interfaces `PascalCase` (`ScoreSignals`, `PhotoStorage`, `UseShotAnalysisOptions`); type unions for event names (`TelemetryEvent`)

## Code Style

**Formatting:**
- Prettier 3.9.6 (`.prettierrc.js`) — single quotes, semicolons, trailing commas, `arrowParens: 'avoid'`, default 2-space indent (no tabs)

**Linting:**
- ESLint 9 flat config (`eslint.config.js`) using `@react-native/eslint-config/flat`
- `.js/.jsx` excluded from linting (Flow preset incompatibility with ESLint 9); `scripts/**`, native dirs excluded

## Import Organization

**Order:**
1. React/RN core (`react`, `react-native`)
2. Third-party libraries (`react-native-vision-camera`, `react-native-mmkv`)
3. Relative imports (`../scoring`, `./types`)
4. Type-only imports use `import type { ... }`

**Path Aliases:**
- None — relative paths only

## Error Handling

**Patterns:**
- `try/catch/finally` around async flows with re-entrancy guards (`isSaving`/`isDiscarding` in `usePhotoReview`)
- Failures logged via `console.error`; parent callbacks still invoked to keep UI flowing (e.g. `onDiscard()` even after delete failure)
- Native capability runtime checks (MMKV v4 `createMMKV` guard in `src/storage/settings.ts`; keychain availability in `src/storage/encryptedStorage.ts`)

## Logging

**Framework:** `console` (no logging library)

**Patterns:**
- `console.error` in catch blocks
- User/session events via `src/telemetry` (opt-out gated, ADR-0009); no PII

## Comments

**When to Comment:**
- Module header docblocks explaining responsibility and key decisions (see `useScoring.ts`, `storageWiring.ts`, `telemetry/index.ts`)
- JSDoc/TSDoc on public props/interfaces

**JSDoc/TSDoc:**
- `/** ... */` on exported functions, hooks, props, and interfaces

## Function Design

**Size:**
- Large algorithms kept in dedicated modules (`src/scoring/algorithms.ts`, 578 lines) rather than components
- Screens kept thin; logic extracted to hooks

**Parameters:**
- Options object pattern for hooks (`UseScoringProps`, `UseShotAnalysisOptions`, `UsePhotoReviewOptions`)

**Return Values:**
- Single result object from hooks (`UseScoringResult`, `UsePhotoReviewResult`); narrow seams

## Module Design

**Exports:**
- Each domain exposes an `index.ts` barrel re-exporting its public API
- Concrete adapter/selection details hidden behind seams (e.g. `photoStorage` from `storageWiring`)

**Barrel Files:**
- `index.ts` per domain (e.g. `src/scoring/index.ts`, `src/shotAnalysis/index.ts`, `src/storage/index.ts`)

## Architectural Conventions

- Deep-module pattern: screens render, hooks own behavior (see ADRs 0001–0009 in `.planning/adr/`)
- Adapter selection in one wiring point (`src/storage/storageWiring.ts`)

### ADR Requirement

Architectural changes must be recorded as an ADR in `.planning/adr/` before they
merge. A change is architectural when it alters the shape of a recorded seam
(signature, ownership, or data flow), not just its internals.

**When an ADR is required:** any of the following is touched:

- Scoring intake: `src/scoring/useScoring.ts`, `src/scoring/types.ts` (`ScoreSignals`)
- Analysis seam: `src/shotAnalysis/`
- Storage wiring/interface: `src/storage/storageWiring.ts`, `src/storage/PhotoStorage.ts`
- Post-capture lifecycle: `src/screens/usePhotoReview.ts`
- Frame pipeline: `src/framePipeline/`
- Capture timing: `src/capture/countdownTimer.ts`
- Camera settings: `src/camera/useCameraSettings.ts`
- Telemetry: `src/telemetry/`

**How to comply:** copy `adr-template.md`, use the next number (e.g. `0010-<slug>.md`),
fill in Context / Decision / Consequences, and add a row to the README index.

**Enforcement:** the CI `adr-check` job (`.github/workflows/ci.yml`) fails a pull
request that changes one of the seams above without adding a new `000X-*.md`
record. If the change is not architectural, no ADR is needed — but if CI flags
you, either record the decision or explain in the PR why the seam change is not
architectural.

The rest of the ADR workflow — the `yarn adr:index` generator, the full guard
stack (`adr-check` → `adr-index` → deploy smoke test), and the local
live-vs-local preview recipe (`scripts/serve-pages.mjs`, `yarn diff:pages`) —
is documented in [`website/README.md`](../../website/README.md).

---

*Convention analysis: 2026-08-03*
