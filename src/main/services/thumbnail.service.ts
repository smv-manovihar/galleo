import { generateImageThumbnail } from "../infrastructure/image-processor"
import { generateVideoThumbnail } from "../infrastructure/video-processor"
import { type Result, fail } from "../../shared/types/results"
import type { MediaType } from "../../shared/types/media"

export class ThumbnailService {
  /**
   * Safe wrapper to generate and retrieve cached thumbnail path for photos or videos.
   */
  public async getOrCreateThumbnail(
    filePath: string,
    mediaId: string,
    mediaType: MediaType,
    duration?: number
  ): Promise<Result<string>> {
    try {
      if (mediaType === "photo") {
        return await generateImageThumbnail(filePath, mediaId)
      } else {
        return await generateVideoThumbnail(filePath, mediaId, duration)
      }
    } catch (e: unknown) {
      const err = e as { message?: string }
      return fail({
        code: "THUMBNAIL_FAILED",
        path: filePath,
        reason: err.message || "Thumbnail service failure",
      })
    }
  }
}
