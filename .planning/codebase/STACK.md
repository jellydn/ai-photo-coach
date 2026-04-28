# Technology Stack

**Analysis Date:** 2026-04-28

## Languages

**Primary:**
- TypeScript 5.8.3 - Application logic, React components, hooks, utilities
- JavaScript (ES2020+) - Metro/Babel configuration, Jest setup

**Secondary:**
- Swift/Objective-C - iOS native modules (Podfile-based)
- Kotlin 2.1.20 - Android native modules (Gradle-based)
- Ruby - CocoaPods dependency management (Gemfile.lock present)

## Runtime

**Environment:**
- Node.js >=22.11.0 - Development toolchain, Metro bundler
- React Native 0.85.2 - Mobile runtime
- Hermes JavaScript engine - Default (configurable to JSC)
- iOS 15.5+ minimum deployment target
- Android API 24+ (Android 7.0+) minimum

**Package Manager:**
- Yarn - Package management
- Lockfile: yarn.lock (present)
- CocoaPods - iOS dependencies
- Gradle - Android dependencies

## Frameworks

**Core:**
- React 19.2.3 - UI component framework
- React Native 0.85.2 - Mobile cross-platform runtime
- React Native VisionCamera 5.0.7 - Camera capture and frame processing
- React Native Reanimated 4.3.0 - Smooth animations and shared values
- React Native Worklets 0.8.1 - Worklet thread execution for frame processing

**Testing:**
- Jest 29.6.3 - Unit testing framework
- @testing-library/react-native 13.3.3 - Component and hook testing utilities
- react-test-renderer 19.2.3 - React component snapshots

**Build/Dev:**
- Babel - Transpilation with @react-native/babel-preset
- Metro - React Native bundler (via @react-native/metro-config)
- ESLint 8.19.0 - Linting with @react-native/eslint-config
- Prettier 2.8.8 - Code formatting
- TypeScript 5.8.3 - Type checking (extends @react-native/typescript-config)

## Key Dependencies

**Critical (Camera & ML):**
- react-native-vision-camera 5.0.7 - Photo capture, frame processing, ML integration
- react-native-vision-camera-face-detector - MLKit face detection integration
- react-native-worklets 0.8.1 - Worklet execution for real-time frame processing

**Storage & Persistence:**
- react-native-mmkv 4.3.1 - High-performance key-value storage (settings, metadata)
- @react-native-camera-roll/camera-roll 7.10.2 - Photo library access
- @react-native-async-storage/async-storage 3.0.2 - Onboarding state persistence

**Sensors & Hardware:**
- react-native-sensors 7.3.6 - Accelerometer/gyroscope for stability/horizon detection
- react-native-permissions 5.5.1 - Camera, photo library, motion permissions

**UI & Interactions:**
- react-native-reanimated 4.3.0 - Smooth animations, shared values
- react-native-gesture-handler 2.31.1 - Touch gesture handling
- react-native-safe-area-context 5.5.2 - Safe area insets for notched devices

**Nitro Modules (High-performance native):**
- react-native-nitro-modules 0.35.5 - Native module infrastructure
- react-native-nitro-image 0.13.1 - Image processing (edge detection use case)

## Configuration

**Environment:**
- No external API keys required - fully offline/local app
- Settings stored in MMKV (user preferences, opt-out flags)
- Per-mode thresholds in src/config/modes.ts (hardcoded, not env-based)

**Build:**
- TypeScript: tsconfig.json (extends @react-native/typescript-config)
- Babel: babel.config.js (module:@react-native/babel-preset)
- Metro: metro.config.js (via @react-native/metro-config)
- ESLint: .eslintrc.js (extends @react-native)
- Prettier: .prettierrc.js (singleQuote, trailingComma: all)
- Jest: jest.config.js (preset: @react-native/jest-preset, custom moduleNameMapper for mocks)

**iOS Build:**
- Podfile: platform :ios, '15.5'
- CocoaPods setup for react-native-permissions (Camera, PhotoLibrary, Motion)
- Hermes enabled by default

**Android Build:**
- build.gradle: minSdkVersion 24, compileSdkVersion 36, targetSdkVersion 36
- Kotlin 2.1.20, NDK 27.1.12297006, buildTools 36.0.0
- JSC 2026004 (Hermes optional)

## Platform Requirements

**Development:**
- Node.js >=22.11.0
- Yarn package manager
- Xcode 16+ (for iOS 15.5+ development)
- Android Studio Koala+ (for API 36)
- CocoaPods (for iOS dependency management)

**Production:**
- iOS: iOS 15.5+ (iPhone 6s and newer)
- Android: API 24+ (Android 7.0+, Android 8+ recommended)
- Camera hardware required (front and/or back)
- Accelerometer/gyroscope for stability features

---

*Stack analysis: 2026-04-28*
