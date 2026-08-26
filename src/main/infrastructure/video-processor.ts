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
 * Extracts a compact representative thumbnail frame from a video file past typical intro cards.
 * Uses fast-seek and downscales to max 480px width for fast decoding and minimal disk space.
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

    // Fast-seek (-ss before -i) allows FFmpeg to seek directly in the container demuxer
    await runFfmpeg(
      [
        "-ss",
        String(sampleTimestamp),
        "-i",
        videoPath,
        "-vframes",
        "1",
        "-vf",
        "scale=480:-2",
        "-q:v",
        "4",
        "-y",
        outputPath,
      ],
      10000
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
 * Extracts up to 4 lightweight representative I-frames (keyframes) from a video.
 * Uses -skip_frame nokey and pict_type=I to grab native container keyframes without decoding delta P/B-frames.
 * Scales to 120px width for fast perceptual hashing.
 */
export async function generateVideoKeyframes(
  videoPath: string,
  mediaId: string
): Promise<Result<string[]>> {
  try {
    const cacheDir = getThumbnailCacheDir()
    // Using %02d to ensure standard sequential sorting and avoid index collisions (temp_id_kframe_01.jpg)
    const outputPattern = path.join(cacheDir, `temp_${mediaId}_kframe_%02d.jpg`)

    // FFmpeg filter:
    // - skip_frame nokey: discard non-keyframes right at demuxer level
    // - select='eq(pict_type,I)': process only I-frames
    // - thumbnail=2: prevents long pipeline buffering blocks while still picking representative frames
    // - scale=120:-2: downscale to 120px micro-layout
    // - vframes 4: limits max output frames to 4
    const ffmpegArgs = [
      "-skip_frame",
      "nokey",
      "-i",
      videoPath,
      "-vf",
      "select='eq(pict_type\\,I)',thumbnail=2,scale=120:-2",
      "-vframes",
      "4",
      "-vsync",
      "vfr",
      "-q:v",
      "8",
      "-y",
      outputPattern,
    ]

    try {
      await runFfmpeg(ffmpegArgs, 8000)
    } catch {
      // Fast single keyframe extraction fallback if custom multi-stream filters fail
      const fallbackArgs = [
        "-skip_frame",
        "nokey",
        "-i",
        videoPath,
        "-vframes",
        "1",
        "-vf",
        "scale=120:-2",
        "-y",
        path.join(cacheDir, `temp_${mediaId}_kframe_01.jpg`),
      ]
      await runFfmpeg(fallbackArgs, 5000).catch(() => {})
    }

    const extractedPaths: string[] = []
    for (let i = 1; i <= 10; i++) {
      const paddedIndex = String(i).padStart(2, "0")
      const expectedPath = path.join(cacheDir, `temp_${mediaId}_kframe_${paddedIndex}.jpg`)
      if (existsSync(expectedPath)) {
        extractedPaths.push(expectedPath)
      }
    }

    if (extractedPaths.length === 0) {
      return fail({
        code: "THUMBNAIL_FAILED",
        path: videoPath,
        reason: "No keyframes could be extracted from video",
      })
    }

    return ok(extractedPaths)
  } catch (e: unknown) {
    const err = e as { message?: string }
    return fail({
      code: "THUMBNAIL_FAILED",
      path: videoPath,
      reason: err.message || "Video keyframe extraction failed",
    })
  }
}

/**
 * Extracts a multi-frame perceptual timeline hash for a video by aggregating hashes
 * of up to 4 extracted keyframes into a continuous 256-character (or 64-character fallback) fingerprint.
 * Cleans up temporary 120px keyframes immediately.
 */
export async function extractVideoMultiHash(
  videoPath: string,
  mediaId: string,
  duration?: number
): Promise<Result<string>> {
  try {
    const keyframesRes = await generateVideoKeyframes(videoPath, mediaId)

    if (keyframesRes.ok && keyframesRes.data.length > 0) {
      const framePaths = keyframesRes.data
      let compositeHash = ""

      for (const framePath of framePaths) {
        try {
          if (existsSync(framePath)) {
            const analysisRes = await analyzeImage(framePath)
            if (analysisRes.ok && analysisRes.data.hash) {
              compositeHash += analysisRes.data.hash
            }
          }
        } catch {
          // ignore single frame failure
        } finally {
          unlink(framePath).catch(() => {})
        }
      }

      if (compositeHash.length >= 64) {
        return ok(compositeHash)
      }
    }

    // Fallback: derive single-frame hash from the cached poster frame if keyframe extraction yielded empty
    const thumbRes = await generateVideoThumbnail(videoPath, mediaId, duration)
    if (!thumbRes.ok) {
      return fail(thumbRes.error)
    }

    const posterPath = thumbRes.data
    const analysisRes = await analyzeImage(posterPath)
    if (!analysisRes.ok) {
      return fail(analysisRes.error)
    }

    return ok(analysisRes.data.hash)
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
        "error",
        "-select_streams",
        "v:0",
        "-show_entries",
        "stream=width,height,coded_width,coded_height,display_aspect_ratio:stream_tags=rotate:stream_side_data=rotation",
        "-show_entries",
        "format=duration",
        "-of",
        "json",
        videoPath,
      ],
      { timeout: 8000, maxBuffer: 5 * 1024 * 1024 }
    )

    const metadata = JSON.parse(stdout) as FfprobeOutput
    if (!metadata) {
      return ok(fallback)
    }

    const videoStream = metadata.streams?.[0]
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
