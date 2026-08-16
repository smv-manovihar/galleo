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
 * Groups items by exact content hash and perceptual hash similarity.
 * Uses anchor-based clustering with diameter constraints to prevent
 * runaway transitive chaining (which can falsely lump thousands of loosely
 * related images/videos into a single group).
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
  // This reduces parseInt overhead by 99.99% by doing it once per item instead of inside inner loops
  const parsedItems = candidateItems.map((item) => {
    const hex = item.hash || ""
    const nibbles = new Uint8Array(hex.length)
    for (let i = 0; i < hex.length; i++) {
      nibbles[i] = parseInt(hex[i], 16)
    }
    return { item, nibbles }
  })

  const n = parsedItems.length
  const assigned = new Uint8Array(n) // 0 = unassigned, 1 = assigned to a group

  // Guard against degenerate/flat hashes (e.g. empty or 64+ byte all-zero hashes)
  function isDegenerateHash(nibbles: Uint8Array): boolean {
    if (nibbles.length === 0) return true
    if (nibbles.length >= 64) {
      let allZero = true
      for (let i = 0; i < nibbles.length; i++) {
        if (nibbles[i] !== 0) {
          allZero = false
          break
        }
      }
      if (allZero) return true
    }
    return false
  }

  // Helper to compute perceptual distance between two parsed items
  function getPerceptualDistance(idx1: number, idx2: number): number {
    const p1 = parsedItems[idx1]
    const p2 = parsedItems[idx2]
    const n1 = p1.nibbles
    const n2 = p2.nibbles

    if (n1.length === 0 || n2.length === 0 || n1.length !== n2.length) {
      return -1
    }

    // Do not match degenerate/flat hashes (e.g. all 0s or all Fs) via perceptual comparison
    if (isDegenerateHash(n1) || isDegenerateHash(n2)) {
      return -1
    }

    // Must be same media type (never group a photo with a video)
    if (p1.item.mediaType !== p2.item.mediaType) {
      return -1
    }

    // Duration mismatch check for video
    if (p1.item.mediaType === "video" && p2.item.mediaType === "video") {
      if (p1.item.duration !== undefined && p2.item.duration !== undefined) {
        const durDelta = Math.abs(p1.item.duration - p2.item.duration)
        const allowedTol = Math.max(2, Math.min(p1.item.duration, p2.item.duration) * 0.08)
        if (durDelta > allowedTol) {
          return -1
        }
      }
    }

    const numFrames = Math.max(1, Math.floor(n1.length / 64))
    if (numFrames > 1) {
      // Multi-frame video hash
      let totalDist = 0
      let matchingFrames = 0
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
      const requiredMatches = Math.ceil(numFrames * 0.66)
      if (matchingFrames >= requiredMatches && totalDist <= maxDistance * numFrames) {
        return totalDist
      }
      return -1
    } else {
      let dist = 0
      for (let k = 0; k < n1.length; k++) {
        dist += NIBBLE_BIT_COUNT[n1[k] ^ n2[k]]
        if (dist > maxDistance) return -1
      }
      return dist
    }
  }

  const rawGroups: number[][] = []

  // 1. First Pass: Group exact byte matches (exactHash)
  const exactHashMap = new Map<string, number[]>()
  for (let i = 0; i < n; i++) {
    const eh = parsedItems[i].item.exactHash
    if (eh && eh.length > 0) {
      if (!exactHashMap.has(eh)) exactHashMap.set(eh, [])
      exactHashMap.get(eh)!.push(i)
    }
  }

  for (const indices of exactHashMap.values()) {
    if (indices.length > 1) {
      for (const idx of indices) {
        assigned[idx] = 1
      }
      rawGroups.push(indices)
    }
  }

  // 2. Second Pass: Anchor-based clustering for perceptual similarity
  // Sort candidates by quality score descending so the best quality item acts as the group anchor
  const unassignedOrder = Array.from({ length: n }, (_, i) => i)
    .filter((i) => assigned[i] === 0)
    .sort((a, b) => {
      const itemA = parsedItems[a].item
      const itemB = parsedItems[b].item
      const scoreA = itemA.quality?.compositeScore ?? 0
      const scoreB = itemB.quality?.compositeScore ?? 0
      if (scoreB !== scoreA) return scoreB - scoreA
      const blurA = itemA.quality?.blurScore ?? 0
      const blurB = itemB.quality?.blurScore ?? 0
      if (blurB !== blurA) return blurB - blurA
      const resA = (itemA.width ?? 0) * (itemA.height ?? 0)
      const resB = (itemB.width ?? 0) * (itemB.height ?? 0)
      if (resB !== resA) return resB - resA
      return itemB.size - itemA.size
    })

  for (let step = 0; step < unassignedOrder.length; step++) {
    if (step % 20 === 0) {
      await new Promise((r) => setImmediate(r))
    }

    const anchorIdx = unassignedOrder[step]
    if (assigned[anchorIdx] === 1) continue

    const cluster: number[] = [anchorIdx]

    for (let otherIdx = 0; otherIdx < n; otherIdx++) {
      if (otherIdx === anchorIdx || assigned[otherIdx] === 1) continue

      const distToAnchor = getPerceptualDistance(anchorIdx, otherIdx)
      if (distToAnchor !== -1 && distToAnchor <= maxDistance) {
        // Enforce cluster consistency (clique / diameter check):
        // Candidate must be reasonably close to all existing members in the cluster
        let isConsistentWithCluster = true
        for (let c = 1; c < cluster.length; c++) {
          const distToMember = getPerceptualDistance(cluster[c], otherIdx)
          if (distToMember === -1 || distToMember > maxDistance * 1.5) {
            isConsistentWithCluster = false
            break
          }
        }

        if (isConsistentWithCluster) {
          cluster.push(otherIdx)
        }
      }
    }

    if (cluster.length > 1) {
      for (const idx of cluster) {
        assigned[idx] = 1
      }
      rawGroups.push(cluster)
    }
  }

  const groups: DuplicateGroup[] = []

  for (const indices of rawGroups) {
    if (indices.length < 2) continue

    const groupItems: MediaItem[] = indices.map((idx) => parsedItems[idx].item)
    const anchorItem = parsedItems[indices[0]].item
    const groupId = `group_${anchorItem.id}`

    // Determine the "best" item in the group
    // Best = Highest quality compositeScore, fallback to highest sharpness, fallback to largest resolution, fallback to largest file size
    let bestItem = groupItems[0]
    for (let k = 1; k < groupItems.length; k++) {
      const item = groupItems[k]
      const itemScore = item.quality?.compositeScore ?? 0
      const bestScore = bestItem.quality?.compositeScore ?? 0

      if (itemScore > bestScore) {
        bestItem = item
      } else if (itemScore === bestScore) {
        const itemBlur = item.quality?.blurScore ?? 0
        const bestBlur = bestItem.quality?.blurScore ?? 0
        if (itemBlur > bestBlur) {
          bestItem = item
        } else if (itemBlur === bestBlur) {
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
