# Codebase Concerns

**Analysis Date:** 2026-05-01

## Tech Debt

**VisionCamera v5 migration left core analysis hooks as stubs:**
- Issue: Lighting, edge, and face detection hooks currently emit neutral/default data instead of real camera-frame analysis.
- Files: `src/lighting/useLightingFrameProcessor.ts:1`, `src/edgeDetection/useEdgeDetectionFrameOutput.ts:1`, `src/faceDetection/useFaceDetection.ts:1`, `src/screens/CameraScreen.tsx:183`, `src/screens/CameraScreen.tsx:232`
- Impact: Portrait/group face framing, lighting prompts, travel edge alignment, and document skew can appear implemented while relying on fixed or empty signals.
- Fix approach: Rebuild frame outputs with the VisionCamera v5 `useFrameOutput`/Nitro-compatible pipeline, dispose frames safely, and wire real stats into the existing `handleFrameStats` callbacks.

**Aesthetic ML path is placeholder-only:**
- Issue: The model loader always returns `null` outside tests, model size is unknown, and the worklet entry point always calls back with `null`.
- Files: `src/aestheticModel/modelLoader.ts:55`, `src/aestheticModel/modelLoader.ts:123`, `src/aestheticModel/modelLoader.ts:201`, `src/aestheticModel/useAestheticFrameProcessor.ts:286`, `package.json:11`
- Impact: Hybrid scoring falls back to rules-only despite ML-oriented code and docs; future TFLite integration has no production runtime dependency yet.
- Fix approach: Add a supported TFLite runtime, bundle/validate the model asset, expose model-size metadata, and integrate worklet-to-JS inference with measured latency.

**CameraScreen is a large orchestration hotspot:**
- Issue: One component coordinates permissions, sensors, mode-specific heuristics, frame outputs, scoring, haptics, capture, burst state, and UI rendering.
- Files: `src/screens/CameraScreen.tsx:72`, `src/screens/CameraScreen.tsx:145`, `src/screens/CameraScreen.tsx:183`, `src/screens/CameraScreen.tsx:275`, `src/screens/CameraScreen.tsx:392`, `src/screens/CameraScreen.tsx:620`
- Impact: New modes and camera behavior changes are high-risk because unrelated concerns share one render lifecycle and dependency graph.
- Fix approach: Extract mode-signal composition, capture/burst orchestration, and permission UI into focused hooks/components with integration tests around the seams.

**Scoring type module has accumulated multiple responsibilities:**
- Issue: `src/scoring/types.ts` combines interfaces, mode weights, scoring algorithms, score labels/colors, and all mode-specific scoring helpers in one 898-line file.
- Files: `src/scoring/types.ts:1`, `src/scoring/types.ts:147`, `src/scoring/types.ts:280`, `src/scoring/types.ts:741`
- Impact: Small changes to one subscore require navigating a large file and increase merge/conflict risk as more modes are added.
- Fix approach: Split into `types`, `weights`, `baseScoring`, and mode-specific scoring modules while preserving pure-function tests.

**Product/Food centering is heuristic and random:**
- Issue: Food mode has a TODO for real centering detection, while product centering uses `Math.random()` derived from stability and lighting class.
- Files: `src/screens/CameraScreen.tsx:144`, `src/screens/CameraScreen.tsx:198`, `src/screens/CameraScreen.tsx:207`, `src/screens/CameraScreen.tsx:303`
- Impact: Centering prompts and product scores can change without scene changes, making coaching non-deterministic and hard to validate on device.
- Fix approach: Replace random centering with frame-derived segmentation/edge/object heuristics and keep deterministic fallback values when unavailable.

**Documentation and PRD drift from current source:**
- Issue: Project docs and Ralph PRD claim real frame processors and MLKit face detection were implemented, but current source has stubs and package dependencies are absent.
- Files: `README.md:28`, `AGENTS.md:13`, `scripts/ralph/prd.json:158`, `scripts/ralph/prd.json:177`, `scripts/ralph/prd.json:268`, `src/faceDetection/useFaceDetection.ts:1`, `src/lighting/useLightingFrameProcessor.ts:1`
- Impact: Future contributors may trust stale status and skip re-validating features that are not actually backed by real camera frames.
- Fix approach: Update docs/PRD status to distinguish tested pure logic from disabled runtime integrations.

## Known Bugs

**Manual shutter in Pet/Kids burst mode captures one photo but waits for a full burst:**
- Symptoms: Manual capture calls `capturePhoto(0)` once, but burst completion only navigates when `burstPhotos.length === burstShotCount`; no auto-capture state progression is started for manual burst shots.
- Files: `src/screens/CameraScreen.tsx:541`, `src/screens/CameraScreen.tsx:599`, `src/screens/CameraScreen.tsx:605`, `src/screens/CameraScreen.tsx:610`
- Trigger: Select Pet/Kids mode and tap the manual shutter instead of waiting for auto-capture.
- Workaround: Use auto-capture in Pet/Kids mode, or temporarily disable burst behavior for manual shutter until manual burst sequencing is implemented.

**Stability score input to scoring is hardcoded:**
- Symptoms: `useScoring` expects a variance-like `stability` value, but `CameraScreen` passes `0.01` while only reading `isStable` from `useStability`.
- Files: `src/screens/CameraScreen.tsx:105`, `src/screens/CameraScreen.tsx:107`, `src/screens/CameraScreen.tsx:284`, `src/screens/CameraScreen.tsx:285`, `src/scoring/useScoring.ts:22`, `src/scoring/types.ts:280`
- Trigger: Any scoring mode when device motion varies; unstable frames receive a fixed numeric penalty rather than measured variance.
- Workaround: Rely on boolean `isStable`/countdown gating until `useStability` exposes and `CameraScreen` passes a real variance metric.

**Settings read once on CameraScreen mount:**
- Symptoms: Haptic and score visibility settings are read into local state once and are not refreshed if settings change while the screen remains mounted.
- Files: `src/screens/CameraScreen.tsx:92`, `src/screens/CameraScreen.tsx:97`, `src/storage/settings.ts:88`, `src/storage/settings.ts:51`
- Trigger: Open settings from the camera, change haptics or score visibility, then return without remounting the camera screen.
- Workaround: Navigate away/remount, or add a settings subscription/store so CameraScreen reacts to MMKV setting updates.

## Security Considerations

**MMKV stores metadata and identifiers without app-level encryption:**
- Risk: Photo scores/subscores, timestamps, camera-roll references, settings, and anonymous install IDs rely on platform sandbox protection only.
- Files: `src/storage/LocalPhotoStorage.ts:8`, `src/storage/LocalPhotoStorage.ts:113`, `src/storage/settings.ts:10`, `src/telemetry/index.ts:36`, `src/telemetry/index.ts:41`, `SECURITY.md:94`
- Current mitigation: `SECURITY.md` documents that MMKV is unencrypted and platform sandboxes protect app data; no photo bytes are stored in MMKV.
- Recommendations: Enable MMKV encryption if privacy/compliance requirements increase, use Keychain/Keystore-managed keys, and add a user-facing data deletion/export flow.

**Console telemetry is still the default provider:**
- Risk: Anonymous install IDs and event properties are logged via `console.log`, which can leak into production device logs or crash diagnostics.
- Files: `src/telemetry/index.ts:138`, `src/telemetry/ConsoleTelemetryProvider.ts:31`, `SECURITY.md:136`, `SECURITY.md:144`, `SECURITY.md:231`
- Current mitigation: Telemetry honors opt-out before provider dispatch and `SECURITY.md` calls the console provider MVP-only.
- Recommendations: Gate the console provider behind `__DEV__`, use a null provider or secure backend provider for release builds, and verify no production log pipeline captures telemetry payloads.

**Android/iOS permission declarations are broader or stale:**
- Risk: Android declares legacy read/write external storage plus `READ_MEDIA_IMAGES`; iOS declares an empty location usage string even though app code does not use location.
- Files: `android/app/src/main/AndroidManifest.xml:3`, `android/app/src/main/AndroidManifest.xml:5`, `android/app/src/main/AndroidManifest.xml:6`, `android/app/src/main/AndroidManifest.xml:7`, `ios/AIPhotoCoach/Info.plist:38`, `src/screens/onboarding/PermissionsScreen.tsx:37`
- Current mitigation: Runtime permission requests focus on camera/photo library/motion; Android backup is disabled in the manifest.
- Recommendations: Remove unused `INTERNET`, legacy storage, and empty location permission strings unless a real feature requires them; prefer save-only/photo-picker permissions where platform APIs allow.

**Release Android build signs with debug keystore:**
- Risk: Release artifacts built from current Gradle config would use the public debug keystore and have minification disabled.
- Files: `android/app/build.gradle:88`, `android/app/build.gradle:100`, `android/app/build.gradle:103`, `android/app/build.gradle:104`
- Current mitigation: Inline Gradle comment warns that production needs a generated keystore.
- Recommendations: Add a release signing config sourced from secure environment variables, enable/verify R8/Proguard for release, and block CI release builds when debug signing is configured.

**Privacy manifest claims no collected data while telemetry exists locally:**
- Risk: Apple privacy metadata currently has an empty `NSPrivacyCollectedDataTypes` array; this may be correct for local-only telemetry, but it must be revisited before adding any backend provider.
- Files: `ios/AIPhotoCoach/PrivacyInfo.xcprivacy:34`, `src/telemetry/index.ts:164`, `src/telemetry/types.ts:1`, `SECURITY.md:184`
- Current mitigation: Current telemetry provider is console/local only and `SECURITY.md` documents no third-party analytics.
- Recommendations: Update privacy manifest and privacy policy before shipping backend analytics or any off-device telemetry.

## Performance Bottlenecks

**Future frame processing has a tight 20 FPS/33ms budget and currently lacks measurement:**
- Problem: Lighting, edge, face, and aesthetic processing are either stubbed or placeholder-only, so real on-device frame costs are unknown.
- Files: `src/lighting/useLightingFrameProcessor.ts:21`, `src/edgeDetection/useEdgeDetectionFrameOutput.ts:21`, `src/faceDetection/useFaceDetection.ts:47`, `src/aestheticModel/useAestheticFrameProcessor.ts:157`, `AGENTS.md:153`
- Cause: The runtime bridge to VisionCamera/Nitro worklets has been disabled, so tests do not exercise pixel-buffer extraction, disposal, or JS-thread handoff.
- Improvement path: Add instrumentation for frame processing FPS/latency, enforce throttling per processor, and profile on target mid-range devices before enabling multiple processors together.

**Aesthetic preprocessing allocates a new 224x224x3 Float32Array per processed frame:**
- Problem: At 5 Hz, repeated allocation and nested sampling loops can add GC pressure once real camera frames are connected.
- Files: `src/aestheticModel/useAestheticFrameProcessor.ts:56`, `src/aestheticModel/useAestheticFrameProcessor.ts:62`, `src/aestheticModel/useAestheticFrameProcessor.ts:220`, `src/aestheticModel/useAestheticFrameProcessor.ts:265`
- Cause: The preprocessing function creates a fresh output buffer per call and runs asynchronously on the JS side.
- Improvement path: Reuse buffers where safe, benchmark preprocessing vs. native/Nitro image resize, and ensure heavy model inference does not block UI updates.

**Scoring runs on an interval over a large signal surface:**
- Problem: Score calculation recomputes at 10 Hz even when many inputs are static, and the signal surface has grown with every mode.
- Files: `src/scoring/useScoring.ts:183`, `src/scoring/useScoring.ts:271`, `src/scoring/useScoring.ts:282`, `src/scoring/types.ts:741`
- Cause: A polling interval simplifies live score updates but can hide unnecessary work as mode logic expands.
- Improvement path: Keep scoring pure, but consider event-driven recompute/debounced signals or measured batching if JS thread pressure appears on device.

## Fragile Areas

**Frame-analysis runtime integrations:**
- Files: `src/lighting/useLightingFrameProcessor.ts:1`, `src/edgeDetection/useEdgeDetectionFrameOutput.ts:1`, `src/faceDetection/useFaceDetection.ts:1`, `src/screens/CameraScreen.tsx:260`, `AGENTS.md:65`
- Why fragile: VisionCamera v5, Nitro modules, worklets, `runOnJS`, frame disposal, and typed `outputs` arrays all need to align; current stubs mask integration failures.
- Safe modification: Change one processor at a time, keep pure algorithms independently tested, add native-device smoke tests, and assert frames are always disposed in `finally`.
- Test coverage: Pure lighting/edge/face math has tests, but no current test validates real camera frame output wiring.

**Capture and burst lifecycle:**
- Files: `src/autoCapture/useAutoCapture.ts:35`, `src/autoCapture/useAutoCapture.ts:138`, `src/screens/CameraScreen.tsx:436`, `src/screens/CameraScreen.tsx:522`, `src/screens/CameraScreen.tsx:541`, `src/screens/PostCaptureScreen.tsx:97`
- Why fragile: Burst state is split between `useAutoCapture`, `CameraScreen`, and `PostCaptureScreen`; saved photos exist before user confirmation and error paths only log failures.
- Safe modification: Model capture as a finite-state machine with explicit manual/auto/burst events and add tests for interruption, deletion failure, and partial burst failure.
- Test coverage: `__tests__/autoCapture.test.ts` covers the hook and `__tests__/PostCaptureScreen.test.tsx` covers post-capture UI, but there is no `CameraScreen` integration test for burst capture.

**Platform permissions and native configuration:**
- Files: `src/screens/CameraScreen.tsx:620`, `src/screens/onboarding/PermissionsScreen.tsx:26`, `android/app/src/main/AndroidManifest.xml:3`, `ios/AIPhotoCoach/Info.plist:36`, `ios/AIPhotoCoach/PrivacyInfo.xcprivacy:5`
- Why fragile: Camera, photo, motion, and storage permissions differ by OS/API level; stale declarations can cause store review issues or runtime denial paths.
- Safe modification: Keep permission declarations minimal, test fresh-install flows on current iOS and Android API levels, and document each native permission's feature owner.
- Test coverage: Permission UI has component tests indirectly through screens, but native manifest/plist correctness is not validated by automated tests.

**Sensor hooks depend on native RxJS subscriptions:**
- Files: `src/sensors/useHorizonLevel.ts:73`, `src/sensors/useHorizonLevel.ts:81`, `src/sensors/useStability.ts:127`, `src/sensors/useStability.ts:133`, `src/sensors/useStability.ts:141`
- Why fragile: Sensor availability, permission behavior, update intervals, and background lifecycle can differ across devices; errors currently only log to console.
- Safe modification: Add explicit unavailable/error state and make camera prompts degrade gracefully when sensors fail.
- Test coverage: `__tests__/sensors.test.ts` and `__tests__/useStability.test.ts` cover math/hooks with mocks, not real sensor failures or OS-level permission behavior.

## Scaling Limits

**Photo metadata is stored as one JSON array in MMKV:**
- Current capacity: Every save reads, parses, prepends to, stringifies, and writes the entire metadata array.
- Limit: Large photo histories will make `save`, `list`, and `delete` increasingly expensive and may risk MMKV value-size or startup latency issues.
- Scaling path: Store records by ID, maintain an index, paginate list queries, and consider SQLite/WatermelonDB if metadata grows beyond simple MVP use.
- Files: `src/storage/LocalPhotoStorage.ts:51`, `src/storage/LocalPhotoStorage.ts:97`, `src/storage/LocalPhotoStorage.ts:113`

**Mode logic is centralized in a single camera composition path:**
- Current capacity: Eight modes are already enabled and branch inside `CameraScreen` plus shared scoring weights.
- Limit: Additional modes will add more booleans, prompts, scoring inputs, and UI branches to one component.
- Scaling path: Move each mode's signal builders/prompts/scoring configuration behind mode-specific strategy modules.
- Files: `src/config/modes.ts:60`, `src/screens/CameraScreen.tsx:111`, `src/screens/CameraScreen.tsx:315`, `src/screens/CameraScreen.tsx:354`

**Telemetry provider is synchronous console output:**
- Current capacity: MVP events are logged immediately and only locally.
- Limit: A real provider will need batching, retry, offline persistence, rate limiting, and privacy policy updates.
- Scaling path: Add provider lifecycle tests, queueing/backoff, build-specific provider selection, and retention controls before remote analytics.
- Files: `src/telemetry/index.ts:131`, `src/telemetry/index.ts:164`, `src/telemetry/ConsoleTelemetryProvider.ts:31`, `SECURITY.md:75`

## Dependencies at Risk

**VisionCamera/Nitro/worklets compatibility:**
- Risk: Core camera analysis depends on VisionCamera v5 plus Nitro/worklet compatibility, but current processors are disabled.
- Impact: Re-enabling real processors can break preview FPS, memory management, and type compatibility around `outputs`.
- Migration plan: Pin tested versions, reintroduce processors incrementally, and add a device compatibility matrix for iOS/Android.
- Files: `package.json:20`, `package.json:21`, `package.json:22`, `package.json:28`, `src/lighting/useLightingFrameProcessor.ts:1`, `src/edgeDetection/useEdgeDetectionFrameOutput.ts:1`

**Missing face detection runtime dependency:**
- Risk: Docs and mocks reference `react-native-vision-camera-face-detector`, but `package.json` does not include it and the source hook is a stub.
- Impact: Portrait/group/pet-kids face framing cannot function with real faces until a compatible detector is chosen.
- Migration plan: Select a VisionCamera v5-compatible face detector or native MLKit bridge, add it to dependencies, and remove stale mocks once runtime code exists.
- Files: `package.json:11`, `jest.config.js:17`, `__mocks__/react-native-vision-camera-face-detector.ts:1`, `src/faceDetection/useFaceDetection.ts:1`, `README.md:29`

**Missing TFLite runtime dependency:**
- Risk: ML scoring code expects future `react-native-fast-tflite`, but the dependency is absent and model loading always falls back.
- Impact: The advertised hybrid rules + ML scoring path cannot run in production.
- Migration plan: Add and validate the chosen TFLite runtime, package the model asset, and build model-load/inference health checks.
- Files: `package.json:11`, `src/aestheticModel/modelLoader.ts:123`, `src/aestheticModel/useAestheticFrameProcessor.ts:286`, `scripts/ralph/prd.json:331`

**React Native/new-architecture dependency surface:**
- Risk: React Native 0.85.2, React 19, Nitro modules, and worklets are all near the edge of the ecosystem and can have fast-moving native integration changes.
- Impact: Pod/Gradle upgrades may break camera, sensors, or worklet behavior even when TypeScript tests pass.
- Migration plan: Keep native upgrade notes, run device smoke tests after dependency updates, and avoid broad version ranges for native-critical packages.
- Files: `package.json:14`, `package.json:15`, `package.json:20`, `package.json:21`, `package.json:28`, `ios/AIPhotoCoach/Info.plist:44`

## Missing Critical Features

**Real frame analysis pipeline:**
- Problem: The app lacks live frame data for lighting, edges/document skew, face framing, and ML aesthetics despite UI/scoring code expecting those signals.
- Blocks: Accurate portrait/group/pet-kids framing, travel alignment, document scanning quality, lighting guidance, and hybrid ML scoring.
- Files: `src/lighting/useLightingFrameProcessor.ts:24`, `src/edgeDetection/useEdgeDetectionFrameOutput.ts:24`, `src/faceDetection/useFaceDetection.ts:51`, `src/aestheticModel/useAestheticFrameProcessor.ts:286`

**Production-ready privacy/release configuration:**
- Problem: Console telemetry, unencrypted local metadata, debug release signing, broad Android permissions, and missing data export/delete flows remain MVP-level.
- Blocks: Store-ready production release and stronger privacy/compliance posture.
- Files: `src/telemetry/index.ts:138`, `src/storage/LocalPhotoStorage.ts:8`, `android/app/build.gradle:103`, `android/app/src/main/AndroidManifest.xml:5`, `SECURITY.md:231`

**Native/device verification automation:**
- Problem: Tests cover pure logic heavily, but there is no automated check for actual camera preview FPS, frame processing FPS, permissions, camera-roll save/delete, or sensor behavior on devices.
- Blocks: Confidence that MVP requirements hold outside Jest mocks and simulators.
- Files: `jest.config.js:1`, `__mocks__/react-native-vision-camera.js:1`, `__mocks__/react-native-sensors.js:1`, `AGENTS.md:156`

## Test Coverage Gaps

**CameraScreen integration and mode orchestration:**
- What's not tested: No `CameraScreen` test exists for permission states, outputs array composition, score inputs, manual shutter, auto-capture, or burst navigation.
- Files: `src/screens/CameraScreen.tsx:72`, `src/screens/CameraScreen.tsx:260`, `src/screens/CameraScreen.tsx:436`, `src/screens/CameraScreen.tsx:599`, `__tests__/App.test.tsx:9`
- Risk: The largest and most stateful screen can regress while pure hook/component tests still pass.
- Priority: High

**Real native/frame-processor behavior:**
- What's not tested: VisionCamera `useFrameOutput`, frame disposal, `runOnJS`, pixel-buffer analysis, camera-roll permissions, and native sensor failure modes.
- Files: `src/lighting/useLightingFrameProcessor.ts:24`, `src/edgeDetection/useEdgeDetectionFrameOutput.ts:24`, `src/aestheticModel/useAestheticFrameProcessor.ts:286`, `__mocks__/react-native-vision-camera.js:149`, `__mocks__/react-native-sensors.js:1`
- Risk: Jest mocks validate shape and pure functions but cannot detect device-only crashes, leaks, or FPS drops.
- Priority: High

**Security/build configuration checks:**
- What's not tested: Debug signing in release, broad permissions, empty iOS location string, privacy manifest contents, and production telemetry provider selection.
- Files: `android/app/build.gradle:100`, `android/app/src/main/AndroidManifest.xml:3`, `ios/AIPhotoCoach/Info.plist:38`, `ios/AIPhotoCoach/PrivacyInfo.xcprivacy:34`, `src/telemetry/index.ts:138`
- Risk: A release could be cut with MVP-only security/privacy settings that TypeScript/Jest do not exercise.
- Priority: High

**Storage corruption and large-history behavior:**
- What's not tested: Corrupt metadata recovery beyond returning an empty list, migration/versioning, large arrays, partial camera-roll delete failures, and duplicate IDs.
- Files: `src/storage/LocalPhotoStorage.ts:97`, `src/storage/LocalPhotoStorage.ts:103`, `src/storage/LocalPhotoStorage.ts:113`, `__tests__/LocalPhotoStorage.test.ts:1`
- Risk: Metadata loss or performance regressions may surface only after extended real-world use.
- Priority: Medium

---

*Concerns audit: 2026-05-01*
