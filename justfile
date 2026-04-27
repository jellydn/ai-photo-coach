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

# Watch logs for debugging
logs:
    react-native log-ios
