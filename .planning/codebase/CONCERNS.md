# Codebase Concerns

**Analysis Date:** 2026-08-30
**Code Baseline:** `origin/main` at `c38ed05`, plus the validated fixes described in ADR-0012

## Acknowledged Product Gaps

**Product analysis is a stability-based MVP heuristic:**
- `src/camera/useProductCentering.ts` cannot observe product position or background clutter; it derives fixed centroids from stability and variance from lighting class.
- Product prompts and centering scores can therefore be confidently wrong. This limitation is already documented in `AGENTS.md`.
- Replace it with subject segmentation/detection and measured background statistics before presenting it as scene analysis.

**No genuine aesthetic ML inference:**
- `src/scoring/` exposes an `MLModelOutput` seam, but production passes no model output, so the aesthetic subscore defaults to zero.
- This is an explicit missing integration, not a broken model invocation. A model asset and supported TFLite binding are required.

## Security and Persistence Posture

**Metadata is unencrypted by default:**
- Capture metadata, preferences, and the anonymous telemetry install ID use ordinary MMKV by default. `SECURITY.md` documents this design and its device/backup threat model.
- A keychain-backed encrypted photo-metadata adapter exists but `USE_ENCRYPTED_PHOTO_STORAGE` remains `false`; settings and install ID are outside that adapter.
- The install ID is correlation data, not an authentication or authorization token. Its `Math.random()` generation is an identifier-quality concern rather than a credential vulnerability.
- Enable encrypted persistence only with a migration/key-loss design, and continue avoiding claims that all local data is encrypted.

**Capture persistence is not transactional:**
- Saving crosses a camera temporary file, Camera Roll copy, metadata record, and complete index rewrite without rollback.
- A failure after the Camera Roll write can orphan an asset or metadata record. Deletion now preserves metadata when physical deletion fails, so the user can retry.
- Define idempotent rollback/reconciliation semantics and inject failures after every persistence step before tightening this boundary.

**No storage reconciliation or encryption migration:**
- There is no scan to repair index/record/Camera Roll divergence and no migration between the plain and encrypted adapters.
- A corrupt index can make individually stored records unreachable through list/count.

## Performance and Native Validation Risks

**Frame cadence and backpressure are not enforced:**
- Lighting and edge analyzers now sample to an approximately 320-pixel long edge instead of scanning an unbounded full-resolution grid.
- `TARGET_EDGE_DETECTION_FPS` remains informational, and compatible RGB analyses still use independent outputs and bridge results to React state for every delivered frame.
- Benchmark on target devices, then add explicit throttling/frame dropping and consider sharing compact RGB analysis results.

**VisionCamera/worklet behavior is device-dependent:**
- Jest verifies control flow and exactly-once disposal intent, but not RGB/YUV layout, stride/orientation, buffer lifetime, closure serialization, coordinate transforms, detector lifetime, preview FPS, or thermal behavior.
- Lighting, edge, document, and face behavior must be validated on supported physical iOS and Android devices before those camera-processing paths are declared complete.

**Pre-release face detector is a high-risk native dependency:**
- `react-native-vision-camera-face-detector` is pinned to `2.0.0-0` alongside VisionCamera 5.2.1 and Nitro/worklet dependencies.
- Upgrade this stack only as a device-tested compatibility unit with a feature-disable fallback. Jest mocks cannot detect ABI failures.

## Maintainability and Scaling

**Large orchestration/UI modules:**
- `src/screens/CameraScreen.tsx`, `src/screens/PostCaptureScreen.tsx`, and `src/scoring/algorithms.ts` remain large, high-change files with behavior spread across hook/ref/effect boundaries.
- Keep scoring calculations pure and add integration assertions at the actual camera seams when changing orchestration.

**Photo index writes are O(n):**
- Records are individually keyed, but every save/delete parses, copies, and serializes the complete ID index.
- Use chunked indexes or a transactional database and add index reconstruction if photo histories grow substantially.

**Fixed 10 Hz scoring is intentional but should be measured:**
- `src/scoring/useScoring.ts` recomputes on a 100 ms cadence even when inputs are unchanged. This is the hook's current bounded-update contract, not a demonstrated bottleneck.
- Optimize only after profiling shows meaningful React/CPU cost; equality checks or debounced signal updates are possible follow-ups.

## Remaining Test Gaps

**Native capture and frame integration:**
- New hook tests cover persisted-shot acknowledgement, failed persistence reset, overlap prevention, document edge wiring, mutex recovery, and deletion failure retention.
- They still do not execute VisionCamera capture, Camera Roll permissions, burst ordering, worklets, pixel buffers, or frame budgets on hardware.

**Storage recovery:**
- Corrupt-index reconstruction, partial-save rollback, and plain-to-encrypted migration remain unimplemented and untested.

**Test warning noise:**
- Some existing component/integration suites emit React `act` warnings around countdown animations and async camera effects.
- The suites pass, but warning volume can obscure new lifecycle warnings; clean these tests when those components are next changed.

## Resolved in This Audit

- Removed the unused capture FSM/timer implementation and made successful persistence acknowledge single/burst progression (ADR-0012).
- Enabled edge frame analysis for Document mode and stopped scoring unavailable skew analysis as perfect.
- Kept the index mutex usable after a rejected operation.
- Preserved metadata and review state when Camera Roll deletion fails.
- Bounded lighting and edge pixel sampling to an approximately 320-pixel long edge.
- Removed unused Skia and VisionCamera Skia/worklets direct dependencies and refreshed the iOS pod lock.
- Removed the inaccurate hard-coded-dimension concern: dimensions are passed to the Camera Roll adapter but are not persisted in `PhotoMetadata` or consumed by display/cropping logic.

---

*Concerns audit: 2026-08-30; source inspection, passing typecheck/lint/dead-export checks, and 31 suites/604 Jest tests. Native/on-device behavior was not verifiable in the orb.*
