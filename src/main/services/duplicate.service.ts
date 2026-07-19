import { MediaRepository } from "../repositories/media.repository"
import { findDuplicates } from "../core/duplicate-logic"
import { type Result, ok, fail } from "../../shared/types/results"
import type { MediaItem } from "../../shared/types/media"

export class DuplicateService {
  private repository = new MediaRepository()

  /**
   * Scans a list of items for duplicates, updates their DB states, and returns the list of groups.
   */
  public resolveDuplicatesInFolder(
    folderPath: string,
    maxDistance: number
  ): Result<MediaItem[]> {
    return this.resolveDuplicatesInFolders([folderPath], maxDistance)
  }

  /**
   * Cross-root duplicate resolution: loads items from all provided root paths
   * in a single combined pass so duplicates that span multiple registered root
   * folders are correctly detected.
   */
  public resolveDuplicatesInFolders(
    folderPaths: string[],
    maxDistance: number
  ): Result<MediaItem[]> {
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

      // Find and group duplicate photos using blockhash logic
      const groups = findDuplicates(items, maxDistance)

      // Reset duplicate states in SQLite
      const updatedItems = items.map((item) => ({
        ...item,
        duplicateGroupId: undefined,
        isDuplicate: false,
        isBestInDuplicateGroup: false,
      }))

      // Apply duplicate groups
      const groupMap = new Map<string, MediaItem>()
      for (const group of groups) {
        for (const item of group.items) {
          groupMap.set(item.id, item)
        }
      }

      const finalItems = updatedItems.map((item) => {
        const dupItem = groupMap.get(item.id)
        return dupItem ? dupItem : item
      })

      // Save only updated items whose duplicate state actually changed to avoid massive DB write locking
      const itemsToUpdate = finalItems.filter((finalItem) => {
        const originalItem = items.find((i) => i.id === finalItem.id)
        if (!originalItem) return true
        return (
          originalItem.isDuplicate !== finalItem.isDuplicate ||
          originalItem.duplicateGroupId !== finalItem.duplicateGroupId ||
          originalItem.isBestInDuplicateGroup !==
            finalItem.isBestInDuplicateGroup
        )
      })

      if (itemsToUpdate.length > 0) {
        this.repository.upsertMany(itemsToUpdate)
      }

      return ok(finalItems)
    } catch (e: any) {
      return fail({
        code: "UNKNOWN",
        message: e.message || "Duplicate resolution failed",
      })
    }
  }
}
