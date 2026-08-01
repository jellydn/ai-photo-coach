---
"AIPhotoCoach": patch
---

refactor(frame): extract shared worklet frame pipeline

Extract the duplicated VisionCamera v5 worklet lifecycle (enabled guard,
pixel extraction, runOnJS bridge, frame dispose) into a shared
`useFramePipeline` hook consumed by the lighting and edge processors.
