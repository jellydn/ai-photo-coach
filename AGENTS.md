# AGENTS.md – AI Photo Coach

## Project Status

✅ **In Progress.** US-001 through US-013 completed (fixed permission check and VisionCamera v5 API integration). Currently working on US-014+ (post-capture preview enhancements, travel mode edge detection, telemetry integration).

## Architecture

- **Stack**: React Native (TypeScript) + VisionCamera v5 + react-native-worklets-core
- **Overlays**: Skia (react-native-vision-camera-skia) preferred, SVG fallback
- **State**: Zustand or React Context for settings; Reanimated shared values for high-frequency UI updates from worklet thread
- **Storage**: MMKV for settings/metadata; camera roll for photos
- **ML**: MLKit Face Detection (cross-platform); optional TFLite aesthetic model (~3–5 MB)

## Ralph Agent Workflow

This repo uses the Ralph autonomous agent system in `scripts/ralph/`.

**Key files**:

- `prd.json` – Machine-readable PRD with all user stories
- `progress.txt` – Append-only log with `## Codebase Patterns` section at top
- `prompt-opencode.md` – Agent instructions

**Workflow**:

1. Read `prd.json` and `progress.txt` (Codebase Patterns section first)
2. Work on **ONE** story with `passes: false` per iteration
3. Quality checks **must pass** before commit (typecheck, lint, test)
4. Commit message: `feat: [Story ID] - [Story Title]`
5. Update PRD: set `passes: true` for completed story
6. Append to `progress.txt` with Learnings section

## Development Commands

```bash
yarn install
cd ios && pod install && cd ..
yarn ios        # iOS 15+
yarn android    # Android 8+ (API 26+)

yarn typecheck  # Required to pass for every US
yarn lint
yarn test
```

## Constraints & Gotchas

- **Frame processor budget**: Target 33ms/frame on mid-range (Pixel 6a / iPhone 12). Heavy ML downsampled to ≤ 320px on long edge.
- **Performance targets**: ≥ 30 FPS preview, ≥ 20 FPS frame processing.
- **Verification requirement**: Every user story must be "verified on device" – not just simulator.
- **Pure functions**: All scoring logic must be unit-testable pure functions (FR-14).
- **Prompt rules**: Max ONE prompt visible at a time, ≤ 5 words, debounced 500ms (US-007).
- **Auto-capture**: Only when score ≥ 80 AND isStable (US-010).

### VisionCamera v5 API Changes

VisionCamera v5 uses a completely different photo capture API from v4:

```typescript
// v5: Use usePhotoOutput hook + outputs prop
import { usePhotoOutput } from 'react-native-vision-camera';

const photoOutput = usePhotoOutput();

// Pass outputs array to Camera component
<Camera device={device} isActive={true} outputs={[photoOutput]} />;

// Capture photo using the output (not camera ref)
const photoFile = await photoOutput.capturePhotoToFile(
  { flashMode: 'off' },
  {}, // callbacks
);
// photoFile.filePath contains the saved photo path
```

**Key differences from v4:**

- No `ref` or `takePhoto()` method on Camera
- Must use `outputs={[photoOutput]}` prop
- `capturePhotoToFile()` returns `{ filePath: string }` (not `path`)
- Requires `usePhotoOutput()` hook from 'react-native-vision-camera'

## Project Structure

```
.
├── tasks/prd-ai-photo-coach.md   # Full PRD with 15 user stories
├── scripts/ralph/                # Ralph agent config
│   ├── prd.json                  # Machine-readable stories (needs conversion)
│   ├── prompt-opencode.md        # Agent instructions
│   └── progress.txt              # Iteration log with codebase patterns
└── AGENTS.md                     # This file
```

## Mode-Specific Behavior

Per-mode thresholds live in single config module (FR-13):

| Mode     | Face Framing            | Horizon | Stability Threshold |
| -------- | ----------------------- | ------- | ------------------- |
| Portrait | ON                      | ON      | Strict              |
| Travel   | OFF                     | ON      | Loose               |
| Others   | Stub only (Coming soon) |         |                     |

## Testing Approach

- **Unit tests**: Scoring + prompt selection (pure functions)
- **Device testing**: Required for all camera/sensor features
- **No cloud**: All photos local in MVP (FR-11, FR-15)

## Success Metrics (Post-MVP)

- 70% users retake fewer photos
- 40% save on first attempt
- Average session > 2 minutes
- ≥ 30 FPS on target devices
- App size ≤ 60 MB
