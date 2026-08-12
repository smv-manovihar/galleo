import { MediaRepository } from "../repositories/media.repository"
import { findDuplicates } from "../core/duplicate-logic"
import { type Result, ok, fail } from "../../shared/types/results"
import type { MediaItem } from "../../shared/types/media"

export class DuplicateService {
  private repository = new MediaRepository()

  /**
   * Scans a list of items for duplicates, updates their DB states, and returns the list of groups.
   */
  public async resolveDuplicatesInFolder(
    folderPath: string,
    maxDistance: number
  ): Promise<Result<MediaItem[]>> {
    return this.resolveDuplicatesInFolders([folderPath], maxDistance)
  }

  /**
   * Cross-root duplicate resolution: loads items from all provided root paths
   * in a single combined pass so duplicates that span multiple registered root
   * folders are correctly detected.
   */
  public async resolveDuplicatesInFolders(
    folderPaths: string[],
    maxDistance: number
  ): Promise<Result<MediaItem[]>> {
    try {
      // Load all items from all roots combined (deduplicating by id)
      const itemMap = new Map<string, MediaItem>()
      for (const folderPath of folderPaths) {
        const items = this.repository.getByFolderPath(folderPath)
        for (const item of items) {
          itemMap.set(item.id, item)
        }
      }
      const items = Array.from(itemMap.values())
      return await this.resolveDuplicatesForItems(items, maxDistance)
    } catch (e: unknown) {
      const err = e as { message?: string }
      return fail({
        code: "UNKNOWN",
        message: err.message || "Duplicate resolution failed",
      })
    }
  }

  /**
   * Resolves duplicates for an explicit array of MediaItems using multi-tier
   * exact content hashing + multi-frame perceptual hashing + duration guarding.
   */
  public async resolveDuplicatesForItems(
    items: MediaItem[],
    maxDistance: number
  ): Promise<Result<MediaItem[]>> {
    try {
      // Find and group duplicate media (exact byte matches + multi-frame pHash)
      const groups = await findDuplicates(items, maxDistance)

      // Map groups by item ID
      const groupMap = new Map<string, MediaItem>()
      for (const group of groups) {
        for (const dupItem of group.items) {
          groupMap.set(dupItem.id, dupItem)
        }
      }

      // Build updated items map
      const originalMap = new Map(items.map((i) => [i.id, i]))
      const itemsToUpdate: MediaItem[] = []

      const allFinalItems: MediaItem[] = []
      for (const item of items) {
        const dupItem = groupMap.get(item.id)
        const finalItem: MediaItem = dupItem
          ? dupItem
          : {
              ...item,
              duplicateGroupId: undefined,
              isDuplicate: false,
              isBestInDuplicateGroup: false,
            }

        allFinalItems.push(finalItem)

        const orig = originalMap.get(item.id)
        if (
          !orig ||
          orig.isDuplicate !== finalItem.isDuplicate ||
          orig.duplicateGroupId !== finalItem.duplicateGroupId ||
          orig.isBestInDuplicateGroup !== finalItem.isBestInDuplicateGroup
        ) {
          itemsToUpdate.push(finalItem)
        }
      }

      if (itemsToUpdate.length > 0) {
        this.repository.upsertMany(itemsToUpdate)
      }

      return ok(allFinalItems)
    } catch (e: unknown) {
      const err = e as { message?: string }
      return fail({
        code: "UNKNOWN",
        message: err.message || "Duplicate resolution failed",
      })
    }
  }
}
