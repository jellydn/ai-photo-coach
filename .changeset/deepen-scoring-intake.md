---
"AIPhotoCoach": patch
---

refactor(scoring): shrink the scoring intake behind a FrameSignals bundle

`useScoring` took ~20 scalar props hand-assembled at the CameraScreen call
site — an interface nearly as wide as its implementation. It now takes one
typed `ScoreSignals` bundle plus non-signal configuration (model output,
weights, threshold), so missing-signal bugs concentrate in one seam instead
of the call site.
