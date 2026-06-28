import fs from 'fs/promises';
import { existsSync, statSync } from 'fs';
import path from 'path';
import trash from 'trash';
import { type Result, fail, ok } from '../../shared/types/results';

/**
 * Normalizes slash symbols according to system standards.
 */
export function normalizePath(p: string): string {
  return path.normalize(p);
}

/**
 * Checks if a file or folder exists.
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Returns basic file stats (size in bytes, filesystem birthtime and mtime in ISO format).
 */
export function getFileSyncStats(filePath: string): Result<{ size: number; birthtime: string; mtime: string }> {
  try {
    const stats = statSync(filePath);
    return ok({
      size: stats.size,
      birthtime: stats.birthtime.toISOString(),
      mtime: stats.mtime.toISOString()
    });
  } catch (e: any) {
    if (e.code === 'ENOENT') {
      return fail({ code: 'FILE_NOT_FOUND', path: filePath });
    }
    if (e.code === 'EACCES') {
      return fail({ code: 'PERMISSION_DENIED', path: filePath });
    }
    return fail({ code: 'UNKNOWN', message: e.message || 'Stats reading failed' });
  }
}

/**
 * Verifies that the destination drive has enough remaining space for the planned copy/move operations.
 */
export async function checkAvailableDiskSpace(dirPath: string, requiredBytes: number): Promise<Result<void>> {
  try {
    // Note: Node.js does not have standard cross-platform fs.statfs in older versions,
    // but Node.js 18.9.0+ has fs.statfs. Let's try to use it, fallback gracefully if not supported.
    if (typeof fs.statfs === 'function') {
      const stats = await fs.statfs(dirPath);
      const freeSpace = stats.bfree * stats.bsize;
      if (freeSpace < requiredBytes) {
        return fail({ code: 'DISK_FULL', requiredBytes, path: dirPath });
      }
    }
    return ok(undefined);
  } catch (e: any) {
    // If statfs fails or doesn't exist, proceed (better to try operation than block arbitrarily)
    return ok(undefined);
  }
}

/**
 * Safe wrapper to move a file to the OS Recycle Bin/Trash using the trash library.
 */
export async function moveToTrash(filePath: string): Promise<Result<void>> {
  try {
    const normalized = normalizePath(filePath);
    if (!existsSync(normalized)) {
      return fail({ code: 'FILE_NOT_FOUND', path: normalized });
    }
    
    // trash takes absolute paths
    await trash([normalized]);
    return ok(undefined);
  } catch (e: any) {
    if (e.code === 'EACCES' || e.code === 'EPERM') {
      return fail({ code: 'PERMISSION_DENIED', path: filePath });
    }
    if (e.code === 'EBUSY') {
      return fail({ code: 'FILE_BUSY', path: filePath });
    }
    return fail({ code: 'UNKNOWN', message: e.message || 'Moving to trash failed' });
  }
}

/**
 * Safely moves a file to a new target path (and creates target directories if they don't exist).
 */
export async function moveFile(srcPath: string, destPath: string): Promise<Result<void>> {
  try {
    const src = normalizePath(srcPath);
    const dest = normalizePath(destPath);

    if (!existsSync(src)) {
      return fail({ code: 'FILE_NOT_FOUND', path: src });
    }

    const destDir = path.dirname(dest);
    await fs.mkdir(destDir, { recursive: true });

    // Use fs.rename which is atomic on the same drive.
    // If it fails due to EXDEV (cross-device link), fallback to copy + unlink.
    try {
      await fs.rename(src, dest);
    } catch (renameErr: any) {
      if (renameErr.code === 'EXDEV') {
        await fs.copyFile(src, dest);
        await fs.unlink(src);
      } else {
        throw renameErr;
      }
    }

    return ok(undefined);
  } catch (e: any) {
    if (e.code === 'EACCES' || e.code === 'EPERM') {
      return fail({ code: 'PERMISSION_DENIED', path: srcPath });
    }
    if (e.code === 'EBUSY') {
      return fail({ code: 'FILE_BUSY', path: srcPath });
    }
    return fail({ code: 'UNKNOWN', message: e.message || 'File move failed' });
  }
}

/**
 * Safely copies a file to a new target path.
 */
export async function copyFile(srcPath: string, destPath: string): Promise<Result<void>> {
  try {
    const src = normalizePath(srcPath);
    const dest = normalizePath(destPath);

    if (!existsSync(src)) {
      return fail({ code: 'FILE_NOT_FOUND', path: src });
    }

    const destDir = path.dirname(dest);
    await fs.mkdir(destDir, { recursive: true });

    await fs.copyFile(src, dest);
    return ok(undefined);
  } catch (e: any) {
    if (e.code === 'EACCES' || e.code === 'EPERM') {
      return fail({ code: 'PERMISSION_DENIED', path: srcPath });
    }
    if (e.code === 'EBUSY') {
      return fail({ code: 'FILE_BUSY', path: srcPath });
    }
    return fail({ code: 'UNKNOWN', message: e.message || 'File copy failed' });
  }
}
