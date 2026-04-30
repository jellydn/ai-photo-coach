# Security Model: Telemetry and Storage

This document outlines the security model for AI Photo Coach's telemetry and storage systems. It addresses data collection, retention, storage security, and production deployment considerations.

## Data Collection

### What Telemetry Collects

The telemetry system collects **anonymous event data** to measure app success metrics. No personally identifiable information (PII) is collected.

| Event             | Properties Collected                                                                    | Purpose                    |
| ----------------- | --------------------------------------------------------------------------------------- | -------------------------- |
| `mode_selected`   | `mode`: string                                                                          | Track mode usage patterns  |
| `shot_captured`   | `mode`: string, `score`: number, `autoCapture`: boolean                                 | Measure capture success    |
| `auto_captured`   | `mode`: string, `score`: number                                                         | Track auto-capture usage   |
| `shot_discarded`  | `mode`: string, `score`: number, `weakestSubscore`: string                              | Understand discard reasons |
| `session_started` | `mode`: string                                                                          | Measure session engagement |
| `session_ended`   | `mode`: string, `durationMs`: number, `shotsCaptured`: number, `shotsDiscarded`: number | Track session metrics      |

**Additional metadata collected with every event:**

- Unix timestamp (milliseconds)
- Anonymous install ID (UUID-like format, not tied to device ID)

**Not collected:**

- Photo bytes or image data
- User names, emails, or account information
- Device identifiers (UDID, IMEI, etc.)
- Location data
- IP addresses (by default)

### Opt-Out Mechanism

Users can opt out of telemetry collection at any time:

```typescript
import { setTelemetryOptOut, isTelemetryOptedOut } from './telemetry';

// Check current opt-out status
const isOptedOut = isTelemetryOptedOut(); // returns boolean

// Opt out of telemetry
setTelemetryOptOut(true);

// Opt back in
setTelemetryOptOut(false);
```

**UI Integration:** The Settings screen includes a toggle for telemetry opt-out (`SettingsScreen.tsx`). The opt-out state is persisted in MMKV storage with key `@telemetry_opt_out`.

**Behavior when opted out:**

- No events are tracked or logged
- Install ID remains stored (for if user opts back in)
- All telemetry calls return `null` immediately without side effects

## Data Retention

### Current Policy (MVP)

**Console Provider (Default):**

- Telemetry events are logged to console only
- No persistent storage of telemetry events
- Logs are ephemeral and cleared on app restart
- No retention period - data exists only in memory during session

**Install ID:**

- Stored indefinitely in MMKV (`@telemetry_install_id`)
- Not tied to any user account
- Can be cleared by uninstalling the app

### Recommended Production Policy

If implementing a backend telemetry provider:

| Data Type          | Retention Period    | Rationale                         |
| ------------------ | ------------------- | --------------------------------- |
| Event logs         | 90 days             | Sufficient for trend analysis     |
| Aggregated metrics | 1 year              | Long-term usage patterns          |
| Install ID         | Until app uninstall | Required for unique user counting |
| Session data       | 30 days             | Short-term engagement analysis    |

**Implementation note:** Implement a backend provider that respects these retention periods with automatic data purging. Consider adding a "Delete My Data" feature for GDPR/CCPA compliance.

## Storage Security

### MMKV Storage

The app uses MMKV (Memory-mapped Key-Value) for fast, synchronous storage of settings and metadata.

#### Current Encryption Status

| Storage Instance | ID                  | Encrypted | Contents                                        |
| ---------------- | ------------------- | --------- | ----------------------------------------------- |
| User settings    | `user-settings`     | **No**    | Auto-capture toggle, telemetry opt-out          |
| Telemetry        | `telemetry-storage` | **No**    | Anonymous install ID                            |
| Photo metadata   | `photo-metadata`    | **No**    | Photo scores, subscores, timestamps, references |

#### Platform-Level Protection

**iOS:**

- MMKV data is stored in the app sandbox
- Protected by iOS keychain when device has passcode enabled
- Data encrypted at rest using iOS Data Protection
- Backup encryption depends on iTunes/iCloud backup settings

**Android:**

- MMKV data stored in internal app storage (`/data/data/<package>`)
- Protected by Android sandbox (other apps cannot access)
- Device encryption applies if enabled (Android 10+ default)
- Keystore-backed encryption available for MMKV but not currently enabled

### Photo Storage

**Saved Photos:**

- Stored in device camera roll (Photos app / Gallery)
- Subject to platform's photo library security model
- User has full control through system photo permissions
- Metadata stored separately in MMKV (not embedded in EXIF)

**Metadata Storage:**

- Stored as JSON in MMKV key `@photo_metadata`
- Contains: photo ID, mode, score, subscores, timestamp, camera roll reference ID
- Not encrypted at rest (relies on platform sandbox protection)
- No facial data or location stored in metadata

## Logging in Production

### Console Provider (MVP Only)

The `ConsoleTelemetryProvider` logs all telemetry events to the JavaScript console:

```
[TELEMETRY] 2024-01-15T10:30:00.000Z mode_selected {"mode":"portrait"} install:abc123
```

**Risks in production:**

- Logs may appear in crash reports sent to Apple/Google
- Console logs can be captured by debugging tools
- Potential for session data leakage through logs

**Current state:** Console provider is MVP/stub implementation only.

### Production Recommendation

**Replace console provider with one of:**

1. **Null Provider** (no telemetry):

```typescript
export class NullTelemetryProvider implements TelemetryProvider {
  track(): void {
    /* no-op */
  }
  async flush(): Promise<void> {
    /* no-op */
  }
}
```

2. **Backend Analytics Provider** (production telemetry):
   - Implement custom provider for your analytics service
   - Ensure batching and retry logic for offline scenarios
   - Anonymize any device identifiers before transmission
   - Use HTTPS with certificate pinning

3. **Build-specific provider selection:**

```typescript
const provider = __DEV__
  ? new ConsoleTelemetryProvider()
  : new NullTelemetryProvider(); // or your backend provider
export const telemetry = new TelemetryTracker(provider);
```

## Privacy Policy Reference

### Required Disclosures

A privacy policy for this app should include:

1. **Data Collection:**
   - We collect anonymous usage analytics to improve the app
   - No photos, personal information, or location data is collected
   - Events tracked: mode selection, shot capture, session duration

2. **Data Storage:**
   - Analytics data stored locally on your device
   - Photo metadata (scores, timestamps) stored in app storage
   - Photos saved to your device's camera roll

3. **Third Parties:**
   - Currently: No third-party analytics services
   - Future: If added, privacy policy must be updated

4. **User Rights:**
   - You can opt out of analytics in Settings
   - Deleting the app removes all local analytics data
   - Photos remain in your camera roll (app-independent)

### Suggested Implementation

Add a "Privacy Policy" link in:

- Settings screen (below telemetry toggle)
- App Store / Play Store listing
- Onboarding flow (optional)

Example link structure:

```typescript
// SettingsScreen.tsx
<SettingsItem
  label="Privacy Policy"
  onPress={() => Linking.openURL('https://yourdomain.com/privacy')}
/>
```

## Recommendations for Production

### High Priority

1. **Replace ConsoleTelemetryProvider**
   - Use NullTelemetryProvider for release builds OR
   - Implement secure backend provider with proper authentication
   - Never ship console logging to production

2. **Add Data Export/Deletion**
   - Implement "Export My Data" feature (GDPR compliance)
   - Implement "Delete My Account/Data" feature
   - Clear install ID and all telemetry on deletion

3. **Enable MMKV Encryption (Optional)**
   ```typescript
   const storage = createMMKV({
     id: 'user-settings',
     encryptionKey: getSecureEncryptionKey(), // From Keychain/Keystore
   });
   ```

   - Only if compliance requires encryption at rest
   - Note: Adds key management complexity

### Medium Priority

4. **Implement Install ID Rotation**
   - Rotate anonymous ID every 90 days
   - Prevents long-term tracking while maintaining analytics quality

   ```typescript
   // Check last rotation, generate new ID if needed
   ```

5. **Add Consent Flow**
   - Explicit opt-in for telemetry during onboarding
   - Pre-check opt-out toggle, let user enable
   - Required in some jurisdictions (GDPR)

6. **Telemetry Audit Log**
   - Log what was tracked for debugging
   - Only in development builds
   - Separate from production telemetry

### Low Priority

7. **Network Security**
   - If using backend provider, implement certificate pinning
   - Add retry with exponential backoff
   - Batch events to reduce network calls

8. **Documentation**
   - Keep this SECURITY.md updated when adding new telemetry events
   - Document any new storage systems
   - Update privacy policy with any changes

## Security Checklist for Release

- [ ] ConsoleTelemetryProvider replaced with production provider
- [ ] Telemetry opt-out toggle tested and working
- [ ] Privacy policy published and linked in app
- [ ] MMKV encryption decision documented (on/off and why)
- [ ] No PII in telemetry events (audit all `track()` calls)
- [ ] No debug/logging code in release builds
- [ ] App Store / Play Store privacy labels accurate
- [ ] GDPR/CCPA compliance verified (if applicable regions)

## References

- [MMKV Documentation](https://github.com/Tencent/MMKV)
- [react-native-mmkv](https://github.com/mrousavy/react-native-mmkv)
- [Apple Privacy Requirements](https://developer.apple.com/app-store/user-privacy-and-data-use/)
- [Google Play Data Safety](https://support.google.com/googleplay/android-developer/answer/10787469)
