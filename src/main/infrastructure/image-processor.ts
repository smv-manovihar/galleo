import sharp, { type Sharp } from 'sharp';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { app } from 'electron';
import { type Result, fail, ok } from '../../shared/types/results';
import { bmvbhash } from 'blockhash-core';

export interface ImageAnalysisResult {
  blurScore: number;  // 0 - 100
  brightness: number; // 0 - 255
  hash: string;       // perceptual hash (hex)
}

export function getThumbnailCacheDir(): string {
  let cachePath: string;
  try {
    cachePath = path.join(app.getPath('userData'), 'thumbnails');
  } catch {
    cachePath = path.join(process.cwd(), 'data', 'thumbnails');
  }

  if (!existsSync(cachePath)) {
    // Create sync to avoid race conditions
    try {
      const fsSync = require('fs');
      fsSync.mkdirSync(cachePath, { recursive: true });
    } catch {}
  }
  return cachePath;
}

/**
 * Generates a thumbnail for the image using sharp and returns the cached path.
 */
export async function generateImageThumbnail(
  imagePath: string, 
  mediaId: string
): Promise<Result<string>> {
  try {
    const cacheDir = getThumbnailCacheDir();
    const thumbnailPath = path.join(cacheDir, `${mediaId}_v2.webp`);
    
    // Check if thumbnail is already cached
    try {
      await fs.access(thumbnailPath);
      return ok(thumbnailPath);
    } catch {}
    
    // Resize image to 800x800 (high quality retina preview), keep aspect ratio, output as compressed webp
    await sharp(imagePath)
      .resize({
        width: 800,
        height: 800,
        fit: 'inside',
        withoutEnlargement: true
      })
      .webp({ quality: 85 })
      .toFile(thumbnailPath);
      
    return ok(thumbnailPath);
  } catch (e: any) {
    return fail({
      code: 'THUMBNAIL_FAILED',
      path: imagePath,
      reason: e.message || 'Sharp thumbnail generation failed'
    });
  }
}

/**
 * Computes average brightness of the image (0-255).
 * Luminance = 0.299 * R + 0.587 * G + 0.114 * B
 */
async function computeBrightness(image: Sharp): Promise<number> {
  try {
    const tinyBuffer = await image
      .clone()
      .resize(1, 1)
      .raw()
      .toBuffer({ resolveWithObject: true });
      
    const r = tinyBuffer.data[0];
    const g = tinyBuffer.data[1];
    const b = tinyBuffer.data[2];
    
    // Standard CCIR 601 luma formula
    return Math.round(0.299 * r + 0.587 * g + 0.114 * b);
  } catch {
    return 128; // Default to mid-brightness on error
  }
}

/**
 * Computes a sharpness / blur score using the variance of Laplacian method.
 * Returns a score from 0 (very blurry) to 100 (very sharp).
 */
async function computeBlurScore(image: Sharp): Promise<number> {
  try {
    // 1. Resize to fixed size to normalize calculations across resolutions
    const size = 300;
    const convolved = await image
      .clone()
      .resize(size, size, { fit: 'cover' }) // Use cover to prevent vertical/horizontal aspect squishing
      .greyscale()
      // Convolve with standard Laplacian kernel
      .convolve({
        width: 3,
        height: 3,
        kernel: [
          0,  1,  0,
          1, -4,  1,
          0,  1,  0
        ]
      })
      .raw()
      .toBuffer();

    // 2. Calculate variance and maximum edge deviation of pixels
    let sum = 0;
    let sumSquares = 0;
    const n = convolved.length;
    
    for (let i = 0; i < n; i++) {
      const val = convolved[i];
      sum += val;
      sumSquares += val * val;
    }
    
    const mean = sum / n;
    const variance = (sumSquares / n) - (mean * mean);

    // Calculate maximum deviation from the mean to find maximum edge strength
    let maxDev = 0;
    for (let i = 0; i < n; i++) {
      const dev = Math.abs(convolved[i] - mean);
      if (dev > maxDev) {
        maxDev = dev;
      }
    }
    
    // Normalize variance to 0-100 scale.
    let blurScore = Math.min(100, Math.max(0, Math.round(Math.log10(variance + 1) * 25)));

    // If the image contains extremely sharp, high-contrast edges (e.g. digital vector lines,
    // game UI text, or rendering boundaries), it is a clear graphic/screenshot.
    // We override any low-variance score to mark it as sharp (Composite score >= 50).
    if (maxDev > 85 && blurScore < 45) {
      blurScore = 50;
    }

    return blurScore;
  } catch (err) {
    return 80; // default to ok quality on failure
  }
}

/**
 * Generates an 8x8 (64-bit) perceptual hash using blockhash-core.
 */
async function computePerceptualHash(imagePath: string): Promise<string> {
  try {
    // blockhash-core expects raw RGBA data
    const size = 16; // 16x16 blockhash yields 256 bits = 64 characters hex
    const { data, info } = await sharp(imagePath)
      .resize(size, size, { fit: 'fill' })
      .raw()
      .toBuffer({ resolveWithObject: true });
      
    const hashData = bmvbhash({
      width: info.width,
      height: info.height,
      data: new Uint8Array(data)
    }, 16);

    return hashData; // Returns hexadecimal string
  } catch {
    return '';
  }
}

/**
 * Performs complete analysis pipeline on a photo item.
 */
export async function analyzeImage(imagePath: string): Promise<Result<ImageAnalysisResult>> {
  try {
    const img = sharp(imagePath);
    
    const brightnessPromise = computeBrightness(img);
    const blurScorePromise = computeBlurScore(img);
    const hashPromise = computePerceptualHash(imagePath);
    
    const [brightness, blurScore, hash] = await Promise.all([
      brightnessPromise,
      blurScorePromise,
      hashPromise
    ]);
    
    return ok({
      blurScore,
      brightness,
      hash
    });
  } catch (e: any) {
    return fail({
      code: 'UNKNOWN',
      message: e.message || 'Image analysis failed'
    });
  }
}
