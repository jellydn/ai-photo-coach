# Run AI Photo Coach on a Physical iPhone with Free Signing

You can build and test AI Photo Coach on your own iPhone without joining the paid Apple Developer Program. Xcode calls this **Personal Team** signing: an ordinary Apple ID creates a development certificate and a short-lived provisioning profile for a device you personally connect.

This route is suitable for learning, contributing, and checking camera behavior on your own device. It is not an app-distribution route.

## Why Expo Go is not an option

AI Photo Coach is a native React Native application, not an Expo Go application. It depends on native code that is not bundled into Expo Go, including VisionCamera, ML Kit face detection, Nitro Modules, and Worklets. Camera frame processing also needs the native iOS project in this repository.

You must therefore compile the app with Xcode (or test the Android build on an Android device). Running JavaScript in Expo Go cannot exercise this app's camera pipeline.

## What you need

- A Mac capable of running a current version of Xcode
- Xcode, installed from the Mac App Store
- A physical, arm64 iPhone running iOS 15.5 or later
- An ordinary Apple ID; paid Apple Developer Program membership is **not** required
- A USB cable for initial pairing and installation
- Node.js 22.11 or later and Yarn
- Ruby, Bundler, and the Xcode command-line tools for CocoaPods

The iPhone and Mac should also be on the same local network while using the Metro development server.

## 1. Prepare the JavaScript and iOS dependencies

From the repository root, install the JavaScript packages:

```bash
yarn install
```

Install the Ruby gems pinned by the repository, then install the pods from `ios/Podfile`:

```bash
bundle install
cd ios
bundle exec pod install
cd ..
```

Repeat `bundle exec pod install` from `ios/` whenever native dependencies or `Podfile.lock` change.

## 2. Pair and prepare the iPhone

1. Connect the unlocked iPhone to the Mac by USB.
2. If the iPhone asks whether to trust the computer, tap **Trust** and enter the device passcode.
3. In Xcode, open **Window > Devices and Simulators** and wait for the iPhone to finish pairing.
4. On iOS 16 or later, enable **Settings > Privacy & Security > Developer Mode** on the iPhone. The phone will restart and ask you to confirm.

Keep the phone unlocked during the first build. If iOS later asks you to trust the developer certificate, open **Settings > General > VPN & Device Management**, choose the Apple ID under **Developer App**, and trust it.

## 3. Configure free signing in Xcode

Open the CocoaPods workspace from the repository root:

```bash
open ios/AIPhotoCoach.xcworkspace
```

Do not open `AIPhotoCoach.xcodeproj`; the workspace includes the CocoaPods projects required by the native dependencies.

In Xcode:

1. Open **Xcode > Settings > Accounts** and add your ordinary Apple ID if it is not already present.
2. Select the **AIPhotoCoach** project in the navigator, then select the **AIPhotoCoach** application target.
3. Open **Signing & Capabilities**.
4. Enable **Automatically manage signing** for the Debug configuration.
5. For **Team**, choose the entry showing your name followed by **(Personal Team)**.
6. Replace the existing bundle identifier with one unique to your Apple ID, such as `com.yourname.aiphotocoach.dev`. If Xcode reports that the identifier is unavailable, choose a different one.

The repository contains placeholder/shared signing values that will not work for every contributor. Your Personal Team and bundle identifier are local development settings; do not commit those personal signing changes.

## 4. Build and run on the phone

Start Metro in a terminal at the repository root and leave it running:

```bash
yarn start
```

Back in Xcode:

1. Select your connected iPhone as the run destination in the toolbar.
2. Select the **AIPhotoCoach** scheme if it is not already selected.
3. Press **Run** (or <kbd>⌘R</kbd>).
4. Accept the camera, motion, and photo-library permission prompts on the phone.

The first native build can take several minutes. Once the app opens, confirm that Metro reports a client connection and that saving a JavaScript change triggers Fast Refresh.

## 5. Test the device-only behavior

Passing unit tests does not validate the native camera path. Exercise at least these states on the physical phone:

- The camera permission flow and live preview
- Portrait and Travel mode selection
- Horizon and stability feedback while tilting and moving the phone
- Coaching prompts and the readiness score
- Photo capture, post-capture preview, and saving to the photo library
- Lighting and edge-analysis behavior under several real scenes

Face detection, lighting analysis, and edge analysis depend on native frame processing. Some of these paths still need on-device validation or integration work, so a successful build alone does not prove that every analysis feature is complete.

Run the repository checks separately from the root, in this order:

```bash
yarn typecheck
yarn lint
yarn test --ci --runInBand
```

## Free-signing limitations

Personal Team signing is deliberately limited:

- It is intended for apps installed on your own registered devices, not for sharing builds with other people.
- The provisioning profile is short-lived (commonly seven days). When the app stops launching, reconnect the iPhone and build it again in Xcode to reinstall and re-sign it.
- Some paid developer capabilities and distribution services are unavailable.
- TestFlight, App Store submission, and practical external distribution require paid Apple Developer Program membership.

Changing the bundle identifier or reinstalling after expiry can create a separate app identity, so local app data may not carry over.

## If you do not have a Mac

There is no supported way to compile and install this iOS target locally without macOS and Xcode. Useful alternatives are:

1. **Test on a physical Android device.** Install the Android SDK and platform tools, enable Developer options and USB debugging, connect the phone, and confirm that `adb devices` lists it. Then run:

   ```bash
   yarn install
   yarn start
   ```

   In a second terminal, run:

   ```bash
   yarn android
   ```

   Use an Android 8.0 (API 26) or later device, as listed in the project's supported platforms. A physical Android device can exercise the real camera and sensors, although platform-specific behavior may differ from iOS.

2. **Use a Mac you can physically access.** A borrowed, school, workplace, or community-lab Mac can use your Apple ID and Personal Team for your own connected phone. Remove your account from Xcode when using a shared machine.

3. **Ask a contributor with an iPhone and Mac to validate the branch.** Record the device model, iOS version, tested modes, and observed frame-processing behavior so the result is reproducible.

4. **Use a hosted Mac only for build feedback.** Remote macOS or CI services may catch compilation failures, but they generally cannot attach your local iPhone and do not replace hands-on camera, motion-sensor, permission, or performance testing. An iOS Simulator is subject to the same testing gaps.

Expo Go is not a workaround for the missing native iOS build environment because it does not contain this repository's required native modules.

## Troubleshooting

- **Signing requires a development team:** select your Personal Team under the app target's **Signing & Capabilities** tab.
- **Bundle identifier cannot be registered:** change it to a globally unique reverse-DNS value.
- **Developer Mode is disabled:** enable it on the iPhone, restart when prompted, and run again.
- **The app is no longer available after several days:** the free provisioning profile probably expired; reconnect and rebuild from Xcode.
- **Pods or native headers are missing:** close Xcode, rerun `bundle exec pod install` inside `ios/`, and reopen `ios/AIPhotoCoach.xcworkspace`.
- **The app opens but cannot load JavaScript:** keep `yarn start` running and make sure the Mac and iPhone can reach each other on the local network.
