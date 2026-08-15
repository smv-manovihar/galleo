import { execFile } from "node:child_process"
import { promisify } from "node:util"
import path from "node:path"
import { existsSync } from "node:fs"
import { unlink } from "node:fs/promises"
import ffmpegPath from "ffmpeg-static"
import ffprobeStatic from "ffprobe-static"
import { type Result, fail, ok } from "../../shared/types/results"
import { getThumbnailCacheDir, purgeOldThumbnailVersions } from "./image-processor"
import { VIDEO_THUMB_SUFFIX } from "../../shared/constants"
import { analyzeImage } from "./image-processor"

const execFileAsync = promisify(execFile)

// Set static path for ffmpeg, adjusting for Electron ASAR unpacking in production
let resolvedFfmpegPath = ffmpegPath
if (resolvedFfmpegPath && resolvedFfmpegPath.includes("app.asar")) {
  resolvedFfmpegPath = resolvedFfmpegPath.replace(
    "app.asar",
    "app.asar.unpacked"
  )
}

const rawFfprobePath =
  typeof ffprobeStatic === "string"
    ? ffprobeStatic
    : (ffprobeStatic as { path?: string })?.path
let resolvedFfprobePath = rawFfprobePath
if (resolvedFfprobePath && resolvedFfprobePath.includes("app.asar")) {
  resolvedFfprobePath = resolvedFfprobePath.replace(
    "app.asar",
    "app.asar.unpacked"
  )
}

export function getFfmpegPath(): string | null {
  return resolvedFfmpegPath || null
}

export function getFfprobePath(): string | null {
  return resolvedFfprobePath || null
}

export async function runFfmpeg(
  args: string[],
  timeoutMs: number = 15000
): Promise<void> {
  const binary = getFfmpegPath()
  if (!binary) {
    throw new Error("FFmpeg binary not found")
  }
  await execFileAsync(binary, args, {
    timeout: timeoutMs,
    maxBuffer: 10 * 1024 * 1024,
  })
}

interface FfprobeStream {
  codec_type?: string
  width?: number
  height?: number
  coded_width?: number
  coded_height?: number
  display_aspect_ratio?: string
  disposition?: {
    attached_pic?: number
    [key: string]: unknown
  }
  tags?: {
    rotate?: string | number
    [key: string]: unknown
  }
  side_data_list?: Array<{
    rotation?: number
    [key: string]: unknown
  }>
  [key: string]: unknown
}

interface FfprobeFormat {
  duration?: string | number
  [key: string]: unknown
}

interface FfprobeOutput {
  streams?: FfprobeStream[]
  format?: FfprobeFormat
}

/**
 * Extracts a representative thumbnail frame from a video file past typical intro cards.
 */
export async function generateVideoThumbnail(
  videoPath: string,
  mediaId: string,
  duration?: number
): Promise<Result<string>> {
  try {
    const cacheDir = getThumbnailCacheDir()
    const outputFilename = `${mediaId}${VIDEO_THUMB_SUFFIX}`
    const outputPath = path.join(cacheDir, outputFilename)

    // Check if thumbnail is already cached
    if (existsSync(outputPath)) {
      return ok(outputPath)
    }

    // Invalidate/purge any previous thumbnail versions for this mediaId
    purgeOldThumbnailVersions(cacheDir, mediaId, outputFilename).catch(() => {})

    // Calculate timestamp past intros (e.g. 20% mark for videos > 5s, capped 3s-30s)
    let sampleTimestamp = 1
    if (duration && duration > 5) {
      sampleTimestamp = Math.min(30, Math.max(3, duration * 0.2))
    } else if (duration && duration > 0) {
      sampleTimestamp = Math.max(0.5, duration * 0.5)
    }

    await runFfmpeg(
      [
        "-ss",
        String(sampleTimestamp),
        "-i",
        videoPath,
        "-vframes",
        "1",
        "-vf",
        "scale=1080:-2",
        "-y",
        outputPath,
      ],
      15000
    )

    if (!existsSync(outputPath)) {
      return fail({
        code: "THUMBNAIL_FAILED",
        path: videoPath,
        reason: "Thumbnail output file was not generated",
      })
    }

    return ok(outputPath)
  } catch (e: unknown) {
    const err = e as { message?: string }
    return fail({
      code: "THUMBNAIL_FAILED",
      path: videoPath,
      reason: err.message || "Video frame extraction failed",
    })
  }
}

/**
 * Extracts multiple keyframe hashes across a video (25%, 55%, 85% of duration)
 * and concatenates them into a robust multi-frame perceptual hash in a single batched FFmpeg run.
 */
export async function extractVideoMultiHash(
  videoPath: string,
  mediaId: string,
  duration?: number
): Promise<Result<string>> {
  try {
    const cacheDir = getThumbnailCacheDir()
    const timestamps: number[] = []

    if (duration && duration > 5) {
      timestamps.push(
        Math.max(1, Math.round(duration * 0.25 * 10) / 10),
        Math.round(duration * 0.55 * 10) / 10,
        Math.min(Math.max(1, duration - 1), Math.round(duration * 0.85 * 10) / 10)
      )
    } else if (duration && duration > 0) {
      timestamps.push(Math.max(0.5, Math.round(duration * 0.5 * 10) / 10))
    } else {
      timestamps.push(1)
    }

    const tempPaths: string[] = timestamps.map((_, i) =>
      path.join(cacheDir, `temp_${mediaId}_hashframe_${i}.webp`)
    )

    // Build a single batched FFmpeg command with fast-seek multi-inputs
    const ffmpegArgs: string[] = []
    for (let i = 0; i < timestamps.length; i++) {
      ffmpegArgs.push("-ss", String(timestamps[i]), "-i", videoPath)
    }
    for (let i = 0; i < timestamps.length; i++) {
      ffmpegArgs.push(
        "-map",
        `${i}:v:0`,
        "-vframes",
        "1",
        "-vf",
        "scale=448:-2",
        "-y",
        tempPaths[i]
      )
    }

    let lastError: string | undefined = undefined

    try {
      await runFfmpeg(ffmpegArgs, 15000)
    } catch (e: unknown) {
      const err = e as { message?: string }
      lastError = err.message
      console.warn(`[VideoProcessor] Batched multi-frame extraction failed for ${videoPath}, falling back to single-frame extraction:`, lastError)

      // Fallback to individual extraction if multi-input stream mapping encounters non-standard codec
      for (let i = 0; i < timestamps.length; i++) {
        if (!existsSync(tempPaths[i])) {
          try {
            await runFfmpeg(
              [
                "-ss",
                String(timestamps[i]),
                "-i",
                videoPath,
                "-vframes",
                "1",
                "-vf",
                "scale=448:-2",
                "-y",
                tempPaths[i],
              ],
              5000
            )
          } catch (singleErr: unknown) {
            const errObj = singleErr as { message?: string }
            lastError = errObj.message || lastError
            console.warn(`[VideoProcessor] Fallback frame extraction failed for frame ${i} (${videoPath}):`, errObj.message)
          }
        }
      }
    }

    const hashes: string[] = []
    try {
      for (const tempPath of tempPaths) {
        if (existsSync(tempPath)) {
          const analysisRes = await analyzeImage(tempPath)
          if (analysisRes.ok) {
            hashes.push(analysisRes.data.hash)
          }
        }
      }
    } finally {
      for (const tempPath of tempPaths) {
        unlink(tempPath).catch(() => {})
      }
    }

    const expectedCount = timestamps.length
    if (hashes.length < expectedCount) {
      return fail({
        code: "THUMBNAIL_FAILED",
        path: videoPath,
        reason: lastError || `Incomplete keyframe extractions for video (${hashes.length}/${expectedCount} succeeded)`,
      })
    }

    // Concatenate frame pHashes into composite hash
    return ok(hashes.join(""))
  } catch (e: unknown) {
    const err = e as { message?: string }
    return fail({
      code: "THUMBNAIL_FAILED",
      path: videoPath,
      reason: err.message || "Video multi-hash extraction failed",
    })
  }
}

/**
 * Extracts metadata for a video file (duration, dimensions).
 */
export async function readVideoMetadata(
  videoPath: string
): Promise<
  Result<{ duration: number; width: number | null; height: number | null }>
> {
  const fallback = {
    duration: 0,
    width: null,
    height: null,
  }

  const binary = getFfprobePath()
  if (!binary) {
    return ok(fallback)
  }

  try {
    const { stdout } = await execFileAsync(
      binary,
      [
        "-v",
        "quiet",
        "-print_format",
        "json",
        "-show_format",
        "-show_streams",
        videoPath,
      ],
      { timeout: 10000, maxBuffer: 10 * 1024 * 1024 }
    )

    const metadata = JSON.parse(stdout) as FfprobeOutput
    if (!metadata || !metadata.streams) {
      return ok(fallback)
    }

    const videoStream =
      metadata.streams.find(
        (s) => s.codec_type === "video" && !s.disposition?.attached_pic
      ) || metadata.streams.find((s) => s.codec_type === "video")
    const duration = Number(metadata.format?.duration) || 0

    // Tier 1: primary display dimensions
    let width: number | null =
      videoStream?.width && videoStream.width > 0
        ? Number(videoStream.width)
        : null
    let height: number | null =
      videoStream?.height && videoStream.height > 0
        ? Number(videoStream.height)
        : null

    // Tier 2: coded dimensions (some codecs report 0 on width/height but not coded_*)
    if (
      !width &&
      videoStream?.coded_width &&
      Number(videoStream.coded_width) > 0
    ) {
      width = Number(videoStream.coded_width)
    }
    if (
      !height &&
      videoStream?.coded_height &&
      Number(videoStream.coded_height) > 0
    ) {
      height = Number(videoStream.coded_height)
    }

    // Tier 3: derive from display_aspect_ratio if one dimension is still missing
    if (videoStream?.display_aspect_ratio && (width || height)) {
      const ratio = videoStream.display_aspect_ratio
      const parts = ratio.split(":").map(Number)
      if (parts.length === 2 && parts[0] > 0 && parts[1] > 0) {
        if (width && !height)
          height = Math.round((width * parts[1]) / parts[0])
        if (height && !width)
          width = Math.round((height * parts[0]) / parts[1])
      }
    }

    // Tier 4: Account for video rotation tags (e.g. mobile portrait videos rotated 90 or 270 degrees)
    const rotationTag =
      videoStream?.tags?.rotate ||
      videoStream?.side_data_list?.find((sd) => sd.rotation !== undefined)?.rotation
    const rotation = Math.abs(Number(rotationTag) || 0)
    if ((rotation === 90 || rotation === 270) && width && height) {
      const temp = width
      width = height
      height = temp
    }

    return ok({
      duration: Number(duration),
      width,
      height,
    })
  } catch {
    // Return defaults on error so scan pipeline doesn't crash
    return ok(fallback)
  }
}
