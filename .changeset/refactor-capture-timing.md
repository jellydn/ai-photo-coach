---
"AIPhotoCoach": patch
---

refactor(capture): absorb countdown timing into a deep timer module

Move the countdown `setInterval` lifecycle out of the capture state
machine hook into a focused `countdownTimer` module with start/stop/
isRunning semantics and clamped durations.
