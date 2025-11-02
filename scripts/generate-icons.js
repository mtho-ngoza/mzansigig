const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Create icons directory if it doesn't exist
const iconsDir = path.join(__dirname, '..', 'public', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// KasiGig brand color (blue from theme)
const brandColor = '#2563eb';

// Icon sizes needed
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

// Generate simple colored square icons with "KG" text
async function generateIcon(size) {
  const fontSize = Math.floor(size * 0.4);
  const svg = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" fill="${brandColor}" rx="${size * 0.15}"/>
      <text
        x="50%"
        y="50%"
        font-family="Arial, sans-serif"
        font-size="${fontSize}"
        font-weight="bold"
        fill="white"
        text-anchor="middle"
        dominant-baseline="central"
      >KG</text>
    </svg>
  `;

  const outputPath = path.join(iconsDir, `icon-${size}x${size}.png`);

  await sharp(Buffer.from(svg))
    .png()
    .toFile(outputPath);

  console.log(`✓ Generated ${size}x${size} icon`);
}

// Generate shortcut icons
async function generateShortcutIcon(name, emoji, size = 96) {
  const fontSize = Math.floor(size * 0.5);
  const svg = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" fill="${brandColor}" rx="${size * 0.2}"/>
      <text
        x="50%"
        y="50%"
        font-size="${fontSize}"
        text-anchor="middle"
        dominant-baseline="central"
      >${emoji}</text>
    </svg>
  `;

  const outputPath = path.join(iconsDir, `${name}-shortcut.png`);

  await sharp(Buffer.from(svg))
    .png()
    .toFile(outputPath);

  console.log(`✓ Generated ${name} shortcut icon`);
}

// Generate all icons
async function generateAllIcons() {
  console.log('Generating PWA icons...\n');

  // Generate main app icons
  for (const size of sizes) {
    await generateIcon(size);
  }

  // Generate shortcut icons
  await generateShortcutIcon('browse', '🔍');
  await generateShortcutIcon('dashboard', '📊');
  await generateShortcutIcon('messages', '💬');

  console.log('\n✅ All icons generated successfully!');
}

generateAllIcons().catch(console.error);
