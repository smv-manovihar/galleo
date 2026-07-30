import type { MediaItem } from "../../shared/types/media"

/** Inline Hamming distance on hex pHash strings (renderer cannot import from main). */
export function hammingDistance(a: string, b: string): number {
  if (a.length !== b.length) return Infinity
  const NIBBLE = new Uint8Array([0, 1, 1, 2, 1, 2, 2, 3, 1, 2, 2, 3, 2, 3, 3, 4])
  let d = 0
  for (let i = 0; i < a.length; i++) {
    d += NIBBLE[parseInt(a[i], 16) ^ parseInt(b[i], 16)]
  }
  return d
}

/**
 * Cache for similarity-sorted item IDs to ensure similarity sorting is computed ONCE
 * per folder/item-set and reused across page visits, card swipes, and filter toggles.
 */
export const similaritySortedIdCache = new Map<string, string[]>()

export function getItemSetFingerprint(items: MediaItem[]): string {
  if (items.length === 0) return ""
  const len = items.length
  const step = Math.max(1, Math.floor(len / 10))
  const samples: string[] = []
  for (let i = 0; i < len; i += step) {
    samples.push(`${items[i].id}-${items[i].hash || ""}`)
  }
  return `${len}_${samples.join("_")}`
}

/**
 * Greedy nearest-neighbor sort: re-orders items so that each consecutive pair
 * has the smallest possible Hamming distance. Items without a hash are appended
 * at the end in their original relative order. This creates a smooth visual
 * gradient through the queue — no threshold, no hard groups.
 */
export function sortBySimilarity(items: MediaItem[]): MediaItem[] {
  const hashed = items.filter((i) => !!i.hash)
  const unhashed = items.filter((i) => !i.hash)
  if (hashed.length === 0) return items

  // Pre-parse hex pHash strings to BigInts for ultra-fast bitwise XOR distance calculation
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
  }

  return [...result, ...unhashed]
}

/**
 * Returns items in similarity-sorted order, computing the order lazily ONCE per item set
 * and reusing the cached order across re-renders, card decisions, filter toggles, and page visits.
 */
export function getSimilaritySortedItems(items: MediaItem[]): MediaItem[] {
  if (items.length <= 1) return items

  // Fast path: if similarityIndex was indexed during scanning, sort directly by index
  if (items.some((i) => i.similarityIndex !== undefined)) {
    return [...items].sort(
      (a, b) => (a.similarityIndex ?? Infinity) - (b.similarityIndex ?? Infinity)
    )
  }

  const key = getItemSetFingerprint(items)
  let sortedIds = similaritySortedIdCache.get(key)

  if (!sortedIds) {
    const sorted = sortBySimilarity(items)
    sortedIds = sorted.map((item) => item.id)
    similaritySortedIdCache.set(key, sortedIds)

    if (similaritySortedIdCache.size > 20) {
      const oldestKey = similaritySortedIdCache.keys().next().value
      if (oldestKey) similaritySortedIdCache.delete(oldestKey)
    }
  }

  const itemMap = new Map<string, MediaItem>()
  for (let i = 0; i < items.length; i++) {
    itemMap.set(items[i].id, items[i])
  }

  const result: MediaItem[] = []
  for (let i = 0; i < sortedIds.length; i++) {
    const item = itemMap.get(sortedIds[i])
    if (item) {
      result.push(item)
      itemMap.delete(sortedIds[i])
    }
  }

  if (itemMap.size > 0) {
    result.push(...itemMap.values())
  }

  return result
}
