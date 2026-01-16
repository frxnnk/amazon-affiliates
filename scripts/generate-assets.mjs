/**
 * Generate favicon PNGs and OG image from SVG sources
 * Run with: node scripts/generate-assets.mjs
 */
import sharp from 'sharp';
import { readFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '..', 'public');

async function generateFavicons() {
  const faviconSvg = readFileSync(join(publicDir, 'favicon.svg'));

  const sizes = [
    { name: 'favicon-16.png', size: 16 },
    { name: 'favicon-32.png', size: 32 },
    { name: 'favicon-192.png', size: 192 },
    { name: 'favicon-512.png', size: 512 },
    { name: 'apple-touch-icon.png', size: 180 },
  ];

  for (const { name, size } of sizes) {
    await sharp(faviconSvg, { density: 300 })
      .resize(size, size)
      .png()
      .toFile(join(publicDir, name));
    console.log(`Generated ${name}`);
  }
}

async function generateOgImage() {
  const ogDir = join(publicDir, 'images', 'og');
  mkdirSync(ogDir, { recursive: true });

  const ogSvg = readFileSync(join(ogDir, 'default.svg'));

  await sharp(ogSvg, { density: 150 })
    .resize(1200, 630)
    .png()
    .toFile(join(ogDir, 'default.png'));
  console.log('Generated default.png (OG image)');
}

async function main() {
  console.log('Generating assets...\n');

  await generateFavicons();
  console.log('');
  await generateOgImage();

  console.log('\nDone!');
}

main().catch(console.error);
