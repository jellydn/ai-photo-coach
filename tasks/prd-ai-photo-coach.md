# PRD: AI Photo Coach – Visual Guide Camera App

## 1. Introduction / Overview

AI Photo Coach is a cross-platform (iOS + Android) mobile camera app built on React Native + VisionCamera v5. It overlays real-time visual guides and short coaching prompts on the live camera preview to help everyday users take better photos without learning photography theory.

Instead of providing only hardware controls, the app analyzes each frame (composition, horizon, lighting, face framing, stability) and tells the user what to do **before** they press the shutter — and can optionally auto-capture when the shot is ready.

## 2. Goals

- Help non-experts take noticeably better photos in **under 30 seconds** per shot.
- Deliver actionable, non-technical, real-time coaching prompts (≤ 5 words each).
- Achieve smooth ≥ 30 FPS frame processing on mid-range devices using VisionCamera v5 frame processors and Worklets.
- Ship a focused MVP in 4 weeks covering Portrait + Travel modes.
- Keep all photos device-local in MVP; design data layer to allow optional cloud sync later.

## 3. User Stories

### US-001: Project bootstrap with VisionCamera v5
**Description:** As a developer, I want a working RN app with VisionCamera v5 so I can build features on top of a verified foundation.

**Acceptance Criteria:**
- [ ] React Native (Expo dev-client or bare RN) project initialized in repo root
- [ ] `react-native-vision-camera@^5` installed and running on iOS and Android
- [ ] `react-native-worklets-core` configured for frame processors
- [ ] Camera permissions handled with friendly denied-state UI
- [ ] Live preview renders on both platforms
- [ ] Typecheck and lint pass
- [ ] Verified on iOS Simulator/device and Android emulator/device

### US-002: Mode selector landing screen
**Description:** As a user, I want to pick a shooting mode before opening the camera so guidance is tailored to my intent.

**Acceptance Criteria:**
- [ ] Landing screen lists 8 modes: Portrait, Food, Travel, Group Photo, Product, Document, Pet/Kids, Night Shot
- [ ] MVP modes (Portrait, Travel) are enabled; others show "Coming soon"
- [ ] Selected mode persists into camera screen via navigation param
- [ ] Each mode has icon + 1-line description
- [ ] Typecheck passes
- [ ] Verified on device

### US-003: Live composition overlay (rule of thirds + center marker)
**Description:** As a user, I want classic composition guides on screen so I can frame my subject correctly.

**Acceptance Criteria:**
- [ ] Rule-of-thirds grid rendered as SVG/Skia overlay on preview
- [ ] Center subject marker (small crosshair) shown
- [ ] Overlays scale correctly across phone aspect ratios
- [ ] Overlays togglable per mode (Portrait + Travel ON by default in MVP)
- [ ] No frame drops on mid-range device
- [ ] Typecheck passes
- [ ] Verified on device

### US-004: Horizon level indicator (gyroscope-based)
**Description:** As a user, I want to see whether my phone is tilted so I can avoid crooked horizons.

**Acceptance Criteria:**
- [ ] Uses device motion sensor (e.g., `expo-sensors` or `react-native-sensors`) sampled at ≥ 30 Hz
- [ ] On-screen horizon line rotates with device roll
- [ ] Indicator turns green when within ±2° of level
- [ ] Tilt angle smoothed (low-pass) to avoid jitter
- [ ] Typecheck passes
- [ ] Verified on device

### US-005: Face framing guide (Portrait mode)
**Description:** As a user shooting a portrait, I want a guide showing ideal head position and headroom so my subject is well-framed.

**Acceptance Criteria:**
- [ ] Frame processor runs MLKit Face Detection (cross-platform via VisionCamera v5 plugin)
- [ ] Bounding box of primary face drawn on overlay
- [ ] Headroom guide line shown at upper-third
- [ ] Distance prompt fires when face occupies < 15% or > 60% of frame area
- [ ] Runs at ≥ 20 FPS on mid-range device
- [ ] Typecheck passes
- [ ] Verified on device

### US-006: Lighting quality analysis
**Description:** As a user, I want to know when lighting is poor so I can move or rotate to improve the shot.

**Acceptance Criteria:**
- [ ] Frame processor computes mean luminance + histogram clipping per frame (downsampled)
- [ ] Classifies frame as: too dark / too bright / backlit / good
- [ ] Backlit detection compares face-region brightness vs background brightness (Portrait mode)
- [ ] Result feeds coaching prompt engine
- [ ] Runs at ≥ 20 FPS
- [ ] Typecheck passes
- [ ] Verified on device

### US-007: Coaching prompt engine
**Description:** As a user, I want short, plain-language tips on screen so I know what to adjust.

**Acceptance Criteria:**
- [ ] Prompt strings are ≤ 5 words, non-technical (e.g., "Step back", "Hold steady", "Face the light")
- [ ] At most ONE prompt visible at a time, prioritized by severity (stability > level > framing > lighting > composition)
- [ ] Prompts debounce: no flicker faster than 500 ms
- [ ] Prompt source is unit-testable pure function `(signals) => prompt | null`
- [ ] Typecheck passes
- [ ] Verified on device

### US-008: Live shot-readiness score (hybrid: rules + ML)
**Description:** As a user, I want to see how good my current frame is **before** I press shutter so I know when it's worth capturing.

**Acceptance Criteria:**
- [ ] Score (0–100) shown on screen, updated at ≥ 10 Hz
- [ ] Hybrid scoring: rule-based subscores (level, framing, lighting, stability) + lightweight ML aesthetic model (TFLite, optional in MVP — falls back to rules if model unavailable)
- [ ] Visual indicator: red < 50, yellow 50–79, green ≥ 80
- [ ] Score breakdown viewable on tap (shows which subscore is weakest)
- [ ] Pure scoring function unit-tested
- [ ] Typecheck passes
- [ ] Verified on device

### US-009: Stability detection
**Description:** As a user, I want the app to detect when I'm holding the phone still so it can auto-capture sharp shots.

**Acceptance Criteria:**
- [ ] Combines accelerometer + gyro magnitude over rolling 500 ms window
- [ ] Boolean `isStable` available to scoring + auto-capture
- [ ] Threshold tunable per mode in config
- [ ] Typecheck passes
- [ ] Verified on device

### US-010: Auto Best Shot capture
**Description:** As a user, I want the app to auto-capture when conditions are good so I don't miss the moment.

**Acceptance Criteria:**
- [ ] When score ≥ 80 AND `isStable` AND mode allows auto-capture, start 3-2-1 countdown
- [ ] Countdown cancels if conditions break
- [ ] User can disable auto-capture from a toggle in camera UI
- [ ] Captured photo saved to device camera roll (CameraRoll/MediaLibrary)
- [ ] Manual shutter button always available
- [ ] Per-mode thresholds defined in a single config file (hardcoded for MVP)
- [ ] Typecheck passes
- [ ] Verified on device

### US-011: Before / After preview
**Description:** As a user, after a shot I want to see the captured frame next to a "what could be better" annotation so I learn over time.

**Acceptance Criteria:**
- [ ] Post-capture screen shows the saved photo with overlaid annotations of weakest subscores
- [ ] Each annotation is a short tip (e.g., "Horizon was tilted 4°")
- [ ] User can swipe between Before (raw) and After (annotated) views
- [ ] "Save" and "Discard" actions
- [ ] Typecheck passes
- [ ] Verified on device

### US-012: Travel mode preset
**Description:** As a traveler, I want a mode that emphasizes scenery framing rather than face framing.

**Acceptance Criteria:**
- [ ] Travel mode disables face-framing prompts
- [ ] Emphasizes horizon level and rule-of-thirds
- [ ] Detects strong vertical/horizontal lines (basic edge analysis) and suggests alignment
- [ ] Loose stability threshold (handheld landscape OK)
- [ ] Typecheck passes
- [ ] Verified on device

### US-013: Photo storage abstraction
**Description:** As a developer, I want a storage interface so we can later add cloud sync without rewriting the capture path.

**Acceptance Criteria:**
- [ ] `PhotoStorage` interface with `save(photo, metadata)` / `list()` / `delete(id)` methods
- [ ] MVP implementation uses local camera roll + local SQLite/MMKV for metadata
- [ ] Cloud implementation deferred (interface only)
- [ ] Unit tests for local implementation
- [ ] Typecheck passes

### US-014: Onboarding & permission flow
**Description:** As a first-time user, I want a short onboarding so I understand the coach concept and grant permissions.

**Acceptance Criteria:**
- [ ] 3-screen onboarding (concept → modes → permissions)
- [ ] Requests Camera + Motion + Photo Library permissions
- [ ] Shown only on first launch (persisted with MMKV/AsyncStorage)
- [ ] Skippable
- [ ] Typecheck passes
- [ ] Verified on device

### US-015: Telemetry stub for success metrics
**Description:** As a PM, I want anonymous events tracked so we can measure success metrics post-launch.

**Acceptance Criteria:**
- [ ] Events: `mode_selected`, `shot_captured`, `auto_captured`, `shot_discarded`, `session_started`, `session_ended`
- [ ] No PII; opt-out toggle in settings
- [ ] Pluggable backend (console logger in MVP, real provider later)
- [ ] Typecheck passes

## 4. Functional Requirements

- FR-1: The app must run on iOS 15+ and Android 8+ (API 26+).
- FR-2: The app must use `react-native-vision-camera` v5 for camera and frame processing.
- FR-3: Frame processors must be implemented with `react-native-worklets-core`.
- FR-4: Face detection must work cross-platform via MLKit (`@react-native-ml-kit/face-detection` or VisionCamera v5 face-detector plugin).
- FR-5: Motion data must come from a single sensor abstraction module.
- FR-6: At any time, only ONE coaching prompt is visible.
- FR-7: Prompt strings must be ≤ 5 words and non-technical.
- FR-8: A live readiness score (0–100) must be shown before shutter and updated at ≥ 10 Hz.
- FR-9: Auto-capture triggers a 3-2-1 countdown only when score ≥ 80 AND device is stable.
- FR-10: Manual shutter must always remain available even when auto-capture is active.
- FR-11: All captures must save to the device camera roll (no upload in MVP).
- FR-12: Photo metadata (mode, score, subscore breakdown, timestamp) stored locally.
- FR-13: Per-mode thresholds (auto-capture, framing, stability) live in a single config module.
- FR-14: All scoring logic must be expressed as pure, unit-testable functions.
- FR-15: The app must function fully offline.

## 5. Non-Goals (Out of Scope for MVP)

- No editing filters, beauty filters, or post-processing effects.
- No cloud storage, accounts, login, or social feed.
- No video coaching or video recording.
- No voice coaching (text/visual only).
- No pose suggestion engine.
- No multi-cam or LiDAR/ToF features (deferred despite v5 support).
- No RAW capture in MVP.
- Modes other than Portrait + Travel are stubs only.

## 6. Design Considerations

- **Visual style:** minimal, dark UI, high-contrast overlays in white/yellow/green/red.
- **Overlays:** prefer Skia (`react-native-vision-camera-skia`) for GPU-accelerated rendering if it integrates cleanly; otherwise SVG.
- **Prompt UI:** single pill at top-center, animates in/out with 200 ms fade.
- **Score UI:** small ring meter at top-right with color state.
- **Mode selector:** large tappable cards with icons; reuse existing list component patterns.
- **Onboarding:** consistent with iOS/Android system permission UX.

## 7. Technical Considerations

- **Stack:** React Native (bare or Expo dev-client), TypeScript, VisionCamera v5, Worklets, MLKit, Skia, MMKV (or AsyncStorage), Reanimated.
- **Frame processor budget:** target 33 ms/frame on mid-range hardware (Pixel 6a / iPhone 12). Heavy ML downsampled to ≤ 320 px on the long edge.
- **Optional aesthetic ML model:** TFLite small CNN (~3–5 MB), bundled in app; falls back to rules if load fails.
- **Sensor fusion:** simple low-pass filter on accel/gyro for horizon and stability.
- **State management:** Zustand or React Context for mode + settings; Reanimated shared values for high-frequency UI updates from the worklet thread.
- **Testing:** unit tests for scoring + prompt selection (pure functions). Manual device testing required for camera-side verification.

## 8. Success Metrics

- 70% of users in test cohort report retaking fewer photos after using the app.
- 40% of users save the guided photo on the first attempt.
- Average session > 2 minutes.
- 25%+ users return within 7 days.
- ≥ 30 FPS preview, ≥ 20 FPS frame processing on Pixel 6a / iPhone 12.
- App size ≤ 60 MB on both platforms.

## 9. Open Questions

- Which face-detection plugin is officially supported in VisionCamera v5 today (verify before US-005)?
- Should the readiness score be hidden behind a settings toggle for users who find it distracting?
- For Portrait mode, do we want eye-line snapping in v1 or v1.1?
- Is haptic feedback at score ≥ 80 desirable, or only visual?
- Should auto-capture default ON or OFF for new users?
- Cloud sync: which provider/architecture do we plan toward (informs US-013 abstraction shape)?

## 10. Milestones (4-Week MVP)

- **Week 1:** US-001, US-002, US-003, US-004, US-014 (foundation + overlays + onboarding)
- **Week 2:** US-005, US-006, US-009 (detection signals)
- **Week 3:** US-007, US-008, US-010 (coaching engine + scoring + auto-capture)
- **Week 4:** US-011, US-012, US-013, US-015, polish + device testing
