# Codebase Concerns

**Analysis Date:** 2026-04-28

## Tech Debt

**Frame Processor Stubs (VisionCamera v5 Migration Incomplete):**
- Issue: Three critical frame processor hooks are stubbed out with TODO comments, returning neutral/default values instead of processing real camera frames
- Files: 
  - `/Users/huynhdung/src/tries/2026-04-27-ai-photo-coach/src/faceDetection/useFaceDetection.ts` (lines 1-4, 59-61)
  - `/Users/huynhdung/src/tries/2026-04-27-ai-photo-coach/src/lighting/useLightingFrameProcessor.ts` (lines 1-4, 24-48)
  - `/Users/huynhdung/src/tries/2026-04-27-ai-photo-coach/src/edgeDetection/useEdgeDetectionFrameOutput.ts` (lines 1-4, 24-52)
- Impact: Face detection, lighting analysis, and edge detection are non-functional in production. The stubs only return simulated data once on mount, breaking real-time camera coaching features
- Fix approach: 
  1. For face detection: Wait for react-native-vision-camera-face-detector to release VisionCamera v5 compatible version, or implement custom Nitro module
  2. For lighting/edge: Implement real useFrameOutput hooks with proper worklet integration and frame.dispose() calls

**ESLint Suppression for Unused Variables:**
- Issue: Multiple instances of `eslint-disable-next-line @typescript-eslint/no-unused-vars` suppress valid warnings
- Files:
  - `/Users/huynhdung/src/tries/2026-04-27-ai-photo-coach/src/faceDetection/useFaceDetection.ts` (line 52)
  - `/Users/huynhdung/src/tries/2026-04-27-ai-photo-coach/src/lighting/useLighting.ts` (line 104)
  - `/Users/huynhdung/src/tries/2026-04-27-ai-photo-coach/src/edgeDetection/useEdgeDetection.ts` (line 77)
  - `/Users/huynhdung/src/tries/2026-04-27-ai-photo-coach/src/screens/CameraScreen.tsx` (lines 97, 202, 204)
- Impact: Hides actual unused variables that should be removed or used, reducing code clarity
- Fix approach: Remove unused parameters or implement the intended functionality

**Hardcoded Photo Dimensions:**
- Issue: CameraScreen captures photo but uses hardcoded dimensions (1920x1080) instead of actual captured dimensions
- Files: `/Users/huynhdung/src/tries/2026-04-27-ai-photo-coach/src/screens/CameraScreen.tsx` (lines 241-243)
- Impact: Metadata stored with incorrect dimensions; could affect post-capture analysis and annotations
- Fix approach: Extract actual dimensions from photoFile or device configuration

## Known Bugs

**Face Detection Completely Disabled:**
- Symptoms: FaceOverlay never displays bounding boxes, framing guidance always returns "No face detected" or neutral values
- Files: `/Users/huynhdung/src/tries/2026-04-27-ai-photo-coach/src/faceDetection/useFaceDetection.ts`
- Trigger: Always active - the onFrame callback is an empty function that never processes frame data
- Workaround: None available; core portrait mode feature is non-functional

**Frame Output Hooks Return Null:**
- Symptoms: Lighting and edge detection only process simulated data once on mount, never update with real camera frames
- Files: 
  - `/Users/huynhdung/src/tries/2026-04-27-ai-photo-coach/src/lighting/useLightingFrameProcessor.ts`
  - `/Users/huynhdung/src/tries/2026-04-27-ai-photo-coach/src/edgeDetection/useEdgeDetectionFrameOutput.ts`
- Trigger: Any mode using lighting analysis (all modes) or edge detection (Travel mode)
- Workaround: Enable `useSimulatedData: true` in hooks for testing, but not suitable for production

**Camera Outputs Array Type Safety:**
- Issue: CameraScreen manually constructs outputs array with mixed types but TypeScript union type may not properly narrow at runtime
- Files: `/Users/huynhdung/src/tries/2026-04-27-ai-photo-coach/src/screens/CameraScreen.tsx` (lines 144-156)
- Trigger: When frame outputs are enabled/disabled dynamically
- Workaround: Current implementation appears stable but relies on runtime behavior

## Security Considerations

**Telemetry Data Collection (PII Risk):**
- Risk: Telemetry events include mode, score, and duration which could indirectly identify users through usage patterns
- Files: `/Users/huynhdung/src/tries/2026-04-27-ai-photo-coach/src/telemetry/`, `/Users/huynhdung/src/tries/2026-04-27-ai-photo-coach/src/telemetry/ConsoleTelemetryProvider.ts`
- Current mitigation: 
  - Console provider only logs to console
  - No photo bytes or explicit user identifiers collected
  - Opt-out toggle available in SettingsScreen
- Recommendations:
  - Add data retention policy documentation
  - Implement install ID rotation
  - Add privacy policy reference in app
  - Add anonymization for any future backend provider

**MMKV Storage Unencrypted:**
- Risk: Photo metadata stored in MMKV is not encrypted at rest; includes shot scores and subscores
- Files: `/Users/huynhdung/src/tries/2026-04-27-ai-photo-coach/src/storage/LocalPhotoStorage.ts`
- Current mitigation: iOS keychain and Android keystore protect MMKV at system level
- Recommendations: Document security model; consider encrypted MMKV for sensitive metadata if required by compliance

**Console Logging in Production:**
- Risk: ConsoleTelemetryProvider logs all events including session data to console, potentially leaking to crash reports
- Files: `/Users/huynhdung/src/tries/2026-04-27-ai-photo-coach/src/telemetry/ConsoleTelemetryProvider.ts` (lines 31-39)
- Current mitigation: Console provider is MVP/stub only; production should use different provider
- Recommendations: Replace console provider with null provider for release builds

## Performance Bottlenecks

**Sensor Processing at 30Hz with JavaScript Bridge:**
- Problem: Accelerometer and gyroscope data flows through React Native bridge at 30Hz, causing potential frame drops
- Files: `/Users/huynhdung/src/tries/2026-04-27-ai-photo-coach/src/sensors/useStability.ts`, `/Users/huynhdung/src/tries/2026-04-27-ai-photo-coach/src/sensors/useHorizonLevel.ts`
- Cause: react-native-sensors uses bridge communication; high-frequency updates can clog message queue
- Improvement path: 
  - Migrate to Reanimated worklets for sensor processing
  - Consider using expo-sensors with worklet support if available
  - Batch sensor updates to reduce bridge traffic

**Scoring Computation at 10Hz in Main Thread:**
- Problem: Score calculation runs on setInterval in JavaScript main thread
- Files: `/Users/huynhdung/src/tries/2026-04-27-ai-photo-coach/src/scoring/useScoring.ts` (lines 182-205)
- Cause: computeScore() is pure but still executes on JS thread; could block UI on complex calculations
- Improvement path: Move scoring to worklet thread or reduce update frequency to 5Hz

**Missing Frame.dispose() in Production Code:**
- Problem: AGENTS.md documents requirement for frame.dispose() but stub implementations don't handle real frames
- Files: All frame processor hooks (currently stubs)
- Cause: When real frame processing is implemented, forgetting dispose() will cause memory leaks
- Improvement path: Implement proper try/finally pattern in all frame output hooks as documented

**Photo Storage Sync Bottleneck:**
- Problem: CameraRoll.saveAsset() is async and blocks capture flow
- Files: `/Users/huynhdung/src/tries/2026-04-27-ai-photo-coach/src/storage/LocalPhotoStorage.ts` (line 35)
- Cause: Synchronous await on camera roll write; slow on devices with large photo libraries
- Improvement path: Implement background queue for photo saving with progress indicator

## Fragile Areas

**VisionCamera v5 API Dependency:**
- Files: All files using `react-native-vision-camera`
- Why fragile: VisionCamera v5 is relatively new; API changes between 5.0.x versions have breaking changes
- Safe modification: Pin exact version in package.json (currently "5.0.7" - good); test thoroughly on device after any upgrade
- Test coverage: Good mock coverage in `__mocks__/react-native-vision-camera.js`, but device testing required for verification

**Nitro Modules Integration:**
- Files: `package.json` (lines 21-22), frame processor stubs
- Why fragile: react-native-nitro-modules and react-native-worklets are cutting-edge; rapid API evolution
- Safe modification: Follow VisionCamera worklet patterns exactly; test on physical devices only (simulator insufficient)
- Test coverage: Mocks exist but may not reflect real worklet behavior

**Mode Configuration Thresholds:**
- Files: `/Users/huynhdung/src/tries/2026-04-27-ai-photo-coach/src/config/modes.ts`
- Why fragile: 6 of 8 modes are disabled but have tuned thresholds; enabling them without re-tuning may cause poor UX
- Safe modification: Any mode enabling requires device testing across multiple scenarios; thresholds are empirical
- Test coverage: Unit tests verify structure but not real-world threshold appropriateness

**Coaching Prompt Priority System:**
- Files: `/Users/huynhdung/src/tries/2026-04-27-ai-photo-coach/src/coaching/types.ts`, `/Users/huynhdung/src/tries/2026-04-27-ai-photo-coach/src/coaching/useCoaching.ts`
- Why fragile: Early return pattern for priority (stability > level > framing > lighting) is sensitive to ordering
- Safe modification: Maintain explicit priority ordering in types.ts; add integration tests for prompt sequences
- Test coverage: 36 unit tests covering priority ordering, but no end-to-end prompt flow tests

**Z-Index Layering:**
- Files: Multiple overlay components (FaceOverlay, HorizonIndicator, PromptPill, ScoreRing)
- Why fragile: Documented z-index in AGENTS.md (camera 0, composition 10, face 12, horizon 15, pill 25, header 20, ring 30) has conflicts - header at 20 vs pill at 25
- Safe modification: Centralize z-index constants in config file; add visual regression tests
- Test coverage: No automated visual layering tests

## Scaling Limits

**Photo Metadata Storage:**
- Current capacity: All metadata stored in single MMKV key (`@photo_metadata`)
- Limit: MMKV has ~50MB practical limit; JSON serialization becomes slow after ~1000 photos
- Scaling path: Implement pagination/lazy loading; consider SQLite for metadata at scale

**Telemetry Event Buffer:**
- Current capacity: Console provider is synchronous; future providers may buffer
- Limit: No explicit buffer size limit defined
- Scaling path: Add ring buffer with size limits; implement exponential backoff for network failures

**Frame Processing Budget:**
- Current capacity: Target 33ms/frame (30 FPS preview, 20 FPS processing)
- Limit: Lighting + edge detection + face detection simultaneously may exceed budget on older devices
- Scaling path: Implement adaptive quality - disable features when FPS drops; prioritize critical features

## Dependencies at Risk

**react-native-vision-camera-face-detector:**
- Risk: Plugin not yet compatible with VisionCamera v5; face detection is stubbed
- Impact: Core portrait mode feature non-functional
- Migration plan: 
  1. Monitor plugin repository for v5 support
  2. Alternative: Implement custom face detection using MLKit directly with Nitro modules
  3. Timeline: Required before portrait mode can launch

**react-native-worklets-core vs react-native-worklets:**
- Risk: Package confusion - both installed but VisionCamera v5 uses worklet terminology from Nitro
- Impact: Potential runtime conflicts or bundle bloat
- Migration plan: Audit which package is actually used; remove unused dependency

**react-native-sensors:**
- Risk: Uses deprecated React Native APIs; RxJS-based may not align with New Architecture
- Impact: Bridge bottleneck for sensor data
- Migration plan: Evaluate expo-sensors or Reanimated sensor API as replacement

**@react-native-camera-roll/camera-roll:**
- Risk: Module requires specific iOS/Android photo library permissions that vary by OS version
- Impact: Photo saving may fail on iOS 17+ or Android 14+ with new permission models
- Migration plan: Test on latest OS versions; add fallback error handling for permission denials

## Missing Critical Features

**Real Frame Processing Implementation:**
- Problem: All frame-based features (face detection, lighting analysis, edge detection) use stubs
- Blocks: Production release; real-time coaching is essentially a simulation

**TFLite Aesthetic Model Integration:**
- Problem: Scoring system supports hybrid ML scoring but no model is loaded
- Files: `/Users/huynhdung/src/tries/2026-04-27-ai-photo-coach/src/scoring/types.ts`, `/Users/huynhdung/src/tries/2026-04-27-ai-photo-coach/src/scoring/useScoring.ts`
- Blocks: Advanced aesthetic scoring; currently rules-only

**Photo Library Permission Handling for iOS 17+:**
- Problem: Limited photo access permission (new in iOS 17) not explicitly handled
- Blocks: Users with limited access may experience unexpected behavior when saving

**Error Boundary Implementation:**
- Problem: No React error boundaries around camera screen; native errors crash app
- Blocks: Graceful degradation when camera or sensors fail

## Test Coverage Gaps

**Device-Only Features (High Priority):**
- What's not tested: Actual camera frame processing, real sensor behavior, MLKit face detection
- Files: All frame processor hooks, sensor hooks
- Risk: Stubs pass tests but real implementation may fail; no device-in-the-loop testing
- Priority: High - requires manual verification on physical devices

**Integration Tests (High Priority):**
- What's not tested: Full user flow from mode selection → camera → capture → post-capture
- Files: Navigation between screens, telemetry event sequences
- Risk: Screen coordination bugs (e.g., state not passed correctly)
- Priority: High - only App.test.tsx exists, minimal coverage

**Visual Regression (Medium Priority):**
- What's not tested: Overlay positioning across device aspect ratios, z-index layering
- Files: FaceOverlay, HorizonIndicator, CompositionOverlay, PromptPill, ScoreRing
- Risk: UI misalignment on different devices; overlay conflicts
- Priority: Medium - manual device testing currently required

**Permission State Transitions (Medium Priority):**
- What's not tested: Permission denial → settings → return → granted flow
- Files: `/Users/huynhdung/src/tries/2026-04-27-ai-photo-coach/src/screens/CameraScreen.tsx` (permission handling)
- Risk: State desync when permissions change while app is backgrounded
- Priority: Medium - current tests mock permissions statically

**Performance Benchmarks (Low Priority):**
- What's not tested: FPS targets (30 preview, 20 processing), frame processing budget compliance
- Files: Frame processors, scoring interval
- Risk: Performance degradation on older devices unnoticed
- Priority: Low - manual profiling currently used

**Memory Leak Detection (Low Priority):**
- What's not tested: frame.dispose() calls, subscription cleanup, timer cleanup
- Files: All hooks with useEffect cleanup
- Risk: Subtle memory leaks in long camera sessions
- Priority: Low - requires specialized testing infrastructure

---

*Concerns audit: 2026-04-28*
