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

  // Step 1: Pre-parse hex pHash strings to BigInts
  // For 192-char multi-frame video hashes, extract primary mid-frame (chars 64..128) for uniform BigInt sorting
  const parsed: { item: MediaItem; big: bigint; fullHash: string }[] = []
  for (const item of hashed) {
    try {
      const hex = item.hash!
      const primaryHex = hex.length >= 128 ? hex.slice(64, 128) : hex
      parsed.push({ item, big: BigInt("0x" + primaryHex), fullHash: hex })
    } catch {
      unhashed.push(item)
    }
  }

  if (parsed.length === 0) return items

  // Step 2: Pre-sort by BigInt pHash numerical value (O(N log N) - ~2ms for 20k items).
  // This clusters visually similar photos close to each other in index space.
  parsed.sort((a, b) => (a.big < b.big ? -1 : a.big > b.big ? 1 : 0))

  const n = parsed.length
  // For small collections <= 300, search full array. For large collections, search window around current item.
  const WINDOW_SIZE = n > 300 ? 64 : n
  const visited = new Uint8Array(n)
  const result: MediaItem[] = []

  let currentIdx = 0
  visited[currentIdx] = 1
  result.push(parsed[currentIdx].item)
  let firstUnvisited = 1

  for (let step = 1; step < n; step++) {
    const currentItem = parsed[currentIdx].item
    const currentBig = parsed[currentIdx].big
    let bestIdx = -1
    let bestDist = Infinity

    // Search window centered around current index in pHash-sorted space
    const searchStart = Math.max(0, currentIdx - WINDOW_SIZE)
    const searchEnd = Math.min(n, currentIdx + WINDOW_SIZE)

    for (let j = searchStart; j < searchEnd; j++) {
      if (visited[j]) continue
      const targetItem = parsed[j].item

      let dist = 0
      if (
        parsed[currentIdx].fullHash.length === parsed[j].fullHash.length &&
        parsed[currentIdx].fullHash.length > 64
      ) {
        try {
          let x = BigInt("0x" + parsed[currentIdx].fullHash) ^ BigInt("0x" + parsed[j].fullHash)
          while (x > 0n) {
            x &= x - 1n
            dist++
          }
        } catch {
          let x = currentBig ^ parsed[j].big
          while (x > 0n) {
            x &= x - 1n
            dist++
          }
        }
      } else {
        let x = currentBig ^ parsed[j].big
        while (x > 0n) {
          x &= x - 1n
          dist++
        }
      }

      if (
        currentItem.mediaType === "video" &&
        targetItem.mediaType === "video" &&
        currentItem.duration !== undefined &&
        targetItem.duration !== undefined
      ) {
        const durDelta = Math.abs(currentItem.duration - targetItem.duration)
        const allowed = Math.max(3, Math.max(currentItem.duration, targetItem.duration) * 0.10)
        if (durDelta > allowed) {
          dist += 50
        }
      }

      if (dist < bestDist) {
        bestDist = dist
        bestIdx = j
        if (dist <= 2) break
      }
    }

    // Fallback if all window neighbors are already visited: pick closest unvisited starting from firstUnvisited
    if (bestIdx === -1) {
      for (let j = firstUnvisited; j < n; j++) {
        if (!visited[j]) {
          let x = currentBig ^ parsed[j].big
          let dist = 0
          while (x > 0n) {
            x &= x - 1n
            dist++
          }
          if (dist < bestDist) {
            bestDist = dist
            bestIdx = j
            if (dist <= 2) break
          }
        }
      }
    }

    // Secondary fallback: pick first unvisited
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

/**
 * Finds all media items visually or structurally similar to targetItem.
 * - Computes Hamming distance against hashed candidates (default maxDistance 16).
 * - Matches items sharing the same duplicateGroupId or identical exactHash.
 * - Sorts matches with closest visual distance first and places targetItem at index 0.
 */
export function findSimilarPerceptual(
  targetItem: MediaItem,
  allItems: MediaItem[],
  maxDistance = 16
): MediaItem[] {
  const targetHash = targetItem.hash
  const targetExactHash = targetItem.exactHash
  const targetGroupId = targetItem.duplicateGroupId

  const matches: { item: MediaItem; distance: number }[] = []

  for (const item of allItems) {
    if (item.id === targetItem.id) {
      matches.push({ item, distance: 0 })
      continue
    }

    // Must be same media type (never group a photo with a video)
    if (item.mediaType !== targetItem.mediaType) {
      continue
    }

    let isMatch = false
    let dist = Infinity

    // 1. Exact byte hash match
    if (targetExactHash && item.exactHash && targetExactHash === item.exactHash) {
      isMatch = true
      dist = 0
    }

    // 2. Same duplicate group match
    if (!isMatch && targetGroupId && item.duplicateGroupId && targetGroupId === item.duplicateGroupId) {
      isMatch = true
      dist = 1
    }

    // 3. Perceptual hash distance comparison
    if (targetHash && item.hash) {
      let d = Infinity
      if (targetHash.length === item.hash.length) {
        d = hammingDistance(targetHash, item.hash)
      } else {
        // Compare primary 64-char segment if lengths differ (e.g. video vs image)
        const targetPrimary =
          targetHash.length >= 128
            ? targetHash.slice(64, 128)
            : targetHash.slice(0, 64)
        const itemPrimary =
          item.hash.length >= 128
            ? item.hash.slice(64, 128)
            : item.hash.slice(0, 64)
        if (targetPrimary.length === itemPrimary.length) {
          d = hammingDistance(targetPrimary, itemPrimary)
        }
      }

      if (d !== -1 && d <= maxDistance) {
        isMatch = true
        dist = Math.min(dist, d)
      }
    }

    if (isMatch) {
      matches.push({ item, distance: dist })
    }
  }

  // Sort by ascending distance (targetItem is distance 0)
  matches.sort((a, b) => a.distance - b.distance)

  return matches.map((m) => m.item)
}
