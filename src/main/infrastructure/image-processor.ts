import sharp, { type Sharp } from "sharp"
import fs from "fs/promises"
import { existsSync, mkdirSync } from "fs"
import path from "path"
import { app } from "electron"
import { type Result, fail, ok } from "../../shared/types/results"
import { bmvbhash } from "blockhash-core"

import {
  IMAGE_THUMB_SUFFIX,
  VIDEO_THUMB_SUFFIX,
} from "../../shared/constants"

// Bound Sharp native Libvips C++ memory pool to prevent excessive RAM accumulation while preserving file handle & buffer caching
sharp.cache({ memory: 64, items: 100, files: 10 })

export interface ImageAnalysisResult {
  blurScore: number // 0 - 100
  brightness: number // 0 - 255 (average)
  peakBrightness: number // 0 - 255 (95th percentile)
  contrast: number // 0 - 255 (max - min)
  hash: string // perceptual hash (hex)
}

export function getThumbnailCacheDir(): string {
  let cachePath: string
  try {
    const isDev = !app.isPackaged || process.env.NODE_ENV === "development"
    cachePath = isDev
      // ? path.join(process.cwd(), ".data", "thumbnails")
      ? path.join(app.getPath("userData"), "thumbnails")
      : path.join(app.getPath("userData"), "thumbnails")
  } catch {
    cachePath = path.join(process.cwd(), ".data", "thumbnails")
  }

  if (!existsSync(cachePath)) {
    // Create sync to avoid race conditions
    try {
      mkdirSync(cachePath, { recursive: true })
    } catch {
      // ignore
    }
  }
  return cachePath
}

/**
 * Purges old/stale version thumbnails for a given mediaId to prevent disk bloat.
 */
export async function purgeOldThumbnailVersions(
  cacheDir: string,
  mediaId: string,
  currentFilename: string
): Promise<void> {
  try {
    const files = await fs.readdir(cacheDir)
    for (const file of files) {
      if (
        (file.startsWith(`${mediaId}_`) || file === `${mediaId}.webp`) &&
        file.endsWith(".webp") &&
        file !== currentFilename &&
        !file.includes("_frame_")
      ) {
        try {
          await fs.unlink(path.join(cacheDir, file))
        } catch {
          // ignore unlink error
        }
      }
    }
  } catch {
    // ignore readdir error
  }
}

/**
 * Checks whether a cached thumbnail matches the current canonical format for its media type.
 */
export function isThumbnailCurrent(
  thumbnailPath: string | null | undefined,
  mediaType: "photo" | "video"
): boolean {
  if (!thumbnailPath) return false
  const expectedSuffix =
    mediaType === "video" ? VIDEO_THUMB_SUFFIX : IMAGE_THUMB_SUFFIX
  return thumbnailPath.endsWith(expectedSuffix)
}

/**
 * Generates a thumbnail for the image using sharp and returns the cached path.
 */
export async function generateImageThumbnail(
  imagePath: string,
  mediaId: string
): Promise<Result<string>> {
  try {
    const cacheDir = getThumbnailCacheDir()
    const filename = `${mediaId}${IMAGE_THUMB_SUFFIX}`
    const thumbnailPath = path.join(cacheDir, filename)

    // Check if thumbnail is already cached
    try {
      await fs.access(thumbnailPath)
      return ok(thumbnailPath)
    } catch {
      // ignore
    }

    // Invalidate/purge any previous thumbnail versions for this mediaId
    await purgeOldThumbnailVersions(cacheDir, mediaId, filename)

    // Resize image to 800x800 (high quality retina preview), keep aspect ratio, output as compressed webp
    // .rotate() automatically auto-rotates the image based on EXIF orientation tag
    await sharp(imagePath)
      .rotate()
      .resize({
        width: 800,
        height: 800,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 85 })
      .toFile(thumbnailPath)

    return ok(thumbnailPath)
  } catch (e: unknown) {
    const err = e as Error
    return fail({
      code: "THUMBNAIL_FAILED",
      path: imagePath,
      reason: err.message || "Sharp thumbnail generation failed",
    })
  }
}

interface BrightnessMetrics {
  brightness: number
  peakBrightness: number
  contrast: number
}

/**
 * Computes brightness metrics (average, 95th percentile peak, and contrast).
 * Resizes to 32x32 to get localized luminance grid.
 */
async function computeBrightnessMetrics(
  image: Sharp
): Promise<BrightnessMetrics> {
  try {
    const size = 32
    const { data, info } = await image
      .clone()
      .resize(size, size, { fit: "fill" })
      .raw()
      .toBuffer({ resolveWithObject: true })

    let sum = 0
    const luminances: number[] = []
    const channels = info.channels || 3

    for (let i = 0; i < data.length; i += channels) {
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]
      const luma = Math.round(0.299 * r + 0.587 * g + 0.114 * b)
      sum += luma
      luminances.push(luma)
    }

    const n = luminances.length
    if (n === 0) {
      return { brightness: 128, peakBrightness: 128, contrast: 0 }
    }
    const average = Math.round(sum / n)

    luminances.sort((a, b) => a - b)
    const minBrightness = luminances[0]
    const maxBrightness = luminances[n - 1]
    const contrast = maxBrightness - minBrightness

    const idx95 = Math.min(n - 1, Math.floor(n * 0.95))
    const peakBrightness = luminances[idx95]

    return {
      brightness: average,
      peakBrightness,
      contrast,
    }
  } catch {
    return {
      brightness: 128,
      peakBrightness: 128,
      contrast: 128,
    }
  }
}

/**
 * Computes a sharpness / blur score using the variance of Laplacian method.
 * Uses local patch-based grid variance on an 800x800 downsampled image.
 * Returns a score from 0 (very blurry) to 100 (very sharp).
 */
async function computeBlurScore(image: Sharp): Promise<number> {
  try {
    // 1. Resize to a moderately high resolution (800x800) to keep sharp edge details
    const size = 800
    const convolved = await image
      .clone()
      .resize(size, size, { fit: "cover" }) // Use cover to prevent aspect squishing
      .greyscale()
      // Convolve with standard Laplacian kernel
      .convolve({
        width: 3,
        height: 3,
        kernel: [0, 1, 0, 1, -4, 1, 0, 1, 0],
      })
      .raw()
      .toBuffer()

    // 2. Divide the 800x800 image into a 4x4 grid (16 patches, each 200x200 pixels)
    // This allows identifying if any focal point is sharp (e.g. subject in portraits/bokeh/brush art)
    const patchSize = 200
    const patchCols = 4
    const pixelsPerPatch = patchSize * patchSize

    const patchSums = new Array(16).fill(0)
    const patchSumSquares = new Array(16).fill(0)
    let globalSum = 0

    for (let y = 0; y < size; y++) {
      const patchY = Math.floor(y / patchSize)
      for (let x = 0; x < size; x++) {
        const patchX = Math.floor(x / patchSize)
        const idx = y * size + x
        const val = convolved[idx]

        const patchIdx = patchY * patchCols + patchX
        patchSums[patchIdx] += val
        patchSumSquares[patchIdx] += val * val

        globalSum += val
      }
    }

    // Compute global mean and max deviation from mean to detect sharpest edge strength
    const globalMean = globalSum / convolved.length
    let globalMaxDev = 0
    for (let i = 0; i < convolved.length; i++) {
      const dev = Math.abs(convolved[i] - globalMean)
      if (dev > globalMaxDev) {
        globalMaxDev = dev
      }
    }

    // Find the maximum variance among all 16 patches
    let maxPatchVariance = 0
    for (let p = 0; p < 16; p++) {
      const mean = patchSums[p] / pixelsPerPatch
      const variance = patchSumSquares[p] / pixelsPerPatch - mean * mean
      if (variance > maxPatchVariance) {
        maxPatchVariance = variance
      }
    }

    // Normalize variance to 0-100 scale using logarithmic scaling.
    let blurScore = Math.min(
      100,
      Math.max(0, Math.round(Math.log10(maxPatchVariance + 1) * 25))
    )

    // Boost blur score if there are high-contrast sharp edges anywhere (maxDev > 60)
    // This protects stylized brush art, bokeh portraits, and graphics from false-flagging.
    if (globalMaxDev > 60 && blurScore < 50) {
      const boost = Math.round((globalMaxDev - 60) * 0.75)
      blurScore = Math.min(65, blurScore + boost) // Boost up to a safe "not blurry" score of 65
    }

    return blurScore
  } catch {
    return 80 // default to ok quality on failure
  }
}

/**
 * Generates an 8x8 (64-bit) perceptual hash using blockhash-core.
 */
async function computePerceptualHash(image: Sharp): Promise<string> {
  try {
    // blockhash-core expects raw RGBA data
    const size = 16 // 16x16 blockhash yields 256 bits = 64 characters hex
    const { data, info } = await image
      .clone()
      .resize(size, size, { fit: "fill" })
      .raw()
      .toBuffer({ resolveWithObject: true })

    const hashData = bmvbhash(
      {
        width: info.width,
        height: info.height,
        data: new Uint8Array(data),
      },
      16
    )

    return hashData // Returns hexadecimal string
  } catch {
    return ""
  }
}

/**
 * Performs complete analysis pipeline on a photo item.
 */
export async function analyzeImage(
  imagePath: string
): Promise<Result<ImageAnalysisResult>> {
  try {
    const img = sharp(imagePath).rotate()

    const brightnessMetricsPromise = computeBrightnessMetrics(img)
    const blurScorePromise = computeBlurScore(img)
    const hashPromise = computePerceptualHash(img)

    const [brightnessMetrics, blurScore, hash] = await Promise.all([
      brightnessMetricsPromise,
      blurScorePromise,
      hashPromise,
    ])

    return ok({
      blurScore,
      brightness: brightnessMetrics.brightness,
      peakBrightness: brightnessMetrics.peakBrightness,
      contrast: brightnessMetrics.contrast,
      hash,
    })
  } catch (e: unknown) {
    const err = e as Error
    return fail({
      code: "UNKNOWN",
      message: err.message || "Image analysis failed",
    })
  }
}
