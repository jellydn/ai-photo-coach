# Technology Stack

**Analysis Date:** 2026-05-01

## Languages

**Primary:**
- TypeScript 5.8.3 - App screens, hooks, pure domain logic, and tests in `src/`, `App.tsx`, `__tests__/`, with compiler config in `tsconfig.json`.
- TSX / React 19.2.3 - React Native UI components and screens in `App.tsx`, `src/screens/CameraScreen.tsx`, `src/screens/ModeSelectorScreen.tsx`, `src/screens/PostCaptureScreen.tsx`, and component folders under `src/`.

**Secondary:**
- JavaScript / CommonJS - React Native entry and tooling config in `index.js`, `jest.config.js`, `babel.config.js`, `metro.config.js`, `.eslintrc.js`, and `.prettierrc.js`.
- Kotlin - Android native entry points in `android/app/src/main/java/com/aiphotocoach/MainActivity.kt` and `android/app/src/main/java/com/aiphotocoach/MainApplication.kt`.
- Swift - iOS native app delegate in `ios/AIPhotoCoach/AppDelegate.swift`.
- Ruby - CocoaPods/Bundler setup in `Gemfile` and React Native pod integration in `ios/Podfile`.
- Gradle/Groovy - Android build configuration in `android/build.gradle`, `android/app/build.gradle`, and `android/gradle.properties`.

## Runtime

**Environment:**
- Node.js >= 22.11.0 - Declared engine for React Native CLI scripts in `package.json`.
- React Native 0.85.2 - Mobile runtime, native autolinking, Metro bundling, Hermes, and New Architecture in `package.json`, `android/gradle.properties`, and `ios/AIPhotoCoach/Info.plist`.
- Hermes JS engine - Enabled on Android via `android/gradle.properties`; iOS uses the React Native 0.85 app delegate in `ios/AIPhotoCoach/AppDelegate.swift`.

**Package Manager:**
- Yarn - Lockfile present at `yarn.lock`; scripts are Yarn-oriented in `package.json` and `justfile`.
- Lockfile: present (`yarn.lock`).

## Frameworks

**Core:**
- React Native 0.85.2 - Cross-platform application framework in `package.json`, with native entry points in `index.js`, `ios/AIPhotoCoach/AppDelegate.swift`, and `android/app/src/main/java/com/aiphotocoach/MainApplication.kt`.
- React 19.2.3 - Component model and hooks used throughout `App.tsx` and `src/`.
- VisionCamera 5.0.7 - Camera preview/capture API used by `src/screens/CameraScreen.tsx` through `Camera`, `useCameraDevice`, `usePhotoOutput`, and typed frame-output plumbing.
- React Native New Architecture / Fabric / TurboModules - Enabled by `newArchEnabled=true` in `android/gradle.properties` and `RCTNewArchEnabled` in `ios/AIPhotoCoach/Info.plist`.
- Nitro Modules support - `react-native-nitro-modules` and `react-native-nitro-image` are dependencies in `package.json`; code comments in `src/lighting/useLightingFrameProcessor.ts` and `src/edgeDetection/useEdgeDetectionFrameOutput.ts` note VisionCamera v5/Nitro-compatible work is stubbed.

**Testing:**
- Jest 29.6.3 - Unit and component test runner configured in `jest.config.js` and invoked by `package.json` script `test`.
- @react-native/jest-preset 0.85.2 - React Native Jest preset configured in `jest.config.js`.
- @testing-library/react-native 13.3.3 - React Native component/hook testing dependency in `package.json`.
- react-test-renderer 19.2.3 - React renderer test dependency in `package.json`.

**Build/Dev:**
- Metro 0.85.2 config - Metro default config merged in `metro.config.js` via `@react-native/metro-config`.
- Babel / @react-native/babel-preset 0.85.2 - JavaScript/TypeScript transform configured in `babel.config.js`.
- React Native CLI 20.1.0 - `ios`, `android`, and native platform CLI packages declared in `package.json`.
- TypeScript compiler - `tsc --noEmit` script in `package.json` using React Native TS config in `tsconfig.json`.
- ESLint 8.19.0 with `@react-native` config - Linting configured in `.eslintrc.js` and `package.json`.
- Prettier 2.8.8 - Formatting preferences in `.prettierrc.js`.
- pre-commit hooks via prek - Quality hooks for typecheck, lint, and tests defined in `prek.toml`.
- Just task runner - Developer commands for build/test/pods/devices in `justfile`.
- CocoaPods - iOS pods configured in `ios/Podfile` and Ruby gems in `Gemfile`.
- Android Gradle Plugin / Kotlin plugin - Android buildscript and app config in `android/build.gradle` and `android/app/build.gradle`.

## Key Dependencies

**Critical:**
- `react-native-vision-camera` 5.0.7 - Camera preview and photo capture; used in `src/screens/CameraScreen.tsx`.
- `react-native-permissions` ^5.5.1 - Camera permission checks/requests; used in `src/screens/CameraScreen.tsx` and `src/screens/onboarding/PermissionsScreen.tsx`, configured for iOS permissions in `ios/Podfile`.
- `react-native-sensors` ^7.3.6 - Accelerometer and gyroscope streams for horizon/stability/pitch; used in `src/sensors/useHorizonLevel.ts`, `src/sensors/useStability.ts`, and `src/sensors/usePitchDetection.ts`.
- `react-native-mmkv` ^4.3.1 - Fast local settings, telemetry ID, and photo metadata storage; used in `src/storage/settings.ts`, `src/storage/LocalPhotoStorage.ts`, and `src/telemetry/index.ts`.
- `@react-native-camera-roll/camera-roll` ^7.10.2 - Saves/deletes captured photos in device photo library; used in `src/storage/LocalPhotoStorage.ts`.
- `@react-native-async-storage/async-storage` ^3.0.2 - Persists onboarding completion; used in `src/storage/onboarding.ts`.
- `react-native-safe-area-context` ^5.5.2 - Safe-area layout wrapper for root/screens; used in `App.tsx` and screens under `src/screens/`.
- `react-native-gesture-handler` ^2.31.1 - Post-capture swipe gestures; used in `src/screens/PostCaptureScreen.tsx`.
- `react-native-reanimated` ^4.3.0 and `react-native-worklets` ^0.8.1 - Animation/worklet ecosystem dependencies in `package.json`; tests mock both in `jest.config.js`.

**Infrastructure:**
- `@react-native/new-app-screen` 0.85.2 - New-app helper dependency retained in `package.json`, not imported by current app source.
- `react-native-nitro-image` ^0.13.1 and `react-native-nitro-modules` ^0.35.5 - Native/Nitro dependencies declared in `package.json`; no direct source imports found under `src/`.
- `sharp` ^0.34.5 - Dev dependency in `package.json`; no direct source imports found in app code.
- `rxjs` transitive/native-module type usage - `Subscription` imported by sensor hooks in `src/sensors/useHorizonLevel.ts`, `src/sensors/useStability.ts`, and `src/sensors/usePitchDetection.ts`.

## Configuration

**Environment:**
- No `.env` files or required application environment variables were found in the repository root; runtime config is primarily static in `package.json`, `android/`, `ios/`, and source constants.
- App name is configured in `app.json` and registered from `index.js`.
- On-device permissions are declared in `ios/AIPhotoCoach/Info.plist`, `ios/Podfile`, and `android/app/src/main/AndroidManifest.xml`.
- Privacy disclosures for iOS accessed API categories are in `ios/AIPhotoCoach/PrivacyInfo.xcprivacy`.

**Build:**
- TypeScript config: `tsconfig.json` extends `@react-native/typescript-config`, includes `**/*.ts` and `**/*.tsx`, and excludes `node_modules`, iOS Pods, and `__mocks__`.
- Jest config: `jest.config.js` uses `@react-native/jest-preset`, `jest.setup.js`, native-module `moduleNameMapper` mocks, and React Native transform allowlisting.
- ESLint config: `.eslintrc.js` extends `@react-native`.
- Babel config: `babel.config.js` uses `module:@react-native/babel-preset`.
- Metro config: `metro.config.js` merges `getDefaultConfig(__dirname)` with no custom overrides.
- Android config: `android/build.gradle`, `android/app/build.gradle`, and `android/gradle.properties` set SDK, NDK, Kotlin, Hermes, New Architecture, app ID, and build types.
- iOS config: `ios/Podfile`, `ios/AIPhotoCoach/Info.plist`, `ios/AIPhotoCoach/AppDelegate.swift`, and `Gemfile` configure pods, deployment target, permissions, and native launch.

## Platform Requirements

**Development:**
- Node.js >= 22.11.0 required by `package.json`.
- Yarn dependency install with `yarn.lock` and scripts in `package.json` / `justfile`.
- iOS development requires CocoaPods via `Gemfile` and `ios/Podfile`; `justfile` includes `pod`, `ios`, and device recipes.
- Android development requires Android SDK 36, Build Tools 36.0.0, NDK 27.1.12297006, and Kotlin 2.1.20 as declared in `android/build.gradle`.
- Recommended quality commands are `yarn typecheck`, `yarn lint`, and `yarn test` from `package.json`; hooks are declared in `prek.toml`.

**Production:**
- iOS deployment target is 15.5 in `ios/Podfile`, and all pod targets are forced to `IPHONEOS_DEPLOYMENT_TARGET=15.5` in the `post_install` hook.
- Android minimum SDK is 24, target SDK is 36, and compile SDK is 36 in `android/build.gradle` / `android/app/build.gradle`.
- Android release currently uses the debug signing config and disables Proguard in `android/app/build.gradle`, so production signing/minification need a release-specific setup.
- iOS app requires arm64 and portrait orientation in `ios/AIPhotoCoach/Info.plist`.

---

*Stack analysis: 2026-05-01*
