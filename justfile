# AI Photo Coach - Justfile
# https://github.com/casey/just

# Default recipe - show available commands
default:
    @just --list

# Install dependencies
install:
    yarn install

# iOS development
ios:
    yarn ios

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

# Run on specific iOS simulator (iPhone 15)
ios-15:
    yarn ios --simulator="iPhone 15"

# Run on iPhone SE (smaller screen testing)
ios-se:
    yarn ios --simulator="iPhone SE (3rd generation)"

# Android release build
android-release:
    cd android && ./gradlew assembleRelease && cd ..

# List available iOS simulators
ios-sims:
    xcrun simctl list devices available

# Watch logs for debugging
logs:
    react-native log-ios
