# AI Photo Coach - Justfile
# https://github.com/casey/just

# Default recipe - show available commands
default:
    @just --list

# Install dependencies
install:
    yarn install

# iOS development - iPhone 17 Pro
ios:
    yarn ios --simulator="iPhone 17 Pro"

# Android development  
android:
    yarn android

# Start Metro bundler
start:
    yarn start

# Type check
alias tc := typecheck

typecheck:
    yarn typecheck

# Run linter
lint:
    yarn lint

# Run tests
test:
    yarn test

# Quality checks (typecheck + lint + test)
check: typecheck lint test

# iOS pod install
pod:
    cd ios && pod install && cd ..

# Clean build artifacts
clean:
    rm -rf node_modules
    rm -rf ios/Pods ios/build
    rm -rf android/app/build
    rm -rf $TMPDIR/react-*

# Full clean + reinstall
reset: clean
    yarn install
    cd ios && pod install && cd ..

# Run on iPhone 17e (mid-range testing)
ios-mid:
    yarn ios --simulator="iPhone 17e"

# Run on iPad mini
ios-tablet:
    yarn ios --simulator="iPad mini (A17 Pro)"

# Android release build
android-release:
    cd android && ./gradlew assembleRelease && cd ..

# List available iOS simulators
ios-sims:
    xcrun simctl list devices available

# List connected physical iOS devices via USB
ios-devices:
    xcrun xcdevices list | grep -E "(iPhone|iPad)" | head -10

# Run on physical iPhone via USB (requires device to be connected and trusted)
# Note: First run may require opening Xcode to set up signing
ios-device:
    #!/bin/bash
    DEVICE=$(xcrun xcdevices list | grep -E "iPhone.*USB" | head -1 | awk -F'[()]' '{print $2}')
    if [ -z "$DEVICE" ]; then
        echo "❌ No iPhone found via USB"
        echo "Connect your iPhone and trust this computer"
        exit 1
    fi
    echo "📱 Found device: $DEVICE"
    npx react-native run-ios --device "$DEVICE"

# Run on specific device by name (e.g., "just ios-device-name 'John's iPhone'")
ios-device-name NAME:
    npx react-native run-ios --device "{{NAME}}"

# Build and deploy via Xcode (opens Xcode for signing setup)
ios-xcode:
    open ios/AIPhotoCoach.xcworkspace

# Watch logs for debugging
logs:
    react-native log-ios

# Watch logs for physical device via console app
logs-device:
    echo "Open Console.app and select your iPhone from Devices"
