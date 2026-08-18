import type { AppSettings } from "./types/settings"

/**
 * Feature Flags
 * Set ENABLE_AI_FEATURES to true to enable Visual AI Search & ONNX Model indexing.
 * Default is false while AI model execution is unstable/under development.
 */
export const ENABLE_AI_FEATURES = false

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

/** Canonical thumbnail version file suffixes */
export const IMAGE_THUMB_SUFFIX = "_v3.webp"
export const VIDEO_THUMB_SUFFIX = "_v2.webp"

export const DEFAULT_EXCLUDE_PATTERNS = [
  "node_modules",
  "**/node_modules/**",
  ".git",
  "**/.git/**",
  "$RECYCLE.BIN",
  "**/$RECYCLE.BIN/**",
  "System Volume Information",
  "__pycache__",
  ".venv",
  "venv",
  "env",
  ".env",
  "*.egg-info",
  "build",
  "dist",
  ".pytest_cache",
  ".tox",
  ".mypy_cache",
  ".npm",
  ".yarn",
  "bower_components",
  ".svn",
  ".hg",
  ".vscode",
  ".idea",
  ".eclipse",
  "*.iml",
  "target",
  "out",
  ".gradle",
  ".mvn",
  "bin",
  "obj",
  ".DS_Store",
  "Thumbs.db",
  ".thumbnails",
  "desktop.ini",
  "*.log",
  "*.tmp",
  "*.cache",
  "logs",
  "temp",
  "tmp",
]

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
    excludePatterns: [...DEFAULT_EXCLUDE_PATTERNS],
    minFileSize: 1024, // 1KB
    maxFileSize: 0, // unlimited
    supportedExtensions: [...ALL_SUPPORTED_EXTENSIONS],
  },
  quality: {
    blurThreshold: 30, // Below 30 is considered blurry
    darknessThreshold: 40, // Average brightness below 40 is considered dark
    duplicateHashDistance: 10, // Hamming distance threshold
    similarityRadius: 18, // Default visual similarity search radius
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
    aiEmbeddingConcurrency: 1,
  },
}
