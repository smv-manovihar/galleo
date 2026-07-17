import { ipcMain, dialog, BrowserWindow, shell } from 'electron';
import fs from 'fs/promises';
import path from 'path';
import { IPC_CHANNELS, type OrganizePreviewItem } from '../shared/types/ipc';
import { SettingsService } from './services/settings.service';
import { ScannerService } from './services/scanner.service';
import { FileOpsService } from './services/file-ops.service';
import { SessionService } from './services/session.service';
import { UpdateService } from './services/update.service';
import { MediaRepository } from './repositories/media.repository';
import { planOrganization } from './core/organization';
import { type Result, ok, fail } from '../shared/types/results';
import { DEFAULT_SETTINGS } from '../shared/constants';
import { initDatabase } from './infrastructure/database';
import { getThumbnailCacheDir } from './infrastructure/image-processor';

export function registerIpcHandlers(window: BrowserWindow): void {
  const settingsService = new SettingsService();
  const scannerService = new ScannerService();
  const fileOpsService = new FileOpsService();
  const sessionService = new SessionService();
  const mediaRepository = new MediaRepository();
  const updateService = new UpdateService();

  // Settings
  ipcMain.handle(IPC_CHANNELS.SETTINGS_GET, () => {
    return settingsService.getSettings();
  });

  ipcMain.handle(IPC_CHANNELS.SETTINGS_SAVE, async (_, settings) => {
    return await settingsService.saveSettings(settings);
  });

  // Native Folder Picker Dialog
  ipcMain.handle(IPC_CHANNELS.FOLDERS_SELECT, async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    const result = win
      ? await dialog.showOpenDialog(win, { properties: ['openDirectory'] })
      : await dialog.showOpenDialog({ properties: ['openDirectory'] });
    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }
    return result.filePaths[0];
  });

  // Scan control
  ipcMain.handle(IPC_CHANNELS.SCAN_START, async (event, rootPaths: string[], forceRescan?: boolean) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    return await scannerService.scanFolders(rootPaths, win || window, forceRescan);
  });

  ipcMain.handle(IPC_CHANNELS.SCAN_CANCEL, () => {
    scannerService.cancelScan();
  });

  // Media queries
  ipcMain.handle(IPC_CHANNELS.MEDIA_GET, (_, folderPath: string) => {
    return mediaRepository.getByFolderPath(folderPath);
  });

  ipcMain.handle(IPC_CHANNELS.MEDIA_CLEAR_INDEX, (_, folderPath: string) => {
    try {
      mediaRepository.clearByFolder(folderPath);
      return ok(undefined);
    } catch (e: any) {
      return fail({
        code: 'UNKNOWN',
        message: e.message || 'Clearing folder index failed'
      });
    }
  });

  ipcMain.handle(
    IPC_CHANNELS.MEDIA_UPDATE_REVIEWS,
    (_, { sessionId, updates, undoAction }) => {
      return sessionService.updateReviews(sessionId, updates, undoAction);
    }
  );

  // Review sessions checkpoints
  ipcMain.handle(IPC_CHANNELS.SESSION_GET_CHECKPOINT, (_, folderPath: string) => {
    return sessionService.getCheckpoint(folderPath);
  });

  ipcMain.handle(IPC_CHANNELS.SESSION_SAVE_CHECKPOINT, (_, checkpoint) => {
    return sessionService.saveCheckpoint(checkpoint);
  });

  ipcMain.handle(IPC_CHANNELS.SESSION_CLEAR, (_, folderPath: string) => {
    return sessionService.clearSession(folderPath);
  });

  // Organization Planning & Execution
  ipcMain.handle(
    IPC_CHANNELS.ORGANIZE_PREVIEW,
    async (_, { folderPath, destination, pattern }): Promise<Result<OrganizePreviewItem[]>> => {
      try {
        const items = mediaRepository.getByFolderPath(folderPath);
        
        // Find existing files in destination directory to avoid collisions
        const existing = new Set<string>();
        if (await dirExists(destination)) {
          await scanFilesFlat(destination, existing);
        }

        const plan = planOrganization({
          items,
          destinationDir: destination,
          pattern,
          existingFilePaths: existing,
        });

        return ok(plan);
      } catch (e: any) {
        return fail({
          code: 'UNKNOWN',
          message: e.message || 'Organization preview planning failed'
        });
      }
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.ORGANIZE_EXECUTE,
    async (event, { previewItems, preserveOriginals }) => {
      const win = BrowserWindow.fromWebContents(event.sender);
      return await fileOpsService.executeOrganization(previewItems, preserveOriginals, win || window);
    }
  );

  // File Utilities
  ipcMain.handle(IPC_CHANNELS.FILE_OPEN, (_, filePath: string) => {
    return fileOpsService.openFile(filePath);
  });

  ipcMain.handle(IPC_CHANNELS.FILE_SHOW, (_, filePath: string) => {
    return fileOpsService.showFile(filePath);
  });

  ipcMain.handle(IPC_CHANNELS.MEDIA_TRASH, (_, paths: string[]) => {
    return fileOpsService.trashFiles(paths);
  });

  // Granular App Resetting Handlers
  ipcMain.handle(
    IPC_CHANNELS.APP_RESET,
    async (_, { settings, database, cache, sessions }): Promise<Result<void>> => {
      try {
        const db = initDatabase();

        if (settings) {
          const serialized = JSON.stringify(DEFAULT_SETTINGS);
          const stmt = db.prepare(`
            INSERT INTO settings (key, value)
            VALUES (?, ?)
            ON CONFLICT(key) DO UPDATE SET value = excluded.value
          `);
          stmt.run('app_settings', serialized);
        }

        if (database) {
          db.prepare('DELETE FROM media_items').run();
        }

        if (sessions) {
          db.prepare('DELETE FROM sessions').run();
        }

        if (cache) {
          const cacheDir = getThumbnailCacheDir();
          await fs.rm(cacheDir, { recursive: true, force: true });
          await fs.mkdir(cacheDir, { recursive: true });
        }

        return ok(undefined);
      } catch (e: any) {
        return fail({
          code: 'UNKNOWN',
          message: e.message || 'App reset failed'
        });
      }
    }
  );

  // App Update Checker Handlers
  ipcMain.handle(IPC_CHANNELS.APP_CHECK_UPDATE, async () => {
    return await updateService.checkForUpdates();
  });

  ipcMain.handle(IPC_CHANNELS.URL_OPEN, (_, url: string) => {
    try {
      shell.openExternal(url);
      return ok(undefined);
    } catch (e: any) {
      return fail({
        code: 'UNKNOWN',
        message: e.message || 'Opening URL failed'
      });
    }
  });
}

// Utility to recursively discover files for duplicate target detection in organization preview
async function scanFilesFlat(dir: string, outSet: Set<string>): Promise<void> {
  const queue: string[] = [dir];
  while (queue.length > 0) {
    const current = queue.shift()!;
    try {
      const entries = await fs.readdir(current, { withFileTypes: true });
      for (const entry of entries) {
        const full = path.join(current, entry.name);
        if (entry.isDirectory()) {
          queue.push(full);
        } else {
          outSet.add(full.replace(/\\/g, '/').toLowerCase());
        }
      }
    } catch {}
  }
}

async function dirExists(dirPath: string): Promise<boolean> {
  try {
    await fs.access(dirPath);
    return true;
  } catch {
    return false;
  }
}
