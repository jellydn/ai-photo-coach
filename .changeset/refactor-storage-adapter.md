---
"AIPhotoCoach": patch
---

refactor(storage): add a real encrypted adapter behind the PhotoStorage seam

Move the unused `*Encrypted` twin methods out of the plain photo storage
class into a genuine `EncryptedLocalPhotoStorage` adapter implementing
`PhotoStorage`, with shared index primitives extracted to prevent drift.
