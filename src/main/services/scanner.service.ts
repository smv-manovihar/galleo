import { BrowserWindow } from 'electron';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { MediaRepository } from '../repositories/media.repository';
import { SettingsService } from './settings.service';
import { MetadataService, type ScanFileData } from './metadata.service';
import { QualityService } from './quality.service';
import { ThumbnailService } from './thumbnail.service';
import { DuplicateService } from './duplicate.service';
import { analyzeImage } from '../infrastructure/image-processor';
import { type Result, ok, fail } from '../../shared/types/results';
import type { MediaItem } from '../../shared/types/media';
import { IPC_CHANNELS, type ScanProgressPayload } from '../../shared/types/ipc';

export class ScannerService {
  private mediaRepository = new MediaRepository();
  private settingsService = new SettingsService();
  private metadataService = new MetadataService();
  private qualityService = new QualityService();
  private thumbnailService = new ThumbnailService();
  private duplicateService = new DuplicateService();

  private isScanning = false;
  private isCancelled = false;

  public cancelScan(): void {
    if (this.isScanning) {
      this.isCancelled = true;
    }
  }

  /**
   * Main scan orchestration method. Recursively scans folders, processes files, and updates DB/UI.
   */
  public async scanFolders(
    rootPaths: string[],
    window: BrowserWindow,
    forceRescan: boolean = false
  ): Promise<Result<void>> {
    if (this.isScanning) {
      return fail({ code: 'UNKNOWN', message: 'Scan already in progress' });
    }

    this.isScanning = true;
    this.isCancelled = false;

    try {
      const settings = this.settingsService.getSettings();
      const supportedExtensions = new Set(
        settings.scanning.supportedExtensions.map(ext => ext.toLowerCase())
      );

      const excludePatterns = settings.scanning.excludePatterns;

      // 1. Discover all file paths asynchronously
      const scanList: ScanFileData[] = [];

      for (const root of rootPaths) {
        if (this.isCancelled) break;
        await this.discoverFiles(root, supportedExtensions, excludePatterns, scanList);
      }

      // 2. Build cacheMap ONCE from ALL root paths before processing begins.
      //    This ensures cache hits work correctly for multi-root scans.
      const cacheMap = new Map<string, MediaItem>();
      if (!forceRescan) {
        for (const root of rootPaths) {
          const dbItems = this.mediaRepository.getByFolderPath(root);
          for (const item of dbItems) {
            cacheMap.set(item.path.toLowerCase(), item);
          }
        }
      }

      // Track discovered paths for pruning deleted files later
      const discoveredPaths = new Set<string>(scanList.map(f => f.path.toLowerCase()));

      if (!this.isCancelled) {
        const totalCount = scanList.length;
        let scannedCount = 0;
        const batchSize = settings.performance.scanBatchSize || 50;
        const concurrency = Math.max(1, settings.performance.maxConcurrentOps || 4);

        // 3. Process discovered files in batches, with up to `concurrency` files in-flight at once
        for (let i = 0; i < totalCount; i += batchSize) {
          if (this.isCancelled) break;

          const batch = scanList.slice(i, i + batchSize);
          const processedItems: MediaItem[] = [];

          await this.processWithConcurrency(batch, concurrency, async (file) => {
            if (this.isCancelled) return;

            try {
              const cached = cacheMap.get(file.path.toLowerCase());
              const isOldThumb = cached && cached.thumbnailPath && !cached.thumbnailPath.endsWith('_v2.webp');
              // Cache hit: size AND mtime both match, and the thumbnail format is current
              if (
                cached &&
                cached.size === file.size &&
                cached.dateModified === file.mtime &&
                !isOldThumb
              ) {
                scannedCount++;
                window.webContents.send(IPC_CHANNELS.SCAN_PROGRESS, {
                  scannedCount,
                  totalCount,
                  currentFile: file.name,
                  items: []
                });
                return;
              }

              // Cache miss: extract metadata, run quality, and generate thumbnail
              const metaRes = await this.metadataService.extractMetadata(file);
              if (!metaRes.ok) {
                scannedCount++;
                window.webContents.send(IPC_CHANNELS.SCAN_PROGRESS, {
                  scannedCount,
                  totalCount,
                  currentFile: file.name,
                  items: []
                });
                return;
              }

              const meta = metaRes.data;

              // Create compressed thumbnail cache file FIRST to allow video hash generation from thumbnail frame
              let thumbnailPath = undefined;
              const thumbRes = await this.thumbnailService.getOrCreateThumbnail(
                file.path,
                file.id,
                file.mediaType
              );
              if (thumbRes.ok) {
                thumbnailPath = thumbRes.data;
              }

              // Analyze quality metrics (blur, darkness, screenshot, composite score)
              const qualityRes = await this.qualityService.analyzeItem(
                file.path,
                file.mediaType,
                file.size,
                file.name,
                meta.width,
                meta.height,
                settings.quality
              );

              let quality = undefined;
              let hash = undefined;
              if (qualityRes.ok) {
                quality = qualityRes.data.quality;
                hash = qualityRes.data.hash;
              }

              // For videos, derive the perceptual hash from the generated thumbnail frame
              if (file.mediaType === 'video' && thumbnailPath) {
                try {
                  const analysisRes = await analyzeImage(thumbnailPath);
                  if (analysisRes.ok) {
                    hash = analysisRes.data.hash;
                  }
                } catch {
                  // Fail silently — keep hash undefined
                }
              }

              const item: MediaItem = {
                id: file.id,
                path: file.path,
                name: file.name,
                size: file.size,
                extension: file.extension,
                mediaType: file.mediaType,
                width: meta.width,
                height: meta.height,
                dateAdded: cached?.dateAdded ?? new Date().toISOString(),
                dateOriginal: meta.dateOriginal ?? undefined,
                dateInferred: meta.dateInferred ?? undefined,
                dateFileSystem: meta.dateFileSystem ?? new Date().toISOString(),
                dateTarget: meta.dateTarget ?? new Date().toISOString(),
                dateTargetSource: meta.dateTargetSource ?? 'filesystem',
                hash,
                thumbnailPath,
                dateModified: file.mtime,
                quality,
                isDuplicate: false,
                isBestInDuplicateGroup: false,
                // Preserve existing review state for changed files so user's decisions aren't reset
                reviewState: cached?.reviewState ?? 'pending',
                reviewedAt: cached?.reviewedAt
              };

              processedItems.push(item);
              scannedCount++;

              window.webContents.send(IPC_CHANNELS.SCAN_PROGRESS, {
                scannedCount,
                totalCount,
                currentFile: file.name,
                items: []
              });
            } catch {
              scannedCount++;
              window.webContents.send(IPC_CHANNELS.SCAN_PROGRESS, {
                scannedCount,
                totalCount,
                currentFile: file.name,
                items: []
              });
            }
          });

          // Save batch to SQLite and stream new items to the frontend
          if (processedItems.length > 0) {
            this.mediaRepository.upsertMany(processedItems);

            const payload: ScanProgressPayload = {
              scannedCount,
              totalCount,
              currentFile: batch[batch.length - 1]?.name,
              items: processedItems
            };
            window.webContents.send(IPC_CHANNELS.SCAN_PROGRESS, payload);
          }
        }
      }

      // 4. Prune files that were removed from disk since the last scan.
      //    Compare the discovered paths against every path in the DB for each root.
      if (!this.isCancelled) {
        const deletedPaths: string[] = [];
        for (const root of rootPaths) {
          const dbItems = this.mediaRepository.getByFolderPath(root);
          for (const dbItem of dbItems) {
            if (!discoveredPaths.has(dbItem.path.toLowerCase())) {
              deletedPaths.push(dbItem.path);
            }
          }
        }
        if (deletedPaths.length > 0) {
          this.mediaRepository.deleteMany(deletedPaths);
        }
      }

      // 5. Post-scan duplicate analysis across all scanned roots
      for (const root of rootPaths) {
        this.duplicateService.resolveDuplicatesInFolder(
          root,
          settings.quality.duplicateHashDistance
        );
      }

      window.webContents.send(IPC_CHANNELS.SCAN_COMPLETE);

      this.isScanning = false;
      return ok(undefined);
    } catch (e: any) {
      this.isScanning = false;
      return fail({
        code: 'UNKNOWN',
        message: e.message || 'Scanning process crashed'
      });
    }
  }

  /**
   * Runs up to `concurrency` async tasks at once over an array of items.
   */
  private async processWithConcurrency<T>(
    items: T[],
    concurrency: number,
    fn: (item: T) => Promise<void>
  ): Promise<void> {
    let idx = 0;
    const worker = async () => {
      while (idx < items.length) {
        const item = items[idx++];
        await fn(item);
      }
    };
    await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  }

  /**
   * Helper to recursively traverse directories and discover media files.
   * Uses an iterative stack approach to avoid Call Stack Overflow errors.
   * fs.stat calls within each directory are parallelized via Promise.all.
   */
  private async discoverFiles(
    startDir: string,
    extensions: Set<string>,
    excludePatterns: string[],
    outList: ScanFileData[]
  ): Promise<void> {
    const stack: string[] = [startDir];

    while (stack.length > 0) {
      if (this.isCancelled) break;
      const currentDir = stack.pop()!;

      try {
        const entries = await fs.readdir(currentDir, { withFileTypes: true });

        // Separate into directories (push to stack) and candidate files (stat in parallel)
        const candidateFiles: { entry: { name: string }; fullPath: string; normalizedPath: string; ext: string }[] = [];

        for (const entry of entries) {
          if (this.isCancelled) break;

          const fullPath = path.join(currentDir, entry.name);
          const normalizedPath = fullPath.replace(/\\/g, '/');

          // Check if excluded by simple match
          let shouldSkip = false;
          for (const pattern of excludePatterns) {
            if (normalizedPath.toLowerCase().includes(pattern.replace(/\*/g, '').toLowerCase())) {
              shouldSkip = true;
              break;
            }
          }
          if (shouldSkip) continue;

          if (entry.isDirectory()) {
            stack.push(fullPath);
          } else if (entry.isFile()) {
            const ext = path.extname(entry.name).substring(1).toLowerCase();
            if (extensions.has(ext)) {
              candidateFiles.push({ entry, fullPath, normalizedPath, ext });
            }
          }
        }

        // Stat all candidate files in parallel
        if (candidateFiles.length > 0) {
          const statResults = await Promise.all(
            candidateFiles.map(({ fullPath }) => fs.stat(fullPath).catch(() => null))
          );

          for (let i = 0; i < candidateFiles.length; i++) {
            const stats = statResults[i];
            if (!stats) continue;
            const { entry, normalizedPath, ext } = candidateFiles[i];
            const fileId = this.generateFileId(normalizedPath);
            const isVideo = ['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext);
            outList.push({
              id: fileId,
              path: normalizedPath,
              name: entry.name,
              size: stats.size,
              mtime: stats.mtime.toISOString(),
              extension: ext,
              mediaType: isVideo ? 'video' : 'photo'
            });
          }
        }
      } catch {
        // Skip inaccessible folders gracefully
      }
    }
  }

  /**
   * Generates a deterministic unique ID for a file path (SHA256 hash).
   */
  private generateFileId(filePath: string): string {
    return crypto.createHash('sha256').update(filePath.toLowerCase()).digest('hex');
  }
}
