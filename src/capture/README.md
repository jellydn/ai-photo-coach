# Capture Module

## Overview

The capture module provides a finite state machine (FSM) for managing the photo capture lifecycle. It addresses the CONCERNS.md issue: "Capture and burst lifecycle" being fragile due to state split across multiple components.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Capture Lifecycle                     │
├─────────────────────────────────────────────────────────┤
│                                                          │
│   ┌─────┐    START_*    ┌───────────┐   CONDITIONS_MET │
│   │idle │──────────────▶│ preparing │──────────────────▶ │
│   └─────┘               └───────────┘                  │
│     ▲                       │   CONDITIONS_BROKEN        │
│     │ RESET                 ▼                            │
│     │                   ┌───────────┐   COUNTDOWN_TICK   │
│     │                   │countdown │◀──────────────────   │
│     │                   └───────────┘                  │
│     │                       │   COUNTDOWN_COMPLETE       │
│     │                       ▼                            │
│     │                   ┌───────────┐   CAPTURE_COMPLETE   │
│     │                   │capturing│──────────────────▶   │
│     │                   └───────────┘                  │
│     │                       │   ERROR                    │
│     │                       ▼                            │
│     │                   ┌───────────┐   PROCESSING_COMPLETE│
│     │                   │processing │──────────────────▶ │
│     │                   └───────────┘                  │
│     │                       │   BURST_NEXT (burst mode)  │
│     │                       └─────────────────────┐      │
│     │                                             │      │
│     │    CANCEL    ┌──────────┐   BURST_COMPLETE│      │
│     │◀─────────────│cancelled │◀─────────────────┘      │
│     │              └──────────┘                        │
│     │                                                  │
│     └──────────────────────────────────────────────────┘
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## Components

### 1. CaptureStateMachine (Pure FSM)

**File:** `CaptureStateMachine.ts`

A pure, testable finite state machine with no side effects.

#### States

| State | Description |
|-------|-------------|
| `idle` | Ready to capture, no activity |
| `preparing` | Conditions being checked before countdown |
| `countdown` | 3-2-1 countdown in progress |
| `capturing` | Actually taking photo(s) |
| `processing` | Photo captured, being saved/processed |
| `completed` | Capture complete, ready for next |
| `cancelled` | Capture cancelled by user or conditions |
| `error` | Capture failed with error |

#### Events

| Event | Description |
|-------|-------------|
| `START_MANUAL` | Begin manual capture (single/burst/auto) |
| `START_AUTO` | Begin auto-capture when conditions met |
| `CONDITIONS_MET` | Score ≥ threshold AND stable |
| `CONDITIONS_BROKEN` | Score dropped or stability lost |
| `COUNTDOWN_TICK` | Countdown value update |
| `COUNTDOWN_COMPLETE` | Countdown reached 0 |
| `CAPTURE_START` | Photo capture initiated |
| `CAPTURE_COMPLETE` | Photo captured successfully |
| `PROCESSING_COMPLETE` | Photo saved/processed |
| `BURST_NEXT` | Move to next burst shot |
| `BURST_COMPLETE` | All burst shots done |
| `CANCEL` | User cancelled capture |
| `ERROR` | Capture failed |
| `RESET` | Return to idle state |

#### Usage

```typescript
import {
  getInitialContext,
  transition,
  isCaptureActive,
  type CaptureContext,
} from "./CaptureStateMachine";

// Get initial state
let context = getInitialContext(); // { state: "idle", ... }

// Dispatch events
context = transition(context, { type: "START_MANUAL", mode: "single" });
context = transition(context, { type: "CAPTURE_START" });
context = transition(context, { type: "CAPTURE_COMPLETE" });

// Check state
if (isCaptureActive(context)) {
  console.log("Capture in progress...");
}
```

### 2. useCaptureStateMachine (React Hook)

**File:** `useCaptureStateMachine.ts`

React hook that integrates the FSM with component state management.

#### Props

```typescript
interface UseCaptureStateMachineProps {
  autoCaptureEnabled?: boolean;    // Enable auto-capture
  score?: number;                   // Current shot score
  isStable?: boolean;               // Camera stability
  autoCaptureThreshold?: number;    // Score threshold (default: 80)
  burstMode?: boolean;              // Enable burst mode
  burstShotCount?: number;          // Shots per burst (default: 3)
  onCaptureStart?: (ctx) => void;   // Callback when capture starts
  onCaptureComplete?: (ctx) => void; // Callback when capture completes
  onBurstShot?: (index, total) => void; // Callback for each burst shot
}
```

#### Return Value

```typescript
interface UseCaptureStateMachineResult {
  context: CaptureContext;          // Full FSM state
  isCapturing: boolean;             // Quick check for active capture
  countdownValue: number | null;    // Current countdown
  burstProgress: { current: number; total: number } | null;
  
  // Actions
  startManualCapture: (mode?, burstTotal?) => void;
  startAutoCapture: (burstTotal?) => void;
  cancelCapture: () => void;
  markCaptureStarted: () => void;
  markCaptureComplete: () => void;
  markProcessingComplete: () => void;
  nextBurstShot: () => void;
  completeBurst: () => void;
  reset: () => void;
}
```

#### Usage Example

```typescript
function CameraScreen() {
  const {
    context,
    isCapturing,
    countdownValue,
    burstProgress,
    startManualCapture,
    startAutoCapture,
    cancelCapture,
    markCaptureComplete,
  } = useCaptureStateMachine({
    autoCaptureEnabled: settings.autoCapture,
    score: currentScore,
    isStable: stability < 0.02,
    burstMode: selectedMode === "burst",
    burstShotCount: 3,
    onCaptureStart: (ctx) => {
      console.log("Starting capture...");
      takePhoto();
    },
    onCaptureComplete: (ctx) => {
      navigateToReview();
    },
  });

  return (
    <View>
      {isCapturing && <CaptureIndicator />}
      {countdownValue !== null && (
        <Countdown value={countdownValue} />
      )}
      {burstProgress && (
        <BurstIndicator
          current={burstProgress.current}
          total={burstProgress.total}
        />
      )}
      <ShutterButton
        onPress={() => startManualCapture("single")}
        disabled={isCapturing}
      />
    </View>
  );
}
```

## Migration from useAutoCapture

### Before (useAutoCapture):

```typescript
const {
  state,
  countdownValue,
  currentBurstIndex,
  startCountdown,
  cancelCountdown,
  capturePhoto,
} = useAutoCapture({
  enabled: autoCaptureEnabled,
  score,
  isStable,
  autoCaptureThreshold: 80,
  burstMode: mode === "burst",
  burstShotCount: 3,
});

// Manual capture
const handleShutter = () => {
  capturePhoto(0); // Fragile: hardcoded index
};
```

### After (useCaptureStateMachine):

```typescript
const {
  context,
  isCapturing,
  countdownValue,
  burstProgress,
  startManualCapture,
  cancelCapture,
  markCaptureComplete,
} = useCaptureStateMachine({
  autoCaptureEnabled,
  score,
  isStable,
  autoCaptureThreshold: 80,
  burstMode: mode === "burst",
  burstShotCount: 3,
  onCaptureStart: (ctx) => {
    takePhoto();
  },
});

// Manual capture
const handleShutter = () => {
  startManualCapture(mode === "burst" ? "burst" : "single");
};
```

## Benefits

1. **Explicit State Model**: All states and transitions are clearly defined
2. **Testable**: Pure FSM functions are fully unit testable
3. **Type Safe**: TypeScript ensures valid state transitions
4. **Predictable**: No hidden state or race conditions
5. **Debuggable**: Current state always available in `context.state`
6. **Extensible**: Easy to add new states or transitions

## Testing

### FSM Tests

```typescript
import { transition, getInitialContext } from "./CaptureStateMachine";

test("single shot lifecycle", () => {
  let ctx = getInitialContext();
  ctx = transition(ctx, { type: "START_MANUAL", mode: "single" });
  expect(ctx.state).toBe("preparing");
  
  ctx = transition(ctx, { type: "CAPTURE_START" });
  expect(ctx.state).toBe("capturing");
  
  ctx = transition(ctx, { type: "CAPTURE_COMPLETE" });
  expect(ctx.state).toBe("processing");
});
```

### Hook Tests

```typescript
import { renderHook, act } from "@testing-library/react-native";
import { useCaptureStateMachine } from "./useCaptureStateMachine";

test("manual capture", () => {
  const { result } = renderHook(() => useCaptureStateMachine());
  
  act(() => {
    result.current.startManualCapture("single");
  });
  
  expect(result.current.context.state).toBe("preparing");
  expect(result.current.isCapturing).toBe(true);
});
```

## Future Enhancements

1. **Countdown Integration**: Add automatic countdown tick handling to the hook
2. **Retry Logic**: Add `RETRY` event for failed captures
3. **Batch Operations**: Support for batch capture with different settings
4. **Analytics**: Automatic telemetry events on state transitions
5. **Persistence**: Save/restore capture state on app backgrounding

## Related Files

- `CaptureStateMachine.ts` - Pure FSM logic
- `useCaptureStateMachine.ts` - React hook
- `__tests__/CaptureStateMachine.test.ts` - FSM tests (32 tests)
- `__tests__/useCaptureStateMachine.test.ts` - Hook tests (23 tests)
