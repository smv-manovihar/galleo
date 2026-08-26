import { MediaRepository } from "../repositories/media.repository"
import type { MediaItem } from "../../shared/types/media"
// Pre-computed lookup table for set bits in a nibble (4 bits, 0-15)
const NIBBLE_BIT_COUNT = new Uint8Array([
  0, 1, 1, 2, 1, 2, 2, 3, 1, 2, 2, 3, 2, 3, 3, 4,
])

/**
 * Fast perceptual similarity sort: re-orders items so visually similar items
 * are consecutive. Uses BigInt hash pre-sorting + pre-parsed nibble lookups
 * to run in O(N log N + N*W) time without string/parseInt overhead.
 */
export async function sortBySimilarity(items: MediaItem[]): Promise<MediaItem[]> {
  const hashed = items.filter((i) => !!i.hash)
  const unhashed = items.filter((i) => !i.hash)
  if (hashed.length === 0) return items

  // Pre-parse items with valid BigInt hashes, primary hex strings, and nibble arrays
  const parsed: {
    item: MediaItem
    big: bigint
    primaryNibbles: Uint8Array
    fullNibbles: Uint8Array
    primaryHex: string
    fullHex: string
  }[] = []

  for (const item of hashed) {
    try {
      const hex = item.hash!
      const primaryHex = hex.length >= 128 ? hex.slice(64, 128) : hex.slice(0, 64)

      const fullNibbles = new Uint8Array(hex.length)
      for (let k = 0; k < hex.length; k++) {
        fullNibbles[k] = parseInt(hex[k], 16)
      }

      const primaryStart = hex.length >= 128 ? 64 : 0
      const primaryEnd = hex.length >= 128 ? 128 : Math.min(64, hex.length)
      const primaryNibbles = fullNibbles.subarray(primaryStart, primaryEnd)

      parsed.push({
        item,
        big: BigInt("0x" + primaryHex),
        primaryNibbles,
        fullNibbles,
        primaryHex,
        fullHex: hex,
      })
    } catch {
      unhashed.push(item)
    }
  }

  if (parsed.length === 0) return items

  // Step 1: Initial sort by BigInt perceptual hash value (O(N log N) - ~2ms for 20k items)
  parsed.sort((a, b) => (a.big < b.big ? -1 : a.big > b.big ? 1 : 0))

  // For small collections <= 300, exact greedy TSP is fast enough
  const WINDOW_SIZE = parsed.length > 300 ? 32 : parsed.length
  const n = parsed.length
  const visited = new Uint8Array(n)
  const result: MediaItem[] = []

  let currentIdx = 0
  visited[currentIdx] = 1
  result.push(parsed[currentIdx].item)
  let firstUnvisited = 1

  for (let step = 1; step < n; step++) {
    if (step % 200 === 0) {
      await new Promise((r) => setImmediate(r))
    }
    const currentItem = parsed[currentIdx].item
    let bestIdx = -1
    let bestDist = Infinity

    // Search window centered around current index to find closest visual match
    const searchStart = Math.max(0, currentIdx - WINDOW_SIZE)
    const searchEnd = Math.min(n, currentIdx + WINDOW_SIZE)

    for (let j = searchStart; j < searchEnd; j++) {
      if (visited[j]) continue
      const targetItem = parsed[j].item

      let dist = 0
      const n1 = parsed[currentIdx].fullNibbles
      const n2 = parsed[j].fullNibbles

      if (n1.length === n2.length && n1.length > 64) {
        for (let k = 0; k < n1.length; k++) {
          dist += NIBBLE_BIT_COUNT[n1[k] ^ n2[k]]
        }
      } else {
        const p1 = parsed[currentIdx].primaryNibbles
        const p2 = parsed[j].primaryNibbles
        const len = Math.min(p1.length, p2.length)
        for (let k = 0; k < len; k++) {
          dist += NIBBLE_BIT_COUNT[p1[k] ^ p2[k]]
        }
      }

      // Add distance penalty if both are videos but durations differ significantly (> 10%)
      if (
        currentItem.mediaType === "video" &&
        targetItem.mediaType === "video" &&
        currentItem.duration !== undefined &&
        targetItem.duration !== undefined
      ) {
        const durDelta = Math.abs(currentItem.duration - targetItem.duration)
        const allowed = Math.max(3, Math.max(currentItem.duration, targetItem.duration) * 0.10)
        if (durDelta > allowed) {
          dist += 50 // Penalty for duration mismatch
        }
      }

      if (dist < bestDist) {
        bestDist = dist
        bestIdx = j
        if (dist === 0) break
      }
    }

    // Fallback if all window neighbors visited
    if (bestIdx === -1) {
      for (let j = firstUnvisited; j < n; j++) {
        if (!visited[j]) {
          bestIdx = j
          break
        }
      }
    }

    if (bestIdx !== -1) {
      currentIdx = bestIdx
      visited[currentIdx] = 1
      result.push(parsed[currentIdx].item)
    }

    while (firstUnvisited < n && visited[firstUnvisited]) {
      firstUnvisited++
    }
  }

  return [...result, ...unhashed]
}

export class SimilarityService {
  private repository = new MediaRepository()

  /**
   * Pre-calculates similarity index for items in the specified folder paths
   * during indexing/scanning and saves similarity_index directly to SQLite.
   */
  public async resolveSimilarityInFolders(folderPaths: string[]): Promise<void> {
    try {
      for (const folderPath of folderPaths) {
        const items = this.repository.getByFolderPath(folderPath)
        if (items.length <= 1) continue

        const sorted = await sortBySimilarity(items)
        const updates = sorted.map((item, index) => ({
          id: item.id,
          similarityIndex: index,
        }))

        this.repository.updateSimilarityIndexes(updates)
      }
    } catch {
      // Fail gracefully if similarity index calculation encounters an error
    }
  }
}
