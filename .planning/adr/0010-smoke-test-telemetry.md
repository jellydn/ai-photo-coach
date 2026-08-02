# 0010. Smoke test: telemetry seam touch with ADR

Date: 2026-08-03

## Status

Accepted

## Context

A throwaway record used to prove the CI `adr-check` guard passes when a
recorded seam (`src/telemetry/`) is changed together with a numbered ADR.

## Decision

Add this ADR alongside a docblock-only change to `src/telemetry/index.ts` so
the guard sees both a seam change and a new `.planning/adr/[0-9]+-*.md`.

## Consequences

### 📋 Positive

- Confirms the pass path of the `adr-check` CI job.

### 📋 Negative

- Purely a smoke-test artifact; do not merge this PR.
