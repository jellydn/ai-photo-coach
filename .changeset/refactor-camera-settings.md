---
"AIPhotoCoach": patch
---

refactor(camera): extract persisted settings into useCameraSettings

Pull auto-capture, haptic, and score-visibility state plus the settings
subscriptions out of the CameraScreen orchestrator into a focused hook
with its own tests.
