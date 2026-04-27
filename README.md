# AI Photo Coach

Real-time visual guide camera app that helps everyday users take better photos. Built with React Native + VisionCamera v5.

> Turn every smartphone camera into a real-time personal photographer coach.

## What It Does

AI Photo Coach overlays live composition guides and short coaching prompts on the camera preview, then auto-captures when framing, lighting, and stability are good.

- **Live composition overlay** — rule of thirds, horizon level, center marker, headroom guide
- **Smart coaching prompts** — short, plain-language tips ("Step back", "Hold steady", "Face the light")
- **Mode presets** — Portrait, Travel, Food, Group, Product, Document, Pet/Kids, Night
- **Live readiness score (0–100)** — hybrid rules + ML, shown *before* you press shutter
- **Auto Best Shot** — 3-2-1 countdown when score ≥ 80 and device is steady
- **Before / After preview** — annotated post-capture screen so users learn over time

MVP modes: **Portrait** and **Travel**.

## Tech Stack

- React Native (TypeScript)
- [`react-native-vision-camera@^5`](https://github.com/mrousavy/react-native-vision-camera) — Nitro Modules backend
- `react-native-worklets-core` — frame processors
- MLKit Face Detection (cross-platform)
- `react-native-vision-camera-skia` — GPU overlays
- Reanimated, MMKV, Zustand
- TFLite (optional) — lightweight aesthetic scoring model

## Project Structure

```
.
├── README.md
├── tasks/
│   └── prd-ai-photo-coach.md   # Full PRD with 15 user stories
└── scripts/                     # Dev utilities
```

## Status

🚧 Pre-implementation. PRD authored; project scaffold pending.

See [tasks/prd-ai-photo-coach.md](./tasks/prd-ai-photo-coach.md) for full requirements, user stories, and the 4-week MVP milestone plan.

## Getting Started

> Setup instructions will be added once the React Native project is scaffolded (US-001).

Planned:

```bash
# install
yarn install
cd ios && pod install && cd ..

# run
yarn ios
yarn android

# test
yarn typecheck
yarn lint
yarn test
```

## Platforms

- iOS 15+
- Android 8+ (API 26+)

## Roadmap

**MVP (4 weeks)**
- Week 1 — Foundation, overlays, onboarding
- Week 2 — Face detection, lighting analysis, stability
- Week 3 — Coaching engine, live score, auto-capture
- Week 4 — Before/After, Travel mode, telemetry, polish

**Post-MVP**
- Voice coaching
- Pose suggestions and group auto-arrangement
- AI beauty/lighting simulation
- Product seller mode
- Travel landmark smart framing
- Cloud sync

## License

TBD
