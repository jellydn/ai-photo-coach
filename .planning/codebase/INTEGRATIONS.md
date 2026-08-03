# External Integrations

**Analysis Date:** 2026-08-03

## APIs & External Services

**Network APIs:**
- None. All analysis (scoring, face/edge/lighting/document detection, aesthetic model) runs on-device. No backend services, SDKs, or auth tokens.

**Device services:**
- Camera - `react-native-vision-camera` 5.2.1 (capture + frame processing)
- Motion sensors - `react-native-sensors` (gyroscope/accelerometer → horizon, pitch, stability)
- Photo gallery - `@react-native-camera-roll/camera-roll` (save/delete photos)
- Permissions - `react-native-permissions` (camera, photo library)

## Data Storage

**Databases:**
- None (no SQL/NoSQL database)

**File Storage:**
- Device camera roll for saved photos (via `@react-native-camera-roll/camera-roll`)

**Key-Value:**
- `react-native-mmkv` v4 - Synchronous KV: user settings (`src/storage/settings.ts`, id `user-settings`), encrypted settings (`encryptedStorage.ts`, id `user-settings-encrypted`), anonymous telemetry install ID (`src/telemetry/installId.ts`)
- `react-native-keychain` - Encryption keys for the encrypted MMKV instance (per-storage keychain entries)
- `@react-native-async-storage/async-storage` - Onboarding completion flag (`src/storage/onboarding.ts`)

**Caching:**
- MMKV only (fast, synchronous, in-memory + disk). No remote cache.

## Authentication & Identity

**Auth Provider:**
- None. No user accounts. The only identity is an anonymous install ID (`src/telemetry/installId.ts`) used for telemetry, not auth.

## Monitoring & Observability

**Error Tracking:**
- None external. Errors are `console.error` + telemetry events.

**Logs:**
- `src/telemetry/` - pluggable `TelemetryProvider`: `ConsoleTelemetryProvider` in dev (`__DEV__`), `NullTelemetryProvider` in production. No PII; opt-out owned by settings store (see ADR-0009).

## CI/CD & Deployment

**Hosting:**
- GitHub Pages - static site in `website/` at `https://jellydn.github.io/ai-photo-coach/` (deployed on push to `main` touching `website/**` or workflow files)

**CI Pipeline:**
- GitHub Actions:
  - `ci.yml` - Typecheck, Test, Lint on every PR and push to `main`, plus two ADR guards: `adr-check` (architectural-seam changes require a new numbered ADR) and `adr-index` (fails if `website/index.html` is stale after `yarn adr:index`)
  - `deploy.yml` - Stamps a `deploy-sha` marker into `website/index.html`, uploads as a Pages artifact, deploys (uses OIDC `id-token`), then runs a post-deploy smoke test that polls the live URL for the marker and asserts the Architecture section, nav link, ADR card links/count, and status badges

**Mobile release:**
- No release pipeline configured in this repo (native builds not automated here)

## Environment Configuration

**Required env vars:**
- None (no `.env` files)

**Secrets location:**
- None. Runtime feature flags are code constants (e.g. `USE_ENCRYPTED_PHOTO_STORAGE`).

## Webhooks & Callbacks

**Incoming:**
- None

**Outgoing:**
- None

---

*Integration audit: 2026-08-03*
