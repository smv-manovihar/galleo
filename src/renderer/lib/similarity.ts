import type { MediaItem } from "../../shared/types/media"
import { getNormalizedFilenameBase } from "../../shared/filename-utils"

// Pre-computed lookup table for set bits in a nibble (4 bits, 0-15)
const NIBBLE_BIT_COUNT = new Uint8Array([
  0, 1, 1, 2, 1, 2, 2, 3, 1, 2, 2, 3, 2, 3, 3, 4,
])

/**
 * Computes the Hamming distance between two hex strings.
 * Returns Infinity if lengths mismatch or inputs are invalid.
 */
export function hammingDistance(
  hash1: string | undefined | null,
  hash2: string | undefined | null
): number {
  if (!hash1 || !hash2 || hash1.length !== hash2.length) {
    return Infinity
  }

  let distance = 0
  for (let i = 0; i < hash1.length; i++) {
    const val1 = parseInt(hash1[i], 16)
    const val2 = parseInt(hash2[i], 16)
    if (isNaN(val1) || isNaN(val2)) {
      return Infinity
    }
    distance += NIBBLE_BIT_COUNT[val1 ^ val2]
  }

  return distance
}

/**
 * Checks whether a hash is empty, invalid, or all zeros (degenerate for full-length hashes).
 */
export function isDegenerateHash(hash: string | undefined | null): boolean {
  if (!hash || hash.length === 0) return true
  if (hash.length >= 64) {
    for (let i = 0; i < hash.length; i++) {
      if (hash[i] !== "0") {
        return false
      }
    }
    return true
  }
  return false
}

/**
 * Computes the unified similarity distance between two media items.
 * - Same byte content or exact normalized filename + size: distance 0
 * - Multi-frame video perceptual comparison across keyframes (66% quorum + normalized avg)
 * - Single-frame photo perceptual comparison
 * - Photo-to-video block comparison (detects screenshot / cover art matching a video keyframe)
 * - Shared duplicate group fallback
 */
export function computePerceptualDistance(
  itemA: MediaItem,
  itemB: MediaItem,
  maxDistance: number = DEFAULT_SIMILARITY_RADIUS
): number {
  // 1. Same item
  if (itemA.id === itemB.id) {
    return 0
  }

  // 2. Exact byte-for-byte content hash match
  if (itemA.exactHash && itemB.exactHash && itemA.exactHash === itemB.exactHash) {
    return 0
  }

  // 3. Exact normalized filename base + size match
  if (
    itemA.size > 0 &&
    itemA.size === itemB.size &&
    getNormalizedFilenameBase(itemA.name).toLowerCase() ===
      getNormalizedFilenameBase(itemB.name).toLowerCase()
  ) {
    return 0
  }

  // 4. Video duration mismatch guard for video-to-video comparison
  if (itemA.mediaType === "video" && itemB.mediaType === "video") {
    if (itemA.duration !== undefined && itemB.duration !== undefined) {
      const durDelta = Math.abs(itemA.duration - itemB.duration)
      const allowedTol = Math.max(2, Math.min(itemA.duration, itemB.duration) * 0.10)
      if (durDelta > allowedTol) {
        return Infinity
      }
    }
  }

  const h1 = itemA.hash
  const h2 = itemB.hash

  // 5. Guard against degenerate/missing hashes
  if (isDegenerateHash(h1) || isDegenerateHash(h2)) {
    if (
      itemA.duplicateGroupId &&
      itemB.duplicateGroupId &&
      itemA.duplicateGroupId === itemB.duplicateGroupId
    ) {
      return 1
    }
    return Infinity
  }

  // 6. Cross-media: Photo vs Video block matching (e.g. screenshot or cover art matching a keyframe)
  if (itemA.mediaType !== itemB.mediaType) {
    const photoHash = itemA.mediaType === "photo" ? h1! : h2!
    const videoHash = itemA.mediaType === "video" ? h1! : h2!

    if (photoHash.length === 64 && videoHash.length >= 64) {
      let bestBlockDist = Infinity
      const numBlocks = Math.floor(videoHash.length / 64)
      for (let b = 0; b < numBlocks; b++) {
        const block = videoHash.slice(b * 64, (b + 1) * 64)
        const d = hammingDistance(photoHash, block)
        if (d < bestBlockDist) {
          bestBlockDist = d
        }
      }
      if (bestBlockDist <= maxDistance) {
        // Soft penalty of +4 so same-type matches rank slightly higher
        return Math.min(maxDistance, bestBlockDist + 4)
      }
    }

    if (
      itemA.duplicateGroupId &&
      itemB.duplicateGroupId &&
      itemA.duplicateGroupId === itemB.duplicateGroupId
    ) {
      return Math.min(maxDistance, 10)
    }

    return Infinity
  }

  // 7. Video-to-Video Multi-frame Perceptual Distance (e.g. 192-256 chars = 3-4 frames of 64 hex chars)
  const numFrames1 = Math.max(1, Math.floor(h1!.length / 64))
  const numFrames2 = Math.max(1, Math.floor(h2!.length / 64))

  if (numFrames1 > 1 && numFrames2 > 1 && h1!.length === h2!.length) {
    const numFrames = numFrames1
    let totalDist = 0
    let matchingFrames = 0
    for (let f = 0; f < numFrames; f++) {
      const f1 = h1!.slice(f * 64, (f + 1) * 64)
      const f2 = h2!.slice(f * 64, (f + 1) * 64)
      const fDist = hammingDistance(f1, f2)
      if (fDist === Infinity) return Infinity
      totalDist += fDist
      if (fDist <= maxDistance) {
        matchingFrames++
      }
    }

    const requiredMatches = Math.ceil(numFrames * 0.66)
    if (matchingFrames >= requiredMatches && totalDist <= maxDistance * numFrames) {
      return Math.round(totalDist / numFrames)
    }

    if (
      itemA.duplicateGroupId &&
      itemB.duplicateGroupId &&
      itemA.duplicateGroupId === itemB.duplicateGroupId
    ) {
      return Math.min(maxDistance, 10)
    }

    return Infinity
  }

  // 8. Mixed-length video comparison (e.g. multi-frame 256/192 chars vs legacy 64 chars)
  if (numFrames1 !== numFrames2 && itemA.mediaType === "video" && itemB.mediaType === "video") {
    const longer = h1!.length > h2!.length ? h1! : h2!
    const shorter = h1!.length > h2!.length ? h2! : h1!
    if (longer.length >= 128 && shorter.length === 64) {
      const primaryHex = longer.slice(64, 128)
      const dist = hammingDistance(primaryHex, shorter)
      if (dist <= maxDistance) {
        return dist
      }
    }
  }

  // 9. Single-frame Perceptual Distance (photos or matching single-frame hashes)
  if (h1!.length === h2!.length) {
    const dist = hammingDistance(h1, h2)
    if (dist <= maxDistance) {
      return dist
    }
  }

  // 10. Duplicate Group match fallback
  if (
    itemA.duplicateGroupId &&
    itemB.duplicateGroupId &&
    itemA.duplicateGroupId === itemB.duplicateGroupId
  ) {
    return Math.min(maxDistance, 10)
  }

  return Infinity
}

/**
 * Cache for similarity-sorted item IDs to ensure similarity sorting is computed ONCE
 * per folder/item-set and reused across page visits, card swipes, and filter toggles.
 */
export const similaritySortedIdCache = new Map<string, string[]>()

export function getItemSetFingerprint(items: MediaItem[]): string {
  const len = items.length
  if (len === 0) return ""
  const first = `${items[0].id}-${items[0].hash || ""}`
  const quarter = len > 3 ? items[Math.floor(len / 4)].id : ""
  const mid = len > 1 ? `${items[Math.floor(len / 2)].id}-${items[Math.floor(len / 2)].hash || ""}` : ""
  const threeQuarter = len > 3 ? items[Math.floor((3 * len) / 4)].id : ""
  const last = `${items[len - 1].id}-${items[len - 1].hash || ""}`
  return `${len}_${first}_${quarter}_${mid}_${threeQuarter}_${last}`
}

/**
 * Greedy nearest-neighbor sort: re-orders items so that each consecutive pair
 * has the smallest possible perceptual distance. Uses BigInt pre-sorting + pre-parsed
 * Uint8Array nibble tables for O(N log N + N*W) ultra-fast execution without heap allocations.
 */
export function sortBySimilarity(items: MediaItem[]): MediaItem[] {
  const hashed: MediaItem[] = []
  const unhashed: MediaItem[] = []

  for (const item of items) {
    if (item.hash && !isDegenerateHash(item.hash)) {
      hashed.push(item)
    } else {
      unhashed.push(item)
    }
  }

  if (hashed.length === 0) return items

  // Step 1: Pre-parse hex pHash strings to BigInts and Uint8Array nibble lookups
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

  // Step 2: Pre-sort by BigInt pHash numerical value (O(N log N) - ~2ms for 20k items).
  parsed.sort((a, b) => (a.big < b.big ? -1 : a.big > b.big ? 1 : 0))

  const n = parsed.length
  // Search window centered around current item in pHash-sorted space (bounded to 64 for fast interactive response)
  const WINDOW_SIZE = n > 300 ? 64 : n
  const visited = new Uint8Array(n)
  const result: MediaItem[] = []

  let currentIdx = 0
  visited[currentIdx] = 1
  result.push(parsed[currentIdx].item)
  let firstUnvisited = 1

  for (let step = 1; step < n; step++) {
    const currentPrimary = parsed[currentIdx].primaryNibbles
    const currentItem = parsed[currentIdx].item
    let bestIdx = -1
    let bestDist = Infinity

    // Search window centered around current index in pHash-sorted space
    const searchStart = Math.max(0, currentIdx - WINDOW_SIZE)
    const searchEnd = Math.min(n, currentIdx + WINDOW_SIZE)

    for (let j = searchStart; j < searchEnd; j++) {
      if (visited[j]) continue
      const targetItem = parsed[j].item
      const targetPrimary = parsed[j].primaryNibbles

      // Fast nibble table distance (zero heap allocations)
      let dist = 0
      const compLen = Math.min(currentPrimary.length, targetPrimary.length)
      for (let k = 0; k < compLen; k++) {
        dist += NIBBLE_BIT_COUNT[currentPrimary[k] ^ targetPrimary[k]]
      }

      if (currentItem.mediaType !== targetItem.mediaType) {
        dist += 100
      }

      if (
        currentItem.mediaType === "video" &&
        targetItem.mediaType === "video" &&
        currentItem.duration !== undefined &&
        targetItem.duration !== undefined
      ) {
        const durDelta = Math.abs(currentItem.duration - targetItem.duration)
        const allowed = Math.max(2, Math.min(currentItem.duration, targetItem.duration) * 0.10)
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

    // Fallback if all window neighbors are already visited: check nearest unvisited cluster around firstUnvisited
    if (bestIdx === -1) {
      const fallbackEnd = Math.min(n, firstUnvisited + 16)
      for (let j = firstUnvisited; j < fallbackEnd; j++) {
        if (!visited[j]) {
          const targetPrimary = parsed[j].primaryNibbles
          let dist = 0
          const compLen = Math.min(currentPrimary.length, targetPrimary.length)
          for (let k = 0; k < compLen; k++) {
            dist += NIBBLE_BIT_COUNT[currentPrimary[k] ^ targetPrimary[k]]
          }
          if (dist < bestDist) {
            bestDist = dist
            bestIdx = j
            if (dist <= 2) break
          }
        }
      }
    }

    // Secondary fallback: pick first unvisited directly
    if (bestIdx === -1) {
      bestIdx = firstUnvisited
    }

    if (bestIdx !== -1 && bestIdx < n) {
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

export const DEFAULT_SIMILARITY_RADIUS = 18
export const MIN_SIMILARITY_RADIUS = 8
export const MAX_SIMILARITY_RADIUS = 40
export const SIMILARITY_RADIUS_STEP = 4

/**
 * Finds all media items visually or structurally similar to targetItem.
 * - Computes normalized perceptual distance against candidate items (default maxDistance DEFAULT_SIMILARITY_RADIUS).
 * - Matches exact byte hashes, normalized filename copies, same duplicate groups, and multi-frame videos.
 * - Sorts matches with closest visual distance first and places targetItem at index 0.
 */
export function findSimilarPerceptual(
  targetItem: MediaItem,
  allItems: MediaItem[],
  maxDistance = DEFAULT_SIMILARITY_RADIUS
): MediaItem[] {
  const matches: { item: MediaItem; distance: number }[] = []

  for (const item of allItems) {
    if (item.id === targetItem.id) {
      matches.push({ item, distance: 0 })
      continue
    }

    const dist = computePerceptualDistance(targetItem, item, maxDistance)
    if (dist <= maxDistance) {
      matches.push({ item, distance: dist })
    }
  }

  // Sort by ascending distance (targetItem is distance 0, followed by closest matches)
  matches.sort((a, b) => a.distance - b.distance)

  return matches.map((m) => m.item)
}
