# 0006. Absorb countdown timing into a deep timer module

Date: 2026-08-01

## Status

Superseded by [ADR-0012]

## Context

The capture countdown `setInterval` lifecycle lived inside the capture state
machine hook, mixing timing concerns with FSM transitions. Interval
management (start, stop, cleanup, clamped durations) was scattered and easy
to get wrong.

## Decision

Move the countdown timing into a focused deep module,
`src/capture/countdownTimer.ts`, with explicit start/stop/isRunning
semantics and clamped durations. The capture FSM delegates timing to it
instead of managing intervals directly.

## Consequences

### 📋 Positive

- Timer lifecycle is centralized, with clear start/stop/isRunning semantics.
- Durations are clamped, preventing invalid or extreme values.
- The FSM hook is slimmer and the timer is testable in isolation.

### 📋 Negative

- An extra indirection layer between the FSM and the interval.
- Timer state must be kept in sync with FSM transitions.
