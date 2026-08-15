import path from "node:path"
import fs from "node:fs"
import { app } from "electron"

/**
 * Galleo App Data & Storage Paths
 *
 * Central configuration file for all application directories and data files.
 * Modifying paths here updates them across database, thumbnail cache, AI models,
 * update cache, and worker processes.
 */

// Environment variable override for custom data root directory
export const ENV_DATA_DIR_KEY = "GALLEO_USER_DATA"

function ensureDirExists(dirPath: string): string {
  if (!fs.existsSync(dirPath)) {
    try {
      fs.mkdirSync(dirPath, { recursive: true })
    } catch {
      // Ignore if directory creation fails or exists
    }
  }
  return dirPath
}

/**
 * Checks whether the application is running in development/testing mode.
 */
export function isDevEnvironment(): boolean {
  if (process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test") {
    return true
  }
  try {
    if (app && !app.isPackaged) {
      return true
    }
  } catch {
    // If electron app is unavailable (e.g. tests or worker threads), default to true/fallback
    return true
  }
  return false
}

/**
 * Returns the root data directory for Galleo.
 *
 * Split behavior:
 * - In Development (!app.isPackaged / dev): isolates data inside `<project_root>/.data`
 * - In Production (app.isPackaged): standard Electron `%APPDATA%/galleo` (or OS equivalent)
 * - Environment Override: `GALLEO_USER_DATA` takes highest precedence when set.
 */
export function getUserDataDir(): string {
  // 1. Explicit override via environment variable
  if (process.env[ENV_DATA_DIR_KEY]) {
    const customDir = process.env[ENV_DATA_DIR_KEY]
    ensureDirExists(customDir)
    return customDir
  }

  // 2. Development mode -> isolate storage inside project-local .data directory
  if (isDevEnvironment()) {
    const devDir = path.join(process.cwd(), ".data")
    ensureDirExists(devDir)
    return devDir
  }

  // 3. Production mode -> standard Electron OS user data directory
  try {
    if (app?.getPath) {
      const electronDir = app.getPath("userData")
      ensureDirExists(electronDir)
      return electronDir
    }
  } catch {
    // Fallback if app.getPath is unreachable
  }

  const fallbackDir = path.join(process.cwd(), ".data")
  ensureDirExists(fallbackDir)
  return fallbackDir
}

/**
 * Path to the SQLite database file (galleo.db).
 */
export function getDatabasePath(): string {
  return path.join(getUserDataDir(), "galleo.db")
}

/**
 * Path to the generated thumbnails cache directory.
 */
export function getThumbnailCacheDir(): string {
  const dir = path.join(getUserDataDir(), "thumbnails")
  return ensureDirExists(dir)
}

/**
 * Path to the video frame cache directory.
 */
export function getVideoFrameCacheDir(): string {
  const dir = path.join(getThumbnailCacheDir(), "video_frames")
  return ensureDirExists(dir)
}

/**
 * Path to local cached AI models (e.g. HuggingFace / SigLIP ONNX models).
 */
export function getModelCacheDir(): string {
  const dir = path.join(getUserDataDir(), "models")
  return ensureDirExists(dir)
}

/**
 * Path to the update cache JSON file.
 */
export function getUpdateCachePath(): string {
  return path.join(getUserDataDir(), "update_cache.json")
}
