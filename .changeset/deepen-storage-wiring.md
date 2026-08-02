---
"AIPhotoCoach": patch
---

refactor(storage): centralize adapter selection behind a wiring point

`LocalPhotoStorage` and `EncryptedLocalPhotoStorage` each leaked a module-level
singleton (`photoStorage` / `encryptedPhotoStorage`) that app code imported
directly from the concrete adapter. Selection now happens once in
`src/storage/storageWiring.ts`; consumers import `photoStorage` from the
storage barrel and see only the `PhotoStorage` interface, so switching
persistence (e.g. to the encrypted adapter) is a one-line change with no call
site churn.
