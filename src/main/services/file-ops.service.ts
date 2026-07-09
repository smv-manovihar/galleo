import { shell, BrowserWindow } from 'electron';
import fs from 'fs/promises';
import path from 'path';
import { MediaRepository } from '../repositories/media.repository';
import { fileExists, moveFile, copyFile, moveToTrash, checkAvailableDiskSpace } from '../infrastructure/file-system';
import { type Result, ok, fail } from '../../shared/types/results';
import { type OrganizePreviewItem, type OrganizeProgressPayload, IPC_CHANNELS } from '../../shared/types/ipc';

export class FileOpsService {
  private mediaRepository = new MediaRepository();

  /**
   * Opens the file in the OS default application.
   */
  public async openFile(filePath: string): Promise<Result<void>> {
    try {
      const exists = await fileExists(filePath);
      if (!exists) {
        return fail({ code: 'FILE_NOT_FOUND', path: filePath });
      }
      await shell.openPath(filePath);
      return ok(undefined);
    } catch (e: any) {
      return fail({
        code: 'UNKNOWN',
        message: e.message || 'Opening file failed'
      });
    }
  }

  /**
   * Highlights the file in the default OS file manager (Explorer).
   */
  public async showFile(filePath: string): Promise<Result<void>> {
    try {
      const exists = await fileExists(filePath);
      if (!exists) {
        return fail({ code: 'FILE_NOT_FOUND', path: filePath });
      }
      shell.showItemInFolder(filePath);
      return ok(undefined);
    } catch (e: any) {
      return fail({
        code: 'UNKNOWN',
        message: e.message || 'Highlighting file failed'
      });
    }
  }

  /**
   * Trashes a list of media paths safely (moves them to the OS Recycle Bin).
   */
  public async trashFiles(paths: string[]): Promise<Result<void>> {
    try {
      const failures: string[] = [];
      const successfulPaths: string[] = [];

      for (const p of paths) {
        const res = await moveToTrash(p);
        if (res.ok) {
          successfulPaths.push(p);
        } else {
          failures.push(p);
        }
      }

      // Sync metadata: remove successfully deleted files from local database
      if (successfulPaths.length > 0) {
        this.mediaRepository.deleteMany(successfulPaths);
      }

      if (failures.length > 0) {
        return fail({
          code: 'UNKNOWN',
          message: `Failed to delete ${failures.length} files: ${failures.join(', ')}`
        });
      }

      return ok(undefined);
    } catch (e: any) {
      return fail({
        code: 'UNKNOWN',
        message: e.message || 'Delete operation crashed'
      });
    }
  }

  /**
   * Executes the planned date organization (moving or copying files into new date subfolders).
   */
  public async executeOrganization(
    previewItems: OrganizePreviewItem[],
    preserveOriginals: boolean,
    window: BrowserWindow
  ): Promise<Result<void>> {
    try {
      const totalCount = previewItems.length;
      let processedCount = 0;

      // 1. Calculate total bytes to move/copy for disk space pre-check
      let totalBytes = 0;
      for (const item of previewItems) {
        try {
          const stat = await fs.stat(item.sourcePath);
          totalBytes += stat.size;
        } catch {}
      }

      // Check space on target drive (e.g. check parent of first item)
      if (previewItems.length > 0) {
        const destParent = path.dirname(previewItems[0].targetPath);
        const spaceCheck = await checkAvailableDiskSpace(destParent, totalBytes);
        if (spaceCheck.ok === false) {
          return fail(spaceCheck.error);
        }
      }

      // 2. Process operations one by one (fault-tolerant loop)
      for (const item of previewItems) {
        processedCount++;
        let success = false;
        let errorMsg = undefined;

        try {
          const srcExists = await fileExists(item.sourcePath);
          if (!srcExists) {
            errorMsg = 'Source file missing';
          } else if (item.conflictReason === 'duplicate_source') {
            if (preserveOriginals) {
              // Copy mode: skip copy, keep original in place
              success = true;
            } else {
              // Move mode: trash the duplicate source file
              const res = await moveToTrash(item.sourcePath);
              success = res.ok;
              if (res.ok === false) {
                errorMsg = 'message' in res.error ? res.error.message : res.error.code;
              } else {
                this.mediaRepository.deleteMany([item.sourcePath]);
              }
            }
          } else {
            // Check target folder exists or create it
            const destDir = path.dirname(item.targetPath);
            await fs.mkdir(destDir, { recursive: true });

            if (preserveOriginals) {
              const res = await copyFile(item.sourcePath, item.targetPath);
              success = res.ok;
              if (res.ok === false) errorMsg = res.error.code;
            } else {
              const res = await moveFile(item.sourcePath, item.targetPath);
              success = res.ok;
              if (res.ok === false) errorMsg = res.error.code;
            }

            // 3. Update local SQLite cache
            if (success) {
              if (preserveOriginals) {
                // For copies, we just keep the database pointing to the source,
                // or optionally we could scan the new target.
                // For now, no changes are needed as the original file is still in place.
              } else {
                // For moves, update the item's path inside the database
                // (Using custom query via repository)
                // Let's retrieve the item, update its path, and upsert
                const dbItems = this.mediaRepository.getByFolderPath(path.dirname(item.sourcePath));
                const mediaItem = dbItems.find(i => i.id === item.mediaId);
                if (mediaItem) {
                  // Delete original path from DB first
                  this.mediaRepository.deleteMany([item.sourcePath]);
                  // Insert under new target path
                  const updatedItem = {
                    ...mediaItem,
                    path: item.targetPath
                  };
                  this.mediaRepository.upsertMany([updatedItem]);
                }
              }
            }
          }
        } catch (err: any) {
          success = false;
          errorMsg = err.message || 'Operation failed';
        }

        // Stream progress event to React
        const progressPayload: OrganizeProgressPayload = {
          processedCount,
          totalCount,
          currentFile: path.basename(item.sourcePath),
          success,
          error: errorMsg
        };
        window.webContents.send(IPC_CHANNELS.ORGANIZE_PROGRESS, progressPayload);
      }

      return ok(undefined);
    } catch (e: any) {
      return fail({
        code: 'UNKNOWN',
        message: e.message || 'Organization execution crashed'
      });
    }
  }
}
