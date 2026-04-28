# Architecture

**Analysis Date:** 2026-04-28

## Pattern Overview

**Overall:** Feature-Based Modular Architecture with React Hooks

**Key Characteristics:**
- Domain-driven module organization (src/[feature]/)
- Custom React hooks for stateful logic encapsulation
- Pure functions for business logic (testability)
- Frame-processor pipeline for real-time camera analysis
- Composition-over-inheritance UI patterns

## Layers

**Presentation Layer:**
- Purpose: UI components and screens
- Location: `src/screens/`, `src/components/`
- Contains: React components, JSX, StyleSheet definitions
- Depends on: Custom hooks, config, storage
- Used by: App.tsx (root component)

**Business Logic Layer:**
- Purpose: Feature-specific logic and state management
- Location: `src/[feature]/*.ts` (types, pure functions)
- Contains: Type definitions, pure calculation functions, business rules
- Depends on: Other feature types, no external deps
- Used by: Hooks layer, components

**Hooks Layer:**
- Purpose: Stateful logic encapsulation and side effects
- Location: `src/[feature]/use[Feature].ts`
- Contains: React hooks with useState, useEffect, useCallback
- Depends on: Business logic, RxJS sensors, VisionCamera
- Used by: Screen components

**Data Layer:**
- Purpose: Storage and external service integration
- Location: `src/storage/`, `src/telemetry/`
- Contains: MMKV storage, CameraRoll integration, telemetry providers
- Depends on: react-native-mmkv, @react-native-camera-roll/camera-roll
- Used by: All layers for persistence

**Infrastructure Layer:**
- Purpose: Native module integrations and low-level APIs
- Location: `src/sensors/`, frame processor hooks
- Contains: Sensor subscriptions, camera frame processing
- Depends on: react-native-sensors, react-native-vision-camera
- Used by: Feature hooks

## Data Flow

**Real-time Analysis Pipeline:**
1. Camera frames captured by VisionCamera v5
2. Frame outputs (useFrameOutput) process pixel data
3. Processed stats passed to feature hooks (lighting, edge detection)
4. Signals aggregated by coaching hook with priority ordering
5. Score computed by scoring hook at 10 Hz
6. UI updates via React state changes

**Photo Capture Flow:**
1. User taps shutter OR auto-capture triggers (score >= 80 + stable)
2. usePhotoOutput.capturePhotoToFile() captures frame
3. LocalPhotoStorage saves to CameraRoll + metadata to MMKV
4. Photo metadata passed to PostCaptureScreen
5. User saves/discards, flow returns to CameraScreen

**State Management:**
- Local React state for UI (useState in components/hooks)
- MMKV for persistent settings and photo metadata
- No global state library (Zustand mentioned but not used)
- Props drilling for screen-to-screen navigation

## Key Abstractions

**Custom Hooks:**
- Purpose: Encapsulate feature logic with state and effects
- Examples: `src/sensors/useStability.ts`, `src/lighting/useLighting.ts`, `src/coaching/useCoaching.ts`
- Pattern: Return state object + callbacks, accept options object

**Pure Function Business Logic:**
- Purpose: Testable calculations without side effects
- Examples: `src/scoring/types.ts` (computeScore), `src/coaching/types.ts` (selectPrompt)
- Pattern: Input signals -> calculation -> result object

**Frame Output Pattern:**
- Purpose: VisionCamera v5 integration for real-time analysis
- Examples: `src/lighting/useLightingFrameProcessor.ts`, `src/edgeDetection/useEdgeDetectionFrameOutput.ts`
- Pattern: useFrameOutput hook -> onFrame callback -> handleFrameStats

**Priority-Ordered Prompt Selection:**
- Purpose: Single coaching prompt from multiple signals
- Examples: `src/coaching/types.ts` (selectPrompt function)
- Pattern: Early return chain by priority (stability > level > framing > lighting)

**Mode Configuration:**
- Purpose: Per-mode thresholds and feature flags
- Examples: `src/config/modes.ts` (ModeConfig interface, modeConfig record)
- Pattern: Centralized config with getter functions

## Entry Points

**App Root:**
- Location: `/Users/huynhdung/src/tries/2026-04-27-ai-photo-coach/index.js`
- Triggers: React Native runtime
- Responsibilities: Register App component with AppRegistry

**Main Component:**
- Location: `/Users/huynhdung/src/tries/2026-04-27-ai-photo-coach/App.tsx`
- Triggers: AppRegistry
- Responsibilities: Screen routing, session tracking, onboarding check

**Camera Screen:**
- Location: `/Users/huynhdung/src/tries/2026-04-27-ai-photo-coach/src/screens/CameraScreen.tsx`
- Triggers: Mode selection
- Responsibilities: Camera preview, overlay composition, capture logic

## Error Handling

**Strategy:** Defensive programming with graceful degradation

**Patterns:**
- Stubs for unimplemented features (face detection, frame processors)
- Try/catch around native module calls
- Default values for missing config
- Simulation mode for testing without hardware

## Cross-Cutting Concerns

**Logging:** Console-based via ConsoleTelemetryProvider

**Validation:** TypeScript strict mode, runtime checks in pure functions

**Authentication:** Not applicable (local-only app)

**Telemetry:** Opt-out tracking of session events, shot captures, settings changes via TelemetryTracker

**Testing:** Jest with React Native Testing Library, comprehensive mocks for all native modules in `__mocks__/`

---

*Architecture analysis: 2026-04-28*
