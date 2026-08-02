---
"AIPhotoCoach": patch
---

refactor(screens): extract post-capture lifecycle into usePhotoReview

PostCaptureScreen previously mixed rendering with the save/discard lifecycle:
burst keep-all/keep-best logic, storage deletion, and busy-state tracking all
lived inline in the component. Those concerns now live in a deep
`usePhotoReview` hook behind the screen seam, so the screen only renders state
and forwards intent. Behavior is unchanged; the lifecycle gains dedicated hook
tests covering single and burst modes.
