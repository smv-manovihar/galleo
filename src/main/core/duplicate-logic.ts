import type { MediaItem } from '../../shared/types/media';

/**
 * Computes the Hamming distance between two hex strings.
 * Returns -1 if the strings have different lengths or are invalid.
 */
export function hammingDistance(hash1: string | undefined | null, hash2: string | undefined | null): number {
  if (!hash1 || !hash2 || hash1.length !== hash2.length) {
    return -1;
  }

  let distance = 0;
  for (let i = 0; i < hash1.length; i++) {
    const val1 = parseInt(hash1[i], 16);
    const val2 = parseInt(hash2[i], 16);
    if (isNaN(val1) || isNaN(val2)) {
      return -1;
    }
    
    // XOR the nibbles and count set bits
    let xor = val1 ^ val2;
    while (xor > 0) {
      if (xor & 1) distance++;
      xor >>= 1;
    }
  }

  return distance;
}

export interface DuplicateGroup {
  id: string;
  items: MediaItem[];
}

/**
 * Groups items by perceptual hash distance and selects the "best" item in each group.
 * A Hamming distance <= maxDistance qualifies as a duplicate.
 */
export function findDuplicates(items: MediaItem[], maxDistance: number): DuplicateGroup[] {
  // Filter only items that have hashes
  const hashItems = items.filter(item => item.hash && item.hash.length > 0);
  if (hashItems.length === 0) return [];

  const groups: DuplicateGroup[] = [];
  const visited = new Set<string>();

  for (let i = 0; i < hashItems.length; i++) {
    const current = hashItems[i];
    if (visited.has(current.id)) continue;

    const groupItems: MediaItem[] = [current];
    visited.add(current.id);

    // Look for matching duplicates
    for (let j = i + 1; j < hashItems.length; j++) {
      const candidate = hashItems[j];
      if (visited.has(candidate.id)) continue;

      const dist = hammingDistance(current.hash, candidate.hash);
      if (dist !== -1 && dist <= maxDistance) {
        groupItems.push(candidate);
        visited.add(candidate.id);
      }
    }

    // Only save groups that have more than 1 item
    if (groupItems.length > 1) {
      const groupId = `group_${current.id}`;
      
      // Determine the "best" item in the group
      // Best = Highest quality compositeScore, fallback to largest resolution, fallback to largest file size
      let bestItem = groupItems[0];
      for (let k = 1; k < groupItems.length; k++) {
        const item = groupItems[k];
        const itemScore = item.quality?.compositeScore ?? 0;
        const bestScore = bestItem.quality?.compositeScore ?? 0;

        if (itemScore > bestScore) {
          bestItem = item;
        } else if (itemScore === bestScore) {
          const itemRes = (item.width ?? 0) * (item.height ?? 0);
          const bestRes = (bestItem.width ?? 0) * (bestItem.height ?? 0);
          
          if (itemRes > bestRes) {
            bestItem = item;
          } else if (itemRes === bestRes) {
            if (item.size > bestItem.size) {
              bestItem = item;
            }
          }
        }
      }

      // Mark items in the group
      const updatedGroupItems = groupItems.map(item => ({
        ...item,
        duplicateGroupId: groupId,
        isDuplicate: true,
        isBestInDuplicateGroup: item.id === bestItem.id
      }));

      groups.push({
        id: groupId,
        items: updatedGroupItems
      });
    }
  }

  return groups;
}
