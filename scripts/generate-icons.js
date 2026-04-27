#!/usr/bin/env node
/* eslint-env node */
/**
 * Generate app icons from SVG for iOS and Android
 * Usage: node scripts/generate-icons.js
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const SVG_INPUT = path.join(__dirname, '../assets/logo/logo-icon.svg');

// iOS App Icon sizes
const IOS_ICONS = [
  { size: 20, scales: [2, 3], name: 'iphone-notification' },
  { size: 29, scales: [2, 3], name: 'iphone-settings' },
  { size: 40, scales: [2, 3], name: 'iphone-spotlight' },
  { size: 60, scales: [2, 3], name: 'iphone-app' },
  { size: 1024, scales: [1], name: 'app-store' },
];

// Android mipmap sizes
const ANDROID_ICONS = [
  { density: 'mdpi', size: 48 },
  { density: 'hdpi', size: 72 },
  { density: 'xhdpi', size: 96 },
  { density: 'xxhdpi', size: 144 },
  { density: 'xxxhdpi', size: 192 },
];

const PLAY_STORE_SIZE = 512;

async function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function generateIOSIcons() {
  console.log('🍎 Generating iOS app icons...');
  const iosAssetsDir = path.join(__dirname, '../ios/AIPhotoCoach/Images.xcassets/AppIcon.appiconset');
  ensureDir(iosAssetsDir);

  const contents = { images: [], info: { version: 1, author: 'xcode' } };

  for (const icon of IOS_ICONS) {
    for (const scale of icon.scales) {
      const pixelSize = icon.size * scale;
      const filename = `${icon.name}${scale > 1 ? `@${scale}x` : ''}-${icon.size}pt.png`;

      await sharp(SVG_INPUT, { density: 300 })
        .resize(pixelSize, pixelSize)
        .png()
        .toFile(path.join(iosAssetsDir, filename));

      contents.images.push({
        size: `${icon.size}x${icon.size}`,
        idiom: icon.size === 1024 ? 'ios-marketing' : 'iphone',
        filename,
        scale: `${scale}x`,
      });

      console.log(`  ✓ ${filename} (${pixelSize}x${pixelSize})`);
    }
  }

  // Also create 1024 for marketing
  const marketingFile = 'ios-marketing-1024x1024.png';
  await sharp(SVG_INPUT, { density: 300 })
    .resize(1024, 1024)
    .png()
    .toFile(path.join(iosAssetsDir, marketingFile));

  contents.images.push({
    size: '1024x1024',
    idiom: 'ios-marketing',
    filename: marketingFile,
    scale: '1x',
  });
  console.log(`  ✓ ${marketingFile} (1024x1024)`);

  fs.writeFileSync(
    path.join(iosAssetsDir, 'Contents.json'),
    JSON.stringify(contents, null, 2)
  );

  console.log('🍎 iOS icons complete!\n');
}

async function generateAndroidIcons() {
  console.log('🤖 Generating Android app icons...');
  const androidResDir = path.join(__dirname, '../android/app/src/main/res');

  for (const icon of ANDROID_ICONS) {
    const mipmapDir = path.join(androidResDir, `mipmap-${icon.density}`);
    ensureDir(mipmapDir);

    // Launcher icon (square with rounded corners handled by system)
    await sharp(SVG_INPUT, { density: 300 })
      .resize(icon.size, icon.size)
      .png()
      .toFile(path.join(mipmapDir, 'ic_launcher.png'));

    // Round icon (for devices that use circular icons)
    await sharp(SVG_INPUT, { density: 300 })
      .resize(icon.size, icon.size)
      .png()
      .toFile(path.join(mipmapDir, 'ic_launcher_round.png'));

    console.log(`  ✓ mipmap-${icon.density} (${icon.size}x${icon.size})`);
  }

  // Play Store icon
  const playStoreDir = path.join(__dirname, '../android/app/src/main/res/mipmap-xxxhdpi');
  ensureDir(playStoreDir);

  await sharp(SVG_INPUT, { density: 300 })
    .resize(PLAY_STORE_SIZE, PLAY_STORE_SIZE)
    .png()
    .toFile(path.join(playStoreDir, 'ic_launcher-playstore.png'));

  console.log(`  ✓ Play Store icon (${PLAY_STORE_SIZE}x${PLAY_STORE_SIZE})`);
  console.log('🤖 Android icons complete!\n');
}

async function generateSplashPngs() {
  console.log('📱 Generating splash screen PNGs...');

  const splashDir = path.join(__dirname, '../assets/splash/png');
  ensureDir(splashDir);

  // iOS splash sizes
  const iosSplashSizes = [
    { width: 375, height: 812, name: 'splash-375x812@1x', desc: 'iPhone X/XS/11 Pro/12/13/14' },
    { width: 750, height: 1624, name: 'splash-375x812@2x', desc: 'iPhone X/XS/11 Pro @2x' },
    { width: 1125, height: 2436, name: 'splash-375x812@3x', desc: 'iPhone X/XS/11 Pro @3x' },
    { width: 414, height: 896, name: 'splash-414x896@2x', desc: 'iPhone 11/11 Pro Max/XR' },
    { width: 1242, height: 2688, name: 'splash-414x896@3x', desc: 'iPhone 11 Pro Max/XS Max' },
    { width: 390, height: 844, name: 'splash-390x844@3x', desc: 'iPhone 12/13/14/15 Pro' },
    { width: 428, height: 926, name: 'splash-428x926@3x', desc: 'iPhone 12/13/14/15 Pro Max' },
    { width: 768, height: 1024, name: 'splash-ipad-768x1024', desc: 'iPad Portrait' },
    { width: 1536, height: 2048, name: 'splash-ipad-768x1024@2x', desc: 'iPad Portrait @2x' },
    { width: 1024, height: 768, name: 'splash-ipad-1024x768', desc: 'iPad Landscape' },
    { width: 2048, height: 1536, name: 'splash-ipad-1024x768@2x', desc: 'iPad Landscape @2x' },
  ];

  // We'll create a simplified splash - just logo centered on dark background
  const splashSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <rect width="200" height="200" fill="#0D0D0D"/>
  <circle cx="100" cy="100" r="60" fill="#1A1A1A" stroke="#333" stroke-width="1"/>
  <circle cx="100" cy="100" r="56" stroke="url(#g)" stroke-width="2"/>
  <circle cx="100" cy="100" r="40" stroke="#FFFFFF" stroke-width="2.5" fill="none"/>
  <circle cx="100" cy="100" r="30" stroke="#FFFFFF" stroke-width="1.5" fill="none" opacity="0.6"/>
  <circle cx="100" cy="100" r="12" fill="#FFD700"/>
  <line x1="70" y1="100" x2="75" y2="100" stroke="#0D0D0D" stroke-width="2" stroke-linecap="round"/>
  <line x1="125" y1="100" x2="130" y2="100" stroke="#0D0D0D" stroke-width="2" stroke-linecap="round"/>
  <line x1="100" y1="70" x2="100" y2="75" stroke="#0D0D0D" stroke-width="2" stroke-linecap="round"/>
  <line x1="100" y1="125" x2="100" y2="130" stroke="#0D0D0D" stroke-width="2" stroke-linecap="round"/>
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFD700"/>
      <stop offset="50%" stop-color="#FFA500"/>
      <stop offset="100%" stop-color="#00D26A"/>
    </linearGradient>
  </defs>
</svg>`;

  // Generate a base splash image and center it in various sizes
  const baseLogoSize = 200;
  const logoPng = await sharp(Buffer.from(splashSvg))
    .resize(baseLogoSize, baseLogoSize)
    .png()
    .toBuffer();

  for (const size of iosSplashSizes) {
    // Create dark background and center the logo
    const logoScale = Math.min(size.width, size.height) * 0.35 / baseLogoSize;
    const scaledLogoSize = Math.round(baseLogoSize * logoScale);
    const x = Math.round((size.width - scaledLogoSize) / 2);
    const y = Math.round((size.height - scaledLogoSize) / 2);

    await sharp({
      create: {
        width: size.width,
        height: size.height,
        channels: 4,
        background: { r: 13, g: 13, b: 13, alpha: 1 }, // #0D0D0D
      },
    })
      .composite([
        {
          input: await sharp(logoPng).resize(scaledLogoSize, scaledLogoSize).toBuffer(),
          left: x,
          top: y,
        },
      ])
      .png()
      .toFile(path.join(splashDir, `${size.name}.png`));

    console.log(`  ✓ ${size.name}.png (${size.width}x${size.height}) - ${size.desc}`);
  }

  console.log('📱 Splash screen PNGs complete!\n');
}

async function main() {
  console.log('🎨 AI Photo Coach - Asset Generator\n');

  try {
    await generateIOSIcons();
    await generateAndroidIcons();
    await generateSplashPngs();

    console.log('✅ All assets generated successfully!');
    console.log('\nNext steps:');
    console.log('1. iOS: Open ios/AIPhotoCoach.xcworkspace in Xcode');
    console.log('2. iOS: Verify AppIcon.appiconset is assigned to target');
    console.log('3. Android: Icons are automatically picked up');
    console.log('4. Run: cd ios && pod install && cd .. && yarn ios');
  } catch (err) {
    console.error('❌ Error generating assets:', err.message);
    process.exit(1);
  }
}

main();
