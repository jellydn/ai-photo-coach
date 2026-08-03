# Technology Stack

**Analysis Date:** 2026-08-03

## Languages

**Primary:**
- TypeScript ^5.8.3 - All application code (`src/`, `App.tsx`, `__tests__/`, `__mocks__/`)

**Secondary:**
- JavaScript - Build/runtime config (`jest.config.js`, `babel.config.js`, `metro.config.js`, `eslint.config.js`, `index.js`)
- HTML/CSS/JS - Static landing page under `website/`
- Node ESM (`.mjs`) - Dependency-free tooling under `scripts/` (`generate-adr-index.mjs`, `serve-pages.mjs`, `diff-pages.mjs`, `generate-icons.mjs`); no runtime deps beyond Node 22+

## Runtime

**Environment:**
- React Native 0.85.2 (new architecture) with React 19.2.3
- Node >= 22.11.0 (declared in `package.json` `engines`)

**Package Manager:**
- Yarn (CI uses `yarn install --frozen-lockfile`; `cache: yarn`)
- Lockfile: `yarn.lock` (present)

## Frameworks

**Core:**
- React Native 0.85.2 - Mobile app shell (`android/`, `ios/`)
- React 19.2.3 - UI

**Testing:**
- Jest ^29.6.3 with `@react-native/jest-preset` - Unit + integration tests
- @testing-library/react-native ^13.3.3 - Hook/component rendering

**Build/Dev:**
- Metro (default config via `@react-native/metro-config`) - JS bundler
- Babel (`module:@react-native/babel-preset`) - Transpilation
- ESLint 9.39.5 (flat config, `@react-native/eslint-config/flat`) - Linting
- Prettier 3.9.6 - Formatting

## Key Dependencies

**Critical:**
- `react-native-vision-camera` 5.2.1 - Camera capture + frame processing
- `react-native-vision-camera-face-detector` 2.0.0-0 - Face detection frames
- `react-native-mmkv` ^4.3.1 - Fast synchronous key-value persistence (settings, install ID)
- `@react-native-camera-roll/camera-roll` ^7.10.2 - Saving photos to the device gallery
- `react-native-sensors` ^7.3.6 - Gyroscope/accelerometer for horizon, pitch, stability
- `react-native-keychain` ^10.0.0 - Secure key storage for encrypted MMKV
- `react-native-reanimated` ^4.3.0 + `react-native-worklets` ^0.8.1 - Worklet frame pipelines

**Infrastructure:**
- `@shopify/react-native-skia` ^2.6.2 - Overlay rendering (composition, score ring)
- `react-native-vision-camera-skia` ^5.0.8 - Skia frame output
- `react-native-nitro-image` ^0.15.0 + `react-native-nitro-modules` - Image processing
- `react-native-safe-area-context` ^5.5.2, `react-native-permissions` ^5.5.1, `react-native-gesture-handler` ^2.31.1
- `@react-native-async-storage/async-storage` ^3.0.2 - Onboarding state
- `react-native-get-random-values` ^1.11.0 - UUID generation

## Scripts

**Package (`package.json`):**
- `adr:index` - regenerate the ADR grid in `website/index.html` from `.planning/adr/*.md`
- `diff:pages` - unified diff of local `website/` vs the live GitHub Pages site (via the `serve-pages` proxy)
- Standard: `start`, `test`, `typecheck`, `lint`, `ios`, `android`

## Configuration

**Environment:**
- No `.env` files; feature flags live in code (e.g. `USE_ENCRYPTED_PHOTO_STORAGE` in `src/storage/storageWiring.ts`)
- `app.json` - App name/display name (`AIPhotoCoach`)

**Build:**
- `tsconfig.json` extends `@react-native/typescript-config` (`types: ["jest"]`, includes all `**/*.ts(x)`, excludes `node_modules`, `Pods`, `__mocks__`)
- `jest.config.js` - preset + `moduleNameMapper` for native module mocks
- `eslint.config.js` - ignores `.js/.jsx` (Flow-preset incompatibility), `scripts/**`, native dirs

## Platform Requirements

**Development:**
- macOS with Xcode (iOS) and/or Android Studio (Android); Node 22+; Yarn
- CocoaPods (`Gemfile` + `Gemfile.lock`) for iOS native deps

**Production:**
- iOS/Android app binaries; static marketing site deployed to GitHub Pages from `website/`

---

*Stack analysis: 2026-08-03*
