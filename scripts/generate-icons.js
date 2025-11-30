#!/usr/bin/env node

/**
 * Icon Generation Script for Cronus
 * Generates all required icon formats from a source PNG
 *
 * Usage: npm run generate-icons [source-icon.png]
 *
 * Requirements: sharp, png-to-ico (installed as devDependencies)
 */

const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const pngToIco = require("png-to-ico");

const PROJECT_ROOT = path.resolve(__dirname, "..");
const SOURCE_ICON = process.argv[2] || "resources/icon.png";
const SOURCE_PATH = path.join(PROJECT_ROOT, SOURCE_ICON);

// Icon sizes needed for macOS iconset
const ICONSET_SIZES = [
  { size: 16, name: "icon_16x16.png" },
  { size: 32, name: "icon_16x16@2x.png" },
  { size: 32, name: "icon_32x32.png" },
  { size: 64, name: "icon_32x32@2x.png" },
  { size: 128, name: "icon_128x128.png" },
  { size: 256, name: "icon_128x128@2x.png" },
  { size: 256, name: "icon_256x256.png" },
  { size: 512, name: "icon_256x256@2x.png" },
  { size: 512, name: "icon_512x512.png" },
  { size: 1024, name: "icon_512x512@2x.png" },
];

// Sizes for Windows .ico
const ICO_SIZES = [256, 128, 64, 48, 32, 16];

async function main() {
  console.log("=== Icon Generation Script ===\n");

  // Validate source exists
  if (!fs.existsSync(SOURCE_PATH)) {
    console.error(`Error: Source icon not found at ${SOURCE_PATH}`);
    console.error("Usage: npm run generate-icons [source-icon.png]");
    process.exit(1);
  }

  // Get source dimensions
  const metadata = await sharp(SOURCE_PATH).metadata();
  console.log(`Source: ${SOURCE_ICON}`);
  console.log(`Dimensions: ${metadata.width}x${metadata.height}\n`);

  // 1. Copy PNG to required locations
  console.log("1. Copying PNG to required locations...");
  const pngDestinations = [
    "resources/icon.png",
    "build/icon.png",
  ];

  for (const dest of pngDestinations) {
    const destPath = path.join(PROJECT_ROOT, dest);
    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    fs.copyFileSync(SOURCE_PATH, destPath);
    console.log(`   ✓ ${dest}`);
  }
  console.log("");

  // 2. Generate macOS iconset and .icns
  console.log("2. Generating macOS .icns...");
  const iconsetDir = path.join(PROJECT_ROOT, "icon.iconset");
  fs.mkdirSync(iconsetDir, { recursive: true });

  for (const { size, name } of ICONSET_SIZES) {
    await sharp(SOURCE_PATH)
      .resize(size, size)
      .toFile(path.join(iconsetDir, name));
  }

  // Use iconutil on macOS to create .icns
  if (process.platform === "darwin") {
    const { execSync } = require("child_process");
    const icnsPath = path.join(PROJECT_ROOT, "build/icon.icns");
    execSync(`iconutil -c icns "${iconsetDir}" -o "${icnsPath}"`);
    console.log("   ✓ build/icon.icns");
  } else {
    console.log("   ⚠ Skipping .icns (only available on macOS)");
  }

  // Cleanup iconset directory
  fs.rmSync(iconsetDir, { recursive: true, force: true });
  console.log("");

  // 3. Generate Windows .ico
  console.log("3. Generating Windows .ico...");
  const tempPngs = [];

  for (const size of ICO_SIZES) {
    const tempPath = path.join(PROJECT_ROOT, `temp_${size}.png`);
    await sharp(SOURCE_PATH).resize(size, size).toFile(tempPath);
    tempPngs.push(tempPath);
  }

  const icoBuffer = await pngToIco(tempPngs);
  fs.writeFileSync(path.join(PROJECT_ROOT, "build/icon.ico"), icoBuffer);
  console.log("   ✓ build/icon.ico");

  // Cleanup temp files
  for (const tempPath of tempPngs) {
    fs.unlinkSync(tempPath);
  }
  console.log("");

  console.log("=== Done! ===\n");

  // List updated files
  console.log("Updated icons:");
  const files = [
    "resources/icon.png",
    "build/icon.png",
    "build/icon.icns",
    "build/icon.ico",
  ];

  for (const file of files) {
    const filePath = path.join(PROJECT_ROOT, file);
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      console.log(`  ${file} (${(stats.size / 1024).toFixed(1)} KB)`);
    }
  }
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
