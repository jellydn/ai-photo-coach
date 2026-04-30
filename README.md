# AI Photo Coach

Real-time visual guide camera app that helps everyday users take better photos. Built with React Native + VisionCamera v5.

> Turn every smartphone camera into a real-time personal photographer coach.

## What It Does

AI Photo Coach overlays live composition guides and short coaching prompts on the camera preview, then auto-captures when framing, lighting, and stability are good.

- **Live composition overlay** — rule of thirds, horizon level, center marker, headroom guide
- **Smart coaching prompts** — short, plain-language tips ("Step back", "Hold steady", "Face the light")
- **Mode presets** — Portrait, Travel, Food, Group, Product, Document, Pet/Kids, Night
- **Live readiness score (0–100)** — hybrid rules + ML, shown _before_ you press shutter
- **Auto Best Shot** — 3-2-1 countdown when score ≥ 80 and device is steady
- **Before / After preview** — annotated post-capture screen so users learn over time

MVP modes: **Portrait** and **Travel**.

## Status

✅ **MVP Complete.** All 16 user stories implemented (US-001 through US-016).

## Tech Stack

- React Native 0.85.2 (TypeScript)
- [VisionCamera v5](https://github.com/mrousavy/react-native-vision-camera) — Nitro Modules backend
- `react-native-worklets-core` — frame processors
- MLKit Face Detection via `react-native-vision-camera-face-detector`
- Reanimated, MMKV, Zustand
- `@react-native-camera-roll/camera-roll` — photo storage

## Project Structure

```
src/
├── screens/              # CameraScreen, SettingsScreen, etc.
├── components/           # CompositionOverlay, HorizonIndicator, FaceOverlay
├── config/               # modes.ts (per-mode thresholds), modeMetadata.ts
├── sensors/              # useHorizonLevel, useStability
├── faceDetection/        # MLKit integration
├── lighting/             # Lighting analysis
├── coaching/             # Prompt generation, PromptPill
├── scoring/              # computeScore, ScoreRing
├── autoCapture/          # Auto-capture with countdown
├── storage/              # PhotoStorage, LocalPhotoStorage
└── telemetry/            # TelemetryTracker, ConsoleTelemetryProvider

__mocks__/                # Jest mocks for native modules
__tests__/                # 390+ unit tests
scripts/ralph/            # Autonomous agent workflow config
```

## Getting Started

```bash
# install
yarn install
cd ios && pod install && cd ..

# run
yarn ios        # iOS 15+
yarn android    # Android 8+ (API 26+)

# test
yarn typecheck
yarn lint
yarn test
```

## Platforms

- iOS 15+
- Android 8+ (API 26+)

## Security

See [SECURITY.md](./SECURITY.md) for telemetry and storage security model.

## License

TBD
