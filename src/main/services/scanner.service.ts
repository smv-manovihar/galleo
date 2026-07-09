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

      if (!this.isCancelled) {
        const totalCount = scanList.length;
        let scannedCount = 0;
        const batchSize = settings.performance.scanBatchSize || 50;

        // 2. Process discovered files in batches
        for (let i = 0; i < totalCount; i += batchSize) {
          if (this.isCancelled) break;

        const batch = scanList.slice(i, i + batchSize);
        const processedItems: MediaItem[] = [];

        // Fetch existing metadata to check against cache
        const dbItems = this.mediaRepository.getByFolderPath(rootPaths[0]); // fetch items in first root to check cache
        const cacheMap = new Map<string, MediaItem>();
        for (const item of dbItems) {
          cacheMap.set(item.path.toLowerCase(), item);
        }

        for (const file of batch) {
          if (this.isCancelled) break;

          try {
            // Check cache (ignore cache if forcing a rescan)
            const cached = forceRescan ? undefined : cacheMap.get(file.path.toLowerCase());
            const isOldThumb = cached && cached.thumbnailPath && !cached.thumbnailPath.endsWith('_v2.webp');
            if (cached && cached.size === file.size && !isOldThumb) {
              // Cache hit: file size matches and thumbnail is up-to-date, use cached record directly
              processedItems.push(cached);
              scannedCount++;
              
              // Real-time progress update (without inserting new card items yet)
              window.webContents.send(IPC_CHANNELS.SCAN_PROGRESS, {
                scannedCount,
                totalCount,
                currentFile: file.name,
                items: []
              });
              continue;
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
              continue; // Skip file on error
            }

            const meta = metaRes.data;

            // Create compressed thumbnail cache file FIRST to allow video hash generation from the thumbnail frame
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

            // If it is a video and we have successfully generated a thumbnail,
            // analyze the thumbnail to get a perceptual hash for duplicate detection!
            if (file.mediaType === 'video' && thumbnailPath) {
              try {
                const analysisRes = await analyzeImage(thumbnailPath);
                if (analysisRes.ok) {
                  hash = analysisRes.data.hash;
                }
              } catch (hashErr) {
                // Fail silently and keep hash undefined if anything goes wrong
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
              dateAdded: new Date().toISOString(),
              dateOriginal: meta.dateOriginal ?? undefined,
              dateInferred: meta.dateInferred ?? undefined,
              dateFileSystem: meta.dateFileSystem ?? new Date().toISOString(),
              dateTarget: meta.dateTarget ?? new Date().toISOString(),
              dateTargetSource: meta.dateTargetSource ?? 'filesystem',
              hash,
              thumbnailPath,
              quality,
              isDuplicate: false,
              isBestInDuplicateGroup: false,
              reviewState: 'pending'
            };

            processedItems.push(item);
            scannedCount++;

            // Real-time progress update
            window.webContents.send(IPC_CHANNELS.SCAN_PROGRESS, {
              scannedCount,
              totalCount,
              currentFile: file.name,
              items: []
            });
          } catch {
            // Increment progress even on error to ensure progress bar completes
            scannedCount++;
            window.webContents.send(IPC_CHANNELS.SCAN_PROGRESS, {
              scannedCount,
              totalCount,
              currentFile: file.name,
              items: []
            });
          }
        }

        // Save batch to SQLite
        if (processedItems.length > 0) {
          this.mediaRepository.upsertMany(processedItems);
          
          // Stream batch update to React frontend
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

      // 3. Post-scan duplicate analysis across all files (runs even if cancelled)
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
   * Helper to recursively traverse directories and discover media files.
   * Uses an iterative stack approach to avoid Call Stack Overflow errors.
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

        for (const entry of entries) {
          if (this.isCancelled) break;

          const fullPath = path.join(currentDir, entry.name);
          const normalizedPath = fullPath.replace(/\\/g, '/');

          // Check if excluded by simple match
          let shouldSkip = false;
          for (const pattern of excludePatterns) {
            // Check if pattern is a segment match
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
              const fileId = this.generateFileId(normalizedPath);
              const isVideo = ['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext);
              
              // Read size
              const stats = await fs.stat(fullPath);

              outList.push({
                id: fileId,
                path: normalizedPath,
                name: entry.name,
                size: stats.size,
                extension: ext,
                mediaType: isVideo ? 'video' : 'photo'
              });
            }
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
