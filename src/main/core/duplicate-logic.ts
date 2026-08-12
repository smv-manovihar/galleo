import type { MediaItem } from "../../shared/types/media"
import { getNormalizedFilenameBase } from "../../shared/filename-utils"

// Pre-computed lookup table for set bits in a nibble (4 bits, 0-15)
const NIBBLE_BIT_COUNT = new Uint8Array([
  0,
  1,
  1,
  2, // 0, 1, 2, 3
  1,
  2,
  2,
  3, // 4, 5, 6, 7
  1,
  2,
  2,
  3, // 8, 9, a, b
  2,
  3,
  3,
  4, // c, d, e, f
])

/**
 * Computes the Hamming distance between two hex strings.
 * Returns -1 if the strings have different lengths or are invalid.
 */
export function hammingDistance(
  hash1: string | undefined | null,
  hash2: string | undefined | null
): number {
  if (!hash1 || !hash2 || hash1.length !== hash2.length) {
    return -1
  }

  let distance = 0
  for (let i = 0; i < hash1.length; i++) {
    const val1 = parseInt(hash1[i], 16)
    const val2 = parseInt(hash2[i], 16)
    if (isNaN(val1) || isNaN(val2)) {
      return -1
    }
    distance += NIBBLE_BIT_COUNT[val1 ^ val2]
  }

  return distance
}

export interface DuplicateGroup {
  id: string
  items: MediaItem[]
}

/**
 * Groups items by perceptual hash distance using union-find for correct
 * transitive grouping (A≈B and B≈C → all three in one group).
 * A Hamming distance <= maxDistance qualifies as a duplicate.
 * Asynchronous with event loop yields to prevent main-thread freezing on large datasets.
 */
export async function findDuplicates(
  items: MediaItem[],
  maxDistance: number
): Promise<DuplicateGroup[]> {
  // Filter items that have either perceptual hash or byte-to-byte exactHash
  const candidateItems = items.filter(
    (item) =>
      (item.hash && item.hash.length > 0) ||
      (item.exactHash && item.exactHash.length > 0)
  )
  if (candidateItems.length === 0) return []

  // Pre-parse hexadecimal hashes into arrays of numeric nibbles (0-15)
  // This reduces parseInt overhead by 99.99% by doing it once per item instead of inside the N^2 loop
  const parsedItems = candidateItems.map((item) => {
    const hex = item.hash || ""
    const nibbles = new Uint8Array(hex.length)
    for (let i = 0; i < hex.length; i++) {
      nibbles[i] = parseInt(hex[i], 16)
    }
    return { item, nibbles }
  })

  const n = parsedItems.length

  // --- Union-Find ---
  const parent = Array.from({ length: n }, (_, i) => i)
  const rank = new Uint16Array(n)

  function find(x: number): number {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]] // path compression (halving)
      x = parent[x]
    }
    return x
  }

  function union(a: number, b: number): void {
    const ra = find(a)
    const rb = find(b)
    if (ra === rb) return
    if (rank[ra] < rank[rb]) {
      parent[ra] = rb
    } else if (rank[ra] > rank[rb]) {
      parent[rb] = ra
    } else {
      parent[rb] = ra
      rank[ra]++
    }
  }

  // Test every pair — union-find handles transitivity automatically
  // Yield to event loop every 10 items so each CPU chunk is tiny (<3ms)
  for (let i = 0; i < n; i++) {
    if (i % 10 === 0) {
      await new Promise((r) => setImmediate(r))
    }
    const item1 = parsedItems[i].item
    const n1 = parsedItems[i].nibbles

    for (let j = i + 1; j < n; j++) {
      if (find(i) === find(j)) continue
      const item2 = parsedItems[j].item
      const n2 = parsedItems[j].nibbles

      // 1. Exact Byte-to-Byte Content Match via exactHash
      if (
        item1.exactHash &&
        item2.exactHash &&
        item1.exactHash === item2.exactHash
      ) {
        union(i, j)
        continue
      }

      // 2. Duration Mismatch Guard for Videos (skip if lengths differ > 10% or > 3s)
      if (
        item1.mediaType === "video" &&
        item2.mediaType === "video" &&
        item1.duration !== undefined &&
        item2.duration !== undefined
      ) {
        const durDelta = Math.abs(item1.duration - item2.duration)
        const allowedTol = Math.max(3, Math.max(item1.duration, item2.duration) * 0.10)
        if (durDelta > allowedTol) {
          continue // Skip: video lengths differ significantly
        }
      }

      // 3. Perceptual Hash Hamming Distance
      if (n1.length !== n2.length) continue

      const numFrames = Math.max(1, Math.floor(n1.length / 64))
      const scaleFactor = numFrames
      const scaledMaxDistance = maxDistance * scaleFactor

      if (numFrames > 1) {
        let matchingFrames = 0
        let totalDist = 0
        for (let f = 0; f < numFrames; f++) {
          let fDist = 0
          const start = f * 64
          const end = start + 64
          for (let k = start; k < end; k++) {
            fDist += NIBBLE_BIT_COUNT[n1[k] ^ n2[k]]
          }
          totalDist += fDist
          if (fDist <= maxDistance) {
            matchingFrames++
          }
        }

        // Require majority of keyframes (e.g. >= 2 of 3) to match individually AND total distance <= scaledMaxDistance
        const requiredMatches = Math.ceil(numFrames / 2)
        if (matchingFrames >= requiredMatches && totalDist <= scaledMaxDistance) {
          union(i, j)
        }
      } else {
        let dist = 0
        for (let k = 0; k < n1.length; k++) {
          dist += NIBBLE_BIT_COUNT[n1[k] ^ n2[k]]
          if (dist > scaledMaxDistance) break // early-exit
        }

        if (dist <= scaledMaxDistance) {
          union(i, j)
        }
      }
    }
  }

  // Collect connected components (groups with >= 2 items)
  const componentMap = new Map<number, number[]>()
  for (let i = 0; i < n; i++) {
    const root = find(i)
    if (!componentMap.has(root)) componentMap.set(root, [])
    componentMap.get(root)!.push(i)
  }

  const groups: DuplicateGroup[] = []

  for (const indices of componentMap.values()) {
    if (indices.length < 2) continue

    const groupItems: MediaItem[] = indices.map((idx) => parsedItems[idx].item)
    const anchorItem = parsedItems[indices[0]].item
    const groupId = `group_${anchorItem.id}`

    // Determine the "best" item in the group
    // Best = Highest quality compositeScore, fallback to largest resolution, fallback to largest file size
    let bestItem = groupItems[0]
    for (let k = 1; k < groupItems.length; k++) {
      const item = groupItems[k]
      const itemScore = item.quality?.compositeScore ?? 0
      const bestScore = bestItem.quality?.compositeScore ?? 0

      if (itemScore > bestScore) {
        bestItem = item
      } else if (itemScore === bestScore) {
        const itemRes = (item.width ?? 0) * (item.height ?? 0)
        const bestRes = (bestItem.width ?? 0) * (bestItem.height ?? 0)

        if (itemRes > bestRes) {
          bestItem = item
        } else if (itemRes === bestRes) {
          if (item.size > bestItem.size) {
            bestItem = item
          }
        }
      }
    }

    // Check if the group is purely exact duplicates (matching exactHash OR same normalized name base and size)
    const isPureExact = (() => {
      if (groupItems.length <= 1) return true
      const firstExactHash = groupItems[0].exactHash
      if (firstExactHash) {
        for (let idx = 1; idx < groupItems.length; idx++) {
          if (groupItems[idx].exactHash !== firstExactHash) return false
        }
        return true
      }
      const firstKey = `${getNormalizedFilenameBase(groupItems[0].name).toLowerCase()}_${groupItems[0].size}`
      for (let idx = 1; idx < groupItems.length; idx++) {
        const item = groupItems[idx]
        const key = `${getNormalizedFilenameBase(item.name).toLowerCase()}_${item.size}`
        if (key !== firstKey) return false
      }
      return true
    })()

    // Mark items in the group
    const updatedGroupItems = groupItems.map((item) => ({
      ...item,
      duplicateGroupId: groupId,
      isDuplicate: true,
      isBestInDuplicateGroup: isPureExact ? item.id === bestItem.id : false,
    }))

    groups.push({
      id: groupId,
      items: updatedGroupItems,
    })
  }

  return groups
}
