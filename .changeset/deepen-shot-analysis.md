---
"AIPhotoCoach": patch
---

refactor(analysis): collapse the shot-analysis cluster behind one seam

CameraScreen (841 lines) wired 15+ analysis hooks and hand-assembled ~20
scalars for scoring. A new `useShotAnalysis` deep module owns the sensor
subscriptions, frame analysis, and scoring intake, and exposes one narrow
result. The screen is now a thin orchestrator that wires camera concerns
only.
