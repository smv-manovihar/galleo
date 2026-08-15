import path from "node:path"
import fs from "node:fs"
import { readVideoMetadata, runFfmpeg } from "../infrastructure/video-processor"
import { getVideoFrameCacheDir } from "../infrastructure/app-paths"
import { type Result, ok, fail } from "../../shared/types/results"

export { getVideoFrameCacheDir as getFrameCacheDir } from "../infrastructure/app-paths"

export interface ExtractedFrame {
  id: string
  mediaId: string
  frameIndex: number
  timestampSeconds: number
  framePath: string
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

      const frameDir = getVideoFrameCacheDir()
      const extractedFrames: ExtractedFrame[] = []

      // Identify missing frames that need to be generated
      const missingIndices: number[] = []
      for (let i = 0; i < timestamps.length; i++) {
        const frameId = `${mediaId}_frame_${i}`
        const frameFilename = `${frameId}.jpg`
        const framePath = path.join(frameDir, frameFilename)
        if (!fs.existsSync(framePath)) {
          missingIndices.push(i)
        }
      }

      // Batch generate missing frames in chunks of up to 8 per FFmpeg process
      const BATCH_SIZE = 8
      for (let c = 0; c < missingIndices.length; c += BATCH_SIZE) {
        const chunk = missingIndices.slice(c, c + BATCH_SIZE)
        const args: string[] = []
        for (let j = 0; j < chunk.length; j++) {
          const idx = chunk[j]
          args.push("-ss", String(timestamps[idx]), "-i", videoPath)
        }
        for (let j = 0; j < chunk.length; j++) {
          const idx = chunk[j]
          const framePath = path.join(frameDir, `${mediaId}_frame_${idx}.jpg`)
          args.push(
            "-map",
            `${j}:v:0`,
            "-vframes",
            "1",
            "-vf",
            "scale=448:-2",
            "-y",
            framePath
          )
        }

        let batchError: string | undefined = undefined

        try {
          await runFfmpeg(args, 20000)
        } catch (e: unknown) {
          const err = e as { message?: string }
          batchError = err.message
          console.warn(`[VideoFrameExtractor] Batched extraction failed for chunk (${videoPath}), falling back to single frame:`, batchError)

          // Fallback to single-frame extraction if multi-input mapping encounters non-standard codec
          for (const idx of chunk) {
            const framePath = path.join(frameDir, `${mediaId}_frame_${idx}.jpg`)
            if (!fs.existsSync(framePath)) {
              try {
                await runFfmpeg(
                  [
                    "-ss",
                    String(timestamps[idx]),
                    "-i",
                    videoPath,
                    "-vframes",
                    "1",
                    "-vf",
                    "scale=448:-2",
                    "-y",
                    framePath,
                  ],
                  5000
                )
              } catch (singleErr: unknown) {
                const singleErrObj = singleErr as { message?: string }
                console.warn(`[VideoFrameExtractor] Fallback extraction failed for frame ${idx} (${videoPath}):`, singleErrObj.message)
              }
            }
          }
        }
      }

      for (let i = 0; i < timestamps.length; i++) {
        const ts = timestamps[i]
        const frameId = `${mediaId}_frame_${i}`
        const frameFilename = `${frameId}.jpg`
        const framePath = path.join(frameDir, frameFilename)

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

