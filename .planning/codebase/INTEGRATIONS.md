# External Integrations

**Analysis Date:** 2026-04-28

## APIs & External Services

**None** - This is a fully offline, privacy-first mobile application. No external APIs are called.

The app performs all processing locally:
- Camera frame processing via VisionCamera v5
- Face detection via MLKit (on-device, no cloud)
- Edge detection via Nitro image processing modules
- Lighting analysis via custom frame processors

## Data Storage

**Local Storage (No cloud):**

**Primary Storage:**
- Device Camera Roll - Photos saved via @react-native-camera-roll/camera-roll
- MMKV Key-Value Store - Photo metadata, app settings, telemetry opt-out
  - Library: react-native-mmkv 4.3.1
  - Instance ID: "photo-metadata"
  - Keys: @photo_metadata (JSON array of PhotoMetadata)

**Secondary Storage:**
- AsyncStorage - Onboarding completion state only
  - Library: @react-native-async-storage/async-storage 3.0.2

**File Storage:**
- Local filesystem only - Photos saved to device camera roll
- No cloud backup, no external file storage services

**Caching:**
- MMKV acts as fast local cache for metadata
- No external CDN or caching service

## Authentication & Identity

**Auth Provider:** None
- No user accounts required
- No login/signup flow
- No OAuth or social auth

**Anonymous Tracking:**
- Install ID generated locally for telemetry (MMKV-backed)
- No PII collected
- User can opt out of telemetry entirely

## Monitoring & Observability

**Error Tracking:** None
- No Sentry, Bugsnag, or Crashlytics integration
- Errors logged to console only (development)

**Logs:**
- Console-based telemetry provider (ConsoleTelemetryProvider)
- Format: [TELEMETRY] ISO8600 event_name {props} install:installId
- Stored in MMKV with opt-out capability
- No external logging service (Datadog, LogRocket, etc.)

**Analytics:**
- Events tracked locally via TelemetryTracker
- Console output only (ConsoleTelemetryProvider)
- Future extensibility for TelemetryProvider interface
- Events include: mode_selected, photo_captured, coaching_prompt_shown, etc.

## CI/CD & Deployment

**Hosting:**
- Not applicable - mobile app (not web-hosted)
- Distribution via App Store (iOS) and Google Play (Android) - not configured yet

**CI Pipeline:** None
- No GitHub Actions, GitLab CI, or other CI configured
- Local quality gates enforced: typecheck → lint → test

**Build Scripts:**
- yarn typecheck - TypeScript compilation check
- yarn lint - ESLint validation
- yarn test - Jest unit tests (390+ tests)
- yarn ios - iOS simulator build
- yarn android - Android emulator build

## Environment Configuration

**Required env vars:** None
- No .env file needed
- No API keys, no secrets
- All configuration is compile-time or hardcoded

**Secrets location:** None
- No secrets repository
- No 1Password/Bitwarden integration
- No keychain/keyring usage for API credentials

**Configuration Sources:**
- src/config/modes.ts - Per-mode thresholds (Portrait/Travel/Other)
- src/config/modeMetadata.ts - Mode display metadata
- MMKV storage - User settings only (no credentials)

## Webhooks & Callbacks

**Incoming:** None
- No webhook endpoints
- No push notification handlers (none configured)
- No deep link handlers (not configured)

**Outgoing:** None
- No webhook calls to external services
- No callback URLs registered
- No server-to-server communication

## Third-Party SDKs Summary

| SDK | Purpose | Data Sent | Notes |
|-----|---------|-----------|-------|
| MLKit Face Detection | Face bounds detection | None (on-device) | Via react-native-vision-camera-face-detector |
| VisionCamera | Camera access | None | Frame processing local only |
| Nitro Modules | Image processing | None | Edge detection in Travel mode |

## Privacy & Data Handling

**Data Residency:**
- All data stays on device
- No cloud synchronization
- No backup to external servers

**User Control:**
- Opt-out of telemetry in settings
- Photos stored only in device camera roll (user's control)
- Metadata deletable via app

**Compliance:**
- GDPR compliant by design (no PII, local only)
- No data export needed (user owns their camera roll)
- No data retention policy needed (user-controlled deletion)

---

*Integration audit: 2026-04-28*
