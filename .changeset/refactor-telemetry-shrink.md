---
"AIPhotoCoach": patch
---

refactor(telemetry): shrink the tracker interface

Split the 361-line telemetry index: the anonymous install ID moves to its
own module, telemetry opt-out delegates to the settings store (single
owner of the key), and dead encrypted twin exports are removed.
