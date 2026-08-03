# 0010. Smoke test — temporary ADR for the adr-index CI guard

Date: 2026-08-03

## Status

Proposed (do not merge)

## Context

Throwaway record proving the `adr-index` CI job fails when a new ADR is
added without regenerating `website/index.html`.

## Decision

Add this record and deliberately do NOT run `yarn adr:index`, so the
committed index is stale and CI must catch it.

## Consequences

### Positive

- Proves the CI guard catches stale indexes before merge.

### Negative

- This record is temporary and must be deleted after the smoke test.
