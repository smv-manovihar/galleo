import ffmpegPath from "ffmpeg-static"
import ffprobeStatic from "ffprobe-static"
import ffmpeg from "fluent-ffmpeg"
import path from "path"
import { existsSync } from "fs"
import { type Result, fail, ok } from "../../shared/types/results"
import { getThumbnailCacheDir } from "./image-processor"

// Set static path for ffmpeg, adjusting for Electron ASAR unpacking in production
let resolvedFfmpegPath = ffmpegPath
if (resolvedFfmpegPath && resolvedFfmpegPath.includes("app.asar")) {
  resolvedFfmpegPath = resolvedFfmpegPath.replace(
    "app.asar",
    "app.asar.unpacked"
  )
}

if (resolvedFfmpegPath) {
  ffmpeg.setFfmpegPath(resolvedFfmpegPath)
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

if (resolvedFfprobePath) {
  ffmpeg.setFfprobePath(resolvedFfprobePath)
}

import { unlink } from "fs/promises"
import { analyzeImage } from "./image-processor"

/**
 * Extracts a representative thumbnail frame from a video file past typical intro cards.
 */
export function generateVideoThumbnail(
  videoPath: string,
  mediaId: string,
  duration?: number
): Promise<Result<string>> {
  return new Promise((resolve) => {
    try {
      const cacheDir = getThumbnailCacheDir()
      const outputFilename = `${mediaId}_v2.webp`
      const outputPath = path.join(cacheDir, outputFilename)

      // Check if thumbnail is already cached
      if (existsSync(outputPath)) {
        return resolve(ok(outputPath))
      }

      // Calculate timestamp past intros (e.g. 20% mark for videos > 5s, capped 3s-30s)
      let sampleTimestamp = 1
      if (duration && duration > 5) {
        sampleTimestamp = Math.min(30, Math.max(3, duration * 0.2))
      } else if (duration && duration > 0) {
        sampleTimestamp = Math.max(0.5, duration * 0.5)
      }

      let killed = false
      const command = ffmpeg()
        .inputOption(`-ss ${sampleTimestamp}`)
        .input(videoPath)
        .outputOptions(["-vframes 1", "-vf scale=1080:-2"])
        .output(outputPath)

      const timeout = setTimeout(() => {
        killed = true
        try {
          command.kill("SIGKILL")
        } catch {
          // ignore kill error
        }
      }, 15000)

      command
        .on("end", () => {
          clearTimeout(timeout)
          resolve(ok(outputPath))
        })
        .on("error", (err) => {
          clearTimeout(timeout)
          try {
            command.kill("SIGKILL")
          } catch {
            // ignore kill error
          }
          resolve(
            fail({
              code: "THUMBNAIL_FAILED",
              path: videoPath,
              reason: killed ? "ffmpeg process timed out" : err.message || "ffmpeg extraction failed",
            })
          )
        })
        .run()
    } catch (e: unknown) {
      const err = e as { message?: string }
      resolve(
        fail({
          code: "THUMBNAIL_FAILED",
          path: videoPath,
          reason: err.message || "Video frame extraction failed",
        })
      )
    }
  })
}

/**
 * Extracts multiple keyframe hashes across a video (25%, 55%, 85% of duration)
 * and concatenates them into a robust multi-frame perceptual hash.
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

    const hashes: string[] = []

    for (let i = 0; i < timestamps.length; i++) {
      const ts = timestamps[i]
      const tempFilename = `temp_${mediaId}_hashframe_${i}.webp`
      const tempPath = path.join(cacheDir, tempFilename)

      const extractSuccess = await new Promise<boolean>((resolve) => {
        let killed = false
        const command = ffmpeg()
          .inputOption(`-ss ${ts}`)
          .input(videoPath)
          .outputOptions(["-vframes 1", "-vf scale=448:-2"])
          .output(tempPath)

        const timeout = setTimeout(() => {
          killed = true
          try {
            command.kill("SIGKILL")
          } catch {
            // ignore
          }
          resolve(false)
        }, 10000)

        command
          .on("end", () => {
            clearTimeout(timeout)
            resolve(true)
          })
          .on("error", () => {
            clearTimeout(timeout)
            if (!killed) {
              try {
                command.kill("SIGKILL")
              } catch {
                // ignore
              }
            }
            resolve(false)
          })
          .run()
      })

      if (extractSuccess && existsSync(tempPath)) {
        try {
          const analysisRes = await analyzeImage(tempPath)
          if (analysisRes.ok) {
            hashes.push(analysisRes.data.hash)
          }
        } catch {
          // ignore
        } finally {
          unlink(tempPath).catch(() => {})
        }
      }
    }

    const expectedCount = timestamps.length
    if (hashes.length < expectedCount) {
      return fail({
        code: "THUMBNAIL_FAILED",
        path: videoPath,
        reason: `Incomplete keyframe extractions for video (${hashes.length}/${expectedCount} succeeded)`,
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
export function readVideoMetadata(
  videoPath: string
): Promise<
  Result<{ duration: number; width: number | null; height: number | null }>
> {
  return new Promise((resolve) => {
    try {
      ffmpeg.ffprobe(videoPath, (err, metadata) => {
        if (err || !metadata || !metadata.streams) {
          return resolve(
            ok({
              duration: 0,
              width: null,
              height: null,
            })
          )
        }

        const videoStream =
          metadata.streams.find(
            (s) => s.codec_type === "video" && !s.disposition?.attached_pic
          ) || metadata.streams.find((s) => s.codec_type === "video")
        const duration = metadata.format?.duration || 0

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
          const ratio = videoStream.display_aspect_ratio as string
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
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          videoStream?.side_data_list?.find((sd: any) => sd.rotation !== undefined)?.rotation
        const rotation = Math.abs(Number(rotationTag) || 0)
        if ((rotation === 90 || rotation === 270) && width && height) {
          const temp = width
          width = height
          height = temp
        }

        resolve(
          ok({
            duration: Number(duration),
            width,
            height,
          })
        )
      })
    } catch {
      // Return defaults on error so scan pipeline doesn't crash
      resolve(
        ok({
          duration: 0,
          width: null,
          height: null,
        })
      )
    }
  })
}
