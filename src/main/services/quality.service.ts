import { analyzeImage } from "../infrastructure/image-processor"
import { evaluateQuality } from "../core/quality-scoring"
import { type Result, fail, ok } from "../../shared/types/results"
import type { QualityMetrics } from "../../shared/types/media"

interface QualityThresholds {
  blurThreshold: number
  darknessThreshold: number
  screenshotDetection: boolean
  minResolution: number
}

export class QualityService {
  /**
   * Run the quality analysis pipeline on a media item.
   */
  public async analyzeItem(
    filePath: string,
    mediaType: "photo" | "video",
    size: number,
    filename: string,
    width: number | undefined,
    height: number | undefined,
    thresholds: QualityThresholds,
    posterPath?: string
  ): Promise<Result<{ quality: QualityMetrics; hash?: string }>> {
    try {
      if (mediaType === "photo") {
        const analysisRes = await analyzeImage(filePath)
        if (analysisRes.ok === false) {
          return fail(analysisRes.error)
        }

        const { blurScore, brightness, peakBrightness, contrast, hash } =
          analysisRes.data
        const quality = evaluateQuality({
          blurScore,
          brightness,
          peakBrightness,
          contrast,
          width,
          height,
          size,
          filename,
          thresholds,
        })

        return ok({ quality, hash })
      } else {
        let blurScore = 100
        let brightness = 128
        let peakBrightness: number | undefined
        let contrast: number | undefined

        if (posterPath) {
          try {
            const posterRes = await analyzeImage(posterPath)
            if (posterRes.ok) {
              blurScore = posterRes.data.blurScore
              brightness = posterRes.data.brightness
              peakBrightness = posterRes.data.peakBrightness
              contrast = posterRes.data.contrast
            }
          } catch {
            // fallback to default quality on poster read error
          }
        }

        const quality = evaluateQuality({
          blurScore,
          brightness,
          peakBrightness,
          contrast,
          width,
          height,
          size,
          filename,
          thresholds: {
            ...thresholds,
            screenshotDetection: false,
          },
        })

        return ok({ quality })
      }
    } catch (e: unknown) {
      const err = e as { message?: string }
      return fail({
        code: "UNKNOWN",
        message: err.message || "Quality service item analysis failed",
      })
    }
  }
}
