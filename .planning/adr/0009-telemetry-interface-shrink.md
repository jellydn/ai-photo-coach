# 0009. Shrink the telemetry tracker interface

Date: 2026-08-01

## Status

Accepted

## Context

The 361-line telemetry index mixed concerns: anonymous install-ID
generation, telemetry opt-out logic, and the tracker exports. The opt-out
key had more than one owner, and dead `*Encrypted` twin exports lingered in
the module.

## Decision

Split `src/telemetry/`: the anonymous install ID moves to its own module
(`src/telemetry/installId.ts`), telemetry opt-out delegates to the settings
store so the key has a single owner, and the dead encrypted twin exports are
removed.

## Consequences

### 📋 Positive

- The telemetry index is smaller and focused on the tracker itself.
- The opt-out key has a single owner (the settings store).
- Dead exports are gone; the surface area is smaller.

### 📋 Negative

- More modules to navigate for a small concern.
- Install-ID generation is now its own file, adding a hop when tracing it.
