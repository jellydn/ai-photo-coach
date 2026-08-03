# Codebase Concerns

**Analysis Date:** 2026-08-03

## Tech Debt

**Aesthetic model is stubbed:**
- Issue: `src/aestheticModel/modelLoader.ts` has TODOs for `react-native-fast-tflite`; no real model inference wired
- Files: `src/aestheticModel/modelLoader.ts`, `src/aestheticModel/useAestheticFrameProcessor.ts`
- Impact: Aesthetic subscore falls back to non-ML signals; the processor exists but the model is not loaded
- Fix approach: Install a TFLite RN binding, wire model loading/sizing TODOs

**Product centering analysis pending:**
- Issue: `useProductCentering` TODO says "Replace with real frame analysis when frame processors are active"
- Files: `src/camera/useProductCentering.ts`
- Impact: Centering guidance may be placeholder/limited
- Fix approach: Consume frame output from the shared `framePipeline` once active

**Encrypted path built but unselected:**
- Issue: `EncryptedLocalPhotoStorage` and encrypted MMKV settings exist, but `USE_ENCRYPTED_PHOTO_STORAGE = false`
- Files: `src/storage/storageWiring.ts`, `src/storage/EncryptedLocalPhotoStorage.ts`, `src/storage/encryptedStorage.ts`
- Impact: Two adapters ship in the bundle; encrypted behavior is dead code until the flag flips
- Fix approach: Decide on default persistence; consider lazy selection (see ADR-0003 negatives)

## Known Bugs

- None documented in code or TODO comments (active bug list lives in issues)

## Security Considerations

**Encrypted storage:**
- Risk: Settings/photos sensitive if device compromised
- Files: `src/storage/encryptedStorage.ts`, `src/storage/settings.ts`
- Current mitigation: keychain-backed AES-128 MMKV variants; runtime keychain availability check; opt-out telemetry; no PII collected
- Recommendations: Flip encrypted default or expose a setting; ensure keychain entries are scoped per storage ID (already done)

**Telemetry privacy:**
- Risk: Event leakage
- Files: `src/telemetry/`
- Current mitigation: opt-out flag in settings (single owner, ADR-0009); `NullTelemetryProvider` in production builds; anonymous install ID only

## Performance Bottlenecks

**10 Hz scoring interval:**
- Problem: `useScoring` recomputes on a `setInterval` every 100 ms
- Files: `src/scoring/useScoring.ts`
- Cause: Fixed cadence regardless of frame availability
- Improvement path: Drive recomputation from frame updates instead of a timer (worklets already available via `framePipeline`)

**Frame pipeline worklets:**
- Problem: Pixel extraction + `runOnJS` bridge per frame
- Files: `src/framePipeline/useFramePipeline.ts`
- Cause: Native→JS bridge overhead per frame
- Improvement path: Keep work in worklets; batch JS updates (already concentrated in one pipeline, ADR-0007)

## Fragile Areas

**VisionCamera worklet lifecycle:**
- Files: `src/framePipeline/useFramePipeline.ts`, `src/lighting/useLightingFrameProcessor.ts`, `src/edgeDetection/useEdgeDetectionFrameOutput.ts`
- Why fragile: Native frame lifecycle (dispose, pixel buffers) across RN version bumps
- Safe modification: Only touch via `useFramePipeline`; keep `frame.dispose()` in `try/finally`
- Test coverage: `framePipeline.test.ts` covers the pipeline; processor integration is thinner

**RN 0.85 / new-architecture dependencies:**
- Files: `package.json` (vision-camera 5.2.1, reanimated 4.3.0, worklets, nitro)
- Why fragile: Rapidly evolving native libs; `react-native-worklets` vs `react-native-worklets-core` dual-mock surface
- Safe modification: Bump via Renovate PRs (renovate.json present) and run CI typecheck/test/lint
- Test coverage: CI gates merges; native behavior only manually verified

**Capture state machine:**
- Files: `src/capture/CaptureStateMachine.ts` (320 lines), `src/capture/useCaptureStateMachine.ts`
- Why fragile: Many transitions + countdown + auto-capture interplay
- Safe modification: Keep transitions in the FSM, not the hook; rely on `CaptureStateMachine.test.ts`

## Scaling Limits

**Storage:**
- Current capacity: Local-only persistence (camera roll + MMKV metadata)
- Limit: No cloud sync/backup; single-device
- Scaling path: Abstract a remote `PhotoStorage` behind the same `PhotoStorage` seam (ADR-0003 makes this a new adapter + wiring change)

**Analysis:**
- Current capacity: On-device; per-frame JS analysis
- Limit: Battery/CPU on low-end devices with all processors enabled
- Scaling path: Worklet-only analysis; feature-gate heavy processors by mode

## Dependencies at Risk

**`react-native-vision-camera` 5.2.1:**
- Risk: Major-version churn; worklets split across packages
- Impact: Frame processing and capture break on upgrade
- Migration plan: Renovate PRs + CI; keep `framePipeline` as the single choke point

**`react-native-worklets` / `react-native-worklets-core`:**
- Risk: Two worklets packages referenced (one mocked)
- Impact: Confusion and duplicate surface
- Migration plan: Consolidate on one; update `__mocks__` accordingly

**Overlays & landing page:**
- What's not tested: `ScoreRing`, `CompositionOverlay`, `HorizonIndicator` have partial coverage; `website/` has no unit tests (the deploy smoke test covers the live page instead)
- Files: `src/components/`, `src/scoring/ScoreRing.tsx`, `website/`
- Risk: Visual regressions
- Priority: Low

## Website / CI-Guard Concerns

**Smoke test mirrors generator badge logic (duplicated):**
- Issue: The deploy smoke step (`deploy.yml`) re-implements the generator's `statusBadge()` in bash (awk/tr/sed) to derive expected Accepted/Superseded badges from each ADR's Status line
- Files: `.github/workflows/deploy.yml`, `scripts/generate-adr-index.mjs`
- Impact: A change to the badge format or status vocabulary must be made in two places; a back-pointer comment keeps them in sync today
- Fix approach: If the status vocabulary grows, consider a shared emitted fixture (e.g. the generator prints expected badges as JSON the smoke step consumes)

**`scripts/` excluded from lint:**
- Issue: `.js/.jsx` and `scripts/**` are excluded from ESLint; Prettier is enforced only by convention (a `prettier --check` CI step does not exist yet)
- Files: `eslint.config.js`, `scripts/*.mjs`
- Impact: Script drift can pass CI silently
- Fix approach: Add a `prettier --check` job to `ci.yml` covering `scripts/`

**ADR guard surface is a convention, not code:**
- Issue: The `adr-check` job matches seam paths and requires a new numbered ADR, but the exact seam list lives in CI YAML only
- Files: `.github/workflows/ci.yml`, `.planning/adr/`
- Impact: Adding a new architectural seam requires remembering to extend the path list
- Fix approach: Document the seam list in CONVENTIONS.md (already pointed to) and treat CI as the enforcement mirror

**Settings encryption path:**
- What's not tested: `*Encrypted()` settings variants + keychain flow
- Files: `src/storage/settings.ts`, `src/storage/encryptedStorage.ts`
- Risk: Encrypted migration could break when enabled
- Priority: Medium (feature dormant)

**CI guard stack itself:**
- What's not tested: the `adr-check` / `adr-index` jobs and the deploy smoke step are only exercised on real pushes (smoke PRs proved them ad hoc)
- Files: `.github/workflows/ci.yml`, `.github/workflows/deploy.yml`, `scripts/generate-adr-index.mjs`
- Risk: A guard regression (e.g. a seam path typo) weakens enforcement silently
- Priority: Low–Medium

---

*Concerns audit: 2026-08-03*
