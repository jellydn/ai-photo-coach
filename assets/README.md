# AI Photo Coach - Brand Assets

## Logo

The logo combines a camera lens/aperture with rule-of-thirds composition guides, representing the app's AI coaching functionality.

### Files
- `logo/logo.svg` - Full logo with gradients and details
- `logo/logo-icon.svg` - Simplified icon for app icons (60x60 viewBox)

### Color Palette
| Color | Hex | Usage |
|-------|-----|-------|
| Dark Background | `#0D0D0D` | Primary background |
| Card/Surface | `#1A1A1A` | Elevated surfaces |
| Gold/Yellow | `#FFD700` | Accent, highlights, coaching tips |
| Orange | `#FFA500` | Gradient transition |
| Green | `#00D26A` | Success, ready state, focus points |
| White | `#FFFFFF` | Text, primary UI elements |
| Gray | `#999999` | Secondary text |

## Splash Screens

### Mobile Portrait (375×812)
- `splash/splash-screen.svg` - iPhone/Android phone portrait
- Includes: Logo, app name, tagline, animated loading dots

### Tablet Landscape (1024×768)
- `splash/splash-screen-tablet.svg` - iPad/Android tablet landscape
- Layout: Logo left, text right for larger screens

## Export Sizes

### iOS App Icons
| Size | Usage |
|------|-------|
| 20×20@2x | Notification |
| 20×20@3x | Notification |
| 29×29@2x | Settings |
| 29×29@3x | Settings |
| 40×40@2x | Spotlight |
| 40×40@3x | Spotlight |
| 60×60@2x | App Store, Home |
| 60×60@3x | App Store, Home |
| 1024×1024 | App Store |

### Android App Icons
| Density | Size |
|---------|------|
| mdpi | 48×48 |
| hdpi | 72×72 |
| xhdpi | 96×96 |
| xxhdpi | 144×144 |
| xxxhdpi | 192×192 |
| Play Store | 512×512 |

## Splash Screen Setup

### iOS
1. Open `ios/YourApp/Images.xcassets`
2. Create `LaunchScreen` image set with:
   - Portrait: 375×812 (@1x), 750×1624 (@2x), 1125×2436 (@3x)
3. Or use `LaunchScreen.storyboard` with the SVG as a vector image

### Android
1. Place PNG exports in:
   - `android/app/src/main/res/drawable-mdpi/` (320×480)
   - `android/app/src/main/res/drawable-hdpi/` (480×800)
   - `android/app/src/main/res/drawable-xhdpi/` (720×1280)
   - `android/app/src/main/res/drawable-xxhdpi/` (1080×1920)

2. In `android/app/src/main/res/values/styles.xml`:
```xml
<style name="LaunchTheme" parent="Theme.AppCompat.Light.NoActionBar">
    <item name="android:windowBackground">@drawable/launch_screen</item>
</style>
```

## React Native Integration

### react-native-splash-screen (optional)
```javascript
import SplashScreen from 'react-native-splash-screen';

useEffect(() => {
  SplashScreen.hide();
}, []);
```

### Expo Splash Screen
If using Expo dev-client:
```json
{
  "splash": {
    "image": "./assets/splash/splash.png",
    "resizeMode": "contain",
    "backgroundColor": "#0D0D0D"
  }
}
```

## SVG to PNG Conversion

Use a tool like:
- **Figma** - Import SVG, export at multiple sizes
- **Inkscape** - Command line: `inkscape logo.svg --export-png=logo.png -w 1024`
- **SVG Converter tools** - Online batch converters
- **Sharp (Node.js)**:
```javascript
const sharp = require('sharp');
sharp('logo.svg').resize(1024, 1024).png().toFile('logo-1024.png');
```
