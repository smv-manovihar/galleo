import ffmpegPath from "ffmpeg-static"
import ffprobeStatic from "ffprobe-static"
import ffmpeg from "fluent-ffmpeg"
import path from "path"
import fs from "fs"
import { readVideoMetadata } from "../infrastructure/video-processor"
import { getThumbnailCacheDir } from "../infrastructure/image-processor"
import { type Result, ok, fail } from "../../shared/types/results"

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

export interface ExtractedFrame {
  id: string
  mediaId: string
  frameIndex: number
  timestampSeconds: number
  framePath: string
}

export function getFrameCacheDir(): string {
  const baseCacheDir = getThumbnailCacheDir()
  const frameDir = path.join(baseCacheDir, "video_frames")
  if (!fs.existsSync(frameDir)) {
    fs.mkdirSync(frameDir, { recursive: true })
  }
  return frameDir
}

export class VideoFrameExtractorService {
  /**
   * Samples frames from a video file at regular intervals (e.g. every intervalSeconds).
   */
  public async extractVideoFrames(
    videoPath: string,
    mediaId: string,
    intervalSeconds: number = 3
  ): Promise<Result<ExtractedFrame[]>> {
    try {
      const metaRes = await readVideoMetadata(videoPath)
      const duration = metaRes.ok ? metaRes.data.duration : 0
      
      const timestamps: number[] = []
      if (duration <= 0) {
        timestamps.push(0)
      } else {
        for (let ts = 0; ts < duration; ts += intervalSeconds) {
          timestamps.push(Math.round(ts * 10) / 10)
        }
      }

      const frameDir = getFrameCacheDir()
      const extractedFrames: ExtractedFrame[] = []

      for (let i = 0; i < timestamps.length; i++) {
        const ts = timestamps[i]
        const frameId = `${mediaId}_frame_${i}`
        const frameFilename = `${frameId}.jpg`
        const framePath = path.join(frameDir, frameFilename)

        if (!fs.existsSync(framePath)) {
          await new Promise<void>((resolve, reject) => {
            ffmpeg()
              .inputOption(`-ss ${ts}`)
              .input(videoPath)
              .outputOptions(["-vframes 1", "-vf scale=448:-2"])
              .output(framePath)
              .on("end", () => resolve())
              .on("error", (err) => reject(err))
              .run()
          })
        }

        extractedFrames.push({
          id: frameId,
          mediaId,
          frameIndex: i,
          timestampSeconds: ts,
          framePath,
        })
      }

      return ok(extractedFrames)
    } catch (e: unknown) {
      const err = e as { message?: string }
      return fail({
        code: "THUMBNAIL_FAILED",
        path: videoPath,
        reason: err.message || "Failed to extract keyframes from video",
      })
    }
  }
}
