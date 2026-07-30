import { MediaRepository } from "../repositories/media.repository"
import { hammingDistance } from "../core/duplicate-logic"
import type { MediaItem } from "../../shared/types/media"

/**
 * Greedy nearest-neighbor sort: re-orders items so that each consecutive pair
 * has the smallest possible Hamming distance.
 */
export function sortBySimilarity(items: MediaItem[]): MediaItem[] {
  const hashed = items.filter((i) => !!i.hash)
  const unhashed = items.filter((i) => !i.hash)
  if (hashed.length === 0) return items

  const bigHashes: (bigint | null)[] = new Array(hashed.length)
  let allBigIntValid = true
  for (let i = 0; i < hashed.length; i++) {
    try {
      bigHashes[i] = BigInt("0x" + hashed[i].hash!)
    } catch {
      allBigIntValid = false
      break
    }
  }

  const visited = new Uint8Array(hashed.length)
  const result: MediaItem[] = []

  let currentIdx = 0
  visited[currentIdx] = 1
  result.push(hashed[currentIdx])

  if (allBigIntValid) {
    for (let step = 1; step < hashed.length; step++) {
      const currentBig = bigHashes[currentIdx]!
      let bestIdx = -1
      let bestDist = Infinity

      for (let j = 0; j < hashed.length; j++) {
        if (visited[j]) continue
        let x = currentBig ^ bigHashes[j]!
        let dist = 0
        while (x > 0n) {
          x &= x - 1n
          dist++
        }
        if (dist < bestDist) {
          bestDist = dist
          bestIdx = j
          if (dist === 0) break
        }
      }

      currentIdx = bestIdx
      visited[currentIdx] = 1
      result.push(hashed[currentIdx])
    }
  } else {
    for (let step = 1; step < hashed.length; step++) {
      const currentHash = hashed[currentIdx].hash!
      let bestIdx = -1
      let bestDist = Infinity
      for (let j = 0; j < hashed.length; j++) {
        if (visited[j]) continue
        const dist = hammingDistance(currentHash, hashed[j].hash!)
        if (dist >= 0 && dist < bestDist) {
          bestDist = dist
          bestIdx = j
          if (dist === 0) break
        }
      }
      currentIdx = bestIdx
      visited[currentIdx] = 1
      result.push(hashed[currentIdx])
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
  public resolveSimilarityInFolders(folderPaths: string[]): void {
    try {
      for (const folderPath of folderPaths) {
        const items = this.repository.getByFolderPath(folderPath)
        if (items.length <= 1) continue

        const sorted = sortBySimilarity(items)
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
