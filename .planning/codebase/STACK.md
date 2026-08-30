# Technology Stack

**Analysis Date:** 2026-08-30

## Languages

**Primary:**
- TypeScript ^5.8.3 - React Native application, hooks, components, storage, and tests (`package.json`, `App.tsx`, `src/`, `__tests__/`)

**Secondary:**
- JavaScript - React Native entry point and Babel, Metro, Jest, ESLint, and Prettier configuration (`index.js`, `babel.config.js`, `metro.config.js`, `jest.config.js`, `eslint.config.js`, `.prettierrc.js`)
- Node.js ES modules - Repository tooling for ADR indexing, page comparison, icon generation, local page serving, and dead-export checks (`scripts/generate-adr-index.mjs`, `scripts/diff-pages.mjs`, `scripts/generate-icons.mjs`, `scripts/serve-pages.mjs`, `scripts/dead-export-check.mjs`)
- HTML, CSS, and browser JavaScript - Static project/architecture site (`website/index.html`, `website/style.css`, `website/script.js`)
- Kotlin/Java, Objective-C++, Swift, Ruby, and Gradle - React Native native shells and build configuration (`android/app/src/`, `android/build.gradle`, `android/app/build.gradle`, `ios/AIPhotoCoach/`, `ios/Podfile`, `Gemfile`)

## Runtime

**Environment:**
- Node.js >=22.11.0 for repository scripts and React Native tooling (`package.json`); GitHub Actions pins Node 22 (`.github/workflows/ci.yml`)
- React Native 0.85.2 with React 19.2.3, Hermes, Fabric/TurboModules new architecture (`package.json`, `android/gradle.properties`)

**Package Manager:**
- Yarn Classic-compatible workflow; commands and frozen installs use Yarn (`package.json`, `.github/workflows/ci.yml`)
- Lockfile: present (`yarn.lock`)
- CocoaPods via Bundler for iOS native dependencies (`Gemfile`, `Gemfile.lock`, `ios/Podfile`)

## Frameworks

**Core:**
- React Native 0.85.2 and React 19.2.3 - iOS/Android application and UI (`package.json`, `App.tsx`, `android/`, `ios/`)
- VisionCamera 5.2.1 - camera preview, photo output, and frame output (`package.json`, `src/screens/CameraScreen.tsx`, `src/framePipeline/useFramePipeline.ts`)

**Testing:**
- Jest ^29.6.3 with `@react-native/jest-preset` 0.85.2 - unit, hook, component, and integration tests (`package.json`, `jest.config.js`, `__tests__/`)
- Testing Library React Native ^13.3.3 and React Test Renderer 19.2.3 - React Native hook/component rendering (`package.json`, `__tests__/`)

**Build/Dev:**
- Metro 0.85.2 default React Native configuration and Babel React Native preset 0.85.2 (`package.json`, `metro.config.js`, `babel.config.js`)
- TypeScript ^5.8.3 with the React Native TypeScript config (`package.json`, `tsconfig.json`)
- ESLint 9.39.5 with the React Native flat config 0.87.1; JavaScript, scripts, and native trees are excluded (`package.json`, `eslint.config.js`)
- Prettier 3.9.6 with single quotes, trailing commas, and unparenthesized single arrow parameters (`package.json`, `.prettierrc.js`)
- Android Gradle builds and CocoaPods iOS builds (`android/build.gradle`, `android/app/build.gradle`, `ios/Podfile`, `Gemfile`)

## Key Dependencies

**Critical:**
- `react-native-vision-camera` 5.2.1 - camera and frame outputs (`package.json`, `src/screens/CameraScreen.tsx`, `src/framePipeline/useFramePipeline.ts`)
- `react-native-vision-camera-face-detector` 2.0.0-0 - on-device face detector hook (`package.json`, `src/faceDetection/useFaceDetection.ts`)
- `react-native-sensors` ^7.3.6 - accelerometer/gyroscope inputs for pitch, horizon, and stability (`package.json`, `src/sensors/usePitchDetection.ts`, `src/sensors/useHorizonLevel.ts`, `src/sensors/useStability.ts`)
- `react-native-mmkv` ^4.3.1 - settings, photo metadata indexes, and anonymous install-ID persistence (`package.json`, `src/storage/settings.ts`, `src/storage/LocalPhotoStorage.ts`, `src/telemetry/installId.ts`)
- `@react-native-camera-roll/camera-roll` ^7.10.2 - saving and deleting device-gallery assets (`package.json`, `src/storage/LocalPhotoStorage.ts`, `src/storage/EncryptedLocalPhotoStorage.ts`)
- `react-native-keychain` ^10.0.0 and `react-native-get-random-values` ^1.11.0 - secure MMKV key custody and key generation for the optional encrypted adapter (`package.json`, `src/storage/encryptedStorage.ts`)
- `react-native-permissions` ^5.5.1 - camera, photo-library, and motion permission flows (`package.json`, `src/camera/useCameraPermission.ts`, `src/screens/onboarding/PermissionsScreen.tsx`, `ios/Podfile`)

**Infrastructure:**
- `react-native-reanimated` ^4.3.0 and `react-native-worklets` ^0.8.1 - animation/worklet support (`package.json`, `src/coaching/PromptPill.tsx`, `src/framePipeline/useFramePipeline.ts`)
- `react-native-gesture-handler` ^2.31.1 - post-capture gestures (`package.json`, `src/screens/PostCaptureScreen.tsx`)
- `react-native-safe-area-context` ^5.5.2 - safe-area layout (`package.json`, `App.tsx`, `src/screens/CameraScreen.tsx`)
- `@react-native-async-storage/async-storage` ^3.0.2 - onboarding completion state (`package.json`, `src/storage/onboarding.ts`)
- `react-native-nitro-image` and `react-native-nitro-modules` support the installed VisionCamera/face-detector stack; overlays remain ordinary React Native views (`package.json`, `src/components/CompositionOverlay.tsx`, `src/components/HorizonIndicator.tsx`)

## Configuration

**Environment:**
- The mobile app has no checked-in `.env` configuration or runtime environment-variable reads; adapter selection is a code constant (`src/storage/storageWiring.ts`)
- The static-site development proxy alone accepts an optional `PORT` process variable (`scripts/serve-pages.mjs`)
- App registration/display identity is `AIPhotoCoach` (`app.json`, `index.js`)

**Build:**
- TypeScript and transform/bundler configuration lives in `tsconfig.json`, `babel.config.js`, and `metro.config.js`
- Test native-module substitution is centralized in `jest.config.js` with implementations under `__mocks__/`
- Android SDK levels and architecture/engine flags are in `android/build.gradle` and `android/gradle.properties`; iOS pods and permissions are in `ios/Podfile`

## Platform Requirements

**Development:**
- Node >=22.11.0 and Yarn are required by `package.json` and `.github/workflows/ci.yml`; Android builds use the Gradle wrapper under `android/`, while iOS builds require Ruby/CocoaPods from `Gemfile` and `ios/Podfile`
- iOS native development requires Xcode/macOS, and Android native development requires an Android SDK compatible with compile SDK 36 (`ios/AIPhotoCoach.xcodeproj/`, `android/build.gradle`)

**Production:**
- Android minimum SDK 24 with target/compile SDK 36 (`android/build.gradle`, `android/app/build.gradle`)
- iOS pods enforce deployment target 15.5, while the Xcode project still contains 15.1 settings that Pod post-install overrides for pods (`ios/Podfile`, `ios/AIPhotoCoach.xcodeproj/project.pbxproj`)
- The static `website/` is deployed separately to GitHub Pages (`.github/workflows/deploy.yml`, `website/index.html`)

---

*Stack analysis: 2026-08-30*
