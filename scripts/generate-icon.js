import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

// Direct SVG path representations of Lucide's Aperture icon.
// Hardcoding this avoids deep ESM internal module resolution issues on CI.
const innerSvg = `
  <circle cx="12" cy="12" r="10" />
  <line x1="14.31" y1="8" x2="20.05" y2="17.94" />
  <line x1="9.69" y1="8" x2="21.17" y2="8" />
  <line x1="7.38" y1="12" x2="13.12" y2="2.06" />
  <line x1="9.69" y1="16" x2="3.95" y2="6.06" />
  <line x1="14.31" y1="16" x2="2.83" y2="16" />
  <line x1="16.62" y1="12" x2="10.88" y2="21.94" />
`;

function rgbaToBmp(rgbaBuffer, width, height) {
  const fileHeaderSize = 14;
  const dibHeaderSize = 40;
  const imageSize = width * height * 4;
  const fileSize = fileHeaderSize + dibHeaderSize + imageSize;

  const fileHeader = Buffer.alloc(fileHeaderSize);
  fileHeader.write('BM', 0);
  fileHeader.writeUInt32LE(fileSize, 2);
  fileHeader.writeUInt32LE(0, 6);
  fileHeader.writeUInt32LE(fileHeaderSize + dibHeaderSize, 10);

  const dibHeader = Buffer.alloc(dibHeaderSize);
  dibHeader.writeUInt32LE(dibHeaderSize, 0);
  dibHeader.writeInt32LE(width, 4);
  dibHeader.writeInt32LE(-height, 8); // Top-down DIB
  dibHeader.writeUInt16LE(1, 12);
  dibHeader.writeUInt16LE(32, 14);
  dibHeader.writeUInt32LE(0, 16);
  dibHeader.writeUInt32LE(imageSize, 20);
  dibHeader.writeInt32LE(2835, 24);
  dibHeader.writeInt32LE(2835, 28);
  dibHeader.writeUInt32LE(0, 32);
  dibHeader.writeUInt32LE(0, 36);

  const bgraBuffer = Buffer.alloc(imageSize);
  for (let i = 0; i < imageSize; i += 4) {
    bgraBuffer[i] = rgbaBuffer[i + 2];     // B
    bgraBuffer[i + 1] = rgbaBuffer[i + 1]; // G
    bgraBuffer[i + 2] = rgbaBuffer[i];     // R
    bgraBuffer[i + 3] = rgbaBuffer[i + 3]; // A
  }

  return Buffer.concat([fileHeader, dibHeader, bgraBuffer]);
}

async function generateIco() {
  const buildDir = path.resolve('build');
  const publicDir = path.resolve('public');

  // Ensure directories exist
  if (!fs.existsSync(buildDir)) {
    fs.mkdirSync(buildDir, { recursive: true });
  }
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  // Using pre-defined innerSvg structure

  // 1. Base template for public/logo.svg
  const getLogoSvg = (width, height) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="${width}" height="${height}">
  <defs>
    <!-- Linear gradient matching the AppSidebar oklch from-primary to-destructive theme colors -->
    <linearGradient id="galleo-grad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#a60036" />
      <stop offset="1" stop-color="#ff6568" />
    </linearGradient>
  </defs>
  <!-- Rounded square background -->
  <rect width="512" height="512" rx="128" fill="url(#galleo-grad)" />
  <!-- Centered White Aperture (Lucide icon layout) -->
  <g transform="translate(112, 112) scale(12)" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none">
    ${innerSvg}
  </g>
</svg>`;

  // Save the main 512x512 logo.svg file
  const logoPath = path.join(publicDir, 'logo.svg');
  fs.writeFileSync(logoPath, getLogoSvg(512, 512));
  console.log(`Successfully generated public/logo.svg`);

  // 2. Generate build/icon.ico by rasterizing vectors at pixel-perfect sizes (largest first)
  const sizes = [256, 128, 64, 48, 32, 16];
  const pngBuffers = [];

  console.log(`Rendering SVG directly at target sizes to prevent interpolation blurriness...`);
  for (const size of sizes) {
    // Generate the SVG code with width/height set explicitly to the target size.
    // Sharp will render the vector path cleanly at this exact size rather than scaling a bitmap.
    const sizedSvg = getLogoSvg(size, size);
    
    const pngBuffer = await sharp(Buffer.from(sizedSvg))
      .png()
      .toBuffer();
      
    pngBuffers.push({
      size,
      data: pngBuffer
    });
  }

  console.log(`Writing ICO file to build/icon.ico...`);
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // Reserved
  header.writeUInt16LE(1, 2); // Type: 1 = Icon
  header.writeUInt16LE(sizes.length, 4); // Number of images

  const directoryEntries = [];
  let currentOffset = 6 + sizes.length * 16;

  for (const { size, data } of pngBuffers) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size === 256 ? 0 : size, 0);
    entry.writeUInt8(size === 256 ? 0 : size, 1);
    entry.writeUInt8(0, 2);
    entry.writeUInt8(0, 3);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(data.length, 8);
    entry.writeUInt32LE(currentOffset, 12);

    directoryEntries.push(entry);
    currentOffset += data.length;
  }

  const fileBuffer = Buffer.concat([
    header,
    ...directoryEntries,
    ...pngBuffers.map(p => p.data)
  ]);
  fs.writeFileSync(path.join(buildDir, 'icon.ico'), fileBuffer);
  console.log(`Successfully generated build/icon.ico`);

  // 3. Generate installerSidebar.bmp (164x314) with custom gradient and white lens
  const sidebarSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="164" height="314" viewBox="0 0 164 314">
  <defs>
    <linearGradient id="galleo-grad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#a60036" />
      <stop offset="1" stop-color="#ff6568" />
    </linearGradient>
  </defs>
  <rect width="164" height="314" fill="url(#galleo-grad)" />
  <g transform="translate(42, 60) scale(3.3)" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none">
    ${innerSvg}
  </g>
</svg>`;

  console.log('Generating installerSidebar.bmp...');
  const { data: sidebarData, info: sidebarInfo } = await sharp(Buffer.from(sidebarSvg))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const sidebarBmp = rgbaToBmp(sidebarData, sidebarInfo.width, sidebarInfo.height);
  fs.writeFileSync(path.join(buildDir, 'installerSidebar.bmp'), sidebarBmp);
  console.log('Successfully generated installerSidebar.bmp');

  // 4. Generate installerHeader.bmp (150x57) with custom gradient and white lens
  const headerSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="150" height="57" viewBox="0 0 150 57">
  <defs>
    <linearGradient id="galleo-grad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#a60036" />
      <stop offset="1" stop-color="#ff6568" />
    </linearGradient>
  </defs>
  <rect width="150" height="57" fill="url(#galleo-grad)" />
  <g transform="translate(100, 12) scale(1.3)" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none">
    ${innerSvg}
  </g>
</svg>`;

  console.log('Generating installerHeader.bmp...');
  const { data: headerData, info: headerInfo } = await sharp(Buffer.from(headerSvg))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const headerBmp = rgbaToBmp(headerData, headerInfo.width, headerInfo.height);
  fs.writeFileSync(path.join(buildDir, 'installerHeader.bmp'), headerBmp);
  console.log('Successfully generated installerHeader.bmp');

  // 5. Generate high-resolution build/icon.png (512x512) for macOS/Linux icon generation
  console.log('Generating high-resolution build/icon.png...');
  await sharp(logoPath)
    .resize(512, 512)
    .png()
    .toFile(path.join(buildDir, 'icon.png'));
  console.log('Successfully generated build/icon.png');

  // Remove deprecated PNG assets if they exist
  try {
    fs.unlinkSync(path.join(buildDir, 'installerSidebar.png'));
    fs.unlinkSync(path.join(buildDir, 'installerHeader.png'));
  } catch (e) {}
}

generateIco().catch(err => {
  console.error('Error generating installer assets:', err);
  process.exit(1);
});
