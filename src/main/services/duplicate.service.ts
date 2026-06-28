import { MediaRepository } from '../repositories/media.repository';
import { findDuplicates } from '../core/duplicate-logic';
import { type Result, ok, fail } from '../../shared/types/results';
import type { MediaItem } from '../../shared/types/media';

export class DuplicateService {
  private repository = new MediaRepository();

  /**
   * Scans a list of items for duplicates, updates their DB states, and returns the list of groups.
   */
  public resolveDuplicatesInFolder(
    folderPath: string, 
    maxDistance: number
  ): Result<MediaItem[]> {
    try {
      const items = this.repository.getByFolderPath(folderPath);
      
      // Find and group duplicate photos using blockhash logic
      const groups = findDuplicates(items, maxDistance);
      
      // Reset duplicate states in SQLite
      const updatedItems = items.map(item => ({
        ...item,
        duplicateGroupId: undefined,
        isDuplicate: false,
        isBestInDuplicateGroup: false
      }));

      // Apply duplicate groups
      const groupMap = new Map<string, MediaItem>();
      for (const group of groups) {
        for (const item of group.items) {
          groupMap.set(item.id, item);
        }
      }

      const finalItems = updatedItems.map(item => {
        const dupItem = groupMap.get(item.id);
        return dupItem ? dupItem : item;
      });

      // Save updated items back to DB
      this.repository.upsertMany(finalItems);
      
      return ok(finalItems);
    } catch (e: any) {
      return fail({
        code: 'UNKNOWN',
        message: e.message || 'Duplicate resolution failed'
      });
    }
  }
}
