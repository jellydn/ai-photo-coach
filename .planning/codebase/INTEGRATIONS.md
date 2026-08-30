# External Integrations

**Analysis Date:** 2026-08-30

## APIs & External Services

**Mobile runtime:**
- No remote application API or backend client is present; camera coaching and analysis execute through local sensors/frame processors (`src/framePipeline/useFramePipeline.ts`, `src/shotAnalysis/useShotAnalysis.ts`, `src/scoring/useScoring.ts`)
- Camera capture/frame access uses `react-native-vision-camera` (`package.json`, `src/screens/CameraScreen.tsx`, `src/framePipeline/useFramePipeline.ts`)
- Face analysis uses the native `react-native-vision-camera-face-detector` hook (`package.json`, `src/faceDetection/useFaceDetection.ts`)
- Accelerometer/gyroscope access uses `react-native-sensors` (`package.json`, `src/sensors/useHorizonLevel.ts`, `src/sensors/usePitchDetection.ts`, `src/sensors/useStability.ts`)
- Camera, photo-library, and motion permissions use `react-native-permissions` with native iOS permission pods (`src/camera/useCameraPermission.ts`, `src/screens/onboarding/PermissionsScreen.tsx`, `ios/Podfile`)

**Repository tooling:**
- The local comparison proxy reads the public GitHub Pages origin, and the page-diff script calls that proxy with Node `fetch` (`scripts/serve-pages.mjs`, `scripts/diff-pages.mjs`)
- SDK/Client: built-in Node HTTP/HTTPS and Fetch APIs; no API credential is used (`scripts/serve-pages.mjs`, `scripts/diff-pages.mjs`)
- Auth: none (`scripts/serve-pages.mjs`, `scripts/diff-pages.mjs`)

## Data Storage

**Databases:**
- No remote, SQL, or NoSQL database client is declared; persistence adapters target device services (`package.json`, `src/storage/PhotoStorage.ts`, `src/storage/storageWiring.ts`)
- Connection: none (`src/storage/storageWiring.ts`)
- Client: MMKV/AsyncStorage and Camera Roll native clients (`src/storage/settings.ts`, `src/storage/onboarding.ts`, `src/storage/LocalPhotoStorage.ts`)

**File Storage:**
- Captured photos are saved to and deleted from the device camera roll with `@react-native-camera-roll/camera-roll` (`src/storage/LocalPhotoStorage.ts`, `src/storage/EncryptedLocalPhotoStorage.ts`)
- Photo metadata is indexed locally by MMKV; the default wiring selects the unencrypted `LocalPhotoStorage` adapter (`src/storage/LocalPhotoStorage.ts`, `src/storage/photoIndex.ts`, `src/storage/storageWiring.ts`)

**Caching:**
- MMKV provides local synchronous key-value persistence for settings, photo metadata/indexes, and the telemetry install ID (`src/storage/settings.ts`, `src/storage/LocalPhotoStorage.ts`, `src/telemetry/installId.ts`)
- AsyncStorage persists the onboarding-complete flag (`src/storage/onboarding.ts`)
- Optional encrypted MMKV instances cache in memory and obtain per-store AES keys from iOS Keychain/Android Keystore through `react-native-keychain`; this adapter is implemented but disabled by default (`src/storage/encryptedStorage.ts`, `src/storage/EncryptedLocalPhotoStorage.ts`, `src/storage/storageWiring.ts`)

## Authentication & Identity

**Auth Provider:**
- None; no account, session, OAuth, or remote identity provider appears in the app dependencies or application wiring (`package.json`, `App.tsx`)
- Implementation: a locally generated, MMKV-persisted anonymous install ID exists for telemetry correlation and is not authentication (`src/telemetry/installId.ts`, `src/telemetry/types.ts`)

## Monitoring & Observability

**Error Tracking:**
- No external crash/error tracking SDK is declared (`package.json`); application failures use local `console.error` paths such as encrypted-key cleanup and onboarding persistence (`src/storage/encryptedStorage.ts`, `src/storage/onboarding.ts`)

**Logs:**
- Telemetry is provider-based and local: development can use `ConsoleTelemetryProvider`, while production/no-op behavior is represented by `NullTelemetryProvider`; no network exporter is present (`src/telemetry/ConsoleTelemetryProvider.ts`, `src/telemetry/NullTelemetryProvider.ts`, `src/telemetry/types.ts`)

## CI/CD & Deployment

**Hosting:**
- GitHub Pages hosts the static `website/` output; deployment uploads that directory as a Pages artifact (`.github/workflows/deploy.yml`, `website/index.html`)
- Mobile binaries have no repository-defined release/deployment workflow; the only workflows are CI and static-site Pages deployment (`.github/workflows/ci.yml`, `.github/workflows/deploy.yml`)

**CI Pipeline:**
- GitHub Actions runs typecheck, Jest, ESLint, ADR consistency, and dead-export guards on pull requests/pushes (`.github/workflows/ci.yml`)
- GitHub Actions deploys `website/` on relevant `main` changes, uses GitHub Pages OIDC permissions, and smoke-tests the deployed page (`.github/workflows/deploy.yml`)
- External actions are `actions/checkout@v4`, `actions/setup-node@v4`, `actions/configure-pages@v5`, `actions/upload-pages-artifact@v3`, and `actions/deploy-pages@v4` (`.github/workflows/ci.yml`, `.github/workflows/deploy.yml`)

## Environment Configuration

**Required env vars:**
- Mobile runtime: none; no `.env` file or mobile `process.env` read is present, and storage adapter selection is compiled into `src/storage/storageWiring.ts`
- CI supplies GitHub event SHA values to ADR/dead-export checks through `BASE_SHA` and `HEAD_SHA` (`.github/workflows/ci.yml`)
- Static-site local tooling optionally reads `PORT`, defaulting to 8131 (`scripts/serve-pages.mjs`)

**Secrets location:**
- No application API secrets are configured in the repository (`package.json`, `src/storage/storageWiring.ts`)
- Encrypted local-storage keys, when that adapter is used, are generated on device and stored via Keychain/Keystore rather than repository or environment secrets (`src/storage/encryptedStorage.ts`)
- GitHub Pages deployment uses workflow-provided OIDC (`id-token: write`) rather than a checked-in deploy token (`.github/workflows/deploy.yml`)

## Webhooks & Callbacks

**Incoming:**
- None; the repository defines no application HTTP server or webhook endpoint, and `scripts/serve-pages.mjs` is only a local static/proxy development server (`package.json`, `scripts/serve-pages.mjs`)

**Outgoing:**
- No mobile-runtime webhook or remote API callback is implemented (`src/telemetry/NullTelemetryProvider.ts`, `src/telemetry/ConsoleTelemetryProvider.ts`)
- CI deployment and smoke testing communicate with GitHub Pages through official actions and `curl` (`.github/workflows/deploy.yml`)

---

*Integration audit: 2026-08-30*
