# Codebase Structure

**Analysis Date:** 2026-08-03

## Directory Layout

```
[project-root]/
├── App.tsx                       # App shell: screen state machine + navigation
├── index.js                      # RN entry: AppRegistry.registerComponent
├── src/
│   ├── screens/                  # Screens (thin orchestrators) + usePhotoReview
│   │   └── onboarding/           # Onboarding flow (navigator + 3 screens)
│   ├── shotAnalysis/             # useShotAnalysis deep module (analysis seam)
│   ├── scoring/                  # useScoring + ScoreSignals bundle, algorithms
│   ├── sensors/                  # Horizon, pitch, stability hooks
│   ├── lighting/                 # Lighting analysis + frame processor
│   ├── faceDetection/            # Face detection + framing + group analysis
│   ├── edgeDetection/            # Edge detection + frame output
│   ├── documentDetection/        # Document skew detection
│   ├── framePipeline/            # Shared VisionCamera worklet lifecycle
│   ├── aestheticModel/           # Aesthetic score model (stubbed TFLite)
│   ├── camera/                   # Capture, settings, mode, permission hooks
│   ├── capture/                  # Capture state machine + countdown timer
│   ├── autoCapture/              # Auto-capture at score threshold
│   ├── storage/                  # PhotoStorage seam, adapters, settings
│   ├── telemetry/                # Telemetry tracker + providers
│   ├── coaching/                 # Prompt coaching (mode-specific tips)
│   ├── config/                   # Shooting modes + metadata
│   ├── components/               # Shared overlays (composition, horizon)
│   └── haptics/                  # Haptic feedback
├── __tests__/                    # All tests (flat, 33 suites)
├── __mocks__/                    # Jest module mocks for native libs
├── website/                      # Static landing page (GitHub Pages)
├── scripts/                      # Node build tooling
├── android/ ios/                 # Native shells
└── assets/                       # App assets
```

## Directory Purposes

**`src/screens/`:** UI screens. `CameraScreen.tsx` (694 lines) is the camera orchestrator; `PostCaptureScreen.tsx` (505) renders the review; `usePhotoReview.ts` holds the save/discard lifecycle (ADR-0004). Onboarding flow under `onboarding/`.

**`src/shotAnalysis/`:** The analysis seam (ADR-0002). `useShotAnalysis.ts` owns all sensor/frame-analysis hook wiring, mode-gated analysis, and the scoring intake.

**`src/scoring/`:** `useScoring.ts` computes the 0–100 readiness score at 10 Hz from a typed `ScoreSignals` bundle (ADR-0001). `algorithms.ts` (578 lines) holds the scoring math.

**`src/storage/`:** `PhotoStorage.ts` interface + `LocalPhotoStorage`/`EncryptedLocalPhotoStorage` adapters, `storageWiring.ts` (single adapter selection point, ADR-0003), `settings.ts` (MMKV-backed, with encrypted variants), `encryptedStorage.ts` (keychain-backed MMKV), `photoIndex.ts` (shared index primitives), `onboarding.ts`.

**`src/capture/`:** `CaptureStateMachine.ts` (320 lines) + `useCaptureStateMachine.ts`; `countdownTimer.ts` deep timer module (ADR-0006).

**`src/camera/`:** `useCameraSettings.ts` (ADR-0005), `usePhotoCapture.ts`, `useCameraMode.ts`, `useCameraPermission.ts`, `useModePrompts.ts`, `useProductCentering.ts` (TODO: real frame analysis).

**`src/telemetry/`:** `index.ts` tracker + `ConsoleTelemetryProvider`/`NullTelemetryProvider` + `installId.ts` (ADR-0009).

## Key File Locations

**Entry Points:**
- `index.js`: registers `App` with the app registry
- `App.tsx`: top-level screen state machine (`onboarding | modeSelector | camera | postCapture | settings`)
- `website/index.html`: landing page entry

**Configuration:**
- `src/config/modes.ts` + `modeMetadata.ts`: shooting modes and per-mode thresholds
- `jest.config.js`, `babel.config.js`, `metro.config.js`, `eslint.config.js`, `tsconfig.json`
- `.github/workflows/ci.yml`: Typecheck / Test / Lint + ADR guards (`adr-check`, `adr-index`)
- `.github/workflows/deploy.yml`: Pages deploy + deploy-sha stamp + post-deploy smoke test

**Core Logic:**
- `src/shotAnalysis/useShotAnalysis.ts`: analysis composition + scoring intake
- `src/scoring/algorithms.ts`: score computation
- `src/storage/storageWiring.ts`: adapter selection
- `src/capture/CaptureStateMachine.ts`: capture FSM

**Testing:**
- `__tests__/` flat directory; `*.test.ts(x)`; native modules mocked via `__mocks__/` + `moduleNameMapper`

## Naming Conventions

**Files:**
- Hooks/modules: `camelCase` (`useShotAnalysis.ts`, `storageWiring.ts`)
- Components/screens: `PascalCase` (`CameraScreen.tsx`, `ScoreRing.tsx`)
- Types: `types.ts` per module

**Directories:**
- `camelCase` domain directories mirroring a concern (e.g. `faceDetection/`, `framePipeline/`)

## Where to Add New Code

**New Feature:**
- Primary code: new/existing domain dir under `src/` with an `index.ts` barrel
- Tests: `__tests__/<feature>.test.ts`

**New Component/Module:**
- Implementation: `src/components/` (shared UI) or its domain dir; hooks as `useX.ts` deep modules consumed by thin screens

**Utilities:**
- Shared helpers: `src/sensors/math.ts`, `src/storage/photoIndex.ts`, or a new `src/<domain>/` module

## Special Directories

**`.planning/adr/` (ADR records):**
- Purpose: Numbered architecture decision records (`0001`–`0009`); the `adr-check` CI guard requires a new record for architectural-seam changes, and the website ADR index is generated from them
- Generated: No
- Committed: Yes

**`website/`:**
- Purpose: Static marketing/landing page (`index.html`, `style.css`, `script.js`) with a generated Architecture/ADR section
- Generated: Partially — the ADR grid between `<!-- ADR-GRID:BEGIN -->` / `<!-- ADR-GRID:END -->` markers is regenerated by `scripts/generate-adr-index.mjs` (`yarn adr:index`); CI stamps an invisible `deploy-sha` marker before upload
- Committed: Yes; deployed to GitHub Pages via `deploy.yml`

**`__mocks__/`:**
- Purpose: Jest module mocks for native modules (vision-camera, mmkv, sensors, permissions, camera-roll, reanimated, worklets, etc.)
- Generated: No
- Committed: Yes

**`scripts/`:**
- Purpose: Dependency-free Node tooling (`.mjs`); excluded from lint
- `generate-adr-index.mjs` — regenerate the website ADR grid from `.planning/adr/*.md` (`yarn adr:index`)
- `serve-pages.mjs` — loopback proxy exposing `/local/` (disk) and `/live/` (Pages) for preview diffing
- `diff-pages.mjs` — unified diff of local vs live site (`yarn diff:pages`)
- `generate-icons.mjs` — native iOS/Android icon + splash generation
- Generated: No
- Committed: Yes

---

*Structure analysis: 2026-08-03*
