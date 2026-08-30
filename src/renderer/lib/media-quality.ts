import type { MediaItem } from "../../shared/types/media"

/**
 * Compares two MediaItems to determine quality rank.
 * Returns negative if 'a' is better quality than 'b', positive if 'b' is better quality than 'a'.
 * Ranking precedence:
 * 1. Composite quality score (severe defects: blurry, dark, tiny, screenshot)
 * 2. Pixel resolution (total width * height: 4K > 1080p > 720p)
 * 3. Sharpness / blurScore (for burst shots of identical resolution)
 * 4. File size (less compression / higher bitrate)
 * 5. Date / name tiebreaker
 */
export function compareMediaQuality(a: MediaItem, b: MediaItem): number {
  const scoreA = a.quality?.compositeScore ?? 0
  const scoreB = b.quality?.compositeScore ?? 0
  if (scoreB !== scoreA) {
    return scoreB - scoreA
  }

  const resA = (a.width ?? 0) * (a.height ?? 0)
  const resB = (b.width ?? 0) * (b.height ?? 0)
  if (resB !== resA) {
    return resB - resA
  }

  const blurA = a.quality?.blurScore ?? 0
  const blurB = b.quality?.blurScore ?? 0
  if (blurB !== blurA) {
    return blurB - blurA
  }

  if (b.size !== a.size) {
    return b.size - a.size
  }

  return (b.dateTarget || b.dateAdded || "").localeCompare(a.dateTarget || a.dateAdded || "")
}
