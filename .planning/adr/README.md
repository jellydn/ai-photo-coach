# Architecture Decision Records

Architecture decisions for AIPhotoCoach are recorded as short, self-contained
ADRs so the rationale behind structural choices outlives the people who made
them.

## Statuses

- **Proposed** — under discussion, not yet committed to
- **Accepted** — the decision has been made and implemented
- **Deprecated** — no longer the active approach
- **Superseded by [ADR-N]** — replaced by a newer decision

## Index

| ADR | Title | Status | Date |
| --- | ----- | ------ | ---- |
| [0001](0001-frame-signals-scoring-intake.md) | Bundle frame signals behind a typed scoring intake | Accepted | 2026-08-03 |
| [0002](0002-shot-analysis-seam.md) | Collapse shot analysis behind one deep module | Accepted | 2026-08-03 |
| [0003](0003-storage-wiring-point.md) | Centralize storage adapter selection behind a wiring point | Accepted | 2026-08-03 |
| [0004](0004-photo-review-extraction.md) | Extract the post-capture lifecycle into a deep hook | Accepted | 2026-08-03 |
| [0005](0005-camera-settings-hook.md) | Extract persisted camera settings into a focused hook | Accepted | 2026-08-01 |
| [0006](0006-capture-timing-module.md) | Absorb countdown timing into a deep timer module | Accepted | 2026-08-01 |
| [0007](0007-frame-pipeline-worklet.md) | Extract a shared worklet frame pipeline | Accepted | 2026-08-01 |
| [0008](0008-encrypted-storage-adapter.md) | Add a real encrypted adapter behind the PhotoStorage seam | Superseded by [ADR-0003](0003-storage-wiring-point.md) | 2026-08-01 |
| [0009](0009-telemetry-interface-shrink.md) | Shrink the telemetry tracker interface | Accepted | 2026-08-01 |

Records 0001–0004 cover the deepen refactors (merged 2026-08-03); records
0005–0009 retrospectively cover the earlier refactors they build on (merged
2026-08-01).

## Creating a new ADR

Copy `adr-template.md`, give it the next number, fill in the sections, and
add a row to the index above.
