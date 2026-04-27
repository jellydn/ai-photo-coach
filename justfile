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

# Build for iOS (debug)
build-ios:
    @echo "🔨 Building iOS (debug)..."
    cd ios && xcodebuild -workspace AIPhotoCoach.xcworkspace -scheme AIPhotoCoach -configuration Debug -sdk iphonesimulator -derivedDataPath build build

# Build for iOS release
build-ios-release:
    @echo "🔨 Building iOS (release)..."
    cd ios && xcodebuild -workspace AIPhotoCoach.xcworkspace -scheme AIPhotoCoach -configuration Release -sdk iphoneos -derivedDataPath build build

# Clean iOS build artifacts and derived data
clean-ios:
    @echo "🧹 Cleaning iOS build artifacts..."
    rm -rf ios/build
    rm -rf ios/Pods
    rm -rf ~/Library/Developer/Xcode/DerivedData/AIPhotoCoach-*
    @echo "✓ iOS clean complete"

# Clean Android build artifacts
clean-android:
    @echo "🧹 Cleaning Android build artifacts..."
    rm -rf android/app/build
    rm -rf android/.gradle
    @echo "✓ Android clean complete

# Build for Android (debug)
build-android:
    @echo "🔨 Building Android (debug)..."
    cd android && ./gradlew assembleDebug

# Build for Android release
build-android-release:
    @echo "🔨 Building Android (release)..."
    cd android && ./gradlew assembleRelease

# Build for current platform (detects based on OS)
build:
    #!/bin/bash
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo "🔨 Building for iOS (macOS detected)..."
        just build-ios
    else
        echo "🔨 Building for Android..."
        just build-android
    fi

# Clean and rebuild iOS
rebuild-ios: clean-ios pod
    @echo "🔨 Rebuilding iOS..."
    just build-ios

# Clean and rebuild Android  
rebuild-android: clean-android
    @echo "🔨 Rebuilding Android..."
    just build-android

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
    xcrun devicectl list devices 2>/dev/null || xcrun instruments -s devices 2>/dev/null | grep -v "Simulator" | head -10

# Run on physical iPhone via USB (requires device to be connected and trusted)
# Note: First run may require opening Xcode to set up signing
ios-device:
    #!/bin/bash
    # Use devicectl (newer Xcode) to find connected device
    # Columns: Name, Hostname, Identifier, State, Model
    DEVICE_LINE=$(xcrun devicectl list devices 2>/dev/null | grep -E "iPhone|iPad" | head -1)

    if [ -n "$DEVICE_LINE" ]; then
        # devicectl columns: Name(fields 1-2), Hostname(3), Identifier(4), State, Model
        # Use device name (more reliable than UDID which differs between tools)
        DEVICE_NAME=$(echo "$DEVICE_LINE" | awk '{print $1" "$2}')
        echo "📱 Found: $DEVICE_NAME"
        echo "🚀 Building..."
        # Use --device with device name (handles spaces in names)
        npx react-native run-ios --device "$DEVICE_NAME"
        exit $?
    fi

    # Fallback: try simctl list for devices (less reliable for physical devices)
    DEVICE_NAME=$(xcrun simctl list devices 2>/dev/null | grep -E "iPhone|iPad" | grep -v "Simulator" | head -1 | sed 's/^ *//' | cut -d'(' -f1 | sed 's/ *$//' | tr -d "'")
    if [ -n "$DEVICE_NAME" ]; then
        echo "📱 Found: $DEVICE_NAME"
        echo "🚀 Building..."
        npx react-native run-ios --device "$DEVICE_NAME"
        exit $?
    fi

    echo "❌ No iPhone/iPad found via USB"
    echo ""
    echo "Troubleshooting:"
    echo "1. Connect your iPhone/iPad via USB"
    echo "2. Tap 'Trust This Computer' on your device"
    echo "3. Unlock your device"
    echo "4. Check Xcode → Window → Devices and Simulators"
    echo "5. Run 'just ios-devices' to see available devices"
    echo "6. Or use: just ios-device-name 'Your iPhone Name'"
    exit 1

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

# Open Xcode workspace for development (alias for ios-xcode)
dev:
    @echo "🚀 Opening Xcode workspace..."
    open ios/AIPhotoCoach.xcworkspace

# Setup code signing for physical device deployment
setup-signing:
    #!/bin/bash
    echo "🔐 iOS Code Signing Setup"
    echo ""
    echo "This is a one-time setup required to run on physical devices."
    echo ""
    echo "Steps:"
    echo "1. Xcode will open automatically"
    echo "2. Click on 'AIPhotoCoach' in the left sidebar (blue icon)"
    echo "3. Select target 'AIPhotoCoach'"
    echo "4. Go to 'Signing & Capabilities' tab"
    echo "5. Check 'Automatically manage signing'"
    echo "6. Select your Team (Apple ID) from dropdown"
    echo "   - If no team: click 'Add Account...' and sign in"
    echo "   - Free personal team works for device testing"
    echo ""
    echo "7. Connect your iPhone/iPad via USB"
    echo "8. Select your device in the top toolbar (where it says 'Any iOS Device')"
    echo "9. Click Build & Run (▶ button) once to verify"
    echo ""
    echo "Then you can use 'just ios-device' from command line."
    echo ""
    read -p "Press Enter to open Xcode..."
    open ios/AIPhotoCoach.xcworkspace
