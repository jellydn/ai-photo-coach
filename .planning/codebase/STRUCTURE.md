# Codebase Structure

**Analysis Date:** 2026-08-30

## Directory Layout

```
[project-root]/
├── index.js                       # React Native AppRegistry bootstrap
├── App.tsx                        # App shell and manual screen state machine
├── src/
│   ├── screens/                   # Main screens and photo-review hook
│   │   └── onboarding/            # Three-step onboarding flow
│   ├── camera/                    # Camera mode, permission, settings, prompts, capture
│   ├── shotAnalysis/              # Unified live-analysis composition seam
│   ├── framePipeline/             # Shared VisionCamera worklet lifecycle
│   ├── sensors/                   # Horizon, pitch, stability acquisition/math
│   ├── faceDetection/             # Native face detection, guidance, overlays
│   ├── lighting/                  # Pixel luminance analysis and frame output
│   ├── edgeDetection/             # Dominant-edge analysis and frame output
│   ├── documentDetection/         # Document skew calculations
│   ├── scoring/                   # Pure scoring, weights, hook, score UI
│   ├── coaching/                  # Prompt selection/debounce and prompt UI
│   ├── autoCapture/               # Active countdown/burst auto-capture hook/UI
│   ├── capture/                   # Alternative pure capture FSM and timer
│   ├── storage/                   # PhotoStorage adapters and persisted state
│   ├── telemetry/                 # Events, providers, tracker, install ID
│   ├── config/                    # Mode thresholds and display metadata
│   ├── components/                # Shared composition/horizon overlays
│   └── haptics/                   # Feedback policy and hook
├── __tests__/                     # Flat Jest test suite (32 files)
├── __mocks__/                     # Native-module Jest mocks
├── android/                       # Android Gradle/native application
├── ios/                           # iOS Xcode/CocoaPods application
├── assets/                        # Logo and splash source assets
├── website/                       # Static GitHub Pages site
├── scripts/                       # Dependency-free Node maintenance tools
│   └── ralph/                     # Ralph PRD/progress/agent workflow files
├── .github/workflows/             # CI and Pages deployment
├── .planning/adr/                 # Numbered architecture decision records
├── .planning/codebase/            # Generated/maintained codebase maps
└── package.json                   # Runtime dependencies and project commands
```

## Directory Purposes

**`src/screens/`:**
- Purpose: User-facing application routes and route-specific coordination.
- Contains: `CameraScreen.tsx`, `ModeSelectorScreen.tsx`, `PostCaptureScreen.tsx`, `SettingsScreen.tsx`, `usePhotoReview.ts`, and onboarding components.
- Key files: `src/screens/CameraScreen.tsx`, `src/screens/PostCaptureScreen.tsx`, `src/screens/onboarding/OnboardingNavigator.tsx`.

**`src/camera/`:**
- Purpose: Camera-specific hooks kept out of the large camera screen.
- Contains: Device permission, mode flags, persisted settings, mode prompts, product-centering heuristic, and single/burst photo persistence.
- Key files: `src/camera/usePhotoCapture.ts`, `src/camera/useCameraMode.ts`, `src/camera/useCameraPermission.ts`, `src/camera/useCameraSettings.ts`.

**`src/shotAnalysis/`:**
- Purpose: Present one deep boundary over all sensor/frame observations and scoring.
- Contains: Hook and barrel exports.
- Key files: `src/shotAnalysis/useShotAnalysis.ts`, `src/shotAnalysis/index.ts`.

**`src/framePipeline/` and analysis domains:**
- Purpose: Acquire and analyze frames/sensors with feature-local types and pure helpers.
- Contains: Generic frame pipeline in `src/framePipeline/`; sensor hooks in `src/sensors/`; face, lighting, edge, and document modules in their matching directories.
- Key files: `src/framePipeline/useFramePipeline.ts`, `src/faceDetection/useFaceDetection.ts`, `src/lighting/useLightingFrameProcessor.ts`, `src/edgeDetection/useEdgeDetectionFrameOutput.ts`, `src/documentDetection/types.ts`.

**`src/scoring/` and `src/coaching/`:**
- Purpose: Derive readiness scores, labels, and one prioritized coaching prompt.
- Contains: Pure algorithms/weights/types, update hook, `ScoreRing`, prompt types/rules/hook, and `PromptPill`.
- Key files: `src/scoring/algorithms.ts`, `src/scoring/types.ts`, `src/scoring/useScoring.ts`, `src/coaching/useCoaching.ts`, `src/coaching/types.ts`.

**`src/autoCapture/`:**
- Purpose: Model capture timing and state.
- Contains: The production `useAutoCapture` sequencer and `CountdownOverlay`; persisted-shot acknowledgements from `src/camera/usePhotoCapture.ts` drive burst progression.
- Key files: `src/autoCapture/useAutoCapture.ts`, `src/autoCapture/types.ts`, `src/autoCapture/CountdownOverlay.tsx`.

**`src/storage/`:**
- Purpose: Own photo metadata persistence, adapter selection, settings, onboarding state, indexes, and encryption primitives.
- Contains: `PhotoStorage` contract, local/encrypted implementations, MMKV stores, AsyncStorage onboarding, and Keychain integration.
- Key files: `src/storage/PhotoStorage.ts`, `src/storage/storageWiring.ts`, `src/storage/LocalPhotoStorage.ts`, `src/storage/EncryptedLocalPhotoStorage.ts`, `src/storage/settings.ts`.

**`src/telemetry/`:**
- Purpose: Define privacy-gated local telemetry behind delivery providers.
- Contains: Typed event payloads, tracker, console/null providers, anonymous install ID.
- Key files: `src/telemetry/index.ts`, `src/telemetry/types.ts`, `src/telemetry/installId.ts`.

**`__tests__/` and `__mocks__/`:**
- Purpose: Test pure logic, hooks, components, storage adapters, and camera integration without native devices.
- Contains: Flat `*.test.ts`/`*.test.tsx` suites and package-shaped mocks selected in `jest.config.js`.
- Key files: `__tests__/CameraScreen.integration.test.tsx`, `__tests__/useShotAnalysis.test.ts`, `__tests__/scoring.test.ts`, `__mocks__/react-native-vision-camera.js`.

**`website/`:**
- Purpose: Independently served static landing/architecture page.
- Contains: `index.html`, `style.css`, `script.js`, and a website-specific README.
- Key files: `website/index.html`, `website/script.js`, `website/style.css`.

**`scripts/`, `.github/`, and `.planning/`:**
- Purpose: Repository automation, CI/deployment, planning, and architecture governance.
- Contains: ADR index/page comparison/icon/dead-export scripts, Ralph files, GitHub workflows, ADRs, and codebase maps.
- Key files: `scripts/generate-adr-index.mjs`, `scripts/dead-export-check.mjs`, `.github/workflows/ci.yml`, `.github/workflows/deploy.yml`, `.planning/adr/README.md`.

## Key File Locations

**Entry Points:**
- `index.js`: Registers the React Native root component.
- `App.tsx`: Initializes onboarding and owns top-level screen transitions.
- `src/screens/CameraScreen.tsx`: Runtime camera-feature composition root.
- `website/index.html`: Static website document entry.

**Configuration:**
- `src/config/modes.ts`: Supported modes and per-mode analysis/capture thresholds.
- `src/config/modeMetadata.ts`: User-facing mode metadata.
- `app.json`: Native application name/configuration.
- `babel.config.js`, `metro.config.js`, `tsconfig.json`: React Native build and TypeScript configuration.
- `eslint.config.js`, `.prettierrc.js`, `prek.toml`: Quality and formatting hooks.
- `jest.config.js`, `jest.setup.js`: Test environment and native mocks.
- `android/`, `ios/`, `Gemfile`, `Gemfile.lock`: Native builds and iOS Ruby tooling.

**Core Logic:**
- `src/shotAnalysis/useShotAnalysis.ts`: Live-analysis and scoring composition.
- `src/scoring/algorithms.ts`: Pure readiness-score computations.
- `src/coaching/types.ts`: Prompt-priority selection rules and coaching inputs.
- `src/camera/usePhotoCapture.ts`: VisionCamera capture and metadata persistence.
- `src/storage/storageWiring.ts`: Application-wide persistence adapter selection.
- `src/screens/usePhotoReview.ts`: Post-capture keep/delete lifecycle.
- `src/framePipeline/useFramePipeline.ts`: Shared frame ownership/disposal path.

**Testing:**
- `__tests__/`: 32 flat Jest suites named after features or source symbols.
- `__mocks__/`: Manual native-package mocks.
- `package.json`: `typecheck`, `lint`, and `test` commands.

## Naming Conventions

**Files:**
- React components/screens use PascalCase: `src/screens/CameraScreen.tsx`, `src/scoring/ScoreRing.tsx`.
- Hooks use `use` + PascalCase concept in camelCase filenames: `src/shotAnalysis/useShotAnalysis.ts`.
- Pure/domain support files use descriptive camelCase or generic module names: `src/scoring/algorithms.ts`, `src/storage/photoIndex.ts`, `types.ts`.
- Feature barrels are named `index.ts`: `src/lighting/index.ts`, `src/scoring/index.ts`.
- Tests mirror feature/symbol names with `.test.ts` or `.test.tsx`: `__tests__/usePhotoReview.test.ts`.
- ADRs use zero-padded number plus kebab-case title: `.planning/adr/0010-delete-aesthetic-stub.md`.

**Directories:**
- Source feature directories use camelCase concepts: `src/shotAnalysis/`, `src/faceDetection/`, `src/autoCapture/`.
- Platform and repository-standard directories retain conventional names: `android/`, `ios/`, `__tests__/`, `.github/`.

## Where to Add New Code

**New Feature:**
- Primary code: Create or extend a cohesive `src/<feature>/` domain; expose its public API through `src/<feature>/index.ts` when multiple consumers need it.
- Tests: Add `__tests__/<feature>.test.ts` or `.test.tsx`; add a native mock under `__mocks__/` and map it in `jest.config.js` when required.

**New Component/Module:**
- Implementation: Put broadly reused overlays in `src/components/`; feature-owned UI remains in its domain; full-page UI belongs in `src/screens/`.

**Utilities:**
- Shared helpers: Prefer the owning domain (`src/scoring/algorithms.ts`, `src/sensors/math.ts`, `src/storage/photoIndex.ts`) rather than a generic utilities directory.

**New analysis signal:**
- Implementation: Add acquisition/pure analysis in its domain, compose it in `src/shotAnalysis/useShotAnalysis.ts`, type it in `src/scoring/types.ts`, and score it in `src/scoring/algorithms.ts`/`weights.ts`.

**New persistence backend:**
- Implementation: Implement `src/storage/PhotoStorage.ts` and select it only in `src/storage/storageWiring.ts`.

## Special Directories

**`.planning/adr/`:**
- Purpose: Architecture decision records (`0001` through `0011`) and templates/index.
- Generated: No; `website/index.html` derives its ADR card section from these records.
- Committed: Yes.

**`.planning/codebase/`:**
- Purpose: Maintained maps of architecture, structure, stack, testing, integrations, conventions, and concerns.
- Generated: Maintained by codebase-mapping workflow.
- Committed: Yes.

**`website/`:**
- Purpose: GitHub Pages static site, separate from the mobile bundle.
- Generated: Partially; the ADR grid in `website/index.html` is regenerated by `scripts/generate-adr-index.mjs`.
- Committed: Yes.

**`android/` and `ios/`:**
- Purpose: React Native platform projects and native dependency/configuration files.
- Generated: Partially scaffolded but subsequently maintained.
- Committed: Yes.

**`__mocks__/`:**
- Purpose: Deterministic JavaScript replacements for native modules under Jest.
- Generated: No.
- Committed: Yes.

**`scripts/ralph/`:**
- Purpose: Ralph autonomous-agent PRD, progress, prompts, and runner state.
- Generated: Mixed; workflow state is tool-maintained while prompts/configuration are hand-maintained.
- Committed: Yes.

---

*Structure analysis: 2026-08-30 at `c38ed05`*
