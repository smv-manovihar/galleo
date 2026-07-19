import type { AppSettings } from "./types/settings"

export const SUPPORTED_PHOTO_EXTENSIONS = [
  "jpg",
  "jpeg",
  "png",
  "gif",
  "webp",
  "heic",
  "bmp",
  "tiff",
] as const

export const SUPPORTED_VIDEO_EXTENSIONS = [
  "mp4",
  "mov",
  "avi",
  "mkv",
  "webm",
] as const

export const ALL_SUPPORTED_EXTENSIONS = [
  ...SUPPORTED_PHOTO_EXTENSIONS,
  ...SUPPORTED_VIDEO_EXTENSIONS,
] as const

export const DEFAULT_SETTINGS: AppSettings = {
  folders: {
    roots: [],
    destination: "",
    destinationMode: "in-place",
    trashMode: "recycle-bin",
  },
  scanning: {
    includeSubfolders: true,
    maxDepth: 10,
    excludePatterns: ["**/node_modules/**", "**/.git/**", "**/$RECYCLE.BIN/**"],
    minFileSize: 1024, // 1KB
    maxFileSize: 0, // unlimited
    supportedExtensions: [...ALL_SUPPORTED_EXTENSIONS],
  },
  quality: {
    blurThreshold: 30, // Below 30 is considered blurry
    darknessThreshold: 40, // Average brightness below 40 is considered dark
    duplicateHashDistance: 10, // Hamming distance threshold
    screenshotDetection: true,
    minResolution: 300 * 300, // below 90,000 pixels is considered small
  },
  organization: {
    folderPattern: "YYYY/MM - MMMM/",
    conflictResolution: "rename",
    preserveOriginals: false,
    duplicateStrategy: "keep_most_grouped",
  },
  ui: {
    theme: "system",
    fontSize: "md",
    gridColumns: 4,
    thumbnailSize: "md",
    confirmBeforeDelete: true,
    defaultView: "grid",
    reviewOrder: "worst-first",
  },
  performance: {
    thumbnailCacheMaxMB: 512,
    scanBatchSize: 50,
    maxConcurrentOps: 4,
  },
}
