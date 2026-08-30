# 0012. Sequence captures from persisted-shot acknowledgements

Date: 2026-08-30

## Status

Accepted

## Context

The production camera used `useAutoCapture` and `usePhotoCapture`, while a
separate capture FSM and countdown timer existed only in tests. The live burst
sequence advanced every 200 ms regardless of whether VisionCamera capture and
photo storage had completed. Single auto-capture never told the countdown
owner that persistence had finished, leaving it in `capturing`.

The duplicate FSM did not protect production and made the documented capture
architecture misleading. ADR-0006 recorded a timer abstraction used only by
that dead path.

## Decision

Keep one production capture lifecycle. `useAutoCapture` owns countdown and
burst position; `usePhotoCapture` acknowledges each shot only after both
`capturePhotoToFile` and `PhotoStorage.save` succeed. The next burst shot is
scheduled from that acknowledgement, and failures reset the sequence without
advancing it. Delete the unused FSM, timer, documentation, and test-only tests.

This decision supersedes ADR-0006.

## Consequences

### 📋 Positive

- Physical captures cannot overlap merely because a fixed burst timer fired.
- Single and burst sequences recover to idle after success or failure.
- Tests now exercise the lifecycle used by `CameraScreen` rather than a second
  implementation with no production caller.

### 📋 Negative

- Burst cadence is measured after persistence, so slow storage lengthens the
  interval between shots.
- Capture state remains split across two focused hooks and requires an explicit
  acknowledgement contract between them.
