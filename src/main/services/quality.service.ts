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
    thresholds: QualityThresholds
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
        // Video Quality fallback: Videos aren't checked for blur/brightness by default
        // but we analyze screenshots and dimensions.
        const quality = evaluateQuality({
          blurScore: 100, // sharp fallback
          brightness: 128, // mid brightness fallback
          width,
          height,
          size,
          filename,
          thresholds: {
            ...thresholds,
            screenshotDetection: false, // screenshots are only photos
          },
        })

        return ok({ quality })
      }
    } catch (e: any) {
      return fail({
        code: "UNKNOWN",
        message: e.message || "Quality service item analysis failed",
      })
    }
  }
}
