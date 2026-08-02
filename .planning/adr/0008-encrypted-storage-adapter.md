# 0008. Add a real encrypted adapter behind the PhotoStorage seam

Date: 2026-08-01

## Status

Superseded by ADR-0003

## Context

`LocalPhotoStorage` had one adapter's worth of plain methods plus a full
parallel set of `*Encrypted` twin methods — with zero consumers. That leaked
the encryption concern across the seam and forced callers to reach into one
class for two behaviors (issue #25). A seam with one adapter is
hypothetical; with two real adapters it earns its keep.

## Decision

Turn the encryption concern into a real second adapter behind the
`PhotoStorage` interface: `EncryptedLocalPhotoStorage` becomes a genuine
`PhotoStorage` implementation (`src/storage/EncryptedLocalPhotoStorage.ts`),
the dead `*Encrypted` twin methods are removed from `LocalPhotoStorage`, and
shared index primitives move to `src/storage/photoIndex.ts` to prevent
drift.

## Consequences

### 📋 Positive

- The seam now has two real adapters, proving the interface shape.
- Encryption is isolated in one adapter instead of leaking across the class.
- Shared index primitives prevent the two adapters from drifting.

### 📋 Negative

- Both adapters still exposed module-level singletons that app code imported
  directly from the concrete classes — the selection problem later addressed
  by ADR-0003, which supersedes this record.
- The encrypted adapter remained unselected (`USE_ENCRYPTED_PHOTO_STORAGE`
  defaults to local storage).
