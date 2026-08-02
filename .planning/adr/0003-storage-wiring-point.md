# 0003. Centralize storage adapter selection behind a wiring point

Date: 2026-08-03

## Status

Accepted

## Context

`LocalPhotoStorage` and `EncryptedLocalPhotoStorage` each leaked a
module-level singleton (`photoStorage` / `encryptedPhotoStorage`) that app
code imported directly from the concrete adapter. Consumers were coupled to
an implementation rather than the `PhotoStorage` interface, and switching
persistence (e.g. to the encrypted adapter) meant touching every import
site.

## Decision

Adapter selection happens once, in `src/storage/storageWiring.ts`:

- a `USE_ENCRYPTED_PHOTO_STORAGE` flag selects between
  `new LocalPhotoStorage()` and `new EncryptedLocalPhotoStorage()`;
- the result is exported as `photoStorage` typed as `PhotoStorage`.

The leaked singletons were removed from the concrete adapters. The storage
barrel (`src/storage/index.ts`) re-exports `photoStorage` from the wiring
point alongside the `PhotoStorage` interface and the adapters. Consumers
import `photoStorage` from the barrel and see only the interface; tests were
updated to import from the wiring point.

## Consequences

### 📋 Positive

- Switching persistence is a one-line change with zero call-site churn.
- Consumers depend on the `PhotoStorage` interface, so adapters stay
  swappable and testable.
- One obvious place to answer "which storage am I using?".

### 📋 Negative

- Selection still runs at module load — flipping the flag needs a rebuild or
  reload, not a runtime swap.
- The wiring point imports both adapters, so both ship in the bundle even
  when only one is selected.
