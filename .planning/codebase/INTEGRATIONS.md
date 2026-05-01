# External Integrations

**Analysis Date:** 2026-05-01

## APIs & External Services

**External network APIs:**
- None found - No `fetch`, axios, WebSocket, SDK client, backend URL, or service API usage was found in `src/`, `App.tsx`, `package.json`, `ios/`, or `android/` during this audit.
- SDK/Client: none for external network services; `package.json` contains only React Native/native-device libraries and development tooling.
- Auth: none; no required API keys or environment variables were found in `package.json`, source files under `src/`, or platform config under `ios/` and `android/`.

**Camera and on-device capture:**
- VisionCamera - Provides camera preview, device selection, and photo capture in `src/screens/CameraScreen.tsx` using `Camera`, `useCameraDevice`, `usePhotoOutput`, and `capturePhotoToFile` from `react-native-vision-camera` declared in `package.json`.
- SDK/Client: `react-native-vision-camera` 5.0.7 in `package.json`.
- Auth: OS camera permissions via `react-native-permissions` in `src/screens/CameraScreen.tsx`, `src/screens/onboarding/PermissionsScreen.tsx`, `ios/AIPhotoCoach/Info.plist`, `ios/Podfile`, and `android/app/src/main/AndroidManifest.xml`.

**Device sensors and haptics:**
- Motion sensors - Accelerometer and gyroscope data drive horizon, stability, and pitch detection in `src/sensors/useHorizonLevel.ts`, `src/sensors/useStability.ts`, and `src/sensors/usePitchDetection.ts`.
- SDK/Client: `react-native-sensors` ^7.3.6 in `package.json`.
- Auth: iOS motion usage description in `ios/AIPhotoCoach/Info.plist`; iOS permission setup includes `Motion` in `ios/Podfile`.
- Haptic/vibration feedback - Uses React Native `Vibration` API in `src/haptics/haptics.ts`; no external haptic SDK is used.

**On-device ML / frame analysis:**
- Face detection - Current implementation is a stub in `src/faceDetection/useFaceDetection.ts`; no active MLKit/VisionCamera face detector package is declared in `package.json` or imported under `src/`.
- Lighting and edge frame analysis - Current VisionCamera v5 frame-output integrations are stubs in `src/lighting/useLightingFrameProcessor.ts` and `src/edgeDetection/useEdgeDetectionFrameOutput.ts`, each returning `frameOutput: null` and neutral stats.
- Aesthetic model - TFLite integration is planned/stubbed in `src/aestheticModel/modelLoader.ts`; comments reference future `react-native-fast-tflite`, but that dependency is not present in `package.json`, and the loader currently falls back to rules-only behavior.
- SDK/Client: no active external ML SDK in current dependencies; related test mocks exist in `jest.config.js` for `react-native-vision-camera-face-detector`, but the package is not in `package.json`.
- Auth: none.

**Native UI/runtime integrations:**
- Safe areas - `react-native-safe-area-context` is used in `App.tsx` and screen components under `src/screens/`.
- Gestures - `react-native-gesture-handler` powers post-capture swipes in `src/screens/PostCaptureScreen.tsx`.
- Reanimated/worklets - `react-native-reanimated` and `react-native-worklets` are dependencies in `package.json` and mocked in `jest.config.js`; current source uses gesture `.runOnJS(true)` in `src/screens/PostCaptureScreen.tsx`, while VisionCamera worklet integrations are mostly stubbed.
- Nitro modules - `react-native-nitro-modules` and `react-native-nitro-image` are declared in `package.json`; no direct source imports were found in `src/`.

## Data Storage

**Databases:**
- Local key-value storage only; no remote database provider was found in `package.json` or source under `src/`.
- Connection: none; storage instances are local device stores created in `src/storage/settings.ts`, `src/storage/LocalPhotoStorage.ts`, `src/storage/onboarding.ts`, and `src/telemetry/index.ts`.
- Client: `react-native-mmkv` for settings/photo metadata/telemetry ID and `@react-native-async-storage/async-storage` for onboarding completion.

**File Storage:**
- Device camera roll / Photos library - Captured photos are saved and deleted through `CameraRoll.saveAsset` and `CameraRoll.deletePhotos` in `src/storage/LocalPhotoStorage.ts`.
- Photo metadata - Stored locally in MMKV instance `photo-metadata` in `src/storage/LocalPhotoStorage.ts` under key `@photo_metadata`.
- Settings - Stored locally in MMKV instance `user-settings` in `src/storage/settings.ts` with keys such as `@auto_capture_enabled`, `@telemetry_opt_out`, `@haptic_feedback_enabled`, and `@score_visibility_enabled`.
- Onboarding state - Stored locally through AsyncStorage in `src/storage/onboarding.ts` under key `@onboarding_complete`.
- iOS photo/camera permissions - Declared in `ios/AIPhotoCoach/Info.plist` and configured through `ios/Podfile` permission handlers.
- Android media permissions - Declared in `android/app/src/main/AndroidManifest.xml` with camera and image/storage permissions.

**Caching:**
- Local MMKV/AsyncStorage only; no Redis/CDN/cache service integration was found in `package.json` or source under `src/`.
- Aesthetic model load state is held in module-level memory variables in `src/aestheticModel/modelLoader.ts` and does not use a network cache.

## Authentication & Identity

**Auth Provider:**
- None - No user accounts, login provider, OAuth, Firebase Auth, Supabase Auth, or custom backend auth was found in `package.json`, `App.tsx`, or `src/`.
- Implementation: The app navigates locally between onboarding, mode selection, camera, post-capture, and settings in `App.tsx` without identity/session auth.
- Anonymous telemetry identity only - `src/telemetry/index.ts` generates and stores a UUID-like install ID in MMKV key `@telemetry_install_id`; it is not tied to a user account.

## Monitoring & Observability

**Error Tracking:**
- None for external crash/error reporting - No Sentry, Bugsnag, Firebase Crashlytics, Datadog, or similar SDK appears in `package.json` or source under `src/`.
- Local console warnings/errors are used in modules such as `src/storage/LocalPhotoStorage.ts`, `src/sensors/useHorizonLevel.ts`, `src/sensors/useStability.ts`, and `src/aestheticModel/modelLoader.ts`.

**Logs:**
- Console telemetry provider - MVP telemetry logs events to JavaScript console in `src/telemetry/ConsoleTelemetryProvider.ts` and is wired as the default provider in `src/telemetry/index.ts`.
- Telemetry opt-out - Stored in MMKV (`user-settings`, key `@telemetry_opt_out`) and checked in `src/telemetry/index.ts`; settings UI reads/writes via `src/storage/settings.ts`.
- Security documentation - `SECURITY.md` states telemetry is console-only for MVP and recommends replacing it with a null or backend provider before production telemetry use.

## CI/CD & Deployment

**Hosting:**
- None - This is a local/mobile React Native app with no web hosting or backend deployment target found in repository files.
- Mobile build targets are native iOS/Android projects in `ios/` and `android/`, with scripts in `package.json` and recipes in `justfile`.

**CI Pipeline:**
- None found - No GitHub Actions, CircleCI, Bitrise, Fastlane, EAS, or other CI/CD config was found in the repository root or platform directories during this audit.
- Local quality gate - `prek.toml` defines local hooks for `yarn typecheck`, `yarn lint`, and `yarn test`; `justfile` also defines `check`, build, clean, and device recipes.

## Environment Configuration

**Required env vars:**
- None found - No application env var references such as `process.env`, API keys, service URLs, or secrets were found in `src/`, `App.tsx`, `package.json`, `ios/`, or `android/`.
- Platform build settings are file-based in `android/gradle.properties`, `android/build.gradle`, `android/app/build.gradle`, `ios/Podfile`, `ios/AIPhotoCoach/Info.plist`, and `ios/AIPhotoCoach/PrivacyInfo.xcprivacy`.

**Secrets location:**
- None configured - No secrets files, keychain integrations, `.env` files, or remote secret managers were found.
- Android debug signing is checked in and used for release builds in `android/app/build.gradle`; this is standard for development but should be replaced before production release.

## Webhooks & Callbacks

**Incoming:**
- None - No backend server, deep-link callback handler, webhook endpoint, or URL scheme handling was found in `App.tsx`, `src/`, `ios/AIPhotoCoach/Info.plist`, or `android/app/src/main/AndroidManifest.xml`.

**Outgoing:**
- None - No outbound HTTP callbacks, analytics uploads, webhook posts, or remote telemetry calls were found in `src/`.
- Local callbacks only - React callbacks connect screens and hooks within `App.tsx`, `src/screens/CameraScreen.tsx`, and feature modules under `src/`.

---

*Integration audit: 2026-05-01*
